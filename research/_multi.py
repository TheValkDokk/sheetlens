
import sys, re, html, urllib.request, gzip, json
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36"
def text(u):
    req = urllib.request.Request(u, headers={"User-Agent":UA,"Accept":"text/html,application/xhtml+xml","Accept-Language":"en-US,en;q=0.9"})
    with urllib.request.urlopen(req, timeout=35) as r:
        raw=r.read()
        if r.headers.get("Content-Encoding")=="gzip": raw=gzip.decompress(raw)
        d=raw.decode("utf-8","ignore")
    d=re.sub(r"(?is)<(script|style|noscript)[^>]*>.*?</\1>"," ",d)
    return " ".join(html.unescape(re.sub(r"(?s)<[^>]+>"," ",d)).split())
spec = json.load(open(sys.argv[1]))
for u, pats in spec.items():
    try:
        t = text(u)
    except Exception as e:
        print(f"\n### FETCH ERR {u} :: {e}"); continue
    print(f"\n### {u} ({len(t)} chars)")
    if not pats:
        print(t[:900]); continue
    for p in pats:
        ms = list(re.finditer(p, t, re.I))[:2]
        if not ms: print(f"  [no match: {p}]")
        for m in ms:
            s=max(0,m.start()-200); e=min(len(t),m.end()+300)
            print(f"  [{p}] ...{t[s:e]}...")
