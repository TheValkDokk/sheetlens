# Architecture & UX Foundation — SheetLens

**Seats:** UX Architect (design system, interaction) · Backend Architect (data model, trust boundary, failure modes)

---

## 1. Decision record

| ADR | Decision | Why | Rejected alternative |
|---|---|---|---|
| ADR-1 | Client-only static SPA (Vite + TypeScript), no server | The privacy promise *is* the product. A server would be a liability and a cost. | Next.js API route (breaks the promise, adds hosting failure mode) |
| ADR-2 | Vanilla DOM render functions, no React | ~3 screens of state. A framework is weight without leverage here. | React (adds 45KB + build complexity for no benefit) |
| ADR-3 | SheetJS as the only runtime dependency | Battle-tested xlsx parsing incl. formula text; alternatives are heavier or weaker on formulas. | ExcelJS (heavier browser bundle), hand-rolled unzip+XML (too slow to ship) |
| ADR-4 | Deterministic explainer, no LLM | Zero egress keeps the promise provable; deterministic output is testable. Unknown functions must fail loudly, not invent. | LLM call (breaks privacy, untestable, needs key) |
| ADR-5 | Parse on main thread for v1, worker as P2 | A 20k-cell file parses in ~300ms; premature worker adds message-passing complexity to the model. | Worker from day one |

## 2. Data model

    Sheet = { name, hidden, rows, cols, cellCount, formulas: FormulaCell[], usedRange }
    FormulaCell = { sheet, addr, formula, cached?: string, isError: boolean, row, col }
    Workbook = { fileName, sheets: Sheet[], totals: { cells, formulas, hiddenSheets } }
    Ref = { sheet, addr }                       // addr is A1-style, always absolute-normalised
    Edge = { from: Ref, to: Ref }               // to's formula reads from
    Finding = { rule, severity, sheet, addr, title, detail, evidence: string }

**Invariants**
1. Every formula cell in the parsed workbook appears exactly once in some Sheet.formulas.
2. Refs are normalised to sheet+addr so cross-sheet impact queries need no special case.
3. A Finding's evidence string is verbatim from the file. No paraphrase in evidence.

## 3. Trust boundary

    [File bytes] --XLSX.read(arrayBuffer)--> [Workbook] --> [analysis] --> [DOM]
         ^                                                                    |
         +------------------ nothing leaves this box --------------------------+

- The only network requests are the app's own static assets.
- No analytics in v1 (adding one would silently break the promise).
- Report export is a Blob built in-page; it is never uploaded.
- Refusal paths (R9) are first-class: corrupt zip, wrong extension, password-protected, zero-sheet.

## 4. Failure modes and their handling

| Failure | Detection | User sees |
|---|---|---|
| Not a real xlsx (renamed csv/zip junk) | XLSX.read throws | "That file could not be read as a spreadsheet." + the parser's reason |
| Password protected | read throws with a password/encryption hint | "Password-protected files are not supported." |
| Formula cell with no cached value | sheetStubs:true -> t:'z' with f | counted normally (this is R2, found in spike) |
| Huge workbook (>200k cells) | cell count check before analysis | warning banner + results still produced |
| Formula parse failure on one cell | per-cell try/catch | that cell shows a verbatim-unparsed fallback; scan continues |
| Zero formulas | totals.formulas == 0 | explicit "no formulas found" state, not an empty tab |

## 5. Performance envelope

- Parse 20k cells: target < 3s, measured in the QA gate.
- Formula analysis is O(formulas x tokens); ranges in dependency build cap expansion at 5,000 cells per range to bound worst case.

---

## 6. Design system (UX Architect)

**Positioning:** a serious desk tool, not a toy. Dense but calm. Trustworthy because it is quiet.

    --bg          #0b0d10   night ink        (default surface)
    --panel       #12161b
    --line        #232a33
    --text        #e7ebf0
    --muted       #98a2ad
    --accent      #4fd1a5   signal green     (actions, pass)
    --warn        #f5b14c   amber            (medium risk)
    --danger      #f2657a   coral            (high risk)
    --radius      10px      --gap 16px      type: 14/16/20/28/40

Type: system UI stack (no webfont request — keeps the zero-egress promise).

**Layout:** 12-col grid that collapses to a single column under 720px. Max content width 1080px. Persistent summary strip above tabs so the user always knows the blast radius.

**Interaction rules**
1. One primary action per screen (drop a file / export report).
2. Every risk shows evidence inline — never a badge without the offending fragment.
3. Empty and error states are designed, not defaulted.
4. Tabs are a real tablist: arrow keys move, Home/End jump, focus stays visible.
5. Colour is never the only signal: severity also carries a text label.
