# QA Review of AUDIT.md — Design Standards — 2026-08-21

Independent QA pass over the design-standards section of `AUDIT.md`, verified against source with actual counts and computed contrast ratios.

## Claim-by-claim verdicts

| # | Audit claim | Actual (verified) | Verdict |
|---|---|---|---|
| 1 | Colors: 18 tokens, light+dark, 5 themes | 18 color tokens; dark block + 5 palettes × light/dark | **CONFIRMED** |
| 2 | ~4 hardcoded colors | Exactly: `text-white` ×2, `rgba(255,255,255,0.14)` ×1, demo SVG fills | **CONFIRMED** |
| 3 | Frequent arbitrary spacing values | Present, plus `gap-[1.5px]`, `size-[4px]`, `border-[1.5px]` | **CONFIRMED** |
| 4 | ~28 hardcoded font sizes | **23** instances (7 distinct sizes) | **OVERSTATED** (mildly) |
| 5 | ~14 arbitrary radii | **15**; values span 1–10px; `rounded-[8px]` duplicates `--radius-control` | **CONFIRMED** |
| 6 | Shadows: 4 tokens, 1 one-off | **3** tokens (hairline is a utility, not a token); **2** one-offs | **UNDERSTATED** |
| 7 | Easing repeated ~15× | **10×** that curve; but **3 near-duplicate curves** in use — the real defect | **OVERSTATED** count, understated problem |
| 8 | Durations 650/950/1400ms inline | Confirmed + ~11 more inline durations and a 480ms JS timeout | **UNDERSTATED** |
| 9 | `variant` typed as `string` in all 4 | Stale after fixes; ApprovalCard/StreamingText keep vestigial unused `variant` props | **WRONG (stale)** |
| 10 | `VARIANTS`/`PATTERNS` naming drift | Confirmed | **CONFIRMED** |
| 11 | focus-visible fixed | Present in tokens.css | **CONFIRMED** |

## New findings the audit missed

| Severity | Finding |
|---|---|
| **HIGH** | **WCAG AA contrast failures, light mode.** `--ink-3` #8a8a8a on canvas = **3.45:1** (needs 4.5:1) — used for real text at 10.5–12.5px. Worse in all 4 themes (sage 3.09, twilight 3.12, clay 3.15, ocean 3.02). Dark ink-3 on surface = 4.21:1 (marginal fail). |
| **HIGH** | `--green` on `--green-tint` = **2.98:1** (badge text); `text-green` diff counts = 3.30:1; light `--orange` = 2.15:1 — fails even the 3:1 non-text minimum for the white-on-orange dot. Light `--accent` = 4.08:1 (below 4.5 as text). |
| **HIGH** | **Tailwind `@theme` mapping exists only in preview.html.** Components need `text-ink`/`bg-hover`/`rounded-control` utilities; tokens.css ships only bare CSS vars. Real consumers get silently missing styles. |
| MED | Shadow token naming drift: preview uses `--sh-*` mapped to `--shadow-*`; tokens.css uses `--shadow-*` directly. Preview hardcodes `--radius-control: 8px`. |
| MED | Three near-identical ease-out curves: `(0.23,1,0.32,1)`, `(0.16,1,0.3,1)`, `(0.22,0.61,0.25,1)`. |
| LOW | Same hover pattern uses `duration-100` in some components, `duration-150` in others. |
| LOW | Reduced-motion rule zeroes animations only; grid-row expand *transitions* (300–400ms) still run. |

Verified clean: all 7 keyframes and all primitive classes referenced by components exist in tokens.css; all 18 color tokens are consumed; no z-index used anywhere.

## Overall assessment

Directionally trustworthy, numerically loose, materially incomplete. Every flagged category is real and no claim is fabricated, but the two most consequential issues — systemic light-mode contrast failures and the stranded `@theme` utility bridge — were missed. Treat AUDIT.md as a style-hygiene checklist, not a complete standards audit.

## Top 3 corrections to the system — ✅ all resolved 2026-08-21

1. ~~Fix light-mode contrast tokens~~ — ink-3/green/orange/accent re-tuned in tokens.css + all 4 palettes (light and dark); **25/25 WCAG pairs verified passing** programmatically.
2. ~~Ship the `@theme inline` mapping in `styles/`~~ — new `styles/tailwind-theme.css`; `--sh-*` unified to `--shadow-*`; radii referenced by var.
3. ~~Add motion + type-scale tokens and sweep~~ — `--ease-out-quint` (3 curves → 1), `--duration-*`, 5-step type scale, `--radius-sm/md`; components + preview swept.

Also resolved: hover durations unified to 150ms, reduced-motion now covers transitions, stale `variant` claim fixed in AUDIT.md, vestigial `variant` props removed.

## Accepted exceptions — Switch promotion (2026-08-27)

- **Off-state track contrast**: `--line-strong` on canvas ≈ 1.4–1.8:1, below the 3:1 non-text minimum. Accepted: state is conveyed redundantly (thumb position + `aria-checked` + on-state accent fill); the off track is deliberately recessive, matching RadioCheck's off state. Not gated; revisit if a "quiet off" complaint surfaces.
- **Switch `sm` touch target** (18×30px): sanctioned sub-24px exception for dense popover rows (RecordsTable precedent); pair with a Field label or row-level hit area when used elsewhere. The default `md` is 24px tall and meets the floor.

## Accepted exception — DropdownMenu keyboard architecture (2026-08-27)

DropdownMenu keeps focus on the trigger and drives the active item via `aria-activedescendant`, matching Select's engine (one anchored-layer architecture system-wide). The APG menu-button pattern instead moves DOM focus into the menu; `aria-activedescendant` on a plain button is not spec-sanctioned, so some screen readers may not announce the active item. Accepted for architectural consistency; revisit with roving focus if assistive-tech testing shows announcement gaps.

## Accepted exception — Markdown heading mapping (2026-08-27)

Markdown renders `#`/`##`/`###+` as `h3`/`h4`/`h5+` on the compact type scale (text-title/lead/body) so AI output never competes with the host page's own h1/h2. This can skip heading levels in the DOM outline (WCAG advisory, not a failure). Bold-inside-italic degrades to plain emphasis (single-pass inline parser); `***bold-italic***` is supported directly.

## Accepted exception — Button outline border (2026-08-28)

The `outline` variant's `line-strong` border sits below the 3:1 non-text minimum against canvas (~1.4–1.9:1 across palettes). Accepted under WCAG 1.4.11's boundary exemption: the ≥4.5:1 text label identifies the control, matching the Switch off-track precedent. The border differentiates `outline` from `ghost` visually; both remain fully usable if it were invisible.

## 2026-08-29 — Production feedback round

Independent QA review (subagent) of the flat-elevation / light-default / tonal-avatar batch found 4 blockers, all fixed before commit: preview dark shadow tokens still drop shadows; `--sidebar` missing from preview dark block; five new icons unmirrored in `ICON_PATHS`; README still claimed OS auto-dark. Hardened `qa_check.py` per its recommendation: the flat-shadow gate now also scans `preview.html`. Rule 14 (`--sidebar` rails) received a real consumer (SidebarNav aside). Gate: PASSED.

## 2026-09-21 — Adoption scorecard (PLAN-adoption.md, Phase 0 baseline)

The external review of 0.2.0 scored **Installer and package hygiene 5/10** and **Compatibility with existing projects 4/10**. This turns both into lines a command or a file check can answer, measured against 0.3.0 on `staging` today. Re-score later phases by re-running the same checks; the score is PASS ÷ lines (PARTIAL counts 0).

Evidence gathered this pass: `install.sh` (551 lines), `scripts/formic_check.py`, `scripts/compose_check.py`, `.github/workflows/qa.yml`, `package.json`, `fixtures/*`, and `bash scripts/test_install.sh vite-fresh` run here (node 22.23, python 3.10, 22 s): **7/7 PASS** (install, deps, css, typecheck, build, gates, hook). `next-app` and `old-app` results are the Tester's recorded runs of the same script.

### A. Installer and package hygiene

| # | Line | Check | Phase | Baseline | Evidence |
|---|---|---|---|---|---|
| A1 | Peer dependencies declared in a manifest, optional ones marked | `grep -c peerDependencies package.json` ≥ 1 and `peerDependenciesMeta` present | 0 (done) / 1 | **PASS** | `package.json` declares 5 peers (react, react-dom, phosphor, 2× dicebear), dicebear ×2 marked optional. The installer does not read it: `install.sh:489` hardcodes the three package names |
| A2 | Every component's dependencies declared as data (npm, Formic files, CSS, type) | `ls registry/*.json` or a sidecar per component | 1 | **FAIL** | No `registry/`, no `registry.json`, no sidecars; 79 files in `components/`. The only declaration is a comment in `components/doodle.ts:10` |
| A3 | Dry run before write | `grep -c -- '--dry-run' install.sh` ≥ 1 | 2 | **FAIL** | 0 hits; install writes immediately (`rm -rf "$DEST/styles" …; cp -R`) |
| A4 | Diff against upstream before update | `grep -c -- '--diff' install.sh` (excluding the hook's `git diff --cached`) | 2 | **FAIL** | 0 hits; re-running the installer replaces `styles/`, `components/`, `scripts/` wholesale |
| A5 | Doctor command (Node, Tailwind, CSS order, alias, peers, ESLint ignore, config) | `grep -ci doctor install.sh` ≥ 1 or `npx formic doctor` | 2 | **FAIL** | 0 hits; no CLI package exists |
| A6 | Project config file records location, alias, CSS file, framework | `components.json` (or equivalent keys in `formic.config.json`) in the installed app | 2 | **PARTIAL** | `formic.config.json` is written, but holds design choices only (accent, palette, radius …); location/alias/CSS/framework are re-guessed inside `install.sh` on every run |
| A7 | Install location configurable | `install.sh <folder>` and `localise()` rewrite `src/formic` in the agent files | 0 (done) | **PASS** | `install.sh:22–29,401–405`; the gate script and hook use `$DEST`. Residue: `install.sh:526` and the scaffold's `Welcome.tsx` prompt prefix say `src/formic` literally |
| A8 | `@` alias resolved in both tsconfig and the bundler | scaffold: `grep alias vite.config.ts` and `grep paths tsconfig.json`; existing: installer adds or verifies it | 2 | **PARTIAL** | Scaffold writes both (`install.sh:81–92,94–113`). Existing projects: untouched; `old-app` has `paths` in tsconfig only, so `test_install.sh` has to import by relative path to build |
| A9 | CSS import order enforced (fonts → tailwindcss → formic) | `test_install.sh` step `css` | 2 | **PARTIAL** | Scaffold writes the order; existing: the awk at `install.sh:481–483` inserts around the single `@import "tailwindcss"` when exactly one CSS file has it, otherwise only prints instructions. `css` PASS on all three fixtures; nothing re-checks it after install |
| A10 | ESLint global ignore for the vendored folder written on request | `grep -n ignores` in the host's `eslint.config.*` after install | 2 / 3 | **FAIL** | `install.sh:534` prints a note only; `old-app` `eslint src/formic` fails with 100 errors (see B10) |
| A11 | Peer dependencies installed in existing projects | `test_install.sh` step `deps` (`node_modules/@phosphor-icons/react`, `@dicebear/core`) | 0 (done) | **PASS** | `install.sh:489` installs phosphor + 2× dicebear; `deps` PASS on vite-fresh, next-app, old-app |
| A12 | Automated install test per fixture | `bash scripts/test_install.sh <fixture>` exists and prints PASS/FAIL per step | 0 (done) | **PASS** | vite-fresh 7/7 PASS here; the script covers all three fixtures |
| A13 | CI install matrix on every PR, Ubuntu and macOS | `.github/workflows/qa.yml` job `install-matrix`, `on: pull_request` | 0 (done) | **PASS** | 2 OS × 3 fixtures; next-app and old-app run with `continue-on-error` (baseline) until Phase 3 |

**Score A: 5 PASS / 13 lines = 0.38 → 3.8 / 10** (review: 5/10).

### B. Compatibility with existing projects

| # | Line | Check | Phase | Baseline | Evidence |
|---|---|---|---|---|---|
| B1 | Pre-commit hook checks only staged files | `grep 'git diff --cached' .git/hooks/pre-commit`; `test_install.sh` step `hook` | 0 (done) | **PASS** | `install.sh:502`; `hook` PASS on all three fixtures (unrelated commit passes, legacy file refused) |
| B2 | Gates respect `scope` / `legacy` folders from a config | `grep -n 'scope\|legacy' scripts/formic_check.py scripts/compose_check.py` | 3 | **FAIL** | 0 hits; only `SKIP_DIRS` (`/formic/`, node_modules, dist, build, .next). `old-app` `npm run formic`: **10036 issues in 403 of 405 files**, every one pre-existing |
| B3 | Inventory command | `python3 scripts/formic_check.py --inventory src` | 0 (done) / 3 | **PASS** | `formic_check.py:114,127–136` lists every UI file, worst first; not yet ordered by route traffic (Phase 3 UI/UX) |
| B4 | Per-component add | `npx shadcn add @formic/<name>` or `install.sh --add <name>` | 1 / 2 | **FAIL** | All-or-nothing: `install.sh:348–357` copies `styles/`, `components/`, 5 scripts |
| B5 | Update by diff, preserving local edits | `npx formic update` / `--diff` | 2 | **FAIL** | See A4; an update is a wholesale replace |
| B6 | Next.js App Router supported (no hardcoded `src`) | `test_install.sh next-app` step `gates` | 2 | **FAIL** | `install.sh:412` writes `"formic": "… formic_check.py src && … compose_check.py src"`; next-app has `app/` and no `src/`, so `formic_check.py:124` exits "no .tsx/.jsx files under src". next-app: every other step PASS, `gates` FAIL |
| B7 | Monorepo (workspace root, package under `apps/*`) | a `fixtures/monorepo` and `test_install.sh monorepo` | 3 (Tester) | **FAIL** | `ls fixtures` → next-app, old-app, vite-fresh; `install.sh` has no workspace detection |
| B8 | Migration codemods (palette → tokens, raw elements → components, icons) | `grep -rli jscodeshift scripts/` | 3 | **FAIL** | 0 hits; migration is prose in AGENTS.md plus `--inventory` |
| B9 | Visual-regression proof of a migration | `grep -rli playwright .` outside `PLAN-adoption.md` | 3 | **FAIL** | 0 hits; no screenshot harness |
| B10 | Vendored folder survives the host's strict ESLint | `test_install.sh old-app` step `eslint` (`npx eslint src/formic`) | 3 | **FAIL** | **100 errors**: 71 `no-restricted-syntax` (raw `useEffect`), 14 missing `react-hooks` plugin rule referenced by Formic's own `eslint-disable` comments, 12 `no-non-null-assertion`, 2 `no-unused-vars`, 1 `no-console` |
| B11 | Coexistence with another kit detected and reported | doctor reports a second `components/ui`, a second icon package, a conflicting `tailwind.config` | 3 | **FAIL** | `old-app` ships `src/components/ui/{button,card}.tsx` on `lucide-react`; `install.sh` says nothing about it |
| B12 | Existing-project install passes end to end on the fixtures | `test_install.sh next-app` and `old-app` exit 0 | 3 | **PARTIAL** | next-app: 7/8 steps PASS (`gates` FAIL); old-app: 6/8 PASS (`gates`, `eslint` FAIL) |

**Score B: 2 PASS / 12 lines = 0.17 → 1.7 / 10** (review: 4/10; the review credited the hook fix and `--inventory`, which landed in 0.3.0, and did not test B7–B9).

### What Phase 1 must change to move each FAIL

- A2 → a sidecar or header per component and `scripts/build_registry.py` writing `registry/registry.json` + one item per component; `qa_check.py` fails when stale.
- A3, A4, A5, B4, B5 → land with the registry: `npx shadcn add --dry-run` / `--diff` come free once items are served at `/r/<name>.json`; `doctor` is Phase 2's CLI (Phase 1 only needs the manifest it will read).
- A10, B10 → Phase 1 registry items carry the ESLint ignore as an instruction the CLI can write; until then, replace the 14 dangling `eslint-disable react-hooks/*` comments in `components/` so a host without that plugin does not error on them (a Phase 1 QA fix, no design change).
- B2 → Phase 1 adds the `formic` block (`scope`, `legacy`) to the schema the registry's `registry:base` item ships; Phase 3 makes the gates read it.
- B6 → Phase 1's `registry:base` item stops naming `src`; Phase 2's `init` detects `app/` vs `src/` and writes the gate script with the detected root.
- B7, B8, B9, B11 → out of Phase 1's scope (Phase 3, Tester and Frontend); recorded so the re-score after Phase 3 counts them.

Re-score rule: same 25 lines, same checks, PASS ÷ lines per category; Part 5 of the plan needs both ≥ 8/10 after Phase 3.
