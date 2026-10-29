import type { Edge, Ref, WorkbookModel } from "./types";
import { extractRefs } from "./formula";

const MAX_EXPANSION = 5000;

export function colToNum(col: string): number {
  let n = 0;
  for (const ch of col.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}

export function numToCol(n: number): string {
  let s = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function splitAddr(addr: string): { col: number; row: number } | null {
  const m = /^([A-Z]{1,3})([0-9]{1,7})$/.exec(addr.toUpperCase());
  if (!m) return null;
  return { col: colToNum(m[1]), row: Number(m[2]) };
}

export function expandRange(a: string, b: string): string[] {
  const from = splitAddr(a);
  const to = splitAddr(b);
  if (!from || !to) return [a];
  const out: string[] = [];
  const rowStart = Math.min(from.row, to.row);
  const rowEnd = Math.max(from.row, to.row);
  const colStart = Math.min(from.col, to.col);
  const colEnd = Math.max(from.col, to.col);
  if ((rowEnd - rowStart + 1) * (colEnd - colStart + 1) > MAX_EXPANSION) {
    return [];
  }
  for (let r = rowStart; r <= rowEnd; r++) {
    for (let c = colStart; c <= colEnd; c++) {
      out.push(numToCol(c) + r);
    }
  }
  return out;
}

export function buildEdges(wb: WorkbookModel): Edge[] {
  const edges: Edge[] = [];
  for (const cell of wb.formulas) {
    let refs: Ref[] = [];
    try {
      refs = extractRefs(cell.formula, cell.sheet);
    } catch {
      refs = [];
    }
    for (const r of refs) {
      const [a, b] = r.addr.split(":");
      const targets = b ? expandRange(a, b) : [a];
      for (const t of targets) {
        edges.push({ from: { sheet: r.sheet, addr: t }, to: { sheet: cell.sheet, addr: cell.addr } });
      }
    }
  }
  return edges;
}

export interface Impact {
  direct: Ref[];
  transitive: Ref[];
}

export function impactOf(edges: Edge[], target: Ref): Impact {
  const key = (r: Ref) => r.sheet + "!" + r.addr;
  const directMap = new Map<string, Ref>();
  const all = new Map<string, Ref>();

  for (const e of edges) {
    if (e.from.sheet === target.sheet && e.from.addr === target.addr) directMap.set(key(e.to), e.to);
  }
  const queue: Ref[] = [...directMap.values()];
  for (const q of queue) all.set(key(q), q);

  let guard = 0;
  while (queue.length > 0 && guard < 20000) {
    const cur = queue.shift() as Ref;
    guard++;
    for (const e of edges) {
      if (e.from.sheet !== cur.sheet || e.from.addr !== cur.addr) continue;
      const k = key(e.to);
      if (all.has(k)) continue;
      all.set(k, e.to);
      queue.push(e.to);
    }
    if (all.size > 2000) break;
  }

  const direct = [...directMap.values()];
  const transitive = [...all.values()].filter((r) => !directMap.has(key(r)));
  return { direct, transitive };
}

export function formulaAt(wb: WorkbookModel, ref: Ref): string | undefined {
  const hit = wb.formulas.find((c) => c.sheet === ref.sheet && c.addr === ref.addr);
  return hit?.formula;
}
