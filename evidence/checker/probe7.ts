
import { parseArrayBuffer } from "../../app/src/core/parse";
import { dirtyWorkbook } from "../../app/tests/fixtures";
import { scanRisks } from "../../app/src/core/risks";
const w = parseArrayBuffer(dirtyWorkbook(), "dirty.xlsx");
const h2 = w.formulas.find((c: any) => c.addr === "H2");
console.log("H2", JSON.stringify(h2));
console.log("H2 findings", JSON.stringify(scanRisks(w).filter((f: any) => f.addr === "H2").map((f: any) => ({title:f.title, detail:f.detail.slice(0,80)}))));
