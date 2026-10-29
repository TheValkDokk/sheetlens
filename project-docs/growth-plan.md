# Growth Plan — SheetLens

**Seats:** Growth Hacker (lead), Content Creator, Social Media Strategist. Constrained by what the competitive scan actually found.

## 1. The uncomfortable starting position

The product's defining promise — zero third-party requests — is also its measurement handicap. A privacy-first 
static app on GitHub Pages cannot tell you how many people used it unless you add a tracker, and adding a 
tracker makes the promise false. **That trade is recorded, not hidden.**

Decision for v1: keep the promise. Accept that growth runs blind for the first weeks, and choose channels 
where the *reply* is the measurement (a human replying to a post, a GitHub issue, an email). Instrument later 
with a self-hosted, cookieless counter on the same origin — which is still zero third-party requests.

## 2. Why not the obvious channels

| Channel | Verdict for v1 | Reasoning |
|---|---|---|
| Product Hunt | **Skip** | One-day spike, audience of other makers, and the competitive scan reports launches dying within hours. Not a beachhead for a finance utility. |
| Cold DM / cold email | **Skip** | Reported conversion of ~0 signups from 10 sends. Cost per acquisition is a human hour. |
| Show HN | **One attempt, low expectations** | Reported pattern: flagged within hours, 30-40 visitors. Worth one honest post because developers who inherit models exist, but it is not a strategy. |
| Head-term SEO ("excel formulas") | **Skip** | Owned by Microsoft and content farms; AI summaries are eating clicks. |
| **Transactional long-tail SEO** | **Primary** | People search the exact sentence: *"how do I know what a spreadsheet formula does"*, *"excel model too complex to understand"*, *"inherited excel file"*. Low volume, high intent, no incumbent. |
| **Niche communities** | **Primary** | r/excel, r/Accounting, r/FPandA and audit/consulting Slacks, where "help me understand this inherited workbook" is a recurring post type. Value-first replies, never drive-by links. |
| **GitHub** | **Secondary** | The repo is the proof of the privacy claim. A developer who reads the parse layer trusts the promise. |
| Excel add-in marketplace | **Later** | Real distribution, but a different product surface (Office.js) and a review cycle. Only after the web tool proves the audit is wanted. |

## 3. The 90-day bet, in order

1. **Weeks 1-2 — prove the artefact.** Ship the public URL. Answer 10 real r/excel / r/FPandA threads about inherited workbooks, using the tool on the poster's described structure, not on their file. Measure: replies, not visits.
2. **Weeks 3-4 — build the long tail.** Six pages, each answering one exact question and embedding the demo:
   - "What does this Excel formula mean?" (the single-formula entry point, then upgrade to workbook level)
   - "How to understand a spreadsheet someone else built"
   - "Find hardcoded numbers in an Excel model"
   - "Why does my Excel formula show #REF!"
   - "Check an Excel model before you edit it"
   - "Excel audit checklist for a handover"
3. **Weeks 5-8 — the handover moment.** The highest-intent trigger is a job change or a departed colleague. Target handover/onboarding content at finance and ops teams, not individuals.
4. **Weeks 9-12 — decide.** If community replies produce real usage, add the two features they ask for. If they do not, the wedge is wrong (see falsifier 2 in `research/market-signal.md`) and the correct move is to collapse the product to the single-formula explainer and re-test.

## 4. What we will NOT do

- No fake urgency, no countdown, no "AI-powered" badge. The product has no AI and that is the selling point.
- No testimonials or user counts we cannot evidence.
- No silent tracking. If measurement is added, it goes in the README the same day.

## 5. Success signal (falsifiable)

| Horizon | Signal | Kill threshold |
|---|---|---|
| 2 weeks | >=5 substantive community replies | 0 replies across 10 attempts = channel wrong, not product wrong |
| 6 weeks | 3+ unprompted mentions of "inherited / handover" from strangers | none = the wedge is not felt |
| 12 weeks | someone asks for a paid team feature | nobody asks = no willingness to pay, re-scope |
