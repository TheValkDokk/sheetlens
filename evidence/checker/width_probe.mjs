
import puppeteer from "puppeteer-core";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = "http://localhost:4173";
const b = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox", "--disable-gpu"] });
async function run(isMobile) {
  const p = await b.newPage();
  await p.setViewport({ width: 380, height: 844, deviceScaleFactor: 2, isMobile, hasTouch: isMobile });
  await p.goto(BASE + "/?demo=1", { waitUntil: "networkidle0" });
  await p.waitForSelector(".stats");
  await p.click("#tab-overview"); await new Promise(r=>setTimeout(r,200));
  const m = await p.evaluate(() => {
    const t = document.querySelector("table");
    const wrap = document.querySelector(".wrap");
    const panel = document.querySelector(".panel");
    return {
      innerWidth, clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth,
      bodyScroll: document.body.scrollWidth,
      tableOffset: t.offsetWidth, tableScroll: t.scrollWidth,
      wrapOffset: wrap.offsetWidth, panelScroll: panel.scrollWidth,
      ua: navigator.userAgent.slice(0, 40),
      visual: visualViewport ? visualViewport.width : null,
    };
  });
  await p.screenshot({ path: "/Users/valk/Documents/product-test/evidence/checker/browser/overview-380-" + (isMobile ? "mobile" : "desktop") + ".png" });
  await p.close();
  return m;
}
console.log("desktop", JSON.stringify(await run(false), null, 1));
console.log("mobile", JSON.stringify(await run(true), null, 1));
await b.close();
