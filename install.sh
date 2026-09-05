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

say()  { printf '  \033[32m✓\033[0m %s\n' "$1"; }
skip() { printf '  \033[90m–\033[0m %s\n' "$1"; }
die()  { printf '  \033[31m✗\033[0m %s\n' "$1" >&2; exit 1; }

command -v git >/dev/null 2>&1 || die "git is required (https://git-scm.com)"

# ── 0. --new: scaffold a Vite + React + Tailwind v4 app first ────
if [ "$NEW" = 1 ]; then
  [ -n "$APP" ] || die "--new needs a folder name: install.sh --new my-app"
  case "$APP" in /*|.|..|*..*|*/*) die "--new takes a simple folder name, e.g. my-app (got '$APP')" ;; esac
  command -v npm >/dev/null 2>&1 || die "npm is required for --new (https://nodejs.org)"
  [ -e "$APP" ] && die "$APP already exists; pick another name or run without --new inside it"
  mkdir -p "$APP/src/pages"
  cat > "$APP/package.json" <<EOF
{
  "name": "$APP",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": { "dev": "vite --open", "build": "tsc -b && vite build", "preview": "vite preview" },
  "dependencies": {
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
@import "./formic/styles/fonts.css";          /* first: the Urbanist font */
@import "tailwindcss";
@import "./formic/styles/tokens.css";          /* source of truth: tokens, keyframes, primitives */
@import "./formic/styles/themes.css";          /* the 5 palettes, optional */
@import "./formic/styles/tailwind-theme.css";  /* generates text-ink, bg-surface, text-body, ... */
EOF
  cat > "$APP/src/App.tsx" <<'EOF'
import Dashboard from "./pages/Dashboard";

export default function App() {
  return <Dashboard />;
}
EOF
  cat > "$APP/src/pages/Dashboard.tsx" <<'EOF'
/* Demo page. Every piece is a Formic component from src/formic — replace the
   numbers with real data through props, and ask your agent for the next page:
   "Use Formic (src/formic). Read AGENTS.md first, then build ..." */
import { useState } from "react";
import Button from "../formic/components/Button";
import { StatCard, MetricRow } from "../formic/components/StatCard";
import { BarChart, BarList } from "../formic/components/charts";
import { Card, Icon } from "../formic/components/primitives";

export default function Dashboard() {
  const [dark, setDark] = useState(true);
  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
  };
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6 sm:p-8">
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-display font-semibold text-ink">Overview</h1>
          <p className="mt-0.5 text-caption text-ink-3">Built with Formic. Everything on this page is a component from src/formic.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="ghost" size="sm" onClick={toggleTheme}>
            <Icon name={dark ? "sun" : "moon"} size={14} strokeWidth={2} />
            {dark ? "Light" : "Dark"}
          </Button>
          <Button variant="accent" size="sm">New report</Button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="New leads" caption="This month" display="128" delta="+24%" icon="user-add" trend={[6, 9, 7, 12, 10, 15, 13, 19]} trendSmooth trendAnimate />
        <StatCard label="Orders" caption="Won this month" display="34" delta="+8%" icon="circle-check" iconTone={2} trend={[2, 3, 3, 5, 4, 6, 5, 7]} trendTone={2} />
        <StatCard label="Conversion" caption="Lead to client" display="18%" delta="-2%" deltaTone="down" icon="chart" iconTone={4} />
        <StatCard label="People reached" caption="Returning: 9" display="43" delta="0.0%" deltaTone="flat" icon="globe" iconTone={5} />
      </div>

      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-5">
        <Card className="p-4 lg:col-span-3">
          <p className="mb-3 text-caption font-medium text-ink">Revenue by month</p>
          <BarChart labels={["Apr", "May", "Jun", "Jul", "Aug", "Sep"]} series={[{ name: "Invoiced", values: [38, 52, 32, 41, 35, 48] }]} highlight={5} />
        </Card>
        <Card className="p-4 lg:col-span-2">
          <p className="mb-3 text-caption font-medium text-ink">Top services</p>
          <BarList items={[
            { label: "Brand identity", value: 48 }, { label: "Website", value: 31 },
            { label: "Company profile", value: 24 }, { label: "Graphic design", value: 17 },
          ]} />
        </Card>
      </div>

      <Card className="p-4">
        <p className="mb-1 text-caption font-medium text-ink">Funnel</p>
        <MetricRow icon="globe" label="Visited" detail="128 opened the site" value="128" delta="+24%" />
        <MetricRow icon="message-question" label="Enquired" detail="96 opened their private link" value="96" delta="+12%" />
        <MetricRow icon="file" label="Quoted" detail="51 received a proposal" value="51" />
        <MetricRow icon="circle-check" label="Won" detail="34 signed" value="34" delta="+8%" />
      </Card>
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
rm -rf "$DEST/styles" "$DEST/components"
cp -R "$TMP/formic/styles" "$DEST/styles"
cp -R "$TMP/formic/components" "$DEST/components"
printf 'formic-design-system %s\nhttps://github.com/eyosiyasketema1/formic-design-system\nre-run install.sh to update\n' "$SHA" > "$DEST/VERSION"
say "$DEST/styles and $DEST/components (commit $SHA)"

# Rewrite the default path if the caller chose another folder.
localise() { # file
  if [ "$DEST" != "src/formic" ]; then
    sed "s#src/formic#$DEST#g" "$1" > "$1.tmp" && mv "$1.tmp" "$1"
  fi
}

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

All UI in this project is built with Formic, vendored at \`$DEST/\`. Before writing or changing any UI, read \`AGENTS.md\` at the project root and follow its procedure: import components from \`$DEST/components\`, use only the token utilities (\`text-ink\`, \`bg-surface\`, \`text-body\`, ...), never hardcode colours, font sizes, radii, shadows, or easings.
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

Before writing or changing any UI, read @AGENTS.md and follow its procedure in order: confirm \`$DEST/styles/tokens.css\` exists, read it, list \`$DEST/components/\`, import existing components instead of re-creating them, compose new patterns from \`$DEST/components/primitives.tsx\`, and run the self-check (no hex colours, no \`text-[Npx]\`, no \`font-bold\`, no drop shadows, no \`cubic-bezier()\`, tokens only).
EOF
say ".cursor/rules/formic-design-system.mdc"

# ── 5. GitHub Copilot — repository instructions ────────────
mkdir -p .github
if [ ! -f .github/copilot-instructions.md ] || ! grep -q "Formic" .github/copilot-instructions.md; then
  cat >> .github/copilot-instructions.md <<EOF

## UI: Formic AI Design System

All UI in this project is built with the Formic AI Design System, vendored at \`$DEST/\`. Before writing or changing any UI, read \`AGENTS.md\` at the project root and follow its procedure: import components from \`$DEST/components\`, use only the token utilities (\`text-ink\`, \`bg-surface\`, \`text-body\`, ...), never hardcode colours, font sizes, radii, shadows, or easings.
EOF
  say ".github/copilot-instructions.md (Formic section)"
else
  skip ".github/copilot-instructions.md already mentions Formic"
fi

# ── 6. Finish ──────────────────────────────────────────────
if [ "$NEW" = 1 ]; then
  printf '\nInstalling dependencies (npm install)…\n'
  npm install --silent --no-fund --no-audit || die "npm install failed — run it again inside $APP"
  say "dependencies installed"
  [ -d .git ] || { git init -q && git add -A && git -c user.name=formic -c user.email=formic@formicai.dev commit -qm "Formic starter" >/dev/null 2>&1 && say "git repository initialised"; } || true
  printf '\nDone. Next:\n'
  printf '  cd %s && npm run dev        # opens the demo dashboard in your browser\n\n' "$APP"
  printf 'Then open your AI tool in this folder (claude, or Cursor) and start with:\n'
  printf '  "Use Formic (src/formic). Read AGENTS.md first and follow its procedure. Then build ..."\n\n'
  exit 0
fi

NEED_TABLER=1
if [ -f package.json ] && grep -q '"@tabler/icons-react"' package.json; then NEED_TABLER=0; fi
printf '\nNext, by hand:\n'
[ "$NEED_TABLER" = 1 ] && printf '  • npm install @tabler/icons-react        # the one peer dependency besides React\n'
printf '  • In your global CSS (Tailwind v4), in this order (fonts.css must be first):\n'
printf '       @import "<relative path to>/%s/styles/fonts.css";\n' "$DEST"
printf '       @import "tailwindcss";\n'
printf '       @import "<relative path to>/%s/styles/tokens.css";\n' "$DEST"
printf '       @import "<relative path to>/%s/styles/themes.css";         /* optional palettes */\n' "$DEST"
printf '       @import "<relative path to>/%s/styles/tailwind-theme.css";\n' "$DEST"
printf '  • Open your agent and start with:\n'
printf '       "Use Formic (%s). Read AGENTS.md first, then build ..."\n\n' "$DEST"
