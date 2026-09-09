# Instructions for AI coding agents

This project uses the **Formic AI Design System**. Read this file before writing or changing any UI. It applies to Claude Code, Cursor, Copilot, Codex, and any other coding agent.

Gallery: https://formicai.dev/preview.html · Source: https://github.com/eyosiyasketema1/formic-design-system

## Which situation are you in?

- **This repo has `scripts/qa_check.py` and `styles/tokens.css` at its root.** You are inside Formic itself. Skip to "Changing Formic itself" at the bottom.
- **Otherwise you are building an app that consumes Formic.** Follow the procedure below, in order, every time.

## Build protocol (consuming Formic)

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

**Step 4: map the screen to the inventory before writing it.** List what the screen needs (a rail, a header, figures, a chart, a table, a form, a dialog) and name the Formic component for each from "What is in the box" below. Every row must resolve to a component; a row that resolves to "a div with classes" is where generic UI starts.

**Step 5: when nothing fits, build the component, do not fake it.** A missing piece is normal, and it is never solved inline in a page. Stop, say so ("Formic has no X; building `src/formic/components/X.tsx`"), then build it the way the system builds its own: one file, composed from `primitives.tsx` and token utilities, control metrics (24/32/36/40 heights, `.corner-smooth`, `.optical-text`), the ramp, a typed variant union, demo content as `DEFAULT_*` prop defaults, fluid root (`w-full` plus a `max-w-*` cap), correct ARIA and the shared focus rule, reduced motion through `useReducedMotion()`, both themes for free because it only reads tokens. Take the time it needs; a screen that ships with a hand-rolled table because the table was "not worth a component" is the slop this file exists to prevent. Tell the user what you built and why, so it can be pulled upstream.

**Step 6: readability is not optional.** Body copy is `text-body text-ink`; secondary copy `text-caption` or `text-small` in `text-ink-2`; `text-ink-3` only at `text-small` and above; nothing under 12px in `text-ink-3`; never fade text with `opacity-*`; never `text-white` on a fill (use `text-canvas`); one accent button per view; numbers right-aligned with `tabular-nums`; labels in the reader's words. If a line is hard to read on the screenshot, it is a defect, not a style.

**Step 7: run both gates, fix every line, then report.** Not a grep by eye, the scripts:

```bash
python3 src/formic/scripts/formic_check.py src     # how it was built: tokens, ramp, radii, no raw elements, no second kit
python3 src/formic/scripts/compose_check.py src    # what is on it: brief, register, budgets, real periods
```

`npm run formic` runs both (the installer adds the script). Both must print clean. A line that is a real exception carries a `formic-ok` comment with the reason. Finish the task with a short report: the components used, any component built, and the two gates' output. Work is not done while either fails.

**On prompt length.** The user's request can be one line. This file is the specification; do not ask for design detail the system already decides (spacing, radius, weights, colours, which rail, which chart). Ask only about the brief: who reads the screen, what question it answers, what they do next.

## Composition intelligence: nothing on a screen without a reason

Formic can render anything; the system's value is in what it leaves out. AI-built screens fail in one recognisable way: the same four KPI cards with made-up deltas, a chart because a dashboard "has charts", an icon per card, a donut for two numbers, a table where a sentence would do. Every one of those is an element placed by habit, not by intent. The rules below are the procedure that prevents it. They are as binding as the design rules; a screen that breaks them is wrong even when every token is right. The thinking behind them is old and settled: Tufte's data-ink ratio and chartjunk (ink that tells the reader nothing new is removed), Few's dashboard discipline (one screen, the few things that matter, nothing decorative), Abela's chart chooser (the question decides the chart), and progressive disclosure (details on demand, not on arrival).

### 1. Write the brief before the markup

Before the first component, put a four-line comment at the top of the screen's file and keep it there:

```
/* Brief
   Reader:   the studio lead, Monday morning, on a laptop
   Question: are we on track this month, and what needs me today?
   Action:   open the invoice or project that needs a decision
   Register: analytical (numbers first, a chart only for the one trend, a list of what needs action)
*/
```

If a line cannot be filled honestly, the screen is not ready to build; ask, or make the smallest screen that answers what is known. The brief is what the reviewer reads first, and what every element is tested against.

### 2. Pick the register, then stay in it

The register is how much the screen reads versus how much it shows. Four exist, and a screen has one:

| Register | The reader wants | Lead with | Allowed | Not allowed |
|---|---|---|---|---|
| **Text** | to understand something (a settings page, a document, a policy, an answer, an onboarding step) | prose in `Markdown` / plain type, `Field`s, `Accordion` | one small figure if it settles a point; `Steps`; `Alert` | any chart, StatCards, tiles, icons per row |
| **Balanced** | to see the state of one thing and act (a project page, an account, a record, a client) | a header (name, status `Badge`, the one action), then facts as `MetricRow`s or a two-column key-value list | one `Panel` with a chart **if** there is a trend to show; `DataTable` for the thing's children; an `Activity` list | a row of StatCards; more than one chart; decorative sparklines |
| **Analytical** | to compare, spot, decide across many things (an overview, a report, finance, traffic) | the 3 to 5 figures that answer the question (`StatStrip` or `StatCard`s), then the one chart that carries the trend, then the table or list to act on | a second chart only if it answers a different question; `Delta` on every figure that has a prior period | figures without a period; charts of unrelated things side by side; a gauge for a number that is not a rate toward a target |
| **Visual** | to browse and pick (a gallery, templates, people, integrations, files) | `CardGroup` of `Card`s with `CardMedia`, or `AvatarGroup`s | a `FilterBar` and search; a `DataTable` toggle for the same items | figures, charts, a hero number |

A chat surface is its own thing: `ChatThread` + `PromptBar`, with the assistant's answers in the **Text** register unless the answer *is* numbers (then `InsightCards`, one card per insight, never a dashboard inside a bubble).

Mixed pages exist, but the mix is by section, not by whim: a client page is Balanced at the top (who, status, action) and Analytical in one panel (the trend) and Visual at the foot (their sites). Each section declares its register the same way a page does.

### 3. The admission test for every element

An element goes on the screen only if all four are true. Write the answer in a comment when it is not obvious.

1. **It answers the brief's question or enables its action.** A traffic chart on an invoices page fails even if the data exists.
2. **The data has the shape the element needs.**
   - `StatCard` / `StatStrip` figure: one number the reader would say out loud, with its period; a `delta` only when there is a real prior period to compare against (never `+12%` invented for symmetry).
   - `Sparkline` / `MiniBars` on a tile: at least 6 points of the *same* figure over time. A tile whose trend is decorative shows none.
   - `LineChart`: a series over an ordered axis (time, steps), at least 5 points, one to three series. Two series with different units is two charts or a table.
   - `BarChart`: up to ~12 categories compared on one measure; stacked only when the parts add to a meaningful whole.
   - `DonutChart` with `segments` / `ShareBar`: parts of one whole, 3 to 6 parts; two parts is a sentence ("64% billable"); more than 6 is a `BarList`.
   - `BarList`: a ranking of one measure, 3 to 10 rows.
   - `Gauge` / progress `ring`: a rate toward a known target, never a plain count.
   - `RadarChart`: 4 to 8 axes on the same scale, for a profile, not a comparison of magnitudes.
   - `ScatterChart`: two measures per thing where the relationship is the point.
   - `ActivityCalendar`: a count per day over months.
   - `DataTable`: many things with the same fields where the reader scans, sorts, selects; under 4 rows it is a list of `MetricRow`s or a sentence.
   - `MetricRow`: one fact, name and value, in a list of facts about one thing.
   - Prose: anything that needs a because. Numbers that need explaining get a sentence next to them, not another chart.
3. **It is not already said.** A number in a StatCard and again as the chart's last point and again in a table row is said three times; keep the one that lets the reader act.
4. **Removing it would cost the reader something.** If the answer is "it would look empty", the fix is a smaller page or a better hierarchy, never filler.

**Demo data is not an empty state.** When the user asks for a demo, sample, starter or test screen, fill it with the content the components ship as `DEFAULT_*` (Formic Studio, its clients, invoices in ETB, agents); an empty state is for a real app that has no data yet. A test prompt that comes back as zeros and "No data" has misread the brief.

### 4. Budgets (per screen, at a normal laptop width)

- Headline figures: 0 in Text, at most 1 in Balanced, 3 to 5 in Analytical, 0 in Visual. Never a 2×2 grid of cards to make a square.
- Charts: 0 in Text and Visual, at most 1 in Balanced, 1 to 3 in Analytical, each answering a different question.
- Accent: one accent Button and, if any, one `iconTone="accent"` tile. Chart series follow the categorical ramp (rule 16), which is not a licence to add series.
- Icons: on navigation, buttons, tiles and statuses where they say what the label says (`iconFor`). Never one per card for decoration, never a different colour per card.
- Empty and loading: real states (`Skeleton`, `LoadingState`, the `DataTable` `empty` text), never fake numbers. If data does not exist yet, the screen says so in one line and offers the action that creates it.
- Words: labels are the reader's words (Invoiced, not Revenue KPI); captions say the period; a chart has a title that is the question it answers ("Where the week went"), not the chart type.

### 5. Density and the fold

Rank the brief's answers. The first screenful holds the answer to the question and the action; everything else sits below, in panels the reader can skip. Sections are `gap-6` apart; inside a section the pieces that belong together are `gap-3` or `gap-4`. If the reader has to scroll to find out whether things are fine, the hierarchy is wrong, not the content.

### 6. Run the lint, then review against the brief

`python3 src/formic/scripts/compose_check.py src/` reads the screens and flags the mechanical tells: figures without a period, sparklines with too few points, donuts with two parts, several accent tiles, more than five headline figures, charts in a file whose brief says Text, and files with no brief at all. It cannot see whether a chart answers the question; that is the reviewer's job, and the brief is the rubric: read it, then read the screen, and remove whatever does not serve it.

## Layout and composition rules (the ones agents break most)

These came from reviewing real agent output. Each one is a tell that a page was assembled, not designed.

1. **Checkbox vs Switch.** A `Switch` is a setting that takes effect the moment it flips (notifications on, dark mode). Anything that records a state or a selection — a habit done today, a task ticked, a row included — is a `Checkbox`. A list of items with switches down the left edge is wrong.
2. **Icons are furniture, not data.** Card icons are ink on inset (`StatCard` default). At most one tile per view gets `iconTone="accent"`, the one the page leads with. A different colour per card is the signature of machine-made UI. Colour appears in exactly three places: the accent (one primary action, the lead series), green/red (success and danger only), and the chart ramp (data series only).
3. **Every titled section is a `Panel`.** `<Panel title caption actions>` gives the anatomy for free: title and caption left, controls right, one baseline, body below, `p-4`. Use `Card` directly only for things that are not a titled section (a stat tile, a message). A set of like things (integrations, templates, tasks to pick from) is a `CardGroup` of composed cards, inline when they are a list, `columns` when they are a choice. Never hand-build a card header.
4. **Panels in a row are the same height, and their bodies fill.** The grid stretches them (that is the default; never add `items-start`), and the content reaches the bottom: charts get `fill` (`<LineChart fill />`, `<BarChart fill />`), ranked lists get `fill` (`<BarList fill />`), tables are `w-full`. A panel whose lower half is empty, or a chart that stops at 60% of its panel's width, is a bug. Charts have no width cap: they are as wide as the panel.
5. **Buttons are one line.** Label and icon sit on one row, always; pass the icon through `icon=` / `iconEnd=` or as a child, both work. A button whose icon sits above its label is broken, not a variant. Labels never wrap.
6. **Tables fill their container** (`DataTable`, `RecordsTable`, `FilterTable`, `DiffTable` are `w-full`), unless the user asks for a fixed width. Wide tables scroll inside their own `overflow-x-auto`, never the page.
7. **Proximity.** Controls sit next to the thing they act on: filters directly above the list, in one row, sized to their content (`max-w-*`), not stacked full-width; the search input at the row's right end. A comparison's two pickers sit together with "vs" between them, in the panel's `actions`, not in a far corner.
8. **One grid.** Every panel in a row shares the same gutter (`gap-3.5` inside sections, `gap-6` between sections) and left edge. Numbers align right with `tabular-nums`. Labels align left. Nothing is centred unless it is alone.
9. **Rails.** A dashboard or admin app gets `AppSidebar` (grouped menu with counts and sub-menus via `children` (or `submenus="none"` for a flat rail), `expanded` or `rail` variant, the Formic mark in accent at the top, account row at the bottom); a chat app gets `SidebarNav`; a tool that holds things (projects, documents, sites, like a Vercel or Linear sidebar) gets `ProjectSidebar` (workspace switcher, search with ⌘K, New row, collapsible groups with `onAdd`, rows with a `status` dot and a hover menu via `itemActions` / `onItemAction`, a second level (`items[].children`, opened in place under a chevron; the parent is not a page), account menu, `layout="edge"` or `"inset"` with `ProjectInset` as the page card; the app owns open state with `useProjectSidebar()` and `ProjectSidebarTrigger`). All three fill the shell's height. Never build a sidebar from divs.
10. **Empty states and loading** use `LoadingState` / `Skeleton` / `Alert`, never an ad-hoc grey box.
11. **Filters are a `FilterBar`.** Label (`leading="Filters"`), the selects as children, a compare toggle or view switch in `trailing`, search in `search`: one wrapping row, so when it is full the next control goes to the next line. Never a row with `overflow-hidden` or `whitespace-nowrap` that clips the last control. `<FilterBar search={<Input … />} active={n} onClear={…}>` with the selects as children: they share one row and wrap only when they run out of room, each given a width through its `width` prop (`<Select width="w-40" />`, `<Input width="w-56" />`; the default `w-full` is for forms), search pinned right, Clear only while something is applied. One filter per row, each full width, is wrong.
12. **Every chart moves in, once.** Bars grow from the baseline, lines reveal left to right, donut arcs sweep, sparklines draw, ranked bars grow. That is the default on every chart and needs no prop. It honours reduced motion by itself. Pass `animate={false}` only on a chart that re-renders with live data. Never add your own keyframes or a motion library to a chart.
13. **Icons match their label.** Use `iconFor(label)` from `primitives.tsx` for any button, menu item or nav row: `iconFor("Refresh")` → `"retry"`, `iconFor("Export CSV")` → `"download"`, `iconFor("Add user")` → `"user-add"`. If it returns `undefined`, leave the icon off; a decorative random icon is worse than none. Verbs outrank nouns ("Remove filter" is a trash can) and keys match whole words. Reference: refresh/reload/sync → `retry`; export/download → `download`; import/upload → `upload`; add/create/new → `plus`; delete/remove → `trash`; edit/rename → `edit`; save/confirm → `check`; cancel/close → `close`; settings → `gear`; search → `search`; filter → `filter`; share → `share`; print → `print`; schedule/date → `calendar`; sign out → `sign-out`; generate/AI → `sparkles`.
14. **People are `Avatar`s.** A person with a photo gets `src`; without one they get the kind `formic.config.json` chose (`avatar`: `initials`, `doodle`, an illustrated face derived from the name, or `photo`, a placeholder picture), automatically, with no prop. Pass `kind` only when one avatar must differ. Several people are an `AvatarGroup` (`people`, `max`, `ring` = the surface it sits on). Never a grey circle with an icon, never a random stock face.
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

The app's choices live in one file, `src/formic/formic.config.json`: `accent`, `palette` (paper, sage, twilight, clay, ocean, slate, sand, rose, plum, forest, or `custom` with `paletteColor`, the colour the neutrals are tinted toward; the script writes the custom blocks into `themes.css`), `radius` (a preset, `sharp` / `default` / `rounded` / `full`, or a number of pixels 0–32 for the control corner; the six `--radius-*` tokens scale from it, sm ×0.75, chip ×0.9, md +2, card +6, capsule ×2.75, and the script writes the block as `data-radius="custom"`), `corners` (`smooth`, the squircle corners controls carry, or `round`, plain circular arcs), `size`, `theme` (starting theme), `avatar` (people without a `src`: `initials`, `doodle`, or `photo`, a placeholder picture until real ones exist), `sidebar` (one of the three rails on the Sidebar page: `full` = AppSidebar, expanded with sub-menus and a collapse in the header; `inset` = ProjectSidebar with the page as a surface card beside it, `ProjectInset`; `edge` = ProjectSidebar with a hairline edge and a flat page; `topbar` = the full rail with its user row off plus a `TopBar` above the page carrying the title, search, theme, notifications and the account), `sidebarState` (`expanded` or `rail`: full collapses to an icon rail, inset and edge hide behind `ProjectSidebarTrigger`), `font` (one of the approved Google faces, all variable 300–800: Urbanist, Inter, Manrope, Plus Jakarta Sans, DM Sans, Outfit, Figtree, Sora, Geist, Onest, Public Sans, Nunito Sans, Work Sans, Rubik, Lexend, Albert Sans, Hanken Grotesk, Montserrat, Jost, Karla, Archivo, Mulish, Raleway, Bricolage Grotesque, Host Grotesk), `type` (`base`, `lg` or `xl`: the whole type ramp at a 14, 15 or 16px base, controls unchanged), `layout` (`compact` keeps page content in a 64rem column, `medium` 80rem, `full` runs edge to edge; wrap page content in `.page-content`, rails and headers stay outside) and `motion`. Users make them at https://formicai.dev/customize and paste a block that looks like this:

```
Apply this Formic configuration and keep it as the source of truth:
save it as src/formic/formic.config.json, then run
  python3 src/formic/scripts/apply_config.py
{ "accent": "#29E0C2", "palette": "paper", "radius": "rounded", ... }
```

When you receive one: save the JSON exactly as given to `src/formic/formic.config.json`, run the script, restart the dev server, and reply with the ratios it printed. The script does everything deterministically: it fits the accent for both modes (through `set_accent.py`), swaps the font in `tokens.css` and `fonts.css`, writes the `data-*` attributes on `<html>` in the app's `index.html`, and writes `components/config.ts`, which `Avatar`, the rails and the charts read as their prop defaults. Build the app on the rail the config names, and wrap each page's content in `.page-content` so `layout` holds. Do none of that by hand, and do not undo it inline: no `doodle={false}` because you prefer initials, no `defaultVariant="expanded"` when the config says `rail`, no second accent. A user who says "make the corners rounder" or "start in dark mode" is asking for a config change: edit the JSON, run the script. Re-running the installer keeps the config and re-applies it.

## Demo content is ours

When you build a page or a demo, the content is Formic's world: a design studio and its clients, proposals, invoices, retainers, site traffic, agents. Never carry a reference's labels, numbers or copy into a screen, and never invent generic filler ("Lorem", "Product A", "User 1"). A reference is used for the shape it proves, then the content is replaced.

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
10. **Contrast.** Keep WCAG AA in both modes and all ten palettes (and the custom one): text at least 4.5:1, non-text UI at least 3:1.
11. **Icons.** Tabler only, through the shared `Icon` wrapper: `<Icon name="check" size={14} strokeWidth={2} />`. To add one, map a Tabler component into `ICONS` in `primitives.tsx`. Never inline SVG icon paths, never add a second icon package.
12. **Responsive by default.** Fluid roots (`w-full` plus a `max-w-*` cap), wide content scrolls inside its own `overflow-x-auto`, text truncates with `min-w-0 truncate`, touch targets at least 24px. Check the layout at about 360px wide before calling it done.

## What is in the box

**Brand** (`brand.tsx`): FormicMark, BrandIcon (80+ company and social marks). **Helpers**: iconFor(label); `scripts/set_accent.py` and `setAccent()` for the brand colour; `formic.config.json` + `scripts/apply_config.py` for the app's choices (accent, palette, radius in pixels or a preset, corners, size, theme, avatar, sidebar, font, type, layout, motion), read by components through `config.ts`.
**Primitives** (`primitives.tsx`): Icon, Spinner, ShimmerLabel, StreamText, StreamCaret, Skeleton, Avatar (initials, `src` photo, or `doodle` — an illustrated face derived from the name), AvatarGroup (people overlapping with a +N tile), Tooltip, Progress, Separator, Chip, DiffStat, IconButton, SendButton, Switch, Checkbox, Disclosure, GlideMenu, Card, Badge, RadioCheck, AvatarStack, Popover.
**Hooks** (`hooks.ts`): useSequence, useElapsed, useStream, useAnchoredLayer, useModalLayer, useReducedMotion.
**Controls and forms:** Button, Field, Input, Textarea, Select, Switch, Checkbox, FilterBar, Slider (steps, editable readout, value on the thumb) and RangeSlider (two thumbs), OTPInput, FileDropzone, DatePicker, DateRangePicker, Calendar, ColorPicker, InputCopy (read-only value with a copy action), InputGroup + InputField (several fields as one block, label inside the row).
**Overlays:** Modal, Drawer, Toast (`ToastProvider` at the root), DropdownMenu, Popover, Tooltip.
**Feedback and agents:** Alert, Progress, Skeleton, LoadingState, ThinkingIndicator (one line: breathing glyph + a rotating shimmer word, for the gap before a reply), ThinkingState (steps, reasoning, sources), TaskRows, ToolChips.
**Conversation:** ChatThread, MessageBubble, StreamingText, Markdown, CodeBlock, SelectionActions, PromptBar, ChatComposer, ApprovalCard, ApprovalFlow, InsightCards (what the assistant noticed: a carousel of prose with @entity mentions and deltas, a mini chart card, and a follow-up prompt; CompareCard, AnomalyCard, AllocationCard ship, pages take any component), AskUserQuestions (a stepped question flow: numbered options, 1 to 9 shortcuts, single or multi-select, Other row, free text, Skip, `onComplete` with every answer), RecommendationCard, ContextCards, ChatApp.
**Dashboard:** Panel (the titled card), StatCard (layouts label-first / value-first / chart-middle / inline / tile with a `period` chip / key with a coloured rule so headline figures double as a chart's legend, compact `size="sm"` tiles, trend as a line, capsule bars or a two-series stack, a progress `ring`, `align="center"` heroes, a `chart` slot), MetricRow (`leading` tile or a 48px DonutChart, `progress` trailing or `progressLayout="under"` for a full-width bar beneath, `meta` share after the value, `big`, `trend` as bars or `trendKind="line"`), StatStrip (one bar of three or four headline figures with icon tiles and hairline dividers, `tone` colouring a result that is itself a gain or loss), Delta, Progress with `segments` (and `vertical` for a ladder lit from the bottom; `tone="ink"` for a neutral bar), Rating (stars, half-star clipped, orange), Shortcut (a keyboard shortcut as keycaps, `keys={["⇧", "⌘", "N"]}`, `quiet` to show on its row's hover; never a run of symbols in a mono face), ShareBar (one bar split into its parts, each on a tick with its share; the rows under it are MetricRows with `meta`), BarChart (`highlight`, values above each bar with `valuePosition="bar"`, `axis` with dashed gridlines at round values and `thin` bars for a month-by-month stack, values below zero hang from the baseline in muted ink, `horizontal` for one row per label with the axis along the bottom), ScatterChart (two quantities per thing and a third as the mark's size, crosshair, every field in the tooltip), ActivityCalendar (a year of days as squares, one column a week, the accent at four strengths; fluid columns, a single keyboard stop walked with the arrows, the total as text; `seedActivity()` makes demo data), LineChart (a series with `style: "dashed"` is the comparison behind the real one, `endMarker` rings the last value, `tooltip="shared"` lists every series at a label under a crosshair, `area={false}` for more than two series, `curve="step"` or `"smooth"`, `axis`, `floor={false}` to start the scale at the lowest value, `points="hover"` for a long series, `backdrop`, `guides`; pair it with segmented `Tabs` for a range picker), RadarChart (shares across a few axes, one polygon per series, a tooltip with a `detail` line per vertex), MiniBars, DonutChart (a progress ring, or `segments` for a share of the whole with the leading part named in the centre and a legend whose rows bring each part to the centre; `legend="list"` puts the rows beside the ring with each count and share, `center` puts a total in the middle), Sparkline, ChartLegend, CountUp, Gauge, BarList (`rank`, `axis`), PrivacyScope / PrivacyToggle / Masked. The gallery's Dashboard page composes two screens from these (Studio overview, Studio finances); copy their shapes rather than inventing tiles.
**Data and structure:** DataTable (the admin records list: declared `columns` with `render`, `selectable` rows with a mixed header box, a `toolbar` slot for search / filters / the one accent action, `actions` per row with `RowActions`, `pageSize` + `total` for the "Showing 1 to 5 of 25" footer with Pagination; cell helpers PersonCell, IconCell, ProgressCell, CountCell, StatusCell; Badge has an `orange` tone for pending), RecordsTable (the AI spreadsheet), FilterTable, DiffTable, Accordion (`variant="grouped"` for rows on the page), Steps, Timeline, Flowchart (an automation or agent workflow on a dotted canvas: `nodes` of kind trigger / action / condition / end with `x`, `y`, `edges` with `label`, drag, pan, zoom, condition chips that open menus, `onMove` and `onRuleChange` to persist), and the card family in `cards.tsx`: CardGroup (`columns` 1 to 4, or `orientation="inline"` for one surface with hairline-divided rows) with Card + CardHeader, CardMedia (icon tile or picture), CardTitle, CardDescription, CardFooter, CardButton; the same markup is a stacked card in a grid and a row in a list.
**Navigation:** Tabs (underline for page sections, segmented for views of one thing, subtle for filters), Pagination, Breadcrumbs, Menubar, TopBar (the strip above a page: title, a leading trigger, search, theme, notifications, the account menu; pair with `<AppSidebar user={null} />` for the rail-plus-bar shell), AppSidebar (dashboard rail, expanded / rail, sub-menus), ProjectSidebar (workspace rail: switcher, search, groups, row menus, edge / inset), SidebarNav (chat rail), SearchList.

**App shell.** Rails fill their parent's height, so any page with one uses this skeleton (never give the rail a fixed height, never put it inside a scrolling page). `AppSidebar` for dashboards and admin apps, `ProjectSidebar` for project and document tools (with `<ProjectInset>` as the main element when `layout="inset"`), `SidebarNav` for chat:

```tsx
<div className="flex h-dvh">
  <AppSidebar sections={nav} active={page} onSelect={setPage} />
  <main className="min-w-0 flex-1 overflow-y-auto p-6">…</main>
</div>
```

Typical screens: a chat app is `SidebarNav` + `ChatThread` + `PromptBar` (`status="streaming"` + `onStop` while an answer streams: Stop button and a queue for drafts; `history`, `suggestion`, `suggestions` for recall and prompts) + `ThinkingIndicator` before a reply + `ToastProvider`; a dashboard is `AppSidebar` + a grid of `StatCard` and `Panel`s holding `BarChart` / `LineChart` / `BarList` (with `fill`) / `Gauge` and `MetricRow` breakdowns; an agent run is `ThinkingState` or `TaskRows` with `ApprovalCard` / `ApprovalFlow` for human-in-the-loop moments and `AskUserQuestions` when the agent needs a decision (which file, which approach, how far) before it continues.

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
