# AI Design System

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
- **Typography**: [Questrial](https://fonts.google.com/specimen/Questrial) (Google Fonts) as the default sans, via `--font-sans`
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

Point the tool at this folder or repo and say: *"Use my AI Design System — follow the tokens in `styles/tokens.css` and the component patterns in `components/`."*

## Components

| Component | Purpose | Variants |
|---|---|---|
| `primitives` | Shared atoms: `Icon`, `Spinner`, `ShimmerLabel`, `StreamText`, `StreamCaret`, `Chip`, `DiffStat`, `IconButton`, `SendButton`, `Disclosure`, `GlideMenu`, `Card`, `Badge`, `RadioCheck`, `AvatarStack`, `Popover`, `fadeUp`/`popIn` | — |
| `hooks` | Timing utilities: `useSequence` (staged reveals), `useElapsed` (live clock), `useStream` (word-by-word reveal) | — |
| `Button` | The workhorse control: sizes sm/md, disabled + loading states, optional icon | `primary`, `secondary`, `ghost`, `destructive`, `accent`, `success` |
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

## Theming

Light and dark palettes ship in `styles/tokens.css`. Dark mode activates automatically from the OS (`prefers-color-scheme`) or explicitly via `<html data-theme="dark">`; `data-theme="light"` forces light. Components never branch on theme — they only read the CSS variables, so both modes come for free.

Five color themes ship in `styles/themes.css` (load it after `tokens.css`), each with light + dark variants: **Paper** (default warm neutral), **Sage** (muted green), **Twilight** (indigo), **Clay** (terracotta), **Ocean** (teal). Activate with `<html data-palette="sage">` — no attribute means Paper. Palette and dark mode combine freely (e.g. `data-palette="ocean" data-theme="dark"`).

## Conventions

- Tokens are CSS variables defined in `styles/tokens.css`; components never hardcode colors.
- Components accept real data via props (`rows`, `questions`, `tokens`, `sources`, …); the built-in demo content is only the default.
- Every animated component respects `prefers-reduced-motion`.
- Components are responsive by default: fluid roots (`w-full` + `max-w-*` cap), internal `overflow-x-auto` for wide content, truncating text — they adapt to whatever container you give them.
- Loaders use `role="status"` for accessibility.
