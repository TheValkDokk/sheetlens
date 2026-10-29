import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", args: ["--no-sandbox", "--hide-scrollbars"] });
const p = await b.newPage();
await p.setViewport({ width: 1280, height: 940, deviceScaleFactor: 2 });
await p.goto("https://thevalkdokk.github.io/sheetlens/guides/what-does-this-excel-formula-mean.html", { waitUntil: "networkidle0" });
await p.screenshot({ path: "/Users/valk/Documents/product-test/evidence/screens/08-guide.png", fullPage: false });
console.log("title:", await p.title());
console.log("h1:", await p.$eval("h1", (e) => e.textContent.trim()));
await b.close();
