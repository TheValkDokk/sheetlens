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
