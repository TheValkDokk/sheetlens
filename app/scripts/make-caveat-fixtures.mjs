import * as XLSX from "xlsx";
const clean = XLSX.utils.book_new();
const ws = { A1: { t: "s", v: "Region" }, B1: { t: "n", v: 10 }, C1: { t: "n", f: "B1*2", v: 20 }, "!ref": "A1:C2" };
XLSX.utils.book_append_sheet(clean, ws, "Sheet1");
XLSX.writeFile(clean, "/tmp/clean-norefs.xlsx");

const withCol = XLSX.utils.book_new();
const d = { A1: { t: "n", v: 5 }, A2: { t: "n", v: 7 }, B1: { t: "n", f: "SUM(Data!A:A)", v: 12 }, "!ref": "A1:B2" };
XLSX.utils.book_append_sheet(withCol, d, "Data");
XLSX.writeFile(withCol, "/tmp/with-colref.xlsx");
console.log("fixtures written");
