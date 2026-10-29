# Market Signal Research — 6 Candidate MVPs for a 3–5 Day Browser Build

**Prepared by:** Growth Hacker / market signal analyst · **Date:** 2026-10-29
**Ranked by gut confidence** (evidence strength × buildability × self-serve buyer × open field).

### Method + honesty ledger
Sources actually fetched during this research: **Hacker News Algolia API** (exact points/comment counts), **Reddit public Atom feeds**, **GitHub Issues API**, **ada.gov**, **Google Workspace support**, and **live vendor pricing pages**.
Two hard limitations, stated up front:
1. **Reddit blocks its JSON API from this network (HTTP 403)** — so **upvote scores are NOT available**. Comment counts below are lower bounds counted from each thread's Atom feed, which caps at 30 entries. Where I could not fetch a thread body, I quote only its **title** (visibly verifiable at the URL) and say so.
2. Anything I could not read on the page is marked **UNVERIFIED**. No statistic in this document is invented.

> **Prior-work note:** `research/market-signal.md` previously held the Sprint Prioritizer's Phase-0 shortlist. I preserved it verbatim at **`research/phase0-shortlist-sprint-prioritizer.md`** rather than deleting it. A teammate competitive scan (`competitive-landscape.md`) was also read, and I flag where it changes my conclusions.

---

## 1. DMARC Decoder — "Who is sending email as my domain, and what exactly do I change?" ★ highest confidence

**Pitch:** Point your DMARC reports at us and get a plain-English weekly answer: which services send as you, which are failing SPF/DKIM, and the exact DNS records to paste.

### Painful job-to-be-done (user's own words)
> "**Trying to understand DMARC - I see lots of failures. People are spoofing my domain. Oh well? nothing I can do?**"
> — r/CloudFlare (feed shows 2 entries) — https://www.reddit.com/r/CloudFlare/comments/1e46ftw/trying_to_understand_dmarc_i_see_lots_of_failures/
The only substantial reply says: *"99% of the time it's just forwarding/relayed emails that are failing DMARC. It's just noise data."* — i.e. the reports are noise to a normal admin, and "noise" is the product gap.

Same question, different subreddits (titles quoted; bodies not fetched):
- "99.9% DMARC Pass rate dropped to 70%. I have not changed a thing. Am I missing something?" — https://www.reddit.com/r/DMARC/comments/1hh0n1v/999_dmarc_pass_rate_dropped_to_70_i_have_not/
- "DMARC records help" — r/sysadmin — https://www.reddit.com/r/sysadmin/comments/1d669fi/dmarc_records_help/
- "Godaddy now enforces DMARC to p=reject/quarantine on ALL domains registered thro…" — r/dns — https://www.reddit.com/r/dns/comments/1mvd03l/godaddy_now_enforces_dmarc_to_prejectquarantine/

### Evidence of demand
1. **A dated, in-force forcing function from the biggest mailbox provider.** Google's official sender rules: *"Starting February 1, 2024, all email senders who send email to Gmail accounts must meet the requirements in this section"* and *"email senders who send more than 5,000 messages per day to Gmail accounts must… Set up DMARC email authentication for your sending domain."* — https://support.google.com/a/answer/81126
2. **A registrar switched it on by default**, manufacturing a new cohort of admins who must interpret reports — r/dns thread above.
3. **High price anchors leave room underneath.** dmarcian: **$288/year** (Basic) and **$2,880/year** (Plus) — https://dmarcian.com/pricing/ . EasyDMARC: **$44.99/month** list (**$35.99/mo** billed annually) for 100k emails/mo, 2 domains, **3 months** of history — https://www.easydmarc.com/pricing
4. **An entire subreddit (r/DMARC) exists for the confusion** — the demand is structural, not a single post.

### Existing solutions + the gap
| Tool | Weakness |
|---|---|
| dmarcian / EasyDMARC / Valimail | Priced and packaged for teams ($288–$2,880/yr; $45/mo), multi-domain consoles, short history on cheap plans |
| Cloudflare / Postmark DMARC | Free but shallow — a table of source IPs, no "these 3 senders are yours, these 2 are not", no sequencing advice |
| Raw `rua` XML reports | What most people actually have and cannot read |

**Gap:** the missing layer is *interpretation and sequencing*, not collection. "This IP is Google Workspace (yours). This one is your Mailchimp. This one is unauthenticated forwarding noise. Here is the one record to add this week. Do not go to `p=reject` until X." $12–19/mo, one domain, self-serve.

### Testable wedge
Accept a forwarded/uploaded aggregate report (or a report-forwarding address) → parsed table of sending sources with owner inference → **one recommended DNS change per week** + a "safe to move to p=quarantine?" check. No dashboard, no monitoring tab in v1.

### Path to first 100 real users
Answer live r/DMARC and r/sysadmin threads by parsing the poster's own pasted report and replying with the human-readable breakdown — that is precisely the unanswered ask in the thread above. Free single-report tool → $12/mo weekly digest. Second wave: the "my registrar/Google turned DMARC on and now mail bounces" cohort.

### Confidence: **MED-HIGH**
**Falsified by:** (a) inbound-email plumbing (MX + report ingestion) blowing the 3-day build budget — de-risk by shipping upload-only first; (b) free Cloudflare/Postmark reports being "good enough" for small senders; (c) the real buyer turning out to be MSPs wanting multi-tenant white-label (that's an enterprise cycle, which violates the constraint).

---

## 2. PDF Pass — "Will this PDF pass an accessibility check — and what exactly is broken?"

**Pitch:** Upload a PDF, get a page-anchored PDF/UA + WCAG 2.1 defect list (untagged text, missing alt text, no title/lang, scanned pages, untagged tables) with suggested alt text and a fix worksheet a junior can execute.

### Painful job-to-be-done (user's own words)
> "I work on our organization's website as an administrator and content manager. **Our legal team has advised that all website content including documents be accessible.** This is a fairly vague directive… we're being provided a lot of documents to post that are completely non-compliant and **I can't seem to find an easy way to add accessibility features to them.**"
> …and the killer line on the incumbent checker: **"having a pdf pass the acrobat accessibility checker is really not a reliable source either (we put our files through 3 different apps including a color contrast checker, screen reader & doing a manual tag inspection before posting)"**
> — r/accessibility (feed shows 15 entries) — https://www.reddit.com/r/accessibility/comments/1dcona9/
> Practitioner verdict in the same thread: **"These PDFs need to be rebuilt. There's really no other way around it."**

### Evidence of demand
1. **Paid manual labour exists, at job-posting scale.** Live postings for *Document Accessibility Remediation Technician* (e.g. V-Soft Consulting, remote — https://www.dice.com/job-detail/dafad267-e33d-494b-b9cd-5d1b0fab43cc ; note: this URL returned **HTTP 410** on re-fetch, so it was filled/expired between indexing and now), Upwork gigs literally titled *"PDF Remediation for Accessibility"* — https://www.upwork.com/freelance-jobs/apply/PDF-Remediation-for-Accessibility_~022092661333776394125/ — plus *Digital Accessibility Remediation Specialist* contract roles on Indeed.
2. **A statutory driver with published dates.** ADA.gov: Title II requires **WCAG 2.1 Level AA**; after the April 2026 Interim Final Rule the dates are **April 26, 2027** (pop. ≥50,000) and **April 26, 2028** (smaller entities / special districts). The same fact sheet discusses PDFs and the "preexisting conventional electronic documents" exception — https://www.ada.gov/resources/2024-03-08-web-rule/
3. **The question recurs across years, not once.** "PDF Maps and tagging, helpneeded" (https://www.reddit.com/r/accessibility/comments/1fzucjs/pdf_maps_and_tagging_helpneeded/), "How to determine if a PDF file is accessible…" (https://www.reddit.com/r/accessibility/comments/1fswstj/how_to_determine_if_a_pdf_file_is_accessible/), and in 2026 "Looking for a WCAG 2.1 AA / ADA Title II compliant LaTeX thesis template" (https://www.reddit.com/r/accessibility/comments/1vbl56t/).
4. **Trust in the free incumbent is the actual market:** the quoted practitioner runs **three tools plus a manual tag inspection** because Acrobat's checker is not trusted. That is a buying signal disguised as a complaint.

### Existing solutions + the gap
- **Adobe Acrobat Pro Accessibility Checker** — per-seat licence, and per the quote above, not trusted.
- **PAC 2024** — free, Windows desktop, throws a wall of PDF/UA violations with no remediation guidance.
- **CommonLook** — professional remediation suite; pricing page returned **404** on fetch, so its price is **UNVERIFIED** here (historically enterprise-quoted).
- **Contract remediation** — $/page, weeks of turnaround, which is why the job postings exist.

**Gap:** a *browser* tool that converts a technical checker dump into (a) a plain-English, page-anchored defect list, (b) real alt-text drafts for images, (c) a fix worksheet, and (d) a re-check delta that proves progress — priced per document (~$19) instead of per seat. Note: **no auto-tagging in v1**; a badly auto-tagged PDF/UA file is worse than none, and that failure mode would destroy trust.

### Testable wedge
One PDF in → structure/tag analysis (PyMuPDF) + image inventory + LLM alt-text drafts → scored checklist with page numbers → PDF worksheet out.

### Path to first 100 real users
(a) **Upwork is a live market** — bid on "PDF remediation" gigs with a free audit attached to each bid; (b) answer r/accessibility threads with a free audit of the poster's file; (c) one accessibility consultancy subcontracting remediation = dozens of documents. School districts and universities are explicitly in scope of the ADA rule.

### Confidence: **MED-HIGH**
**Falsified by:** (a) card-payment conversion failing because every real buyer is government/school procurement (test a $19 Stripe link in week 1 — if zero conversions, this is an enterprise cycle and must be killed); (b) users refusing to upload documents, forcing browser-local processing and blowing the build budget; (c) PAC 2024 being "close enough" for the people who do the work.

---

## 3. FixMySite — "A WCAG audit that hands you the exact code to change"

**Pitch:** Enter a URL, get prioritized real WCAG 2.1 AA failures with plain-English explanations and copy-paste fixes — not a score, and not an overlay script.

### Painful job-to-be-done (user's own words)
> "**Our legal team has advised that all website content including documents be accessible. This is a fairly vague directive**… we try to meet WCAG standards wherever possible." — r/accessibility, https://www.reddit.com/r/accessibility/comments/1dcona9/

The job is "translate a legal directive into a change list a developer will accept", and the person holding it is a content manager, not an engineer.

### Evidence of demand
1. **Real budgets already being spent on the bad version of this.** accessiBe: **$59/month** (up to 5,000 visits) and **$179/month** (up to 30,000) — https://www.accessibe.com/pricing — for an overlay that the accessibility community distrusts.
2. **A statutory deadline (already slipped once, which means the rush is still ahead).** ADA.gov Title II: WCAG 2.1 AA; **April 26, 2027** / **April 26, 2028** after the 2026 IFR extension — https://www.ada.gov/resources/2024-03-08-web-rule/
3. **EU obligations pull in e-commerce, banking, and e-books** — European Commission page listing covered services: https://commission.europa.eu/strategy-and-policy/policies/justice-and-fundamental-rights/disability/union-equality-strategy-rights-persons-disabilities-2021-2030/european-accessibility-act_en . **The 28 June 2025 date could not be confirmed from that page — UNVERIFIED.**
4. **New free entrants are arriving, which is a demand signal AND a warning**: "I built ClearA11y - a free accessibility scanner with AI-generated code fixes" — https://www.reddit.com/r/accessibility/comments/1qinh02/i_built_cleara11y_a_free_accessibility_scanner/

### Existing solutions + the gap
- **WAVE / Lighthouse / axe DevTools** — find violations and print rule IDs; no prioritized, human-readable fix for a non-engineer.
- **accessiBe / UserWay / AudioEye** — overlays at $59–$179+/mo; they change the page, not the DOM.
- **Agencies** — a $5k–$20k manual audit, out of reach for a one-person marketing team.

**Gap:** *the fix text plus proof of progress*. Report a content manager can forward to a dev: severity, WCAG criterion, offending element, copy-paste snippet — then a rescan diff showing fixed vs remaining. Sell to freelance web developers with 6 SMB clients as well as the SMB.

### Testable wedge
One URL → crawl ≤50 JS-rendered pages → axe-core violations → LLM-written fix per violation → shareable report → "rescan: 41 fixed, 12 left". Free 5-page scan, $29/mo for 50 pages.

### Path to first 100 real users
Publicly scan the poster's site in r/accessibility, r/webdev, r/Shopify, r/smallbusiness "is my site accessible?" threads (the community already does this constantly, so it is welcome, not spammy). Then white-label scans for agencies selling a11y retrofits at $99/mo unlimited.

### Confidence: **MED**
**Falsified by:** (a) axe-core catching <50% of what buyers actually fear (manual WCAG is the real work, and buyers may know it); (b) ClearA11y-style free scanners commoditising the report before you can charge; (c) SMBs only buying *after* a lawsuit — no proactive purchase. Test with a $29 Stripe link on day 2.

---

## 4. Redline It — "Legal-grade PDF redline in the browser, paid per document"

**Pitch:** Two versions of a contract in, a proper redline out (side-by-side + single-page redline PDF/DOCX), in ~20 seconds, with no desktop app and no per-seat licence.

### Painful job-to-be-done (user's own words)
> "My job requires me to review documents that have been revised from earlier drafts. Rather than dart back and forth between two largely similar documents, **I pull up both documents next to each other on one screen and I cross my eyes to 'merge' them**, so that my brain interprets them as one image. Any discrepancies between the two drafts seem to flicker…"
> — r/LifeProTips (feed shows 30 entries) — https://www.reddit.com/r/LifeProTips/comments/16zw8oe/lpt_use_the_magic_eye_technique_to_compare_drafts/

### Evidence of demand
1. **The legal-grade version sells for real money per seat.** Draftable pricing page: **US$129/user/year** (Enterprise & Non-Legal) and **US$261/user/year** (Law Firms) — and its own feature list says *"Windows desktop app — Mac support coming **late 2027**"* — https://draftable.com/pricing
2. **A second vendor monetises the same job with a legal line item.** Diffchecker: **$15/user/mo** (Pro + Desktop) and **$40/user/mo** (Enterprise, incl. iManage integration, SSO) — https://www.diffchecker.com/pricing/
3. **Developers keep filing issues for the primitive.** GitHub: *"Read two PDFs. Compare. Redline."* (7 comments, closed) — https://github.com/houfu/redlines/issues/1 ; PyMuPDF: *"Can we compare two pdf files using PyMuPDF (visually and text)"* (21 comments) — https://github.com/pymupdf/PyMuPDF/issues/673
4. **Manual visual comparison is common enough to be a "life pro tip"** with 30 feed entries arguing about it — quote above.

### Existing solutions + the gap
- **Draftable** — Windows-only desktop; Mac "late 2027"; annual per-seat commitment; sales-led for teams.
- **Diffchecker** — web, but legal-grade output is locked in a $40/user/mo enterprise tier.
- **Adobe Acrobat "Compare files"** — needs a paid Acrobat seat per reviewer (Adobe Acrobat pricing per teammate scan: Standard $14.99/mo, Pro $19.99/mo, with an early-termination fee up to half the remaining annual commitment — https://www.adobe.com/acrobat/pricing.html).
- **Free client-side PDF differ — this is the reason this candidate is MED, not HIGH.** Confirmed by fetch: James Montemagno's **PDF Diff**, announced 2025-12-31 as a tool to *"compare two PDF documents to see what changed"* running privately in the browser — https://montemagno.com/introducing-pdf-diff-compare-pdfs-privately-in-your-browser/ (open source: https://github.com/jamesmontemagno/pdf-diff). Seen in search results but **not fetched (connection timed out)**: **microapp.io/compare-pdfs** ("No Upload" in the page title) and **PdfCompare** on Product Hunt ("100% private, client-side PDF comparison" — https://www.producthunt.com/products/pdfcompare). These are **text diff**, not legal redline export — but they set the free floor.

**Gap (narrower than it first looks):** the free tools do *text diff side-by-side*. The defensible delta is **redline fidelity + OCR on scanned contracts + a shareable link a counterparty can open without an account + pay-per-document ($9) instead of $129–$261/seat/year**. That is an execution race, not an empty field.

### Testable wedge
2 PDFs → extraction with OCR fallback → word/paragraph diff → **exportable redline PDF** + a public read-only link. One price: $9/report, 10 for $49. DOCX in week 2.

### Path to first 100 real users
Post the *output*, not the product, in r/paralegal, r/LawFirm, r/solofirm, r/legaltech; answer threads like the r/paralegal proofreading thread where a legal assistant says the mistakes are "really starting to get to me" (https://www.reddit.com/r/paralegal/comments/1c0edo0/proofreading/, ~28 comments).

### Confidence: **MED**
**Falsified by:** (a) free in-browser PDF differ being "good enough" for the people who currently cross their eyes (test: do 10 target users switch from a free text diff?); (b) OCR quality on real scanned contracts producing an untrustworthy redline; (c) buyers being firm admins who can only purchase annual seats.

---

## 5. Reconcile — "Two files in, one diff out, with a reason for every mismatch"

**Pitch:** Match two spreadsheets on a key column with fuzzy names, rounding tolerance, and date/format coercion, and explain every mismatch in one line you can paste into an email. Client-side.

### Painful job-to-be-done (user's own words)
> "I work for a city. The local utility company charges us per street light pole. **I have one spreadsheet that shows what they think we have and are charging us** as far as poles and **another that shows what we think we have and should be charged**."
> — r/excel, "Help comparing data in two worksheets" — https://www.reddit.com/r/excel/comments/1l5yac7/help_comparing_data_in_two_worksheets/
> And the skill gap that makes generic answers fail: **"Thanks - no idea what that is or how to do it - all I add numbers in columns."** (Power Query answer, r/excel) — https://www.reddit.com/r/excel/comments/1uky6lf/comparing_two_lists_of_employees_on_a_spreadsheet/

### Evidence of demand
1. **Microsoft's own answer is unreachable for normal users.** An M365 Enterprise user could not find Spreadsheet Compare: *"Microsoft says to use Spreadsheet Compare, and that this feature is available in Microsoft 365 Apps for enterprise. However, it seems to be absent from the ribbon, the command list…"* — https://www.reddit.com/r/excel/comments/1pkx0m8/unable_to_compare_two_files_or_versions/ ; resolution in-thread: *"Spreadsheet compare is a separate app to excel."*
2. **Steady question flow in r/excel**, including fuzzy-matching an 8,000-row federal school list — https://www.reddit.com/r/excel/comments/1qnnojv/comparing_and_adding_data_from_separate/
3. **A builder hit the same wall in public:** *"I spend way too much time manually comparing spreadsheets at work… lots of VLOOKUPs, copying, pasting, formatting, and filtering… I built this online spreadsheet comparison tool"* — https://news.ycombinator.com/item?id=44677681 (self-post, **0 comments** — anecdote, not traction)
4. **Price anchors from the teammate competitive scan** (I did not re-fetch these myself): xlCompare **$99.99 lifetime, Windows desktop only** — https://xlcompare.com/order.html ; ReconcileOnline **$12/run** (5 runs $49) — https://reconcileonline.com/pricing — **treated as second-hand/UNVERIFIED by me**.

### Existing solutions + the gap — **read this before picking it**
**Verified by me during this research:** https://tabledi.com/tools/compare-excel-files/ already ships this exact wedge, free, in 12 languages, with its own positioning copy: *"Unlike Microsoft's Spreadsheet Compare, which needs Excel for Windows on an enterprise Office edition, it needs nothing installed; unlike the free online widgets from Diffchecker, Draftable and ExcelCompare.org, it can match rows by a key column so a re-sorted export still lines up."* It also offers a downloadable app (TableDI 2) for recurring jobs.
That directly undercuts a "free client-side key-column diff" as a *novel* wedge. What remains open is **reasoning** (tolerance rules, fuzzy-name matching, "why did this mismatch", shareable read-only diff link) and **reconciliation**, not diffing. **The Sprint Prioritizer's Phase-0 file reached the same kill verdict on plain "compare two spreadsheets"; my evidence agrees.**

### Testable wedge
Two files → auto key detection → fuzzy + tolerance matching → Added/Missing/Changed with a one-line reason each ("matched on invoice #, differs by 0.02 — classified as rounding") → shareable read-only link.

### Path to first 100 real users
r/excel reconciliation threads (answer with a free diff of the poster's own files), r/accounting and r/Bookkeeping month-end close threads, plus a comparison page targeting "spreadsheet compare on Mac".

### Confidence: **MED**
**Falsified by:** tabledi (or ReconcileOnline) extending into reasons/tolerance before you ship; or users only needing a one-off diff and never returning (measure second-run rate in week 1).

---

## 6. Statement → Ledger — "Any bank statement PDF into clean CSV, per file, no account"

**Pitch:** Drop a bank, card, or brokerage statement PDF, get clean transaction rows as CSV/QBO — from any bank, no subscription, no bank connection.

### Painful job-to-be-done (user's own words)
> **"Which software is the best for extracting transaction tables from bank statement pdfs?"**
> — r/CharteredAccountants (feed shows 7 entries) — https://www.reddit.com/r/CharteredAccountants/comments/1envc9y/extracting_transactions_from_bank_statement_pdfs/
> The answers offered were paid/desktop tools ("Able2extract", "Suvit") and the asker's reply — *"You mean this? https://www.suvit.io/ ?"* — reads as unconvinced.

### Evidence of demand
1. **A full commercial category exists for exactly this job.** DocuClipper's pricing page leads with *"Extract Data — Bank Statements. Convert PDF bank statements to Excel, CSV, or QBO"* plus brokerage, credit-card, invoices, receipts, checks, W-2/1099 and a "Forensic Accounting" module — https://www.docuclipper.com/pricing
2. **Recurring reconciliation pain in accounting communities** (e.g. "Xero Doesn't Reconcile Banks?" — https://www.reddit.com/r/xero/comments/1h7mqcg/xero_doesnt_reconcile_banks/), and the direct software-hunting post above.
3. **Indie builders are shipping it for themselves** — *"Upload bank statements manually, automatically categorize expenses…"* (https://news.ycombinator.com/item?id=48896078) and *"NumeroMoney… the first I've built that makes over $500"* (https://news.ycombinator.com/item?id=46310554 — self-reported, **UNVERIFIED**).
4. **Mint's shutdown left a durable refugee market:** *"I was addicted to mint.com, and not that it's gone CreditKarma just doesn't do it."* — Ask HN, **48 points / 36 comments** — https://news.ycombinator.com/item?id=39275231

### Existing solutions + the gap
- **DocuClipper / Suvit / Dext / Hubdoc** — broad, subscription-first, built for firms; DocuClipper already bills **by pages processed** (same axis as any indie wedge).
- **Able2Extract** — desktop app; its product page did not expose a price on fetch (**UNVERIFIED**).
- **Bank-linked apps (Monarch, Lunch Money, YNAB)** — require OAuth connections; fail on small, foreign, and credit-union banks.

**Gap (thin):** pay-per-file with no account, no bank connection, and tolerance for the ugly statements the suites reject (scans, non-US layouts) — plus *reconciled* rows rather than raw OCR. Weakest differentiation of the six: the incumbent already prices on the same axis.

### Testable wedge
One PDF → transaction table with per-row confidence → human fix-up grid → CSV/QBO export. $3/file, 10 for $19. No dashboard, no categorisation in v1.

### Path to first 100 real users
r/CharteredAccountants, r/Bookkeeping, r/QuickBooks threads where the question is asked; Upwork/Fiverr bookkeepers who process client statements — give 20 free files for feedback, then a per-file link they can resell.

### Confidence: **MED-LOW**
**Falsified by:** (a) DocuClipper already being the default answer in those threads; (b) buyers being strictly one-time (no repeat revenue); (c) statement layout heterogeneity defeating a 5-day parser without per-bank templates — the single most likely technical failure.

---

## Appendix A — Ideas checked and rejected (with the evidence that killed them)

| Idea | Evidence | Verdict |
|---|---|---|
| **Subtitle / SRT sync repair** | Very strong historical signal: *"Show HN: Automatically synchronize subtitles with video"* — **583 points / 124 comments** (https://news.ycombinator.com/item?id=19248723); SubSync 130 points (https://news.ycombinator.com/item?id=29794153) | **KILL** — the gap closed. ffsubsync now runs free and client-side in the browser via pyodide (HN comment: https://news.ycombinator.com/item?id=48885605). |
| **Plain-English CSV transforms ("Magic CSV")** | *"Show HN: Magic CSV"* — 17 points, hostile comments: *"How big is the overlap between people who know what a CSV is, but who can't do this themselves with Python or their LLM of choice?"* — https://news.ycombinator.com/item?id=46441419 | **KILL** — unresolved "just use ChatGPT" objection; the demo also failed a trivial rot13 task in-thread. |
| **PDF redaction (applying it)** | A YC founder shipped it three weeks ago: *"After reading lots of articles on redaction failures… I wanted to build a better tool"* — https://news.ycombinator.com/item?id=49958973 | **KILL for now** — well-resourced direct competition. Open variant: **redaction QA** ("did it actually remove the text and metadata?"), for which I found no demand evidence — do not build on faith. |
| **Generic PDF → Excel table extraction** | Three YC launches in 12 months on the same job: Trellis **234 pts / 116 comments**, Midship **121 / 61**, Pulse **40 / 37** — https://news.ycombinator.com/item?id=41236273 , https://news.ycombinator.com/item?id=42066500 , https://news.ycombinator.com/item?id=46313930 | **KILL** — funded competitors own the generic case; only verticals survive. |
| **Consumer lease red-flag review** | Threads exist (r/NYCapartments "Lease red flags?" https://www.reddit.com/r/NYCapartments/comments/1cvoycq/lease_red_flags/ ; r/Renters https://www.reddit.com/r/Renters/comments/1bk2c29/advice_for_first-time-renters/) | **PARK** — no willingness-to-pay evidence found; "legal advice" positioning risk. |
| **Excel formula explainer** | Matches the Sprint Prioritizer's Phase-0 kill: any chat assistant does it, and content marketing already owns the keyword | **KILL as a product**, keep as a feature of #5. |

## Appendix B — Cross-checks with teammate research (what changes for the team)
1. **Plain spreadsheet diff is taken.** `tabledi.com/tools/compare-excel-files/` ships free, client-side, key-column matching, in 12 languages (verified text on the page). The Phase-0 file independently killed "compare two spreadsheets" for the same reason. **The remaining upside is reconciliation with reasoning (#5), not diffing.**
2. **The competitive scan's WS-3 (spreadsheets) recommendation should be re-read against that tabledi finding.** Its "no free incumbent" premise is the weakest link in that argument.
3. **Accessibility and email authentication are absent from both prior docs** — that is where my research found the least-crowded, best-evidenced demand (#1–#3 here).
4. **The strongest price anchors I verified personally:** Draftable $129–$261/user/yr with **Mac support "late 2027"**; Diffchecker $15–$40/user/mo; dmarcian $288–$2,880/yr; EasyDMARC $44.99/mo; accessiBe $59–$179/mo. Every one of them is priced per seat or per year against a task people do a handful of times — that arbitrage (per-document pricing) is the common thread across candidates #1–#5.
