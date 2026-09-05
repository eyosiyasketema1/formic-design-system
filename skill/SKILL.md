---
name: formic-design-system
description: Use the Formic AI Design System (tokens + React components) for ALL UI work in a project that contains src/formic (or any folder holding Formic's tokens.css and components). Trigger on "use Formic", "the design system", or any React/Tailwind UI request — pages, dashboards, chat surfaces, forms, components — in such a project.
---

# Formic AI Design System

A token-driven React + Tailwind v4 design system for AI product interfaces, by Eyosiyas Ketema.

**Source of truth:** https://github.com/eyosiyasketema1/formic-design-system
**Live gallery:** https://formicai.dev/preview.html

## Two modes: decide first

**A. Consuming Formic in an app** (most common): the system is vendored at `src/formic/` (`styles/` + `components/`). Import its components and compose. Never fork component internals.

**B. Extending Formic itself** (the repo has `scripts/qa_check.py` at its root): read and obey `CLAUDE.md`. It carries the non-negotiable design rules, the extraction rule, and a mandatory QA workflow (`python3 scripts/qa_check.py` must pass, mirror every change into `preview.html`, branch + PR per unit of work).

## Procedure (consuming) — follow in order, every time

Generic Tailwind is the failure mode: it happens when the agent invents styles instead of importing the system.

1. **Find Formic.** `ls src/formic/styles/tokens.css src/formic/components/primitives.tsx`. If missing, install before writing any UI. In an existing project (from its root):
   ```bash
   curl -fsSL https://formicai.dev/install.sh | bash
   ```
   In an empty folder, or when asked to "start a project", scaffold one instead (Vite + React + Tailwind v4 + demo dashboard, dependencies installed, nothing to edit):
   ```bash
   curl -fsSL https://formicai.dev/install.sh | bash -s -- --new my-app
   ```
   Both copy `styles/` and `components/` into `src/formic/` and write `AGENTS.md`, a Cursor rule, Copilot instructions, and this skill into the project.
2. **Wire the CSS once** (Tailwind v4 global stylesheet, in this order; fix the relative path to `src/formic`):
   ```css
   @import "./formic/styles/fonts.css";    /* first: the Urbanist font */
   @import "tailwindcss";
   @import "./formic/styles/formic.css";   /* tokens, palettes, Tailwind bridge, component sheets */
   ```
   Peer deps: `react >=18`, `react-dom >=18`, `@tabler/icons-react >=3`. `formic.css` already includes the `sidebar.css` / `records.css` component sheets. Wrap the app in `<ToastProvider>` if toasts are used.
3. **Read before writing.** Open `src/formic/styles/tokens.css` and list `src/formic/components/`. Never write a component that already exists.
4. **Import, don't re-create.** Buttons, inputs, cards, chips, tables, charts, modals, chat surfaces, dashboard tiles all come from `src/formic/components/`. Pass props; never copy markup into a page or edit a component's internals for a one-off.
5. **New patterns compose primitives** from `src/formic/components/primitives.tsx` plus token utilities. No raw `<svg>` icons, no second icon package, no chart libraries, no UI kits.
6. **Self-check before finishing.** Any hit in your output is a bug: hex colours, `text-[Npx]` or Tailwind's `text-sm/lg` family, `font-bold`, `shadow-sm/md/lg`, `cubic-bezier(`, `rounded-lg/xl`, raw palette classes like `bg-gray-100` / `text-blue-600`. Every new UI file imports at least one thing from `src/formic/components`, or it is not Formic.

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

## Layout and composition (what agents get wrong)

- **Checkbox vs Switch.** `Switch` only for a setting that applies the moment it flips. Completion, selection, "done today", "include row" = `Checkbox`. Never switches down a list.
- **Icons are furniture.** `StatCard` icons are ink on inset by default; at most one tile per view is `iconTone="accent"`. A different colour per card is the machine-made tell. Colour lives in three places only: accent (one primary action, lead series), green/red (success/danger), chart ramp (series).
- **Every titled section is a `Panel`** (`title`, `caption`, `actions`, body). Never hand-build a card header. `Card` is for untitled things only.
- **Panels in a row are equal height and their bodies fill:** grid stretches (never `items-start`), charts and lists take `fill` (`<LineChart fill />`, `<BarChart fill />`, `<BarList fill />`), tables are `w-full`. Charts have no width cap. An empty lower half, or a chart stopping at 60% of the panel's width, is a bug.
- **Buttons are one line.** Icon and label on one row, via `icon=` or as a child; labels never wrap. Icon above label = broken.
- **Tables fill their container** unless the user asks for a width; wide ones scroll in their own `overflow-x-auto`.
- **Rails:** `AppSidebar` (dashboard / admin, `expanded` or `rail`) or `SidebarNav` (chat), inside `<div className="flex h-dvh">…<main className="min-w-0 flex-1 overflow-y-auto">`. Never build a sidebar from divs.
- **Proximity and alignment.** Filters in one row directly above the list, sized to content, search at the right end; comparison pickers together with "vs" in the panel's `actions`. One grid: `gap-3.5` in sections, `gap-6` between; numbers right with `tabular-nums`; nothing centred unless alone.
- **Filters are a `FilterBar`** (children = the selects, `search` pinned right, `active` + `onClear`): one row, wrap only on overflow, each control sized to content. Never one filter per row.
- **Every chart animates in by default** (bars grow, lines reveal, donuts sweep, sparklines draw); reduced motion is honoured automatically. `animate={false}` only for live-updating charts. No custom keyframes, no motion libraries.
- **Icons match labels:** `iconFor(label)` from `primitives.tsx` (`"Refresh"` → `retry`, `"Export CSV"` → `download`, `"Add user"` → `user-add`); `undefined` means leave the icon off.
- **Brand marks:** `<BrandIcon name="github" />` from `brand.tsx` (80+ companies and social networks), monochrome by default; `color="brand"` for a one-colour mark. `<BrandLogo name="google" />` from `brand-logos.tsx` is the real full-colour logo (101 official marks, dark variants automatic) for sign-in buttons and integration directories. Never recolour or stretch a logo. No logo images, no second icon package.
- **Page density.** `p-6 sm:p-8`, sections `gap-6`.

## Component inventory

**Primitives** (`primitives.tsx`): `Icon`, `Spinner`, `ShimmerLabel`, `StreamText`, `StreamCaret`, `Skeleton`, `Avatar`, `Tooltip`, `Progress`, `Separator`, `Chip`, `DiffStat`, `IconButton`, `SendButton`, `Switch`, `Checkbox`, `Disclosure`, `GlideMenu`, `Card`, `Badge`, `RadioCheck`, `AvatarStack`, `Popover`.
**Brand** (`brand.tsx`, `brand-logos.tsx`): `FormicMark`, `BrandLogo` (real logos, `BRAND_LOGO_NAMES`, `brandTitle`), `BrandIcon` (`name`: github, google, apple, slack, notion, figma, linkedin, x, instagram, youtube, stripe, openai, …). **Helper:** `iconFor(label)`.
**Hooks** (`hooks.ts`): `useSequence`, `useElapsed`, `useStream`, `useAnchoredLayer`, `useModalLayer`, `useReducedMotion` (the one way to read `prefers-reduced-motion`; never call `matchMedia` in a component).

**Controls:** `Button` (10 variants x 4 sizes x square/pill).
**Forms:** `Field`, `Input`, `Textarea`, `Select`, `Switch`, `Checkbox`, `FilterBar`, `Slider`, `OTPInput`, `FileDropzone`, `DatePicker`, `DateRangePicker`, `Calendar`, `ColorPicker`.
**Overlays:** `Modal`, `Drawer`, `Toast`, `DropdownMenu`, `Popover`, `Tooltip`.
**Feedback:** `Alert`, `Progress`, `Skeleton`, `LoadingState`, `ThinkingState`, `TaskRows`, `ToolChips`.
**Conversation:** `ChatThread`, `StreamingText`, `Markdown`, `CodeBlock`, `SelectionActions`, `PromptBar`, `ChatComposer`, `ApprovalCard`, `ApprovalFlow`, `RecommendationCard`, `ContextCards`.
**Dashboard:** `Panel` (titled card: `title`, `caption`, `actions`, `padding`), `StatCard` (`iconTone` "neutral" | "accent"), `MetricRow`, `Delta`, `BarChart` / `LineChart` (`fill` to take the panel's height, no width cap, `animate` default true), `DonutChart`, `Sparkline` (`smooth`, `animate`), `ChartLegend`, `CountUp`, `Gauge`, `BarList` (`charts.tsx`); `PrivacyScope`, `PrivacyToggle`, `Masked` (`Privacy.tsx`) mask figures until the eye is opened. `StatCard`'s `display` and `MetricRow`'s `value` accept a node, so `<CountUp>` and `<Masked>` slot straight in.
**Data:** `RecordsTable`, `FilterTable`, `DiffTable`.
**Structure:** `Accordion`, `Steps`, `Timeline`.
**Navigation:** `Tabs`, `Pagination`, `Breadcrumbs`, `Menubar`, `AppSidebar` (dashboard rail: `expanded` | `rail`, `sections` with optional `children` sub-menus or `submenus="none"` for flat, `active`, `onSelect`, `user`, `workspace.logo` defaults to the Formic mark in accent), `SidebarNav` (chat rail), `SearchList`.

All components ship demo content as prop defaults (`DEFAULT_*`); always pass real data via props in apps. Variant props are typed unions.

## Composition guidance

Human-in-the-loop: `ApprovalCard` for a short, directly-controlled approval; `ApprovalFlow` when the run needs several questions in sequence (sliding stack, rolling counter, auto-advance on single choice).

Any page with a rail: `<div className="flex h-dvh"><AppSidebar … /><main className="min-w-0 flex-1 overflow-y-auto">…</main></div>` (`SidebarNav` for chat) — rails fill their parent, never give them a fixed height.

A chat app is `SidebarNav` (rail) + `ChatThread` for the conversation (embed `Markdown`, `CodeBlock`, `ToolChips`, `ApprovalCard` as assistant message children via `MessageBubble`) + `PromptBar` pinned at the bottom + `ToastProvider` at the root. Streaming replies use the `StreamText` primitive or `StreamingText`. Agent progress uses `ThinkingState` or `TaskRows`. File input uses `FileDropzone` or PromptBar attachments.

## Live gallery

`preview.html` opens standalone in any browser (CDN React and Tailwind, no build) with the full component gallery and theme, palette, and accent switching. Use it to show options before writing code.
