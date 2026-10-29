
import * as XLSX from "xlsx";
import fs from "node:fs";
import crypto from "node:crypto";
const dir = "/Users/valk/Documents/product-test/evidence/checker/fixtures";
const N = 60000;
const ws: any = { "!ref": "A1:C" + N };
const pool = Array.from({ length: 5000 }, () => crypto.randomBytes(24).toString("base64").slice(0, 32));
for (let i = 1; i <= N; i++) {
  ws["A" + i] = { t: "s", v: pool[i % pool.length] };
  ws["B" + i] = { t: "n", v: i * 1.1 };
  ws["C" + i] = { t: "s", v: i % 7 === 0 ? "yes" : "no" };
}
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "Big");
const out = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
fs.writeFileSync(dir + "/big10mb.xlsx", out);
console.log("bytes", out.length, "cells", N * 3);
