/* ─────────────────────────────────────────────────────────
 * THEME UTILITIES — runtime accent override
 *
 *   setAccent("#e11d48")  re-accents the entire system at
 *                         runtime: a light and a dark variant
 *                         are derived from the picked color so
 *                         both modes keep WCAG AA, then applied
 *                         through an injected style override
 *                         (same structure as tokens.css, wins
 *                         over palettes). --accent-tint follows
 *                         automatically via color-mix.
 *   setAccent(null)       removes the override (back to the
 *                         active palette).
 *   deriveAccentVariants  the fitting step, exposed for build
 *                         pipelines that want static values.
 * ───────────────────────────────────────────────────────── */
const OVERRIDE_ID = "ds-accent-override";
/* contrast anchors — the brightest light surface and the brightest
 * dark surface any palette uses. Fitting against the worst case
 * guarantees AA on every palette's canvas/surface AND for
 * canvas-colored text sitting on the accent (contrast is symmetric).
 * These are anchors for math, not rendered colors. */
const LIGHT_ANCHOR = "#ffffff";
const DARK_ANCHOR = "#262626";
const MIN_CONTRAST = 4.5;
type Rgb = { r: number; g: number; b: number };
function hexToRgb(hex: string): Rgb | null {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const value = parseInt(match[1], 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}
const toHex = ({ r, g, b }: Rgb) =>
  `#${[r, g, b].map((channel) => Math.round(channel).toString(16).padStart(2, "0")).join("")}`;
function luminance({ r, g, b }: Rgb) {
  const channel = (value: number) => {
    const scaled = value / 255;
    return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}
function contrast(a: Rgb, b: Rgb) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
function rgbToHsl({ r, g, b }: Rgb): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h =
    max === rn
      ? ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6
      : max === gn
        ? ((bn - rn) / d + 2) / 6
        : ((rn - gn) / d + 4) / 6;
  return { h, s, l };
}
function hslToRgb({ h, s, l }: { h: number; s: number; l: number }): Rgb {
  if (s === 0) return { r: l * 255, g: l * 255, b: l * 255 };
  const hue = (p: number, q: number, t: number) => {
    let tn = t;
    if (tn < 0) tn += 1;
    if (tn > 1) tn -= 1;
    if (tn < 1 / 6) return p + (q - p) * 6 * tn;
    if (tn < 1 / 2) return q;
    if (tn < 2 / 3) return p + (q - p) * (2 / 3 - tn) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: hue(p, q, h + 1 / 3) * 255,
    g: hue(p, q, h) * 255,
    b: hue(p, q, h - 1 / 3) * 255,
  };
}
/* walk lightness toward `direction` until the anchor contrast passes —
 * measured on the ROUNDED channels, since rounding is what ships */
function fitContrast(color: Rgb, anchor: Rgb, direction: -1 | 1): Rgb {
  const hsl = rgbToHsl(color);
  let rounded = color;
  for (let step = 0; step <= 100; step += 1) {
    const candidate = hslToRgb({
      ...hsl,
      l: Math.min(1, Math.max(0, hsl.l + direction * step * 0.01)),
    });
    rounded = {
      r: Math.round(candidate.r),
      g: Math.round(candidate.g),
      b: Math.round(candidate.b),
    };
    if (contrast(rounded, anchor) >= MIN_CONTRAST) return rounded;
  }
  return rounded; /* extreme lightness — as close as the hue allows */
}
/** Derive AA-passing light-mode and dark-mode accents from one color. */
export function deriveAccentVariants(color: string): { light: string; dark: string } | null {
  const rgb = hexToRgb(color);
  if (!rgb) return null;
  const lightAnchor = hexToRgb(LIGHT_ANCHOR)!;
  const darkAnchor = hexToRgb(DARK_ANCHOR)!;
  return {
    light: toHex(fitContrast(rgb, lightAnchor, -1)) /* darker until it holds on white */,
    dark: toHex(fitContrast(rgb, darkAnchor, 1)) /* lighter until it holds on dark */,
  };
}
/** Apply (or clear, with null) a runtime accent override. Returns the
 *  derived variants; null when cleared or not in a browser. Invalid
 *  colors return null and leave any existing override untouched. */
export function setAccent(color: string | null): { light: string; dark: string } | null {
  if (typeof document === "undefined") return null;
  const existing = document.getElementById(OVERRIDE_ID);
  if (!color) {
    existing?.remove();
    return null;
  }
  const variants = deriveAccentVariants(color);
  if (!variants) return null;
  const element = existing ?? document.createElement("style");
  element.id = OVERRIDE_ID;
  /* mirrors tokens.css's three-block structure so mode switching keeps
   * working. The stacked :root repetitions lift specificity above every
   * palette rule — themes.css peaks at (0,3,0) for palette+dark combos,
   * so light rides at (0,4,0) and dark at (0,5,0). */
  element.textContent = `:root:root:root:root { --accent: ${variants.light}; }
:root:root:root:root[data-theme="dark"] { --accent: ${variants.dark}; }`;
  if (!existing) document.head.appendChild(element);
  return variants;
}
