
import * as XLSX from "xlsx";
import { buildDemoWorkbook } from "../../app/src/demo";
import { parseArrayBuffer } from "../../app/src/core/parse";
import { scanRisks } from "../../app/src/core/risks";
import { buildEdges } from "../../app/src/core/deps";

const w = parseArrayBuffer(buildDemoWorkbook(), "Q3_Pricing_Model.xlsx");
console.log("totals", JSON.stringify(w.totals));
console.log("formula cells", w.formulas.length);
const f = scanRisks(w);
console.log("finding count", f.length);
const byRule: Record<string, number> = {};
for (const x of f) byRule[x.rule] = (byRule[x.rule] ?? 0) + 1;
console.log("by rule", JSON.stringify(byRule));
for (const x of f) console.log(x.severity, x.rule, x.sheet + "!" + x.addr, "|", x.evidence.replace(/\n/g, " "));
console.log("H7 parsed", JSON.stringify(w.formulas.find(c => c.sheet === "Model" && c.addr === "H7")));
console.log("H8 parsed", JSON.stringify(w.formulas.find(c => c.sheet === "Model" && c.addr === "H8")));
const e = buildEdges(w);
console.log("edge count", e.length);
console.log("H8 edges", JSON.stringify(e.filter(x => x.to.addr === "H8")));
console.log("B4 direct", JSON.stringify(require ? null : null));

// regex checks
const re = /[[^\]]+\.(xlsx|xls|xlsm|csv)]/i;
for (const s of ["[Q2_Legacy.xlsx]Sheet1!$D$4", "[Book2.xlsx]Sheet1!A1", "[1]Sheet1!A1", "[Book2.xlsm]S!A1", "https://example.com/x.xlsx"]) {
  console.log("regex", JSON.stringify(s), re.test(s));
}
