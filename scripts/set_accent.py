#!/usr/bin/env python3
"""
Set the brand accent — correctly, for both modes.

    python3 scripts/set_accent.py "#29E0C2"            # inside the Formic repo
    python3 src/formic/scripts/set_accent.py "#29E0C2" # inside an app that vendors Formic

Give it any colour. It reads the colour's hue and saturation and derives
the two variants the system needs:

  light mode  — darkened until it holds WCAG AA (4.5:1) on white AND on
                its own 10% tint (the harder test: accent-soft buttons,
                lead tiles) — so a bright brand teal becomes a deep teal
                for light backgrounds, same hue
  dark mode   — lightened until it holds 4.5:1 on the dark surface

Then it rewrites `--accent` in the light `:root` block and the
`[data-theme="dark"]` block of tokens.css (and, inside the repo, the
mirrored copies in preview.html and index.html), and the accent-tint and
chart-1 follow automatically because they are derived from --accent.

This is the same algorithm as `deriveAccentVariants` in
components/theme.ts, so a runtime `setAccent()` and a static token edit
agree to the pixel. Never edit --accent by hand: one hex for both modes
is wrong for at least one of them.
"""
import re
import sys
from pathlib import Path

MIN_CONTRAST = 4.5
LIGHT_ANCHOR = "#ffffff"      # brightest light surface
TINT_SURFACE_ANCHOR = "#fbfdfd"  # darkest light surface: the tint is fitted against this
DARK_ANCHOR = "#262626"       # darkest dark surface


def hex_to_rgb(h):
    h = h.strip().lstrip("#")
    if not re.fullmatch(r"[0-9a-fA-F]{6}", h):
        raise SystemExit(f"not a 6-digit hex colour: {h!r}")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def to_hex(rgb):
    return "#%02x%02x%02x" % tuple(max(0, min(255, round(c))) for c in rgb)


def lum(rgb):
    def f(c):
        c /= 255
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = rgb
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)


def contrast(a, b):
    la, lb = lum(a), lum(b)
    return (max(la, lb) + 0.05) / (min(la, lb) + 0.05)


def rgb_to_hsl(rgb):
    rn, gn, bn = (c / 255 for c in rgb)
    mx, mn = max(rn, gn, bn), min(rn, gn, bn)
    l = (mx + mn) / 2
    if mx == mn:
        return 0.0, 0.0, l
    d = mx - mn
    s = d / (2 - mx - mn) if l > 0.5 else d / (mx + mn)
    if mx == rn:
        h = ((gn - bn) / d + (6 if gn < bn else 0)) / 6
    elif mx == gn:
        h = ((bn - rn) / d + 2) / 6
    else:
        h = ((rn - gn) / d + 4) / 6
    return h, s, l


def hsl_to_rgb(h, s, l):
    if s == 0:
        return (l * 255, l * 255, l * 255)

    def hue(p, q, t):
        if t < 0:
            t += 1
        if t > 1:
            t -= 1
        if t < 1 / 6:
            return p + (q - p) * 6 * t
        if t < 1 / 2:
            return q
        if t < 2 / 3:
            return p + (q - p) * (2 / 3 - t) * 6
        return p
    q = l * (1 + s) if l < 0.5 else l + s - l * s
    p = 2 * l - q
    return (hue(p, q, h + 1 / 3) * 255, hue(p, q, h) * 255, hue(p, q, h - 1 / 3) * 255)


def mix(a, b, w):
    return tuple(round(a[i] * w + b[i] * (1 - w)) for i in range(3))


def fit(rgb, anchor, direction):
    """walk lightness toward `direction` until the anchor contrast passes —
    measured on the rounded channels, since rounding is what ships"""
    h, s, l = rgb_to_hsl(rgb)
    rounded = rgb
    for step in range(0, 101):
        cand = hsl_to_rgb(h, s, min(1, max(0, l + direction * step * 0.01)))
        rounded = tuple(round(c) for c in cand)
        target = mix(rounded, hex_to_rgb(TINT_SURFACE_ANCHOR), 0.1) if direction < 0 else anchor
        if contrast(rounded, target) >= MIN_CONTRAST:
            return rounded
    return rounded


def derive(color):
    rgb = hex_to_rgb(color)
    return {
        "light": to_hex(fit(rgb, hex_to_rgb(LIGHT_ANCHOR), -1)),
        "dark": to_hex(fit(rgb, hex_to_rgb(DARK_ANCHOR), +1)),
    }


ACCENT_LINE = re.compile(r"(--accent:\s*)#[0-9a-fA-F]{6};[ \t]*(?:/\*[^\n]*?\*/)?([^\n]*)")


def rewrite(path, light, dark):
    """replace --accent in the light :root block and the dark block"""
    src = path.read_text()
    blocks = list(re.finditer(r"(:root(?:\[data-theme=\"dark\"\])?)\s*\{", src))
    out, n = src, 0
    # walk blocks from the end so offsets stay valid
    for m in reversed(blocks):
        sel = m.group(1)
        start = m.end()
        end = src.index("\n}", start)
        body = src[start:end]
        is_dark = "dark" in sel
        value = dark if is_dark else light
        note = (f"/* brand accent, dark mode — fitted to AA on dark surfaces by scripts/set_accent.py */" if is_dark
                else f"/* brand accent, light mode — fitted to AA on white and its 10% tint by scripts/set_accent.py */")
        new_body, k = ACCENT_LINE.subn(lambda mm: f"{mm.group(1)}{value}; {note}{mm.group(2)}", body, count=1)
        if k:
            out = out[:start] + new_body + out[end:]
            n += k
    if n:
        path.write_text(out)
    return n


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    color = sys.argv[1]
    v = derive(color)
    here = Path(__file__).resolve().parent
    root = here.parent
    tokens = root / "styles" / "tokens.css"
    if not tokens.exists():
        raise SystemExit(f"tokens.css not found next to this script ({tokens}); run it from the Formic folder")
    touched = []
    for p in (tokens, root / "preview.html", root / "index.html"):
        if p.exists() and rewrite(p, v["light"], v["dark"]):
            touched.append(p.name)
    white, dark = hex_to_rgb(LIGHT_ANCHOR), hex_to_rgb(DARK_ANCHOR)
    lr, dr = hex_to_rgb(v["light"]), hex_to_rgb(v["dark"])
    tint = mix(lr, hex_to_rgb(TINT_SURFACE_ANCHOR), 0.1)
    print(f"accent from {color}")
    print(f"  light mode  {v['light']}   {contrast(lr, white):.2f}:1 on white, {contrast(lr, tint):.2f}:1 on its tint")
    print(f"  dark mode   {v['dark']}   {contrast(dr, dark):.2f}:1 on dark")
    print(f"  written to  {', '.join(touched) or 'nothing (no --accent lines found)'}")
    gate = root / "scripts" / "qa_check.py"
    if gate.exists():
        print("  run python3 scripts/qa_check.py to confirm the gate is green")


if __name__ == "__main__":
    main()
