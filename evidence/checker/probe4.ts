
import * as XLSX from "xlsx";
import { parseArrayBuffer } from "../../app/src/core/parse";
import { buildEdges, impactOf } from "../../app/src/core/deps";

function build(n: number) {
  const ws: any = {};
  for (let i = 1; i <= n + 10; i++) ws["A" + i] = { t: "n", v: i };
  for (let i = 1; i <= n; i++) ws["B" + i] = { t: "n", f: "SUM(A" + i + ":A" + (i + 9) + ")" };
  ws["!ref"] = "A1:B" + (n + 10);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Model");
  return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}

for (const n of [2000, 10000]) {
  const buf = build(n);
  const t0 = performance.now();
  const w = parseArrayBuffer(buf, "big.xlsx");
  const t1 = performance.now();
  const edges = buildEdges(w);
  const t2 = performance.now();
  // replicate ui/app.ts ingest default-blast-radius loop exactly
  let bestCount = -1;
  for (const cell of w.formulas) {
    const im = impactOf(edges, { sheet: cell.sheet, addr: cell.addr });
    const k = im.direct.length + im.transitive.length;
    if (k > bestCount) bestCount = k;
  }
  const t3 = performance.now();
  console.log(JSON.stringify({ n, cells: w.totals.cells, formulas: w.totals.formulas, edges: edges.length,
    parseMs: Math.round(t1 - t0), edgesMs: Math.round(t2 - t1), defaultImpactLoopMs: Math.round(t3 - t2), totalMs: Math.round(t3 - t0), bestCount, bytes: buf.byteLength }));
}
