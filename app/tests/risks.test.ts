import { describe, expect, it } from "vitest";
import { parseArrayBuffer } from "../src/core/parse";
import { hardcodedConstants, scanRisks } from "../src/core/risks";
import { cleanWorkbook, dirtyWorkbook, makeWorkbook } from "./fixtures";

describe("scanRisks", () => {
  const wb = parseArrayBuffer(dirtyWorkbook(), "dirty.xlsx");
  const findings = scanRisks(wb);
  const rules = new Set(findings.map((f) => f.rule));

  it("flags a hardcoded rate as high severity", () => {
    const hit = findings.find((f) => f.rule === "hardcoded-constant" && f.addr === "C2");
    expect(hit).toBeDefined();
    expect(hit!.severity).toBe("high");
    expect(hit!.evidence).toContain("0.2");
  });

  it("flags volatile functions", () => {
    expect(findings.some((f) => f.rule === "volatile-function" && f.addr === "D3")).toBe(true);
  });

  it("flags the cell that breaks its column pattern", () => {
    const deviants = findings.filter((f) => f.rule === "inconsistent-column");
    expect(deviants.map((f) => f.addr)).toEqual(["C6"]);
  });

  it("flags a hidden sheet", () => {
    expect(findings.some((f) => f.rule === "hidden-sheet" && f.sheet === "Hidden1")).toBe(true);
  });

  it("covers the expected rule classes on the dirty fixture", () => {
    expect(rules.has("hardcoded-constant")).toBe(true);
    expect(rules.has("volatile-function")).toBe(true);
    expect(rules.has("inconsistent-column")).toBe(true);
    expect(rules.has("hidden-sheet")).toBe(true);
  });

  it("returns zero high findings on a clean workbook", () => {
    const clean = parseArrayBuffer(cleanWorkbook(), "clean.xlsx");
    const cleanFindings = scanRisks(clean);
    expect(cleanFindings.filter((f) => f.severity === "high")).toEqual([]);
  });

  it("does not flag a unit-conversion multiplier as an assumption", () => {
    expect(hardcodedConstants("A1*2")).toEqual([2]);
    const wb2 = parseArrayBuffer(
      makeWorkbook({ S: { A1: { v: 3 }, B1: { f: "A1*2", v: 6 }, C1: { f: "A1*1E5", v: 300000 } } }),
      "scale.xlsx"
    );
    expect(scanRisks(wb2).filter((f) => f.rule === "hardcoded-constant")).toEqual([]);
  });

  it("still flags an indexation multiplier above 1", () => {
    const wb2 = parseArrayBuffer(makeWorkbook({ S: { A1: { v: 3 }, B1: { f: "A1*1.08", v: 3.24 } } }), "idx.xlsx");
    const hits = scanRisks(wb2).filter((f) => f.rule === "hardcoded-constant");
    expect(hits).toHaveLength(1);
    expect(hits[0].severity).toBe("medium");
  });

  it("sorts high before medium", () => {
    const sev = findings.map((f) => f.severity);
    const firstMedium = sev.indexOf("medium");
    if (firstMedium !== -1) {
      expect(sev.slice(firstMedium).includes("high")).toBe(false);
    }
  });
});
