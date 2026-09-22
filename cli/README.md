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
| `formicai init [--new <dir>]` | Adds Formic to the project you are in (or scaffolds a Vite + React + Tailwind v4 app with `--new`): writes `src/formic/` from the registry, wires the three CSS imports, installs the peer packages, writes `components.json`, adds `npm run formic`, writes the instruction files for Claude Code, Cursor and Copilot, installs the pre-commit hook. `--minimal` installs the base only; `--eslint-ignore` writes the `src/formic/**` ignore into a flat ESLint config; `--dry-run` prints every file and command and writes nothing. | `npx formicai init --new my-app` |
| `formicai add <name…>` | Adds components with whatever they need and records them in `src/formic/registry.lock`. A misspelt name gets the nearest matches. `--overwrite` replaces files that differ; `--dry-run` lists them; `--list` prints every name. | `npx formicai add data-table` |
| `formicai update` | Refreshes the installed files from the registry. Shows a diff per file; files you edited are kept unless you answer y or pass `--force`; `--yes` applies every change to files you have not edited; `--dry-run` shows the diffs only. Your `formic.config.json` is never touched and is applied again after the styles are refreshed. | `npx formicai update --dry-run` |
| `formicai doctor` | One line per check (Node, package manager, Tailwind v4, the CSS imports and their order, the `@` alias, peer packages, `components.json`, installed version against the registry, ESLint ignore, `formic.config.json`, the hook) and the exact fix for every ✗. Exits 1 when anything is wrong. | `npx formicai doctor` |
| `formicai gates` | Runs both gates (`formic_check.py`, `compose_check.py`) on the source folder, what `npm run formic` runs. | `npx formicai gates` |
| `formicai inventory` | Lists every UI file with its issue count and whether it imports Formic, worst first, so a migration can be planned. | `npx formicai inventory` |
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
.git/hooks/pre-commit  both gates on the .tsx/.jsx files of each commit
```

In an existing project the global CSS gets the three imports around `@import "tailwindcss"` (fonts first, then Tailwind, then `formic.css`), the peer packages (`@phosphor-icons/react`, `@dicebear/core`, `@dicebear/notionists`) are installed with your package manager, and the migration prompt plus an inventory are printed at the end.

`package.json` → `formic.scope` and `formic.legacy` are for adopting one route at a time: `gates` and `inventory` check the `scope` folders (the whole source folder when empty) and skip the `legacy` folders.

## How update decides

`registry.lock` records the content hash of every file when it is written. On `update`, a file whose hash still matches has not been edited, so it is refreshed; a file that differs from both its recorded hash and the registry has been edited by you, so its diff is shown and it is kept unless you say otherwise. The registry serves the current release only, so a file installed without a lock entry counts as edited and is asked about, never replaced silently.

## Registry

Items come from `https://formicai.dev/r/<name>.json` (`registry.json` is the catalogue). `FORMIC_REGISTRY` overrides the base URL, for a local build during tests:

```
python3 scripts/build_registry.py --base-url http://127.0.0.1:8765 --out /tmp/reg
(cd /tmp/reg && python3 -m http.server 8765) &
FORMIC_REGISTRY=http://127.0.0.1:8765 npx formicai init --new app
```

`bash cli/test/run.sh` (or `npm run test:cli` in the repo) does exactly that and exercises every command.

## Licence

MIT. Source: https://github.com/eyosiyasketema1/formic-design-system
