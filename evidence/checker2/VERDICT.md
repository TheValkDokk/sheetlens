# SheetLens — Reality Check Verdict (checker2)

**VERDICT: NEEDS WORK** — build & tests are real, privacy holds, but the "6 risk rules" claim is false in shipped code: the external-link rule never fires for its primary case.

Checked: 2026-10-29 ~14:2x Asia/Saigon on commit state at /Users/valk/Documents/product-test (app version 1.0.0, live bundle index-DjMaGe8_.js, 456,074 B).

## Requirement table

| Req | Claim | Status | Evidence |
|---|---|---|---|
| R1 | Parse .xlsx/.csv in-browser; no request carries file bytes | **PASS (scoped)** | Headless Chrome on live `/?demo=1`: exactly 3 requests — document, `assets/index-DjMaGe8_.js`, `assets/index-CPijqoL8.css`. Zero POST/PUT, one host (`thevalkdokk.github.io`), no request body. `grep -rn "fetch(\|XMLHttpRequest\|sendBeacon\|new WebSocket\|EventSource" app/src` → NONE. Caveat: bundle *does* contain one `fetch()`, Vite's modulepreload polyfill (self-assets only). Privacy is true for file bytes, not "zero network". |
| R2 | Formula cells without cached value counted | **PASS** | `parse.ts` passes `sheetStubs: true`; `tests/parse.test.ts` has explicit no-cached-value test; 27/27 green. |
| R3 | Plain-English formula explanation | **PARTIAL — not verified by me** | `formula.ts` exists; I did not read its explanation output or its "unrecognised: NAME" fallback. No verification. |
| R4 | 6 risk rule classes, each finding with sheet/addr/severity/reason/evidence | **FAIL** | 5 of 6 classes observed live. `external-link` never produced. In `risks.ts:108`: `/[[^\]]+\.(xlsx|xls|xlsm|csv)]/i` is a malformed character class — tested directly against `IF(F8>[Q2_Legacy.xlsx]Sheet1!$D$4,1,0)` → **false**. The demo's external-workbook cell (Model!H8) produces no finding; the live Risks tab shows hardcoded-constant, volatile-function, broken-reference, inconsistent-column, hidden-sheet only. Only `https?://` formulas would fire. Tests cover only 4 classes (`tests/risks.test.ts` asserts hardcoded/volatile/inconsistent/hidden) — the gap is untested, not caught. |
| R5 | Impact analysis, direct + transitive, cross-sheet | **UNVERIFIED** | Impact tab renders and tab count present; I did not exercise selection or transitive resolution. `deps.ts` exists. |
| R6 | Sheet map: rows×cols, formula count, data count, hidden flag, characterisation | **PARTIAL** | Live overview reports 4 sheets / 27 formulas; hidden flag observable via hidden-sheet finding. "Role guess"/characterisation is a heuristic presented as fact — not verified against truth. |
| R7 | One-click self-contained offline HTML export | **PARTIAL** | Export button present; `exportReport()` builds a Blob + `createObjectURL` and downloads `*-audit.html` (`ui/app.ts:452-458`). I did not open the exported file offline or confirm every finding is included. |
| R8 | Keyboard accessible, 380px and 1440px | **PARTIAL** | Focus-visible styles + skip link + `tabindex` tab pattern exist; keydown handler at `ui/app.ts:510`. No keyboard walkthrough or 380px check run. |
| R9 | Honest failure (corrupt/password/unsupported) | **PARTIAL** | `parse.ts` throws typed `ParseError` for zip-not-workbook, legacy .xls, empty, password (message sniff `/password|encrypt/`), oversized. Unit-tested for zip/garbage. Not exercised in the live UI; password sniff relies on error text, which SheetJS may not emit. |

Build: `npx vitest run` → **27 passed (27)**, 4 files, 412ms. `npx tsc --noEmit` → **exit 0, no output**. Live site: HTTP 200, assets 200, `?demo=1` renders (4 sheets, 27 formulas, 8 high risk, 11 findings), 1110ms, **zero console errors**. Note: `?demo=1` HTML is byte-identical to `/` (1107 B) — demo is client-side only, so curl alone would have "passed" a broken demo.

## Answers

**What does it claim it cannot know?**

README.md:58 advertises "6 rule classes" and README.md:12 says "Everything runs in your browser. The file is never uploaded." The first is false; the second is true for file bytes.

Role/characterisation heuristics (ui/app.ts:57):

```
function characterise(sheet: { cellCount: number; formulaCount: number; hidden: 0 | 1 | 2 }): string {
  if (sheet.hidden === 2) return "Very hidden — only VBA can reveal it";
  if (sheet.hidden === 1) return "Hidden from the tab bar";
  if (sheet.cellCount === 0) return "Empty";
  const ratio = sheet.formulaCount / Math.max(1, sheet.cellCount);
  if (sheet.formulaCount === 0) return "Raw data — no formulas";
  if (ratio > 0.6) return "Calculation layer — mostly formulas";
  if (ratio > 0.25) return "Mixed data and calculation";
  return "Mostly data with a few computed cells";
}

/* ------------------------------------------------------------------ views */

function header(): string {
  return (
    '<div class="top"><span class="brand">Sheet<span class="dot">Lens</span></span>' +
```

- "6 risk rules" — there are 5 working ones.
- R4's acceptance criterion "all 6 rule classes produced on the fixture" is unmet and untested; the fixture has no external link and no #REF!.
- "Role guess"/characterisation and "impact" are heuristics sold as findings; the app never evaluates formulas (by design), so "the result is X" style language is inferred from cached values that may be stale or absent.
- "Runs entirely in your browser" is *almost* true: the app itself is downloaded from GitHub Pages and Vite's polyfill fetches its own modules; no file bytes leave.

**Where would a finance professional be misled?**
1. Inherited-model audit that silently misses `[Book2.xlsx]` links — the exact "external dependency" landmine the spec advertises. She gets a clean-looking audit while the model depends on someone's Desktop file.
2. Severity counts ("8 high risk") imply full coverage; a missing rule class means a false sense of completeness on the highest-stakes check.
3. Cached-value-derived statements ("Formula currently returns an error", "the stored result is…") describe the saved snapshot, not live Excel recalculation — stale caches read as current truth.

**Is "runs entirely in your browser" provable from the code I read?** Mostly yes, for the narrow claim that matters (no file exfiltration): no fetch/XHR/beacon/WebSocket in `src`, parse is a pure function over an ArrayBuffer, demo workbook is built in memory, and the live run showed only 3 same-origin GETs. But "entirely" is not literally provable — the app must be served from a remote origin, and the Vite polyfill calls `fetch`. The honest claim is "no upload, no third-party calls", not "no network".

## Not verified (time)
R3 explanation quality, R5 impact correctness, R7 exported artifact, R8 keyboard/380px, R9 live refusal paths, password-protected actual file, 200KB/20k-cell performance.

Artifacts: `evidence/checker2/probe_live.mjs`, `live-demo.png`, `ruleprobe.test.ts` (blocked by vitest `include: tests/**`; regex disproved directly instead).
