import * as XLSX from "xlsx";

export interface CellSpec {
  f?: string;
  v?: string | number | boolean | null;
  t?: "n" | "s" | "b" | "e";
}

export function makeWorkbook(sheets: Record<string, Record<string, CellSpec>>, hidden: Record<string, 0 | 1 | 2> = {}): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  for (const [name, cells] of Object.entries(sheets)) {
    const ws: Record<string, unknown> = {};
    const addrs = Object.keys(cells);
    for (const addr of addrs) {
      const spec = cells[addr];
      const cell: Record<string, unknown> = {};
      if (spec.t) cell.t = spec.t;
      else cell.t = typeof spec.v === "string" ? "s" : "n";
      if (spec.v !== undefined && spec.v !== null) cell.v = spec.v;
      if (spec.f) cell.f = spec.f;
      if (cell.v === undefined && !cell.f) cell.t = "z";
      ws[addr] = cell;
    }
    if (addrs.length > 0) {
      const range = XLSX.utils.decode_range(addrs[0] + ":" + addrs[0]);
      for (const a of addrs) {
        const d = XLSX.utils.decode_range(a + ":" + a);
        range.s.r = Math.min(range.s.r, d.s.r);
        range.s.c = Math.min(range.s.c, d.s.c);
        range.e.r = Math.max(range.e.r, d.e.r);
        range.e.c = Math.max(range.e.c, d.e.c);
      }
      ws["!ref"] = XLSX.utils.encode_range(range);
    }
    XLSX.utils.book_append_sheet(wb, ws as XLSX.WorkSheet, name);
  }
  const hiddenEntries = Object.entries(hidden);
  if (hiddenEntries.length > 0) {
    wb.Workbook = { Sheets: Object.keys(sheets).map((n) => ({ Hidden: hidden[n] ?? 0 })) };
  }
  const out = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  return out as ArrayBuffer;
}

export function dirtyWorkbook(): ArrayBuffer {
  return makeWorkbook(
    {
      Model: {
        A1: { v: "Region" }, B1: { v: "Amount" }, C1: { v: "Tax" },
        A2: { v: "EU" }, B2: { v: 100 }, C2: { f: "B2*0.2", v: 20 },
        A3: { v: "US" }, B3: { v: 250 }, C3: { f: "B3*0.2", v: 50 },
        A4: { v: "APAC" }, B4: { v: 75 }, C4: { f: "B4*0.2", v: 15 },
        A5: { v: "LATAM" }, B5: { v: 40 }, C5: { f: "B5*0.2", v: 8 },
        A6: { v: "MEA" }, B6: { v: 55 }, C6: { f: "B6*0.25", v: 13.75 },
        D2: { f: "SUM(C2:C6)", v: 106.75 },
        D3: { f: "NOW()", v: 45000 },
        H2: { t: "e", v: "#REF!", f: "IF(D2>#REF!,1,0)" },
        I2: { f: "IF(B2>[Book2.xlsx]Sheet1!$A$1,1,0)", v: 1 },
      },
      "Q3 Data": {
        A1: { v: "key" }, B1: { v: "val" },
        A2: { v: "EU" }, B2: { v: 10 },
        C2: { f: "'Model'!B2*2", v: 200 },
      },
      Hidden1: { A1: { v: "secret" }, A2: { f: "1+1", v: 2 } },
    },
    { Hidden1: 1 }
  );
}

export function cleanWorkbook(): ArrayBuffer {
  return makeWorkbook({
    Clean: {
      A1: { v: "x" }, B1: { v: 1 },
      C2: { f: "B2+1", v: 2 },
    },
  });
}
