# SheetLens — Reality Check Verdict

**Verdict: NEEDS WORK** (default; not overridden)

Reviewed: public build main--J6Za1L6.js at commit b64ece5 (2026-10-29 14:24 +07); the core analysis code is from e743514; later commits only add a footer issue link and export attribution. The author was fixing defects concurrently. Core paths below were reproduced on the latest build.

## How this was verified

I ran, personally:

- from app/: **npx vitest run** → 30 passed (30) across 4 files (first snapshot 25/25; 2 tests added for a hardcode fix, 3 for external-link).
- **BASE=http://localhost:4173 node scripts/qa.mjs** → 26 passed, 0 failed, consoleErrors [].
- **BASE=https://thevalkdokk.github.io/sheetlens node scripts/qa.mjs** → 26 passed, 0 failed, cold 1202 ms.
- **node evidence/checker/browser.mjs**, **browser4.mjs**, **probe5.ts**, **probe6.ts** for the adversarial cases below.
- **npx tsc --noEmit** → exit 0.

The public URL is live and currently serves the same app assets as the local build. The 26-check public QA passes. That does not make the product correct; it shows the happy path and five guide pages.

## Claim check

| Claim | What I measured | Result |
|---|---|---|
| 25 unit tests pass | 30/30 now; 25/25 at first snapshot | PASS (number stale) |
| 20 browser checks pass | 26/26 now; 20/20 at first snapshot | PASS (number stale) |
| Zero console errors | consoleErrors [], pageErrors [] on local and public QA | PASS |
| 0px mobile overflow | **39 px** at 380 px on Overview; QA reports 0 because it subtracts innerWidth, which expands to 419 under mobile emulation | **FAIL** |
| 6 risk classes | 6/6 on demo after external-link fix (12 findings: 9 high, 3 medium) | PASS on demo; rule 1 partial |
| Traces what depends on a cell | False "nothing depends" on ordinary constructs | **FAIL** |
| Standalone HTML export | 4,996 bytes, 12 finding rows, 1 attribution link (not fetched), 0 scripts, opens offline in 62 ms | PASS |
| Never uploads | 726,844-byte 3-sheet/1,001-formula upload produced 0 requests, 0 websockets | PASS |
| 20k cells under 3s with visible busy state | 3,101 ms, one 3,090 ms long task, no busy indicator | **FAIL** |

## R1–R9

| ID | Requirement | Evidence I verified | Result |
|---|---|---|---|
| R1 | Parse .xlsx/.csv client-side; no request carries bytes | 726,844 B privacy.xlsx (3 sheets, 1,001 formulas): request listener after upload = []; websockets = []; only app JS/CSS. Source has no fetch/XHR/WebSocket/sendBeacon. Single-column CSV 5×1; xlsx 3 sheets. | **PASS** |
| R2 | Never miss a formula; uncached formula cells counted | 30/30 tests including "finds formula cells that have NO cached value"; privacy reports 1,001 formulas. | **PASS** |
| R3 | Plain-English explanation; unknown functions explicit | Supported formulas read well; WEIRDFN → "Unrecognised function". But a 1,001-formula workbook shows 200 and says "the export contains all of them"; the export (1,806 B) has 1 finding and no formula explanations. SUM(A:A) → "The total of A:A"; @A1*2 raw; SUM(Table1[Amount]) raw. | **PARTIAL** |
| R4 | Six risk classes with severity/evidence | Demo now produces 6 classes; external-only.xlsx is flagged high. But A1+0.2, A1-0.2, A1^2 produce zero hardcoded findings; UI says "does not use hardcoded rates". A URL in a text literal is flagged high as external. Hidden-sheet finding has addr "" and evidence "Old_Adj — 4 rows x 2 cols". New saved-error test passes via formula text #REF!, not the cached-error branch (fixture round-trips cached:"undefined", isError:false). | **PARTIAL** |
| R5 | Select a cell; list direct/transitive dependents, cross-sheet | See D1. Public demo: model!B4 → "Nothing depends … You can edit this cell"; Model!B4 → SUMIFS dependent. Named ranges, whole columns, ranges >5,000 cells, case-variant sheet names and >2,000-cell transitive chains are silently missed or truncated. No cell picker; typed address only. | **FAIL** |
| R6 | Overview: dimensions, counts, hidden flag, characterisation | Demo 4 sheets with 24×8, 71 cells, 25 formulas, "Mixed data…"; very hidden Old_Adj says "Very hidden — only VBA can reveal it"; zero-formula and CSV states work. | **PASS** |
| R7 | One-click self-contained HTML audit with every finding | Current export 4,996 B, 12 finding rows = all 12; 1 link to the app, 0 scripts, no external resources fetched; opens file:// offline; title "Workbook audit". | **PASS** |
| R8 | Keyboard full flow; usable at 380 and 1440 | Keyboard: Tab goes Skip → Load demo → guides. The "Choose a file" label is not focusable and the input has hidden; a11y tree exposes it as StaticText. Keyboard-only user cannot upload. Mobile: 380×844 Overview is 419 px wide vs 380 client (39 px cut); screenshot shows columns clipped. QA uses scrollWidth - innerWidth (innerWidth 419), so reports 0. Long filename fixed (0 px). | **FAIL** |
| R9 | Honest corruption/password/unsupported errors | A non-zip text file starting PK and containing xl/workbook.xml is accepted as a 1-sheet workbook. A corrupt zip is reported "password-protected" (SheetJS says "Unsupported ZIP encryption"). A real encrypted .xlsx is OLE/CFB and is reported "legacy .xls". A 0-byte .xlsx gets the generic not-spreadsheet message; the empty-file path is dead (loadFile calls parseArrayBuffer, not parseFile). | **FAIL** |

## Defects (reproducibility)

### D1 — CRITICAL: Impact gives a false safety clearance

UI text (app/src/ui/app.ts:282): "Nothing depends on X — You can edit this cell without changing any formula in the workbook." Stated as fact, not as a partial-graph warning.

Repro on the public demo (Impact tab): type model!B4 → "Nothing depends on model!B4 / You can edit this cell…"; type Model!B4 → Model!B19 SUMIFS. Excel sheet names are case-insensitive. Typing hello yields "Nothing depends on Model!HELLO" with the same clearance.

Repro with evidence/checker/fixtures/edge.xlsx:
- Rates!A1 → nothing depends; F1 is =rates!A1*2 (lowercase sheet name).
- Model!A2 → nothing depends; D1 is =SUM(A:A) and G1 is =SUM(A1:A6000).
- Model!B1 → only C1; misses E1 =A1*Rate where defined name Rate points at Model!$B$1.
- Model!A1 → C1/E1/G1/I1; A2..A6000 are not edges (large-range expansion returns []).

Causes:
- deps.ts:79 compares sheet names case-sensitively.
- deps.ts:4,37 MAX_EXPANSION=5000; ranges larger than 5,000 cells return [], not a symbolic edge.
- deps.ts:95 silently stops transitive output at 2,000 (if all.size > 2000 break). Probe: a 2,599-formula chain reports direct 1, transitive 2,000, reachesLast:false, no truncation notice.
- formula.ts has no whole-column/row token, defined-name resolution, table structured reference, 3D reference, or external-link node. External [Book2.xlsx] also creates phantom local edges (Model!Q2, Sheet1!D4), so selecting a non-existent local cell can show a dependent.
- refOfString accepts any text as a cell; no validation.

Models routinely use A:A, named ranges, and >5,000-row ranges. This is not a small edge.

### D2 — HIGH: 380 px Overview overflows by 39 px; QA masks it

Repro: viewport 380×844, dpr 2, isMobile true, load /?demo=1, click Overview:
document.documentElement.scrollWidth = 419, clientWidth = 380, scrollWidth - clientWidth = 39.
qa.mjs:176 computes scrollWidth - window.innerWidth; under mobile emulation innerWidth = 419, so it reports 0. Public measurement confirms 39 by clientWidth. Screenshot evidence/checker/browser/overview-380-mobile.png shows the last columns cut off. The only 380 screenshot in evidence is the Risks tab, which has no table.

### D3 — HIGH: keyboard-only user cannot load a workbook

Repro: load home, press Tab. Focus goes Skip → Load demo workbook → guide links. The visible "Choose a file" is a label for=file with no tabindex; the input is hidden. The accessibility snapshot lists "Choose a file" as StaticText, not a button. A keyboard-only analyst can inspect only the demo.

### D4 — HIGH: R9 is not honest for corrupt/encrypted/non-workbook files

Exact outputs from browser.mjs:
- fakezip.xlsx (text starts PK and contains xl/workbook.xml; not a zip) → results: Sheets 1, Formulas 0. No error.
- corrupt.xlsx (PK header + "xl/workbook.xml <broken>") → "This file is password-protected. Remove the password and try again." Underlying SheetJS error: "Unsupported ZIP encryption".
- protected-lookalike.xlsx (OLE/CFB header + EncryptedPackage, the container of a real password-protected .xlsx) → "That is a legacy .xls file".
- zero-byte.xlsx → generic "not a spreadsheet" rather than empty-file. parseFile contains an empty check but is never called.

The sniff is string-based (containsAscii "xl/workbook.xml"), so text can satisfy it; the error classifier maps "Unsupported ZIP encryption" to password.

### D5 — HIGH: 20k cells takes 3.1 s and freezes with no busy state

Repro: bench20k.xlsx (20,010 cells, 10,000 SUM formulas, 110,000 edges), upload in headless Chrome: 3,101 ms to results, one 3,090 ms long task, aria-busy 0, .busy/.loading/.spinner 0. Spec is <3 s with visible busy state. state.busy is set but never rendered. QA's only performance evidence is the demo (64–82 ms), an in-memory 108-cell workbook. The default ingest loop calls impactOf for every formula: O(formulas × edges); Node benchmark 4.5 s. The MAX_CELLS guard (parse.ts:98) is also effectively dead: it only throws when there are >100,000 formulas, so the 400k-cell limit is not enforced.

### D6 — HIGH: R3 export note is false

Repro: upload privacy.xlsx (1,001 formulas), Formulas tab: 200 rows shown, note "Showing the first 200 of 1,001 — the export contains all of them." Export: 1,806 bytes, 1 finding, no formula explanations (hasFormulaExplanations:false). A user who needs the missing 801 is told they are in the export; they are not.

### D7 — MEDIUM: risk rule 1 blind spot and false positive; evidence requirement incomplete

- quiet.xlsx (A1+0.2, A1^2, A1-0.2) and edge.xlsx → "No risk patterns found. This workbook does not use hardcoded rates…". hardcodedConstants only inspects * and / binary nodes. =A1+0.2 is a hardcoded rate/adjustment and is not flagged. A direct false statement, not just a missed badge.
- ="see https://example.com/report" → high "Depends on a file outside this workbook". The URL branch tests raw body, not masked strings.
- Hidden-sheet finding addr ""; R4 says every finding carries a cell address. Evidence is a sheet summary, not the offending fragment.
- New saved-error test does not exercise isError: fixture round-trips cached:"undefined", isError:false; finding comes from the #REF! text branch. A proper error-code cell (v:7, w:"#DIV/0!") works, but is untested.

### D8 — MEDIUM: evidence/process inconsistency

- README says "npm test # 25 unit tests"; RUNBOOK G3 says 25 unit tests, 20 browser checks; EVIDENCE rows 7/9 say 25/20. Current 30/30 and 26/26. The claim was true at first snapshot, but docs never updated.
- EVIDENCE rows 1–4 are timestamped 13:59Z/14:04Z; actual UTC was 07:0x–07:2xZ. Local time was mislabeled as Z.
- The author committed checker scratch fixtures/logs into evidence/checker, including a 9.5 MB workbook and a filename containing an onerror payload. Repository hygiene, not product behavior.
- Public deployment lagged source during review (served the pre-external-fix bundle), then updated. Any certification must name the deployed commit and asset hash. STATE/EVIDENCE say the verdict was "never delivered"; this file is the delivery.

## Edge-case matrix

| Case | Result |
|---|---|
| Zero-formula workbook | PASS — Overview/Formulas/Impact empty states, no crash; Risks says no hardcoded rates (true with no formulas). |
| Single-column CSV | PASS — 5×1, "Raw data — no formulas". |
| Quoted sheet name with spaces ('Q3 Data'!A1) | PASS — parsed, explained, cross-sheet direct edge. |
| 10 MB / 9,498,943 B, 180,000 cells | PASS — 281 ms, no warning (<200k), no crash. |
| Unusual function names | PARTIAL — unknown names explicit; @A1, SUM(Table1[Amount]), LAMBDA raw. |
| =1E5 | PASS — 100000, no phantom E5 reference. |
| Whole-column A:A | FAIL — explanation only; no dependency edges. |
| 20k cells / 10k formulas | FAIL — 3.1 s, blocked main thread, no busy state. |
| XSS (hostile sheet name, formula string, filename) | PASS — no execution; window.x=0, window.y=0; escaping correct. |
| 0 console / page errors | PASS on all runs (happy path and tested refusals). |

## The single most dangerous thing

The "you can edit this cell safely" clearance. It is a categorical statement produced by a dependency graph that misses four normal finance constructs (case-variant sheet refs, whole columns, ranges >5,000 cells, defined-name targets) and silently truncates at 2,000 downstream cells. The public demo itself returns the false clearance for model!B4 while Model!B4 has a dependent. A finance analyst following this would overwrite a driver and not see the downstream impact. Remove it or downgrade to "no formula-level dependents found (partial graph)" until the graph is complete, with limitations visible next to the answer.

## What I would require before a finance team relies on it

1. Blast radius: case-insensitive sheet resolution; whole-column/row refs; symbolic large ranges (no silent 5,000 drop); defined names and table structured refs; 3D refs; external refs as external nodes; explicit truncation at any cap. Cross-check against Excel Trace Dependents on at least 3 real inherited models; publish false-negative/positive counts.
2. Non-formula dependencies: charts, pivots, conditional formatting, data validation and named ranges all consume cells. Model them or state, next to Impact, that they are out of scope.
3. Remove absolute safety claims until 1–2 are done. "Nothing depends" must never be presented as "safe to edit".
4. R9: structural zip validation (attempt a real unzip/SheetJS, not a string marker); detect OLE/CFB EncryptedPackage as encrypted, not .xls; do not map "Unsupported ZIP encryption" to password; specific messages for corrupt, empty, legacy, encrypted, zero-sheet; tests for each.
5. Performance: parse in a worker or chunk; build one reverse graph instead of per-formula BFS; visible busy state (the busy flag is dead); publish 20k and 100k timings. Do not claim the 3 s bar until measured.
6. Mobile: make the Overview table scrollable or card-based; test 380 Overview, Formulas, Impact, not only Risks; measure scrollWidth - clientWidth (or visualViewport), never innerWidth.
7. Keyboard: make the file input reachable (focusable label/button or visible input), add a keyboard-only end-to-end test that uploads a real file, and fix focus loss on re-render.
8. R3/R7 truth: either add the formula inventory and selected-cell impact to the export, or change the note to "the export contains findings only"; label partial coverage. Include tool version, commit and workbook hash in the audit artifact.
9. R4: catch additive/power hardcodes or narrow the rule description; mask string literals for the URL branch; give hidden-sheet findings a real location/evidence or stop claiming cell-level evidence; test the cached-error path with a genuine error cell.
10. Evidence/CI: update counts and timestamps; make the public smoke test name the deployed SHA and asset hash; run performance and real-upload privacy checks in CI; keep scratch fixtures out of the product repo. Add an independent finance-analyst review on a real model before calling this GO.

## Bottom line

The privacy promise is real and the export is a genuine offline artifact. The tests, the demo and the public URL are green because they exercise a tiny, curated workbook and mostly check presentation. The core promise — "what breaks if you edit a cell" — is not yet trustworthy: it gives false safe answers on ordinary workbook constructs, cannot upload by keyboard, has a real 380 px overflow, freezes for 3+ seconds on the spec's own 20k-cell bar, and misdiagnoses corrupt/encrypted files. **NEEDS WORK.**
