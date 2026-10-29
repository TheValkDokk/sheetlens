import type { Finding, Node, Severity, WorkbookModel } from "./types";
import { extractFunctions, parseFormula, stripEquals } from "./formula";

const VOLATILE = new Set(["NOW", "TODAY", "RAND", "RANDBETWEEN", "OFFSET", "INDIRECT"]);

function walk(n: Node, visit: (node: Node) => void): void {
  visit(n);
  if (n.kind === "binary") {
    walk(n.left, visit);
    walk(n.right, visit);
  } else if (n.kind === "unary") {
    walk(n.operand, visit);
  } else if (n.kind === "call") {
    n.args.forEach((a) => walk(a, visit));
  }
}

export function hardcodedConstants(formula: string): number[] {
  const out: number[] = [];
  try {
    const node = parseFormula(formula);
    walk(node, (n) => {
      if (n.kind !== "binary") return;
      const sides = [n.left, n.right];
      for (const side of sides) {
        if (side.kind !== "number" || side.value === 0 || side.value === 1) continue;
        if (n.op === "*" || n.op === "/") out.push(side.value);
        // A bare offset of 1 (index shifting) is structural; a fractional offset such as
        // "- 0.03" is a tax or haircut and belongs in an input cell.
        else if ((n.op === "+" || n.op === "-") && !Number.isInteger(side.value)) out.push(side.value);
      }
    });
  } catch {
    /* a formula we cannot parse is not a hardcode finding */
  }
  return out;
}

export function scanRisks(wb: WorkbookModel): Finding[] {
  const findings: Finding[] = [];
  const push = (f: Finding) => findings.push(f);

  for (const cell of wb.formulas) {
    const raw = cell.formula;
    const body = stripEquals(raw);
    const clipped = raw.length > 220 ? raw.slice(0, 220) + "…" : raw;

    // Rule 1 — hardcoded assumption inside arithmetic
    // A bare integer >= 1 (x2, x100, x1E5) is usually a unit conversion, not an
    // assumption. Flagging those buries the real ones, so the rule only fires on
    // rate-shaped values (0 < v < 1) and non-integer indexation factors (1.08).
    for (const value of hardcodedConstants(raw)) {
      const isRate = value > 0 && value < 1;
      const isIndexation = !Number.isInteger(value) && value > 1 && value < 1000;
      if (!isRate && !isIndexation) continue;
      push({
        rule: "hardcoded-constant",
        severity: isRate ? "high" : "medium",
        sheet: cell.sheet,
        addr: cell.addr,
        title: "Assumption hardcoded into the formula",
        detail:
          "The literal " +
          value +
          " is used in " +
          (isRate ? "a rate-style calculation" : "an indexation-style multiplier") +
          ". If the assumption changes, this cell will not. A named input cell is safer.",
        evidence: clipped,
      });
    }

    // Rule 2 — volatile functions
    const fns = extractFunctions(raw);
    for (const fn of fns) {
      if (!VOLATILE.has(fn)) continue;
      push({
        rule: "volatile-function",
        severity: "medium",
        sheet: cell.sheet,
        addr: cell.addr,
        title: "Volatile function " + fn,
        detail: fn + " recalculates on every change, so this value is not stable between saves and is hard to audit.",
        evidence: clipped,
      });
    }

    // Rule 3 — broken references
    if (cell.isError) {
      push({
        rule: "broken-reference",
        severity: "high",
        sheet: cell.sheet,
        addr: cell.addr,
        title: "Saved result is an error",
        detail:
          "The value stored in the file is " +
          (cell.cached ?? "an error") +
          ". SheetLens does not recalculate, so this is the last saved state — something upstream was missing or the formula was malformed at save time.",
        evidence: clipped,
      });
    } else if (/#REF!/i.test(body)) {
      push({
        rule: "broken-reference",
        severity: "high",
        sheet: cell.sheet,
        addr: cell.addr,
        title: "Formula references a deleted range",
        detail: "A #REF! marker means a row, column or sheet was removed after this formula was written.",
        evidence: clipped,
      });
    }

    // Rule 4 — external workbook links.
    // Bracketed workbook tokens like [Book2.xlsx] are the reliable marker; a bare
    // extension is not (a cell can legitimately hold the text "report.xlsx").
    const bracketed = body.match(/\[[^\]]*\]/g) ?? [];
    const hasBookRef = bracketed.some((b) => /\.(xlsx|xls|xlsm|csv)\b/i.test(b));
    if (hasBookRef) {
      push({
        rule: "external-link",
        severity: "high",
        sheet: cell.sheet,
        addr: cell.addr,
        title: "Depends on a file outside this workbook",
        detail: "The formula points at an external workbook or URL. The value breaks as soon as that file moves or the owner is offline.",
        evidence: clipped,
      });
    }
  }

  // Rule 5 — inconsistent formula down a column
  const byColumn = new Map<string, typeof wb.formulas>();
  for (const cell of wb.formulas) {
    const key = cell.sheet + "::" + cell.col;
    const list = byColumn.get(key) ?? [];
    list.push(cell);
    byColumn.set(key, list);
  }
  for (const [, cells] of byColumn) {
    if (cells.length < 5) continue;
    const shape = (f: string) =>
      stripEquals(f)
        .replace(/\$?([A-Z]{1,3})\$?[0-9]{1,7}/gi, (_m, col: string) => col.toUpperCase() + "#")
        .replace(/\s+/g, "");
    const counts = new Map<string, number>();
    for (const c of cells) counts.set(shape(c.formula), (counts.get(shape(c.formula)) ?? 0) + 1);
    let dominant = "";
    let best = 0;
    for (const [k, v] of counts) {
      if (v > best) {
        best = v;
        dominant = k;
      }
    }
    if (best / cells.length < 0.8) continue;
    for (const c of cells) {
      if (shape(c.formula) === dominant) continue;
      push({
        rule: "inconsistent-column",
        severity: "medium",
        sheet: c.sheet,
        addr: c.addr,
        title: "Breaks the pattern of its column",
        detail: Math.round((best / cells.length) * 100) + "% of this column follows " + dominant + "; this cell does not. Either a deliberate exception or a dragged-formula mistake — both need a human to confirm which.",
        evidence: c.formula.length > 220 ? c.formula.slice(0, 220) + "…" : c.formula,
      });
    }
  }

  // Rule 6 — hidden sheets
  for (const sheet of wb.sheets) {
    if (sheet.hidden === 0) continue;
    push({
      rule: "hidden-sheet",
      severity: sheet.hidden === 2 ? "high" : "medium",
      sheet: sheet.name,
      addr: "",
      title: sheet.hidden === 2 ? "Very hidden sheet" : "Hidden sheet",
      detail:
        "This sheet is " +
        (sheet.hidden === 2 ? "very hidden (only VBA can unhide it)" : "hidden from the tab bar") +
        " and holds " +
        sheet.formulaCount +
        " formula(s). Content you cannot see is still driving the numbers you can.",
      evidence: sheet.name + " — " + sheet.rows + " rows x " + sheet.cols + " cols",
    });
  }

  const rank: Record<Severity, number> = { high: 0, medium: 1, low: 2 };
  return findings.sort((a, b) => rank[a.severity] - rank[b.severity] || a.sheet.localeCompare(b.sheet) || a.addr.localeCompare(b.addr));
}
