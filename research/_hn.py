
import json, urllib.parse, urllib.request, sys, time

def hn(q, tags="story", n=8):
    url = "https://hn.algolia.com/api/v1/search?" + urllib.parse.urlencode({
        "query": q, "tags": tags, "hitsPerPage": n, "numericFilters": "points>15"})
    try:
        with urllib.request.urlopen(url, timeout=25) as r:
            d = json.load(r)
    except Exception as e:
        print("ERR", q, e); return
    print(f"\n#### HN: {q}  (hits={d.get('nbHits')})")
    for h in d["hits"]:
        t = h.get("title") or (h.get("story_title") or "")
        oid = h.get("objectID")
        pts = h.get("points"); nc = h.get("num_comments")
        ca = (h.get("created_at") or "")[:10]
        print(f"  [{pts}p {nc}c {ca}] {t[:110]}")
        print(f"     https://news.ycombinator.com/item?id={oid}")

qs = sys.argv[1:]
for q in qs:
    hn(q)
    time.sleep(0.3)
