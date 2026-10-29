# Launch Copy — SheetLens

**Seat:** Content Creator. Three ready-to-post artefacts. No claim here is made unless the evidence ledger supports it.

---

## A. Show HN (one attempt)

**Title:** Show HN: A local-only tool that tells you what an inherited Excel model does

**Body:**

> I inherited a pricing model from someone who had left. 27 formulas, 4 sheets, one very hidden sheet, and a 
> VLOOKUP pointing at a workbook that no longer existed. I found all of that out the slow way.
>
> Every spreadsheet tool I could find solves comparison (v1 vs v2) or explains one formula. Neither tells you 
> what the file *is*. So I built SheetLens: drop an .xlsx, get a risk-scored inventory (hardcoded rates, volatile 
> functions, #REF!, external links, columns where one cell breaks the pattern, hidden sheets), plain-English 
> explanations, and the blast radius of any cell you are about to edit.
>
> It parses in the browser with SheetJS and makes zero network requests — the file never leaves the tab. That 
> is the whole reason it is a web page and not a server. Export is a self-contained HTML report.
>
> Source: <repo>. The known limits are in the README (no recalculation, main-thread parsing, heuristics not an 
> audit opinion). I would rather you tell me where it is wrong on a real model than tell me it looks nice.

---

## B. Community reply template (value-first, not a drop)

> The hardcoded-override thing is what usually bites. Turn on Show Formulas (Ctrl+`) on the sheet that computes 
> the number you care about and look for arithmetic against literals — `B4*0.2` rather than `B4*$B$2`. Those do 
> not move when the assumption moves. I got tired of doing that by hand so I wrote a browser-only checker that 
> flags them with the offending fragment; happy to run your file structure through it if useful, or just do the 
> Ctrl+` pass — it catches most of it.

Rule: never post this where the person has not asked. Never paste someone's file anywhere.

---

## C. LinkedIn / finance-ops post

> The most expensive spreadsheet in a company is usually the one nobody understands any more.
>
> A handover has a specific shape: the model works, the person who built it left, and every assumption lives 
> inside formulas as a literal number. It survives until someone changes an input and a number three sheets away 
> moves for reasons no one can explain in the meeting.
>
> Two things that help before you touch anything:
> 1. Show Formulas on every sheet that computes something, and look for arithmetic against constants.
> 2. Trace one cell you plan to change and see what reads it — Data > Trace Dependents, or for cross-sheet, 
>    Ctrl+[ to jump to precedents.
>
> I built a free, local-only tool that does both and prints the evidence. No upload, no account. Link in comments.

---

## D. Six long-tail page briefs (weeks 3-4)

| Page | Search intent | Angle |
|---|---|---|
| What does this Excel formula mean? | decode one formula | answer with a worked example, then offer workbook-level view |
| How to understand a spreadsheet someone else built | handover | the 15-minute triage: sheets, formulas, landmines |
| Find hardcoded numbers in an Excel model | audit prep | why literals in formulas are the silent failure |
| Why does my Excel formula show #REF! | breakage | what deletion does to references, and how to find the rest |
| Check an Excel model before you edit it | change safety | blast radius first, edit second |
| Excel handover checklist | process | a printable checklist that happens to name the tool once |
