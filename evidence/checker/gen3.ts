
import * as XLSX from "xlsx";
import fs from "node:fs";
const dir = "/Users/valk/Documents/product-test/evidence/checker/fixtures";
const ws: any = { "!ref": "A1:B1", A1: { t: "n", v: 7 }, B1: { t: "n", f: "[Book2.xlsx]Sheet1!$A$1", v: 7 } };
const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Model");
fs.writeFileSync(dir + "/external-only.xlsx", XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
fs.writeFileSync(dir + "/zero-byte.xlsx", "");
console.log("ok", fs.statSync(dir + "/external-only.xlsx").size);
