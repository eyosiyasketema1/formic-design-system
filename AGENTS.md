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
@import "./formic/styles/fonts.css";          /* first: the Urbanist font */
@import "tailwindcss";
@import "./formic/styles/tokens.css";          /* adjust the relative path to src/formic */
@import "./formic/styles/themes.css";          /* optional: 5 palettes */
@import "./formic/styles/tailwind-theme.css";  /* generates text-ink, bg-surface, text-body, ... */
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

**Primitives** (`primitives.tsx`): Icon, Spinner, ShimmerLabel, StreamText, StreamCaret, Skeleton, Avatar, Tooltip, Progress, Separator, Chip, DiffStat, IconButton, SendButton, Switch, Disclosure, GlideMenu, Card, Badge, RadioCheck, AvatarStack, Popover.
**Hooks** (`hooks.ts`): useSequence, useElapsed, useStream, useAnchoredLayer, useModalLayer, useReducedMotion.
**Controls and forms:** Button, Field, Input, Textarea, Select, Switch, Slider, OTPInput, FileDropzone, DatePicker, DateRangePicker, Calendar, ColorPicker.
**Overlays:** Modal, Drawer, Toast (`ToastProvider` at the root), DropdownMenu, Popover, Tooltip.
**Feedback and agents:** Alert, Progress, Skeleton, LoadingState, ThinkingState, TaskRows, ToolChips.
**Conversation:** ChatThread, MessageBubble, StreamingText, Markdown, CodeBlock, SelectionActions, PromptBar, ChatComposer, ApprovalCard, ApprovalFlow, RecommendationCard, ContextCards, ChatApp.
**Dashboard:** StatCard, MetricRow, Delta, BarChart, LineChart, DonutChart, Sparkline, ChartLegend, CountUp, Gauge, BarList, PrivacyScope / PrivacyToggle / Masked.
**Data and structure:** RecordsTable (needs `styles/records.css`), FilterTable, DiffTable, Accordion, Steps, Timeline.
**Navigation:** Tabs, Pagination, Breadcrumbs, Menubar, SidebarNav (needs `styles/sidebar.css`), SearchList.

Typical screens: a chat app is `SidebarNav` + `ChatThread` + `PromptBar` + `ToastProvider`; a dashboard is a grid of `StatCard` with `BarChart` / `LineChart` / `BarList` / `Gauge` and `MetricRow` breakdowns inside `Card`; an agent run is `ThinkingState` or `TaskRows` with `ApprovalCard` / `ApprovalFlow` for human-in-the-loop moments.

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
