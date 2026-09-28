# HANDOFF

The living memory of this project for any AI tool or person picking it up cold. Read this first, then `CLAUDE.md` (the rules), then `AGENTS.md` (how apps built on Formic are composed). Every agent that finishes a unit of work updates the **Where we are** and **Log** sections of this file in the same commit. If this file and the code disagree, the code is right and this file gets fixed.

Last updated: 2026-09-28 (session: AI guide, navbar, landing fixes)

---

## 1. What this is

**Formic AI Design System**: an open-source (MIT) React + Tailwind v4 design system built so AI coding tools (Claude Code, Cursor, Copilot, Codex) produce screens a designer would sign off. 75+ token-driven components for chat, agents, dashboards and forms; WCAG AA in light, dark and ten palettes; two gates (`formic_check.py`, `compose_check.py`) that refuse generic UI. One command installs it (`npx formicai init`); after that the user only prompts.

- Site: https://formicai.dev (production, branch `main`)
- Staging: https://staging.formicai.dev (branch `staging`, Vercel login-protected)
- Repo: https://github.com/eyosiyasketema1/formic-design-system
- npm: `formicai` (the CLI), currently **0.5.1**; `package.json` and `cli/package.json` versions match
- Gallery: `/preview.html`; customizer: `/customize`; AI guide: `/llm-info`; registry: `/r/registry.json`

## 2. Who

- **Maintainer:** Eyosiyas Ketema, product designer, Addis Ababa. GitHub `eyosiyasketema1`, LinkedIn `eyosiyas-ketema`, Telegram `eyosiyasketema`, email eyosiyasketema@gmail.com, Buy Me a Coffee `eyosiyaskei`. He is a designer, not a developer: explain in plain terms, give exact commands, never assume git or npm fluency.
- **Commits in the log may say "Turumba Team"**; that is the same person's git identity.

## 3. How we work (non-negotiable, learned the hard way)

1. **The maintainer runs every git command.** The agent never commits or pushes. After each unit of work the agent hands this block:
   ```bash
   cd "/Users/eyosiyasketema/Personal Projects/AI Design System"
   rm -f .git/index.lock
   git add -A && git commit -m "Scope: what changed" && git push
   ```
   Work happens on `staging` directly (the maintainer pushes there); releases are a PR `staging → main`. `main` rejects anything else (CI "Only staging reaches main").
2. **Before handing the commit:** `python3 scripts/qa_check.py && python3 scripts/check_sri.py` must pass. Landing changes need `python3 scripts/build_landing.py` first (the gate checks the build is current). Guide text changes need `python3 scripts/build_ai_guide.py`.
3. **Secrets never appear in chat**: API keys, tokens, `WAITLIST_SECRET`, `POLAR_*`, `PRO_PUBLISH_SECRET`, `NPM_TOKEN`. They live in Vercel env vars and the git-ignored `.env.local`.
4. **No em dashes** in any user-facing copy (site, CLI output, docs, README). Use commas, colons or full stops.
5. **The word "shadcn" never appears** in anything a user reads (CLI, README, site, docs). Internally the registry format is shadcn-compatible; call it "the registry".
6. **Tokens only** in components; every primitive and component change is mirrored in `preview.html`; demo content is Formic's own world (a design studio, its clients, invoices, agents), never a reference's content.
7. **The sandbox cannot delete files inside the user folder** (`unlink` is refused). Rename or overwrite instead, and tell the maintainer what to delete by hand.
8. **Test apps live outside the repo folder.** A `test-app-v2` folder inside the repo is untracked (`.gitignore` has `/test-app*/`); never `git add` it.
9. **Replies are concise.** No recap, no bullet spam; one question at most.
10. **Releases:** bump `version` in `package.json`, `cli/package.json`, `FORMIC_VERSION` in `preview.html`, add a `CHANGELOG.md` entry, PR `staging → main`, GitHub release `vX.Y.Z`, then the maintainer runs `cd cli && npm publish --access public` with his 2FA code (the `publish-cli.yml` workflow exists but `NPM_TOKEN` is not set, so publishing is manual).

## 4. Architecture

### Repo map
- `styles/tokens.css` (source of truth: tokens light+dark, keyframes, focus rule), `styles/themes.css` (10 palettes), `styles/tailwind-theme.css` (Tailwind v4 bridge), `styles/brands.css`
- `components/*.tsx` (79 components; `primitives.tsx`, `hooks.ts`, `charts.tsx`, `cards.tsx`, `brand.tsx`, `config.ts` read `formic.config.json` defaults)
- `preview.html` (standalone gallery: CDN React + Babel, inline mirrors of every component, the customizer at `#/customize`, per-variant "Copy prompt", element picker, deep links `#/<page>?card=<slug>`; `FORMIC_VERSION` inside)
- `index.html` + `landing.jsx` + `landing.tailwind.css` → `scripts/build_landing.py` → `landing.css` + `landing.js` (committed; no Babel or Tailwind CDN at runtime)
- `ai-guide.html` (built by `scripts/build_ai_guide.py` from the top of `llms-full.txt`; served at `/llm-info`; `.gitignore` has an explicit `!/ai-guide.html`)
- `llms.txt`, `llms-full.txt` (guide for AI assistants + README + AGENTS.md), `robots.txt`, `sitemap.xml`, `BingSiteAuth.xml`
- `registry/` (built by `scripts/build_registry.py`: one JSON per component + `formic` base + `formic-all` + `registry.json`; served at `/r/<name>.json`)
- `cli/` (the `formicai` npm package: ESM, zero deps, Node ≥ 20; `bin/formicai.js`, `lib/*.js`, `templates/` scaffold incl. `Welcome.tsx`, `test/run.sh` 184 steps, `test/pro-server.mjs`)
- `install.sh` (legacy installer, kept for the old link; heredocs must equal `cli/templates`, the gate checks)
- `scripts/`: `qa_check.py` (the gate), `check_sri.py`, `build_*`, `apply_config.py`, `set_accent.py`, `palette.py`, `formic_check.py`, `compose_check.py` (the two app gates, copied into apps), `test_install.sh`, `visual_check.*`, `publish_pro.py`, `announce.py`, `indexnow.py`
- `api/`: `waitlist.js`, `unsubscribe.js` (Upstash + Resend), `pro/` (`item.js`, `activate.js`, `publish.js`, `_lib.js`, `test.mjs`, `README.md`)
- `fixtures/` (vite-fresh, next-app, old-app for the CI install matrix), `.github/workflows/` (`qa.yml`, `publish-cli.yml`)
- `skill/SKILL.md` + `formic-design-system.skill`, `skills/formic-design-system/SKILL.md` (agent skill, `npx skills add eyosiyasketema1/formic-design-system`)
- Docs: `CLAUDE.md` (rules), `AGENTS.md` (composition for apps), `PLAN-adoption.md` (the phased plan, all phases done), `QA-REPORT.md`, `AUDIT.md`, `CHANGELOG.md`, `CONTRIBUTING.md`

### How an app uses Formic
`npx formicai init` vendors `src/formic/{styles,components,scripts}` into a project (base only by default; `--all` for everything; `--new my-app` scaffolds Vite + React + Tailwind v4 with a Welcome page holding three test prompts), writes `components.json` (`@formic`, `@formic-pro` registries), a `formic` section in `package.json` (`dir`, `srcDir`, `scope`, `legacy`), instruction files for AI tools, and a pre-commit hook running the gates. `formicai add <name>` installs a component and its deps; `update` uses `registry.lock` (sha256); `doctor`, `gates`, `inventory`, `scope add|remove`, `migrate` (regex codemods with `formic-todo` marks), `docs`, `mcp` (JSON-RPC stdio server; `mcp install` writes `.mcp.json` and `.cursor/mcp.json`), `preset <code>`, `key <key>` (Pro). Every prompt in an app starts `Use Formic (src/formic), read AGENTS.md, then ...`.

`formic.config.json` is the source of truth for an app's look (accent, palette, radius, cardRadius, corners, controls, size, type, theme, avatar, sidebar, sidebarState, font, layout, motion); `scripts/apply_config.py` applies it. `AppShell` mounts the rail the config names; `rail="chat"` and `rail="none"` exist for chat and bare pages.

### Landing page specifics (things that bit us)
- The header is a transparent bar (blur and glass were removed on 2026-09-28 at the maintainer's request). Nav links and the logomark turn white over surfaces marked `data-dark` (value cards, promo card, live section photo); the hero has its own handling; `data-scrolled` flips ink colours once the hero is past. In dark mode the logomark stays inverted.
- `/assets/*` is cached for a year (immutable). **Replacing an image with the same name needs a `?v=N` bump on its reference in `index.html`** or the old one keeps showing.
- Every external `<script>` needs an SRI hash (`check_sri.py`); change a CDN URL and update its hash.
- Test prompts on the landing and in the Welcome page are collapsible `<details>`; the three prompts are dashboard, course registration stepper, workspace settings.

### Pro (built, not yet live)
Open core: everything so far is MIT; new components and a builder page will be Pro in a private `formic-pro` repo, sold through Polar (license-key benefit), installed by the same CLI into `src/formic/pro/`. Backend in `api/pro/` with verbatim error codes (`missing_key`, `invalid_key`, `expired`, `revoked`, `wrong_product`, `not_found`, `rate_limited`, `not_configured`), Upstash keys `pro:registry`, `pro:item:<name>`, `pro:names`, 10-minute verdict cache. Env needed in Vercel: `POLAR_ORG_ID`, `POLAR_BENEFIT_ID`, `PRO_PUBLISH_SECRET` (plus existing `KV_REST_API_*`). No price published; the site must not quote one.

## 5. Where we come from (history in one screen)

1. Built the system: tokens, ~80 components, gallery, customizer, landing, SEO, AI discoverability (llms files, FAQ, IndexNow, Search Console and Bing verified, sitemaps submitted).
2. Feedback round with three test prompts: fixed self-running demos (`demo` opt-in props), wrong rails, Button icon names, autofill colour, header image aspect, Welcome page nudge.
3. External review scored installer hygiene 5/10 and existing-project compatibility 4/10. `PLAN-adoption.md` was written and executed in five phases with sub-agents: fixtures + CI matrix (0), registry (1), `formicai` CLI (2), migration/scope/legacy/visual check (3), skill + MCP + docs + presets + base-only install (4), Pro rails (5). Scores now 9.2/9.2. Releases 0.3.0, 0.4.0, 0.5.0, 0.5.1.
4. Landing polish: skill card back, 3D promo scene off, accent wash on the Live section, two after-cards (customizer, gates) now borderless, footer "Hey AI, your official guide to Formic" link beside the copyright (right-aligned).
5. Gallery: per-variant "Copy prompt" with the demo JSX, an element picker, deep links; the "copy link" button was removed.
6. AI guide: structured guide for AI assistants (shape borrowed from Awesomic's llm-info page, content our own) at the top of `llms-full.txt`, rendered raw at `/llm-info`, with a Created by section. "75+ components" is the number to use.
7. Navbar: tried progressive blur, then glass (sheen, lens band, displacement filter); the maintainer chose none of it. The bar is transparent now.

## 6. Where we are going (agreed roadmap, in order)

1. **Formic Pro**: maintainer creates the Polar org, product and License Keys benefit, sets the three env vars, tests with a sandbox key; agent then builds the `/pro` page (needs the component list and price from the maintainer), the private `formic-pro` repo with a CI job calling `scripts/publish_pro.py`, and the first Pro components. No accounts for now.
2. **Studio** at `/studio` (password-protected admin on `AppShell`): waitlist `DataTable`, announcement draft-and-send (Resend, same path as `scripts/announce.py`), send history. Data in the existing Upstash store.
3. Bing Webmaster and Search Console are done; check Vercel Firewall for AI-bot blocking.
4. Deferred small items: gallery ice-cream content remnants in preview demo wrappers; landing Live-section per-element copy; monorepo fixture (B7); `init` writing the `@` alias (A8); optional `NPM_TOKEN` secret so releases publish the CLI automatically.

## 7. Where we are (current state, update every session)

- Branch `staging` is ahead of `main` by the whole run since 0.5.1 (landing, gallery picker, AI guide, navbar). **Nothing since 0.5.1 has been released to `main`**; when the maintainer is happy with staging, open the PR `staging → main`. No version bump is needed for site-only changes; a CLI or component change needs a release.
- All gates pass at the last hand-off (`qa_check.py`, `check_sri.py`).
- Open on the maintainer's side: Polar setup, Vercel Pro env vars, delete `test-app-v2` from the repo folder by hand if he wants, re-run the three test prompts on a fresh `npx formicai init --new` app.
- Last thing done: `assets/example.png` resized to 926x326 (same height as example2, palette PNG ~20 KB), reference bumped to `?v=3`.

## 8. Log (newest first; one line per unit of work)

- 2026-09-28: HANDOFF.md created; example image resized to match example2 and cache bust; logomark white in dark/over dark; navbar blur and glass removed; nav links white over `data-dark`; after-cards borderless; `/llm-info` raw guide page (+ gitignore exception); footer legal row right-aligned; AI guide head in `llms-full.txt` with Created by; 75+ components everywhere.
- 2026-09-27: gallery element picker and per-variant Copy prompt; footer AI link; two after-cards; accent wash 32%; promo scene off; skill card shown again.
- 2026-09-2x: release 0.5.1 (Welcome redesign, Button onClick event, Pro groundwork); Phase 5 Pro rails; Phase 4 agent layer; Phase 3 migration; Phase 2 CLI; Phase 1 registry; Phase 0 fixtures and CI; releases 0.3.0 to 0.5.0.
- Earlier: system build-out, landing, SEO, discoverability, feedback round (see `CHANGELOG.md` and `QA-REPORT.md`).
