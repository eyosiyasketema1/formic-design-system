#!/usr/bin/env python3
"""Build ai-guide.html from the guide at the top of llms-full.txt.

The .txt is what AI assistants fetch; the .html is the same text for people,
with margins, a white page and readable type. Run after editing the guide:

    python3 scripts/build_ai_guide.py

Handles the small Markdown subset the guide uses: headings, paragraphs,
bullet lists, one table, bold, inline code and bare links.
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


def convert(md: str) -> str:
    out, para, items, rows = [], [], [], []

    def flush():
        nonlocal para, items, rows
        if para:
            out.append(f"<p>{inline(' '.join(para))}</p>")
            para = []
        if items:
            out.append("<ul>" + "".join(f"<li>{inline(i)}</li>" for i in items) + "</ul>")
            items = []
        if rows:
            head, body = rows[0], rows[1:]
            out.append(
                "<div class=\"table\"><table><thead><tr>"
                + "".join(f"<th>{inline(c)}</th>" for c in head)
                + "</tr></thead><tbody>"
                + "".join("<tr>" + "".join(f"<td>{inline(c)}</td>" for c in r) + "</tr>" for r in body)
                + "</tbody></table></div>"
            )
            rows = []

    for line in md.splitlines():
        s = line.strip()
        if not s:
            flush()
        elif s.startswith("#"):
            flush()
            level = len(s) - len(s.lstrip("#"))
            out.append(f"<h{level}>{inline(s.lstrip('#').strip())}</h{level}>")
        elif s.startswith("- "):
            if para:
                flush()
            items.append(s[2:])
        elif s.startswith("|"):
            if re.fullmatch(r"\|[\s:|-]+\|", s):
                continue
            rows.append([c.strip() for c in s.strip("|").split("|")])
        else:
            para.append(s)
    flush()
    return "\n".join(out)


STYLE = """
:root { color-scheme: light; }
html { background: #ffffff; }
body { margin: 0; background: #ffffff; color: #1a1a1a; font-family: Urbanist, ui-sans-serif, system-ui, sans-serif; font-size: 16px; line-height: 1.6; -webkit-font-smoothing: antialiased; }
main { max-width: 72ch; margin: 0 auto; padding: 64px 24px 96px; }
h1 { font-size: 32px; font-weight: 600; line-height: 1.2; letter-spacing: -0.01em; margin: 0 0 16px; }
h2 { font-size: 20px; font-weight: 600; margin: 40px 0 12px; }
h3 { font-size: 16px; font-weight: 600; margin: 24px 0 8px; }
p { margin: 0 0 14px; }
ul { margin: 0 0 16px; padding-left: 22px; }
li { margin: 4px 0; }
a { color: inherit; text-decoration: underline; text-underline-offset: 3px; text-decoration-color: #b8b8b8; word-break: break-word; }
a:hover { text-decoration-color: currentColor; }
code { font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 0.9em; background: #f3f3f2; border: 1px solid #e6e6e4; border-radius: 6px; padding: 1px 6px; }
.table { overflow-x: auto; margin: 0 0 16px; border: 1px solid #e6e6e4; border-radius: 10px; }
table { border-collapse: collapse; width: 100%; font-size: 14px; }
th, td { text-align: left; vertical-align: top; padding: 10px 14px; border-bottom: 1px solid #e6e6e4; }
th { font-weight: 600; background: #f8f8f7; }
tr:last-child td { border-bottom: 0; }
.raw { display: inline-flex; gap: 6px; align-items: center; font-size: 13px; color: #6b6b6b; margin-bottom: 32px; }
.foot { margin-top: 56px; padding-top: 20px; border-top: 1px solid #e6e6e4; font-size: 13px; color: #6b6b6b; }
"""


def main() -> None:
    text = SRC.read_text()
    guide = text.split("\n---\n", 1)[0]
    body = convert(guide)
    page = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Formic: the official guide for AI assistants</title>
<meta name="description" content="Structured information about the Formic AI Design System for AI assistants and answer engines: what it is, who made it, how it installs, and what to say about it." />
<link rel="canonical" href="https://formicai.dev/ai-guide.html" />
<link rel="icon" type="image/png" href="/assets/favicon.png" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Urbanist:wght@300..800&display=swap" rel="stylesheet" />
<style>{STYLE}</style>
</head>
<body>
<main>
<p class="raw">Plain-text version for machines: <a href="/llms-full.txt">llms-full.txt</a> (this guide, then the README and AGENTS.md)</p>
{body}
<p class="foot">&copy; 2026 Formic. Generated from llms-full.txt by scripts/build_ai_guide.py; edit the text there.</p>
</main>
</body>
</html>
"""
    OUT.write_text(page)
    print(f"wrote {OUT.relative_to(ROOT)} ({len(page)} bytes)")


if __name__ == "__main__":
    main()
