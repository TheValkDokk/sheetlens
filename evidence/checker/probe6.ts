
import * as XLSX from "xlsx";
import { parseArrayBuffer } from "../../app/src/core/parse";
import { scanRisks } from "../../app/src/core/risks";
function b(ws: any) { const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "S"); return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer; }
for (const [label, f] of [
  ["url-in-string", '="see https://example.com/report"'],
  ["url-in-formula", '=HYPERLINK("https://example.com","x")'],
  ["external", "=[Book2.xlsx]Sheet1!$A$1"],
  ["external-alt", "='[Book2.xlsx]Sheet1'!$A$1"],
  ["additive", "=A1+0.2"],
  ["power", "=A1^2"],
]) {
  const ws: any = { "!ref": "A1:B1", A1: { t: "n", v: 1 }, B1: { t: "n", f, v: 1 } };
  const w = parseArrayBuffer(b(ws), "x.xlsx");
  const fnd = scanRisks(w).filter(x => x.rule === "external-link");
  console.log(label, "externalFindings=", fnd.length, fnd.map(x => x.severity + ":" + x.evidence));
}
