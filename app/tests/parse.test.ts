import { describe, expect, it } from "vitest";
import { parseArrayBuffer } from "../src/core/parse";
import { ParseError } from "../src/core/types";
import { makeWorkbook } from "./fixtures";

describe("parse", () => {
  it("finds formulas that carry a cached value", () => {
    const buf = makeWorkbook({ S: { A1: { v: 1 }, B1: { f: "A1*2", v: 2 } } });
    const wb = parseArrayBuffer(buf, "a.xlsx");
    expect(wb.formulas.map((f) => f.addr)).toEqual(["B1"]);
    expect(wb.formulas[0].formula).toBe("A1*2");
  });

  it("finds formula cells that have NO cached value (R2 regression guard)", () => {
    const buf = makeWorkbook({ S: { A1: { v: 1 }, C5: { f: "A1+1" } } });
    const wb = parseArrayBuffer(buf, "a.xlsx");
    expect(wb.formulas.map((f) => f.addr)).toContain("C5");
  });

  it("reads hidden sheet state", () => {
    const buf = makeWorkbook({ V: { A1: { v: 1 } } }, { V: 2 });
    const wb = parseArrayBuffer(buf, "a.xlsx");
    expect(wb.sheets[0].hidden).toBe(2);
    expect(wb.totals.hiddenSheets).toBe(1);
  });

  it("refuses a zip that is not a workbook (regression: silent 1-cell accept)", () => {
    const payload = new TextEncoder().encode("random payload that is not ooxml");
    const bytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, ...payload]);
    expect(() => parseArrayBuffer(bytes.buffer, "fake.xlsx")).toThrowError(ParseError);
  });

  it("refuses an empty file", () => {
    expect(() => parseArrayBuffer(new ArrayBuffer(0), "empty.xlsx")).toThrowError(ParseError);
  });

  it("refuses text that merely contains a workbook part name (regression: accepted as a 1-sheet workbook)", () => {
    const bytes = new TextEncoder().encode("PK fake header xl/workbook.xml and then plain text");
    expect(() => parseArrayBuffer(bytes.buffer, "fake.xlsx")).toThrowError(ParseError);
  });

  it("never calls a corrupt zip password-protected", () => {
    const bytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1, 2, 3, 4, 5, 6]);
    try {
      parseArrayBuffer(bytes.buffer, "corrupt.xlsx");
      throw new Error("expected a throw");
    } catch (e) {
      expect(e).toBeInstanceOf(ParseError);
      expect((e as ParseError).code).not.toBe("password");
    }
  });

  it("flags whole-column references as a tracing caveat", () => {
    const buf = makeWorkbook({ S: { A1: { v: 1 }, B1: { f: "SUM(A:A)", v: 1 } } });
    const wb = parseArrayBuffer(buf, "cols.xlsx");
    expect(wb.caveats.join(" ")).toContain("whole-column");
  });

  it("also flags sheet-qualified whole-column ranges (regression: Rates!A:C was missed)", () => {
    const buf = makeWorkbook({
      S: { A1: { v: "x" } },
      Rates: { A1: { v: "x" }, B1: { t: "n", v: 1 }, B2: { f: "VLOOKUP(A1,Rates!A:C,3,FALSE)", v: 1 } },
    });
    const wb = parseArrayBuffer(buf, "qualified.xlsx");
    expect(wb.caveats.join(" ")).toContain("whole-column");
  });

  it("refuses garbage with a typed error", () => {
    const garbage = new TextEncoder().encode("this is not a spreadsheet").buffer;
    expect(() => parseArrayBuffer(garbage, "x.xlsx")).toThrowError(ParseError);
    try {
      parseArrayBuffer(garbage, "x.xlsx");
    } catch (e) {
      expect((e as ParseError).code).toBe("unreadable");
    }
  });
});
