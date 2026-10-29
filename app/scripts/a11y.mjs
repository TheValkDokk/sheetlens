import puppeteer from "puppeteer-core";
import fs from "node:fs";
import path from "node:path";

const OUT = "/Users/valk/Documents/product-test/evidence/a11y";
fs.mkdirSync(OUT, { recursive: true });
const axePath = path.resolve("node_modules/axe-core/axe.min.js");

const b = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new",
  args: ["--no-sandbox"],
});
const results = {};

async function auditPage(p, label) {
  await p.addScriptTag({ path: axePath });
  const res = await p.evaluate(async () => {
    return await window.axe.run(document, { resultTypes: ["violations"] });
  });
  results[label] = res.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    help: v.help,
    nodes: v.nodes.length,
    targets: v.nodes.slice(0, 3).map((n) => n.target.join(" ")),
  }));
}

const p = await b.newPage();
await p.setViewport({ width: 1440, height: 940 });
const BASE = process.env.BASE ?? "https://thevalkdokk.github.io/sheetlens";
await p.goto(BASE + "/", { waitUntil: "networkidle0" });
await auditPage(p, "home");

await p.click('[data-action="demo"]');
await p.waitForSelector(".finding");
await auditPage(p, "results-risks");

await p.click("#tab-overview");
await auditPage(p, "results-overview");

await p.click("#tab-formulas");
await auditPage(p, "results-formulas");

await p.click("#tab-impact");
await auditPage(p, "results-impact");

await p.goto(BASE + "/guides/excel-ref-error-what-to-do.html", { waitUntil: "networkidle0" });
await auditPage(p, "guide");

await p.goto(BASE + "/?demo=1", { waitUntil: "networkidle0" });
await p.waitForSelector(".finding");
results.caveatNotice = await p.$eval(".notice", (e) => e.textContent.trim()).catch(() => "NO NOTICE");

fs.writeFileSync(OUT + "/axe.json", JSON.stringify(results, null, 2));
for (const [k, v] of Object.entries(results)) {
  if (!Array.isArray(v)) {
    console.log(k + ": " + String(v).slice(0, 220));
    continue;
  }
  console.log(k + ": " + v.length + " violation type(s)");
  for (const x of v) console.log("   [" + x.impact + "] " + x.id + " x" + x.nodes + " — " + x.help);
}
await b.close();
