# RUNBOOK — Startup MVP Build (NEXUS-Sprint mode)

**Status:** ACTIVE · **Workspace:** `/Users/valk/Documents/product-test`
**Model:** one orchestrator, specialist seats, sequential gates, parallel work.

---

## 1. What NEXUS-Sprint mode means

| Letter | Rule | Enforcement |
|---|---|---|
| **N** — Narrow | One persona, one job-to-be-done, one wedge feature. Everything else is out of scope by default. | Spec must contain a non-empty Out of Scope section. |
| **E** — Evidence-gated | A phase ends only when its artifact exists and is reproducible. An agent's self-report is not evidence. | evidence/EVIDENCE.md row per gate |
| **X** — eXecution parallel | Independent work runs concurrently; gates are strictly sequential. | Parallel seats inside a phase, never across a gate |
| **U** — User-in-the-loop, twice | Human decides at **G0** (which idea) and **G4** (approve launch). Nothing else blocks. | No other questions unless a gate is hard-blocked |
| **S** — Sprint cadence | Phases are time-boxed; overrun forces a scope cut, not a slip. | Time-box per phase in STATE.json |

**Non-negotiable:** QA is never skipped to hit a date. When the box and the bar conflict, the box loses.

---

## 2. Phases, owners, gates

| # | Phase | Accountable | Contributors | Gate artifact |
|---|---|---|---|---|
| 0 | Discovery | Sprint Prioritizer | Growth Hacker, Trend researcher | Scored shortlist + citations → **G0 human pick** |
| 1 | Spec + tasklist | Senior Project Manager | Sprint Prioritizer | project-specs/\*-setup.md, project-tasks/\*-tasklist.md → **G1** |
| 2 | Architecture + UX | UX Architect | Backend Architect, Brand Guardian | project-docs/\*-architecture.md, design tokens, runnable skeleton → **G2** |
| 3 | Build ↔ QA loop | Frontend Dev / Backend Architect | Rapid Prototyper, DevOps Automator, AI Engineer | Per-task PASS from Evidence Collector → **G3** |
| 4 | Launch | DevOps Automator | Evidence Collector, Reality Checker | Public URL + cold-client proof → **G4 human approve** |
| 5 | Growth (wk 3+) | Growth Hacker | Content Creator, Social Media Strategist, Analytics Reporter | Analytics live + first real post → **G5** |

Support seats pulled on demand only: Brand Guardian, Analytics Reporter, Rapid Prototyper, AI Engineer, Performance Benchmarker, Infrastructure Maintainer.

---

## 3. Gate criteria

    G0 IDEA     >=3 candidates, each with >=3 real citations
                scored on RICE (Reach, Impact, Confidence, Effort)
                explicit kill reason recorded for each loser
    G1 SPEC     every requirement traceable to R1..Rn
                every R has an observable acceptance criterion
                Out of Scope section exists and is non-empty
                1 task = 1 verifiable unit = 1 acceptance test
    G2 ARCH     runs end-to-end locally (a skeleton that boots, not slides)
                data model + auth decision + failure modes written down
                design system: tokens, type scale, spacing, component list
    G3 BUILD/QA per task: Evidence Collector PASS with screenshot + log
                0 console errors, 0 unhandled rejections on the happy path
                max 3 attempts per task, then escalate — never silently pass
    G4 LAUNCH   public URL returns 200 from a cold client
                full user journey proven on the PUBLIC url, not localhost
                Reality Checker verdict == GO (default NEEDS WORK)
    G5 GROWTH   analytics recording real events (verified in dashboard)
                >=1 distribution channel live with a real post

**Evidence standard** — every ledger row needs:

    timestamp · gate · claim · command · verbatim output or screenshot path · PASS/FAIL

A screenshot without a timestamped log is not evidence.

---

## 4. Dev ↔ QA decision logic

    for task in tasklist:
        dev implements task
        qa = EvidenceCollector.evaluate(task)   # screenshots + logs, no vibes
        if qa == PASS: mark [x]; continue
        else: retries += 1
              if retries < 3: dev gets qa.feedback verbatim; retry
              else: mark BLOCKED, log escalation, continue
    # Phase 4 only after ALL tasks pass
    # Reality Checker defaults to NEEDS WORK; GO needs overwhelming proof

---

## 5. Run log (this execution)

| Phase | Gate | Result | Evidence |
|---|---|---|---|
| 0 Discovery | G0 (human pick) | 3 candidates scored; A and B **killed** for competitive occupancy, **C selected** at 0.55 confidence | research/market-signal.md |
| 1 Spec | G1 | R1–R9 + non-empty out-of-scope + 8 tasks | project-specs/sheetlens-setup.md, project-tasks/sheetlens-tasklist.md |
| 2 Architecture | G2 | ADR-1..5, data model, failure table, design tokens; build runs | project-docs/architecture.md |
| 3 Build ↔ QA | G3 | 25 unit tests, 20 browser checks, 3 defects found and fixed | evidence/EVIDENCE.md, evidence/logs/qa-run.json |
| 4 Launch | G4 | subpath deployment verified; **awaiting human approval to publish** | evidence, this log |
| 5 Growth | G5 | plan + launch copy written; measurement-limited by the privacy promise | project-docs/growth-plan.md, content/launch-copy.md |

**Defects QA caught that a demo would have hidden:** formula cells with no cached value were invisible until
`sheetStubs` was set; a non-workbook zip was silently accepted as a 1-cell spreadsheet; five duplicate findings
buried the unique ones.

## 6. Known constraints recorded at activation

- **Deploy creds:** no Vercel / Netlify / Fly credentials present. `gh` is authenticated → GitHub Pages is the default public path. Docker daemon is down.
- **Browser evidence:** no Playwright / agent-browser; `Google Chrome.app` present → headless `--screenshot` fallback.
- **'Real users'** here means: a public URL a stranger can load, plus instrumentation that records them. Acquiring strangers is Phase 5 and depends on distribution, not build quality. This distinction is reported honestly, never blurred.
