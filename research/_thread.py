
import sys, re, html, urllib.request, time
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36"
def clean(s):
    s = html.unescape(html.unescape(s))
    return " ".join(re.sub(r"(?s)<[^>]+>"," ",s).split())
def thread(pid, n=4):
    u = f"https://www.reddit.com/comments/{pid}.rss?limit=30"
    try:
        req = urllib.request.Request(u, headers={"User-Agent":UA})
        with urllib.request.urlopen(req, timeout=30) as r:
            d = r.read().decode("utf-8","ignore")
    except Exception as e:
        print("ERR", pid, e); return
    entries = re.findall(r"(?s)<entry>(.*?)</entry>", d)
    print(f"\n===== {pid} (entries={len(entries)})")
    for i,e in enumerate(entries[:1+n]):
        title = html.unescape(re.search(r"(?s)<title>(.*?)</title>", e).group(1))
        body  = re.search(r"(?s)<content[^>]*>(.*?)</content>", e)
        print(f"  -- {title[:150]}")
        if body: print(f"     {clean(body.group(1))[:500]}")
    print(f"  url: https://www.reddit.com/comments/{pid}")
for pid in sys.argv[1:]:
    thread(pid); time.sleep(6)
