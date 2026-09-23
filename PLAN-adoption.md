# Plan: adoption in existing projects and installer hygiene

The external review of 0.2.0 (an agent installing Formic into `sms-x`, a 446-file app with a strict ESLint config) scored two categories below 6/10:

| Category | Score | What the reviewer hit |
| --- | --- | --- |
| Installer and package hygiene | 5 / 10 | missing peer dependencies (`@dicebear/*`), Formic's own `useEffect` use tripping the host's lint rules, 50 uncompiled files dropped into `src/` |
| Compatibility with existing projects | 4 / 10 | the gates failed on every pre-existing file, the pre-commit hook blocked every commit, no path to adopt one screen at a time |

Everything else scored 8.5 to 9. This plan is only about those two rows. It is written for a maintainer leading it phase by phase with sub-agents; each phase names its owner, inputs, deliverables and an acceptance test that a Tester agent runs before the phase closes. Nothing in a later phase starts before the earlier phase's test passes.

## Part 1. Why we failed (root causes in our own code)

1. **All-or-nothing install.** `install.sh` copies all 70+ components, three stylesheets and four scripts in one go. There is no manifest of what a component needs (its npm packages, the other Formic files it imports, its CSS), so nothing can be added, updated or diffed one piece at a time. shadcn, Tailwind UI kits and Vercel's AI Elements all ship a per-item manifest; we ship a folder.
2. **No project config.** The install location (`src/formic`), the alias, the CSS file and the framework are guessed inside a bash script. shadcn keeps them in `components.json`; we keep them nowhere, so every later command has to guess again, and the scaffold's own `tsconfig.json` and `vite.config.ts` disagreed about the `@` alias until 0.3.0.
3. **Peer dependencies were not declared where the installer reads them.** `doodle.ts` imports `@dicebear/core` and `@dicebear/notionists` on demand; the new-app scaffold installed them, the existing-project path only installed Phosphor, and `tsc` failed on the first build. Fixed in 0.3.0 by installing both, but the real defect is that dependencies live in a comment at the top of a file instead of a manifest.
4. **The gates and the hook judged the whole app on day one.** `formic_check.py src` and `compose_check.py src` in the pre-commit hook failed on 446 files the person had not touched, so the only sane move was to delete the hook. 0.3.0 scopes the hook to the files in the commit and adds `--inventory`, but the host project still has no way to say "these folders are not on Formic yet" and have every tool respect it.
5. **Vendored code is held to the host's lint rules.** Formic's files use patterns a strict host config bans (`useEffect`, `no-restricted-syntax`). We told nobody to ignore `src/formic/**` in ESLint; the industry answer is a global ignore in the flat config, written or at least printed by the installer. 0.3.0 prints it; it should write it when asked.
6. **No dry run, no diff, no doctor.** A person cannot see what the installer will write before it writes it, cannot see what changed between their copy and the current release, and has no command that checks the project's readiness (Tailwind v4 present, CSS import order, alias, peer deps, Node version). shadcn CLI v4 ships `--dry-run`, `--diff`, `--view`, `info` and `docs` for exactly this.
7. **Migration is a paragraph, not a tool.** AGENTS.md now has a migration protocol and `--inventory`, but the work of converting an old page is still fully manual. The standard for large migrations is codemods (jscodeshift) for the mechanical part plus visual regression to prove nothing moved.
8. **No automated install test.** Every installer regression this month (Linux `node_modules` in a shared folder, the alias, the DiceBear packages, the hook) was found by a person. There is no CI job that installs into a fresh Vite app, a Next.js app and a fixture "old app" and builds them.

## Part 2. What the industry standard is (September 2026)

- **Distribution: a registry, consumed by the shadcn CLI.** shadcn/cli v4 (March 2026) is the de facto standard for copy-in design systems. A registry is a `registry.json` index plus one `registry-item.json` per item that lists its files, npm dependencies and registry dependencies; the CLI resolves dependencies recursively, installs packages with the host's package manager, writes files to the paths the host's `components.json` aliases define and rewrites imports. `registry:base` distributes an entire design system (components, CSS variables, fonts, config) as one install. Third-party registries are namespaced (`npx shadcn add @formic/button`). Sources: [shadcn/cli v4 changelog](https://ui.shadcn.com/docs/changelog/2026-03-cli-v4), [registry getting started](https://ui.shadcn.com/docs/registry/getting-started), [how the add command works](https://21st.dev/blog/shadcn-add-cli), [openstatus on building a registry](https://www.openstatus.dev/blog/shadcn-component-registry).
- **Inspect before writing, update by diff.** `add --dry-run`, `--diff` and `--view` show the payload or the difference against the local copy before anything changes; "check for updates from @shadcn and merge with my local changes" is a supported agent workflow. `shadcn info` prints framework, CSS variables and installed components for agents; `shadcn docs <component>` prints docs and examples from the terminal. Source: [shadcn/cli v4 changelog](https://ui.shadcn.com/docs/changelog/2026-03-cli-v4).
- **Paid and private components: an authenticated registry.** `components.json` can carry per-registry headers (`Authorization: Bearer ${REGISTRY_TOKEN}`) or params read from `.env.local`; the server answers 401/403 with a message the CLI shows verbatim ("Your subscription has expired. Renew at ..."). This is how licensed kits are sold on top of shadcn today. Source: [registry authentication](https://ui.shadcn.com/docs/registry/authentication).
- **Agents: skills and MCP, not prose alone.** shadcn ships `shadcn/skills` (installed with `skills add shadcn/ui`) so agents know the CLI, the flags and the component patterns, plus an MCP server for browsing and adding from registries. Presets (`init --preset <code>`) pack a whole design configuration into a short code an agent can be handed in a prompt. Source: [shadcn/cli v4 changelog](https://ui.shadcn.com/docs/changelog/2026-03-cli-v4), [skills](https://ui.shadcn.com/docs/skills).
- **Hooks check staged files only.** The established pattern is Husky plus lint-staged: pre-commit runs fast, file-local checks on the staged files; whole-project tools run in CI, not in the hook. Sources: [Better Stack](https://betterstack.com/community/guides/scaling-nodejs/husky-and-lint-staged/), [Built In](https://builtin.com/articles/lint-staged-with-husky-pre-commit).
- **Peer dependencies are declared, optional ones marked.** A component library declares what the host must provide in `peerDependencies`, marks on-demand ones optional in `peerDependenciesMeta`, and documents why. Sources: [npm peerDependencies guide (2026)](https://adhdecode.com/articles/npm/npm-peer-dependencies-guide/), [peer dependencies in depth](https://dev.to/icy0307/peer-dependencies-in-depth-1o3b).
- **Vendored code is globally ignored in ESLint.** In flat config a standalone `ignores` entry is a global ignore; ESLint 10 (April 2026) is flat-config only, and `includeIgnoreFile()` from `eslint/config` can reuse `.gitignore` patterns. Sources: [ESLint flat config ignores](https://eslint.org/blog/2025/03/flat-config-extends-define-config-global-ignores/), [migration guide](https://eslint.org/docs/latest/use/configure/migration-guide), [ESLint 10 release](https://infoq.com/news/2026/04/eslint-10-release).
- **Migrations at scale are codemods plus visual regression.** Incremental strategies (compatibility layer, module-by-module, strangler) with codemods (jscodeshift) for the mechanical rewrites and screenshot comparison to prove nothing moved; one team's token migration touched 2,500 files and 4,000 references in minutes. Sources: [CircleCI on incremental migration](https://circleci.com/blog/incremental-migration-approaches-for-legacy-applications/), [design token codemods](https://medium.com/@stevedodierlazaro/automate-design-token-migrations-with-codemods-a21cf8bbd53b), [design system migration at scale](https://www.linkedin.com/pulse/design-system-migration-scale-codemods-nikolai-lopin-3l0we), [migration playbook](https://hackernoon.com/design-systems-dont-die-they-freeze-heres-the-migration-playbook).

**The decision this research forces:** Formic should not keep its own bash installer as the primary path. It should publish a shadcn-compatible registry (`@formic`) and let the standard CLI do install, add, diff, dry run and auth, keeping its own small CLI only for what shadcn does not do: the gates, `apply_config`, the inventory and the migration codemods. That turns the 5/10 and 4/10 into the industry's own tooling, and it makes Pro a one-line change (an authenticated namespace) instead of a second installer.

## Part 3. The sub-agents

Each phase is led by the maintainer and executed by these agents; every agent reads `CLAUDE.md`, `AGENTS.md` and this file first, works on a topic branch into `staging`, and runs `python3 scripts/qa_check.py && python3 scripts/check_sri.py` before handing back.

| Agent | Owns | Standing instructions |
| --- | --- | --- |
| **Backend** | the registry endpoints (`/r/*.json`), the auth function, key issuance, `scripts/build_registry.py` | Vercel functions in CommonJS like `api/waitlist.js`; secrets only in Vercel env and `.env.local`; every endpoint has a curl test in the PR |
| **DevOps** | CI matrix, fixture repos, release automation, registry publishing on merge to `main` | `.github/workflows/`; nothing reaches `main` except from `staging`; every fixture install runs in CI on every PR |
| **Frontend** | the `formic` CLI (`init`, `doctor`, `gates`, `migrate`), `components.json` compatibility, the scaffold, `apply_config.py` changes | TypeScript CLI published as `formic` on npm, run with `npx formic`; no new runtime dependencies in components |
| **QA** | the gates (`formic_check`, `compose_check`, `qa_check`), the review of every phase against CLAUDE.md, the scorecard | verifies with greps and counts, never with the summary; owns `QA-REPORT.md` |
| **Tester** | acceptance tests per phase: fresh Vite app, fresh Next.js app, the "old app" fixture (400+ files, strict ESLint, `@` alias), a monorepo | a phase is closed only when the Tester's script passes on all fixtures in CI; writes the test before the phase starts |
| **Designer** | the visible surface of the tooling: CLI output, error messages, the doctor's report, the welcome page, docs pages | plain words, one action per message, no jargon the reviewer's screenshots would show as noise |
| **UI/UX** | the migration experience: inventory ordering, the codemod's before/after, the visual-regression report, AGENTS.md's migration section | judges each step by "what does the person do next"; owns the migration protocol text |

## Part 4. Phases

### Phase 0. Baseline and fixtures (Tester, DevOps, QA)

Goal: measure before changing anything, and make every later phase provable.

- Tester: three fixture projects committed under `fixtures/` (git-ignored `node_modules`): `vite-fresh` (empty), `next-app` (App Router, Tailwind v4, `@/` alias), `old-app` (a 400-file React app on Tailwind palette classes with a strict `eslint.config.js` banning raw `useEffect`, and a `components/ui` folder from another kit). A script `scripts/test_install.sh <fixture>` that installs Formic into a copy, runs `tsc`, `vite build` or `next build`, `npm run formic`, and a commit through the hook, and prints pass/fail per step.
- DevOps: a CI job `install-matrix` that runs the script on all three fixtures on Ubuntu and macOS for every PR.
- QA: the scorecard from the review turned into a checklist in `QA-REPORT.md` with the current pass/fail per line, so the score is measured, not felt.

Acceptance: the matrix runs green on `staging` for `vite-fresh`, and records the exact failures for `next-app` and `old-app` (they are allowed to fail here; the failures are the baseline).

### Phase 1. Manifest and registry (Backend, Frontend, QA)

Goal: every component is described by data, and the data is served in the standard format.

- Frontend: a header block or sidecar per component listing its npm dependencies, its Formic dependencies (the files it imports), its CSS files and its type (`registry:component`, `registry:ui`, `registry:lib`, `registry:style`). `scripts/build_registry.py` reads them and writes `registry/registry.json` plus one `registry/<name>.json` per item in the shadcn `registry-item.json` schema, and a `registry:base` item (`formic`) that carries the whole system: tokens, palettes, `formic.css`, fonts, `AGENTS.md`, the gates, `formic.config.json`.
- Backend: the registry served at `https://formicai.dev/r/{name}.json` (static files, `vercel.json` rewrite from `/r/`), with `registry.json` at `/r/registry.json`. Validated with `npx shadcn registry:build` and the registry health check.
- QA: `qa_check.py` gains a step that rebuilds the registry and fails when it is stale or when a component imports a file it does not declare.

Acceptance: `npx shadcn@latest add https://formicai.dev/r/button.json` into `vite-fresh` writes `Button.tsx`, `primitives.tsx` and the CSS it needs, installs Phosphor, and the app builds. `npx shadcn add https://formicai.dev/r/formic.json` installs everything the bash installer installs today.

### Phase 2. The standard CLI path, and a small `formic` CLI (Frontend, DevOps, Designer)

Goal: install, add, update and inspect through the standard tool; keep our own CLI only for what is ours.

- Frontend: `components.json` written by `formic init` (or by `shadcn init` with our `registry:base`), with the `@formic` namespace registered; the aliases, CSS file and framework detected once and stored. `npx formic` commands: `init` (detect framework, write `components.json`, wire the three CSS imports in the right order, add the ESLint global ignore when the person says yes, install peer deps, write the agent files), `doctor` (Node and Tailwind versions, CSS import order, alias in both `tsconfig` and the bundler config, peer deps present, ESLint ignore present, `formic.config.json` valid; each finding has a one-line fix), `gates` (what `npm run formic` runs), `inventory`, and `update` (wraps `shadcn add --diff` for every installed item). `install.sh` becomes a thin wrapper that runs `npx formic init` so the landing page command keeps working.
- DevOps: the `formic` package published to npm on release; `install.sh` and the registry published from `main` on merge.
- Designer: every message the CLI prints, the doctor's report and the welcome page's install step rewritten so a person who has never seen a registry understands what happened and what to do next.

Acceptance: on `vite-fresh` and `next-app`, `npx formic init` then `npx shadcn add @formic/data-table` produce a building app with no manual step; `npx formic doctor` prints all green; `--dry-run` shows the files before they are written; changing a component upstream and running `npx formic update` shows the diff and applies it without touching the person's edits elsewhere.

**Status (Frontend, September 2026):** delivered in `cli/` as the `formicai` package (public command `npx formicai …`): `init [--new] [--minimal] [--eslint-ignore] [--dry-run]`, `add [--overwrite] [--dry-run]` with nearest-name suggestions and `registry.lock`, `update [--yes] [--force] [--dry-run]` with per-file diffs and lock hashes that tell an upstream change from a local edit, `doctor` (every check with its fix, exit 1 on ✗), `gates`, `inventory`, `--help`, `--version`; `components.json` with the `@formic` registry; the `formic` section (`dir`, `srcDir`, `scope`, `legacy`) lives in `package.json` because the registry client's `components.json` schema rejects unknown keys; both Python gates take `--legacy`; `registry.json` carries `version`; the base item carries `SKILL.md`; `scripts/test_install.sh --cli` runs the matrix through the CLI (vite-fresh all green; next-app and old-app keep their Phase 0 baseline failures on `gates`, old-app's `doctor` reports the fixture's own missing Vite alias). Not done: publishing (`cd cli && npm publish`, maintainer), `install.sh` as a wrapper (after publishing), DevOps release automation, the Designer pass on the welcome page's install step.

### Phase 3. Existing-project compatibility (Frontend, UI/UX, QA, Tester)

Goal: `old-app` goes from 4/10 to green without the person deleting anything to get a commit through.

- Frontend: a `formic` section in `components.json` (or `formic.config.json`) with `scope` (folders that are on Formic) and `legacy` (folders the gates ignore until migrated); the gates, the hook and the inventory read it, so a team adopts one route at a time and the tools never shout about the rest. `formic init` in an existing project writes `legacy: ["src"]` and `scope: []` and says so. Peer dependencies declared once in the registry items and installed by the CLI; the ESLint global ignore for the install folder written on request. Coexistence with another kit checked by `doctor` (a second `components/ui`, a second icon package, `tailwind.config` with a conflicting theme) and reported, never silently mixed.
- UI/UX: the migration flow as a person experiences it: `formic inventory` orders files by how often they are seen (routes first), `formic migrate <file>` runs the codemods and prints what it could not do, and the person converts the rest with the agent; the AGENTS.md migration section rewritten around these commands.
- Frontend: codemods (jscodeshift) for the mechanical part: Tailwind palette classes to tokens (`bg-gray-100` → `bg-inset`, `text-blue-600` → `text-accent` and so on, table-driven), `rounded-lg` and shadows to the scale, raw `<button>` with a known class shape to `Button`, raw `<input>` inside a label to `Field` + `Input`, `lucide-react` icons to `Icon` names via `iconFor`. Each codemod leaves a `formic-todo` comment where it could not decide.
- Tester: a visual-regression harness (Playwright screenshots of every route in `old-app` before and after `formic migrate`, compared with a threshold), so a migration is proven not eyeballed.

Acceptance: `formic init` in `old-app` completes with the hook installed and an unrelated commit going through; `formic migrate` on the three busiest routes leaves them building, passing the gates and within the visual threshold; the inventory count drops by exactly those files.

### Phase 4. Agents on the standard rails (Frontend, Designer, QA)

Goal: what we do with `AGENTS.md` today, done the way agents now expect.

- Frontend: a Formic skill in the `skills` format (installable with `skills add formicai/formic`), covering the CLI, the registry, the flags and the composition rules; an MCP server (`npx formic mcp`) exposing `list`, `docs`, `add` and `inventory` so Claude Code, Cursor and Codex can browse and install without reading the gallery; `formic docs <component>` printing the component's props and an example.
- Designer: the customizer's copy block becomes a preset code (`formic init --preset <code>`), so a design choice travels in one string, as shadcn presets do.
- QA: the three test prompts re-run by the Tester through Claude Code and Cursor after every phase; the outcomes (screenshots, gate output) filed in `QA-REPORT.md`.

Acceptance: an agent given only "use Formic" in `next-app` installs what it needs through the MCP or CLI, and the result passes both gates and the composition review.

**Status (Frontend, September 2026):** delivered. The skill is installable with `npx skills add eyosiyasketema1/formic-design-system` (`skills/formic-design-system/SKILL.md`, mirrored from `skill/SKILL.md` by `build_registry.py`; `--check` fails when the two differ) and gained "The command line" and the rule *when a component you need is not in `src/formic/components`, run `npx formicai add <name>`; never write a stand-in* (also in AGENTS.md step 4 and the three test prompts). `formicai docs [<name>]` reads the props type out of the `.tsx` (installed copy or registry content) and prints props, defaults, doc comments, dependencies and an example. `formicai mcp` is a stdio JSON-RPC server (no SDK; `initialize`, `tools/list`, `tools/call`, `ping`) with `list_components`, `component_docs`, `add_component`, `inventory`, `doctor`, `gates`; `formicai mcp install` writes it into `.mcp.json` and `.cursor/mcp.json`, and `init` runs it (`--no-mcp` skips). Presets: `init --preset <code>` (base64url of the changed keys' JSON, shown under the customizer's copy block) and `formicai preset`. `init` now installs the base only (`--all` for every component; a new app also gets `button` and `panel` for its welcome page); `scripts/test_install.sh --cli` adds `app-shell panel button` before the smoke build. Not done: the Tester's re-run of the three prompts through Claude Code and Cursor with the outcomes filed in `QA-REPORT.md`; a CHANGELOG entry at the next release.

### Phase 5. Pro on the same rails (Backend, DevOps)

Goal: the paid tier without a second installer.

- Backend: an authenticated registry namespace (`@formic-pro`) served by a Vercel function that checks the license key in the `Authorization` header against the store (Upstash) and answers 401/403 with the exact message the CLI should show; keys issued by the store (Lemon Squeezy or Polar) through a webhook into Upstash; the free registry stays static.
- DevOps: `formic init --key <key>` writes the namespace and the `${FORMIC_KEY}` reference into `components.json` and the key into `.env.local`; the private repo publishes to the Pro registry on merge.

Acceptance: with a valid key, `npx shadcn add @formic-pro/agent-workspace` installs into all three fixtures; with an expired key, the CLI prints the renewal message and writes nothing.

## Part 5. What "done" looks like

- The two low rows re-scored by the same rubric on `old-app` after Phase 3: installer hygiene ≥ 8 (doctor green, peer deps declared, dry run, diff), existing-project compatibility ≥ 8 (scope and legacy respected, hook never blocks untouched files, three routes migrated with proof).
- The install matrix green on every PR, so a regression like this month's cannot reach a person again.
- One command for a new project and the same one for an old one, and the standard CLI for everything after.
