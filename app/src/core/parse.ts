import * as XLSX from "xlsx";
import type { FormulaCell, SheetSummary, WorkbookModel } from "./types";
import { ParseError } from "./types";

const MAX_CELLS = 400_000;

function errText(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/** Parse raw bytes into a model. Pure: no DOM, no network. */
function containsAscii(bytes: Uint8Array, needle: string): boolean {
  // Latin-1 keeps a 1:1 byte mapping so we can search package internals cheaply.
  return new TextDecoder("latin1").decode(bytes).includes(needle);
}

function sniff(buf: ArrayBuffer, fileName: string): "zip" | "xls" | "csv" {
  const b = new Uint8Array(buf);
  if (b.length >= 4 && b[0] === 0x50 && b[1] === 0x4b) {
    // A real Office package always carries an OOXML workbook part. Without it this is
    // an unrelated zip (or a renamed file) and must not be reported as a workbook.
    if (!containsAscii(b, "xl/workbook.xml") && !containsAscii(b, "xl/worksheets/")) {
      throw new ParseError(
        "unreadable",
        "That file is a zip archive, but not a spreadsheet workbook. SheetLens reads .xlsx and .csv."
      );
    }
    return "zip";
  }
  if (b.length >= 4 && b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0) return "xls";
  const ext = fileName.toLowerCase().split(".").pop() ?? "";
  if (ext === "csv" || ext === "txt" || ext === "tsv") return "csv";
  throw new ParseError(
    "unreadable",
    "That file is not a spreadsheet. SheetLens reads .xlsx and .csv — this looks like a different format."
  );
}

export function parseArrayBuffer(buf: ArrayBuffer, fileName: string): WorkbookModel {
  const kind = sniff(buf, fileName);
  if (kind === "xls") {
    throw new ParseError("legacy", "That is a legacy .xls file. Open it in Excel and save as .xlsx, then try again.");
  }
  if (kind === "csv" && new Uint8Array(buf).length < 1) {
    throw new ParseError("empty-file", "That file is empty.");
  }
  let book: XLSX.WorkBook;
  try {
    if (kind === "csv") {
      book = XLSX.read(new TextDecoder().decode(new Uint8Array(buf)), { type: "string", cellFormula: false });
    } else {
    book = XLSX.read(new Uint8Array(buf), {
      type: "array",
      // R2: formula cells without a cached <v> are invisible without this flag.
      sheetStubs: true,
      cellFormula: true,
      cellText: true,
      cellHTML: false,
      cellStyles: true,
    });
    }
  } catch (e) {
    const msg = errText(e);
    if (/password|encrypt/i.test(msg)) {
      throw new ParseError("password", "This file is password-protected. Remove the password and try again.");
    }
    throw new ParseError("unreadable", "That file could not be read as a spreadsheet. (" + msg.slice(0, 140) + ")");
  }

  const names = book.SheetNames ?? [];
  if (names.length === 0) {
    throw new ParseError("empty", "That workbook contains no sheets.");
  }

  const sheets: SheetSummary[] = [];
  const formulas: FormulaCell[] = [];
  let totalCells = 0;

  const meta = book.Workbook?.Sheets ?? [];

  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    const ws = book.Sheets[name];
    if (!ws) continue;
    const ref: string = ws["!ref"] ?? "A1";
    const range = XLSX.utils.decode_range(ref);
    const rows = range.e.r - range.s.r + 1;
    const cols = range.e.c - range.s.c + 1;
    let cellCount = 0;
    let formulaCount = 0;

    for (const key of Object.keys(ws)) {
      if (key.startsWith("!")) continue;
      const cell = ws[key] as XLSX.CellObject | undefined;
      if (!cell) continue;
      cellCount++;
      totalCells++;
      if (cellCount + totalCells > MAX_CELLS && formulas.length > 100_000) {
        throw new ParseError("too-large", "This workbook is too large to analyse in the browser.");
      }
      const f = (cell as { f?: string }).f;
      if (typeof f === "string" && f.length > 0) {
        formulaCount++;
        const decoded = XLSX.utils.decode_cell(key);
        const cachedRaw = (cell as { w?: string; v?: unknown }).w;
        const cached =
          typeof cachedRaw === "string" ? cachedRaw : cell.v === undefined || cell.v === null ? undefined : String(cell.v);
        formulas.push({
          sheet: name,
          addr: key.toUpperCase(),
          formula: f,
          cached,
          isError: typeof cached === "string" && /^#(REF|VALUE|DIV\/0|NAME|N\/A|NULL|NUM)/i.test(cached),
          row: decoded.r,
          col: decoded.c,
        });
      }
    }

    const hidden = (meta[i]?.Hidden ?? 0) as 0 | 1 | 2;
    sheets.push({ name, hidden, rows, cols, cellCount, formulaCount, usedRange: ref });
  }

  if (totalCells === 0) {
    throw new ParseError("empty-content", "This workbook is empty — it contains no cells to analyse.");
  }

  const hiddenSheets = sheets.filter((s) => s.hidden !== 0).length;
  const warning =
    totalCells > 200_000
      ? "This workbook is very large (" + totalCells.toLocaleString() + " cells). Results may take a few seconds."
      : undefined;

  return {
    fileName,
    sheets,
    formulas,
    totals: { cells: totalCells, formulas: formulas.length, hiddenSheets },
    warning,
  };
}

export async function parseFile(file: File): Promise<WorkbookModel> {
  const buf = await file.arrayBuffer();
  if (buf.byteLength === 0) {
    throw new ParseError("empty-file", "That file is empty.");
  }
  return parseArrayBuffer(buf, file.name);
}
