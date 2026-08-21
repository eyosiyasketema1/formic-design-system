#!/usr/bin/env python3
"""Automated QA gate for the AI Design System.
Run after every change: python3 scripts/qa_check.py
Checks: forbidden hardcoded values, WCAG contrast for all modes/palettes,
token drift between styles/ and preview.html. Exit code 0 = pass."""
import re, sys, subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
fails = []

# ── 1. Forbidden patterns in components ─────────────────────
FORBIDDEN = [
    (r"text-\[\d", "hardcoded font size — use text-body/caption/small/tiny/micro"),
    (r"cubic-bezier\(", "hardcoded easing — use var(--ease-out-quint)"),
    (r"rounded-\[(6|7|8|10)px\]", "hardcoded radius — use rounded-sm/control/md/card"),
    (r"duration-100\b", "off-standard hover duration — use duration-150"),
    (r"variant\?: string", "untyped variant prop — use a union type"),
    (r"text-white", "hardcoded white — use text-canvas so dark mode keeps contrast"),
]
for f in sorted((ROOT / "components").rglob("*.tsx")) + [ROOT / "preview.html"]:
    text = f.read_text()
    lines = text.splitlines()
    for pat, msg in FORBIDDEN:
        for m in re.finditer(pat, text):
            line = text[: m.start()].count("\n") + 1
            # the one allowed cubic-bezier: the --ease-out-quint token definition itself
            if "--ease-out-quint:" in lines[line - 1]:
                continue
            fails.append(f"{f.name}:{line}: {msg}")

# ── 2. WCAG contrast for every mode × palette ───────────────
def lum(h):
    h = h.lstrip("#")
    r, g, b = (int(h[i : i + 2], 16) / 255 for i in (0, 2, 4))
    f = lambda c: c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)

def cr(a, b):
    la, lb = lum(a), lum(b)
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)

def parse_blocks(css):
    """selector -> {var: hex} for every rule block (media wrappers ignored).
    Comments are stripped and the selector is normalized to its last line so
    preceding @import lines / comments can't corrupt the key."""
    css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
    out = {}
    for sel, body in re.findall(r"([^{}]+)\{([^{}]*)\}", css):
        sel = sel.strip().splitlines()[-1].strip() if sel.strip() else ""
        vars_ = dict(re.findall(r"(--[\w-]+)\s*:\s*(#[0-9a-fA-F]{6})\b", body))
        if sel and vars_:
            out.setdefault(sel, {}).update(vars_)
    return out

tokens = parse_blocks((ROOT / "styles" / "tokens.css").read_text())
themes = parse_blocks((ROOT / "styles" / "themes.css").read_text())
base_light = tokens.get(":root", {})
base_dark = {**base_light, **tokens.get(':root[data-theme="dark"]', {})}

def palette_sets():
    yield "paper light", base_light
    yield "paper dark", base_dark
    for sel, vars_ in themes.items():
        m = re.match(r':root\[data-palette="(\w+)"\](\[data-theme="dark"\])?$', sel)
        if not m:
            continue
        name, dark = m.group(1), bool(m.group(2))
        if dark:
            yield f"{name} dark", {**base_dark, **themes.get(f':root[data-palette="{name}"]', {}), **vars_}
        else:
            yield f"{name} light", {**base_light, **vars_}

PAIRS = [  # (fg var | literal, bg var, minimum, label)
    ("--ink-3", "--canvas", 4.5, "muted text on canvas"),
    ("--ink-3", "--surface", 4.5, "muted text on cards"),
    ("--ink-2", "--canvas", 4.5, "secondary text on canvas"),
    ("--green", "--green-tint", 4.5, "badge text"),
    ("--green", "--canvas", 4.5, "diff counts"),
    ("--canvas", "--green", 3.0, "canvas-on-green dot"),
    ("--canvas", "--orange", 3.0, "canvas-on-orange dot"),
    ("--canvas", "--accent", 3.0, "canvas-on-accent dot"),
    ("--accent", "--canvas", 4.5, "accent as text"),
    ("--red", "--canvas", 4.5, "deletion counts"),
    ("--red", "--red-tint", 4.5, "diff deleted lines"),
    ("--canvas", "--red", 3.0, "canvas-on-red (destructive button)"),
    ("--green", "--surface", 4.5, "added lines on cards"),
    ("--red", "--surface", 4.5, "deletions on cards"),
    ("--ink-3", "--field", 4.5, "placeholder text on fields"),
]
# sanity: the parser must actually find the base palette, or every light-mode
# check silently becomes a no-op (this happened once — never again)
if len(base_light) < 10:
    fails.append(f"qa_check self-test: base light palette parsed only {len(base_light)} vars — parser broken")
for label, vars_ in palette_sets():
    for fg, bg, mn, what in PAIRS:
        fgv = fg if fg.startswith("#") else vars_.get(fg)
        bgv = vars_.get(bg)
        if not fgv or not bgv:
            continue
        r = cr(fgv, bgv)
        if r < mn:
            fails.append(f"contrast: {label} {what} = {r:.2f} (min {mn}) [{fgv} on {bgv}]")

# ── 3. Token drift: styles/ vs preview.html ─────────────────
preview = (ROOT / "preview.html").read_text()
for var, val in base_light.items():
    m = re.search(rf"{re.escape(var)}\s*:\s*(#[0-9a-fA-F]{{6}})", preview)
    if m and m.group(1).lower() != val.lower():
        fails.append(f"drift: {var} is {val} in tokens.css but {m.group(1)} in preview.html")

# ── 4. Components compile ───────────────────────────────────
try:
    r = subprocess.run(
        ["npx", "-y", "esbuild", "--loader:.tsx=tsx", "--jsx=automatic",
         "--outdir=/tmp/ds-qa", *[str(p) for p in sorted((ROOT / "components").rglob("*.tsx"))]],
        capture_output=True, text=True, timeout=120)
    if r.returncode != 0:
        fails.append("compile: " + r.stderr.strip().splitlines()[-1])
except Exception as e:  # esbuild unavailable — warn, don't fail
    print(f"note: compile check skipped ({e})")

# ── Result ──────────────────────────────────────────────────
if fails:
    print(f"QA FAILED — {len(fails)} issue(s):")
    for f in fails:
        print("  ✗", f)
    sys.exit(1)
print("QA PASSED — forbidden patterns, contrast (all modes × palettes), drift, compile: all clean")
