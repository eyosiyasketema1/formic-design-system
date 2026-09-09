#!/usr/bin/env bash
# Formic AI Design System — project installer
#
#   New project (designers and coders alike — no files to edit):
#     curl -fsSL https://formicai.dev/install.sh | bash -s -- --new my-app
#
#   Existing project (run from its root):
#     curl -fsSL https://formicai.dev/install.sh | bash
#     curl -fsSL https://formicai.dev/install.sh | bash -s -- app/formic   # custom folder
#
# --new scaffolds Vite + React + Tailwind v4, wires the Formic CSS stack,
# drops in a demo dashboard, installs dependencies, and writes the
# instruction files every AI coding tool reads. Without --new it adds
# Formic to the project you are standing in. Both are safe to re-run: they
# refresh styles/ and components/ and leave your own files alone.
set -euo pipefail

REPO="https://github.com/eyosiyasketema1/formic-design-system.git"
NEW=0; APP=""; DEST="src/formic"
while [ $# -gt 0 ]; do
  case "$1" in
    --new) NEW=1; APP="${2:-}"; [ -n "$APP" ] && shift ;;
    -h|--help) printf 'usage: install.sh [--new <app-name>] [<folder>]\n  --new my-app   scaffold a new Vite + React + Tailwind app with Formic\n  <folder>       where to vendor Formic in an existing project (default src/formic)\n'; exit 0 ;;
    *) DEST="$1" ;;
  esac
  shift
done
DEST="${DEST%/}"

# No package.json here and nothing but dotfiles: an empty folder, so scaffold in place.
# (The folder you cd into is the app; no --new needed.)
if [ "$NEW" = 0 ] && [ ! -f package.json ] && [ -z "$(ls -A 2>/dev/null | grep -v '^\.' | head -1)" ]; then
  NEW=1; APP="."
fi

say()  { printf '  \033[32m✓\033[0m %s\n' "$1"; }
skip() { printf '  \033[90m–\033[0m %s\n' "$1"; }
die()  { printf '  \033[31m✗\033[0m %s\n' "$1" >&2; exit 1; }
warn() { printf '  \033[33m!\033[0m %s\n' "$1"; }

command -v git >/dev/null 2>&1 || die "git is required (https://git-scm.com)"

# ── 0. --new: scaffold a Vite + React + Tailwind v4 app first ────
if [ "$NEW" = 1 ]; then
  [ -n "$APP" ] || die "--new needs a folder name: install.sh --new my-app"
  case "$APP" in /*|..|*..*|*/*) die "--new takes a simple folder name, e.g. my-app (got '$APP')" ;; esac
  command -v npm >/dev/null 2>&1 || die "npm is required to scaffold an app (https://nodejs.org)"
  if [ "$APP" = "." ]; then APPNAME="$(basename "$PWD" | tr 'A-Z ' 'a-z-')"; else APPNAME="$APP"; [ -e "$APP" ] && die "$APP already exists; cd into it and run the installer there"; fi
  mkdir -p "$APP/src/pages"
  cat > "$APP/package.json" <<EOF
{
  "name": "$APPNAME",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": { "dev": "vite --open", "build": "tsc -b && vite build", "preview": "vite preview", "formic": "python3 src/formic/scripts/formic_check.py src && python3 src/formic/scripts/compose_check.py src" },
  "dependencies": {
    "@dicebear/core": "^9.2.2",
    "@dicebear/notionists": "^9.2.2",
    "@tabler/icons-react": "^3.31.0",
    "react": "^19.1.0",
    "react-dom": "^19.1.0"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.1.0",
    "@types/react": "^19.1.0",
    "@types/react-dom": "^19.1.0",
    "@vitejs/plugin-react": "^4.4.0",
    "tailwindcss": "^4.1.0",
    "typescript": "~5.8.0",
    "vite": "^6.3.0"
  }
}
EOF
  cat > "$APP/vite.config.ts" <<'EOF'
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({ plugins: [react(), tailwindcss()] });
EOF
  cat > "$APP/tsconfig.json" <<'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["src"]
}
EOF
  cat > "$APP/index.html" <<EOF
<!doctype html>
<html lang="en" data-theme="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>$APP</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
EOF
  cat > "$APP/src/main.tsx" <<'EOF'
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
EOF
  cat > "$APP/src/index.css" <<'EOF'
@import "./formic/styles/fonts.css";    /* first: the Urbanist font */
@import "tailwindcss";
@import "./formic/styles/formic.css";   /* tokens, palettes, Tailwind bridge, component sheets */
EOF
  cat > "$APP/src/App.tsx" <<'EOF'
import Welcome from "./pages/Welcome";

export default function App() {
  return <Welcome />;
}
EOF
  cat > "$APP/src/pages/Welcome.tsx" <<'EOF'
/* Brief
   Reader:   the person who just ran the installer, in the browser it opened
   Question: did it work, and what do I do next?
   Action:   open their AI tool in this folder and paste the test prompt
   Register: text
*/
/* The first page. Your AI tool replaces it with the dashboard when you paste
   the prompt below; nothing here is meant to stay. */
import InputCopy from "../formic/components/InputCopy";
import Panel from "../formic/components/Panel";
import { FormicMark } from "../formic/components/brand";
import { Icon } from "../formic/components/primitives";

const PROMPT = "Use Formic (src/formic), read AGENTS.md, then replace the welcome page with the studio dashboard: AppSidebar rail, page header, four StatCards, a revenue LineChart in a Panel and a recent invoices DataTable, filled with the demo data the components ship (Formic Studio, ETB), not empty states.";
const READY = [
  "Components and tokens in src/formic",
  "Tailwind wired: fonts, tokens, palettes",
  "Rules for Claude Code, Cursor, Copilot and Codex",
  "Two checks that run before every commit",
];

export default function Welcome() {
  return (
    <main className="min-h-dvh bg-canvas">
      <div className="page-content flex flex-col gap-6 p-6 sm:p-8">
        <header className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-md bg-accent-tint text-accent"><FormicMark size={22} /></span>
          <div className="min-w-0">
            <h1 className="text-display font-semibold text-ink">Formic is working</h1>
            <p className="mt-0.5 text-caption text-ink-2">Everything is set up. Your AI tool builds the rest.</p>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-2">
          <Panel title="What the installer set up">
            <ul className="flex flex-col gap-2">
              {READY.map((item) => (
                <li key={item} className="flex items-center gap-2 text-body text-ink">
                  <Icon name="circle-check" size={16} className="shrink-0 text-green" />
                  {item}
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="Next: build the dashboard" caption="Open your AI tool in this folder, then paste">
            <div className="flex flex-col gap-3">
              <InputCopy label="Claude Code, in the same terminal" value="claude" />
              <InputCopy label="The test prompt" value={PROMPT} mono={false} variant="button" />
              <p className="text-caption text-ink-2">Cursor or Copilot: open this folder, then paste the prompt. The result looks like the gallery; if it looks generic, say "That is not Formic, read AGENTS.md and redo it".</p>
            </div>
          </Panel>
        </div>
      </div>
    </main>
  );
}
EOF
  printf 'node_modules\ndist\n.DS_Store\n*.log\n' > "$APP/.gitignore"
  cd "$APP"
  DEST="src/formic"
fi

[ -d .git ] || [ -f package.json ] || die "run this from your project root (no .git or package.json here)"

case "$DEST" in
  ""|.|..|/*|*..*) die "install folder must be a relative path inside the project, e.g. src/formic (got '$DEST')" ;;
esac
if [ -d "$DEST/styles" ] && [ ! -f "$DEST/VERSION" ]; then
  die "$DEST/styles already exists and is not a Formic install; pick another folder: install.sh <folder>"
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
printf '\nFormic AI Design System → %s\n\n' "$DEST"
git clone --quiet --depth 1 "$REPO" "$TMP/formic" || die "clone failed"
SHA="$(git -C "$TMP/formic" rev-parse --short HEAD)"

# ── 1. The system itself ───────────────────────────────────
mkdir -p "$DEST"
rm -rf "$DEST/styles" "$DEST/components" "$DEST/scripts"
cp -R "$TMP/formic/styles" "$DEST/styles"
cp -R "$TMP/formic/components" "$DEST/components"
mkdir -p "$DEST/scripts"
cp "$TMP/formic/scripts/set_accent.py" "$DEST/scripts/set_accent.py"
cp "$TMP/formic/scripts/apply_config.py" "$DEST/scripts/apply_config.py"
cp "$TMP/formic/scripts/palette.py" "$DEST/scripts/palette.py"
cp "$TMP/formic/scripts/compose_check.py" "$DEST/scripts/compose_check.py"
cp "$TMP/formic/scripts/formic_check.py" "$DEST/scripts/formic_check.py"
printf 'formic-design-system %s\nhttps://github.com/eyosiyasketema1/formic-design-system\nre-run install.sh to update\n' "$SHA" > "$DEST/VERSION"
say "$DEST/styles, $DEST/components and $DEST/scripts (commit $SHA)"

# ── 1b. formic.config.json — the app's choices, kept across updates ──
# styles/ and components/ were just replaced, so the accent and the
# component defaults are back to stock. If the app has a config (from
# https://formicai.dev/customize, or edited by hand), re-apply it now;
# otherwise write the stock one so there is a file to edit.
if [ -f "$DEST/formic.config.json" ]; then
  if command -v python3 >/dev/null 2>&1; then
    python3 "$DEST/scripts/apply_config.py" >/dev/null && say "$DEST/formic.config.json re-applied (accent, html attributes, component defaults)" \
      || warn "$DEST/formic.config.json could not be applied; run python3 $DEST/scripts/apply_config.py"
  else
    warn "python3 not found; run python3 $DEST/scripts/apply_config.py to re-apply $DEST/formic.config.json"
  fi
else
  # First install: start from the stock choices, but read what the app's
  # index.html already says (data-theme, data-palette, data-radius,
  # data-size, data-layout) so the file describes the app as it is, then apply it —
  # a fresh install and an update must leave the same files behind.
  cp "$TMP/formic/formic.config.json" "$DEST/formic.config.json"
  if command -v python3 >/dev/null 2>&1; then
    python3 - "$DEST/formic.config.json" <<'PY' || true
import json, re, sys
from pathlib import Path
cfg_path = Path(sys.argv[1]); cfg = json.loads(cfg_path.read_text())
html = Path("index.html")
if html.exists() and 'id="root"' in html.read_text():
    tag = re.search(r"<html\b([^>]*)>", html.read_text())
    attrs = dict(re.findall(r'data-(theme|palette|radius|corners|size|type|layout)="([^"]+)"', tag.group(1) if tag else ""))
    for k in ("theme", "palette", "radius", "corners", "size", "type", "layout"):
        if k in attrs:
            cfg[k] = attrs[k]
cfg_path.write_text(json.dumps(cfg, indent=2) + "\n")
PY
    python3 "$DEST/scripts/apply_config.py" >/dev/null && say "$DEST/formic.config.json (stock choices, seeded from index.html; change them at https://formicai.dev/customize)" \
      || warn "$DEST/formic.config.json written but not applied; run python3 $DEST/scripts/apply_config.py"
  else
    say "$DEST/formic.config.json (stock choices; python3 not found, so run $DEST/scripts/apply_config.py once it is)"
  fi
fi

# Rewrite the default path if the caller chose another folder.
localise() { # file
  if [ "$DEST" != "src/formic" ]; then
    sed "s#src/formic#$DEST#g" "$1" > "$1.tmp" && mv "$1.tmp" "$1"
  fi
}

# ── 1b. `npm run formic` — the two gates, one command ──────
if [ -f package.json ] && ! grep -q '"formic"' package.json && command -v node >/dev/null 2>&1; then
  node -e '
    const fs = require("fs"); const p = JSON.parse(fs.readFileSync("package.json", "utf8"));
    p.scripts = p.scripts || {};
    p.scripts.formic = "python3 '"$DEST"'/scripts/formic_check.py src && python3 '"$DEST"'/scripts/compose_check.py src";
    fs.writeFileSync("package.json", JSON.stringify(p, null, 2) + "\n");
  ' && say "package.json: npm run formic (formic_check + compose_check)" || warn "could not add the formic script to package.json; run the two scripts in $DEST/scripts directly"
fi

# ── 2. AGENTS.md — read natively by Cursor, Copilot, Codex, and most agents ──
if [ ! -f AGENTS.md ]; then
  cp "$TMP/formic/AGENTS.md" AGENTS.md; localise AGENTS.md
  say "AGENTS.md"
elif ! grep -q "Formic" AGENTS.md; then
  { printf '\n\n'; cat "$TMP/formic/AGENTS.md"; } >> AGENTS.md; localise AGENTS.md
  say "AGENTS.md (Formic section appended to your existing file)"
else
  cp "$TMP/formic/AGENTS.md" AGENTS.md.formic; localise AGENTS.md.formic
  skip "AGENTS.md already mentions Formic; fresh copy left at AGENTS.md.formic for you to merge"
fi

# ── 3. Claude Code — project skill + CLAUDE.md pointer ─────
mkdir -p .claude/skills/formic-design-system
cp "$TMP/formic/skill/SKILL.md" .claude/skills/formic-design-system/SKILL.md
localise .claude/skills/formic-design-system/SKILL.md
say ".claude/skills/formic-design-system/SKILL.md"
if [ ! -f CLAUDE.md ] || ! grep -q "Formic" CLAUDE.md; then
  cat >> CLAUDE.md <<EOF

## UI: Formic AI Design System

All UI in this project is built with Formic, vendored at \`$DEST/\`. Before writing or changing any UI, read \`AGENTS.md\` at the project root and follow its procedure: import components from \`$DEST/components\` (never a raw <button>, <input>, <table> or <svg>; when no component fits, build one in \`$DEST/components\` from primitives and say so), use only the token utilities (\`text-ink\`, \`bg-surface\`, \`text-body\`, ...), never hardcode colours, font sizes, radii, shadows, or easings, and finish by running \`python3 $DEST/scripts/formic_check.py src\` and \`python3 $DEST/scripts/compose_check.py src\` until both pass.
EOF
  say "CLAUDE.md (Formic section)"
else
  skip "CLAUDE.md already mentions Formic"
fi

# ── 4. Cursor — always-on rule ─────────────────────────────
mkdir -p .cursor/rules
cat > .cursor/rules/formic-design-system.mdc <<EOF
---
description: Formic AI Design System — how UI is built in this project
alwaysApply: true
---

All UI in this project is built with the Formic AI Design System, vendored at \`$DEST/\`.

Before writing or changing any UI, read @AGENTS.md and follow its procedure in order: confirm \`$DEST/styles/tokens.css\` exists, read it, list \`$DEST/components/\`, import existing components instead of re-creating them, compose new patterns from \`$DEST/components/primitives.tsx\`, build only from its components (a raw <button>, <input>, <table> or <svg> in a page is a defect; when no component fits, build one in \`$DEST/components\` from primitives and say so), and finish by running \`python3 $DEST/scripts/formic_check.py src\` and \`python3 $DEST/scripts/compose_check.py src\` until both pass.
EOF
say ".cursor/rules/formic-design-system.mdc"

# ── 5. GitHub Copilot — repository instructions ────────────
mkdir -p .github
if [ ! -f .github/copilot-instructions.md ] || ! grep -q "Formic" .github/copilot-instructions.md; then
  cat >> .github/copilot-instructions.md <<EOF

## UI: Formic AI Design System

All UI in this project is built with the Formic AI Design System, vendored at \`$DEST/\`. Before writing or changing any UI, read \`AGENTS.md\` at the project root and follow its procedure: import components from \`$DEST/components\` (never a raw <button>, <input>, <table> or <svg>; when no component fits, build one in \`$DEST/components\` from primitives and say so), use only the token utilities (\`text-ink\`, \`bg-surface\`, \`text-body\`, ...), never hardcode colours, font sizes, radii, shadows, or easings, and finish by running \`python3 $DEST/scripts/formic_check.py src\` and \`python3 $DEST/scripts/compose_check.py src\` until both pass.
EOF
  say ".github/copilot-instructions.md (Formic section)"
else
  skip ".github/copilot-instructions.md already mentions Formic"
fi

# ── 5b. Existing project: wire the CSS and the icon package when it is unambiguous ──
CSS_WIRED=0; DEPS_WIRED=0
if [ "$NEW" != 1 ]; then
  CSS_FILES="$(grep -rl --include=*.css '@import "tailwindcss"' src app styles 2>/dev/null | grep -v "^$DEST/" | grep -v "/$DEST/" | head -5 || true)"
  if [ "$(printf '%s\n' "$CSS_FILES" | grep -c .)" = 1 ] && ! grep -q "formic.css" "$CSS_FILES"; then
    REL="$(python3 -c "import os,sys; print(os.path.relpath(sys.argv[1], os.path.dirname(sys.argv[2])))" "$DEST" "$CSS_FILES" 2>/dev/null || echo "$DEST")"
    case "$REL" in .*|/*) ;; *) REL="./$REL" ;; esac
    awk -v rel="$REL" '
      /@import "tailwindcss"/ && !done { print "@import \"" rel "/styles/fonts.css\";    /* first: the Urbanist font */"; print; print "@import \"" rel "/styles/formic.css\";   /* tokens, palettes, Tailwind bridge, component sheets */"; done=1; next }
      { print }' "$CSS_FILES" > "$CSS_FILES.tmp" && mv "$CSS_FILES.tmp" "$CSS_FILES" && CSS_WIRED=1 && say "$CSS_FILES: Formic imports added around @import \"tailwindcss\""
  elif [ -n "$CSS_FILES" ] && grep -q "formic.css" $CSS_FILES 2>/dev/null; then
    CSS_WIRED=1
  fi
  if [ -f package.json ] && command -v npm >/dev/null 2>&1; then
    if grep -q '"@tabler/icons-react"' package.json; then DEPS_WIRED=1
    else npm install --silent --no-fund --no-audit @tabler/icons-react && DEPS_WIRED=1 && say "@tabler/icons-react installed"; fi
  fi
fi

# ── 5c. Git hook: the two gates run on every commit ─────────
write_hook() {
  [ -d .git ] || return 0
  mkdir -p .git/hooks
  if [ ! -f .git/hooks/pre-commit ]; then
    printf '#!/bin/sh\n# Formic gates: how it was built, and what is on the screen\npython3 %s/scripts/formic_check.py src && python3 %s/scripts/compose_check.py src\n' "$DEST" "$DEST" > .git/hooks/pre-commit
    chmod +x .git/hooks/pre-commit && say ".git/hooks/pre-commit (formic_check + compose_check run before every commit)"
  elif ! grep -q "formic_check" .git/hooks/pre-commit; then
    printf '\n# Formic gates\npython3 %s/scripts/formic_check.py src && python3 %s/scripts/compose_check.py src || exit 1\n' "$DEST" "$DEST" >> .git/hooks/pre-commit
    say ".git/hooks/pre-commit (Formic gates appended)"
  fi
}
[ "$NEW" = 1 ] || write_hook

# ── 6. Finish ──────────────────────────────────────────────
if [ "$NEW" = 1 ]; then
  printf '\nInstalling dependencies (npm install)…\n'
  npm install --silent --no-fund --no-audit || die "npm install failed — run it again inside $APP"
  say "dependencies installed"
  [ -d .git ] || { git init -q && git add -A && git -c user.name=formic -c user.email=formic@formicai.dev commit -qm "Formic starter" >/dev/null 2>&1 && say "git repository initialised"; } || true
  write_hook
  printf '\nDone. Run it:\n'
  if [ "$APP" = "." ]; then printf '  npm run dev        # the browser opens a page that says Formic is working\n\n'; else printf '  cd %s && npm run dev        # the browser opens a page that says Formic is working\n\n' "$APP"; fi
  printf 'Then open your AI tool in this folder (type claude here, or open the folder in Cursor) and paste the test prompt:\n'
  printf '  Use Formic (src/formic), read AGENTS.md, then replace the welcome page with the studio dashboard: AppSidebar rail, page header, four StatCards, a revenue LineChart in a Panel and a recent invoices DataTable, filled with the demo data the components ship (Formic Studio, ETB), not empty states.\n\n'
  printf 'Info: your own colours, font and rail come from https://formicai.dev/customize (copy, paste into the same chat).\n'
  printf '      The Formic gates run on every commit; `npm run formic` runs them any time.\n\n'
  exit 0
fi

if [ "$CSS_WIRED" = 1 ] && [ "$DEPS_WIRED" = 1 ]; then
  printf '\nDone. Open your AI tool in this folder and paste:\n'
else
  printf '\nDone, with one thing left by hand:\n'
  [ "$DEPS_WIRED" = 1 ] || printf '  • npm install @tabler/icons-react\n'
  [ "$CSS_WIRED" = 1 ] || { printf '  • In your global CSS (Tailwind v4), in this order:\n'; printf '       @import "<path to>/%s/styles/fonts.css";\n       @import "tailwindcss";\n       @import "<path to>/%s/styles/formic.css";\n' "$DEST" "$DEST"; }
  printf 'Then open your AI tool in this folder and paste:\n'
fi
printf '  Use Formic (%s), read AGENTS.md, then build the studio dashboard: AppSidebar rail, page header, four StatCards, a revenue LineChart in a Panel and a recent invoices DataTable, filled with the demo data the components ship (Formic Studio, ETB), not empty states.\n\n' "$DEST"
printf 'Info: your own colours, font and rail come from https://formicai.dev/customize (copy, paste into the same chat).\n'
printf '      The Formic gates run on every commit; `npm run formic` runs them any time.\n\n'
