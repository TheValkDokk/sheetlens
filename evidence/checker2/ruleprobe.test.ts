import * as XLSX from "xlsx";
import { describe, it } from "vitest";
import { parseArrayBuffer } from "../../app/src/core/parse";
import { scanRisks } from "../../app/src/core/risks";
function mk(cells: any) {
  const wb = XLSX.utils.book_new();
  const ws: any = { "!ref": "A1:H20" };
  Object.assign(ws, cells);
  XLSX.utils.book_append_sheet(wb, ws, "S");
  return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}
describe("rule probe", () => {
  it("bracket external link", () => {
    const m = parseArrayBuffer(mk({ A1: { t: "n", v: 1 }, B1: { t: "n", f: "IF(A1>[Q2_Legacy.xlsx]Sheet1!$D$4,1,0)", v: 1 } }), "ext.xlsx");
    console.log("EXT_BRACKET " + JSON.stringify(scanRisks(m).map((f) => f.rule)));
  });
  it("url external link", () => {
    const m = parseArrayBuffer(mk({ A1: { t: "n", v: 1 }, B1: { t: "n", f: "A1+1", v: 2 } }), "u.xlsx");
    console.log("PLAIN " + JSON.stringify(scanRisks(m).map((f) => f.rule)));
  });
  it("broken ref", () => {
    const m = parseArrayBuffer(mk({ A1: { t: "n", v: 1 }, B1: { t: "e", v: "#REF!", w: "#REF!", f: "A1+1" }, B2: { t: "n", f: "A1>#REF!", v: 0 } }), "br.xlsx");
    console.log("BROKEN " + JSON.stringify(scanRisks(m).map((f) => f.rule + ":" + f.addr)));
  });
});
