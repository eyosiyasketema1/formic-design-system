#!/usr/bin/env python3
"""Send one email to everyone on the Formic Pro waitlist.

Reads the list from the Upstash store the waitlist function writes to, skips
anyone who unsubscribed, and sends through Resend with a one-click
unsubscribe link in every message. Nothing is sent without --send.

  python3 scripts/announce.py --list                       # who is on the list
  python3 scripts/announce.py mail.md                      # dry run: shows the email and the count
  python3 scripts/announce.py mail.md --test you@x.com     # sends only to you, to check it
  python3 scripts/announce.py mail.md --send               # sends to the list

The email file: first line is the subject, the rest is the body in plain
text. {unsubscribe} in the body is replaced with the reader's own link;
if it is missing the link is appended at the end.

Secrets come from .env.local in the repo root (never committed):
  KV_REST_API_URL=...      KV_REST_API_TOKEN=...     (Vercel → Storage → Upstash)
  RESEND_API_KEY=...                                  (resend.com → API Keys)
  ANNOUNCE_FROM="Formic <hello@formicai.dev>"        (a verified domain in Resend)
  ANNOUNCE_REPLY_TO=you@gmail.com                     (where replies land)
  WAITLIST_SECRET=...                                 (any long random string; same value in Vercel)
`vercel env pull .env.local` fills the first three if the Vercel CLI is installed.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = "https://formicai.dev"


def load_env() -> None:
    env = ROOT / ".env.local"
    if not env.exists():
        return
    for line in env.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


def kv(*parts: str):
    url, token = os.environ.get("KV_REST_API_URL"), os.environ.get("KV_REST_API_TOKEN")
    if not url or not token:
        sys.exit("announce: KV_REST_API_URL and KV_REST_API_TOKEN are not set (see the docstring)")
    req = urllib.request.Request(url, data=json.dumps(list(parts)).encode(), headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)["result"]


def unsubscribe_link(email: str) -> str:
    secret = os.environ.get("WAITLIST_SECRET") or os.environ.get("RESEND_API_KEY") or ""
    token = hashlib.sha256((secret + email).encode()).hexdigest()[:16]
    return f"{SITE}/api/unsubscribe?e={urllib.request.quote(email)}&t={token}"


def send(to: str, subject: str, body: str) -> None:
    key = os.environ.get("RESEND_API_KEY")
    if not key:
        sys.exit("announce: RESEND_API_KEY is not set")
    sender = os.environ.get("ANNOUNCE_FROM", "Formic <hello@formicai.dev>")
    link = unsubscribe_link(to)
    text = body.replace("{unsubscribe}", link) if "{unsubscribe}" in body else body.rstrip() + f"\n\n--\nYou asked to hear about Formic Pro at formicai.dev. Unsubscribe: {link}\n"
    payload = {"from": sender, "to": [to], "subject": subject, "text": text, "headers": {"List-Unsubscribe": f"<{link}>"}}
    if os.environ.get("ANNOUNCE_REPLY_TO"):
        payload["reply_to"] = os.environ["ANNOUNCE_REPLY_TO"]  # replies reach a real inbox, not hello@
    req = urllib.request.Request("https://api.resend.com/emails", data=json.dumps(payload).encode(), headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        if r.status >= 300:
            raise RuntimeError(f"resend {r.status}")


def recipients() -> list[str]:
    everyone = set(kv("SMEMBERS", "waitlist:pro") or [])
    gone = set(kv("SMEMBERS", "waitlist:unsub") or [])
    return sorted(everyone - gone)


def main() -> int:
    load_env()
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("mail", nargs="?", help="text file: subject on the first line, then the body")
    ap.add_argument("--list", action="store_true", help="print the list and exit")
    ap.add_argument("--test", metavar="EMAIL", help="send only to this address")
    ap.add_argument("--send", action="store_true", help="really send to the whole list")
    args = ap.parse_args()

    if args.list:
        who = recipients()
        joined = kv("HGETALL", "waitlist:pro:meta") or []
        when = dict(zip(joined[::2], joined[1::2]))
        for e in who:
            print(f"{when.get(e, '')[:10]:12} {e}")
        print(f"{len(who)} on the list")
        return 0
    if not args.mail:
        ap.print_help()
        return 1
    lines = Path(args.mail).read_text(encoding="utf-8").splitlines()
    subject, body = lines[0].strip(), "\n".join(lines[1:]).strip() + "\n"
    if not subject or not body.strip():
        sys.exit("announce: the file needs a subject on line 1 and a body below it")

    if args.test:
        send(args.test, subject, body)
        print(f"sent a test to {args.test}")
        return 0
    who = recipients()
    print(f"Subject: {subject}\n\n{body}\n---\n{len(who)} recipient(s)")
    if not args.send:
        print("dry run; add --send to send, or --test you@x.com to try it on yourself first")
        return 0
    sent = 0
    for e in who:
        try:
            send(e, subject, body)
            sent += 1
            time.sleep(0.6)  # Resend's free tier allows two sends a second
        except Exception as exc:  # keep going; report at the end
            print(f"  failed {e}: {exc}")
    print(f"sent {sent} of {len(who)}")
    return 0 if sent == len(who) else 1


if __name__ == "__main__":
    sys.exit(main())
