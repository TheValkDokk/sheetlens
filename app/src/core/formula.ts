import type { Node, Ref } from "./types";

const CELL_PATTERN = "\\$?[A-Z]{1,3}\\$?[0-9]{1,7}";
const REF_SOURCE = "(?:(?:'([^']+)'|([A-Za-z_][A-Za-z0-9_.]*))!)?(" + CELL_PATTERN + ")(?::(" + CELL_PATTERN + "))?";

export function stripEquals(formula: string): string {
  const t = formula.trim();
  return t.startsWith("=") ? t.slice(1).trim() : t;
}

/** Blank out quoted strings so ref/function scanning cannot see text literals. */
function maskStrings(input: string): string {
  let out = "";
  let inStr = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === '"') {
      inStr = !inStr;
      out += " ";
      continue;
    }
    out += inStr ? " " : ch;
  }
  return out;
}

function isBalanced(inner: string): boolean {
  let depth = 0;
  let inStr = false;
  for (let i = 0; i < inner.length; i++) {
    const c = inner[i];
    if (c === '"') inStr = !inStr;
    else if (!inStr && c === "(") depth++;
    else if (!inStr && c === ")") {
      depth--;
      if (depth < 0) return false;
    }
  }
  return depth === 0;
}

export function splitTopLevel(expr: string, sep: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let inStr = false;
  let current = "";
  for (let i = 0; i < expr.length; i++) {
    const c = expr[i];
    if (c === '"') {
      inStr = !inStr;
      current += c;
      continue;
    }
    if (!inStr && c === "(") depth++;
    if (!inStr && c === ")") depth--;
    if (!inStr && depth === 0 && c === sep) {
      parts.push(current);
      current = "";
      continue;
    }
    current += c;
  }
  parts.push(current);
  return parts.map((p) => p.trim());
}

const PRECEDENCE: string[][] = [
  ["<=", ">=", "<>", "=", "<", ">"],
  ["&"],
  ["+", "-"],
  ["*", "/"],
  ["^"],
];

function findBinary(expr: string, ops: string[]): { op: string; index: number } | null {
  let depth = 0;
  let inStr = false;
  let found: { op: string; index: number } | null = null;
  const sorted = [...ops].sort((a, b) => b.length - a.length);
  for (let i = 0; i < expr.length; i++) {
    const c = expr[i];
    if (c === '"') {
      inStr = !inStr;
      continue;
    }
    if (inStr) continue;
    if (c === "(") {
      depth++;
      continue;
    }
    if (c === ")") {
      depth--;
      continue;
    }
    if (depth !== 0) continue;
    for (const op of sorted) {
      if (expr.startsWith(op, i)) {
        // a leading operator is unary, not binary
        if (i === 0) {
          i += op.length - 1;
          break;
        }
        found = { op, index: i };
        i += op.length - 1;
        break;
      }
    }
  }
  return found;
}

export function parseFormula(raw: string): Node {
  return parseExpr(stripEquals(raw));
}

function parseExpr(input: string): Node {
  let e = input.trim();

  while (e.startsWith("(") && e.endsWith(")") && isBalanced(e.slice(1, -1))) {
    e = e.slice(1, -1).trim();
  }
  if (e.length === 0) return { kind: "unknown", text: "" };

  for (const level of PRECEDENCE) {
    const hit = findBinary(e, level);
    if (hit) {
      return {
        kind: "binary",
        op: hit.op,
        left: parseExpr(e.slice(0, hit.index)),
        right: parseExpr(e.slice(hit.index + hit.op.length)),
      };
    }
  }

  if ((e.startsWith("-") || e.startsWith("+")) && e.length > 1) {
    return { kind: "unary", op: e[0], operand: parseExpr(e.slice(1)) };
  }

  const num = /^-?[0-9]+(\.[0-9]+)?([eE][+-]?[0-9]+)?$/.exec(e);
  if (num) return { kind: "number", value: Number(e) };

  if (e.startsWith('"') && e.endsWith('"') && e.length >= 2) {
    return { kind: "string", value: e.slice(1, -1).replace(/""/g, '"') };
  }

  const call = /^([A-Za-z][A-Za-z0-9._]*)\s*\(([\s\S]*)\)$/.exec(e);
  if (call && isBalanced(call[2])) {
    const inner = call[2].trim();
    const args = inner.length === 0 ? [] : splitTopLevel(inner, ",").map(parseExpr);
    return { kind: "call", name: call[1].toUpperCase(), args };
  }

  const optSheet = "^(?:(?:'([^']+)'|([A-Za-z_][A-Za-z0-9_.]*))!)?";
  const rangeM = new RegExp(optSheet + "(" + CELL_PATTERN + "):(" + CELL_PATTERN + ")$", "i").exec(e);
  if (rangeM) {
    const a = rangeM[3].replace(/\$/g, "").toUpperCase();
    const b = rangeM[4].replace(/\$/g, "").toUpperCase();
    return { kind: "ref", sheet: rangeM[1] ?? rangeM[2] ?? undefined, addr: a, range: b };
  }
  const single = new RegExp(optSheet + "(" + CELL_PATTERN + ")$", "i").exec(e);
  if (single) {
    const addr = single[3].replace(/\$/g, "").toUpperCase();
    return { kind: "ref", sheet: single[1] ?? single[2] ?? undefined, addr };
  }

  return { kind: "unknown", text: e };
}

export function extractFunctions(formula: string): string[] {
  const masked = maskStrings(stripEquals(formula));
  const found: string[] = [];
  const re = /([A-Za-z][A-Za-z0-9._]*)\s*\(/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(masked)) !== null) {
    const name = m[1].toUpperCase();
    if (name === "IF" || !found.includes(name)) {
      if (!found.includes(name)) found.push(name);
    }
  }
  return found;
}

export function extractRefs(formula: string, defaultSheet: string): Ref[] {
  const masked = maskStrings(stripEquals(formula));
  const re = new RegExp(REF_SOURCE, "g");
  const refs: Ref[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(masked)) !== null) {
    const start = m.index;
    const before = start > 0 ? masked[start - 1] : "";
    if (before && /[A-Za-z0-9_.$]/.test(before)) continue;
    const sheet = m[1] ?? m[2] ?? defaultSheet;
    const a = m[3].replace(/\$/g, "").toUpperCase();
    const b = m[4] ? m[4].replace(/\$/g, "").toUpperCase() : undefined;
    refs.push({ sheet, addr: a });
    if (b) {
      // store the range end in a companion field via a marker ref
      refs.push({ sheet, addr: a + ":" + b });
    }
  }
  return refs;
}

const WORD: Record<string, string> = {
  "+": "plus",
  "-": "minus",
  "*": "multiplied by",
  "/": "divided by",
  "^": "raised to the power of",
  "&": "joined with",
  "=": "equal to",
  "<>": "not equal to",
  "<": "less than",
  ">": "greater than",
  "<=": "less than or equal to",
  ">=": "greater than or equal to",
};

function renderRef(n: { sheet?: string; addr: string; range?: string }): string {
  const where = n.sheet ? "sheet '" + n.sheet + "' " : "";
  if (n.range) return where + "range " + n.addr + ":" + n.range;
  return where + "cell " + n.addr;
}

export function renderNode(n: Node): string {
  switch (n.kind) {
    case "number":
      return String(n.value);
    case "string":
      return '"' + n.value + '"';
    case "ref":
      return renderRef(n);
    case "unary":
      return (n.op === "-" ? "negative " : "") + renderNode(n.operand);
    case "binary":
      return renderNode(n.left) + " " + (WORD[n.op] ?? n.op) + " " + renderNode(n.right);
    case "unknown":
      return n.text;
    case "call": {
      const a = n.args.map(renderNode);
      const fn = FN[n.name];
      if (!fn) {
        return "unrecognised function " + n.name + "(" + n.args.map(renderNode).join(", ") + ")";
      }
      return fn(a);
    }
  }
}

const FN: Record<string, (a: string[]) => string> = {
  SUM: (a) => "the total of " + a.join(" and "),
  AVERAGE: (a) => "the average of " + a.join(" and "),
  MIN: (a) => "the smallest of " + a.join(" and "),
  MAX: (a) => "the largest of " + a.join(" and "),
  COUNT: (a) => "the count of numeric entries in " + a.join(" and "),
  COUNTA: (a) => "the count of non-empty entries in " + a.join(" and "),
  COUNTBLANK: (a) => "the count of blank entries in " + a.join(" and "),
  SUMIF: (a) => "the total of " + (a[0] ?? "?") + " where " + (a[1] ?? "?") + " matches " + (a[2] ?? "?") + (a[3] ? " (" + a[3] + ")" : ""),
  SUMIFS: (a) => {
    const pairs: string[] = [];
    for (let i = 1; i < a.length - 1; i += 2) pairs.push(a[i] + " matches " + a[i + 1]);
    return "the total of " + (a[0] ?? "?") + " where " + pairs.join(" and ");
  },
  COUNTIF: (a) => "how many in " + (a[0] ?? "?") + " match " + (a[1] ?? "?"),
  COUNTIFS: (a) => {
    const pairs: string[] = [];
    for (let i = 0; i < a.length - 1; i += 2) pairs.push(a[i] + " matches " + a[i + 1]);
    return "how many rows match " + pairs.join(" and ");
  },
  IF: (a) => "if " + (a[0] ?? "?") + ", then " + (a[1] ?? "nothing") + ", otherwise " + (a[2] ?? "nothing"),
  IFS: (a) => {
    const pairs: string[] = [];
    for (let i = 0; i < a.length - 1; i += 2) pairs.push("if " + a[i] + " then " + a[i + 1]);
    return pairs.join(", else ") || "?";
  },
  IFERROR: (a) => (a[0] ?? "?") + ", falling back to " + (a[1] ?? "nothing") + " on any error",
  IFNA: (a) => (a[0] ?? "?") + ", falling back to " + (a[1] ?? "nothing") + " when no match is found",
  AND: (a) => "true only if all of: " + a.join(", "),
  OR: (a) => "true if any of: " + a.join(", "),
  NOT: (a) => "the opposite of " + (a[0] ?? "?"),
  ROUND: (a) => (a[0] ?? "?") + " rounded to " + (a[1] ?? "?") + " decimal places",
  ROUNDUP: (a) => (a[0] ?? "?") + " rounded up to " + (a[1] ?? "?") + " decimal places",
  ROUNDDOWN: (a) => (a[0] ?? "?") + " rounded down to " + (a[1] ?? "?") + " decimal places",
  ABS: (a) => "the absolute value of " + (a[0] ?? "?"),
  VLOOKUP: (a) =>
    "the value from column " + (a[2] ?? "?") + " of " + (a[1] ?? "?") + " where the first column equals " + (a[0] ?? "?") + (a[3] ? " (" + a[3] + ")" : " (approximate match)"),
  HLOOKUP: (a) => "the value from row " + (a[2] ?? "?") + " of " + (a[1] ?? "?") + " where the top row equals " + (a[0] ?? "?"),
  XLOOKUP: (a) => "the value from " + (a[1] ?? "?") + " where " + (a[0] ?? "?") + " matches " + (a[2] ?? "?") + (a[3] ? ", otherwise " + a[3] : ""),
  INDEX: (a) => "the entry at " + (a[1] ?? "?") + (a[2] ? ", " + a[2] : "") + " of " + (a[0] ?? "?"),
  MATCH: (a) => "the position of " + (a[0] ?? "?") + " within " + (a[1] ?? "?") + (a[2] ? " (" + a[2] + ")" : ""),
  CONCATENATE: (a) => "the text " + a.join(" joined to "),
  CONCAT: (a) => "the text " + a.join(" joined to "),
  TEXTJOIN: (a) => "the text " + a.slice(1).join(" joined with " + (a[0] ?? '","')),
  LEN: (a) => "the length of " + (a[0] ?? "?"),
  LEFT: (a) => "the first " + (a[1] ?? "?") + " characters of " + (a[0] ?? "?"),
  RIGHT: (a) => "the last " + (a[1] ?? "?") + " characters of " + (a[0] ?? "?"),
  MID: (a) => "characters from " + (a[1] ?? "?") + " for " + (a[2] ?? "?") + " of " + (a[0] ?? "?"),
  TRIM: (a) => (a[0] ?? "?") + " with extra spaces removed",
  TEXT: (a) => (a[0] ?? "?") + " formatted as " + (a[1] ?? "?"),
  DATE: (a) => "the date " + a.join("-"),
  TODAY: () => "today's date",
  NOW: () => "the current date and time",
  SUMPRODUCT: (a) => "the sum of the products of " + a.join(" and "),
  NPV: (a) => "the net present value at " + (a[0] ?? "?") + " of " + a.slice(1).join(", "),
  IRR: (a) => "the internal rate of return of " + (a[0] ?? "?"),
  PMT: (a) => "the payment for rate " + (a[0] ?? "?") + ", periods " + (a[1] ?? "?") + ", present value " + (a[2] ?? "?"),
  PV: (a) => "the present value at rate " + (a[0] ?? "?") + " over " + (a[1] ?? "?") + " periods",
  SUBSTITUTE: (a) => (a[0] ?? "?") + " with " + (a[1] ?? "?") + " replaced by " + (a[2] ?? "?"),
  UPPER: (a) => (a[0] ?? "?") + " in upper case",
  LOWER: (a) => (a[0] ?? "?") + " in lower case",
  ISBLANK: (a) => "whether " + (a[0] ?? "?") + " is empty",
  ISNUMBER: (a) => "whether " + (a[0] ?? "?") + " is a number",
};

export function explainFormula(formula: string): string {
  const node = parseFormula(formula);
  const text = renderNode(node);
  const sentence = text.length > 0 ? text[0].toUpperCase() + text.slice(1) : "An empty formula";
  return sentence + ".";
}

export const SUPPORTED_FUNCTIONS = Object.keys(FN);
