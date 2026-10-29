
import json, urllib.request, re, html, sys
ids = sys.argv[1:]
for i in ids:
    try:
        with urllib.request.urlopen(f"https://hn.algolia.com/api/v1/items/{i}", timeout=25) as r:
            d = json.load(r)
    except Exception as e:
        print("ERR", i, e); continue
    txt = re.sub("<[^>]+>","",html.unescape(d.get("text") or ""))
    print(f"=== {i} | {d.get('title')} | pts={d.get('points')} | {d.get('created_at','')[:10]} | by {d.get('author')} | url={d.get('url')}")
    print("   ", " ".join(txt.split())[:700])
    kids = d.get("children") or []
    print(f"    top-level comments: {len(kids)}")
    for c in kids[:4]:
        ct = re.sub("<[^>]+>","",html.unescape(c.get("text") or ""))
        print("     -", " ".join(ct.split())[:220])
    print()
