#!/usr/bin/env python3
"""Verify every external <script> on the public pages carries a correct SRI hash.

A wrong or stale integrity hash is a silent, total failure: the browser refuses
the script and the page renders blank, while the HTML still reads correctly in
review. This re-downloads each pinned URL and checks the digest for real.

Run: python3 scripts/check_sri.py
Exit code 0 = pass. Network failures are reported as skips, not failures, so a
CDN outage cannot block a merge.
"""
import base64
import hashlib
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAGES = ["index.html", "preview.html"]

SCRIPT = re.compile(r"<script\b[^>]*\bsrc=\"(https://[^\"]+)\"[^>]*>", re.I)
INTEGRITY = re.compile(r"\bintegrity=\"([a-z0-9]+)-([A-Za-z0-9+/=]+)\"", re.I)
CROSSORIGIN = re.compile(r"\bcrossorigin=", re.I)

fails, checked, skipped = [], 0, 0


def digest(data: bytes, algo: str) -> str:
    return base64.b64encode(hashlib.new(algo, data).digest()).decode()


for page in PAGES:
    path = ROOT / page
    if not path.exists():
        continue
    html = path.read_text(encoding="utf-8")

    for tag in SCRIPT.finditer(html):
        url = tag.group(1)
        raw = tag.group(0)

        m = INTEGRITY.search(raw)
        if not m:
            fails.append(f"{page}: no integrity on {url}")
            continue
        if not CROSSORIGIN.search(raw):
            # Without crossorigin the fetch is opaque and SRI cannot be checked.
            fails.append(f"{page}: integrity without crossorigin on {url}")
            continue

        algo, expected = m.group(1).lower(), m.group(2)
        if algo not in ("sha256", "sha384", "sha512"):
            fails.append(f"{page}: unsupported hash algorithm {algo!r} on {url}")
            continue

        # A floating version can change under a fixed hash at any time.
        if re.search(r"@\d+$", url):
            fails.append(f"{page}: {url} is a floating version, pin it to an exact release")
            continue

        try:
            with urllib.request.urlopen(url, timeout=30) as resp:
                body = resp.read()
        except (urllib.error.URLError, TimeoutError, OSError) as exc:
            print(f"  skip  {url}\n        could not fetch ({exc})")
            skipped += 1
            continue

        actual = digest(body, algo)
        checked += 1
        if actual != expected:
            fails.append(
                f"{page}: {algo} mismatch for {url}\n"
                f"          in page: {algo}-{expected}\n"
                f"          served:  {algo}-{actual}"
            )
        else:
            print(f"  ok    {algo}  {url}")

if fails:
    print("\nSRI CHECK FAILED\n")
    for f in fails:
        print(f"  - {f}")
    sys.exit(1)

print(f"\nSRI OK — {checked} script(s) verified" + (f", {skipped} skipped (network)" if skipped else ""))
