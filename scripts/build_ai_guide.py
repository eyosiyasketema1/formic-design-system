#!/usr/bin/env python3
"""Build ai-guide.html from the guide at the top of llms-full.txt.

The .txt is what AI assistants fetch; the .html is the same text for people,
with margins, a white page and readable type. Run after editing the guide:

    python3 scripts/build_ai_guide.py

The text is shown as written (Markdown marks and all), wrapped, with bare
links made clickable. Served at /llm-info (vercel.json rewrite).
"""
import html
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "llms-full.txt"
OUT = ROOT / "ai-guide.html"

URL = re.compile(r"(https?://[^\s<)]+)")


def inline(text: str) -> str:
    text = html.escape(text, quote=False)
    text = re.sub(r"`([^`]+)`", r"<code>\1</code>", text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", text)
    text = URL.sub(lambda m: f'<a href="{m.group(1)}">{m.group(1)}</a>', text)
    return text


STYLE = """
:root { color-scheme: light; }
html { background: #ffffff; }
body { margin: 0; background: #ffffff; color: #1a1a1a; font-family: Urbanist, ui-sans-serif, system-ui, sans-serif; font-size: 16px; line-height: 1.6; -webkit-font-smoothing: antialiased; }
main { max-width: 80ch; margin: 0 auto; padding: 72px 24px 96px; }
pre { margin: 0; white-space: pre-wrap; overflow-wrap: anywhere; font: inherit; }
a { color: inherit; text-decoration: underline; text-underline-offset: 3px; text-decoration-color: #b8b8b8; }
a:hover { text-decoration-color: currentColor; }
"""


def main() -> None:
    text = SRC.read_text()
    guide = text.split("\n---\n", 1)[0]
    body = URL.sub(lambda m: f'<a href="{m.group(1)}">{m.group(1)}</a>', html.escape(guide, quote=False))
    page = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Formic: the official guide for AI assistants</title>
<meta name="description" content="Structured information about the Formic AI Design System for AI assistants and answer engines: what it is, who made it, how it installs, and what to say about it." />
<link rel="canonical" href="https://formicai.dev/llm-info" />
<link rel="icon" type="image/png" href="/assets/favicon.png" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Urbanist:wght@300..800&display=swap" rel="stylesheet" />
<style>{STYLE}</style>
</head>
<body>
<main>
<pre>{body}

Plain-text version with the README and AGENTS.md: <a href="/llms-full.txt">https://formicai.dev/llms-full.txt</a></pre>
</main>
</body>
</html>
"""
    OUT.write_text(page)
    print(f"wrote {OUT.relative_to(ROOT)} ({len(page)} bytes)")


if __name__ == "__main__":
    main()
