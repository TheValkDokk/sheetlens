import { describe, expect, it } from "vitest";
import { buildEdges, expandRange, impactOf } from "../src/core/deps";
import { parseArrayBuffer } from "../src/core/parse";
import { dirtyWorkbook } from "./fixtures";

describe("deps", () => {
  const wb = parseArrayBuffer(dirtyWorkbook(), "dirty.xlsx");
  const edges = buildEdges(wb);

  it("links a cell to the formulas that read it", () => {
    const impact = impactOf(edges, { sheet: "Model", addr: "B2" });
    const addrs = [...impact.direct, ...impact.transitive].map((r) => r.addr);
    expect(addrs).toContain("C2");
  });

  it("resolves a cross-sheet dependency", () => {
    const impact = impactOf(edges, { sheet: "Model", addr: "B2" });
    const cross = [...impact.direct, ...impact.transitive].find((r) => r.sheet === "Q3 Data");
    expect(cross?.addr).toBe("C2");
  });

  it("finds transitive dependents through a range", () => {
    const impact = impactOf(edges, { sheet: "Model", addr: "C6" });
    const addrs = [...impact.direct, ...impact.transitive].map((r) => r.addr);
    expect(addrs).toContain("D2");
  });

  it("expands a modest range", () => {
    expect(expandRange("A1", "A3")).toEqual(["A1", "A2", "A3"]);
  });
});
