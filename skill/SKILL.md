---
name: formic-design-system
description: Use the Formic AI Design System (tokens + React components) whenever building, styling, or extending UI for AI product interfaces. Trigger on "use Formic", "the design system", or any React/Tailwind UI work in a project that vendors Formic.
---

# Formic AI Design System

A token-driven React + Tailwind v4 design system for AI product interfaces, by Eyosiyas Ketema.

**Source of truth:** https://github.com/eyosiyasketema1/formic-design-system
**Live gallery:** https://formicai.dev/preview.html

If the repo is not already in the project, clone or copy it in:

```bash
git clone https://github.com/eyosiyasketema1/formic-design-system.git
```

## Two modes: decide first

**A. Consuming Formic in an app** (most common): copy `styles/` plus the needed `components/` files into the project, then compose. Never fork component internals.

**B. Extending Formic itself** (working inside the repo): read and obey `CLAUDE.md` at the repo root. It carries the non-negotiable design rules, the extraction rule, and a mandatory QA workflow (`python3 scripts/qa_check.py` must pass, mirror every change into `preview.html`, commit per unit of work).

## Setup (consuming)

1. Tailwind v4 project. Import in this order in the global CSS:

```css
@import "tailwindcss";
@import "./styles/tokens.css";          /* source of truth: tokens, keyframes, primitive classes */
@import "./styles/themes.css";          /* optional: 5 palettes */
@import "./styles/tailwind-theme.css";  /* @theme bridge -> text-ink, bg-hover, text-body, ... */
```

2. Peer deps: `react >=18`, `react-dom >=18`, `@tabler/icons-react >=3`.
3. `RecordsTable` also needs `styles/records.css`; `SidebarNav` needs `styles/sidebar.css`.
4. Wrap the app in `<ToastProvider>` if toasts are used.

## Non-negotiable conventions

- **Tokens only.** Never hardcode colors, font sizes, radii, shadows, or easings. Utilities come from the bridge: `text-ink`, `text-ink-2/3`, `bg-canvas/surface/field/inset/hover/hover-2/sidebar`, `border-line/line-strong`, `text-accent/green/red/orange`, tints `bg-accent-tint/green-tint/red-tint/orange-tint`.
- **Type scale** (14px base, integer ramp): `text-nano` 8 · `micro` 10 · `tiny` 11 · `small` 12 · `caption` 13 · `body` 14 · `lead` 16 · `title` 18 · `heading` 20 · `display` 24 · `display-lg` 32 · `display-xl` 48. Never `text-[Npx]`.
- **Weights:** `font-medium` is the working default, `font-semibold` the maximum, `font-bold` never. **Tracking:** only `tracking-wide` / `tracking-tight`, never an arbitrary value.
- **Radii:** `rounded-sm` 6 · `rounded-chip` 7 · `rounded-control` 8 · `rounded-md` 10 · `rounded-card` 14 · `rounded-capsule` 22.
- **Motion:** one easing, `var(--ease-out-quint)`. Keyword easings only for simple fades and spins. Hover color transitions are `duration-150`. Never write a `cubic-bezier()` literal.
- **No drop shadows.** Elevation is hairline borders; the `--shadow-*` tokens are 1px rings or `none`.
- **Control metrics:** heights 24/32/36/40 (xs/sm/md/lg) shared by buttons and fields; padding is about height/3; labels use `leading-none` plus `.optical-text`; corners use `.corner-smooth`. Flat fills, no inner sheens.
- **Accent carries the primary action.** One accent CTA per view, one destructive action per view.
- **Global scales:** `data-radius` (sharp / rounded / full) and `data-size` (comfortable / spacious) are token overrides like palettes. Components never read them.
- **Light by default.** Dark is opt in via `<html data-theme="dark">`; there is no OS auto-detect. Palettes are `data-palette` overrides. Components never branch on theme, they only read tokens.
- **Contrast:** WCAG AA everywhere (text >= 4.5:1, non-text >= 3:1) across both modes and all 5 palettes.
- **Icons:** Tabler only, through the shared `Icon` wrapper: `<Icon name="check" size={14} strokeWidth={2} />`. To add an icon, map a Tabler component into `ICONS` in `primitives.tsx`. Never inline SVG icon paths, never add a second icon package.
- **Charts** use the categorical ramp `--chart-1..5` (chart-1 is the accent, so the primary series follows the brand). Never colour a series with `--green`/`--red`: those mean success and danger. No chart library — bars are HTML, lines are SVG with `vector-effect="non-scaling-stroke"`. Multi-series charts always ship a legend, because hue alone fails for colour-blind readers.
- **App rails** sit on `--sidebar` with a `border-line` edge. Nav active state is a flat `bg-hover-2` fill with ink copy and ink icon: no border, no accent recolor.
- **Responsive:** component roots are fluid (`w-full` plus a `max-w-*` cap); wide content scrolls in its own `overflow-x-auto`; text truncates with `min-w-0 truncate`; touch targets >= 24px.

## Component inventory

**Primitives** (`primitives.tsx`): `Icon`, `Spinner`, `ShimmerLabel`, `StreamText`, `StreamCaret`, `Skeleton`, `Avatar`, `Tooltip`, `Progress`, `Separator`, `Chip`, `DiffStat`, `IconButton`, `SendButton`, `Switch`, `Disclosure`, `GlideMenu`, `Card`, `Badge`, `RadioCheck`, `AvatarStack`, `Popover`.
**Hooks** (`hooks.ts`): `useSequence`, `useElapsed`, `useStream`, `useAnchoredLayer`, `useModalLayer`, `useReducedMotion` (the one way to read `prefers-reduced-motion`; never call `matchMedia` in a component).

**Controls:** `Button` (10 variants x 4 sizes x square/pill).
**Forms:** `Field`, `Input`, `Textarea`, `Select`, `Switch`, `Slider`, `OTPInput`, `FileDropzone`, `DatePicker`, `DateRangePicker`, `Calendar`, `ColorPicker`.
**Overlays:** `Modal`, `Drawer`, `Toast`, `DropdownMenu`, `Popover`, `Tooltip`.
**Feedback:** `Alert`, `Progress`, `Skeleton`, `LoadingState`, `ThinkingState`, `TaskRows`, `ToolChips`.
**Conversation:** `ChatThread`, `StreamingText`, `Markdown`, `CodeBlock`, `SelectionActions`, `PromptBar`, `ChatComposer`, `ApprovalCard`, `ApprovalFlow`, `RecommendationCard`, `ContextCards`.
**Dashboard:** `StatCard`, `MetricRow`, `Delta`, `BarChart`, `LineChart`, `DonutChart`, `Sparkline` (`smooth`, `animate`), `ChartLegend`, `CountUp`, `Gauge`, `BarList` (`charts.tsx`); `PrivacyScope`, `PrivacyToggle`, `Masked` (`Privacy.tsx`) mask figures until the eye is opened. `StatCard`'s `display` and `MetricRow`'s `value` accept a node, so `<CountUp>` and `<Masked>` slot straight in.
**Data:** `RecordsTable`, `FilterTable`, `DiffTable`.
**Structure:** `Accordion`, `Steps`, `Timeline`.
**Navigation:** `Tabs`, `Pagination`, `Breadcrumbs`, `Menubar`, `SidebarNav`, `SearchList`.

All components ship demo content as prop defaults (`DEFAULT_*`); always pass real data via props in apps. Variant props are typed unions.

## Composition guidance

Human-in-the-loop: `ApprovalCard` for a short, directly-controlled approval; `ApprovalFlow` when the run needs several questions in sequence (sliding stack, rolling counter, auto-advance on single choice).

A chat app is `SidebarNav` (rail) + `ChatThread` for the conversation (embed `Markdown`, `CodeBlock`, `ToolChips`, `ApprovalCard` as assistant message children via `MessageBubble`) + `PromptBar` pinned at the bottom + `ToastProvider` at the root. Streaming replies use the `StreamText` primitive or `StreamingText`. Agent progress uses `ThinkingState` or `TaskRows`. File input uses `FileDropzone` or PromptBar attachments.

## Live gallery

`preview.html` opens standalone in any browser (CDN React and Tailwind, no build) with the full component gallery and theme, palette, and accent switching. Use it to show options before writing code.
