import * as XLSX from "xlsx";

/**
 * A believable inherited model: layered sheets, a hardcoded override,
 * a volatile date stamp, a broken reference, an external link and a hidden rates sheet.
 * Built in memory so the demo never touches the network.
 */
export function buildDemoWorkbook(): ArrayBuffer {
  const wb = XLSX.utils.book_new();

  const model: Record<string, any> = {
    "!ref": "A1:H24",
    A1: { t: "s", v: "Q3 Pricing Model — created by J. Marsh, last touched 11 months ago", s: { font: { bold: true } } },
    A3: { t: "s", v: "Region" }, B3: { t: "s", v: "Units" }, C3: { t: "s", v: "Price" },
    D3: { t: "s", v: "Gross" }, E3: { t: "s", v: "Discount" }, F3: { t: "s", v: "Net" }, G3: { t: "s", v: "Margin" },
    H3: { t: "s", v: "Flag" },
  };
  const regions = ["North", "South", "East", "West", "Central"];
  regions.forEach((r, i) => {
    const row = 4 + i;
    model["A" + row] = { t: "s", v: r };
    model["B" + row] = { t: "n", v: 1200 + i * 340 };
    model["C" + row] = { t: "n", v: 24.5 + i };
    model["D" + row] = { t: "n", v: (1200 + i * 340) * (24.5 + i) };
    model["E" + row] = { t: "n", v: i === 2 ? 0.12 : 0.15 };
  });
  // Net: uniform except one deviant row (dragged formula mistake)
  for (let i = 0; i < 5; i++) {
    const row = 4 + i;
    const f = i === 3 ? "D" + row + "-D" + row + "*E" + row + "+50" : "D" + row + "-D" + row + "*E" + row;
    model["F" + row] = { t: "n", f, v: 0 };
  }
  // Margin: hardcoded 0.2 rate in every row
  for (let i = 0; i < 5; i++) {
    const row = 4 + i;
    model["G" + row] = { t: "n", f: "F" + row + "*0.2", v: 0 };
  }
  model.H4 = { t: "n", f: "IF(F4>VLOOKUP(A4,Rates!A:C,3,FALSE),1,0)", v: 1 };
  model.H5 = { t: "n", f: "IF(F5>VLOOKUP(A5,Rates!A:C,3,FALSE),1,0)", v: 1 };
  model.H6 = { t: "n", f: "IF(F6>VLOOKUP(A6,Rates!A:C,3,FALSE),1,0)", v: 0 };
  model.H7 = { t: "e", v: "#REF!", w: "#REF!", f: "IF(F7>#REF!,1,0)" };
  model.H8 = { t: "n", f: "IF(F8>[Q2_Legacy.xlsx]Sheet1!$D$4,1,0)", v: 1 };

  model.A10 = { t: "s", v: "Total gross" }; model.B10 = { t: "n", f: "SUM(D4:D8)", v: 0 };
  model.A11 = { t: "s", v: "Total net" }; model.B11 = { t: "n", f: "SUMIF(F4:F8,\">0\",F4:F8)", v: 0 };
  model.A12 = { t: "s", v: "Blended margin" }; model.B12 = { t: "n", f: "SUM(F4:F8)/SUM(D4:D8)", v: 0 };
  model.A13 = { t: "s", v: "Run date" }; model.B13 = { t: "n", f: "TODAY()", v: 45000 };
  model.A14 = { t: "s", v: "Scenario" }; model.B14 = { t: "n", f: "IF(B15>100,\"Stretch\",IF(B15>50,\"Base\",\"Downside\"))", v: "Base" };
  model.A15 = { t: "s", v: "Horizon (months)" }; model.B15 = { t: "n", v: 3 };
  model.A17 = { t: "s", v: "Average net per region" }; model.B17 = { t: "n", f: "AVERAGE(F4:F8)", v: 0 };
  model.A18 = { t: "s", v: "Best region" }; model.B18 = { t: "n", f: "INDEX(A4:A8,MATCH(MAX(F4:F8),F4:F8,0))", v: "North" };
  model.A19 = { t: "s", v: "Units at risk" }; model.B19 = { t: "n", f: "SUMIFS(B4:B8,E4:E8,\">=0.15\")", v: 0 };
  model.A20 = { t: "s", v: "Rounded net" }; model.B20 = { t: "n", f: "ROUND(SUM(F4:F8),2)", v: 0 };
  model.A21 = { t: "s", v: "Uplift" }; model.B21 = { t: "n", f: "B10*1.08*0.965", v: 0 };

  XLSX.utils.book_append_sheet(wb, model as XLSX.WorkSheet, "Model");

  const assumptions: Record<string, any> = {
    "!ref": "A1:C8",
    A1: { t: "s", v: "Assumption" }, B1: { t: "s", v: "Value" }, C1: { t: "s", v: "Note" },
    A2: { t: "s", v: "Target margin" }, B2: { t: "n", v: 0.2 }, C2: { t: "s", v: "Board target" },
    A3: { t: "s", v: "Discount cap" }, B3: { t: "n", v: 0.15 },
    A4: { t: "s", v: "FX buffer" }, B4: { t: "n", v: 1.03 },
    A5: { t: "s", v: "Growth" }, B5: { t: "n", v: 0.08 },
    A6: { t: "s", v: "Check" }, B6: { t: "n", f: "B2*B5", v: 0 },
  };
  XLSX.utils.book_append_sheet(wb, assumptions as XLSX.WorkSheet, "Assumptions");

  const rates: Record<string, any> = { "!ref": "A1:C6",
    A1: { t: "s", v: "Region" }, B1: { t: "s", v: "Floor" }, C1: { t: "s", v: "Threshold" },
  };
  regions.forEach((r, i) => {
    rates["A" + (2 + i)] = { t: "s", v: r };
    rates["B" + (2 + i)] = { t: "n", v: 40 + i * 5 };
    rates["C" + (2 + i)] = { t: "n", v: 5000 + i * 1000 };
  });
  XLSX.utils.book_append_sheet(wb, rates as XLSX.WorkSheet, "Rates");

  const hidden: Record<string, any> = { "!ref": "A1:B4",
    A1: { t: "s", v: "Legacy override" }, B1: { t: "n", v: 0.33 },
    A2: { t: "s", v: "Manual adj" }, B2: { t: "n", f: "B1*B3", v: 0 },
    A3: { t: "n", v: 1.4 },
  };
  XLSX.utils.book_append_sheet(wb, hidden as XLSX.WorkSheet, "Old_Adj");

  wb.Workbook = { Sheets: [{ Hidden: 0 }, { Hidden: 0 }, { Hidden: 0 }, { Hidden: 2 }] };

  return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}
