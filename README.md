# Formic AI Design System

A token-driven React + Tailwind v4 design system for AI product interfaces: chat threads, prompt bars, streaming text, agent traces, approval cards, and the whole app shell around them.

**[Live site](https://eyosiyasketema1.github.io/formic-design-system/)** · **[Component gallery](https://eyosiyasketema1.github.io/formic-design-system/preview.html)**

- 40+ components, 5 palettes x light/dark
- Tokens only: no hardcoded colors, sizes, radii, shadows, or easings
- WCAG AA verified by script across every mode and palette
- Flat elevation (hairline borders, no drop shadows), one easing curve
- Two peer dependencies: React and Tabler icons

---

## Install

Formic is vendored, not published to npm: you copy the files into your project and own them. Three ways to get them.

### 1. Clone the repo

```bash
git clone https://github.com/eyosiyasketema1/formic-design-system.git
cp -r formic-design-system/styles     your-project/src/styles
cp -r formic-design-system/components your-project/src/components
```

### 2. Copy only what you need (no git history)

```bash
npx degit eyosiyasketema1/formic-design-system/styles     your-project/src/styles
npx degit eyosiyasketema1/formic-design-system/components your-project/src/components
```

### 3. Download the ZIP

Green **Code** button on this repo, then **Download ZIP**, and copy `styles/` and `components/` into your project.

### Peer dependencies

```bash
npm install react react-dom @tabler/icons-react
```

Tailwind v4 is required for the utility bridge. Some components need one extra stylesheet: `RecordsTable` uses `styles/records.css`, `SidebarNav` uses `styles/sidebar.css`.

---

## Set up

Import the stylesheets in this order in your global CSS:

```css
@import "tailwindcss";
@import "./styles/tokens.css";         /* source of truth: tokens, keyframes, primitives */
@import "./styles/themes.css";         /* optional: the 5 palettes */
@import "./styles/tailwind-theme.css"; /* generates text-ink, bg-hover, text-body, ... */
```

Then compose:

```tsx
import ChatThread from "./components/ChatThread";
import PromptBar from "./components/PromptBar";

export default function Chat() {
  return (
    <>
      <ChatThread messages={messages} />
      <PromptBar onSend={send} />
    </>
  );
}
```

Wrap the app in `<ToastProvider>` if you use toasts.

### Theming

Light is the default everywhere. Dark is opt in:

```html
<html data-theme="dark">
```

Palettes are token overrides: `data-palette="sage | twilight | clay | ocean"` (default is paper). For a runtime brand color, call `setAccent("#7c3aed")` from `components/theme.ts`, which derives AA-passing light and dark variants; `setAccent(null)` reverts.

---

## Components

**Conversation:** ChatThread, MessageBubble, StreamingText, PromptBar, ChatComposer, Markdown, CodeBlock, SelectionActions, ApprovalCard, RecommendationCard, ContextCards, ChatApp

**Feedback and agents:** ThinkingState, TaskRows, ToolChips, LoadingState, Progress, Skeleton, Alert, Toast

**Forms:** Field, Input, Textarea, Select, Switch, Slider, OTPInput, FileDropzone, DatePicker, DateRangePicker, Calendar

**Overlays:** Modal, Drawer, DropdownMenu, Popover, Tooltip

**Data and structure:** RecordsTable, FilterTable, DiffTable, Accordion, Steps, Timeline

**Navigation:** Tabs, Pagination, Breadcrumbs, Menubar, SidebarNav, SearchList

**Primitives** (`components/primitives.tsx`): Icon, Spinner, StreamText, Skeleton, Avatar, Tooltip, Progress, Separator, Chip, Badge, IconButton, SendButton, Switch, Disclosure, GlideMenu, Card, Popover, AvatarStack

Open the [gallery](https://eyosiyasketema1.github.io/formic-design-system/preview.html) to see them all running, and switch theme, palette, and accent live.

---

## Using with AI tools

The repo ships a ready-made skill in [`skill/SKILL.md`](skill/SKILL.md), and agent instructions in [`AGENTS.md`](AGENTS.md).

**Claude desktop or claude.ai:** download [`skill/formic-design-system.skill`](skill/formic-design-system.skill), drop it into a chat, and click **Save skill**.

**Claude Code:** put `SKILL.md` in your skills folder and it loads automatically.

```bash
mkdir -p ~/.claude/skills/formic-design-system
curl -o ~/.claude/skills/formic-design-system/SKILL.md \
  https://raw.githubusercontent.com/eyosiyasketema1/formic-design-system/main/skill/SKILL.md
```

**Cursor, Copilot, or any coding agent:** keep `AGENTS.md` at your project root, or paste this prompt:

> Use the Formic AI Design System. Read `styles/tokens.css` for the tokens and follow the component patterns in `components/`. Tokens only: never hardcode colors, font sizes, radii, shadows, or easings. Type scale is a 14px base integer ramp (`text-body`, `text-caption`, `text-title`, ...). `font-medium` is the default weight, `font-semibold` the maximum. Elevation is hairline borders, never drop shadows. One easing: `var(--ease-out-quint)`.

---

## Contributing

`CLAUDE.md` holds the non-negotiable design rules and the mandatory QA workflow for anyone (human or agent) changing this repo. Before committing:

```bash
python3 scripts/qa_check.py
```

It checks forbidden patterns, WCAG contrast for every mode and palette, token drift between `styles/` and `preview.html`, and that components compile. Work is not done while it fails.

## Repo map

```
styles/          tokens.css (source of truth), themes.css, tailwind-theme.css, sidebar.css, records.css
components/      React components + primitives.tsx, hooks.ts, theme.ts
skill/           SKILL.md and formic-design-system.skill, the installable AI skill
scripts/         qa_check.py, the QA gate
preview.html     standalone gallery, opens in any browser with no build
index.html       the landing page (GitHub Pages)
CLAUDE.md        working rules for contributors
AGENTS.md        instructions for AI tools consuming the system
```

## License

MIT. See [LICENSE](LICENSE).
