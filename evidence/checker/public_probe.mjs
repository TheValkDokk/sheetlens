
import puppeteer from "puppeteer-core";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = "https://thevalkdokk.github.io/sheetlens";
const b = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox", "--disable-gpu"] });
const p = await b.newPage();
await p.setViewport({ width: 380, height: 844, deviceScaleFactor: 2, isMobile: true });
await p.goto(BASE + "/?demo=1", { waitUntil: "networkidle0" });
await p.waitForSelector(".stats");
const byTab = {};
for (const t of ["risks","overview","formulas","impact"]) {
  await p.click("#tab-" + t); await new Promise(r=>setTimeout(r,150));
  byTab[t] = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
}
async function trace(v) {
  await p.$eval("#impactor", e => { e.value = ""; }); await p.type("#impactor", v);
  await p.click('[data-action="impact-run"]'); await new Promise(r=>setTimeout(r,200));
  return p.$eval("#panel", e => e.innerText);
}
const lower = await trace("model!B4");
const exact = await trace("Model!B4");
console.log(JSON.stringify({ byTab, lower: lower.slice(0,200), exact: exact.slice(0,300) }, null, 1));
await p.screenshot({ path: "/Users/valk/Documents/product-test/evidence/checker/browser/public-mobile-overview.png" });
await b.close();
