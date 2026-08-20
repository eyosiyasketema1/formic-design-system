# QA Review of AUDIT.md — Design Standards — 2026-08-21

Independent QA pass over the design-standards section of `AUDIT.md`, verified against source with actual counts and computed contrast ratios.

## Claim-by-claim verdicts

| # | Audit claim | Actual (verified) | Verdict |
|---|---|---|---|
| 1 | Colors: 18 tokens, light+dark, 5 themes | 18 color tokens; dark block + 5 palettes × light/dark | **CONFIRMED** |
| 2 | ~4 hardcoded colors | Exactly: `text-white` ×2, `rgba(255,255,255,0.14)` ×1, demo SVG fills | **CONFIRMED** |
| 3 | Frequent arbitrary spacing values | Present, plus `gap-[1.5px]`, `size-[4px]`, `border-[1.5px]` | **CONFIRMED** |
| 4 | ~28 hardcoded font sizes | **23** instances (7 distinct sizes) | **OVERSTATED** (mildly) |
| 5 | ~14 arbitrary radii | **15**; values span 1–10px; `rounded-[8px]` duplicates `--radius-control` | **CONFIRMED** |
| 6 | Shadows: 4 tokens, 1 one-off | **3** tokens (hairline is a utility, not a token); **2** one-offs | **UNDERSTATED** |
| 7 | Easing repeated ~15× | **10×** that curve; but **3 near-duplicate curves** in use — the real defect | **OVERSTATED** count, understated problem |
| 8 | Durations 650/950/1400ms inline | Confirmed + ~11 more inline durations and a 480ms JS timeout | **UNDERSTATED** |
| 9 | `variant` typed as `string` in all 4 | Stale after fixes; ApprovalCard/StreamingText keep vestigial unused `variant` props | **WRONG (stale)** |
| 10 | `VARIANTS`/`PATTERNS` naming drift | Confirmed | **CONFIRMED** |
| 11 | focus-visible fixed | Present in tokens.css | **CONFIRMED** |

## New findings the audit missed

| Severity | Finding |
|---|---|
| **HIGH** | **WCAG AA contrast failures, light mode.** `--ink-3` #8a8a8a on canvas = **3.45:1** (needs 4.5:1) — used for real text at 10.5–12.5px. Worse in all 4 themes (sage 3.09, twilight 3.12, clay 3.15, ocean 3.02). Dark ink-3 on surface = 4.21:1 (marginal fail). |
| **HIGH** | `--green` on `--green-tint` = **2.98:1** (badge text); `text-green` diff counts = 3.30:1; light `--orange` = 2.15:1 — fails even the 3:1 non-text minimum for the white-on-orange dot. Light `--accent` = 4.08:1 (below 4.5 as text). |
| **HIGH** | **Tailwind `@theme` mapping exists only in preview.html.** Components need `text-ink`/`bg-hover`/`rounded-control` utilities; tokens.css ships only bare CSS vars. Real consumers get silently missing styles. |
| MED | Shadow token naming drift: preview uses `--sh-*` mapped to `--shadow-*`; tokens.css uses `--shadow-*` directly. Preview hardcodes `--radius-control: 8px`. |
| MED | Three near-identical ease-out curves: `(0.23,1,0.32,1)`, `(0.16,1,0.3,1)`, `(0.22,0.61,0.25,1)`. |
| LOW | Same hover pattern uses `duration-100` in some components, `duration-150` in others. |
| LOW | Reduced-motion rule zeroes animations only; grid-row expand *transitions* (300–400ms) still run. |

Verified clean: all 7 keyframes and all primitive classes referenced by components exist in tokens.css; all 18 color tokens are consumed; no z-index used anywhere.

## Overall assessment

Directionally trustworthy, numerically loose, materially incomplete. Every flagged category is real and no claim is fabricated, but the two most consequential issues — systemic light-mode contrast failures and the stranded `@theme` utility bridge — were missed. Treat AUDIT.md as a style-hygiene checklist, not a complete standards audit.

## Top 3 corrections to the system — ✅ all resolved 2026-08-21

1. ~~Fix light-mode contrast tokens~~ — ink-3/green/orange/accent re-tuned in tokens.css + all 4 palettes (light and dark); **25/25 WCAG pairs verified passing** programmatically.
2. ~~Ship the `@theme inline` mapping in `styles/`~~ — new `styles/tailwind-theme.css`; `--sh-*` unified to `--shadow-*`; radii referenced by var.
3. ~~Add motion + type-scale tokens and sweep~~ — `--ease-out-quint` (3 curves → 1), `--duration-*`, 5-step type scale, `--radius-sm/md`; components + preview swept.

Also resolved: hover durations unified to 150ms, reduced-motion now covers transitions, stale `variant` claim fixed in AUDIT.md, vestigial `variant` props removed.
