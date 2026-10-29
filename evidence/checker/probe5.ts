
import * as XLSX from "xlsx";
import fs from "node:fs";
import { parseArrayBuffer } from "../../app/src/core/parse";
const dir = "/Users/valk/Documents/product-test/evidence/checker/fixtures";

// underlying parser errors (bypass parse.ts catch)
for (const f of ["corrupt.xlsx", "fakezip.xlsx", "protected-lookalike.xlsx"]) {
  const b = fs.readFileSync(dir + "/" + f);
  try {
    const wb = XLSX.read(new Uint8Array(b), { type: "array", sheetStubs: true, cellFormula: true, cellText: true, cellStyles: true });
    console.log(f, "PARSED sheets=", JSON.stringify(wb.SheetNames), "ref=", JSON.stringify(wb.Sheets[wb.SheetNames[0]]?.["!ref"]));
  } catch (e: any) {
    console.log(f, "THREW", JSON.stringify(e.message.slice(0, 200)));
  }
}

// truncated real xlsx
const real = fs.readFileSync(dir + "/edge.xlsx");
for (const cut of [50, 200, 500, 1000]) {
  const b = Buffer.from(real.subarray(0, cut));
  try {
    const wb = XLSX.read(new Uint8Array(b), { type: "array", sheetStubs: true, cellFormula: true, cellText: true });
    console.log("truncated", cut, "PARSED", JSON.stringify(wb.SheetNames));
  } catch (e: any) { console.log("truncated", cut, "THREW", JSON.stringify(e.message.slice(0, 160))); }
}
// what parse.ts turns them into
for (const b of [Buffer.from(real.subarray(0, 200)), fs.readFileSync(dir + "/corrupt.xlsx")]) {
  try { const w = parseArrayBuffer(new Uint8Array(b).buffer, "x.xlsx"); console.log("parseArrayBuffer OK", JSON.stringify(w.totals)); }
  catch (e: any) { console.log("parseArrayBuffer ERR", e.code, JSON.stringify(e.message)); }
}

// CSV delimiters and encoding
const csvs: [string, Buffer][] = [
  ["semicolon", Buffer.from("a;b;c\n1;2;3\n")],
  ["tab", Buffer.from("a\tb\tc\n1\t2\t3\n")],
  ["cp1252", Buffer.from([0x43,0x61,0x66,0xe9,0x0a,0x31,0x0a])],
  ["utf8bom", Buffer.concat([Buffer.from([0xef,0xbb,0xbf]), Buffer.from("Café\n1\n")])],
];
for (const [name, b] of csvs) {
  try {
    const w = parseArrayBuffer(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), "x.csv");
    const s = w.sheets[0];
    console.log("csv", name, JSON.stringify({ rows: s.rows, cols: s.cols, cells: s.cellCount, range: s.usedRange }));
  } catch (e: any) { console.log("csv", name, "ERR", e.message); }
}

// transitive cap
import { buildEdges, impactOf } from "../../app/src/core/deps";
const ws: any = { "!ref": "A1:B3000", A1: { t: "n", v: 1 } };
for (let i = 2; i <= 2600; i++) ws["A" + i] = { t: "n", f: "A" + (i - 1) + "+1", v: i };
for (let i = 1; i <= 400; i++) ws["B" + i] = { t: "n", v: i };
const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "S");
const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
const w = parseArrayBuffer(buf, "chain.xlsx");
const e = buildEdges(w);
const im = impactOf(e, { sheet: "S", addr: "A1" });
console.log("transitive-cap", JSON.stringify({ formulas: w.totals.formulas, edges: e.length, direct: im.direct.length, transitive: im.transitive.length, reachesLast: im.transitive.some(r => r.addr === "A2600") }));
