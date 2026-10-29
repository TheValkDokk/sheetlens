
import * as XLSX from "xlsx";
import { parseArrayBuffer } from "../../app/src/core/parse";
import { scanRisks } from "../../app/src/core/risks";

function b(sheets: Record<string, Record<string, any>>) {
  const wb = XLSX.utils.book_new();
  for (const [n, cells] of Object.entries(sheets)) {
    const ws: any = { ...cells };
    const addrs = Object.keys(cells).filter(k => !k.startsWith("!"));
    const r = XLSX.utils.decode_range(addrs[0] + ":" + addrs[0]);
    for (const a of addrs) { const d = XLSX.utils.decode_range(a + ":" + a); r.s.r=Math.min(r.s.r,d.s.r); r.s.c=Math.min(r.s.c,d.s.c); r.e.r=Math.max(r.e.r,d.e.r); r.e.c=Math.max(r.e.c,d.e.c); }
    ws["!ref"] = XLSX.utils.encode_range(r);
    XLSX.utils.book_append_sheet(wb, ws, n);
  }
  return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}

// variants of error cells, as written by SheetJS from a real read
const variants: any = {
  errCode7: { t: "e", v: 7, w: "#DIV/0!", f: "A1/B1" },
  errString: { t: "e", v: "#DIV/0!", w: "#DIV/0!", f: "A1/B1" },
  errStringNoW: { t: "e", v: "#DIV/0!", f: "A1/B1" },
  errNum: { t: "e", v: 42, w: "#N/A", f: "NA()" },
};
for (const [k, cell] of Object.entries(variants)) {
  const raw = parseArrayBuffer(b({ S: { A1: { t: "n", v: 1 }, B1: { t: "n", v: 0 }, C1: cell as any } }), "e.xlsx");
  const c = raw.formulas.find(f => f.addr === "C1");
  const findings = scanRisks(raw).filter(f => f.addr === "C1");
  console.log(k, "parsed=", JSON.stringify(c), "findings=", JSON.stringify(findings.map(f => f.rule + ":" + f.severity)));
}

// inspect the underlying SheetJS cell object for the demo error cell
import { buildDemoWorkbook } from "../../app/src/demo";
const demoBuf = buildDemoWorkbook();
const demoSheet = XLSX.read(new Uint8Array(demoBuf), { type: "array", sheetStubs: true, cellFormula: true, cellText: true });
console.log("demo raw H7", JSON.stringify(demoSheet.Sheets["Model"]["H7"]));

// real XML error cell through a zip? use SheetJS to write a raw error with v code
const er = parseArrayBuffer(b({ S: { C1: { t: "e", v: 7, f: "A1/B1" } } }), "e.xlsx");
console.log("err v7", JSON.stringify(er.formulas.find(f => f.addr === "C1")));
