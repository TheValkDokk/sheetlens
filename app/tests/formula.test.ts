import { describe, expect, it } from "vitest";
import { explainFormula, extractFunctions, extractRefs, parseFormula } from "../src/core/formula";

describe("explainFormula", () => {
  it("describes arithmetic with a constant", () => {
    const s = explainFormula("=B2*0.2");
    expect(s).toContain("multiplied by");
    expect(s).toContain("0.2");
    expect(s.toLowerCase()).toContain("cell b2");
  });

  it("describes an IF with both branches", () => {
    const s = explainFormula('=IF(A2="US",B2*0.08,B2*0.2)');
    expect(s).toMatch(/^If /);
    expect(s).toContain("then");
    expect(s).toContain("otherwise");
  });

  it("describes SUM of a range as a total", () => {
    const s = explainFormula("=SUM(B2:B10)");
    expect(s).toBe("The total of range B2:B10.");
  });

  it("describes a nested IFERROR + VLOOKUP", () => {
    const s = explainFormula('=IFERROR(VLOOKUP(A2,Rates!A:C,3,FALSE),"n/a")');
    expect(s).toContain("column 3");
    expect(s).toContain("falling back to");
  });

  it("refuses to invent meaning for an unknown function", () => {
    const s = explainFormula("=WEIRDFN(A1)");
    expect(s.toLowerCase()).toContain("unrecognised function weirdfn");
  });

  it("handles a cross-sheet reference with a space in the name", () => {
    const refs = extractRefs("='Q3 Data'!B4+1", "Model");
    expect(refs.some((r) => r.sheet === "Q3 Data" && r.addr === "B4")).toBe(true);
  });

  it("does not treat cell-like text inside a string as a reference", () => {
    const refs = extractRefs('="A1 is a label"&B2', "S");
    expect(refs.map((r) => r.addr)).toEqual(["B2"]);
  });

  it("extracts function names case-insensitively and dedupes", () => {
    expect(extractFunctions("=sum(a1)+SUM(b1)")).toEqual(["SUM"]);
  });

  it("parses a range node", () => {
    const n = parseFormula("=SUM($B$2:$B$10)");
    expect(n.kind).toBe("call");
  });
});
