# Formic AI Design System — Working Rules

Rules for any AI agent (or human) working in this repo. These exist because past mistakes were caught late by audits; following them prevents the mistakes instead.

## Design standards (non-negotiable)

1. **Tokens only.** Components never hardcode colors, font sizes, radii, shadows, or easings. Everything reads CSS variables from `styles/tokens.css`. If a needed value has no token, add the token first.
2. **Type scale**: one standard ramp, 14px base, integer steps — `text-nano` (8, mini-badge letters only), `text-micro` (10), `text-tiny` (11), `text-small` (12), `text-caption` (13), `text-body` (14, base), `text-lead` (16), `text-title` (18), `text-heading` (20), `text-display` (24), `text-display-lg` (32), `text-display-xl` (48). Never `text-[Npx]`, never fractional sizes. On colored dots/badges use `text-canvas` (never `text-white`) so dark mode keeps contrast.
   **Weights**: `font-medium` is the working default; `font-semibold` is the maximum, reserved for titles, names, and key values. `font-bold` is never used. **Tracking**: only the standard tokens `tracking-wide` / `tracking-tight` — never an arbitrary `tracking-[...]` value.
3. **Radii**: `rounded-sm` (6px), `rounded-control` (8px), `rounded-md` (10px), `rounded-card` (14px). Tiny optical radii (1–5px) may stay arbitrary.
4. **Motion**: one easing — `var(--ease-out-quint)`. Never write a `cubic-bezier(...)` literal (the token's own definition is the sole exception). CSS keyword easings (`ease-out`, `linear`) are allowed for simple fades and spins. Hover color transitions are `duration-150`.
5. **Contrast (WCAG AA)**: text ≥4.5:1, non-text UI ≥3:1 — in light, dark, and all 5 palettes. Any new color token must pass before commit.
6. **Accessibility**: interactive elements get correct ARIA (`role`, `aria-expanded`, `aria-pressed`); keyboard focus relies on the shared `:focus-visible` rule (don't suppress it — exception: text inputs inside a field wrapper (`.primitive-field`), where the wrapper shows focus via a `focus-within` border-color shift instead — deliberately quiet, no ring); animated/streamed content uses `aria-live`; everything respects `prefers-reduced-motion`.
7. **Props, not hardcoded content.** Demo data lives in `DEFAULT_*` constants used only as prop defaults. Variant props are typed unions, never `string`.
8. **Both themes for free — light is the default.** Components never branch on theme/palette — they only read tokens. Dark mode is opt-in only: the app sets `<html data-theme="dark">`; there is no OS auto-detect. Palettes are token overrides (`data-palette`).
9. **Keep preview.html in sync.** Any token or component change must be mirrored in `preview.html` (it duplicates styles inline for standalone use). The QA script detects color drift.
10. **Urbanist** (variable, weights 300–800) is the default face — light through bold are real weights, no synthesis. Its vertical metrics are symmetric, so labels center optically without correction.
11. **Control metrics.** Interactive controls share one height scale: 24 (xs) / 32 (sm) / 36 (md) / 40 (lg) — a md button lines up with a md input, always. Horizontal padding ≈ height/3 rounded to the spacing scale. Button-like labels use `leading-none` plus `.optical-text` (`text-box: trim-both` — centers the visible letters, not the em box); control corners use `.corner-smooth` / `.primitive-field`'s `corner-shape: squircle` (progressive, plain box fallback). Fills are flat — no inner sheens or bevel highlights on interactive elements (`--highlight-raised` was retired for this).
12. **No drop shadows.** Elevation is carried by hairline borders — the `--shadow-*` tokens are 1px rings (`0 0 0 1px …`) or `none`, never blurred offsets. Components keep using `shadow-btn` / `shadow-card` / `shadow-hairline` utilities; the tokens guarantee they render flat.
13. **Accent carries the primary action.** The page's single main CTA uses the `accent` Button variant; the ink-filled `primary` variant is for secondary emphasis surfaces. Still one accent CTA and one destructive action per view.
14. **App rails sit on `--sidebar`** (whisper grey, one step off the white canvas) with a `border-line` edge — never on `--field`.
15. **Responsive by default.** Component roots are fluid: `w-full` plus a `max-w-*` cap — never a fixed pixel width (sanctioned exceptions: app rails like SidebarNav, and popover panels, which must clamp their position/size against the viewport). Wide content (tables, grids) scrolls inside its own `overflow-x-auto` container — never overflows the page. Text uses `min-w-0` + `truncate` instead of breaking layout. Gallery wrappers must give components room to reach their cap (`wide` on cards ≥ max-w-95). Before calling a component done, reason through it at ~360px width: nothing clipped, nothing overflowing, touch targets ≥ 24px.

## Extraction rule

After every piece of work, look for extractable pieces and extract them:

1. **Compose first.** New components must use existing primitives (`components/primitives.tsx`, `components/hooks.ts`) instead of re-implementing patterns — check there before writing an expander, chip, badge, spinner, icon, popover, stagger animation, or timer.
2. **Extract on second use.** If a piece of UI or logic appears in a second component (or clearly will), promote it to `primitives.tsx` / `hooks.ts` in the same unit of work, and rewire the existing consumer. Never leave two copies alive.
3. **Icons come from Tabler** (`@tabler/icons-react`) through the shared `Icon` wrapper in `primitives.tsx` — to add an icon, map a new name to a Tabler component in `ICONS`. Never hand-draw icon paths, never inline `<svg>` icons, never add a second icon package. (Component-specific illustrative/brand SVGs may stay local. `preview.html` keeps a small inline-path renderer so it stays dependency-free — mirror new names there.)
4. **Mirror every primitive in `preview.html`** (same names, same markup) and showcase it in the gallery's Primitives section.

## Mandatory QA workflow

**After every piece of work — no exceptions:**

1. Run the automated gate:
   ```
   python3 scripts/qa_check.py
   ```
   It checks forbidden patterns, WCAG contrast for every mode × palette, tokens↔preview drift, and that components compile. Work is not done while it fails.
2. **For any non-trivial change** (new component, token changes, refactor): launch a QA subagent to independently review the work against this file and `QA-REPORT.md` standards before presenting it as finished. The QA agent should verify claims with actual greps/counts, not trust the work summary — including rule 12: check the component's width behavior (fluid root, scroll containers, truncation) and its gallery wrapper.
3. Commit with a descriptive message after QA passes. Never commit failing QA.

## Repo map

- `styles/tokens.css` — source of truth: tokens (light+dark), keyframes, primitives, focus rule
- `styles/themes.css` — 5 palettes (paper default, sage, twilight, clay, ocean) × light/dark
- `styles/tailwind-theme.css` — Tailwind v4 `@theme inline` bridge (generates `text-ink`, `bg-hover`, …)
- `components/*.tsx` — React components; demo content as prop defaults
- `preview.html` — standalone browser gallery (CDN React + Tailwind; duplicates styles inline)
- `AUDIT.md`, `QA-REPORT.md` — audit history; update when resolving findings
- `scripts/qa_check.py` — the QA gate

## Git

Commit after each completed unit of work (`git add -A && git commit`). If a stale `.git/*.lock` blocks the commit, delete the lock files and retry.
