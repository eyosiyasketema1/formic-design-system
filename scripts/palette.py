#!/usr/bin/env python3
"""
Derive a whole palette — the neutral family plus its accent — from one colour.

    python3 scripts/palette.py "#7c3aed"            # print the two CSS blocks
    python3 scripts/palette.py "#7c3aed" --name plum # named blocks

A palette in Formic is the paper neutrals tinted toward one hue: every
surface, line and ink keeps paper's lightness (so every contrast pair the
gate checks keeps its margin) and takes a little chroma in the chosen hue,
more in the mid tones where it reads, almost none on white. The accent is
the colour itself, fitted for light and dark by set_accent.derive.

The built-in palettes in styles/themes.css beyond the original four were
generated here; the customizer's "Custom" palette runs the same algorithm
in JavaScript (derivePalette in preview.html and components/theme.ts).
Keep the three in step.
"""
import sys
from pathlib import Path

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
import set_accent  # noqa: E402

# paper's neutrals, the lightness the palette keeps
PAPER = {
    "light": {
        "ink": "#1a1a1a", "ink-2": "#5c5c5c", "ink-3": "#6f6f6f",
        "line": "#e5e5e5", "line-strong": "#cfcfcf",
        "hover": "#f2f2f2", "hover-2": "#ececec", "inset": "#e9e9e9",
        "canvas": "#f7f7f7", "surface": "#fdfdfd", "field": "#f5f5f5",
    },
    "dark": {
        "ink": "#f0efec", "ink-2": "#b0aeaa", "ink-3": "#8d8b86",
        "line": "#2a2a29", "line-strong": "#3f3e3c",
        "hover": "#232322", "hover-2": "#292928", "inset": "#232322",
        "canvas": "#131312", "surface": "#1c1c1b", "field": "#232322",
    },
}
# chroma per token: mid tones carry the hue, near-white and near-black barely
CHROMA = {
    "ink": 0.012, "ink-2": 0.016, "ink-3": 0.016,
    "line": 0.010, "line-strong": 0.014,
    "hover": 0.008, "hover-2": 0.010, "inset": 0.010,
    "canvas": 0.006, "surface": 0.003, "field": 0.008,
}
ORDER = ["ink", "ink-2", "ink-3", "line", "line-strong", "hover", "hover-2", "inset", "canvas", "surface", "field"]


# ── sRGB <-> OKLCH ─────────────────────────────────────────
def _lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def _gam(c):
    c = max(0.0, min(1.0, c))
    return 12.92 * c if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055


def hex_to_oklch(h):
    r, g, b = (_lin(v / 255) for v in set_accent.hex_to_rgb(h))
    l_ = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
    m_ = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
    s_ = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b
    l_, m_, s_ = l_ ** (1 / 3), m_ ** (1 / 3), s_ ** (1 / 3)
    L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_
    a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_
    b2 = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_
    import math
    return L, math.hypot(a, b2), math.degrees(math.atan2(b2, a)) % 360


def oklch_to_hex(L, C, H):
    import math
    a, b2 = C * math.cos(math.radians(H)), C * math.sin(math.radians(H))
    l_ = (L + 0.3963377774 * a + 0.2158037573 * b2) ** 3
    m_ = (L - 0.1055613458 * a - 0.0638541728 * b2) ** 3
    s_ = (L - 0.0894841775 * a - 1.2914855480 * b2) ** 3
    r = 4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_
    g = -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_
    b = -0.0041960863 * l_ - 0.7034186147 * m_ + 1.7076147010 * s_
    return set_accent.to_hex(tuple(round(_gam(v) * 255) for v in (r, g, b)))


def derive_palette(color):
    """{'light': {token: hex}, 'dark': {token: hex}} including 'accent'"""
    _, _, hue = hex_to_oklch(color)
    out = {}
    for mode in ("light", "dark"):
        tokens = {}
        for name in ORDER:
            L, _, _ = hex_to_oklch(PAPER[mode][name])
            tokens[name] = oklch_to_hex(L, CHROMA[name], hue)
        tokens["accent"] = fit_accent(set_accent.derive(color)[mode], tokens["surface"], -1 if mode == "light" else +1)
        out[mode] = tokens
    return out


def fit_accent(accent, surface, direction):
    """set_accent fits against paper's surfaces; a tinted surface can sit a
    hair off, so walk lightness until the accent passes 4.5:1 on this
    palette's surface and on the 10% tint it makes over it"""
    rgb = set_accent.hex_to_rgb(accent)
    surf = set_accent.hex_to_rgb(surface)
    h, sat, l = set_accent.rgb_to_hsl(rgb)
    for step in range(0, 101):
        cand = tuple(round(c) for c in set_accent.hsl_to_rgb(h, sat, min(1, max(0, l + direction * step * 0.01))))
        tint = set_accent.mix(cand, surf, 0.1)
        if set_accent.contrast(cand, surf) >= set_accent.MIN_CONTRAST and set_accent.contrast(cand, tint) >= set_accent.MIN_CONTRAST:
            return set_accent.to_hex(cand)
    return accent


def css_blocks(name, pal):
    def block(sel, t):
        return (f"{sel} {{\n  --ink: {t['ink']}; --ink-2: {t['ink-2']}; --ink-3: {t['ink-3']};\n"
                f"  --line: {t['line']}; --line-strong: {t['line-strong']};\n"
                f"  --hover: {t['hover']}; --hover-2: {t['hover-2']}; --inset: {t['inset']};\n"
                f"  --canvas: {t['canvas']}; --surface: {t['surface']}; --field: {t['field']};\n"
                f"  --accent: {t['accent']};\n}}\n")
    return block(f':root[data-palette="{name}"]', pal["light"]), block(f':root[data-palette="{name}"][data-theme="dark"]', pal["dark"])


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    name = sys.argv[sys.argv.index("--name") + 1] if "--name" in sys.argv else "custom"
    if not args:
        raise SystemExit(__doc__)
    light, dark = css_blocks(name, derive_palette(args[0]))
    print(light + dark, end="")
