
export function text(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g,'"').replace(/&#x27;|&#39;/g,"'")
    .replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&mdash;/g,"-").replace(/&ndash;/g,"-")
    .replace(/[ \t\u00a0]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}
export function prices(txt, {width=170, max=22} = {}) {
  const flat = txt.replace(/\s+/g, " ");
  const re = /(\$\s?\d[\d,.]*|[\u20ac\u00a3]\s?\d[\d,.]*|\bper (month|user|seat|year)\b|\/\s?(mo|month|yr|year)\b|free plan|free forever)/gi;
  const out = []; let m;
  while ((m = re.exec(flat)) && out.length < max) {
    out.push(flat.slice(Math.max(0, m.index - width/2), m.index + width/2).trim());
  }
  return [...new Set(out)];
}
export function ctx(txt, pattern, {width=240, max=14} = {}) {
  const flat = txt.replace(/\s+/g, " ");
  const re = new RegExp(pattern, "gi");
  const out = []; let m;
  while ((m = re.exec(flat)) && out.length < max) {
    out.push(flat.slice(Math.max(0, m.index - width/2), m.index + width/2).trim());
  }
  return [...new Set(out)];
}
