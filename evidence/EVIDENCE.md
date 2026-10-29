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

## Defects found by QA (and what happened to them)

| Defect | Found by | Fix | Verified |
|---|---|---|---|
| Garbage file silently accepted as a 1-cell workbook | R9 check in qa.mjs | `sniff()` now requires an OOXML part (`xl/workbook.xml`) inside zip files; empty workbooks rejected | regression test + QA check |
| Five identical 0.2-hardcode findings buried the unique risks | visual review of 02-risks.png | findings grouped by rule+evidence; contiguous columns collapse to a range label | 02-risks.png re-shot |
| favicon 404 polluted the console-error signal | console listener | inline SVG favicon, zero network requests | consoleErrors [] |

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
