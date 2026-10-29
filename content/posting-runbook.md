# Posting Runbook — 5 minutes, then close this file

Everything below is paste-ready. The only edits are the two bracketed placeholders in Step 1.

**Links to use (the demo link is better than the homepage — it shows value in one second):**
- Demo: https://thevalkdokk.github.io/sheetlens/?demo=1
- Home: https://thevalkdokk.github.io/sheetlens/

---

## Step 1 — r/excel (do this first, it has the highest hit rate)

Find a post where someone has inherited a workbook or cannot read a formula:
https://www.reddit.com/r/excel/new/

Reply with the method first. Use this, and change the first line to answer *their* question:

> The hardcoded-override thing is what usually bites. Turn on Show Formulas (Ctrl + grave accent) on the sheet that computes the number you care about and look for arithmetic against literals — B4*0.2 rather than B4*$B$2. Those do not move when the assumption moves.
>
> On reading a formula you did not write: read it outside-in, not left to right. The outermost function is the verb. IFERROR(...) tells you errors are being silenced; INDEX(...MATCH(...)) tells you it is a lookup; the MATCH tells you the key. Most confusion is depth, not complexity.
>
> I got tired of doing that pass by hand on every sheet, so I built a browser-only checker that does it for a whole workbook and flags the risky cells with the offending fragment — [demo link, paste here]. It never uploads the file, which was the point. Happy to run your structure through it if useful, or just do the Ctrl + grave accent pass above, which catches most of it.

**Rules:** answer the question first, tool second. If the subreddit forbids self-promotion, drop the last paragraph entirely — the reply still stands and your handle still gets seen.

Do the same in **r/Accounting** and **r/FPandA**, searching `inherited`, `handover`, `hardcoded`, `#REF`.
Target: **5–10 replies**, not one post.

---

## Step 2 — Show HN (one attempt, then stop)

Post at https://news.ycombinator.com/submit — weekday, ~07:00–09:00 US Eastern (19:00–21:00 Asia/Saigon).

**Title:**
```
Show HN: A local-only tool that tells you what an inherited Excel model does
```

**URL:** https://thevalkdokk.github.io/sheetlens/

**Text (optional, but it helps):**
```
I inherited a pricing model from someone who had left. 27 formulas, 4 sheets, one very hidden sheet, and a VLOOKUP pointing at a workbook that no longer existed. I found all of that out the slow way.

Every spreadsheet tool I could find solves comparison (v1 vs v2) or explains one formula. Neither tells you what the file is. So I built SheetLens: drop an .xlsx, get a risk-scored inventory (hardcoded rates, volatile functions, #REF!, external links, columns where one cell breaks the pattern, hidden sheets), plain-English explanations, and the blast radius of any cell you are about to edit.

It parses in the browser with SheetJS and makes zero network requests — the file never leaves the tab. That is the whole reason it is a web page and not a server. Export is a self-contained HTML report.

Source: https://github.com/TheValkDokk/sheetlens

Known limits are in the README (no recalculation, main-thread parsing, heuristics not an audit opinion). I would rather you tell me where it is wrong on a real model than tell me it looks nice.
```

Expect it to be flagged — that is the base rate for a new account. Do not repost. Later, submit one of the **guides** as an ordinary link; that is allowed and is how strangers actually find it.

---

## Step 3 — LinkedIn (the audience that feels this pain professionally)

Post as yourself, link in the first comment:

> The most expensive spreadsheet in a company is usually the one nobody understands any more.
>
> A handover has a specific shape: the model works, the person who built it left, and every assumption lives inside formulas as a literal number. It survives until someone changes an input and a number three sheets away moves for reasons no one can explain in the meeting.
>
> Two things that help before you touch anything:
> 1. Show Formulas on every sheet that computes something, and look for arithmetic against constants.
> 2. Trace one cell you plan to change and see what reads it — Data > Trace Dependents.
>
> I built a free, local-only tool that does both and prints the evidence. No upload, no account. Link in comments.

---

## Step 4 — record what happened (2 minutes, matters more than the posting)

| Channel | Date | Where (link) | Replies back | Anything useful said |
|---|---|---|---|---|
| r/excel | | | | |
| r/excel | | | | |
| r/FPandA | | | | |
| Show HN | | | | |
| LinkedIn | | | | |

Then tell the agent the numbers. Two replies is a signal; zero replies across ten genuine attempts is a different signal.

---

## If nothing happens after 10 genuine replies

The wedge is wrong, not the execution. The recorded fallback in [project-docs/growth-plan.md](../project-docs/growth-plan.md)
is to collapse the product to the single-formula explainer and re-test that narrower promise — and the honest
note in [evidence/EVIDENCE.md](../evidence/EVIDENCE.md) row 39 stays at zero until a human is actually reached.
