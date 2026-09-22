# Changelog

Formic is vendored, so a version is the state of `main` you copied. `src/formic/VERSION` in an app records which one; re-running the installer moves it forward. Versions follow semver: while 0.x, a minor bump can change an API.

## 0.4.0 · 2026-09-22

### Added

- **`npx formicai`, the command line** (npm package `formicai`, no dependencies, Node 20+): `init` (an existing project, or `--new <dir>` for a Vite + React + Tailwind v4 app; `--minimal` for the base only; `--eslint-ignore`; `--dry-run`), `add <name…>` (one component and only what it needs, typo suggestions, `--dry-run`, `--overwrite`), `update` (a sha256 lock tells your edits from upstream changes; diffs shown, edited files kept unless `--force`), `doctor` (one line per check and the exact fix for every ✗), `gates`, `inventory`, `scope add | remove | list`, `migrate <file…>`. It writes `components.json` with the `@formic` registry and a `formic` section in `package.json` (`dir`, `srcDir`, `scope`, `legacy`).
- **The registry**: one JSON per component, built from the sources by `scripts/build_registry.py` (imports become dependencies) and served at `https://formicai.dev/r/<name>.json` with `registry.json` as the index; the gate refuses a stale registry or an undeclared import.
- **Existing projects**: `init` marks the app's source as legacy; the gates, the pre-commit hook and the inventory leave legacy folders alone until `formicai scope add <folder>` moves them into scope. `formicai migrate` runs the mechanical codemods (Tailwind palette classes to tokens, off-scale type, radii and shadows to the scale, raw buttons and inputs to `Button`, `Field` and `Input`, lucide icons to `Icon`) and leaves a `formic-todo` wherever it cannot decide. `doctor` notes a second UI kit (icon set, component or chart library, `components/ui`, colours in `tailwind.config`) with its next step.
- **Proof for migrations**: `scripts/visual_check.sh <app> before | after | compare` screenshots every route at two viewports in light and dark and compares pixels, with an HTML report.
- **CI**: an install matrix (three fixture projects on Ubuntu and macOS, through the CLI and the older install script), a CLI smoke test, and a publish workflow that pushes the CLI to npm on every GitHub release.
- Gates: `formic_check.py --inventory`, `--scope`, `--legacy`, `--config=package.json`; the hook checks only the files being committed.

### Changed

- The install command on the site, in the README, AGENTS.md and the skill is `npx formicai init`; `install.sh` keeps working for the old link.
- The installer (both paths) installs the DiceBear packages, detects `src/` or `app/` instead of assuming `src`, and prints the ESLint ignore to add; the scaffold's `vite.config.ts` resolves the `@` alias its `tsconfig.json` declares.
- AGENTS.md: "Migrating an existing app" rewritten around the commands, with the order (shell first, app kept in light mode until then) and why.
- Removed the dangling `eslint-disable react-hooks/*` comments in components (they error on a host without that plugin).

## 0.3.0 · 2026-09-20

### Breaking

- **Nothing moves on its own.** `PromptBar`, `ThinkingState`, `TaskRows` and `ToolChips` no longer run their gallery walkthroughs by default: menus stay closed, traces show as finished, statuses stay what the row says, rows are all there. Pass `demo` to get the old self-running behaviour (the gallery does); an app never should. `ThinkingState` gains `working` and `expanded` so the real state is a prop.
- Content layout defaults to `full`; `compact` and `medium` are the opt-ins.

### Added

- `Button` `icon` / `iconEnd` take an icon name as well as an element (`icon="plus"`), so a name can never land in the label as text.
- Installer: `FORMIC_BRANCH=staging` installs the staging branch, to try what staging.formicai.dev shows before it is released.
- `AppShell rail="chat"`: the chat rail (`SidebarNav`) with the conversation's title strip beside it, for chat and agent pages; `chat={{ recents, onNewChat, onPick }}` fills it. `SidebarNav` takes `theme` / `onTheme` and shows the switch above the account row.
- Installer: three labelled test prompts on the welcome page (a dashboard, a course registration form, a settings page); the customize nudge is mounted from `main.tsx` and appears on every page the AI tool builds.
- AGENTS.md: which rail a page gets by its kind, how an agent screen is composed (the thread is the spine, a second pane only for a result), and the rule that nothing runs on its own.
- `CardMedia` `aspect="banner"`: a 4:1 header image above a form or a page, beside the 16:9 default.
- `ThinkingState` `working` and `expanded` props; `SidebarNav` `theme` / `onTheme` above the account row.
- Existing apps: AGENTS.md "Migrating an existing app", `formic_check.py --inventory` (every UI file, worst first), and the installer prints the migration prompt and the inventory instead of a dashboard prompt when the project already has pages.
- Installer: the scaffold's `vite.config.ts` resolves the `@` alias `tsconfig.json` already declared, so `@/formic/...` imports build; the customize nudge is mounted from `main.tsx` and survives whatever the AI tool does to `App.tsx`; the gate parses every file the scaffold writes.
- Customizer: the copy block keeps every key touched in the session even when it is back on its default, so "back to full" produces a line; Copy all still hands over everything.
- Tokens: browser autofill is repainted with the field and ink tokens, so an autofilled input no longer turns white in dark mode.
- Landing: precompiled CSS and JS (21 MB to 1.2 MB), WebP images, 3D on demand, GSAP hero and statement motion, FAQ and legal modals, Formic Pro waitlist (`/api/waitlist`, `/api/unsubscribe`, `scripts/announce.py`), SEO and AI-search files (`robots.txt`, `sitemap.xml`, `llms.txt`, `llms-full.txt`, IndexNow, JSON-LD), Vercel Web Analytics, security headers.
- Repo: `staging` branch deploys to staging.formicai.dev and is the only branch that reaches `main` (CI enforces it); build tools install per platform under `.build/`.

### Changed

- Demo content: `ChatApp`, `Markdown`, `CodeBlock`, `Accordion`, `Tabs`, `Select`, `Breadcrumbs`, `Menubar`, `DropdownMenu`, `Sources`, `RecommendationCard` and `PromptBar` attachments now live in Formic Studio's world.

## 0.2.0 · 2026-09-10

### Breaking

- **Icons come from Phosphor** (`@phosphor-icons/react`), no longer Tabler. The `Icon` API is unchanged (`name`, `size`, `strokeWidth`); `strokeWidth` now picks a Phosphor weight (2 and up bold, under 2 regular) and a new `weight="fill"` gives a solid glyph. Apps: `npm install @phosphor-icons/react` and drop `@tabler/icons-react`, or re-run the installer. Icon names are the same; a project that imported Tabler directly (against the rules) has to move to `<Icon name=…/>`.
- `BrandIcon` draws from Phosphor's logo set: 63 marks, 23 new (Linux, Dropbox, Outlook, Excel, Word, PowerPoint, Twitter, Messenger, WeChat, Skype, Steam, Patreon, Stack Overflow, CodePen, CodeSandbox, Replit, Dev.to, Tumblr, App Store, Angular, Markdown, Coda, Linktree) and 41 removed that Phosphor does not draw (Vercel, AWS, Azure, Docker, Firebase, Supabase, Gmail, Zoom, Trello, Asana, Airtable, WordPress, Webflow, Adobe, Visa, Mastercard, Vue, React, Next.js, Tailwind, TypeScript, JavaScript, Python, PHP, Laravel, Git, Bitbucket, Ubuntu, Office, OneDrive, Google Analytics, Samsung Pass, Tesla, Uber, Airbnb, Booking, Tripadvisor, Vimeo, Netflix, Disney, GitHub Copilot). Every removed one still exists as a full-colour `BrandLogo`.
- `CodeBlock` no longer caps its own width at 420px; it fills its column like `Terminal`. Wrap it if you relied on the cap.

### Added

- Agent surfaces: `ToolCall` + `ToolCalls`, `Terminal`, `FileTree`, `SplitPane`, `ImageResult` + `ImageResults`, `ContextMeter`, `ModelSelector`, `CommandPalette` (the gallery search runs on it), `Sources` + `InlineCitation` (rebuilt on primitives), `NotificationList`.
- Forms: `Combobox`, `TagInput`; `EmptyState` with four kinds, used by `DataTable` by default.
- Shell: `AppShell` mounts the rail named in `formic.config.json` (full, inset, edge, topbar); `TopBar`.
- Config: radius by pixel (0–32) with `corners` smooth or round, `controls` pill, type size base/lg/xl, layout compact/medium/full, font from 25 approved faces, five more palettes and a custom palette derived from any colour.
- Gates for apps: `scripts/formic_check.py` (refuses generic UI) and `scripts/compose_check.py` (judges what is on the screen); `npm run formic` and a pre-commit hook, installed by the installer.
- Installer: scaffolds a Vite + React + Tailwind v4 app in place when there is no `package.json`, writes a welcome page with the test prompt, a customize dock, and the rule files for Claude Code, Cursor, Copilot, Codex and any tool that reads `AGENTS.md`.
- Primitives: `OptionRow`, `IconTile` sizes, `formatDuration`, `Shortcut`, `useWidth`.
- Gallery: theme follows the system until chosen, customizer remembers choices, ⌘K search, play-again on moving demos, favicon; each page has a copyable prompt for your AI tool.
- Chart tooltips read the tooltip's own foreground tokens, so their labels are legible in light mode.
- Config: `cardRadius` gives cards and panels a corner of their own; the customizer sets buttons and cards on two sliders with a Pill switch; avatars follow the control radius through `--radius-avatar` (square on sharp, a circle on pill).
- `AppShell` manages the theme itself when the app does not, and the full rail carries the theme switch beside the profile; a `useTheme` hook in `hooks.ts`.
- The installer's `apply_config.py` runs on Python 3.9 again.

### Removed

- `Flowchart`.

## 0.1.0 · 2026-08-20

First public state: tokens, ten palettes × light/dark, the conversation set (ChatThread, PromptBar, StreamingText, ThinkingState, ToolChips, ApprovalCard, Markdown, CodeBlock), forms, overlays, dashboard charts and tables, the gallery at formicai.dev/preview.html, the customizer, and the one-command installer.
