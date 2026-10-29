import { describe, expect, it } from "vitest";
import { buildEdges } from "../src/core/deps";
import { parseArrayBuffer } from "../src/core/parse";
import { scanRisks } from "../src/core/risks";
import { makeWorkbook, type CellSpec } from "./fixtures";

describe("performance envelope", () => {
  it("parses, scans and graphs a 20k-cell workbook well inside the 3s budget", () => {
    const cells: Record<string, CellSpec> = {};
    const col = (i: number) => {
      let s = "";
      let n = i + 1;
      while (n > 0) {
        const rem = (n - 1) % 26;
        s = String.fromCharCode(65 + rem) + s;
        n = Math.floor((n - 1) / 26);
      }
      return s;
    };
    for (let r = 1; r <= 200; r++) {
      for (let c = 0; c < 100; c++) {
        const addr = col(c) + r;
        if (c % 5 === 0 && r > 1) cells[addr] = { f: "B" + (r - 1) + "*0.2", v: 1 };
        else cells[addr] = { v: r * (c + 1) };
      }
    }
    const buf = makeWorkbook({ Big: cells });

    const t0 = Date.now();
    const wb = parseArrayBuffer(buf, "big.xlsx");
    const findings = scanRisks(wb);
    const edges = buildEdges(wb);
    const ms = Date.now() - t0;

    expect(wb.totals.cells).toBeGreaterThan(15000);
    expect(findings.length).toBeGreaterThan(0);
    expect(edges.length).toBeGreaterThan(0);
    // The O(formulas x edges) default-pick this replaced took ~3.1s on this size.
    expect(ms).toBeLessThan(2500);
  });
});
