
import json, urllib.parse, urllib.request, sys, time, re, html

def hn_comments(q, n=6):
    url = "https://hn.algolia.com/api/v1/search?" + urllib.parse.urlencode({
        "query": q, "tags": "comment", "hitsPerPage": n})
    try:
        with urllib.request.urlopen(url, timeout=25) as r:
            d = json.load(r)
    except Exception as e:
        print("ERR", q, e); return
    print(f"\n#### COMMENT SEARCH: {q} (hits={d.get('nbHits')})")
    for h in d["hits"]:
        txt = re.sub("<[^>]+>", "", html.unescape(h.get("comment_text") or ""))
        txt = " ".join(txt.split())
        print(f"  [{h.get('created_at','')[:10]}] {txt[:300]}")
        print(f"     https://news.ycombinator.com/item?id={h.get('objectID')}")

for q in sys.argv[1:]:
    hn_comments(q); time.sleep(0.2)
