import type { Ref } from "./types";

export interface ResolvedRef {
  ref: Ref | null;
  error: string | null;
}

/**
 * Resolve user input like "model!b4" or "B4" to a real cell in the workbook.
 *
 * Excel sheet names are case-insensitive, so a case mismatch must resolve to the real
 * sheet. Returning "no dependents" for "model!B4" would read as "safe to edit", which
 * is a false negative on the one screen where being wrong is most expensive.
 */
export function resolveRef(input: string, sheets: { name: string }[]): ResolvedRef {
  const raw = input.trim();
  if (!raw) return { ref: null, error: null };
  if (sheets.length === 0) return { ref: null, error: "This workbook has no sheets." };

  const idx = raw.lastIndexOf("!");
  const sheetName = idx === -1 ? sheets[0].name : raw.slice(0, idx).replace(/^'|'$/g, "");
  const addr = (idx === -1 ? raw : raw.slice(idx + 1)).trim().toUpperCase().replace(/\$/g, "");

  const sheet = sheets.find((s) => s.name.toLowerCase() === sheetName.toLowerCase());
  if (!sheet) {
    return {
      ref: null,
      error: 'No sheet named "' + sheetName + '". This workbook has: ' + sheets.map((s) => s.name).join(", ") + ".",
    };
  }
  if (!/^[A-Z]{1,3}[0-9]{1,7}$/.test(addr)) {
    return { ref: null, error: "That is not a cell address. Use the form Sheet!B4." };
  }
  return { ref: { sheet: sheet.name, addr }, error: null };
}
