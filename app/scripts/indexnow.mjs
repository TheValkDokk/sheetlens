import fs from "node:fs";
import path from "node:path";

/**
 * IndexNow: tells participating search engines (Bing, Yandex, Seznam) that these
 * URLs changed, without an account or a dashboard. Idempotent and safe to re-run.
 */
const HOST = "thevalkdokk.github.io";
const BASE = "https://" + HOST + "/sheetlens";
const publicDir = path.join(process.cwd(), "public");

const keyFile = fs.readdirSync(publicDir).find((f) => /^[a-f0-9]{32}\.txt$/.test(f));
if (!keyFile) {
  console.error("No IndexNow key file found in public/");
  process.exit(1);
}
const key = keyFile.replace(/\.txt$/, "");

const sitemap = fs.readFileSync(path.join(publicDir, "sitemap.xml"), "utf8");
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (urls.length === 0) {
  console.error("No URLs found in sitemap.xml");
  process.exit(1);
}

const body = {
  host: HOST,
  key,
  keyLocation: BASE + "/" + keyFile,
  urlList: urls,
};

const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify(body),
});

console.log("submitted", urls.length, "urls ->", res.status, res.statusText);
// 200/202 mean accepted; 4xx means the key file or payload is not visible yet.
if (!res.ok) {
  console.error(await res.text());
  process.exit(1);
}
