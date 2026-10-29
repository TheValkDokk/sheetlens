# Reality Check — Round 5: PASS (4/4)

Target: https://thevalkdokk.github.io/sheetlens/ · Live build audited 2025-10-29
Evidence: `evidence/checker5/run.json`, screenshots `1-demo-caveat.png` … `7-keyboard-focus.png`, axe `evidence/a11y/axe.json`.

## 1. CAVEAT — PASS
- `/?demo=1` summary shows: "Not every reference can be traced in this workbook: 3 formula(s) use whole-column references such as A:A. Impact tracing cannot follow those." (see 1-demo-caveat.png).
- Clean workbook built with SheetJS (no A:A refs, no named ranges, 3 formulas): **zero** `.notice` elements rendered (2-clean-no-caveat.png). Caveat is conditional, not boilerplate.

## 2. A11Y — PASS
- `BASE=https://thevalkdokk.github.io/sheetlens node scripts/a11y.mjs`: home, results-risks, results-overview, results-formulas, results-impact, guide → **0 violations** each.
- Real keyboard: Tab 1 = "Skip to content" link (1px auto outline), Tab 2 = "Choose a file" button with visible 2px solid rgb(79,209,165) outline. Reachable and clearly focused (7-keyboard-focus.png).

## 3. REAL WORLD — PASS
- Microsoft Financial Sample.xlsx (83,418 bytes, valid xlsx) uploaded through live UI: no crash/error box, stats "1 sheet, 0 formulas, 0 high risk", Formulas tab states "No formulas in this workbook". 0 console errors, 0 page errors, 0 failed requests.
- 0 formulas is honest: this workbook is data-only.

## 4. REGRESSION — PASS
- `model!b4` → Direct: `calc!A1` (`model!B4+1`), explained sentence; no error.
- `Nope!B4` → explicit: "No sheet named \"Nope\". This workbook has: model, calc."
- Fake PK text file (.xlsx named, plain text starting "PK") → refused: "not a valid .xlsx workbook — the zip archive is incomplete or corrupt. Re-export it…"; no password/encryption claim.

## New
Nothing new. Minor note: demo summary caveat wording says "Impact tracing cannot follow those" rather than "not traced" verbatim — equivalent meaning, acceptable.

**Verdict: PASS. No blockers.**
