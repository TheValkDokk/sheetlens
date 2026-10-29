import { createRequire } from "node:module";
const require = createRequire("/Users/valk/Documents/product-test/app/package.json");
const puppeteer = require("puppeteer-core");

const URL_LIVE = process.env.TARGET ?? "https://thevalkdokk.github.io/sheetlens/?demo=1";
const browser = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new",
  args: ["--no-sandbox", "--disable-gpu"],
});
const out = { url: URL_LIVE, requests: [], hosts: new Set(), postRequests: [], consoleErrors: [] };
try {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 940 });
  page.on("console", (m) => { if (m.type() === "error") out.consoleErrors.push(m.text()); });
  page.on("pageerror", (e) => out.consoleErrors.push("PAGEERROR " + String(e)));
  page.on("request", (r) => {
    out.requests.push(r.method() + " " + r.url());
    try { out.hosts.add(new URL(r.url()).host); } catch {}
    if (r.method() !== "GET") out.postRequests.push(r.method() + " " + r.url());
  });
  const t0 = Date.now();
  await page.goto(URL_LIVE, { waitUntil: "networkidle0", timeout: 45000 });
  out.loadMs = Date.now() - t0;
  await page.waitForSelector(".stats", { timeout: 20000 });
  out.title = await page.title();
  out.stats = await page.$$eval(".stat", (els) => els.map((e) => e.textContent.replace(/\s+/g, " ").trim()));
  out.findingTitles = await page.$$eval(".finding", (els) => els.slice(0, 40).map((e) => e.textContent.replace(/\s+/g, " ").trim().slice(0, 90)));
  out.ruleIds = await page.evaluate(() => {
    const t = document.body.innerText;
    return ["hardcoded", "volatile", "broken reference", "external", "column", "hidden"].filter((k) => t.toLowerCase().includes(k));
  });
  out.tabs = await page.$$eval("[role=tab], .tab", (els) => els.map((e) => e.textContent.trim()));
  out.exportBtn = (await page.$('[data-action="export"]')) !== null;
  await page.screenshot({ path: "/Users/valk/Documents/product-test/evidence/checker2/live-demo.png", fullPage: false });
} catch (e) {
  out.error = String(e);
} finally {
  out.hosts = [...out.hosts];
  await browser.close();
  console.log(JSON.stringify(out, null, 2));
}
