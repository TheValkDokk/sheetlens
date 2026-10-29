
import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";
const BASE = "http://localhost:4173";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const FIX = "/Users/valk/Documents/product-test/evidence/checker/fixtures";
const OUT = "/Users/valk/Documents/product-test/evidence/checker/browser";
fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = { at: new Date().toISOString(), cases: {}, consoleErrors: [], pageErrors: [] };
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox", "--disable-gpu", "--hide-scrollbars"] });
async function newPage(w = 1440, h = 940, dpr = 1) {
  const p = await browser.newPage();
  await p.setViewport({ width: w, height: h, deviceScaleFactor: dpr });
  p.on("console", m => { if (m.type() === "error") log.consoleErrors.push(m.text()); });
  p.on("pageerror", e => log.pageErrors.push(String(e)));
  return p;
}
async function uploadOutcome(p, file, timeout = 120000) {
  await p.goto(BASE + "/", { waitUntil: "networkidle0" });
  const input = await p.$("#file");
  const t = Date.now();
  await input.uploadFile(file);
  await p.waitForSelector(".stats, .err", { timeout });
  const ms = Date.now() - t;
  if (await p.$(".err")) return { outcome: "error", ms, text: await p.$eval(".err", e => e.innerText) };
  return { outcome: "results", ms, stats: await p.$$eval(".stat", e => e.map(x => x.textContent.trim())) };
}
async function uploadStats(p, file, timeout = 120000) { return uploadOutcome(p, file, timeout); }
try {
  // refusal variants
  {
    const p = await newPage();
    const fake = path.join(FIX, "fakezip.xlsx");
    fs.writeFileSync(fake, "PK\\x03\\x04xl/workbook.xml but this is not a zip archive at all, just text pretending to be one");
    const corrupt = path.join(FIX, "corrupt.xlsx");
    fs.writeFileSync(corrupt, Buffer.concat([Buffer.from([0x50,0x4b,0x03,0x04]), Buffer.from("xl/workbook.xml <broken>")]));
    const empty = path.join(FIX, "empty.bin"); fs.writeFileSync(empty, "");
    const out = {};
    for (const f of ["protected-lookalike.xlsx", "empty.bin", "fakezip.xlsx", "corrupt.xlsx"]) {
      try { out[f] = await uploadOutcome(p, path.join(FIX, f), 30000); }
      catch (e) { out[f] = { outcome: "TIMEOUT/OTHER", error: String(e).slice(0, 200) }; }
    }
    log.cases.refusal = out;
    await p.close();
  }
  // 20k-cell benchmark in browser
  {
    const p = await newPage();
    await p.evaluateOnNewDocument(() => { window.__long = []; try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__long.push(Math.round(e.duration)); }).observe({ entryTypes: ["longtask"] }); } catch (e) {} });
    const r = await uploadOutcome(p, path.join(FIX, "bench20k.xlsx"), 180000);
    log.cases.bench20k = { ...r, longtasks: await p.evaluate(() => window.__long || []), busyMarkersAfter: await p.evaluate(() => ({ ariaBusy: document.querySelectorAll('[aria-busy="true"]').length, busyClass: document.querySelectorAll('.busy,.loading,.spinner,.progress').length })) };
    await p.screenshot({ path: path.join(OUT, "bench20k.png") });
    await p.close();
  }
  // export
  {
    const p = await newPage();
    await p.goto(BASE + "/?demo=1", { waitUntil: "networkidle0" });
    await p.waitForSelector(".stats");
    const dl = path.join(OUT, "downloads2"); fs.mkdirSync(dl, { recursive: true });
    const client = await p.createCDPSession();
    await client.send("Page.setDownloadBehavior", { behavior: "allow", downloadPath: dl });
    await p.click('[data-action="export"]');
    let file = null;
    for (let i = 0; i < 60; i++) { const xs = fs.readdirSync(dl).filter(f => f.endsWith(".html")); if (xs.length) { file = path.join(dl, xs[0]); break; } await sleep(100); }
    const html = file ? fs.readFileSync(file, "utf8") : "";
    const rows = (html.match(/<tr><td>(high|medium|low)<\/td>/g) || []).length;
    let offlineText = ""; let offlineFindings = 0;
    if (file) {
      const off = await newPage();
      await off.goto("file://" + file, { waitUntil: "load" });
      offlineText = await off.$eval("body", e => e.innerText.slice(0, 160));
      offlineFindings = await off.$$eval("table tr", e => e.length);
      await off.close();
    }
    // also inspect app findings count for comparison
    const groups = await p.$$eval(".finding", e => e.length);
    log.cases.export = { file: file ? path.basename(file) : null, bytes: html.length, findingRows: rows, uiGroupedFindings: groups, externalHttp: (html.match(/https?:\/\//g) || []).length, scriptTags: (html.match(/<script/gi) || []).length, offlineText, offlineTableRows: offlineFindings, hasAll: ["hardcoded", "Very hidden", "deleted range"].map(s => [s, html.includes(s)]) };
    await p.close();
  }
  // mobile overflow
  {
    const p = await newPage(380, 844, 2);
    await p.goto(BASE + "/?demo=1", { waitUntil: "networkidle0" });
    await p.waitForSelector(".stats");
    const byTab = {};
    for (const t of ["risks", "overview", "formulas", "impact"]) { await p.click("#tab-" + t); await sleep(120); byTab[t] = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); }
    const longName = fs.readdirSync(FIX).find(f => f.startsWith("Q3_Pricing_Model_Pricing"));
    const r = await uploadOutcome(p, path.join(FIX, longName));
    await sleep(200);
    const longFile = await p.evaluate(() => ({ overflow: document.documentElement.scrollWidth - window.innerWidth, nameLen: (document.querySelector(".filename")?.innerText || "").length }));
    await p.click("#tab-overview"); await sleep(120);
    const longOverview = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    log.cases.mobile = { demoOverflowByTab: byTab, longFileUpload: r, longFileName: longFile, longOverviewOverflow: longOverview };
    await p.screenshot({ path: path.join(OUT, "mobile-longname.png") });
    await p.close();
  }
  // 10MB file
  {
    const f = path.join(FIX, "big10mb.xlsx");
    if (fs.existsSync(f)) {
      const p = await newPage();
      await p.evaluateOnNewDocument(() => { window.__long = []; try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__long.push(Math.round(e.duration)); }).observe({ entryTypes: ["longtask"] }); } catch (e) {} });
      const r = await uploadOutcome(p, f, 240000);
      log.cases.big10mb = { ...r, bytes: fs.statSync(f).size, longtasks: await p.evaluate(() => window.__long || []), warning: await p.$eval(".notice", e => e.innerText).catch(() => null) };
      await p.screenshot({ path: path.join(OUT, "big10mb.png") });
      await p.close();
    }
  }
} finally {
  await browser.close();
  fs.writeFileSync(path.join(OUT, "browser-run2.json"), JSON.stringify(log, null, 2));
  console.log(JSON.stringify(log, null, 2));
}
