
import sys, re, html, urllib.request, gzip, io
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36"
def get(u, n=2500):
    try:
        req = urllib.request.Request(u, headers={"User-Agent":UA,"Accept":"text/html,application/xhtml+xml","Accept-Language":"en-US,en;q=0.9"})
        with urllib.request.urlopen(req, timeout=30) as r:
            raw = r.read()
            if r.headers.get("Content-Encoding")=="gzip": raw = gzip.decompress(raw)
            d = raw.decode("utf-8","ignore")
            code = r.status
    except Exception as e:
        print("FETCH ERR", u, e); return
    d = re.sub(r"(?is)<(script|style|noscript)[^>]*>.*?</\1>"," ",d)
    t = re.sub(r"(?s)<[^>]+>"," ",d)
    t = html.unescape(t)
    t = " ".join(t.split())
    print(f"\n=== {code} {u}  ({len(t)} chars)")
    print(t[:n])
for u in sys.argv[1:]:
    get(u)
