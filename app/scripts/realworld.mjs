import puppeteer from "puppeteer-core";
import fs from "node:fs";

const OUT = "/Users/valk/Documents/product-test/evidence/realworld";
fs.mkdirSync(OUT, { recursive: true });
const b = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new",
  args: ["--no-sandbox", "--hide-scrollbars"],
});
const p = await b.newPage();
await p.setViewport({ width: 1440, height: 940, deviceScaleFactor: 2 });
const errors = [];
p.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
p.on("pageerror", (e) => errors.push(String(e)));

const report = {};
await p.goto("https://thevalkdokk.github.io/sheetlens/", { waitUntil: "networkidle0" });
const input = await p.$("#file");
await input.uploadFile("/tmp/financial-sample.xlsx");
const t0 = Date.now();
await p.waitForSelector(".stats", { timeout: 30000 });
report.loadMs = Date.now() - t0;
report.stats = await p.$$eval(".stat", (els) => els.map((e) => e.textContent.trim()));
report.findings = await p.$$eval(".finding", (els) => els.map((e) => ({
  sev: e.className.replace("finding ", ""),
  title: e.querySelector(".ftitle")?.textContent,
  loc: e.querySelector(".loc")?.textContent,
})));
await p.screenshot({ path: OUT + "/01-realworkbook-risks.png" });

await p.click("#tab-overview");
await p.waitForSelector("table");
report.sheets = await p.$$eval("table tbody tr", (rows) =>
  rows.map((r) => [...r.querySelectorAll("td")].map((c) => c.textContent.trim()))
);
await p.screenshot({ path: OUT + "/02-realworkbook-overview.png" });

await p.click("#tab-formulas");
await p.waitForFunction(() => document.querySelector(".frow") || document.querySelector(".empty"), { timeout: 15000 });
report.formulasView = {
  rows: await p.$$eval(".frow", (r) => r.length),
  emptyText: await p.$eval(".empty", (e) => e.textContent.trim()).catch(() => null),
};
await p.screenshot({ path: OUT + "/03-realworkbook-formulas.png" });

await p.click("#tab-impact");
await p.waitForFunction(() => document.querySelector("#impactor") || document.querySelector(".empty"), { timeout: 15000 });
const hasPicker = (await p.$("#impactor")) !== null;
if (hasPicker) {
  await p.$eval("#impactor", (e) => (e.value = ""));
  await p.type("#impactor", "Financials!E5");
  await p.click('[data-action="impact-run"]');
  await new Promise((r) => setTimeout(r, 300));
  report.impactE5 = (await p.$eval("#panel", (e) => e.textContent)).slice(0, 320).replace(/\s+/g, " ");
} else {
  report.impactE5 = "no picker: " + (await p.$eval("#panel", (e) => e.textContent.trim())).slice(0, 200);
}
await p.screenshot({ path: OUT + "/04-realworkbook-impact.png" });

report.consoleErrors = errors;
fs.writeFileSync(OUT + "/run.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
await b.close();
