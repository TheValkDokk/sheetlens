
import * as XLSX from "xlsx";
import fs from "node:fs";
const dir = "/Users/valk/Documents/product-test/evidence/checker/fixtures";
const wb = XLSX.utils.book_new();
const name = "<img src=x onerror=window.x=2>";
const ws: any = { "!ref": "A1:B2", A1: { t: "s", v: "x" }, B1: { t: "n", f: '"<img src=x onerror=window.x=1>"', v: "<img src=x onerror=window.x=1>" }, A2: { t: "n", f: "A1*0.2", v: 0.2 } };
XLSX.utils.book_append_sheet(wb, ws, name);
fs.writeFileSync(dir + "/xss.xlsx", XLSX.write(wb, { type: "buffer", bookType: "xlsx" }));
console.log("xss", name.length, fs.statSync(dir + "/xss.xlsx").size);
