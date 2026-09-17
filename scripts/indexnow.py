#!/usr/bin/env python3
"""Tell Bing (and through it ChatGPT search, Copilot, DuckDuckGo, Yandex) that
pages changed, so they re-crawl within hours instead of weeks. Run after a
deploy that changes content: python3 scripts/indexnow.py
The key file at the site root proves we own the domain."""
import json, urllib.request
KEY = "abb25a763d901eb0c3774df385cead71"
URLS = ["https://formicai.dev/", "https://formicai.dev/preview.html", "https://formicai.dev/customize", "https://formicai.dev/llms.txt"]
body = json.dumps({"host": "formicai.dev", "key": KEY, "keyLocation": f"https://formicai.dev/{KEY}.txt", "urlList": URLS}).encode()
req = urllib.request.Request("https://api.indexnow.org/IndexNow", data=body, headers={"Content-Type": "application/json; charset=utf-8"})
with urllib.request.urlopen(req, timeout=30) as r:
    print("IndexNow", r.status, "submitted", len(URLS), "urls")
