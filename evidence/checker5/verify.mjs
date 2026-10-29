
import { createRequire } from "node:module";
import fs from "node:fs";
const require = createRequire("/Users/valk/Documents/product-test/app/package.json");
const puppeteer = require("puppeteer-core");
const BASE = "https://thevalkdokk.github.io/sheetlens";
const DIR = "/Users/valk/Documents/product-test/evidence/checker5";
const out = {};

const b = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new", args: ["--no-sandbox"],
});
const p = await b.newPage();
await p.setViewport({ width: 1440, height: 940 });
let errors = [];
p.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
p.on("pageerror", (e) => errors.push("pageerror: " + e.message));
p.on("requestfailed", (r) => errors.push("reqfail: " + r.url()));

async function upload(file) {
  const inp = await p.waitForSelector("#file");
  await inp.uploadFile(file);
  await p.waitForFunction(() => !document.querySelector('[role="status"]'), { timeout: 60000 }).catch(() => {});
  await new Promise((r) => setTimeout(r, 400));
}

// 1a demo caveat
await p.goto(BASE + "/?demo=1", { waitUntil: "networkidle0" });
await p.waitForSelector(".stats");
out.demoNotices = await p.$$eval(".notice", (ns) => ns.map((n) => n.textContent.trim()));
out.demoStats = await p.$eval(".stats", (e) => e.textContent.replace(/\s+/g, " ").trim());
await p.screenshot({ path: DIR + "/1-demo-caveat.png" });

// 1b clean file no caveat
await upload(DIR + "/clean-no-wholecol.xlsx");
out.cleanNotices = await p.$$eval(".notice", (ns) => ns.map((n) => n.textContent.trim()));
out.cleanStats = await p.$eval(".stats", (e) => e.textContent.replace(/\s+/g, " ").trim());
await p.screenshot({ path: DIR + "/2-clean-no-caveat.png" });

// 4 regression
await p.goto(BASE, { waitUntil: "networkidle0" });
await upload(DIR + "/regression.xlsx");
await p.click("#tab-impact");
async function trace(q) {
  await p.$eval("#impactor", (el, v) => { el.value = v; el.dispatchEvent(new Event("input", { bubbles: true })); }, q);
  await p.click('[data-action="impact-run"]');
  await new Promise((r) => setTimeout(r, 150));
  return p.$eval("#panel", (e) => e.textContent.replace(/\s+/g, " ").trim().slice(0, 500));
}
out.traceModelB4 = await trace("model!b4");
await p.screenshot({ path: DIR + "/3-trace-model-b4.png" });
out.traceNopeB4 = await trace("Nope!B4");
await p.screenshot({ path: DIR + "/4-trace-nope-b4.png" });

// 4c fake PK refusal
await p.goto(BASE, { waitUntil: "networkidle0" });
await upload(DIR + "/fake-pk.xlsx");
out.fakePkError = await p.$eval(".err", (e) => e.textContent.replace(/\s+/g, " ").trim()).catch(() => "NO ERROR BOX");
out.fakePkPasswordMentioned = /password|encrypt/i.test(out.fakePkError);
await p.screenshot({ path: DIR + "/5-fake-pk.png" });

// 3 Microsoft real workbook
errors = [];
await p.goto(BASE, { waitUntil: "networkidle0" });
await upload(DIR + "/ms-financial-sample.xlsx");
out.msErr = await p.$eval(".err", (e) => e.textContent.trim()).catch(() => null);
out.msStats = await p.$eval(".stats", (e) => e.textContent.replace(/\s+/g, " ").trim()).catch(() => "NO STATS");
out.msNotice = await p.$$eval(".notice", (ns) => ns.map((n) => n.textContent.trim()));
await p.click("#tab-formulas").catch(() => {});
out.msFormulasTab = await p.$eval("#panel", (e) => e.textContent.replace(/\s+/g, " ").trim().slice(0, 300)).catch(() => "n/a");
out.msConsoleErrors = errors.slice();
await p.screenshot({ path: DIR + "/6-ms-sample.png", fullPage: false });

// 2 keyboard on home
errors = [];
await p.goto(BASE, { waitUntil: "networkidle0" });
const seq = [];
let chooseVisible = false, chooseFocusStyle = null;
for (let i = 0; i < 14; i++) {
  await p.keyboard.press("Tab");
  const info = await p.evaluate(() => {
    const el = document.activeElement;
    if (!el) return null;
    const s = getComputedStyle(el);
    return {
      tag: el.tagName, text: (el.textContent || "").trim().slice(0, 40),
      label: el.getAttribute("aria-label") || el.getAttribute("id") || "",
      outline: s.outlineWidth + " " + s.outlineStyle + " " + s.outlineColor,
      shadow: s.boxShadow, offset: el.getBoundingClientRect().top
    };
  });
  if (!info) break;
  seq.push(info);
  if (info.text === "Choose a file") { chooseVisible = true; chooseFocusStyle = info; break; }
}
out.keyboardSeq = seq;
out.chooseReachable = chooseVisible;
out.chooseFocusStyle = chooseFocusStyle;
await p.screenshot({ path: DIR + "/7-keyboard-focus.png" });
out.keyboardErrors = errors.slice();

fs.writeFileSync(DIR + "/run.json", JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
await b.close();
