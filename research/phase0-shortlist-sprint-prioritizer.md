# Phase 0 — Market Signal & Candidate Shortlist

_Seat: Sprint Prioritizer, fed by Growth Hacker + competitive scan. Orchestrator selects._

## Method

Web search + page fetches, 2026-10-29. Every claim below is either **VERIFIED** (I fetched the page and read it) or **UNVERIFIED** (search-result title/snippet only). No invented statistics.

## Candidate A — "Compare two spreadsheets by key column", client-side

- **Job:** an ops/finance person gets v2 of a price list or export and must find what changed, without uploading confidential data.
- **Demand evidence:** Microsoft Q&A has repeated threads asking how to compare two workbooks ([thread 1](https://learn.microsoft.com/en-us/answers/questions/4869853/how-to-compare-two-excel-files-in-order-to-find-th), [thread 2](https://learn.microsoft.com/en-ca/answers/questions/5917863/how-to-add-spreadsheet-compare-to-excel-in-microso)). Several independent builders exist: [DiffEngineX (paid)](https://www.florencesoft.com/excel-diff/), [Compare2excel on Product Hunt](https://www.producthunt.com/products/compare2excel), [sheet-diff on PyPI](https://pypi.org/project/sheet-diff/0.2.0/), and a [teckdeck write-up](https://teckdeck.io/posts/diffing-two-spreadsheets-by-key-column-entirely-client-side).
- **Competitor check — VERIFIED by fetching the page:** [tabledi.com/tools/compare-excel-files](https://tabledi.com/tools/compare-excel-files/) already ships *exactly* this wedge. Their own copy: "it can match rows by a key column so a re-sorted export still lines up… both files are read on your computer and neither one is uploaded", in 12 languages, free.
- **Verdict: KILL.** The privacy-first + key-matching combination is already launched and localized. A 5th entrant with zero distribution is a losing bet, not a fast MVP.

## Candidate B — "Explain this Excel formula in plain English"

- **Job:** a non-technical user opens an inherited sheet and cannot read `=IFERROR(INDEX(...MATCH(...)),"")`.
- **Demand evidence:** real people ask exactly this on [Microsoft Q&A](https://learn.microsoft.com/en-us/answers/questions/4857708/what-does-this-formula-mean) and [again here](https://learn.microsoft.com/en-au/answers/questions/5858044/formula-explanation), plus [Stack Overflow](https://stackoverflow.com/questions/69830275). A Chrome extension already does extraction ([Excel Formula Extractor](https://chromewebstore.google.com/detail/excel-formula-extractor/cfhjdgkcecbjifhjgbcdnbojdhkgogbn)) and content plays target the keyword ([deckary](https://deckary.com/blog/excel-formula-explainer)).
- **Verdict: KILL as a product, KEEP as a feature.** A single-formula explainer is a commodity that any chat assistant already does better, and the keyword is already content-marketed. It is only defensible when it is one output of a workbook-level job.

## Candidate C — "Understand the workbook you inherited" (audit + dependency map)  ★ SELECTED

- **Job:** an analyst inherits a spreadsheet model they did not build and must change it without breaking it. They need: what does each computed column actually do, where are the landmines, and what depends on the cell I am about to edit?
- **Why this is the gap:** A does *difference* (v1 vs v2). B does *one formula string*. Neither answers "what is in this file, is it dangerous, and what breaks if I touch it?" — which is the actual first hour of inheriting a model. The incumbents' own positioning confirms the split: tabledi sells comparison and extraction, not comprehension.
- **Demand evidence (VERIFIED):** Microsoft Q&A users repeatedly asking for formula comprehension ([1](https://learn.microsoft.com/en-us/answers/questions/4857708/what-does-this-formula-mean), [2](https://learn.microsoft.com/en-au/answers/questions/5858044/formula-explanation)); Stack Overflow question on decoding a nested IF/IFNA ([3](https://stackoverflow.com/questions/69830275)). **UNVERIFIED:** I have no citation for this persona's willingness to pay. Treated below as reduced Confidence.
- **Testable wedge:** drop an .xlsx → get a risk-scored inventory (hardcoded constants inside formulas, volatile functions, broken refs, external links, inconsistent column formulas, hidden sheets) + plain-English explanations + a click-a-cell impact list. Entirely client-side.
- **Path to first 100 users:** r/excel and r/Accounting threads where people post inherited workbooks; "month-end close" and "audit" keyword content; the free tool as the top of a paid team-review tier. Honest risk: this is a community-led channel, not a guaranteed funnel.

## RICE scoring (Reach 1-10, Impact 1-10, Confidence 0-1, Effort in agent-days)

| Candidate | Reach | Impact | Confidence | Effort | RICE |
|---|---|---|---|---|---|
| A — spreadsheet compare | 8 | 6 | 0.9 | 2 | 21.6 |
| B — formula explainer | 7 | 4 | 0.8 | 1 | 22.4 |
| **C — inherited-workbook audit** | **6** | **9** | **0.55** | **3** | **9.9** |

RICE ranks A and B higher on raw arithmetic. **They are still killed**, and the reason is deliberate: RICE does not price *competitive occupancy*. A scores well precisely because the demand is proven — which is also why tabledi, DiffEngineX, Compare2excel and sheet-diff are already standing on it. The formula is a tiebreaker only when the field is open.

**Selection: Candidate C**, on differentiation, not on arithmetic. Confidence is 0.55 — the weakest number in the table — and that is recorded, not hidden.

## What would falsify this pick

1. If a search for "workbook audit" / "spreadsheet risk report" surfaces an established client-side tool, the wedge is contested and this becomes a differentiation race.
2. If the first 20 visitor sessions show people only want single-formula explanation, the product is over-built and should collapse to B.
3. If the audit output is not trustworthy on a real-world messy workbook, nothing else matters — trust is the product.
