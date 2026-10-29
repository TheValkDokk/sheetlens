
import puppeteer from "puppeteer-core";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const b = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox"] });
const p = await b.newPage();
await p.setViewport({ width: 380, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await p.goto("https://thevalkdokk.github.io/sheetlens/?demo=1", { waitUntil: "networkidle0" });
await p.waitForSelector(".stats");
await p.click("#tab-overview"); await new Promise(r=>setTimeout(r,250));
console.log(JSON.stringify(await p.evaluate(() => ({ innerWidth, clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, overflowByClient: document.documentElement.scrollWidth - document.documentElement.clientWidth, overflowByInner: document.documentElement.scrollWidth - innerWidth })), null, 1));
await b.close();
