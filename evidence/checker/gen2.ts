
import * as XLSX from "xlsx";
import fs from "node:fs";
const dir = "/Users/valk/Documents/product-test/evidence/checker/fixtures";
function make(ws: any) {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Model");
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}
const m: any = { "!ref": "A1:C6", A1: { t: "n", v: 10 }, A2: { t: "n", v: 20 }, A3: { t: "n", v: 30 } };
m.B1 = { t: "n", f: "_xlfn.XLOOKUP(A1,A1:A3,A1:A3)", v: 10 };
m.B2 = { t: "n", f: "@A1*2", v: 20 };
m.B3 = { t: "n", f: "A1*-1", v: -10 };
m.B4 = { t: "n", f: "A1*1E5", v: 1e6 };
m.B5 = { t: "n", f: "SUM(A:A)", v: 60 };
m.B6 = { t: "n", f: "A1+0.2", v: 10.2 };
m.C1 = { t: "n", f: "1E5", v: 100000 };
fs.writeFileSync(dir + "/modern.xlsx", make(m));
console.log("modern", fs.statSync(dir + "/modern.xlsx").size);

// xss fixture: hostile sheet name + string literal + filename handled separately
const wb = XLSX.utils.book_new();
const ws: any = { "!ref": "A1:B2", A1: { t: "s", v: "x" }, B1: { t: "n", f: '"<img src=x onerror=window.__xss=1>"', v: "<img src=x onerror=window.__xss=1>" }, A2: { t: "n", f: "A1*0.2", v: 0.2 } };
XLSX.utils.book_append_sheet(wb, ws, "<img src=x onerror=window.__xss=2>");
fs.writeFileSync(dir + "/xss.xlsx", XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
console.log("xss", fs.statSync(dir + "/xss.xlsx").size);
