# Changelog

Formic is vendored, so a version is the state of `main` you copied. `src/formic/VERSION` in an app records which one; re-running the installer moves it forward. Versions follow semver: while 0.x, a minor bump can change an API.

## 0.2.0 · 2026-09-10

### Breaking

- **Icons come from Phosphor** (`@phosphor-icons/react`), no longer Tabler. The `Icon` API is unchanged (`name`, `size`, `strokeWidth`), `strokeWidth` now picks a Phosphor weight (2 and up bold, under 2 regular) and a new `weight="fill"` gives a solid glyph. Apps: `npm install @phosphor-icons/react` and drop `@tabler/icons-react`, or re-run the installer. Icon names are the same; a project that imported Tabler directly (against the rules) has to move to `<Icon name=…/>`.
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
- Gallery: theme follows the system until chosen, customizer remembers choices, ⌘K search, play-again on moving demos, favicon.

### Removed

- `Flowchart`.

## 0.1.0 · 2026-08-20

First public state: tokens, ten palettes × light/dark, the conversation set (ChatThread, PromptBar, StreamingText, ThinkingState, ToolChips, ApprovalCard, Markdown, CodeBlock), forms, overlays, dashboard charts and tables, the gallery at formicai.dev/preview.html, the customizer, and the one-command installer.
