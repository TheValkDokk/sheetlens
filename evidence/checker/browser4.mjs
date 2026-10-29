
import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";
const BASE = "http://localhost:4173";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const FIX = "/Users/valk/Documents/product-test/evidence/checker/fixtures";
const OUT = "/Users/valk/Documents/product-test/evidence/checker/browser";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox", "--disable-gpu"] });
const p = await browser.newPage();
await p.setViewport({ width: 1440, height: 940 });
const out = {};
async function upload(f) {
  await p.goto(BASE + "/", { waitUntil: "networkidle0" });
  const i = await p.$("#file"); await i.uploadFile(path.join(FIX, f));
  await p.waitForSelector(".stats, .err", { timeout: 60000 });
}
async function panel() { return p.$eval("#panel", e => e.innerText); }

// external-only
await upload("external-only.xlsx");
await p.click("#tab-risks"); await sleep(150);
out.externalOnly = { stats: await p.$$eval(".stat", e => e.map(x => x.textContent.trim())), risks: await panel() };

// zero byte xlsx
await p.goto(BASE + "/", { waitUntil: "networkidle0" });
let input = await p.$("#file"); await input.uploadFile(path.join(FIX, "zero-byte.xlsx"));
await p.waitForSelector(".stats, .err", { timeout: 20000 });
out.zeroByte = (await p.$(".err")) ? { outcome: "error", text: await p.$eval(".err", e => e.innerText) } : { outcome: "results" };

// demo: invalid + lowercase sheet
await p.goto(BASE + "/?demo=1", { waitUntil: "networkidle0" }); await p.waitForSelector(".stats");
await p.click("#tab-impact"); await sleep(100);
async function trace(v) {
  await p.$eval("#impactor", e => { e.value = ""; }); await p.type("#impactor", v);
  await p.click('[data-action="impact-run"]'); await sleep(150);
  return await panel();
}
out.demo = { hello: await trace("hello"), lower: await trace("model!B4"), exact: await trace("Model!B4") };

// privacy formulas note + export content
await upload("privacy.xlsx");
await p.click("#tab-formulas"); await sleep(150);
const ftext = await panel();
const note = ftext.split("\n").filter(l => /Showing the first|match/.test(l));
out.largeFormulas = { stats: await p.$$eval(".stat", e => e.map(x => x.textContent.trim())), rowsShown: await p.$$eval(".frow", e => e.length), noteLines: note, excerpt: ftext.slice(-300) };
const dl = path.join(OUT, "final-dl"); fs.mkdirSync(dl, { recursive: true });
const cdp = await p.createCDPSession(); await cdp.send("Page.setDownloadBehavior", { behavior: "allow", downloadPath: dl });
await p.click('[data-action="export"]');
let file = null;
for (let i = 0; i < 50; i++) { const xs = fs.readdirSync(dl).filter(f => f.endsWith(".html")); if (xs.length) { file = path.join(dl, xs[0]); break; } await sleep(100); }
const html = file ? fs.readFileSync(file, "utf8") : "";
out.largeFormulas.export = { bytes: html.length, hasFormulaExplanations: /Cell A\d+ plus 1|The total of range/.test(html), rowCount: (html.match(/<tr><td>(high|medium|low)<\/td>/g) || []).length };
console.log(JSON.stringify(out, null, 1));
await browser.close();
