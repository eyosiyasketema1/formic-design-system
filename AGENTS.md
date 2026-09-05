# Instructions for AI coding agents

This project uses the **Formic AI Design System**. Read this file before writing or changing any UI. It applies to Claude Code, Cursor, Copilot, Codex, and any other coding agent.

Gallery: https://formicai.dev/preview.html · Source: https://github.com/eyosiyasketema1/formic-design-system

## Which situation are you in?

- **This repo has `scripts/qa_check.py` and `styles/tokens.css` at its root.** You are inside Formic itself. Skip to "Changing Formic itself" at the bottom.
- **Otherwise you are building an app that consumes Formic.** Follow the procedure below, in order, every time.

## Procedure for building UI (consuming Formic)

Generic Tailwind is the failure mode. It happens when the agent invents styles instead of importing the system. These steps prevent it.

**Step 1: find Formic in the project.** It lives at `src/formic/` (`src/formic/styles/` and `src/formic/components/`). Confirm with:

```bash
ls src/formic/styles/tokens.css src/formic/components/primitives.tsx
```

If they are missing, stop and install before writing any UI:

```bash
curl -fsSL https://formicai.dev/install.sh | bash
```

Then make sure the global CSS imports the token stack (Tailwind v4) and `@tabler/icons-react` is a dependency:

```css
@import "./formic/styles/fonts.css";    /* first: the Urbanist font */
@import "tailwindcss";
@import "./formic/styles/formic.css";   /* tokens, palettes, Tailwind bridge, component sheets */
```

**Step 2: read before you write.** Open `src/formic/styles/tokens.css` (the tokens and their names) and list `src/formic/components/` (what already exists). Do not write a component that already exists there.

**Step 3: import, do not re-create.** Every button, input, card, chip, badge, table, chart, modal, chat surface, and dashboard tile comes from `src/formic/components/`. Import it and pass props. Never copy a component's markup into a page, and never edit a component's internals to bend it into a one-off shape.

```tsx
import Button from "@/formic/components/Button";
import { Card, Chip, Icon } from "@/formic/components/primitives";
import { StatCard, MetricRow } from "@/formic/components/StatCard";
```

**Step 4: for anything new, compose primitives.** If a pattern is missing, build it from `primitives.tsx` (Icon, Chip, Card, Badge, Avatar, Popover, Switch, Skeleton, Disclosure, ...) and the token utilities. No raw `<svg>` icons, no new icon packages, no chart libraries, no UI kits.

**Step 5: self-check before you finish.** Grep your own output. Any hit is a bug:

```
#[0-9a-fA-F]{3,6}     hardcoded colour      -> use text-ink, bg-surface, border-line, text-accent, ...
text-\[[0-9]+px\]     arbitrary font size   -> use the ramp: text-small, text-caption, text-body, text-title, ...
font-bold             banned weight         -> font-semibold is the maximum
shadow-(sm|md|lg|xl)  drop shadow           -> shadow-card / shadow-btn / shadow-hairline (1px rings)
cubic-bezier(         easing literal        -> var(--ease-out-quint)
rounded-(lg|xl|2xl)   off-scale radius      -> rounded-control, rounded-md, rounded-card
bg-(gray|slate|zinc|blue|green|red)-  raw Tailwind palette -> tokens only
```

Also confirm at least one import from `src/formic/components` exists in every new UI file. If none does, the result is not Formic.

## Layout and composition rules (the ones agents break most)

These came from reviewing real agent output. Each one is a tell that a page was assembled, not designed.

1. **Checkbox vs Switch.** A `Switch` is a setting that takes effect the moment it flips (notifications on, dark mode). Anything that records a state or a selection — a habit done today, a task ticked, a row included — is a `Checkbox`. A list of items with switches down the left edge is wrong.
2. **Icons are furniture, not data.** Card icons are ink on inset (`StatCard` default). At most one tile per view gets `iconTone="accent"`, the one the page leads with. A different colour per card is the signature of machine-made UI. Colour appears in exactly three places: the accent (one primary action, the lead series), green/red (success and danger only), and the chart ramp (data series only).
3. **Every titled section is a `Panel`.** `<Panel title caption actions>` gives the anatomy for free: title and caption left, controls right, one baseline, body below, `p-4`. Use `Card` directly only for things that are not a titled section (a stat tile, a message). Never hand-build a card header.
4. **Panels in a row are the same height, and their bodies fill.** The grid stretches them (that is the default; never add `items-start`), and the content reaches the bottom: charts get `fill` (`<LineChart fill />`, `<BarChart fill />`), ranked lists get `fill` (`<BarList fill />`), tables are `w-full`. A panel whose lower half is empty, or a chart that stops at 60% of its panel's width, is a bug. Charts have no width cap: they are as wide as the panel.
5. **Buttons are one line.** Label and icon sit on one row, always; pass the icon through `icon=` / `iconEnd=` or as a child, both work. A button whose icon sits above its label is broken, not a variant. Labels never wrap.
6. **Tables fill their container** (`RecordsTable`, `FilterTable`, `DiffTable` are `w-full`), unless the user asks for a fixed width. Wide tables scroll inside their own `overflow-x-auto`, never the page.
7. **Proximity.** Controls sit next to the thing they act on: filters directly above the list, in one row, sized to their content (`max-w-*`), not stacked full-width; the search input at the row's right end. A comparison's two pickers sit together with "vs" between them, in the panel's `actions`, not in a far corner.
8. **One grid.** Every panel in a row shares the same gutter (`gap-3.5` inside sections, `gap-6` between sections) and left edge. Numbers align right with `tabular-nums`. Labels align left. Nothing is centred unless it is alone.
9. **Rails.** A dashboard or admin app gets `AppSidebar` (grouped menu with counts and sub-menus via `children` (or `submenus="none"` for a flat rail), `expanded` or `rail` variant, the Formic mark in accent at the top, account row at the bottom); a chat app gets `SidebarNav`. Both fill the shell's height. Never build a sidebar from divs.
10. **Empty states and loading** use `LoadingState` / `Skeleton` / `Alert`, never an ad-hoc grey box.
11. **Filters are a `FilterBar`.** Label (`leading="Filters"`), the selects as children, a compare toggle or view switch in `trailing`, search in `search`: one wrapping row, so when it is full the next control goes to the next line. Never a row with `overflow-hidden` or `whitespace-nowrap` that clips the last control. `<FilterBar search={<Input … />} active={n} onClear={…}>` with the selects as children: they share one row and wrap only when they run out of room, each given a width through its `width` prop (`<Select width="w-40" />`, `<Input width="w-56" />`; the default `w-full` is for forms), search pinned right, Clear only while something is applied. One filter per row, each full width, is wrong.
12. **Every chart moves in, once.** Bars grow from the baseline, lines reveal left to right, donut arcs sweep, sparklines draw, ranked bars grow. That is the default on every chart and needs no prop. It honours reduced motion by itself. Pass `animate={false}` only on a chart that re-renders with live data. Never add your own keyframes or a motion library to a chart.
13. **Icons match their label.** Use `iconFor(label)` from `primitives.tsx` for any button, menu item or nav row: `iconFor("Refresh")` → `"retry"`, `iconFor("Export CSV")` → `"download"`, `iconFor("Add user")` → `"user-add"`. If it returns `undefined`, leave the icon off; a decorative random icon is worse than none. Verbs outrank nouns ("Remove filter" is a trash can) and keys match whole words. Reference: refresh/reload/sync → `retry`; export/download → `download`; import/upload → `upload`; add/create/new → `plus`; delete/remove → `trash`; edit/rename → `edit`; save/confirm → `check`; cancel/close → `close`; settings → `gear`; search → `search`; filter → `filter`; share → `share`; print → `print`; schedule/date → `calendar`; sign out → `sign-out`; generate/AI → `sparkles`.
14. **People are `Avatar`s.** A person with a photo gets `src`; without one, `doodle` (an illustrated face derived from the name, same face every time, generated locally) or initials. Several people are an `AvatarGroup` (`people`, `max`, `ring` = the surface it sits on). Never a grey circle with an icon, never a random stock face.
15. **Brand marks come from `BrandIcon`** (`components/brand.tsx`): `<BrandIcon name="github" />`, `"google"`, `"slack"`, `"notion"`, `"figma"`, `"linkedin"`, `"x"`, `"instagram"`, `"youtube"`, `"stripe"`, `"openai"` and 70 more. Monochrome by default, coloured like any icon (`text-ink`, `text-ink-2`). `color="brand"` gives the mark its published colour; use it only where the logo must be recognised at a glance (sign-in buttons, an integrations directory, connected accounts), never in navigation or status rows. For the real full-colour mark use `<BrandLogo name="google" />` from `components/brand-logos.tsx` (101 official logos via svgl, dark variants automatic): sign-in buttons, integration directories, partner strips. Never recolour or stretch a logo, never put one in a coloured tile. No logo PNGs, no second icon package.
16. **Density.** A page is `p-6` (`sm:p-8`) with sections `gap-6`. If a section needs more air than that, the content is wrong, not the spacing.

A dashboard row, done right:

```tsx
<div className="grid grid-cols-1 gap-3.5 lg:grid-cols-5">
  <Panel title="Revenue & sales" caption="Weekly, current vs previous" className="lg:col-span-3"
         actions={<Select size="sm" … />}>
    <LineChart fill labels={weeks} series={[current, previous]} />
  </Panel>
  <Panel title="Revenue by location" caption="Top regions" className="lg:col-span-2">
    <BarList fill items={regions} format={usd} />
  </Panel>
</div>
```

## Brand colour: the one procedure

When the user gives a colour ("make #29E0C2 the accent"), do not write it into `tokens.css`. One hex cannot serve both modes: a bright brand colour is unreadable on white, a deep one vanishes on dark. Run the script that derives both variants and rewrites the tokens:

```bash
python3 src/formic/scripts/set_accent.py "#29E0C2"
```

It keeps the hue and saturation, darkens for light mode until the colour holds 4.5:1 on white and on its own tint, lightens for dark mode until it holds 4.5:1 on dark surfaces, writes both `--accent` values, and prints the ratios. `accent-tint` and `chart-1` follow automatically, and in an app the brand accent also replaces each palette's own accent (a palette is the neutral family; the accent is always the brand's). For a colour chosen at runtime (a theme picker), call `setAccent(hex)` from `components/theme.ts` — the same algorithm. Editing `--accent` by hand is a bug.

## App configuration: `formic.config.json` is the source of truth

The app's choices live in one file, `src/formic/formic.config.json`: `accent`, `palette`, `radius`, `size`, `theme` (starting theme), `avatar` (people without a photo: `initials` or `doodle`), `sidebar` (`expanded` or `rail`) and `motion`. Users make them at https://formicai.dev/customize and paste a block that looks like this:

```
Apply this Formic configuration and keep it as the source of truth:
save it as src/formic/formic.config.json, then run
  python3 src/formic/scripts/apply_config.py
{ "accent": "#29E0C2", "palette": "paper", "radius": "rounded", ... }
```

When you receive one: save the JSON exactly as given to `src/formic/formic.config.json`, run the script, restart the dev server, and reply with the ratios it printed. The script does everything deterministically: it fits the accent for both modes (through `set_accent.py`), writes the `data-*` attributes on `<html>` in the app's `index.html`, and writes `components/config.ts`, which `Avatar`, `AppSidebar` and the charts read as their prop defaults. Do none of that by hand, and do not undo it inline: no `doodle={false}` because you prefer initials, no `defaultVariant="expanded"` when the config says `rail`, no second accent. A user who says "make the corners rounder" or "start in dark mode" is asking for a config change: edit the JSON, run the script. Re-running the installer keeps the config and re-applies it.

## The rules that matter most

1. **Tokens only.** No hardcoded colors, font sizes, radii, shadows, or easings. Use the generated utilities: `text-ink`, `text-ink-2`, `text-ink-3`, `bg-canvas`, `bg-surface`, `bg-field`, `bg-hover`, `bg-hover-2`, `bg-inset`, `bg-sidebar`, `border-line`, `border-line-strong`, `text-accent`, `text-green`, `text-red`, `text-orange`, the `*-tint` backgrounds, and the categorical chart ramp `chart-1..5` plus `chart-track` (for data series only — never colour a series with green or red, those carry meaning). If a value has no token, add the token first.
2. **Type scale.** A 14px base integer ramp: `text-nano` 8, `text-micro` 10, `text-tiny` 11, `text-small` 12, `text-caption` 13, `text-body` 14, `text-lead` 16, `text-title` 18, `text-heading` 20, `text-display` 24, `text-display-lg` 32, `text-display-xl` 48. Never `text-[Npx]`, never Tailwind's `text-sm` / `text-lg` family.
3. **Weights and tracking.** `font-medium` is the default, `font-semibold` is the maximum, `font-bold` is never used. Only `tracking-wide` and `tracking-tight`, never an arbitrary value.
4. **Radii.** `rounded-sm` 6, `rounded-chip` 7, `rounded-control` 8, `rounded-md` 10, `rounded-card` 14, `rounded-capsule` 22.
5. **Motion.** One easing: `var(--ease-out-quint)`. Hover color transitions are `duration-150`. No `cubic-bezier()` literals. Read reduced motion only through `useReducedMotion()` from `hooks.ts`.
6. **No drop shadows.** Elevation comes from hairline borders. The `--shadow-*` tokens are 1px rings or `none`.
7. **Control metrics.** Heights 24 / 32 / 36 / 40 (xs / sm / md / lg), shared by buttons and inputs, so a md button lines up with a md input. Horizontal padding is roughly height/3.
8. **Accent carries the primary action.** One accent CTA per view, one destructive action per view; everything else is secondary, outline, or ghost.
9. **Light by default.** Dark is opt in through `<html data-theme="dark">`. Components never branch on theme or palette, they only read tokens, so both modes come for free.
10. **Contrast.** Keep WCAG AA in both modes and all five palettes: text at least 4.5:1, non-text UI at least 3:1.
11. **Icons.** Tabler only, through the shared `Icon` wrapper: `<Icon name="check" size={14} strokeWidth={2} />`. To add one, map a Tabler component into `ICONS` in `primitives.tsx`. Never inline SVG icon paths, never add a second icon package.
12. **Responsive by default.** Fluid roots (`w-full` plus a `max-w-*` cap), wide content scrolls inside its own `overflow-x-auto`, text truncates with `min-w-0 truncate`, touch targets at least 24px. Check the layout at about 360px wide before calling it done.

## What is in the box

**Brand** (`brand.tsx`): FormicMark, BrandIcon (80+ company and social marks). **Helpers**: iconFor(label); `scripts/set_accent.py` and `setAccent()` for the brand colour; `formic.config.json` + `scripts/apply_config.py` for the app's choices (accent, palette, radius, size, theme, avatar, sidebar, motion), read by components through `config.ts`.
**Primitives** (`primitives.tsx`): Icon, Spinner, ShimmerLabel, StreamText, StreamCaret, Skeleton, Avatar (initials, `src` photo, or `doodle` — an illustrated face derived from the name), AvatarGroup (people overlapping with a +N tile), Tooltip, Progress, Separator, Chip, DiffStat, IconButton, SendButton, Switch, Checkbox, Disclosure, GlideMenu, Card, Badge, RadioCheck, AvatarStack, Popover.
**Hooks** (`hooks.ts`): useSequence, useElapsed, useStream, useAnchoredLayer, useModalLayer, useReducedMotion.
**Controls and forms:** Button, Field, Input, Textarea, Select, Switch, Checkbox, FilterBar, Slider, OTPInput, FileDropzone, DatePicker, DateRangePicker, Calendar, ColorPicker.
**Overlays:** Modal, Drawer, Toast (`ToastProvider` at the root), DropdownMenu, Popover, Tooltip.
**Feedback and agents:** Alert, Progress, Skeleton, LoadingState, ThinkingState, TaskRows, ToolChips.
**Conversation:** ChatThread, MessageBubble, StreamingText, Markdown, CodeBlock, SelectionActions, PromptBar, ChatComposer, ApprovalCard, ApprovalFlow, RecommendationCard, ContextCards, ChatApp.
**Dashboard:** Panel (the titled card), StatCard, MetricRow, Delta, BarChart, LineChart, DonutChart, Sparkline, ChartLegend, CountUp, Gauge, BarList, PrivacyScope / PrivacyToggle / Masked.
**Data and structure:** RecordsTable, FilterTable, DiffTable, Accordion, Steps, Timeline.
**Navigation:** Tabs, Pagination, Breadcrumbs, Menubar, AppSidebar (dashboard rail, expanded / rail, sub-menus), SidebarNav (chat rail), SearchList.

**App shell.** Rails fill their parent's height, so any page with one uses this skeleton (never give the rail a fixed height, never put it inside a scrolling page). `AppSidebar` for dashboards and admin apps, `SidebarNav` for chat:

```tsx
<div className="flex h-dvh">
  <AppSidebar sections={nav} active={page} onSelect={setPage} />
  <main className="min-w-0 flex-1 overflow-y-auto p-6">…</main>
</div>
```

Typical screens: a chat app is `SidebarNav` + `ChatThread` + `PromptBar` + `ToastProvider`; a dashboard is `AppSidebar` + a grid of `StatCard` and `Panel`s holding `BarChart` / `LineChart` / `BarList` (with `fill`) / `Gauge` and `MetricRow` breakdowns; an agent run is `ThinkingState` or `TaskRows` with `ApprovalCard` / `ApprovalFlow` for human-in-the-loop moments.

## Data, not hardcoded content

Every component ships demo content as prop defaults (`DEFAULT_*`). In an app, always pass real data through props. Variant props are typed unions, never plain `string`.

## Changing Formic itself

Read `CLAUDE.md` at the repo root for the full rules and `CONTRIBUTING.md` for scope — what is open to contribution and what is a maintainer decision.

**The workflow is not negotiable, because it is enforced by the repo, not by convention:**

1. **Branch.** `main` is protected. Direct pushes are rejected, for everyone. Work on a topic branch and open a pull request, even for a one-line fix.
2. **Run the gate before you push:** `python3 scripts/qa_check.py`. CI runs the identical check and the PR cannot merge until it passes, so running it locally only saves a round trip.
3. **Mirror into `preview.html`.** It duplicates the tokens and components inline so it can run standalone with no build. The gate fails on drift between `styles/` and `preview.html`.
4. **Do not touch a CDN `<script>` tag casually.** Every external script carries an SRI `integrity` hash and an exactly pinned version, and `scripts/check_sri.py` verifies them against the live bytes in CI. A stale hash white-screens the production site while the HTML still looks correct in review.
5. **`main` is production.** It deploys to https://formicai.dev on merge. Each PR gets its own Vercel preview URL — look at it before merging.

Do not add dependencies, and do not reformat unrelated files alongside a real change.
