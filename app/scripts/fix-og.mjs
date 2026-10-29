import fs from "node:fs";
const dir = "guides";
let fixed = 0;
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".html"))) {
  const p = dir + "/" + f;
  const want = '<meta property="og:url" content="https://thevalkdokk.github.io/sheetlens/guides/' + f + '" />';
  const lines = fs.readFileSync(p, "utf8").split("\n");
  let changed = false;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("og:url")) {
      lines[i] = "    " + want;
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(p, lines.join("\n"));
    fixed++;
  }
}
console.log("fixed", fixed);
