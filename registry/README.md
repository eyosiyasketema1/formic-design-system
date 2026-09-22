# registry/ — Formic as a shadcn registry

This folder is the Formic AI Design System in the [shadcn registry format](https://ui.shadcn.com/docs/registry): one `registry.json` catalogue and one `<name>.json` per item, each a complete [`registry-item.json`](https://ui.shadcn.com/docs/registry/registry-item-json) with the file contents inlined. The standard shadcn CLI installs from it; no Formic-specific tooling is needed on the consumer's side.

**Every file here is generated.** `scripts/build_registry.py` writes the whole folder from `components/`, `styles/`, `scripts/`, `formic.config.json`, `AGENTS.md` and `package.json`; the QA gate (`scripts/qa_check.py`, step 4f) fails when the folder is stale or when a component imports a relative file no item covers. Edit the sources, run the script, commit both.

```
python3 scripts/build_registry.py           # rebuild registry/
python3 scripts/build_registry.py --check   # exit 1 when stale (what the gate runs)
python3 scripts/build_registry.py --base-url http://127.0.0.1:8765 --out /tmp/reg
                                            # a throwaway build whose item links point at a local server
```

## URLs

| | catalogue | one item |
|---|---|---|
| hosted | `https://formicai.dev/r/registry.json` | `https://formicai.dev/r/button.json` |
| staging | `https://staging.formicai.dev/r/registry.json` | `https://staging.formicai.dev/r/button.json` |
| local | `cd registry && python3 -m http.server 8765` → `http://127.0.0.1:8765/registry.json` | `http://127.0.0.1:8765/button.json` |

`/r/*.json` is a `vercel.json` rewrite onto this folder (`/registry/*.json` works too); both paths carry `Cache-Control: public, max-age=300, stale-while-revalidate=86400`, so a merge to `main` is live within five minutes and the CDN never serves an error while it refreshes.

The committed files link their dependencies with the hosted URL. For a local CLI test, build a copy with `--base-url` pointing at the local server (as above), because the CLI follows those links literally.

## How the CLI consumes it

```
npx shadcn@latest add https://formicai.dev/r/button.json        # one component (+ what it needs)
npx shadcn@latest add https://formicai.dev/r/formic.json        # the base only
npx shadcn@latest add https://formicai.dev/r/formic-all.json    # everything install.sh vendors
npx shadcn@latest list   https://formicai.dev/r/registry.json   # the catalogue
npx shadcn@latest search https://formicai.dev/r/registry.json --query table
```

Or once as a namespace (`npx shadcn@latest registry add @formic=https://formicai.dev/r/{name}.json`, or the same line under `registries` in `components.json`), then `npx shadcn@latest add @formic/button`.

What an `add` of one component does, in order (verified with shadcn CLI 4.21.0 in a Vite + React + Tailwind v4 app that had **no** `components.json`):

1. Fetches the item and, recursively, its `registryDependencies`. `button` pulls `primitives` and `formic`; `primitives` pulls `hooks`, `config`, `doodle`; `data-table` pulls `pagination`, `empty-state`, `primitives`, `formic`.
2. Installs the union of their `dependencies` with the project's package manager: `@phosphor-icons/react` (from `primitives`, `brand`, `formic`), `@dicebear/core@^9.2.2` and `@dicebear/notionists@^9.2.2` (from `doodle`, `formic`). React is assumed present and never listed.
3. Writes every file to its `target`: `src/formic/components/Button.tsx`, `src/formic/components/primitives.tsx`, …, `src/formic/styles/*.css`, `src/formic/scripts/*.py`, `src/formic/formic.config.json`, `src/formic/VERSION`, and `AGENTS.md` at the project root. A file that already exists with identical content is skipped silently; a file that exists with different content (for instance `tokens.css` after `apply_config.py` has applied an accent) gets a per-file *overwrite?* prompt — answer **n** to keep yours, or pass `--overwrite` to refresh everything and re-run `python3 src/formic/scripts/apply_config.py` afterwards.
4. Prints the base item's `docs`: wire the three CSS imports (below) and run `apply_config.py` once.

The result is byte-identical to the source tree: the CLI does not rewrite imports in these files, so `./primitives`, `./hooks` and `./config` resolve exactly as they do in this repo (checked with `diff -r` against a full `formic-all` install).

### The three CSS lines are wired by hand

```css
@import "./formic/styles/fonts.css";    /* first: the Urbanist font */
@import "tailwindcss";
@import "./formic/styles/formic.css";   /* tokens, palettes, Tailwind bridge, component sheets */
```

The item schema's `css` field can inject `@import` lines, but it was tested and rejected: the CLI only applies it when a `components.json` names the CSS file, it de-duplicates the existing `@import "tailwindcss"` and appends the new imports *after* it, which puts `fonts.css` (a Google Fonts `@import url(...)`) behind Tailwind's output where Lightning CSS drops it and the font never loads. `cssVars` is the wrong tool too — Formic's tokens are a whole file with light and dark blocks and ten palettes, not a flat variable map. So the base item tells the person in `docs` instead, and Phase 2's `formic init` will write the lines in the right order.

`formic.css` is the one stylesheet an app imports; it pulls in `tokens.css`, `themes.css`, `tailwind-theme.css`, `brands.css`, `sidebar.css` and `records.css`, so the components that rely on a sheet (`AppSidebar`, `SidebarNav`, `ProjectSidebar` → `sidebar.css`; `RecordsTable` → `records.css`; `brand.tsx`, `brand-logos.tsx` → `brands.css`) need nothing declared: the base item carries all eight files.

## Item types: why everything is `registry:item` + `registry:file`

The decision, and the test behind it:

- Formic's layout is `src/formic/{components,styles,scripts}` with **relative imports** between components (`./primitives`, `./hooks`). shadcn's typed files (`registry:ui`, `registry:component`, `registry:lib`, `registry:hook`) are placed under the aliases in the consumer's `components.json` (`components/ui`, `lib`, `hooks`) and can have their imports rewritten, which would scatter one system across three folders and break the gates (`formic_check.py` looks for `src/formic`). The `@ui/`, `@lib/`, `@hooks/` target placeholders have the same problem.
- `registry:file` with an explicit `target` (`~/` = the project root) writes the file exactly where we say and leaves its content alone. An item whose files all carry a target is a *universal item*: it installs **without framework detection and without `components.json`**, which is what makes `npx shadcn add <url>` work in any React project on day one. That is what the tests showed: an empty Vite app with no `components.json` got the full tree, the peer packages, and built.
- So every item is `type: "registry:item"` (the universal kind) and every file is `type: "registry:file"` with `target: "~/src/formic/…"`. `registry:base` was considered and rejected: it exists to *replace* shadcn's own base (its `config` field writes `components.json` fields like `style`, `iconLibrary`, `tailwind.baseColor`, and it is applied by `shadcn init` for projects that will also use shadcn/ui components). Formic is not a shadcn style; it is a separate system that must coexist with whatever the project already has. A `registry:item` base does not touch `components.json`.

Sibling items are referenced by **full URL** (`https://formicai.dev/r/primitives.json`), never by bare name: per the spec a bare name (`button`) always means the item in shadcn/ui's own registry, and a relative file path resolves against the consumer's working directory. npm dependencies are listed as `name@range`, with the range read from `package.json`'s `peerDependencies` (`@dicebear/core@^9.2.2`); `@phosphor-icons/react` is listed without a range because its peer range is a floor (`>=2.1.0`), which the `name@version` form cannot express, and the CLI installs the latest.

## Naming

Item names are the kebab-case of the source file's stem; the title is its display name; the description is the first sentence of the file's header comment block (the `NAME — tagline` line, or the first sentence under it).

| source | item | title |
|---|---|---|
| `Button.tsx` | `button` | Button |
| `DataTable.tsx` | `data-table` | Data Table |
| `OTPInput.tsx` | `otp-input` | OTP Input |
| `cards.tsx` | `cards` | Cards |
| `charts.tsx` | `charts` | Charts |
| `brand-logos.tsx` | `brand-logos` | Brand logos |
| `primitives.tsx` / `hooks.ts` / `config.ts` / `theme.ts` / `doodle.ts` / `brand.tsx` | same word | same word |
| (base) | `formic` | Formic |
| (everything) | `formic-all` | Formic, every component |

Every component item declares `formic` in its `registryDependencies`, so tokens, styles, scripts, `AGENTS.md` and the shared modules always come along; `formic-all` has no files of its own and depends on every item, which is what `install.sh` copies (`components/`, `styles/`, the five scripts, `formic.config.json`, `VERSION`, `AGENTS.md`). Each item's `meta.formic` records the source file and the Formic version it was built from.

## What is in the base item

`formic.json`, ~250 KB (`brand-logos.tsx`, the other large file, is its own item and not in the base):

- `styles/` — all eight sheets (`tokens.css`, `themes.css`, `tailwind-theme.css`, `fonts.css`, `brands.css`, `sidebar.css`, `records.css`, `formic.css`)
- `scripts/` — `set_accent.py`, `apply_config.py`, `palette.py`, `compose_check.py`, `formic_check.py` (the two gates and the config tools install.sh ships)
- `formic.config.json` (stock choices), `VERSION` (from `package.json`), `AGENTS.md` (project root)
- the shared modules: `primitives.tsx`, `hooks.ts`, `config.ts`, `brand.tsx`, `theme.ts`, `doodle.ts` — these are also items of their own, and the CLI skips the duplicate because the content is identical
- `dependencies`: `@phosphor-icons/react`, `@dicebear/core@^9.2.2`, `@dicebear/notionists@^9.2.2`

## Dry run and diff

`npx shadcn add <item> --dry-run` and `--diff` need a `components.json` in the project (the CLI asks to create one when it is missing); a plain `add` works without one. Phase 2's `formic init` writes a minimal `components.json`, after which both flags work as documented.
