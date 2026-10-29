
import puppeteer from "puppeteer-core";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const file = "file:///Users/valk/Documents/product-test/evidence/logs/downloads/Q3_Pricing_Model-audit.html";
const b = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox"] });
const p = await b.newPage();
const errs = []; p.on("pageerror", e => errs.push(String(e)));
const t0 = Date.now();
await p.goto(file, { waitUntil: "load" });
const text = await p.$eval("body", e => e.innerText);
const rows = await p.$$eval("table tr", e => e.length);
console.log(JSON.stringify({ ms: Date.now() - t0, title: await p.title(), hasAudit: text.includes("Workbook audit"), hasHidden: text.includes("Very hidden sheet"), hasExternal: text.includes("Depends on a file outside"), rows, bytes: (await import("node:fs")).statSync("/Users/valk/Documents/product-test/evidence/logs/downloads/Q3_Pricing_Model-audit.html").size, errs }, null, 1));
await b.close();
