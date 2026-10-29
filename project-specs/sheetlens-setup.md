# SPEC — SheetLens (Startup MVP Build, NEXUS-Sprint)

**Owner:** Senior Project Manager  **Status:** G1 candidate  **Version:** 1.0
**One line:** Drop a spreadsheet you inherited; in 60 seconds see what it computes, what is dangerous, and what breaks if you touch a cell.

---

## 1. Problem & persona

**Persona:** Dana, a finance/ops analyst. Her predecessor left. She has Q3_Model.xlsx and a request to "update the pricing assumptions by Friday".

**Job to be done:** *"Tell me what this workbook actually does and what I will break if I edit it."*

**Today she:** opens every sheet, clicks cells, reads formulas one at a time, misses a hardcoded override, breaks a downstream SUM, and finds out at the board meeting.

**Success for her:** she learns the shape of the workbook, the five cells that are actually dangerous, and the blast radius of the cell she is about to change — without uploading confidential data anywhere.

---

## 2. Requirements (traceable, each with an observable acceptance criterion)

| ID | Requirement | Acceptance criterion (observable) |
|---|---|---|
| **R1** | Parse an .xlsx/.csv entirely in the browser; no network request carries file bytes. | With DevTools network open, loading a 200KB workbook produces zero requests containing file content. Parsing a 3-sheet fixture returns 3 sheets with correct dimensions. |
| **R2** | Never miss a formula. Formula cells lacking a cached value must still be counted. | Fixture with a formula cell that has no cached result is reported as a formula, not as empty. (Regression guard for the sheetStubs trap.) |
| **R3** | Plain-English explanation of each formula, at workbook level. | For a supported-function formula, output is a readable sentence naming the operation, the ranges, and the condition. Unsupported functions degrade to an explicit "unrecognised: NAME" line, never a guess. |
| **R4** | Risk scan with severity and evidence. | Every finding carries: sheet, cell address, severity (high/med/low), one-line reason, and the offending fragment. Findings for all 6 rule classes in section 4 are produced on the fixture. |
| **R5** | Impact analysis: select a cell, see what depends on it. | Selecting a cell lists direct dependents (cells whose formula references it) and transitive dependents, with cross-sheet references resolved. |
| **R6** | Workbook overview: sheet map with formula density and role guess. | Each sheet shows: rows x cols, formula count, data count, hidden flag, and one-line characterisation. |
| **R7** | Findings are exportable as an audit artifact. | A one-click export yields a self-contained HTML report that opens offline and contains every finding with its evidence. |
| **R8** | Keyboard accessible and responsive. | Full flow operable by keyboard alone (focus visible, no traps); layout usable at 380px and 1440px. |
| **R9** | Honest failure. | A corrupt, password-protected, or unsupported file produces a specific human-readable error; no blank screen, no silent empty result. |

---

## 3. Out of scope (non-empty by rule; these are refused for v1)

- Editing, saving, or round-tripping workbooks. SheetLens is read-only.
- .xls (legacy), .ods, Google Sheets URLs, password-protected files — detected and refused with R9 messaging.
- Formula *evaluation* / recalculation. We describe formulas; we do not compute them.
- User accounts, cloud storage, sharing links, teams, billing.
- AI/LLM calls. The explainer is deterministic and offline; no API key, no data egress (this is the privacy promise, not a cost decision).
- Real-time collaboration, version compare (that is Candidate A, deliberately killed).
- Pivot tables, charts, macros/VBA semantics beyond flagging presence.

---

## 4. Risk rules (v1, deterministic)

1. **Hardcoded constant inside a formula** — a numeric literal in arithmetic where a reference is expected (e.g. multiplying by 0.2 instead of a rate cell). This is the classic inherited-model landmine.
2. **Volatile function** — NOW, TODAY, RAND, RANDBETWEEN, OFFSET, INDIRECT.
3. **Broken reference** — formula cached value is #REF!, #VALUE!, #DIV/0!, #NAME?, #N/A, or text contains an explicit #REF!.
4. **External workbook link** — formula references [Book2.xlsx] or a URL.
5. **Inconsistent column formula** — a column of formulas where one cell deviates from the row-to-row pattern.
6. **Hidden or very hidden sheet** — content the new owner cannot see is being carried.

---

## 5. Non-functional bar

- Cold load to interactive: under 2s on the fixture; parse of a 20k-cell workbook under 3s with a visible busy state.
- Zero console errors on the happy path and on every refusal path (R9).
- No third-party network calls except the app's own assets.
- Bundle under 1.5MB gzipped (SheetJS dominates; measured, not assumed).

---

## 6. Definition of done for the sprint

All of R1-R9 pass their acceptance criterion with evidence in evidence/EVIDENCE.md, the app is reachable at a public URL, and the Reality Checker has issued a verdict that is not NEEDS WORK.
