# Formic AI Design System

A reusable design system for web projects: CSS design tokens + React (Tailwind) components.

## Structure

```
├── styles/
│   └── tokens.css       # Design tokens (colors, etc.) + shared keyframes — source of truth
├── components/
│   └── LoadingState.tsx # Pixel-grid loader (variants: Drive, Dots, Orbit, Surfer)
└── README.md
```

## Stack

- **React** (client components, TypeScript)
- **Tailwind CSS** with custom theme utilities (`bg-ink`, `text-ink-3`, `shadow-overlay`)
- **CSS variables** for theming (`--ink`, `--ink-3`, `--tooltip-bg`, …)
- **Typography**: [Urbanist](https://fonts.google.com/specimen/Urbanist) (Google Fonts, variable 300–800) as the default sans, via `--font-sans`
- **Icons**: [Tabler Icons](https://tabler.io/icons) (`@tabler/icons-react`, peer dependency) via the shared `Icon` wrapper — components use `<Icon name="…" />`, never direct Tabler imports

## Using in a new project

1. Copy the `styles/` folder and import in order (Tailwind v4 project):

   ```css
   @import "tailwindcss";
   @import "./styles/tokens.css";
   @import "./styles/themes.css";        /* optional: the 5 palettes */
   @import "./styles/tailwind-theme.css"; /* generates text-ink, bg-hover, text-body, … */
   ```

2. Copy the components you need from `components/`.

## Using with AI tools (Claude, etc.)

Point the tool at this folder or repo and say: *"Use the Formic AI Design System — follow the tokens in `styles/tokens.css` and the component patterns in `components/`."*

## Components

| Component | Purpose | Variants |
|---|---|---|
| `primitives` | Shared atoms: `Icon`, `Spinner`, `ShimmerLabel`, `StreamText`, `StreamCaret`, `Skeleton`, `Avatar`, `Tooltip`, `Progress`, `Separator`, `Chip`, `DiffStat`, `IconButton`, `SendButton`, `Switch`, `Disclosure`, `GlideMenu`, `Card`, `Badge`, `RadioCheck`, `AvatarStack`, `Popover`, `fadeUp`/`popIn` | — |
| `hooks` | Shared hooks: `useSequence` (staged reveals), `useElapsed` (live clock), `useStream` (word-by-word reveal), `useAnchoredLayer` (anchored popover engine), `useModalLayer` (dialog trap/lock/Escape) | — |
| `Button` | The workhorse control: sizes xs/sm/md/lg, shapes square/pill, auto-sized icons (leading/trailing), fullWidth, `href` link rendering, opacity-based disabled, loading | `primary`, `secondary`, `outline`, `ghost`, `link`, `destructive`, `destructive-soft`, `accent`, `accent-soft`, `success` |
| `LoadingState` | Loader for long-running work: pixel grid + shimmer label + elapsed timer | `Drive`, `Dots`, `Orbit`, `Surfer` |
| `ThinkingState` | Expandable agent trace with animated timeline | `Steps`, `Reasoning`, `Search`, `Coding` |
| `ApprovalCard` | Human-in-the-loop question card: radio/checkbox answers, pager dots, send arrow | — |
| `StreamingText` | AI response stream: blur-in words, inline citations, sources list, follow-ups | — |
| `ToolChips` | Agent run as compact rows: expandable tool calls + file-diff chips with hover previews | — |
| `TaskRows` | Agent tasks as expandable rows with status badges (ring/failed/completed) | `Capsules`, `List` |
| `ChatComposer` | Chat panel: tabs, reply thread, composer with send — analytics via `onSend` callback | — |
| `PromptBar` | Full composer: @ sources, / commands, model picker with rainbow sweep, dictation, attachments | `Rounded`, `Pill` |
| `RecommendationCard` | Ranked recommendation with confidence meter, alternatives drawer, accept flow | — |
| `ContextCards` | Retrieved context chunks with file-type badges and source chips | — |
| `DiffTable` | Proposed edit as a reviewable diff — toggle each removal/addition, then apply | — |
| `RecordsTable` | AI spreadsheet grid: property config popovers, AI columns, staggered calculation, sort/resize/select (needs `styles/records.css`) | — |
| `FilterTable` | Task table with status-chip filters — rows collapse/expand; counts derive from data | — |
| `SidebarNav` | Workspace navigation: switcher menu, searchable chat history, icon-aligned collapse (needs `styles/sidebar.css`) | — |
| `SearchList` | Command search with live filtering, gliding results, empty state | — |
| `SelectionActions` | Contextual AI bar beneath selected text: quick actions, free-text edits, streamed rewrite with keep/discard | — |
| `ChatThread` | Conversation column: user bubbles + flat assistant replies, streamed final message (exports `MessageBubble`) | — |
| `CodeBlock` | AI code output: dependency-free syntax highlighting on theme tokens, copy action, optional line numbers | `ts`, `js`, `py`, `json`, `bash`, `css`, `text` |
| `Input` | Form trio (exports `Field`, `Textarea`): Field wires label/hint/error aria onto its control; quiet field focus | sizes `sm`, `md` |
| `Select` | Combobox on the quiet field style: portal listbox matched to trigger width, keyboard-driven via `aria-activedescendant` | sizes `sm`, `md` |
| `Modal` | Portal dialog on the system scrim: focus trap + restore, scroll lock, Escape/backdrop dismiss, footer action row | `sm`, `md`, `lg` |
| `Toast` | App notifications (exports `ToastProvider`, `useToast`): bottom-right stack, auto-dismiss with hover pause, optional action | tones `neutral`, `success`, `error` |
| `DropdownMenu` | Standard action menu around any trigger: keyboard-driven, dividers, disabled + destructive items, start/end align | — |
| `Alert` | Inline callout on the system tints with optional dismiss — copy stays ink so every palette keeps AA | `neutral`, `info`, `success`, `warning`, `error` |
| `Tabs` | APG tablist with roving tabindex, arrow-key activation, and a sliding underline; scrolls on narrow viewports | — |
| `Pagination` | Numbered pages with sibling windows + gap ellipses, `aria-current` on the active page, edge-disabled prev/next | — |
| `Breadcrumbs` | Path trail: middle collapses into a DropdownMenu, current page carries `aria-current`, links or SPA callbacks | — |
| `Markdown` | Dependency-free renderer for AI output: headings, emphasis, safe links, nested lists, quotes, scrollable tables, fenced code via CodeBlock | — |
| `FileDropzone` | Drag-and-drop upload with browse fallback: accept/size validation with announced rejections, file chips with remove | — |
| `theme` | Runtime theming utilities: `setAccent(color)` re-accents the system live (AA-fitted light+dark variants), `deriveAccentVariants` for build-time use | — |
| `Accordion` | Stacked disclosure rows on the Disclosure primitive — single-open or multiple, inert closed content | — |
| `Slider` | Native range input drawn with tokens (`.primitive-slider`): platform keyboard/touch, optional value readout, Field-ready | — |
| `OTPInput` | One-time-code cells on the quiet field style: typing/paste/autofill distribute, backspace walks, Field-ready | — |
| `Steps` | Wizard progress: ink-filled completed circles, accent-ringed current with `aria-current="step"`, clickable go-back | horizontal, `vertical` |
| `Timeline` | Event history on a rail: toned dots, mono times, staggered entrance | — |
| `Drawer` | Side panel on the shared modal machinery (trap, restore, layered Escape, scroll lock), slides from either edge | `right`, `left` |
| `Menubar` | Horizontal bar of DropdownMenus with a shared `(menuKey, itemKey)` selection callback | — |
| `Calendar` | Dependency-free APG month grid: roving focus, arrows/PageUp/Down/Home/End, min/max, Intl locale labels | `single`, `range` |
| `DatePicker` | Calendar behind the quiet field trigger via Popover — focus moves into the grid, clearable, Field-ready | sizes `sm`, `md` |
| `DateRangePicker` | Span selection: start pick, live preview band, closes on completion; `Intl.formatRange` label, clearable, Field-ready | sizes `sm`, `md` |

## Theming

Light and dark palettes ship in `styles/tokens.css`. Dark mode activates automatically from the OS (`prefers-color-scheme`) or explicitly via `<html data-theme="dark">`; `data-theme="light"` forces light. Components never branch on theme — they only read the CSS variables, so both modes come for free.

Five color themes ship in `styles/themes.css` (load it after `tokens.css`), each with light + dark variants: **Paper** (default warm neutral), **Sage** (muted green), **Twilight** (indigo), **Clay** (terracotta), **Ocean** (teal). Activate with `<html data-palette="sage">` — no attribute means Paper. Palette and dark mode combine freely (e.g. `data-palette="ocean" data-theme="dark"`).

For an arbitrary brand accent at runtime, call `setAccent("#e11d48")` from `components/theme.ts` — it derives a light-mode and a dark-mode variant that both pass WCAG AA (walking lightness against worst-case surfaces) and injects them with the same structure as the token sheets, so mode switching keeps working and `--accent-tint` re-derives itself. `setAccent(null)` returns to the active palette. The preview's color picker (next to the palette swatches) is built on exactly this.

## Conventions

- Tokens are CSS variables defined in `styles/tokens.css`; components never hardcode colors.
- Components accept real data via props (`rows`, `questions`, `tokens`, `sources`, …); the built-in demo content is only the default.
- Every animated component respects `prefers-reduced-motion`.
- Components are responsive by default: fluid roots (`w-full` + `max-w-*` cap), internal `overflow-x-auto` for wide content, truncating text — they adapt to whatever container you give them.
- Loaders use `role="status"` for accessibility.
