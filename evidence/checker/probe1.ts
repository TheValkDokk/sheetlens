
import * as XLSX from "xlsx";
import { parseArrayBuffer } from "../../app/src/core/parse";
import { buildEdges, impactOf, expandRange } from "../../app/src/core/deps";
import { explainFormula, extractRefs, extractFunctions, parseFormula } from "../../app/src/core/formula";
import { scanRisks, hardcodedConstants } from "../../app/src/core/risks";

function book(sheets: Record<string, Record<string, any>>, names?: any, meta?: any) {
  const wb = XLSX.utils.book_new();
  for (const [n, cells] of Object.entries(sheets)) {
    const ws: any = { ...cells };
    const addrs = Object.keys(cells).filter(k => !k.startsWith("!"));
    const r = XLSX.utils.decode_range(addrs[0] + ":" + addrs[0]);
    for (const a of addrs) { const d = XLSX.utils.decode_range(a + ":" + a); r.s.r=Math.min(r.s.r,d.s.r); r.s.c=Math.min(r.s.c,d.s.c); r.e.r=Math.max(r.e.r,d.e.r); r.e.c=Math.max(r.e.c,d.e.c); }
    if (addrs.length) ws["!ref"] = XLSX.utils.encode_range(r);
    XLSX.utils.book_append_sheet(wb, ws, n);
  }
  if (meta) wb.Workbook = meta;
  if (names) wb.Workbook = { ...(wb.Workbook ?? {}), Names: names };
  return wb;
}
function buf(wb: XLSX.WorkBook) { return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer; }
function show(label: string, wb: XLSX.WorkBook, fn: (w: any, e: any) => void) {
  try {
    const w = parseArrayBuffer(buf(wb), "probe.xlsx");
    const e = buildEdges(w);
    fn(w, e);
  } catch (err: any) { console.log(label, "THREW", err?.name, err?.code, err?.message); }
}
const out = (label: string, obj: any) => console.log("### " + label + "\n" + JSON.stringify(obj));

// 1. zero formulas
show("zero", book({ S: { A1: { t: "s", v: "x" }, B1: { t: "n", v: 1 } } }), (w, e) => {
  out("zero-formula", { formulas: w.totals.formulas, findings: scanRisks(w).length, edges: e.length });
});

// 2. single-column CSV through the real parser
try {
  const csv = "Region\nNorth\nSouth\nEast";
  const w = parseArrayBuffer(new TextEncoder().encode(csv).buffer, "one.csv");
  out("single-col-csv", { sheets: w.sheets, formulas: w.totals.formulas, cells: w.totals.cells });
} catch (err: any) { out("single-col-csv", { error: err.message }); }

// 3. quoted sheet name containing spaces: dependency + explanation
show("quoted", book({
  "Q3 Data": { A1: { t: "n", v: 5 } },
  Model: { B1: { t: "n", f: "'Q3 Data'!A1*2", v: 10 } },
}), (w, e) => {
  const im = impactOf(e, { sheet: "Q3 Data", addr: "A1" });
  out("quoted-sheet", { refs: extractRefs("='Q3 Data'!A1*2", "Model"), direct: im.direct, transitive: im.transitive, explanation: explainFormula("='Q3 Data'!A1*2") });
});

// 4. case-insensitive sheet name (Excel semantics) impact
show("case", book({
  Rates: { A1: { t: "n", v: 5 } },
  Model: { B1: { t: "n", f: "=rates!A1*2", v: 10 } },
}), (w, e) => {
  const exact = impactOf(e, { sheet: "Rates", addr: "A1" });
  const lower = impactOf(e, { sheet: "rates", addr: "A1" });
  out("sheet-case", { edges: e, impactTargetRatesA1: exact, impactTargetLower: lower });
});

// 5. whole-column ref
show("wholecol", book({
  Model: { A1: { t: "n", v: 1 }, A2: { t: "n", v: 2 }, A3: { t: "n", v: 3 }, B1: { t: "n", f: "=SUM(A:A)", v: 6 } },
}), (w, e) => {
  const im = impactOf(e, { sheet: "Model", addr: "A2" });
  out("whole-column", { refs: extractRefs("=SUM(A:A)", "Model"), edges: e, impactA2: im, explanation: explainFormula("=SUM(A:A)") });
});

// 6. named range
const named = book({ Model: { A1: { t: "n", v: 5 }, B1: { t: "n", v: 0.2 }, B2: { t: "n", f: "=A1*Rate", v: 1 } } });
named.Workbook = { Names: [{ Name: "Rate", Ref: "Model!$B$1" }] };
show("named", named, (w, e) => {
  const im = impactOf(e, { sheet: "Model", addr: "B1" });
  out("named-range", { refs: extractRefs("=A1*Rate", "Model"), edges: e.length, impactB1: im, explanation: explainFormula("=A1*Rate") });
});

// 7. external workbook link and local edge phantom
show("ext", book({
  Model: { D4: { t: "n", f: "=IF(F8>[Q2_Legacy.xlsx]Sheet1!$D$4,1,0)", v: 1 }, F8: { t: "n", v: 3 } },
}), (w, e) => {
  const im = impactOf(e, { sheet: "Sheet1", addr: "D4" });
  out("external-link", { refs: extractRefs("=IF(F8>[Q2_Legacy.xlsx]Sheet1!$D$4,1,0)", "Model"), edges: e, impactLocalSheet1D4: im, rules: [...new Set(scanRisks(w).map(f => f.rule))] });
});

// 8. scientific notation and unary minus
out("1E5", { explain: explainFormula("=1E5"), explainMul: explainFormula("=A1*1E5"), refs: extractRefs("=A1*1E5", "S"), parsed: parseFormula("=1E5") });
out("unary-minus-after-op", { explain: explainFormula("=A1*-1"), explain2: explainFormula("=A1--B1") });

// 9. modern _xlfn function, LAMBDA, implicit intersection, structured refs
for (const f of ["=XLOOKUP(A1,B:B,2)", "=_xlfn.XLOOKUP(A1,B:B,2)", "=_xlfn.IFS(A1>1,2,TRUE,3)", "=LAMBDA(x,x+1)(2)", "=@A1*2", "=SUM(Table1[Amount])", "=INDIRECT(\"A\"&B1)"]) {
  out("explain " + f, { text: explainFormula(f), refs: extractRefs(f, "S"), fns: extractFunctions(f) });
}

// 10. risk rule 1 completeness
for (const f of ["=A1+0.2", "=A1-0.2", "=A1*0.2", "=A1*12", "=A1/4", "=A1^2", "=A1*$B$1", "=A1+$B$2"]) {
  out("hardcode " + f, hardcodedConstants(f));
}

// 11. broken reference variants
show("broken", book({ S: {
  A1: { t: "e", v: "#REF!", w: "#REF!", f: "=B1+1" },
  A2: { t: "e", v: "#N/A", w: "#N/A", f: "=NA()" },
  A3: { t: "n", f: "=#REF!+1", v: 1 },
} }), (w) => {
  out("broken-refs", scanRisks(w).map(f => ({ rule: f.rule, addr: f.addr, sev: f.severity, title: f.title, evidence: f.evidence })));
});

// 12. hidden sheet index mapping (hidden first, visible second)
show("hidden-order", book({ Hid: { A1: { t: "n", v: 1 } }, Vis: { A1: { t: "n", v: 2 } } }, undefined, { Sheets: [{ Hidden: 1 }, { Hidden: 0 }] }), (w) => {
  out("hidden-order", { sheets: w.sheets.map(s => ({ name: s.name, hidden: s.hidden })), hidden: w.totals.hiddenSheets });
});

// 13. aggregation of hardcoded findings per cell
show("many", book({ S: { A1: { t: "n", v: 1 }, B1: { t: "n", f: "=A1*0.2*0.3*0.4", v: 1 } } }), (w) => {
  out("multi-hardcode", scanRisks(w).map(f => ({ addr: f.addr, evidence: f.evidence, detail: f.detail.slice(0, 50) })));
});

// 14. range expansion cap
out("expand", { small: expandRange("A1", "A3"), huge: expandRange("A1", "A10000") });
