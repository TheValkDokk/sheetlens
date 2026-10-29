# TASKLIST — SheetLens v1

One task = one verifiable unit = one acceptance test. Mark [x] only on Evidence Collector PASS.

| # | Task | Covers | Depends on | Acceptance test |
|---|---|---|---|---|
| T1 | Project skeleton boots: Vite+TS, routing-free single page, dev server serves a styled shell. | R1 (foundation) | — | dev server returns 200; page renders header+dropzone; zero console errors |
| T2 | Parse layer: xlsx/csv/file-bytes to WorkbookModel, sheetStubs on, refusal paths. | R1, R2, R9 | T1 | 3 unit tests pass: formulas-with-values, formula-without-value, corrupt file error |
| T3 | Formula engine: tokenizer, function+reference extraction, deterministic plain-English explainer with explicit unknown-function fallback. | R3 | T2 | 8 unit tests pass incl. nested IF/SUMIFS/VLOOKUP; unknown fn emits 'unrecognised' |
| T4 | Risk scanner: 6 rule classes, severity, evidence fragments. | R4 | T2, T3 | scanner flags >=1 finding per rule on the dirty fixture; clean fixture yields 0 high |
| T5 | Dependency graph + impact query incl. cross-sheet refs and ranges. | R5 | T2, T3 | selecting D2 lists its 3 dependents; cross-sheet ref resolves |
| T6 | UI: overview, risks, formulas, impact views wired to core; keyboard + responsive. | R6, R8 | T4, T5 | keyboard-only walkthrough completes; screenshots at 380 and 1440 |
| T7 | Audit report export (self-contained HTML) + empty/error states. | R7, R9 | T6 | exported file opens offline with findings intact |
| T8 | Production build + public deploy + live smoke test. | G4 | T7 | public URL 200; journey proven on the public URL |

## Dev ↔ QA loop policy

Max 3 attempts per task. QA feedback is passed back verbatim, never summarised into something softer.
