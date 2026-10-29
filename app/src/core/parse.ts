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
  if (b.length === 0) {
    throw new ParseError("empty-file", "That file is empty.");
  }
  if (b.length >= 4 && b[0] === 0x50 && b[1] === 0x4b) {
    // Valid Office packages carry both a workbook part and an end-of-central-directory
    // record. Text that merely *contains* the string "xl/workbook.xml" satisfies neither.
    const hasWorkbookPart = containsAscii(b, "xl/workbook.xml") || containsAscii(b, "xl/worksheets/");
    const hasZipDirectory = containsAscii(b, "PK" + String.fromCharCode(5, 6));
    if (!hasWorkbookPart || !hasZipDirectory) {
      throw new ParseError(
        "unreadable",
        "That file is not a valid .xlsx workbook — the zip archive is incomplete or corrupt. Re-export it from Excel or Sheets and try again."
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
    throw new ParseError(
      "legacy",
      "That file is either a legacy .xls workbook or a password-protected .xlsx — both use the same container. " +
        "Save it as an unprotected .xlsx (File > Save As) and try again."
    );
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
    // A failed zip read is corruption, not encryption: never claim "password-protected".
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

  // The delimiter class includes '!' so sheet-qualified ranges (Rates!A:C) are detected,
  // not just bare ones. A qualified whole-column reference is the more common shape.
  const wholeColumnCount = formulas.filter((f) =>
    /(?:^|[=,(+\-*/&<>!])\s*\$?[A-Z]{1,3}:\$?[A-Z]{1,3}(?![0-9A-Za-z_])/i.test(f.formula)
  ).length;
  const nameCount = book.Workbook?.Names?.length ?? 0;
  const caveats: string[] = [];
  if (wholeColumnCount > 0) {
    caveats.push(
      wholeColumnCount + " formula(s) use whole-column references such as A:A. Impact tracing cannot follow those."
    );
  }
  if (nameCount > 0) {
    caveats.push(nameCount + " named range(s) are defined. Impact tracing follows cell references, not names.");
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
    caveats,
  };
}

export async function parseFile(file: File): Promise<WorkbookModel> {
  const buf = await file.arrayBuffer();
  if (buf.byteLength === 0) {
    throw new ParseError("empty-file", "That file is empty.");
  }
  return parseArrayBuffer(buf, file.name);
}
