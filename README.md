# Formic AI Design System

A token-driven React + Tailwind v4 design system for AI product interfaces: chat threads, prompt bars, streaming text, agent traces, approval cards, and the whole app shell around them.

**[Live site](https://formicai.dev/)** · **[Component gallery](https://formicai.dev/preview.html)**

- 50+ components, 5 palettes x light/dark
- Tokens only: no hardcoded colors, sizes, radii, shadows, or easings
- WCAG AA verified by script across every mode and palette
- Flat elevation (hairline borders, no drop shadows), one easing curve
- Two peer dependencies: React and Tabler icons

---

## Install

Formic is vendored, not published to npm: you copy the files into your project and own them. The standard location is `src/formic/` (`styles/` + `components/`), which every instruction file and AI rule assumes.

### 1. One command (recommended)

**New project.** Creates a Vite + React + Tailwind v4 app with Formic wired in, a demo dashboard, and the files AI coding tools read. Nothing to edit by hand.

```bash
curl -fsSL https://formicai.dev/install.sh | bash -s -- --new my-app
cd my-app && npm run dev
```

**Existing project.** From its root: copies the system into `src/formic/` and writes the instruction files. Re-run to update.

```bash
curl -fsSL https://formicai.dev/install.sh | bash
```

### 2. By hand

```bash
git clone --depth 1 https://github.com/eyosiyasketema1/formic-design-system.git /tmp/formic
mkdir -p your-project/src/formic
cp -r /tmp/formic/styles /tmp/formic/components your-project/src/formic/
cp /tmp/formic/AGENTS.md your-project/AGENTS.md
```

### 3. Download the ZIP

Green **Code** button on this repo, then **Download ZIP**, and copy `styles/` and `components/` into `your-project/src/formic/`.

### Peer dependencies

```bash
npm install react react-dom @tabler/icons-react
npm install @dicebear/core @dicebear/notionists   # only for doodle avatars; loaded on demand
```

Tailwind v4 is required for the utility bridge. `styles/formic.css` bundles everything after Tailwind (tokens, palettes, bridge, and the `sidebar.css` / `records.css` component sheets); import the individual files instead if you want to leave something out.

---

## Set up

Import the stylesheets in this order in your global CSS:

```css
@import "./formic/styles/fonts.css";    /* first: the Urbanist font */
@import "tailwindcss";
@import "./formic/styles/formic.css";   /* tokens, palettes, Tailwind bridge, component sheets */
```

Then compose:

```tsx
import ChatThread from "./formic/components/ChatThread";
import PromptBar from "./formic/components/PromptBar";

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

Palettes are token overrides: `data-palette="sage | twilight | clay | ocean"` (default is paper). Two more global scales work the same way: `data-radius="sharp | rounded | full"` and `data-size="comfortable | spacious"`. For a runtime brand color, call `setAccent("#7c3aed")` from `components/theme.ts`, which derives AA-passing light and dark variants; `setAccent(null)` reverts.

All of these choices, plus the avatar fallback, the sidebar's first variant and chart motion, live in one file: `formic.config.json`. Make them at [formicai.dev/customize](https://formicai.dev/customize) (light and dark side by side), copy the block it gives you into your AI tool, or edit the file and run `python3 src/formic/scripts/apply_config.py`. It fits the accent for both modes, writes the `data-*` attributes on `<html>` and the component defaults in `components/config.ts`. Re-running the installer keeps the file and re-applies it.

---

## Components

**Conversation:** ChatThread, MessageBubble, StreamingText, PromptBar, ChatComposer, Markdown, CodeBlock, SelectionActions, ApprovalCard, ApprovalFlow, RecommendationCard, ContextCards, ChatApp

**Feedback and agents:** ThinkingState, TaskRows, ToolChips, LoadingState, Progress, Skeleton, Alert, Toast

**Forms:** Field, Input, Textarea, Select, Switch, Checkbox, FilterBar, Slider, OTPInput, FileDropzone, DatePicker, DateRangePicker, Calendar, ColorPicker

**Overlays:** Modal, Drawer, DropdownMenu, Popover, Tooltip

**Dashboard:** Panel, StatCard, MetricRow, Delta, BarChart, LineChart, DonutChart, Sparkline, ChartLegend, CountUp, Gauge, BarList, PrivacyScope, PrivacyToggle, Masked

**Data and structure:** RecordsTable, FilterTable, DiffTable, Accordion, Steps, Timeline

**Navigation:** Tabs, Pagination, Breadcrumbs, Menubar, AppSidebar, SidebarNav, SearchList

**Brand** (`components/brand.tsx`, `components/brand-logos.tsx`): FormicMark, BrandIcon (81 monochrome marks), BrandLogo (101 real full-colour logos)

**Primitives** (`components/primitives.tsx`): Icon, Spinner, StreamText, Skeleton, Avatar (photo, doodle, initials), AvatarGroup, Tooltip, Progress, Separator, Chip, Badge, IconButton, SendButton, Switch, Checkbox, Disclosure, GlideMenu, Card, Popover, AvatarStack

Open the [gallery](https://formicai.dev/preview.html): one page per component with a live playground, and global controls for theme, palette, accent, radius and size. Deep-link any component as `preview.html#/button`.

---

## Using with AI tools

A rules file alone is not enough: if the components are not in the project, every agent (Claude Code, Cursor, Copilot, Codex) falls back to generic Tailwind no matter how good the prompt. So the install gives the agent the code and the rules together.

**1. Get a project with Formic inside.** New: `curl -fsSL https://formicai.dev/install.sh | bash -s -- --new my-app`. Existing, from its root:

```bash
curl -fsSL https://formicai.dev/install.sh | bash
```

It copies `styles/` and `components/` into `src/formic/` (pass another folder as the first argument if you prefer) and writes `AGENTS.md`, `.cursor/rules/formic-design-system.mdc`, `.github/copilot-instructions.md`, `.claude/skills/formic-design-system/SKILL.md`, and a Formic section in `CLAUDE.md`. Re-run it to update; it never overwrites your own files. Read [`install.sh`](install.sh) first if you like to know what you are piping into bash.

**2. Wire the CSS** (Tailwind v4, three lines in this order) and `npm install @tabler/icons-react`. With `--new` this is already done.

```css
@import "./formic/styles/fonts.css";    /* first: the Urbanist font */
@import "tailwindcss";
@import "./formic/styles/formic.css";   /* tokens, palettes, Tailwind bridge, component sheets */
```

**3. Restart your tool and name the system in the first prompt:**

> Use Formic (src/formic). Read AGENTS.md first and follow its procedure. Then build …

**4. Check the result.** Formic output imports from `src/formic/components` and uses `text-ink`, `bg-surface`, `text-caption`, `rounded-card`. Generic output has hex colours, `text-sm`, `bg-gray-100`, `shadow-lg`, `font-bold`. If you get the second kind, paste `AGENTS.md` into the chat and ask for a redo.

Per tool: **Claude Code** reads `CLAUDE.md` and the project skill (add the skill globally with `mkdir -p ~/.claude/skills/formic-design-system && curl -o ~/.claude/skills/formic-design-system/SKILL.md https://raw.githubusercontent.com/eyosiyasketema1/formic-design-system/main/skill/SKILL.md`). **Cursor** reads the `.mdc` rule and `AGENTS.md`; use Agent mode. **Copilot** reads `.github/copilot-instructions.md` and `AGENTS.md`. **Codex** and most CLI agents read `AGENTS.md`. **Claude desktop / claude.ai:** download [`skill/formic-design-system.skill`](skill/formic-design-system.skill), drop it into a chat, click **Save skill**.

---

## Contributing

Contributions are welcome. **[CONTRIBUTING.md](CONTRIBUTING.md)** covers what gets merged, what's a maintainer decision, and how to pass review on the first try. `CLAUDE.md` holds the design rules themselves; `AGENTS.md` is the condensed version for AI coding tools.

Bugs, questions, and proposals all go through [issues](https://github.com/eyosiyasketema1/formic-design-system/issues).

Before opening a PR:

```bash
python3 scripts/qa_check.py
```

It checks forbidden patterns, WCAG contrast for every mode and palette, token drift between `styles/` and `preview.html`, and that components compile. The same gate runs in CI on every pull request, so work is not done while it fails.

## Repo map

```
styles/          fonts.css, formic.css (imports the rest), tokens.css (source of truth), themes.css, tailwind-theme.css, brands.css, sidebar.css, records.css
components/      React components + primitives.tsx, hooks.ts, theme.ts
skill/           SKILL.md and formic-design-system.skill, the installable AI skill
scripts/         qa_check.py (the QA gate), check_sri.py, set_accent.py (brand colour → both modes), apply_config.py (formic.config.json → tokens, html attributes, component defaults)
.github/         CI workflow, PR template, issue forms
preview.html     standalone gallery, opens in any browser with no build
index.html       the landing page
CONTRIBUTING.md  how to contribute
CLAUDE.md        the design rules and QA workflow
AGENTS.md        instructions for AI tools consuming the system
install.sh       one-command install into a consuming project (also at formicai.dev/install.sh)
```

## License

MIT. See [LICENSE](LICENSE).
