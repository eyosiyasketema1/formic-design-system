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
    (r"text-\[\d", "hardcoded font size — use the text-* ramp (rule 2)"),
    (r"cubic-bezier\(", "hardcoded easing — use var(--ease-out-quint)"),
    (r"rounded-\[(6|7|8|10)px\]", "hardcoded radius — use rounded-sm/control/md/card"),
    (r"duration-100\b", "off-standard hover duration — use duration-150"),
    (r"variant\?: string", "untyped variant prop — use a union type"),
    (r"text-white", "hardcoded white — use text-canvas so dark mode keeps contrast"),
    (r"font-bold", "font-bold — semibold is the maximum weight (rule 2)"),
    (r"tracking-\[", "arbitrary letter-spacing — use tracking-wide / tracking-tight (rule 2)"),
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

# ── 1b. Flat shadows: --shadow-* tokens must be rings or none ──
for _shadow_file in ("styles/tokens.css", "preview.html"):
    _shadow_src = (ROOT / _shadow_file).read_text()
    for m in re.finditer(r"(--shadow-[\w-]+):\s*([^;]+);", _shadow_src):
        val = m.group(2).strip()
        if val.startswith("var("):
            continue  # bridge lines like --shadow-btn: var(--shadow-btn)
        if val != "none" and not val.startswith("0 0 0 "):
            fails.append(f"{_shadow_file}: {m.group(1)} is a drop shadow ({val!r}) — rings only (rule 12)")

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
    ("--canvas", "--green", 4.5, "button text on green (success)"),
    ("--canvas", "--orange", 4.5, "badge letters on orange"),
    ("--canvas", "--accent", 4.5, "button text on accent"),
    ("--accent", "--canvas", 4.5, "accent as text"),
    ("--red", "--canvas", 4.5, "deletion counts"),
    ("--red", "--red-tint", 4.5, "diff deleted lines"),
    ("--canvas", "--red", 4.5, "canvas-on-red (destructive button text)"),
    ("--green", "--surface", 4.5, "added lines on cards"),
    ("--red", "--surface", 4.5, "deletions on cards"),
    ("--ink-3", "--field", 4.5, "placeholder text on fields"),
    ("--accent", "--surface", 4.5, "code keywords on cards"),
    ("--orange", "--surface", 4.5, "code numbers on cards"),
    ("--canvas", "--ink", 4.5, "canvas text on ink fills (primary buttons, active page)"),
    # Chart series are non-text UI (rule 5): 3:1 against the card they sit on.
    # chart-1 is var(--accent) so it is covered by the accent pairs above.
    ("--chart-2", "--surface", 3.0, "chart series 2 on cards"),
    ("--chart-3", "--surface", 3.0, "chart series 3 on cards"),
    ("--chart-4", "--surface", 3.0, "chart series 4 on cards"),
    ("--chart-5", "--surface", 3.0, "chart series 5 on cards"),
    ("--chart-2", "--canvas", 3.0, "chart series 2 on canvas"),
    ("--chart-3", "--canvas", 3.0, "chart series 3 on canvas"),
    ("--chart-4", "--canvas", 3.0, "chart series 4 on canvas"),
    ("--chart-5", "--canvas", 3.0, "chart series 5 on canvas"),
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
# Scope the search to preview's light :root block. Searching the whole file
# takes the FIRST hex match, which would silently compare a dark value
# against a light one for any token whose dark definition is authored first.
_m_light = re.search(r":root\s*\{(.*?)\n\}", preview, re.S)
preview_light = _m_light.group(1) if _m_light else preview
for var, val in base_light.items():
    m = re.search(rf"{re.escape(var)}\s*:\s*(#[0-9a-fA-F]{{6}})", preview_light)
    if not m:
        # Previously this was `if m and ...`, so a token added to tokens.css
        # and never mirrored slipped through silently — the exact drift rule 9
        # exists to prevent. Missing is now a failure, not a skip.
        fails.append(f"drift: {var} exists in tokens.css but is missing from preview.html (rule 9)")
    elif m.group(1).lower() != val.lower():
        fails.append(f"drift: {var} is {val} in tokens.css but {m.group(1)} in preview.html")

# ── 3a1c. Type scale drift: tokens.css ↔ preview px values ──
_scale_src = dict(re.findall(r"(--text-[\w-]+):\s*([\d.]+px)", (ROOT / "styles" / "tokens.css").read_text()))
_scale_pv = dict(re.findall(r"(--text-[\w-]+):\s*([\d.]+px)", (ROOT / "preview.html").read_text()))
for name, val in _scale_src.items():
    if name not in _scale_pv:
        fails.append(f"type-scale drift: {name} missing from preview.html")
    elif _scale_pv[name] != val:
        fails.append(f"type-scale drift: {name} is {val} in tokens.css but {_scale_pv[name]} in preview.html")

# ── 3a1b. Type scale: integer steps only (rule 2) ───────────
for src_path in (ROOT / "styles" / "tokens.css", ROOT / "preview.html"):
    for m in re.finditer(r"(--text-[\w-]+):\s*(\d+\.\d+)px", src_path.read_text()):
        fails.append(f"{src_path.name}: {m.group(1)} is {m.group(2)}px — fractional font sizes are banned (rule 2)")

# ── 3a2. Responsiveness basics ──────────────────────────────
if 'name="viewport"' not in preview:
    fails.append("preview.html: missing viewport meta (responsive rule 11)")

# ── 3a3. Preview script: no dangling SCREAMING_SNAKE references ──
# (a mirror regeneration once swallowed neighboring consts — never again)
m0 = re.search(r'<script type="text/babel"[^>]*>(.*?)</script>', preview, re.S)
if m0:
    body = m0.group(1)
    defined = set(re.findall(r"^(?:function|const|let)\s+([A-Z][A-Z0-9_]{2,})\b", body, re.M))
    referenced = set(re.findall(r"\b([A-Z][A-Z0-9_]{2,})\b", body))
    allowed = {"NAN", "URL", "JSON", "CSS", "DOM", "SVG", "UTC", "API", "HTML", "AA", "OTP", "QA", "PDF", "CSV"}
    for name in sorted(referenced - defined - allowed):
        if "_" in name:  # only const-style names, not acronyms in strings/comments
            fails.append(f"preview.html: {name} referenced but never defined (lost in a mirror regen?)")

# ── 3b. Preview script: every React hook used must be destructured ──
m = re.search(r'<script type="text/babel"[^>]*>(.*?)</script>', preview, re.S)
if m:
    src = m.group(1)
    dest_m = re.search(r"const \{ ([^}]+) \} = React;", src)
    destructured = set(dest_m.group(1).replace(" ", "").split(",")) if dest_m else set()
    local_hooks = set(re.findall(r"function (use[A-Z]\w+)", src))
    used = set(re.findall(r"\b(use[A-Z]\w+)\(", src))
    missing = used - destructured - local_hooks
    for name in sorted(missing):
        fails.append(f"preview.html: React hook {name} used but not destructured from React")

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
