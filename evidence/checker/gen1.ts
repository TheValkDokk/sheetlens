
import * as XLSX from "xlsx";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { buildDemoWorkbook } from "../../app/src/demo";

const dir = "/Users/valk/Documents/product-test/evidence/checker/fixtures";
fs.mkdirSync(dir, { recursive: true });

function make(sheets: Record<string, any>, names?: any[]) {
  const wb = XLSX.utils.book_new();
  for (const [n, ws] of Object.entries(sheets)) XLSX.utils.book_append_sheet(wb, ws, n);
  if (names) wb.Workbook = { Names: names };
  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}
function save(name: string, data: Buffer | string) {
  fs.writeFileSync(path.join(dir, name), data);
  console.log(name, fs.statSync(path.join(dir, name)).size);
}
const rnd = (n: number) => crypto.randomBytes(Math.ceil(n * 0.75)).toString("base64").slice(0, n);

// --- edge workbook: whole-column, named range, large range, lowercase sheet, quoted sheet, missed hardcode
const model: any = { "!ref": "A1:I3" };
model.A1 = { t: "n", v: 10 }; model.A2 = { t: "n", v: 20 }; model.A3 = { t: "n", v: 30 };
model.B1 = { t: "n", v: 0.2 };
model.C1 = { t: "n", f: "A1*B1", v: 2 };
model.D1 = { t: "n", f: "SUM(A:A)", v: 60 };
model.E1 = { t: "n", f: "A1*Rate", v: 2 };
model.F1 = { t: "n", f: "=rates!A1*2", v: 10 };
model.G1 = { t: "n", f: "SUM(A1:A6000)", v: 60 };
model.H1 = { t: "n", f: "='Q3 Data'!A1*2", v: 14 };
model.I1 = { t: "n", f: "A1+0.2", v: 10.2 };
const rates: any = { "!ref": "A1:A1", A1: { t: "n", v: 5 } };
const q3: any = { "!ref": "A1:A1", A1: { t: "n", v: 7 } };
save("edge.xlsx", make({ Model: model, Rates: rates, "Q3 Data": q3 }, [{ Name: "Rate", Ref: "Model!$B$1" }]));

// --- quiet workbook: literal additions/powers only (no findings)
const quiet: any = { "!ref": "A1:B3", A1: { t: "n", v: 10 }, B1: { t: "n", f: "A1+0.2", v: 10.2 }, B2: { t: "n", f: "A1^2", v: 100 }, B3: { t: "n", f: "A1-0.2", v: 9.8 } };
save("quiet.xlsx", make({ Model: quiet }));

// --- zero formulas
const zero: any = { "!ref": "A1:C3" };
for (let r = 1; r <= 3; r++) for (const c of ["A","B","C"]) zero[c + r] = { t: "s", v: c + r };
save("zero.xlsx", make({ Data: zero }));

// --- single-column csv
save("single.csv", "Region\nNorth\nSouth\nEast\nWest\n");

// --- privacy: ~200KB random strings, 3 sheets
const p1: any = { "!ref": "A1:D3000" };
for (let r = 1; r <= 3000; r++) {
  p1["A" + r] = { t: "s", v: rnd(20) };
  p1["B" + r] = { t: "s", v: rnd(20) };
  p1["C" + r] = { t: "n", v: r * 1.5 };
  p1["D" + r] = { t: "s", v: rnd(16) };
}
const p2: any = { "!ref": "A1:B1000" };
for (let r = 1; r <= 1000; r++) { p2["A" + r] = { t: "n", f: "A" + Math.max(1, r - 1) + "+1", v: r }; p2["B" + r] = { t: "s", v: rnd(24) }; }
const p3: any = { "!ref": "A1:B500", A1: { t: "s", v: "hidden" }, B1: { t: "n", f: "1+1", v: 2 } };
const pwb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(pwb, p1, "Data");
XLSX.utils.book_append_sheet(pwb, p2, "Calc");
XLSX.utils.book_append_sheet(pwb, p3, "Old");
pwb.Workbook = { Sheets: [{ Hidden: 0 }, { Hidden: 0 }, { Hidden: 1 }] };
save("privacy.xlsx", XLSX.write(pwb, { type: "buffer", bookType: "xlsx" }));

// --- 20k-cell formula benchmark (10k formulas summing 10-cell ranges)
const bench: any = {};
for (let i = 1; i <= 10010; i++) bench["A" + i] = { t: "n", v: i };
for (let i = 1; i <= 10000; i++) bench["B" + i] = { t: "n", f: "SUM(A" + i + ":A" + (i + 9) + ")" };
bench["!ref"] = "A1:B10010";
save("bench20k.xlsx", make({ Model: bench }));

// --- long unbroken file name (demo content)
const longName = "Q3_" + "Pricing_Model_".repeat(11) + "Final.xlsx";
fs.writeFileSync(path.join(dir, longName.slice(0, 200)), Buffer.from(buildDemoWorkbook() as ArrayBuffer));
console.log("longName", longName.slice(0, 200).length);

// --- encrypted xlsx lookalike: OLE2/CFB container (real protected xlsx has this signature)
const ole = Buffer.alloc(2048);
Buffer.from([0xd0,0xcf,0x11,0xe0,0xa1,0xb1,0x1a,0xe1]).copy(ole, 0);
ole.write("EncryptedPackage", 512, "latin1");
ole.write("EncryptionInfo", 600, "latin1");
save("protected-lookalike.xlsx", ole);
