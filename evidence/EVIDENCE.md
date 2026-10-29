# Evidence Ledger — Startup MVP Build / SheetLens

Format: `timestamp · gate · claim · method · verbatim output · verdict`
Self-reports are not evidence. Every row below is reproducible with the stated command.

| # | Timestamp | Gate | Claim | Method | Output | Verdict |
|---|---|---|---|---|---|---|
| 1 | 2026-10-29T13:59Z | activation | Toolchain present | `node -v; pnpm -v; git --version` | node v22.22.3 / pnpm 10.26.1 / git 2.52.0 | PASS |
| 2 | 2026-10-29T13:59Z | activation | No deploy credentials | `command -v vercel netlify flyctl`; `gh auth status` | all missing; gh authenticated | RISK |
| 3 | 2026-10-29T13:59Z | activation | Docker daemon down | `docker info` | cannot connect to /Users/valk/.docker/run/docker.sock | NOTE |
| 4 | 2026-10-29T14:04Z | G2-spike | SheetJS drops formula cells with no cached value | write/read /tmp/s4.xlsx with and without `sheetStubs` | without: `C1 undefined`; with: `{"t":"z","f":"B1*2"}` | PASS (trap + mitigation) |
| 5 | 2026-10-29T07:07:55.136Z | G1 | Spec has 9 traceable requirements + non-empty out-of-scope | `project-specs/sheetlens-setup.md` | R1-R9, 8 excluded capabilities | PASS |
| 6 | 2026-10-29T07:07:55.136Z | G2 | Architecture runs, not just describes | `npx vite build` | 12 modules transformed; dist 455 kB js / 6.5 kB css | PASS |
| 7 | 2026-10-29T07:07:55.136Z | G3 | Unit tests cover parse/formula/risks/deps | `npx vitest run` | 25 passed (25) across 4 files | PASS |
| 8 | 2026-10-29T07:07:55.136Z | G3 | Typecheck clean | `npx tsc --noEmit` | no output | PASS |
| 9 | 2026-10-29T07:07:55.136Z | G3 | Full user journey in a real browser | `node scripts/qa.mjs` (headless Chrome, 1440x940 @2x) | 20 checks, 20 passed, 0 failed | PASS |
| 10 | 2026-10-29T07:07:55.136Z | G3 | Zero console + page errors on happy path | same run, console + pageerror listeners | `consoleErrors: []`, `pageErrors: []` | PASS |
| 11 | 2026-10-29T07:07:55.136Z | G3 | No file egress (privacy promise) | request listener during analysis | external requests: none | PASS |
| 12 | 2026-10-29T07:07:55.136Z | G3 | Refusal path is honest | upload non-workbook zip via file input | "That file is a zip archive, but not a spreadsheet workbook." | PASS |
| 13 | 2026-10-29T07:07:55.136Z | G3 | Export produces a usable audit artifact | CDP download capture | `Q3_Pricing_Model-audit.html`, 4434 bytes, contains findings | PASS |
| 14 | 2026-10-29T07:07:55.136Z | G3 | Responsive at 380px | viewport 380x844, scrollWidth check | 0px overflow | PASS |
| 15 | 2026-10-29T07:07:55.136Z | G3 | Cold load under the 2s bar | page.goto -> networkidle0 | 1007 ms | PASS |
| 16 | 2026-10-29T07:07:55.136Z | G3 | Demo analysis under the 3s bar | click -> results rendered | 54 ms | PASS |

| 17 | 2026-10-29T07:11:55.424Z | G4 | Repo published under TheValkDokk | `gh repo create` + push | https://github.com/TheValkDokk/sheetlens (public, main @ 1cac84e) | PASS |
| 18 | 2026-10-29T07:11:55.424Z | G4 | CI runs the tests, not just the build | GitHub Actions run 40833733055 | build 16s (npm ci -> npm test -> build), deploy 12s, conclusion success | PASS |
| 19 | 2026-10-29T07:11:55.424Z | G4 | Build survives a subpath deploy | static serve of dist under /sheetlens/ | index 200, js 200, css 200 | PASS |
| 20 | 2026-10-29T07:11:55.424Z | G4 | Public URL serves cold | `curl -w %{http_code} %{time_total}` | status=200 time=0.59s size=1107 | PASS |
| 21 | 2026-10-29T07:11:55.424Z | G4 | **Full journey proven on the PUBLIC url** | `BASE=https://thevalkdokk.github.io/sheetlens node scripts/qa.mjs` | 20 checks, 20 passed, 0 failed, consoleErrors [] | PASS |

| 22 | 2026-10-29T07:17:13.958Z | G3 | Reality Checker probe: 190-char filename overflowed the layout by 967px | its browser2.log `longFileName.overflow` | fixed with `overflow-wrap:anywhere; min-width:0`; QA check "long filename does not overflow" added | PASS |
| 23 | 2026-10-29T07:17:13.958Z | G3 | Reality Checker probe: `A1*2` and `A1*1E5` flagged as "assumptions" | its browser.log risk output | rule now fires only on rate-shaped (0<v<1) and indexation (non-integer >1) literals; 2 tests added | PASS |
| 24 | 2026-10-29T07:17:13.958Z | G4 | Fixes live and re-verified on the public URL | `BASE=https://thevalkdokk.github.io/sheetlens node scripts/qa.mjs` | 21 checks, 21 passed, consoleErrors 0 | PASS |
| 25 | 2026-10-29T07:17:13.958Z | G4 | Reality Checker **final verdict** | agent ran >10 min, wrote probes + browser logs, never wrote VERDICT.md | **NOT DELIVERED** — its probes were used, its certification is missing | INCOMPLETE |

| 26 | 2026-10-29T07:19:58.268Z | G3 loop | Reality Checker round 2: **R4 FAIL** — external-link rule never fires | its probe + direct regex test | `/[[^\]]+\.(xlsx|xls|xlsm|csv)\]/i` returned false on `IF(F8>[Q2_Legacy.xlsx]Sheet1!$D$4,1,0)` | FAIL on first pass |
| 27 | 2026-10-29T07:19:58.268Z | G3 loop | Fixed by replacing the char class with bracketed-token detection; 3 tests added incl. all-six-classes | `npx vitest run` | 30 passed (30); `external-link` regression test green | PASS |
| 28 | 2026-10-29T07:19:58.268Z | G3 loop | Demo now surfaces 6 of 6 rule classes | headless DOM probe | 9 high (was 8), "Depends on a file outside this workbook" present | PASS |
| 29 | 2026-10-29T07:19:58.268Z | G5 | 4 long-tail guides ship as crawlable pages + sitemap + robots | `npx vite build`; QA route checks | 5 HTML entries; each guide 200 + h1 + CTA + meta description; sitemap lists 5 URLs | PASS |
| 30 | 2026-10-29T07:19:58.268Z | G5 | Guides are linked from the app and crawlable without JS | QA + `noscript` nav in index.html | 26 browser checks pass (was 21) | PASS |

| 31 | 2026-10-29T07:21:32.652Z | G4 | Fix + guides deployed; all routes live | CI run + curl | /:200, guide:200, guide:200, sitemap:200, robots:200; CI build passes `npm test` before deploy | PASS |
| 32 | 2026-10-29T07:21:32.652Z | G4 | Full journey re-proven on production after the fix | `BASE=https://thevalkdokk.github.io/sheetlens node scripts/qa.mjs` | 26 checks, 26 passed, 0 failed | PASS |
| 33 | 2026-10-29T07:21:32.652Z | G5 | Repo is discoverable and points at the product | `gh api PATCH` + topics | homepage set; topics: audit, browser-only, excel, finance, privacy, sheetjs, spreadsheet, typescript | PASS |
| 34 | 2026-10-29T07:21:32.652Z | G5 | **Real users acquired** | — | **0 verified.** Live URL + indexable guides exist; no human has been reached yet. This is the open objective. | FAIL |

| 35 | 2026-10-29T07:26:15.502Z | G5 | IndexNow key file served from the deployed origin | `curl .../8f3d2a7c4b9e1f6058d4c2a9e7b3f105.txt` | 200, body is the key | PASS |
| 36 | 2026-10-29T07:26:15.502Z | G5 | Search engines notified automatically on every deploy | CI job "indexnow" (run 40835087870) | `submitted 5 urls -> 202 Accepted` | PASS |
| 37 | 2026-10-29T07:26:15.502Z | G5 | A real human feedback channel exists | live bundle grep | "Open an issue" present, links to repo issues | PASS |
| 38 | 2026-10-29T07:26:15.502Z | G5 | Exported reports carry attribution (the only organic referral surface) | live bundle + generated report | "local-only workbook auditor" present in both | PASS |
| 39 | 2026-10-29T07:26:15.502Z | G5 | **Real users acquired** | — | **still 0.** Infrastructure now exists (indexable guides, sitemap, IndexNow, issue channel, referral line); no human has been reached. Requires a post from an account the agent does not have. | FAIL |

| 40 | 2026-10-29T07:32:27.879Z | G3 loop 3 | Reality Checker round 3: **R5 FAIL** — false "safe to edit" for `model!B4` (case-variant sheet resolved to nothing) | its probe, reproduced in QA | Impact tab said "No dependents… you can edit this cell" while `Model!B4` feeds SUMIFS | FAIL on first pass |
| 41 | 2026-10-29T07:32:27.879Z | G3 loop 3 | Fixed: ref resolution moved to `core/refs.ts`, sheet names matched case-insensitively, unknown sheet is an explicit error | `vitest` + browser check | 6 unit tests; QA check "impact resolves a case-variant sheet" passes | PASS |
| 42 | 2026-10-29T07:32:27.879Z | G3 loop 3 | Fixed: empty impact result no longer asserts safety; untraceable constructs surfaced | `caveats` in WorkbookModel + Impact notice | whole-column / named-range counts reported; wording says "unproven, not safety" | PASS |
| 43 | 2026-10-29T07:32:27.879Z | G3 loop 3 | **R9 FAIL** — text containing `xl/workbook.xml` accepted; corrupt zip called password-protected; encrypted .xlsx called legacy .xls | 3 new parse tests | all now refused with accurate messages; 0-byte and EOCD checks added | PASS |
| 44 | 2026-10-29T07:32:27.879Z | G3 loop 3 | **Perf** — 20k cells took 3.1s because the default impact pick was O(formulas × edges) | perf test with a 20k-cell fixture | parse+scan+graph now inside the 2.5s assertion; demo analysis 51 ms | PASS |
| 45 | 2026-10-29T07:32:27.879Z | G3 loop 3 | **R8 FAIL** — no busy state, keyboard could not reach the file picker, Overview overflowed 380px | QA regressions | busy panel; real button (Tab reaches it); tables scroll in their own wrapper | PASS |
| 46 | 2026-10-29T07:32:27.879Z | G3 loop 3 | Rule 1 missed `A1-0.03` but flagged URLs in text | new rule tests | fractional offsets flagged, offsets of 1 ignored, URLs not treated as links | PASS |
| 47 | 2026-10-29T07:32:27.879Z | G3 | Full suite after loop-back | `npx vitest run` / `node scripts/qa.mjs` / `tsc` | **44/44 unit**, **28/28 browser**, typecheck clean | PASS |

| 48 | 2026-10-29T07:33:58.138Z | G4 | Loop-back fixes verified on the public URL | `BASE=https://thevalkdokk.github.io/sheetlens node scripts/qa.mjs` | 28 checks, 28 passed, CI green | PASS |

## Round 2 note: what "growth" can and cannot be automated

Indexing, sitemaps, crawlable content, referral attribution and a feedback channel are all automatable and now exist.
Reaching an actual person is not: it needs a post from an identity (Reddit/HN/LinkedIn) that this session has no
credentials for. `content/posting-runbook.md` reduces that to a 5-minute copy-paste. Until then the honest number
in this ledger stays zero.

## Defects found by QA (and what happened to them)

| Defect | Found by | Fix | Verified |
|---|---|---|---|
| Garbage file silently accepted as a 1-cell workbook | R9 check in qa.mjs | `sniff()` now requires an OOXML part (`xl/workbook.xml`) inside zip files; empty workbooks rejected | regression test + QA check |
| Five identical 0.2-hardcode findings buried the unique risks | visual review of 02-risks.png | findings grouped by rule+evidence; contiguous columns collapse to a range label | 02-risks.png re-shot |
| favicon 404 polluted the console-error signal | console listener | inline SVG favicon, zero network requests | consoleErrors [] |
| 190-char filename overflowed the page by 967px | Reality Checker probe | `.filename` gets `min-width:0; overflow-wrap:anywhere` | new QA check, 21/21 |
| `*2` and `*1E5` reported as hidden assumptions | Reality Checker probe | rule narrowed to rate/indexation shapes | 2 new unit tests |
| **External-link rule never matched** — a malformed character class made one of six advertised rule classes dead code, and no test covered it | Reality Checker round 2 (R4 FAIL) | explicit bracketed-token detection + 3 tests, one asserting all six classes | 30/30 unit, 6/6 classes on the demo |
| "Runs in your browser" overstated (the app is served remotely) | Reality Checker round 2 | badge changed to "Nothing is uploaded", which is the claim that is actually provable | live copy |

## Screenshots (evidence/screens/)

| File | Shows |
|---|---|
| 01-home.png | intake, privacy promises, no results yet |
| 02-risks.png | 8 high / 3 medium findings, grouped, evidence inline |
| 03-overview.png | 4 sheets incl. very-hidden flagged |
| 04-formulas.png | 27 formulas explained, filtered to 3 VLOOKUPs |
| 05-impact.png | blast radius of Model!B4 |
| 06-refusal.png | honest refusal state |
| 07-mobile.png | 380px layout |
