# Posting Runbook — first 100 users in 5 minutes of human time

**Why this file exists:** the agent that built SheetLens cannot post to Reddit or Hacker News under your identity.
Everything else is done — the app is live, indexable, and the copy is written. This is the only remaining manual step,
and it is deliberately short.

---

## Before you post (60 seconds)

1. Open https://thevalkdokk.github.io/sheetlens/?demo=1 and confirm the demo loads on your connection.
2. Decide which identity you are comfortable using. Nothing below requires your real name — a handle is fine.
3. Do not paste anyone else's workbook anywhere. This product's whole promise is that files stay local; keep it.

---

## Channel 1 — Reddit r/excel (highest expected value)

**What works there:** answering a specific question with a specific method. What gets removed: link drops.

1. Go to https://www.reddit.com/r/excel/new/ and find a post where someone is confused by an inherited or
   complex workbook (search: `inherited`, `formula meaning`, `hardcoded`, `#REF`).
2. Reply with the actual method first — the outside-in reading order from the guide, or the Show Formulas pass.
   Use [content/launch-copy.md](../content/launch-copy.md) section **B** as the base, and rewrite the first line
   so it answers *their* question specifically.
3. Mention the tool **once**, at the end, as a thing you built and are happy to run structure through — never as
   a link in the first line. If the subreddit forbids self-promotion entirely, post the method and skip the tool.
4. Same approach in r/Accounting and r/FPandA, where "month-end" and "handover" threads are common.

**Volume that matters:** 5-10 genuine replies, not 1 post. Measure replies back, not clicks.

---

## Channel 2 — Hacker News, one attempt

1. Post **Show HN** with the title/body from [content/launch-copy.md](../content/launch-copy.md) section **A**.
2. Timing: weekday, roughly 07:00-09:00 US Eastern (19:00-21:00 your time).
3. Expect it to be flagged. That is not failure — it is the base rate for a new account. If it dies, do not repost;
   submit the *guides* as ordinary links on a later day instead, which is allowed and is how strangers find it.

---

## Channel 3 — LinkedIn (for the finance/ops audience)

Post section **C** from the launch copy as a personal post, link in the first comment. The audience that feels the
"inherited model" pain professionally lives here more than on HN.

---

## What to record afterwards

| Signal | Where | What it means |
|---|---|---|
| Replies, not upvotes | the threads you posted in | the only real signal that the problem is felt |
| GitHub issues | https://github.com/TheValkDokk/sheetlens/issues | someone used it on a real file |
| Search impressions | Bing Webmaster Tools (free, no tracking of users) | whether anyone found the guides |

**If nothing happens after 10 genuine replies:** the wedge is wrong, not the execution. The fallback recorded in
[project-docs/growth-plan.md](../project-docs/growth-plan.md) is to collapse the product to the single-formula
explainer and re-test that narrower promise.
