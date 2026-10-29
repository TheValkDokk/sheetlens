
import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";

const BASE = "http://localhost:4173";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const FIX = "/Users/valk/Documents/product-test/evidence/checker/fixtures";
const OUT = "/Users/valk/Documents/product-test/evidence/checker/browser";
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const log = { at: new Date().toISOString(), cases: {}, consoleErrors: [], pageErrors: [] };
const shot = (p, n) => p.screenshot({ path: path.join(OUT, n) });

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox", "--disable-gpu", "--hide-scrollbars"] });

async function newPage(w = 1440, h = 940, dpr = 1) {
  const p = await browser.newPage();
  await p.setViewport({ width: w, height: h, deviceScaleFactor: dpr });
  p.on("console", m => { if (m.type() === "error") log.consoleErrors.push(m.text()); });
  p.on("pageerror", e => log.pageErrors.push(String(e)));
  return p;
}
async function upload(p, file, timeout = 90000) {
  await p.goto(BASE + "/", { waitUntil: "networkidle0" });
  const input = await p.$("#file");
  const t = Date.now();
  await input.uploadFile(file);
  await p.waitForSelector(".stats, .err", { timeout });
  return Date.now() - t;
}
async function stats(p) {
  return p.$$eval(".stat", els => els.map(e => e.textContent.trim()));
}
async function panel(p) { return p.$eval("#panel", e => e.innerText).catch(() => ""); }
async function tab(p, id) { await p.click("#tab-" + id); await sleep(120); }
async function impact(p, addr) {
  await p.click("#tab-impact"); await sleep(80);
  await p.$eval("#impactor", e => { e.value = ""; });
  await p.type("#impactor", addr);
  await p.click('[data-action="impact-run"]');
  await sleep(160);
  return { addr, text: await panel(p) };
}

try {
  // ---------- A. keyboard reachability
  {
    const p = await newPage();
    await p.goto(BASE + "/", { waitUntil: "networkidle0" });
    const focusables = await p.evaluate(() => [...document.querySelectorAll("a[href],button,input,label,select,textarea,[tabindex]")].map(el => ({ tag: el.tagName, id: el.id, type: el.type || "", hidden: el.hidden || false, tabindex: el.getAttribute("tabindex"), for: el.getAttribute("for"), text: (el.textContent || "").trim().slice(0, 32) })));
    const seq = [];
    for (let i = 0; i < 6; i++) {
      await p.keyboard.press("Tab"); await sleep(40);
      seq.push(await p.evaluate(() => { const a = document.activeElement; return { tag: a.tagName, id: a.id, cls: a.className, text: (a.textContent || "").trim().slice(0, 30) }; }));
    }
    const snap = await p.accessibility.snapshot({ interestingOnly: true });
    const pick = (n) => n ? { role: n.role, name: n.name, children: (n.children || []).map(pick) } : null;
    log.cases.keyboard = { focusables, tabSequence: seq, a11y: pick(snap) };
    await shot(p, "keyboard-home.png");
    await p.close();
  }

  // ---------- B. privacy: network requests during a real file upload
  {
    const p = await newPage();
    const reqs = []; const ws = [];
    p.on("request", r => reqs.push({ url: r.url(), method: r.method(), type: r.resourceType(), postData: (r.postData() || "").length }));
    p.on("websocket", w => ws.push(w.url()));
    await p.goto(BASE + "/", { waitUntil: "networkidle0" });
    const assets = reqs.length;
    reqs.length = 0;
    const input = await p.$("#file");
    const t = Date.now();
    await input.uploadFile(path.join(FIX, "privacy.xlsx"));
    await p.waitForSelector(".stats", { timeout: 90000 });
    const ms = Date.now() - t;
    await sleep(1200);
    const during = [...reqs];
    const resources = await p.evaluate(() => performance.getEntriesByType("resource").map(r => r.name));
    log.cases.privacy = { fileBytes: fs.statSync(path.join(FIX, "privacy.xlsx")).size, assetRequestsOnLoad: assets, requestsDuringUpload: during, websockets: ws, stats: await stats(p), ms, resourcesAfter: resources };
    await p.close();
  }

  // ---------- C. edge workbook: false-safe impact and false "no risk" claim
  {
    const p = await newPage();
    const ms = await upload(p, path.join(FIX, "edge.xlsx"));
    log.cases.edge = { ms, stats: await stats(p), tabs: await p.$$eval(".tab", els => els.map(e => e.innerText)) };
    await tab(p, "risks");
    log.cases.edge.risksEmpty = await panel(p);
    await tab(p, "formulas");
    log.cases.edge.formulas = await p.$$eval(".frow", els => els.map(e => ({ hdr: e.querySelector(".hdr")?.innerText, say: e.querySelector(".say")?.innerText })));
    const impacts = {};
    for (const a of ["Rates!A1", "Model!A2", "Model!B1", "Model!A1", "Model!C1"]) impacts[a] = await impact(p, a);
    log.cases.edge.impacts = impacts;
    await shot(p, "edge-impact-false-safe.png");
    await p.close();
  }

  // ---------- D. quiet workbook: absolute claim with a hardcoded 0.2
  {
    const p = await newPage();
    await upload(p, path.join(FIX, "quiet.xlsx"));
    await tab(p, "risks");
    log.cases.quiet = { stats: await stats(p), risks: await panel(p) };
    await shot(p, "quiet-no-risks.png");
    await p.close();
  }

  // ---------- E. zero formulas
  {
    const p = await newPage();
    await upload(p, path.join(FIX, "zero.xlsx"));
    const s = await stats(p);
    await tab(p, "formulas"); const f = await panel(p);
    await tab(p, "impact"); const i = await panel(p);
    await tab(p, "risks"); const r = await panel(p);
    log.cases.zero = { stats: s, formulas: f, impact: i, risks: r };
    await p.close();
  }

  // ---------- F. single-column CSV
  {
    const p = await newPage();
    const ms = await upload(p, path.join(FIX, "single.csv"));
    log.cases.singleCsv = { ms, stats: await stats(p), tabs: await p.$$eval(".tab", els => els.map(e => e.innerText)) };
    await tab(p, "overview");
    log.cases.singleCsv.overview = await p.$eval("table", e => e.innerText);
    await p.close();
  }

  // ---------- G. modern formulas: explanations and missed hardcode
  {
    const p = await newPage();
    await upload(p, path.join(FIX, "modern.xlsx"));
    await tab(p, "formulas");
    log.cases.modern = { formulas: await p.$$eval(".frow", els => els.map(e => ({ hdr: e.querySelector(".hdr")?.innerText, say: e.querySelector(".say")?.innerText }))) };
    await tab(p, "risks");
    log.cases.modern.risks = await panel(p);
    await shot(p, "modern-formulas.png");
    await p.close();
  }

  // ---------- H. XSS: hostile sheet name, formula string, filename
  {
    const p = await newPage();
    await p.goto(BASE + "/", { waitUntil: "networkidle0" });
    await p.evaluate(() => { window.x = 0; window.y = 0; });
    const input = await p.$("#file");
    await input.uploadFile(path.join(FIX, "xss.xlsx"));
    await p.waitForSelector(".stats", { timeout: 30000 });
    await tab(p, "formulas"); await tab(p, "overview"); await sleep(200);
    const afterSheet = await p.evaluate(() => ({ x: window.x, y: window.y, body: document.body.innerText.includes("onerror") }));
    // hostile filename
    const hostileName = "<img src=x onerror=window.y=1>.xlsx";
    fs.copyFileSync(path.join(FIX, "xss.xlsx"), path.join(FIX, hostileName));
    await p.goto(BASE + "/", { waitUntil: "networkidle0" });
    await p.evaluate(() => { window.x = 0; window.y = 0; });
    const i2 = await p.$("#file");
    await i2.uploadFile(path.join(FIX, hostileName));
    await p.waitForSelector(".stats", { timeout: 30000 });
    await sleep(200);
    const afterName = await p.evaluate(() => ({ x: window.x, y: window.y }));
    log.cases.xss = { afterSheet, afterName };
    await p.close();
  }

  // ---------- I. refusal: OLE/password lookalike, empty, fake zip
  {
    const p = await newPage();
    const out = {};
    for (const f of ["protected-lookalike.xlsx"]) {
      await p.goto(BASE + "/", { waitUntil: "networkidle0" });
      const input = await p.$("#file");
      await input.uploadFile(path.join(FIX, f));
      await p.waitForSelector(".err", { timeout: 20000 });
      out[f] = await p.$eval(".err", e => e.innerText);
    }
    const empty = path.join(FIX, "empty.bin"); fs.writeFileSync(empty, "");
    await p.goto(BASE + "/", { waitUntil: "networkidle0" });
    let input = await p.$("#file");
    await input.uploadFile(empty);
    await p.waitForSelector(".err", { timeout: 20000 });
    out["empty.bin"] = await p.$eval(".err", e => e.innerText);
    const fake = path.join(FIX, "fakezip.xlsx"); fs.writeFileSync(fake, "PK\\x03\\x04xl/workbook.xml but no zip");
    await p.goto(BASE + "/", { waitUntil: "networkidle0" });
    input = await p.$("#file");
    await input.uploadFile(fake);
    await p.waitForSelector(".err", { timeout: 20000 });
    out["fakezip.xlsx"] = await p.$eval(".err", e => e.innerText);
    log.cases.refusal = out;
    await shot(p, "refusal-ole.png");
    await p.close();
  }

  // ---------- J. 20k-cell formula benchmark in the browser
  {
    const p = await newPage();
    await p.evaluateOnNewDocument(() => {
      window.__long = [];
      try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__long.push(Math.round(e.duration)); }).observe({ entryTypes: ["longtask"] }); } catch (e) {}
    });
    const ms = await upload(p, path.join(FIX, "bench20k.xlsx"));
    const longtasks = await p.evaluate(() => window.__long || []);
    log.cases.bench20k = { uploadToResultsMs: ms, longtasks, stats: await stats(p), busyMarkers: await p.evaluate(() => ({ ariaBusy: document.querySelectorAll('[aria-busy="true"]').length, busyClass: document.querySelectorAll('.busy,.loading,.spinner').length })) };
    await shot(p, "bench20k.png");
    await p.close();
  }

  // ---------- K. export: all findings, offline, self-contained
  {
    const p = await newPage();
    await upload(p, path.join(FIX, "edge.xlsx"));
    // use demo for richer findings
    await p.goto(BASE + "/?demo=1", { waitUntil: "networkidle0" });
    await p.waitForSelector(".stats");
    const dl = path.join(OUT, "downloads"); fs.mkdirSync(dl, { recursive: true });
    const client = await p.createCDPSession();
    await client.send("Page.setDownloadBehavior", { behavior: "allow", downloadPath: dl });
    await p.click('[data-action="export"]');
    let file = null;
    for (let i = 0; i < 50; i++) { const fsx = fs.readdirSync(dl).filter(f => f.endsWith(".html")); if (fsx.length) { file = path.join(dl, fsx[0]); break; } await sleep(100); }
    const html = file ? fs.readFileSync(file, "utf8") : "";
    const rows = (html.match(/<tr><td>(high|medium|low)<\/td>/g) || []).length;
    const offline = await newPage();
    let offlineText = "";
    if (file) { await offline.goto("file://" + file, { waitUntil: "load" }); offlineText = await offline.$eval("body", e => e.innerText.slice(0, 200)); }
    log.cases.export = { file: file ? path.basename(file) : null, bytes: html.length, findingRows: rows, externalHttp: (html.match(/https?:\/\//g) || []).length, scriptTags: (html.match(/<script/gi) || []).length, offlineText };
    await offline.close(); await p.close();
  }

  // ---------- L. mobile overflow per tab and with a long filename
  {
    const p = await newPage(380, 844, 2);
    await p.goto(BASE + "/?demo=1", { waitUntil: "networkidle0" });
    await p.waitForSelector(".stats");
    const tabs = {};
    for (const t of ["risks", "overview", "formulas", "impact"]) {
      await tab(p, t);
      tabs[t] = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    }
    const longName = fs.readdirSync(FIX).find(f => f.startsWith("Q3_Pricing_Model_Pricing"));
    await upload(p, path.join(FIX, longName));
    const longFile = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth - window.innerWidth, fname: document.querySelector(".filename")?.innerText.slice(0, 40) }));
    await tab(p, "overview");
    const longOverview = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    log.cases.mobile = { overflowByTab: tabs, longFile, longOverview };
    await shot(p, "mobile-longname.png");
    await p.close();
  }

  // ---------- M. 10MB file
  {
    const file = path.join(FIX, "big10mb.xlsx");
    if (fs.existsSync(file)) {
      const p = await newPage();
      await p.evaluateOnNewDocument(() => { window.__long = []; try { new PerformanceObserver(l => { for (const e of l.getEntries()) window.__long.push(Math.round(e.duration)); }).observe({ entryTypes: ["longtask"] }); } catch (e) {} });
      let result;
      try {
        const ms = await upload(p, file, 180000);
        result = { ms, longtasks: await p.evaluate(() => window.__long || []), stats: await stats(p), bytes: fs.statSync(file).size };
      } catch (e) { result = { error: String(e).slice(0, 300), bytes: fs.statSync(file).size }; }
      log.cases.big10mb = result;
      await p.close();
    }
  }
} finally {
  await browser.close();
  fs.writeFileSync(path.join(OUT, "browser-run.json"), JSON.stringify(log, null, 2));
  console.log(JSON.stringify(log, null, 2).slice(0, 30000));
}
