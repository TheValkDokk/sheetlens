export type Severity = "high" | "medium" | "low";

export interface Ref {
  sheet: string;
  addr: string;
}

export interface FormulaCell {
  sheet: string;
  addr: string;
  formula: string;
  cached?: string;
  isError: boolean;
  row: number;
  col: number;
}

export interface SheetSummary {
  name: string;
  hidden: 0 | 1 | 2;
  rows: number;
  cols: number;
  cellCount: number;
  formulaCount: number;
  usedRange: string;
}

export interface WorkbookModel {
  fileName: string;
  sheets: SheetSummary[];
  formulas: FormulaCell[];
  totals: { cells: number; formulas: number; hiddenSheets: number };
  warning?: string;
  /** Constructs SheetLens cannot follow. Empty means the graph is complete. */
  caveats: string[];
}

export interface Finding {
  rule: string;
  severity: Severity;
  sheet: string;
  addr: string;
  title: string;
  detail: string;
  evidence: string;
}

export interface Edge {
  from: Ref;
  to: Ref;
}

export type Node =
  | { kind: "number"; value: number }
  | { kind: "string"; value: string }
  | { kind: "ref"; sheet?: string; addr: string; range?: string }
  | { kind: "call"; name: string; args: Node[] }
  | { kind: "binary"; op: string; left: Node; right: Node }
  | { kind: "unary"; op: string; operand: Node }
  | { kind: "unknown"; text: string };

export class ParseError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = "ParseError";
  }
}
