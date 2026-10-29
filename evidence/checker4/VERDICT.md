# Reality Check 4 — live build verification

**Verdict: NEEDS WORK**

Target: https://thevalkdokk.github.io/sheetlens/ (bundle `assets/main-B50M-4Gr.js`, 459,114 bytes)
Run: 2026-10-29, headless Chrome via puppeteer-core against the live URL only. No local build, no src edits.
Evidence dir: `evidence/checker4/`

| # | Defect | Result | Live evidence |
|---|--------|--------|---------------|
| 1 | R5 false safety / bad sheet | **FIXED** | `model!b4` → "Direct — formulas that read Model!B4 right now / Model!B19 — SUMIFS(B4:B8,E4:E8,\">=0.15\")". `Nope!B4` → 'No sheet named "Nope". This workbook has: Model, Assumptions, Rates, Old_Adj.' No "No dependents found". `r5-lowercase.png`, `r5-badsheet.png` |
| 2 | R5 caveat for untraceable constructs | **NOT FIXED** (partial) | Mechanism exists and fires for unqualified `A:A` (`caveats.xlsx`: "This workbook uses constructs SheetLens cannot trace: 1 formula(s) use whole-column references such as A:A…"). But the demo workbook's whole-column refs are *qualified* (`VLOOKUP(A4,Rates!A:C,3,FALSE)`, demo.ts:38-40) and the detector regex (`parse.ts:135`) requires a delimiter immediately before `A:C`; `!` is not in the class. Demo Impact tab shows **no** notice. Reproduced independently: `qualified.xlsx` with `SUM(Data!A:A)` → no notice. `caveat-notice.png` |
| 3 | R9 refusals | **FIXED** | a) `pk_text.xlsx` → "That file is not a valid .xlsx workbook — the zip archive is incomplete or corrupt. Re-export it from Excel or Sheets and try again." b) 9-byte PK\x03\x04 file → same corrupt-zip message. c) `empty.xlsx` → "That file is empty." None says password-protected. `r9-*.png` |
| 4 | Perf ~20k cells | **FIXED** | 20,000-cell workbook (1,000×20, 566 KB): change→results **69 ms** (in-page performance.now). Busy state observed live: "Reading the workbook… / Parsing formulas and tracing references" (2 samples, 10 ms polling). `perf-20k.png` |
| 5 | R8 380px / keyboard | **FIXED** | `documentElement.scrollWidth = 380` at load and on Overview after demo load (limit 381). Tab from load: "Skip to content" → **"Choose a file"** (2nd stop). `r8-380.png`, `r8-380-overview.png` |
| 6 | Rule coverage | **FIXED** | `=A1-0.03` → HIGH "Assumption hardcoded into the formula … literal 0.03 … rate-style calculation" (Rules!B1/B3; Caveats!C1). Text cell "https://example.com" (bare and inside prose) **not** flagged; no external/hyperlink finding. Only real external ref in demo (H8 `[Q2_Legacy.xlsx]`) is flagged, so the rule is discriminating, not dead. `rules-result.png`, `rules-risks.png` |

## New findings

1. **Qualified whole-column refs evade the caveat** (root cause of #2). Regex at `app/src/core/parse.ts:135` only matches `A:A` when preceded by `= , ( + - * / & < >`. Any `Sheet!A:A` (the common form) is missed, so real workbooks silently lose the "Treat any empty result below as unproven, not as safety" warning. Fix: allow `!` in the delimiter class or strip sheet qualifiers before testing.
2. **Caveat is only visible on the Impact tab** — not Overview/Risks, where a user decides whether to trust the trace. Low severity, worth a pointer.
3. **Demo workload cannot exercise the warning** — the shipped demo is the one file most users see first, and it is exactly the case the detector misses.

## Reproduce

```bash
cd evidence/checker4
node gen.js .        # fixtures (also gen2.js for the 20k perf file, mkq.js/caveat.js for ref cases)
node r5.js           # defect 1
node main.js         # defects 3/5/perf
node perf3.js        # perf instrumentation
node caveat.js       # defect 2 + 6
```

**Status: NEEDS WORK** — 4 of 6 fixed; the caveat in defect 2 is real but does not reach the demo's qualified whole-column references, which is the case the defect was filed about.
