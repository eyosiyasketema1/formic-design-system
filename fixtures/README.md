# Install fixtures

Three projects the installer must work in, used by `scripts/test_install.sh`
(Phase 0 of `PLAN-adoption.md`). Nothing here has `node_modules`; the test
copies a fixture to a temp dir and installs there.

| Fixture | What it is | Why |
| --- | --- | --- |
| `vite-fresh/` | Empty. The test runs `install.sh --new app` in an empty temp dir. | The happy path: the scaffold the installer writes itself. |
| `next-app/` | Minimal Next.js 15 App Router project, Tailwind v4 via `@tailwindcss/postcss`, `@/*` alias mapped to the project root, `app/globals.css` holding the one `@import "tailwindcss"`. | An existing project whose global CSS is not under `src/`, whose build is `next build`, and whose alias means something else. |
| `old-app/` | A Vite + React + Tailwind v4 app that looks legacy: a `components/ui` folder from another kit (`lucide-react`, palette classes), a strict `eslint.config.js` that bans raw `useEffect`, the `@` alias in both `tsconfig.json` and `vite.config.ts` and ignores nothing, and `generate.py`, which writes ~400 more `.tsx` files (`src/pages/`, `src/components/generated/`) full of palette classes, `rounded-lg`, `shadow-md` and raw `<button>` / `<input>` / `<table>`. Only the seed is committed; the generated files are written at test time and git-ignored. | The migration case: the gates and the hook must not block the project's own work, and the vendored folder must survive the project's lint. |

## Running

```bash
scripts/test_install.sh vite-fresh            # must pass
scripts/test_install.sh next-app              # baseline in Phase 0: failures are recorded, not fixed
scripts/test_install.sh old-app --keep        # --keep leaves the temp dir and prints its path
scripts/test_install.sh next-app --cli        # the same steps, installed with `formicai init` (cli/) from a
                                              # registry built out of the working tree and served locally
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
- `eslint`: old-app only, `eslint src/formic` with the project's own config (baseline data); clean or ignored by the config both pass (`--cli` runs `init --eslint-ignore` on old-app)
- `doctor` (`--cli` only): `formicai doctor` exits 0
- `legacy` (`--cli`, next-app and old-app): a legacy file commits with a note until `formicai scope add` claims its folder, then the hook refuses it
- `migrate` (`--cli`, old-app): `formicai migrate --write` on Page001–003 drops their formic_check issues by at least 80% and the app still builds
- `visual` (`--cli`, old-app): the migration measured, not eyeballed — see below

Exit status is 1 when any step fails. Needs node 20+, npm, python3, git, network for `npm install`.

## Visual check around a migration

`scripts/visual_check.sh` screenshots an app's routes before and after
`formicai migrate` and compares them pixel by pixel (Phase 3, the Tester
bullet). It drives `scripts/visual_check.mjs`, plain Node whose only
dependency is Playwright — taken from the app's `node_modules` when it has
it, otherwise installed once into `$FORMIC_VISUAL_HOME` (default
`~/.cache/formic-visual`) together with Playwright's `chromium-headless-shell`;
nothing is added to this repo, and PNGs are decoded and written by the
script itself (`node:zlib`).

```bash
scripts/visual_check.sh <app> before  --routes /,/#/2,/#/3   # build, serve dist/, screenshot
# …formicai migrate …
scripts/visual_check.sh <app> after   --routes /,/#/2,/#/3
scripts/visual_check.sh <app> compare --threshold 12 --threshold-dark 45
```

Routes default to `/` plus what `src/App.tsx` declares (react-router
`path="/x"`, hash links `href="#/x"`); old-app's pages are hash routes
(`#/1`–`#/3`). Each route is shot at 1280×900 and 390×844, light and dark
(`<html data-theme="dark">`), full page, animations off, into
`<app>/.formic-visual/{before,after}/` (git-ignored; ~1.6MB for old-app).
`compare` prints `route viewport theme diff%` — the share of pixels that
moved by more than 16/255 on any channel, a size change counted as moved —
and `PASS` when every image is at or under the threshold (`--threshold-dark`
gives the dark images a bar of their own), else `FAIL` naming the worst;
`.formic-visual/report.html` shows before / after / diff side by side for
anything above 0.1%, `compare.json` holds the numbers.

In `test_install.sh old-app --cli` the `visual` step takes `before` right
after `build`, then `migrate` runs, then `after` (rebuilt) and `compare`.
The migration is meant to move things — palette greys become Formic greys,
`rounded-lg` becomes the scale, the accent button and the Urbanist glyphs
change — so the step measures that and fails only above the measured diff
plus a margin: light 12% (measured 3.6–7.5%), dark 45% (measured 27.7–37.0%:
the migrated regions carry tokens and turn dark while the unmigrated shell
stays light — a half-migrated app in dark mode is what that number is).
`FORMIC_VISUAL_THRESHOLD` / `FORMIC_VISUAL_THRESHOLD_DARK` override the bars.
Where no browser can be installed or launched (a CI runner without
Chromium's system libraries) the step passes as `visual (skipped: no
browser — …)` and exits 3 when run by hand; in CI install the browser first:
`npx playwright install --with-deps chromium-headless-shell` (Ubuntu; on
macOS runners plain `npx playwright install chromium-headless-shell`), or
set `FORMIC_VISUAL_WITH_DEPS=1` so the script passes `--with-deps` itself
(needs passwordless sudo).

