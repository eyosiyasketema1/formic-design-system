# Formic AI Design System — Working Rules

Rules for any AI agent (or human) working in this repo. These exist because past mistakes were caught late by audits; following them prevents the mistakes instead.

## Design standards (non-negotiable)

1. **Tokens only.** Components never hardcode colors, font sizes, radii, shadows, or easings. Everything reads CSS variables from `styles/tokens.css`. If a needed value has no token, add the token first.
2. **Type scale**: one standard ramp, 14px base, integer steps — `text-nano` (8, mini-badge letters only), `text-micro` (10), `text-tiny` (11), `text-small` (12), `text-caption` (13), `text-body` (14, base), `text-lead` (16), `text-title` (18), `text-heading` (20), `text-display` (24), `text-display-lg` (32), `text-display-xl` (48). Never `text-[Npx]`, never fractional sizes. On colored dots/badges use `text-canvas` (never `text-white`) so dark mode keeps contrast.
   **Weights**: `font-medium` is the working default; `font-semibold` is the maximum, reserved for titles, names, and key values. `font-bold` is never used. **Tracking**: only the standard tokens `tracking-wide` / `tracking-tight` — never an arbitrary `tracking-[...]` value.
3. **Radii**: `rounded-sm` (6px), `rounded-control` (8px), `rounded-md` (10px), `rounded-card` (14px). Tiny optical radii (1–5px) may stay arbitrary.
4. **Motion**: one easing — `var(--ease-out-quint)`. Never write a `cubic-bezier(...)` literal (the token's own definition is the sole exception). CSS keyword easings (`ease-out`, `linear`) are allowed for simple fades and spins. Hover color transitions are `duration-150`.
5. **Contrast (WCAG AA)**: text ≥4.5:1, non-text UI ≥3:1 — in light, dark, and all 5 palettes. Any new color token must pass before commit.
6. **Accessibility**: interactive elements get correct ARIA (`role`, `aria-expanded`, `aria-pressed`); keyboard focus relies on the shared `:focus-visible` rule (don't suppress it — exception: text inputs inside a field wrapper (`.primitive-field`), where the wrapper shows focus via a `focus-within` border-color shift instead — deliberately quiet, no ring); animated/streamed content uses `aria-live`; everything respects `prefers-reduced-motion`. Elements focused by script for screen-reader position (a page heading, the active step) carry `tabindex="-1"` and never show a ring — Tab can't reach them, so a ring there is noise, not affordance.
7. **Props, not hardcoded content.** Demo data lives in `DEFAULT_*` constants used only as prop defaults. Variant props are typed unions, never `string`.
8. **Both themes for free — light is the default.** Components never branch on theme/palette — they only read tokens. Dark mode is opt-in only: the app sets `<html data-theme="dark">`; there is no OS auto-detect. Palettes are token overrides (`data-palette`).
9. **Keep preview.html in sync.** Any token or component change must be mirrored in `preview.html` (it duplicates styles inline for standalone use). The QA script detects color drift.
10. **Urbanist** (variable, weights 300–800) is the default face — light through bold are real weights, no synthesis. Its vertical metrics are symmetric, so labels center optically without correction.
11. **Control metrics.** Interactive controls share one height scale: 24 (xs) / 32 (sm) / 36 (md) / 40 (lg) — a md button lines up with a md input, always. Horizontal padding ≈ height/3 rounded to the spacing scale. Button-like labels use `leading-none` plus `.optical-text` (`text-box: trim-both` — centers the visible letters, not the em box); control corners use `.corner-smooth` / `.primitive-field`'s `corner-shape: squircle` (progressive, plain box fallback). Fills are flat — no inner sheens or bevel highlights on interactive elements (`--highlight-raised` was retired for this).
12. **No drop shadows.** Elevation is carried by hairline borders — the `--shadow-*` tokens are 1px rings (`0 0 0 1px …`) or `none`, never blurred offsets. Components keep using `shadow-btn` / `shadow-card` / `shadow-hairline` utilities; the tokens guarantee they render flat.
13. **Accent carries the primary action.** The page's single main CTA uses the `accent` Button variant; the ink-filled `primary` variant is for secondary emphasis surfaces. Still one accent CTA and one destructive action per view.
14. **App rails sit on `--sidebar`** (whisper grey, one step off the white canvas) with a `border-line` edge — never on `--field`. Nav active state is a flat `bg-hover-2` fill with `text-ink` copy AND icon — no border, no accent recolor; selection is signaled by fill and weight only (SidebarNav is the reference).
15. **Responsive by default.** Component roots are fluid: `w-full` plus a `max-w-*` cap — never a fixed pixel width (sanctioned exceptions: app rails like SidebarNav, and popover panels, which must clamp their position/size against the viewport). Wide content (tables, grids) scrolls inside its own `overflow-x-auto` container — never overflows the page. Text uses `min-w-0` + `truncate` instead of breaking layout. Gallery wrappers must give components room to reach their cap (`wide` on cards ≥ max-w-95). Before calling a component done, reason through it at ~360px width: nothing clipped, nothing overflowing, touch targets ≥ 24px.

16. **Chart colour is categorical, not semantic.** Data series use `--chart-1..5` (`chart-1` is the accent, so the primary series follows the brand and the accent picker) plus `--chart-track` for rests and gridlines. Never colour a series with `--green`/`--red` — those mean success and danger, and a second series in green implies something it doesn't. Hue is the only thing separating the ramp, which fails for colour-blind readers, so any multi-series chart must also carry a legend and every value must be reachable as text (label, tooltip or `aria-label`). No chart library: bars are HTML (a scaled SVG scales its text and breaks the type ramp), lines are SVG with `vector-effect="non-scaling-stroke"`. Icons are not data: card and tile icons are ink on inset, with `accent` reserved for the one tile a view leads with — never a colour per card.

17. **Two global scales, both token overrides.** `data-radius` (`sharp` / default / `rounded` / `full`) rewrites the `--radius-*` tokens; `data-size` (default / `comfortable` / `spacious`) overrides Tailwind's `--spacing`, which rescales every control height, padding and gap together — so rule 11 still holds at any density. The size scale deliberately never goes below default: the `xs` control is exactly 24px, which is rule 15's touch floor. Type is never scaled by either (rule 2). Components must not read these attributes; they only read tokens, and both scales come for free.

## Extraction rule

After every piece of work, look for extractable pieces and extract them:

1. **Compose first.** New components must use existing primitives (`components/primitives.tsx`, `components/hooks.ts`) instead of re-implementing patterns — check there before writing an expander, chip, badge, spinner, icon, popover, stagger animation, or timer. Read `prefers-reduced-motion` only through `useReducedMotion()` from `hooks.ts` — never call `matchMedia` inside a component.
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
3. Commit on a topic branch with a descriptive message after QA passes, and open a PR — see **Git** below. Never commit failing QA, and never try to push straight to `main`; it is protected and the push will be rejected.

## Repo map

- `styles/tokens.css` — source of truth: tokens (light+dark), keyframes, primitives, focus rule
- `styles/themes.css` — 5 palettes (paper default, sage, twilight, clay, ocean) × light/dark
- `styles/tailwind-theme.css` — Tailwind v4 `@theme inline` bridge (generates `text-ink`, `bg-hover`, …)
- `components/*.tsx` — React components; demo content as prop defaults
- `preview.html` — standalone browser gallery (CDN React + Tailwind; duplicates styles inline)
- `AUDIT.md`, `QA-REPORT.md` — audit history; update when resolving findings
- `scripts/qa_check.py` — the QA gate

## Git

**`main` is protected — direct pushes are rejected.** Every change goes through a pull request, including a one-line fix, including the maintainer's own work. Do not attempt `git push origin main`; it will fail.

The loop, once per unit of work:

```bash
git checkout main && git pull          # never branch off a stale main
git checkout -b <topic>                # e.g. fix/calendar-width
# ...make the change...
python3 scripts/qa_check.py            # must pass before you push
git add -A && git commit -m "Scope: what changed"
git push -u origin <topic>
# open the PR, wait for "Design system gate" to go green, merge, delete branch
git checkout main && git pull && git branch -d <topic>
```

Running `qa_check.py` locally is not optional politeness — CI runs the identical gate and the PR cannot merge until it passes, so a local run just saves you a round trip.

If a stale `.git/*.lock` blocks a commit, delete the lock files and retry.

### What CI enforces

`.github/workflows/qa.yml` runs on every PR and every push to `main`:

1. `python3 scripts/qa_check.py` — forbidden patterns, WCAG contrast across all modes × palettes, token drift, component compile
2. `python3 scripts/check_sri.py` — every external `<script>` on `index.html` and `preview.html` must carry a correct `integrity` hash, `crossorigin`, and an exactly pinned version. Change a CDN URL and you must update its hash, or the live site white-screens.

Vercel also builds a preview deployment per PR. `main` deploys to https://formicai.dev on merge, so anything that lands is live immediately — review the preview before merging.
