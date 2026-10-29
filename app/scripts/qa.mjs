import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";

const BASE = process.env.BASE ?? "http://127.0.0.1:4173";
const SHOTS = process.env.SHOTS ?? "/Users/valk/Documents/product-test/evidence/screens";
const LOGDIR = process.env.LOGDIR ?? "/Users/valk/Documents/product-test/evidence/logs";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

fs.mkdirSync(SHOTS, { recursive: true });
fs.mkdirSync(LOGDIR, { recursive: true });

const consoleErrors = [];
const pageErrors = [];
const checks = [];
const timings = {};

function check(name, pass, detail) {
  checks.push({ name, pass, detail });
}

function shot(page, name) {
  return page.screenshot({ path: path.join(SHOTS, name), fullPage: false });
}

const garbage = path.join(LOGDIR, "garbage.xlsx");
fs.writeFileSync(garbage, "PK not really a zip, just noise: %%%");

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu", "--hide-scrollbars"],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 940, deviceScaleFactor: 2 });

  page.on("console", (m) => {
    if (m.type() === "error") consoleErrors.push(m.text());
  });
  page.on("pageerror", (e) => pageErrors.push(String(e)));
  page.on("requestfailed", (r) => consoleErrors.push("REQUEST FAILED " + r.url()));

  // ---- 1. cold home
  const t0 = Date.now();
  await page.goto(BASE + "/", { waitUntil: "networkidle0" });
  timings.coldLoadMs = Date.now() - t0;
  check("home renders intake", (await page.$("#drop")) !== null, "");
  check("home has no results yet", (await page.$(".stats")) === null, "");
  await shot(page, "01-home.png");

  // ---- 2. load demo journey
  const t1 = Date.now();
  await page.click('[data-action="demo"]');
  await page.waitForSelector(".stats", { timeout: 15000 });
  timings.demoParseMs = Date.now() - t1;

  const stats = await page.$$eval(".stat", (els) => els.map((e) => e.textContent.trim()));
  const findingCount = await page.$$eval(".finding", (els) => els.length);
  const highCount = await page.$$eval(".finding.high", (els) => els.length);
  check("demo parsed into results", stats.length === 4, JSON.stringify(stats));
  check("risk findings rendered", findingCount > 0, findingCount + " findings");
  check("high-severity findings present", highCount > 0, highCount + " high");
  check("risks tab auto-selected when danger exists", (await page.$eval("#tab-risks", (e) => e.getAttribute("aria-selected"))) === "true", "");
  await shot(page, "02-risks.png");

  // evidence text present on every finding (no badge without evidence)
  const evidenceMissing = await page.$$eval(".finding", (els) => els.filter((e) => !e.querySelector(".evidence") || !e.querySelector(".evidence").textContent.trim()).length);
  check("every finding carries evidence", evidenceMissing === 0, evidenceMissing + " missing");

  // ---- 3. overview tab
  await page.click("#tab-overview");
  await page.waitForSelector("table");
  const sheetRows = await page.$$eval("table tbody tr", (els) => els.length);
  check("overview lists every sheet", sheetRows >= 4, sheetRows + " rows");
  await shot(page, "03-overview.png");

  // ---- 4. formulas tab + filter
  await page.click("#tab-formulas");
  await page.waitForSelector(".frow");
  const allRows = await page.$$eval(".frow", (e) => e.length);
  await page.type("#filter", "VLOOKUP");
  await new Promise((r) => setTimeout(r, 150));
  const filteredRows = await page.$$eval(".frow", (e) => e.length);
  check("formula filter narrows the list", filteredRows > 0 && filteredRows < allRows, allRows + " -> " + filteredRows);
  const explained = await page.$$eval(".frow .say", (els) => els.map((e) => e.textContent));
  check("explanations are human sentences", explained.length > 0 && /if |the |value|total/i.test(explained[0] ?? ""), (explained[0] ?? "").slice(0, 80));
  await shot(page, "04-formulas.png");

  // ---- 5. impact tab
  await page.click("#tab-impact");
  await page.waitForSelector("#impactor");
  const prefill = await page.$eval("#impactor", (e) => e.value);
  await page.$eval("#impactor", (e) => (e.value = ""));
  await page.type("#impactor", "Model!B4");
  await page.click('[data-action="impact-run"]');
  await new Promise((r) => setTimeout(r, 200));
  const impactRows = await page.$$eval(".frow", (e) => e.length);
  check("impact pre-fills a cell", prefill.length > 2, prefill);
  check("impact traces dependents", impactRows > 0, impactRows + " dependents");
  await shot(page, "05-impact.png");

  // ---- 6. export (R7)
  const dl = path.join(LOGDIR, "downloads");
  fs.mkdirSync(dl, { recursive: true });
  const client = await page.createCDPSession();
  await client.send("Page.setDownloadBehavior", { behavior: "allow", downloadPath: dl });
  await page.click('[data-action="export"]');
  let exported = null;
  for (let i = 0; i < 40; i++) {
    const files = fs.readdirSync(dl).filter((f) => f.endsWith(".html"));
    if (files.length > 0) {
      exported = path.join(dl, files[0]);
      break;
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  const exportOk = exported && fs.statSync(exported).size > 1000;
  check("audit report exports as a file", Boolean(exportOk), exported ? fs.statSync(exported).size + " bytes" : "no file");
  if (exportOk) {
    const htmlText = fs.readFileSync(exported, "utf8");
    check("export contains findings", htmlText.includes("Findings") && htmlText.includes("hardcoded"), "");
    fs.copyFileSync(exported, path.join(LOGDIR, "sample-audit-report.html"));
  }

  // ---- 7. keyboard-only tab navigation (R8)
  await page.focus("#tab-impact");
  await page.keyboard.press("Home");
  await new Promise((r) => setTimeout(r, 120));
  const afterHome = await page.evaluate(() => document.activeElement?.id);
  await page.keyboard.press("ArrowRight");
  await new Promise((r) => setTimeout(r, 120));
  const afterRight = await page.evaluate(() => document.activeElement?.id);
  check("tabs respond to keyboard", afterHome === "tab-overview" && afterRight === "tab-risks", afterHome + " -> " + afterRight);

  // ---- 8. refusal path (R9)
  try {
    await page.goto(BASE + "/", { waitUntil: "networkidle0" });
    const input = await page.$("#file");
    await input.uploadFile(garbage);
    await page.waitForSelector(".err", { timeout: 6000 });
    const errText = await page.$eval(".err", (e) => e.textContent.trim());
    check("garbage file is refused with a readable message", /not a spreadsheet|different format|could not be read/i.test(errText), errText.slice(0, 120));
    await shot(page, "06-refusal.png");
  } catch (e) {
    check("garbage file is refused with a readable message", false, String(e).slice(0, 140));
  }

  // ---- 9. zero-network-egress check for file content (R1)
  await page.goto(BASE + "/?demo=1", { waitUntil: "networkidle0" });
  const reqs = [];
  page.on("request", (r) => reqs.push(r.url()));
  await page.click('[data-action="reset"]');
  await page.click('[data-action="demo"]');
  await page.waitForSelector(".stats");
  const external = reqs.filter((u) => !u.startsWith(BASE) && !u.startsWith("blob:") && !u.startsWith("data:"));
  check("no external requests while analysing", external.length === 0, external.join(", ") || "none");

  // ---- 9b. a pathological filename must not blow out the layout (found by Reality Checker probe)
  await page.evaluate(() => {
    const el = document.querySelector(".filename");
    if (el) el.textContent = "x".repeat(190) + ".xlsx";
  });
  const fnOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check("long filename does not overflow", fnOverflow <= 1, fnOverflow + "px");

  // ---- 10. mobile layout (R8)
  const m = await browser.newPage();
  await m.setViewport({ width: 380, height: 844, deviceScaleFactor: 2, isMobile: true });
  m.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push("mobile: " + msg.text());
  });
  await m.goto(BASE + "/?demo=1", { waitUntil: "networkidle0" });
  await m.waitForSelector(".stats");
  const overflow = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check("no horizontal overflow at 380px", overflow <= 1, overflow + "px overflow");
  await m.screenshot({ path: path.join(SHOTS, "07-mobile.png"), fullPage: false });

  // ---- 11. guide pages are real, crawlable and linked
  const slugs = [
    "what-does-this-excel-formula-mean",
    "understand-a-spreadsheet-someone-else-built",
    "find-hardcoded-numbers-in-an-excel-model",
    "excel-ref-error-what-to-do",
  ];
  for (const slug of slugs) {
    const resp = await page.goto(BASE + "/guides/" + slug + ".html", { waitUntil: "domcontentloaded" });
    const status = resp ? resp.status() : 0;
    const h1 = await page.$eval("h1", (e) => e.textContent.trim()).catch(() => "");
    const hasCta = (await page.$('a[href="../"]')) !== null;
    const descLen = await page
      .$eval('meta[name="description"]', (e) => e.getAttribute("content")?.length ?? 0)
      .catch(() => 0);
    check(
      "guide serves with content + CTA: " + slug,
      status === 200 && h1.length > 10 && hasCta && descLen > 50,
      status + " / h1=" + h1.slice(0, 34) + " / desc=" + descLen
    );
  }
  const sitemap = await page.goto(BASE + "/sitemap.xml", { waitUntil: "domcontentloaded" });
  const sitemapText = await page.evaluate(() => document.body.innerText);
  const sitemapCount = (sitemapText.match(/<loc>/g) ?? []).length;
  check("sitemap lists the app and every guide", sitemap !== null && sitemapCount >= 5, sitemapCount + " urls");

  check("zero console errors", consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | ") || "none");
  check("zero uncaught page errors", pageErrors.length === 0, pageErrors.slice(0, 3).join(" | ") || "none");
} finally {
  await browser.close();
}

const summary = {
  base: BASE,
  at: new Date().toISOString(),
  timings,
  passed: checks.filter((c) => c.pass).length,
  failed: checks.filter((c) => !c.pass).length,
  checks,
  consoleErrors,
  pageErrors,
};
fs.writeFileSync(path.join(LOGDIR, "qa-run.json"), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
