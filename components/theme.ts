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
/* The 10% accent tint sits on each palette's light --surface, none of which
   is pure white (ocean is #fbfdfd, the darkest). Fitting the tint against
   the darkest surface makes the result hold on every palette. */
const TINT_SURFACE_ANCHOR = "#fbfdfd";
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
function mixRgb(a: Rgb, b: Rgb, weight: number): Rgb {
  return {
    r: Math.round(a.r * weight + b.r * (1 - weight)),
    g: Math.round(a.g * weight + b.g * (1 - weight)),
    b: Math.round(a.b * weight + b.b * (1 - weight)),
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
    /* Light accents must also hold on their own 10% tint (accent-soft
       buttons, lead tiles), which is always the harder test — so that is
       the anchor when darkening. Dark accents sit on the dark anchor. */
    const target = direction < 0 ? mixRgb(rounded, hexToRgb(TINT_SURFACE_ANCHOR)!, 0.1) : anchor;
    if (contrast(rounded, target) >= MIN_CONTRAST) return rounded;
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

/* ─────────────────────────────────────────────────────────
 * derivePalette — a whole palette from one colour
 * The JavaScript twin of scripts/palette.py: paper's neutrals keep
 * their lightness and take a little chroma in the colour's hue (more
 * in the mid tones, almost none on white); the accent is the colour,
 * fitted for each mode on this palette's own surface. Keep the two in
 * step. setPalette() applies the result at runtime as
 * [data-palette="custom"] rules, the way the built-ins are written.
 * ───────────────────────────────────────────────────────── */
const PAPER_NEUTRALS = {
  light: { ink: "#1a1a1a", "ink-2": "#5c5c5c", "ink-3": "#6f6f6f", line: "#e5e5e5", "line-strong": "#cfcfcf", hover: "#f2f2f2", "hover-2": "#ececec", inset: "#e9e9e9", canvas: "#f7f7f7", surface: "#fdfdfd", field: "#f5f5f5" },
  dark: { ink: "#f0efec", "ink-2": "#b0aeaa", "ink-3": "#8d8b86", line: "#2a2a29", "line-strong": "#3f3e3c", hover: "#232322", "hover-2": "#292928", inset: "#232322", canvas: "#131312", surface: "#1c1c1b", field: "#232322" },
} as const;
const PALETTE_CHROMA: Record<string, number> = { ink: 0.012, "ink-2": 0.016, "ink-3": 0.016, line: 0.01, "line-strong": 0.014, hover: 0.008, "hover-2": 0.01, inset: 0.01, canvas: 0.006, surface: 0.003, field: 0.008 };
const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const gam = (c: number) => { c = Math.max(0, Math.min(1, c)); return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055; };
function hexToOklch(hex: string): { L: number; C: number; H: number } {
  const { r, g, b } = hexToRgb(hex)!;
  const [R, G, B] = [lin(r / 255), lin(g / 255), lin(b / 255)];
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { L, C: Math.hypot(a, bb), H: ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360 };
}
function oklchToHex(L: number, C: number, H: number): string {
  const a = C * Math.cos((H * Math.PI) / 180), bb = C * Math.sin((H * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * bb) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * bb) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * bb) ** 3;
  const r = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const b = -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s;
  return toHex({ r: Math.round(gam(r) * 255), g: Math.round(gam(g) * 255), b: Math.round(gam(b) * 255) });
}
function fitAccentOn(accent: string, surface: string, direction: -1 | 1): string {
  const rgb = hexToRgb(accent)!, surf = hexToRgb(surface)!;
  const { h, s, l } = rgbToHsl(rgb);
  for (let step = 0; step <= 100; step += 1) {
    const c = hslToRgb({ h, s, l: Math.min(1, Math.max(0, l + direction * step * 0.01)) });
    const cand = { r: Math.round(c.r), g: Math.round(c.g), b: Math.round(c.b) };
    if (contrast(cand, surf) >= MIN_CONTRAST && contrast(cand, mixRgb(cand, surf, 0.1)) >= MIN_CONTRAST) return toHex(cand);
  }
  return accent;
}
export type PaletteTokens = Record<string, string>;
export function derivePalette(color: string): { light: PaletteTokens; dark: PaletteTokens } | null {
  if (!hexToRgb(color)) return null;
  const { H } = hexToOklch(color);
  const accents = deriveAccentVariants(color)!;
  const build = (mode: "light" | "dark"): PaletteTokens => {
    const out: PaletteTokens = {};
    for (const [name, hex] of Object.entries(PAPER_NEUTRALS[mode])) out[name] = oklchToHex(hexToOklch(hex).L, PALETTE_CHROMA[name], H);
    out.accent = fitAccentOn(accents[mode], out.surface, mode === "light" ? -1 : 1);
    return out;
  };
  return { light: build("light"), dark: build("dark") };
}
export function paletteCss(pal: { light: PaletteTokens; dark: PaletteTokens }, selector = ':root[data-palette="custom"]'): string {
  const decl = (t: PaletteTokens) => Object.entries(t).map(([k, v]) => `--${k}: ${v};`).join(" ");
  return `${selector} { ${decl(pal.light)} }\n${selector}[data-theme="dark"] { ${decl(pal.dark)} }\n`;
}
/** Apply (or clear, with null) a runtime custom palette; pair with <html data-palette="custom">. */
export function setPalette(color: string | null): ReturnType<typeof derivePalette> {
  if (typeof document === "undefined") return null;
  const id = "ds-palette-custom";
  const existing = document.getElementById(id);
  if (!color) { existing?.remove(); return null; }
  const pal = derivePalette(color);
  if (!pal) return null;
  const el = existing ?? Object.assign(document.createElement("style"), { id });
  el.textContent = paletteCss(pal);
  if (!existing) document.head.appendChild(el);
  return pal;
}
