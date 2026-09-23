# formicai

The command line for the [Formic AI Design System](https://formicai.dev): a token-driven React + Tailwind v4 design system for AI product interfaces, vendored into your project as `src/formic/` so your AI coding tool builds on it.

```
npx formicai init --new my-app     # a new app, ready for the first prompt
npx formicai init                  # Formic into the project you are in
```

Needs Node 20 or newer and python3 (the gates and the config script are Python). No dependencies of its own.

## Commands

| Command | What it does | Example |
| --- | --- | --- |
| `formicai init [--new <dir>]` | Adds Formic to the project you are in (or scaffolds a Vite + React + Tailwind v4 app with `--new`): writes the base of `src/formic/` from the registry (tokens, styles, the shared modules, the scripts; a new app also gets `button` and `panel` for its welcome page), wires the three CSS imports, installs the peer packages, writes `components.json`, adds `npm run formic`, writes the instruction files for Claude Code, Cursor and Copilot, registers the MCP server, installs the pre-commit hook. Components are added as they are needed with `add`; `--all` installs every one now (`--minimal` is the default and stays as an alias); `--preset <code>` applies a design preset (below); `--eslint-ignore` writes the `src/formic/**` ignore into a flat ESLint config; `--no-mcp` skips the MCP entry; `--dry-run` prints every file and command and writes nothing. | `npx formicai init --new my-app` |
| `formicai add <name…>` | Adds components with whatever they need and records them in `src/formic/registry.lock`. A misspelt name gets the nearest matches. `--overwrite` replaces files that differ; `--dry-run` lists them; `--list` prints every name. | `npx formicai add data-table` |
| `formicai docs [<name>]` | A component's reference from the terminal: title, description, file, props (types, defaults, doc comments, read from the `.tsx`), its dependencies and an example import plus the simplest JSX; works before the component is installed. Without a name, every component with its one-line description. `--json` for the same as data. | `npx formicai docs data-table` |
| `formicai mcp install` | Writes the Formic MCP server into `.mcp.json` (Claude Code) and `.cursor/mcp.json` (Cursor), keeping the servers already there; `init` does this too. The server (`formicai mcp`, stdio, started by the client) offers `list_components`, `component_docs`, `add_component`, `inventory`, `doctor` and `gates`. | `npx formicai mcp install` |
| `formicai preset` | Prints this project's design choices (the keys of `formic.config.json` that differ from the stock config) as one code for `init --preset`. | `npx formicai preset` |
| `formicai update` | Refreshes the installed files from the registry. Shows a diff per file; files you edited are kept unless you answer y or pass `--force`; `--yes` applies every change to files you have not edited; `--dry-run` shows the diffs only. Your `formic.config.json` is never touched and is applied again after the styles are refreshed. | `npx formicai update --dry-run` |
| `formicai doctor` | One line per check (Node, package manager, Tailwind v4, the CSS imports and their order, the `@` alias, peer packages, `components.json`, installed version against the registry, ESLint ignore, `formic.config.json`, the hook) and the exact fix for every ✗; a second UI kit still installed (an icon set, a component or chart library, a `components/ui` folder, colours in `tailwind.config`) is a `!` note with its next step, never a failure. Exits 1 when the setup is wrong. | `npx formicai doctor` |
| `formicai gates` | Runs both gates (`formic_check.py`, `compose_check.py`) on the source folder, what `npm run formic` runs; `scope` and `legacy` in `package.json` decide what is checked (below). | `npx formicai gates` |
| `formicai inventory` | Lists every UI file with its issue count and whether it imports Formic, worst first, so a migration can be planned. Files in legacy folders are listed too, marked `legacy`. | `npx formicai inventory` |
| `formicai scope [add \| remove <folder…>]` | Lists, or changes, the folders the gates and the hook check: `add` puts a folder under the gates (and drops it from `legacy`), `remove` takes it out. | `npx formicai scope add src/pages` |
| `formicai migrate <file…> [--write]` | Runs the codemods on a page and shows the diff; `--write` applies it, then runs `formic_check` on the file and prints what is left. Every codemod leaves a `formic-todo` comment where it could not decide. | `npx formicai migrate src/pages/Billing.tsx --write` |
| `formicai --help`, `formicai <command> --help`, `formicai --version` | | |

## What init leaves behind

```
src/formic/            styles/, components/, scripts/, formic.config.json, VERSION, registry.lock
components.json        the registry client's config, with the @formic registry
package.json           "formic": { dir, srcDir, scope, legacy } and the formic script
AGENTS.md              how an AI tool builds on Formic (appended if you have one)
CLAUDE.md              a Formic section (appended if you have one)
.cursor/rules/formic-design-system.mdc
.github/copilot-instructions.md
.claude/skills/formic-design-system/SKILL.md
.mcp.json              the Formic MCP server for Claude Code (merged if you have one)
.cursor/mcp.json       the same for Cursor
.git/hooks/pre-commit  both gates on the .tsx/.jsx files of each commit
```

Only the base goes in by default: `src/formic/components` holds the shared modules (`primitives`, `hooks`, `config`, `brand`, `theme`, `doodle`) and every other component is one `npx formicai add <name>` away, which is what AGENTS.md, the skill and the welcome page's test prompts tell the agent to do. `npx formicai init --all` installs every component up front.

## Presets

A design configuration travels as one code: the base64url of the JSON of the `formic.config.json` keys that differ from the stock config, compact, keys sorted. Nothing is looked up anywhere; the code is the data.

```
npx formicai preset                       # this project's code
npx formicai init --preset eyJhY2NlbnQiOiIjMjU2M0VCIiwicmFkaXVzIjoicm91bmRlZCJ9
```

The customizer at https://formicai.dev/customize shows the code under its copy block. `init --preset` writes the keys into `src/formic/formic.config.json` (a project that already has Formic keeps everything else) and runs `apply_config.py`, so the accent, palette, radius, font, rail and the rest apply at once. To make one by hand: `printf '%s' '{"accent":"#2563EB","radius":"rounded"}' | base64 | tr '+/' '-_' | tr -d '='`.

## The skill

`npx skills add eyosiyasketema1/formic-design-system` installs the Formic skill (`skills/formic-design-system/SKILL.md` in the repo) into any agent that reads skills; `formicai init` writes the same file into `.claude/skills/` for Claude Code. It covers the procedure, the composition rules, the component inventory and this command line.

In an existing project the global CSS gets the three imports around `@import "tailwindcss"` (fonts first, then Tailwind, then `formic.css`), the peer packages (`@phosphor-icons/react`, `@dicebear/core`, `@dicebear/notionists`) are installed with your package manager, and the migration prompt plus an inventory are printed at the end.

## Adopting one route at a time

`formicai init` in a project that already has pages writes `"formic": { "scope": [], "legacy": ["src"] }` into `package.json` and says so: the gates and the pre-commit hook leave the existing files alone until a folder is moved into scope. Both gates read the section (`--config=package.json`, which `npm run formic`, `formicai gates` and the hook all pass), and scope wins over legacy for its subtree, so `legacy: ["src"]` plus `scope: ["src/pages"]` checks `src/pages` and nothing else. A staged file in a legacy folder is skipped with a one-line note, never refused; with both lists empty the whole source folder is checked, as in a new app.

```
npx formicai inventory                     # every UI file, worst first, legacy ones marked
npx formicai scope add src/pages           # this folder is on Formic from now on
npx formicai migrate src/pages/Billing.tsx # the diff; --write applies it
```

### What migrate rewrites

The codemods are written on regexes and a small tokenizer in plain Node, so the CLI stays dependency-free; they cover the shapes a legacy React + Tailwind page actually has and leave a `formic-todo` comment (valid where it lands: after a class string, inside a tag) wherever they do not. In order:

| Codemod | What it does |
| --- | --- |
| `icons` | `import { Bell } from "lucide-react"` becomes `import { Icon } from "…/formic/components/primitives"` and each `<Bell className="h-4 w-4" />` becomes `<Icon name="bell" size={16} />`, for the names that have a Formic twin (about a hundred, read from the installed `primitives.tsx`); an icon with none, or one passed as a value, stays in the lucide import with a todo |
| `button` | `<button className="…" onClick={…}>label</button>` becomes `<Button variant="…">label</Button>` (accent for an accent fill, primary for a dark one, destructive for red, outline, ghost, secondary; `size` from the old height or text size; `fullWidth`; a leading or trailing `<Icon>` becomes `icon` / `iconEnd`); children that are not a plain label, a handler that takes an event, a `ref` or a computed className are a todo |
| `input` | `<input …/>` becomes `<Input …/>`; a `<label>` around it, or just before it with a matching `htmlFor`, becomes `<Field label="…">`; checkbox, radio, range, date and the rest get a todo naming the component |
| `element` | a raw `<table>`, `<select>`, `<textarea>` or `<svg>` gets a todo naming the component (DataTable, Select, Textarea, Icon or charts) |
| `palette` | `bg-white` / `bg-gray-50` → `bg-surface`, `bg-gray-100/200` → `bg-inset`, `bg-gray-900` / `bg-black` → `bg-ink`, `text-gray-900` → `text-ink`, `text-gray-500/600/700` → `text-ink-2`, `text-gray-400` → `text-ink-3`, `border-gray-200/300` → `border-line`, an accent hue (blue, indigo, violet, purple, pink, rose, sky, cyan, teal) at 500 to 700 → `bg-accent` (with `text-canvas` on the fill) / `text-accent`, red / green / amber → `text-red` / `text-green` / `text-orange` and `-tint` for the 50/100 washes, `hover:bg-gray-100` → `hover:bg-hover`, a darker hover on a fill → `hover:opacity-90`, `focus:` border and ring colours dropped (the shared focus rule), `dark:` variants dropped (tokens carry dark mode); anything else palette-coloured (gradients, rings, fills, opacity suffixes) is a todo |
| `type` | `text-xs` → `text-small`, `text-sm` → `text-caption`, `text-base` → `text-body`, `text-lg` → `text-lead`, `text-xl` → `text-title`, `text-2xl` → `text-heading`, `text-3xl` → `text-display`, `text-4xl` → `text-display-lg`, larger → `text-display-xl`, `text-[Npx]` → the nearest step; `font-bold` / `extrabold` / `black` → `font-semibold`; `tracking-tighter` → `tracking-tight`, `tracking-wider` / `widest` → `tracking-wide` |
| `shape` | `rounded` / `rounded-md` → `rounded-control`, `rounded-lg` → `rounded-md`, `rounded-xl` and up → `rounded-card` (sides kept: `rounded-t-lg` → `rounded-t-md`), `rounded-full` stays; `shadow` / `shadow-sm` … `shadow-2xl` → `shadow-card`, `drop-shadow-*` and `shadow-inner` removed; `h-screen` → `h-dvh` |

What stays for you: the table (DataTable), the select, the textarea, a toggle, the page's layout on `AppShell`. `formic_check` on the file lists it all, and `formicai gates` prints clean when the file is done.

## How update decides

`registry.lock` records the content hash of every file when it is written. On `update`, a file whose hash still matches has not been edited, so it is refreshed; a file that differs from both its recorded hash and the registry has been edited by you, so its diff is shown and it is kept unless you say otherwise. The registry serves the current release only, so a file installed without a lock entry counts as edited and is asked about, never replaced silently.

## Registry

Items come from `https://formicai.dev/r/<name>.json` (`registry.json` is the catalogue). `FORMIC_REGISTRY` overrides the base URL, for a local build during tests:

```
python3 scripts/build_registry.py --base-url http://127.0.0.1:8765 --out /tmp/reg
(cd /tmp/reg && python3 -m http.server 8765) &
FORMIC_REGISTRY=http://127.0.0.1:8765 npx formicai init --new app
```

`bash cli/test/run.sh` (or `npm run test:cli` in the repo) does exactly that and exercises every command, `scope`, `migrate`, `docs`, `preset` and an MCP round trip included.

## Licence

MIT. Source: https://github.com/eyosiyasketema1/formic-design-system
