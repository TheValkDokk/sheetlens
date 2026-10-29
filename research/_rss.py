
import sys, re, html, urllib.request, urllib.parse, gzip, time
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36"
def rss(sub, q, t="all", sort="relevance", n=8):
    u = f"https://www.reddit.com/r/{sub}/search.rss?" + urllib.parse.urlencode({"q":q,"restrict_sr":1,"sort":sort,"t":t,"limit":n})
    try:
        req = urllib.request.Request(u, headers={"User-Agent":UA})
        with urllib.request.urlopen(req, timeout=30) as r:
            d = r.read().decode("utf-8","ignore")
    except Exception as e:
        print("ERR", sub, q, e); return
    entries = re.findall(r"(?s)<entry>(.*?)</entry>", d)
    print(f"\n#### r/{sub} :: {q}  -> {len(entries)} results")
    for e in entries:
        title = html.unescape(re.search(r"(?s)<title>(.*?)</title>", e).group(1))
        link  = re.search(r'(?s)<link href="([^"]+)"', e).group(1)
        upd   = re.search(r"(?s)<updated>(.*?)</updated>", e)
        body  = re.search(r"(?s)<content[^>]*>(.*?)</content>", e)
        b = ""
        if body:
            b = html.unescape(html.unescape(body.group(1)))
            b = " ".join(re.sub(r"(?s)<[^>]+>"," ",b).split())
        print(f"  [{(upd.group(1) if upd else '')[:10]}] {title[:120]}")
        print(f"     {link}")
        if b: print(f"     > {b[:260]}")
for arg in sys.argv[1:]:
    sub,q = arg.split("|",1)
    rss(sub,q); time.sleep(0.5)
