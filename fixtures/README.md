# Install fixtures

Three projects the installer must work in, used by `scripts/test_install.sh`
(Phase 0 of `PLAN-adoption.md`). Nothing here has `node_modules`; the test
copies a fixture to a temp dir and installs there.

| Fixture | What it is | Why |
| --- | --- | --- |
| `vite-fresh/` | Empty. The test runs `install.sh --new app` in an empty temp dir. | The happy path: the scaffold the installer writes itself. |
| `next-app/` | Minimal Next.js 15 App Router project, Tailwind v4 via `@tailwindcss/postcss`, `@/*` alias mapped to the project root, `app/globals.css` holding the one `@import "tailwindcss"`. | An existing project whose global CSS is not under `src/`, whose build is `next build`, and whose alias means something else. |
| `old-app/` | A Vite + React + Tailwind v4 app that looks legacy: a `components/ui` folder from another kit (`lucide-react`, palette classes), a strict `eslint.config.js` that bans raw `useEffect` and ignores nothing, and `generate.py`, which writes ~400 more `.tsx` files (`src/pages/`, `src/components/generated/`) full of palette classes, `rounded-lg`, `shadow-md` and raw `<button>` / `<input>` / `<table>`. Only the seed is committed; the generated files are written at test time and git-ignored. | The migration case: the gates and the hook must not block the project's own work, and the vendored folder must survive the project's lint. |

## Running

```bash
scripts/test_install.sh vite-fresh            # must pass
scripts/test_install.sh next-app              # baseline in Phase 0: failures are recorded, not fixed
scripts/test_install.sh old-app --keep        # --keep leaves the temp dir and prints its path
```

The script installs from the local checkout (`FORMIC_REPO=<repo>`) on its
current branch, so it tests the code you have, not what is on GitHub. The
installer clones, so it sees the last commit: uncommitted changes to
`styles/`, `components/`, `scripts/` or `AGENTS.md` are not in the install
(the script warns when the tree is dirty). `install.sh` itself runs from the
working tree.

Steps, each printed as `PASS <step>` or `FAIL <step>`:

- `install`: the installer exits 0
- `deps`: `node_modules` holds `@phosphor-icons/react` and `@dicebear/core`
- `css`: the global CSS has `fonts.css`, `tailwindcss`, `formic.css` in that order
- `typecheck`: `tsc --noEmit`
- `build`: `vite build` or `next build`, after the script writes a smoke page (`app/formic-smoke/page.tsx` or `src/FormicSmoke.tsx`) that imports AppShell, Panel, Button and Icon, so the build compiles the vendored folder and not only the fixture's own files
- `gates`: `npm run formic` (or the two gate scripts on `src/`)
- `hook`: a commit of an unrelated file passes the pre-commit hook; a commit of one legacy palette-class file (old-app) is refused by it
- `eslint`: old-app only, `eslint src/formic` with the project's own config (baseline data)

Exit status is 1 when any step fails. Needs node 20+, npm, python3, git, network for `npm install`.
