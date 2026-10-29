# SheetLens

**Understand a spreadsheet you inherited — before you touch it.**

Drop an `.xlsx` or `.csv` and get, in about a second:

- **What each formula actually does**, in plain English.
- **Which cells are dangerous** — hardcoded rates, volatile functions, broken refs, external links, columns where one cell breaks the pattern, hidden sheets.
- **What breaks if you edit a cell** — its full blast radius, including cross-sheet.
- **A standalone HTML audit report** you can attach to an email.

Everything runs in your browser. The file is never uploaded. There is no server, no account, 
no analytics and no AI call — the network tab is empty while a workbook is being analysed.

---

## Why this exists

The first hour of inheriting a model is spent clicking cells and hoping. The spreadsheet tools that exist 
solve *comparison* (v1 vs v2) or *single-formula explanation*. Neither answers the question a new owner 
actually asks: *what is in this file, is it dangerous, and what will I break?*

SheetLens is deliberately not a diff tool, not an editor, and not an AI wrapper. It is a read-only viewer 
with opinions it can defend — every flag carries the exact formula fragment that triggered it.

---

## Quick start

```bash
cd app
npm install
npm run dev        # http://localhost:5173
npm test           # 44 unit tests incl. a 20k-cell performance budget
npm run build      # static bundle in app/dist
```

Reproduce the browser evidence (needs Google Chrome installed):

```bash
BASE=http://localhost:4173 node scripts/qa.mjs   # after `npm run build && npx vite preview`
```

---

## How it works

```
file bytes ──XLSX.read──▶ Workbook model ──▶ analysis ──▶ DOM
     │                                        │
     └──────── nothing leaves the tab ────────┘
```

| Layer | File | Responsibility |
|---|---|---|
| Parse | `app/src/core/parse.ts` | xlsx/csv → model; refuses non-workbooks |
| Formula | `app/src/core/formula.ts` | recursive-descent parser + deterministic explainer |
| Risks | `app/src/core/risks.ts` | 6 rule classes, severity, verbatim evidence |
| Deps | `app/src/core/deps.ts` | reference graph + transitive impact |
| UI | `app/src/ui/app.ts` | accessible views, export |

See [`project-docs/architecture.md`](project-docs/architecture.md) for the decision record.

---

## Limits (read these before trusting it)

- **Windows on file size.** Analysis is on the main thread; very large workbooks will make the tab work. There is a warning threshold, not a worker.
- **No formula evaluation.** SheetLens describes formulas; it never recalculates them. Cached values are shown as stored.
- **`#REF!` and friend are detected from the cached result.** If a file was saved with stale results, a broken formula may look healthy.
- **Column-pattern detection normalises row numbers.** A formula that is internally consistent but wrong will not be flagged; that needs a human.
- **Whole-column references** (`A:A`), named ranges, and ranges larger than 5,000 cells are not followed by impact tracing. The app says so in the Impact tab rather than claiming a cell is safe to edit.
- **Heuristics, not an audit opinion.** A flag tells you where a person should look. It does not certify the model.

---

## Licence

MIT.
