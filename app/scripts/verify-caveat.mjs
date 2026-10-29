import puppeteer from "puppeteer-core";
import fs from "node:fs";
const BASE = process.env.BASE ?? "https://thevalkdokk.github.io/sheetlens";
const b = await puppeteer.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  headless: "new",
  args: ["--no-sandbox"],
});
const out = {};
const p = await b.newPage();
const errors = [];
p.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
p.on("pageerror", (e) => errors.push(String(e)));

async function load(path) {
  await p.goto(BASE + "/", { waitUntil: "networkidle0" });
  const input = await p.$("#file");
  await input.uploadFile(path);
  await p.waitForSelector(".stats", { timeout: 20000 });
  return p.evaluate(() => {
    const notices = [...document.querySelectorAll(".notice")].map((n) => n.textContent.trim());
    return {
      notices,
      caveat: notices.some((n) => /whole-column/i.test(n)),
    };
  });
}

out.demo = await p.goto(BASE + "/?demo=1", { waitUntil: "networkidle0" }).then(async () => {
  await p.waitForSelector(".finding");
  return p.evaluate(() => [...document.querySelectorAll(".notice")].map((n) => n.textContent.trim()));
});

out.clean = await load("/tmp/clean-norefs.xlsx");
out.withColRef = await load("/tmp/with-colref.xlsx");
out.consoleErrors = errors;
fs.writeFileSync("/Users/valk/Documents/product-test/evidence/checker5/caveat-verify.json", JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
await b.close();
