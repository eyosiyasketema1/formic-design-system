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
#
# From Phase 2 of PLAN-adoption.md the primary path is the CLI in cli/:
#   npx formicai init [--new my-app]
# It does the same work from the registry (https://formicai.dev/r), adds
# --dry-run, doctor, add and update, and keeps its scaffold files in
# cli/templates/ (the QA gate checks they equal the heredocs below). This
# script stays whole and behaviourally equal until the package is published
# on npm, after which it becomes a thin wrapper around `npx formicai init`.
# It must not depend on the package before then.
set -euo pipefail

# FORMIC_REPO=/path/to/checkout installs from a local clone (the install tests use it)
REPO="${FORMIC_REPO:-https://github.com/eyosiyasketema1/formic-design-system.git}"
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
warn() { printf '  \033[33m!\033[0m %s\n' "$1"; }

command -v git >/dev/null 2>&1 || die "git is required (https://git-scm.com)"

# No package.json here: this is not a project yet, so scaffold one in place.
# The folder you cd into is the app; no --new needed. Anything already in the
# folder is left alone, unless it is one of the files the scaffold writes.
if [ "$NEW" = 0 ] && [ ! -f package.json ]; then
  NEW=1; APP="."
  for f in vite.config.ts tsconfig.json index.html src/main.tsx src/index.css src/App.tsx src/pages/Welcome.tsx; do
    [ -e "$f" ] && die "$f already exists but there is no package.json; run the installer in an empty folder, or in the root of your app"
  done
fi

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
    "@phosphor-icons/react": "^2.1.10",
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
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/* "@/formic/components/Button" and "./formic/components/Button" both work:
   tsconfig declares the alias, this resolves it */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
});
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
import CustomizeNudge from "./CustomizeNudge";

/* main.tsx stays as it is. The nudge sits beside the app, not inside it, so
   it survives whatever the AI tool makes of App.tsx; delete its two lines
   here once the look is yours. */
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
    <CustomizeNudge />
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

/* App.tsx is the app: pages come and go here. The first test prompt replaces
   the welcome page. The theme switch is in the rail beside the profile, so
   there is no floating one. */
export default function App() {
  return <Welcome />;
}
EOF
  cat > "$APP/src/CustomizeNudge.tsx" <<'EOF'
/* Brief
   Reader:   the person who just watched their AI tool build a page
   Question: this is the stock look; can I change it?
   Action:   open the customizer in a new tab
   Register: text
*/
/* One card in the bottom-right corner, above every page the AI tool builds
   (not the welcome page), that says the look can be changed, with one link;
   Close and Customize both dismiss it for good. Mounted from main.tsx beside
   the app so it survives whatever happens to App.tsx. Delete this file and its
   two lines in main.tsx once the look is yours. */
import { useEffect, useState } from "react";
import Button from "./formic/components/Button";
import { Card, Icon, IconButton } from "./formic/components/primitives";

const CUSTOMIZE_URL = "https://formicai.dev/customize";
/* one key per install, so a card dismissed in an earlier project on the same
   localhost port does not stay dismissed in this one */
const STORAGE_KEY = "formic-nudge-__FORMIC_INSTALL__";
const dismissed = () => { try { return localStorage.getItem(STORAGE_KEY) === "off"; } catch { return false; } };
const onWelcome = () => Boolean(document.querySelector("[data-formic-welcome]"));

export default function CustomizeNudge() {
  /* hidden on the welcome page, where the prompts are the one thing to read;
     shows the moment the AI tool's page replaces it, and stays through every
     page after that until dismissed */
  const [shown, setShown] = useState(false);
  const [closed, setClosed] = useState(dismissed);
  useEffect(() => {
    if (closed) { setShown(false); return; }
    const check = () => setShown(!onWelcome());
    check();
    const watch = new MutationObserver(check);
    watch.observe(document.body, { childList: true, subtree: true });
    return () => watch.disconnect();
  }, [closed]);
  /* Close is the only thing that dismisses it; Customize opens the customizer
     in a new tab and the card stays, so the way back is still on screen */
  const close = () => { setClosed(true); try { localStorage.setItem(STORAGE_KEY, "off"); } catch { /* private mode: the choice lasts the session */ } };
  if (!shown) return null;
  return (
    <Card role="region" aria-label="Make it yours" className="fixed right-4 bottom-4 z-40 flex w-full max-w-xs items-start gap-3 p-4">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-control bg-accent-tint text-accent"><Icon name="sparkles" size={16} /></span>
      <div className="min-w-0 flex-1">
        <p className="text-body font-semibold text-ink">Make it yours</p>
        <p className="mt-0.5 text-caption text-ink-2">Accent, palette, font, radius and rail can be changed any time, and every page follows.</p>
        <Button variant="accent" size="sm" href={CUSTOMIZE_URL} target="_blank" icon={<Icon name="external" />} className="mt-3">Customize</Button>
      </div>
      <IconButton label="Close" onClick={close} className="-mt-1 -mr-1 shrink-0 text-ink-3 hover:bg-hover hover:text-ink">
        <Icon name="close" size={14} />
      </IconButton>
    </Card>
  );
}
EOF
  sed -i.bak "s/__FORMIC_INSTALL__/$(date +%s)/" "$APP/src/CustomizeNudge.tsx" && rm -f "$APP/src/CustomizeNudge.tsx.bak"
  cat > "$APP/src/pages/Welcome.tsx" <<'EOF'
/* Brief
   Reader:   the person who just ran the installer, in the browser it opened
   Question: did it work, and what do I do next?
   Action:   copy a test prompt and paste it into their AI tool, opened in this folder
   Register: text
*/
/* The first page. Your AI tool replaces it with whichever test prompt you
   paste; nothing here is meant to stay. */
import { useEffect, useRef, useState } from "react";
import Button from "../formic/components/Button";
import Panel from "../formic/components/Panel";
import { FormicMark } from "../formic/components/brand";
import { Icon } from "../formic/components/primitives";

const PREFIX = "Use Formic (src/formic), read AGENTS.md, then";
const CLOSE = "Everything must work, not look like it works. Use the demo data the components ship (Formic Studio, ETB); no empty states, no placeholders. Everything you need is in src/formic and AGENTS.md; do not fetch formicai.dev. Only the base is installed: every component this prompt names that is not yet in src/formic/components, add with npx formicai add followed by its name (npx formicai add --list shows the names); never write a stand-in.";

/* Three test prompts, three different screens, so the first page is not
   always a dashboard. Each one replaces the welcome page; App.tsx is the
   AI tool's to change, main.tsx and CustomizeNudge.tsx are not. */
const PROMPTS: { label: string; title: string; caption: string; text: string }[] = [
  {
    label: "Test prompt 1",
    title: "Studio dashboard",
    caption: "Figures, two charts and a table; the classic first screen",
    text: `${PREFIX} replace the welcome page (App.tsx is yours to change; keep main.tsx and CustomizeNudge.tsx as they are) with Formic Studio's dashboard, composed the way AGENTS.md (Composition intelligence, Dashboard) says: an AppShell with the rail from the config; a page header with a caption whose actions hold a segmented Tabs time range (7 days, 30 days, 90 days) that changes every figure and chart below, plus two buttons (Export, New report; the label is the verb only, the icon goes in the \`icon\` prop, \`icon="download"\` and \`icon="plus"\`, never as a word in the label); no filter row under the header; four StatCards in one row built like the gallery's headline tiles: \`display={<CountUp value={…} />}\`, a delta with its tone, an icon (one tile \`iconTone="accent"\`, the rest neutral) and a \`trend\` sparkline with \`trendSmooth\` and \`trendAnimate\`; then a two-thirds Panel holding a LineChart of revenue by month (\`guides\`, two series where one has values below zero, a ChartLegend) beside a one-third Panel holding a DonutChart of revenue by city with \`segments\` (name, value, detail with the client count) and a \`format\` for ETB, the leading city named in the centre until another is hovered or focused from the legend rows under the ring (not \`legend="list"\`, no Gauge); then a recent invoices DataTable on its own, filling the full width, built like the gallery's Invoices table: a toolbar with a page-size Select, the one accent action (New invoice), and at the right end the search Input and a status Select (all, paid, due, overdue) that filters the rows; columns with widths (id 120px muted, status 110px as a StatusCell, client as a PersonCell with the contact and the company, amount \`align: "end"\` tabular, date muted) so only the client column stretches and rows stay one line high; selectable rows with the mixed header box, RowActions per row, and the paged footer. The theme switch beside the profile flips and the rail collapses. ${CLOSE}`,
  },
  {
    label: "Test prompt 2",
    title: "Course registration",
    caption: "A stepper form with a header image and a confirmation",
    text: `${PREFIX} replace the welcome page (App.tsx is yours to change; keep main.tsx and CustomizeNudge.tsx as they are) with a course registration page for a student, composed the way AGENTS.md (Composition intelligence, App shell) says: it stands alone, so an AppShell with \`rail="none"\`, the title Course registration and the caption for the term; the content one centred column (\`max-w-3xl\`); at the top a Card whose CardMedia is a header image (\`src="https://formicai.dev/assets/live-bg-1280.webp"\` with \`aspect="banner"\`, the short 4:1 band, not the tall video shape) with a CardTitle for the programme and a CardDescription for the dates; under it a Panel holding a Steps stepper with four steps (Student, Courses, Schedule, Review) and the form of the current step: Student is Fields with Inputs for full name, email and phone and a Select for the programme, all required with real validation; Courses is a CardGroup of at least six course Cards (title, credits, seats left) each with a CardButton that toggles it chosen, at least one required; Schedule is a DatePicker for the start date and segmented Tabs for morning or evening; Review lists every answer and ends with a Register accent button; Back and Next move between steps and the completed steps in the stepper can be clicked to go back; Register shows a Toast and turns the panel into a confirmation: a success Alert with the student's name and the chosen courses, and one secondary button (Register another) that resets the stepper. No table on this page. The theme switch at the right of the header strip flips. ${CLOSE}`,
  },
  {
    label: "Test prompt 3",
    title: "Workspace settings",
    caption: "Settings under a top bar: forms, a team list, an integrations gallery and a danger zone",
    text: `${PREFIX} replace the welcome page (App.tsx is yours to change; keep main.tsx and CustomizeNudge.tsx as they are) with Formic Studio's workspace settings, composed the way AGENTS.md (Composition intelligence, App shell) says, in the Text register (no figures, no charts): an AppShell with \`rail="topbar"\` (the rail plus the TopBar with search, theme, notifications and the account menu), the page title Settings, and underline Tabs for Profile, Team, Integrations and Billing that switch the content. Profile: a Panel with Fields (Input for studio name and email, Textarea for the address, Select for the timezone, an Avatar with a Change photo button) and one accent Save button that shows a Toast. Team: a CardGroup with \`orientation="inline"\` listing six people with Avatar, name, role Badge and a DropdownMenu of actions, plus an Invite button that opens a Drawer with an email TagInput and a role Select. Integrations: the Visual register, a CardGroup of eight services each with its real BrandLogo from brand-logos.tsx (Slack, Google Drive, Notion, Figma, GitHub, Stripe, Asana, Dropbox), a one-line description, and a Switch that connects or disconnects it, with a FilterBar above (search and a connected-only toggle). Billing: the current plan as a Card with a Progress bar of seats used, a payment method row, and a danger zone at the bottom where Delete workspace is a destructive Button that opens a confirm Modal (type the name to enable Delete). Wire useCommandPalette so ⌘K opens a CommandPalette that jumps between the four tabs. The theme switch in the TopBar flips. ${CLOSE}`,
  },
];

function useCopy(): [boolean, (text: string) => Promise<void>] {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      if (timer.current) window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };
  return [copied, copy];
}

function PromptPanel({ label, title, caption, text }: (typeof PROMPTS)[number]) {
  const [copied, copy] = useCopy();
  const num = label.replace(/\D/g, "");
  return (
    <details className="group rounded-xl border border-line bg-canvas">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-tint text-small font-semibold text-accent">{num}</span>
        <div className="min-w-0 flex-1">
          <span className="text-body font-semibold text-ink">{title}</span>
          <span className="ml-2 text-caption text-ink-3">{caption}</span>
        </div>
        <Icon name="caret-down" className="shrink-0 text-ink-3 transition-transform group-open:rotate-180" />
      </summary>
      <div className="flex flex-col gap-3 border-t border-line px-4 py-4">
        <p className="rounded-lg bg-inset p-4 text-small leading-relaxed text-ink">{text}</p>
        <div className="flex justify-end">
          <Button variant="accent" size="md" onClick={() => copy(text)} icon={<Icon name={copied ? "check" : "copy"} />} aria-live="polite">
            {copied ? "Copied" : "Copy prompt"}
          </Button>
        </div>
      </div>
    </details>
  );
}

export default function Welcome() {
  const [copiedPrefix, copyPrefix] = useCopy();
  return (
    <main data-formic-welcome className="flex min-h-dvh items-center justify-center bg-canvas p-6 sm:p-8">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <header className="flex items-center gap-4">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent-tint text-accent"><FormicMark size={26} /></span>
          <div>
            <h1 className="text-display font-semibold text-ink">Formic is working</h1>
            <p className="mt-0.5 text-caption text-ink-2">Components, tokens, the rules for your AI tool and a check before every commit are in place.</p>
          </div>
        </header>

        <div className="rounded-xl border border-line bg-surface px-5 py-4">
          <p className="text-body font-medium text-ink">Next: let your AI tool build the first page.</p>
          <p className="mt-1 text-caption text-ink-2">Open your AI tool in this folder and paste one of the prompts below. Each builds a different screen; pick the one closest to your product.</p>
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-small font-medium uppercase tracking-wide text-ink-3">Test prompts</p>
          {PROMPTS.map((p) => <PromptPanel key={p.label} {...p} />)}
        </div>

        <div className="rounded-xl border border-line bg-surface px-5 py-4">
          <p className="text-caption font-medium text-ink">Every prompt after that starts the same way:</p>
          <div className="mt-3 flex items-center gap-3">
            <p className="min-w-0 flex-1 rounded-lg bg-inset px-4 py-2.5 font-mono text-small text-ink">{PREFIX} <span className="text-ink-3">add a clients page with a DataTable…</span></p>
            <Button variant="secondary" size="sm" onClick={() => copyPrefix(PREFIX + " ")} icon={<Icon name={copiedPrefix ? "check" : "copy"} />} aria-live="polite" className="shrink-0">
              {copiedPrefix ? "Copied" : "Copy"}
            </Button>
          </div>
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

[ -f package.json ] || die "no package.json here; run the installer in the root of your app, or in an empty folder to start one"

# Where the app's own code lives: src/ for Vite and most apps, app/ for a Next.js
# App Router project without src/; the gates, the hook and the prompts use it.
if [ -d src ]; then SRC_DIR="src"; elif [ -d app ]; then SRC_DIR="app"; else SRC_DIR="src"; fi

case "$DEST" in
  ""|.|..|/*|*..*) die "install folder must be a relative path inside the project, e.g. src/formic (got '$DEST')" ;;
esac
if [ -d "$DEST/styles" ] && [ ! -f "$DEST/VERSION" ]; then
  die "$DEST/styles already exists and is not a Formic install; pick another folder: install.sh <folder>"
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
printf '\nFormic AI Design System → %s\n\n' "$DEST"
# FORMIC_BRANCH=staging installs what staging.formicai.dev shows, before it is released
git clone --quiet --depth 1 --branch "${FORMIC_BRANCH:-main}" "$REPO" "$TMP/formic" || die "clone failed"
SHA="$(git -C "$TMP/formic" rev-parse --short HEAD)"
VER="$(sed -n 's/.*"version": *"\([^"]*\)".*/\1/p' "$TMP/formic/package.json" | head -1)"

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
printf 'formic-design-system %s (%s)\nhttps://github.com/eyosiyasketema1/formic-design-system\nre-run install.sh to update\n' "$VER" "$SHA" > "$DEST/VERSION"
say "$DEST/styles, $DEST/components and $DEST/scripts (Formic $VER, commit $SHA)"

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
    p.scripts.formic = "python3 '"$DEST"'/scripts/formic_check.py '"$SRC_DIR"' && python3 '"$DEST"'/scripts/compose_check.py '"$SRC_DIR"'";
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

All UI in this project is built with Formic, vendored at \`$DEST/\`. Before writing or changing any UI, read \`AGENTS.md\` at the project root and follow its procedure: import components from \`$DEST/components\` (never a raw <button>, <input>, <table> or <svg>; when a component you need is not in \`$DEST/components\` run \`npx formicai add <name>\` (\`npx formicai add --list\` names them), never a stand-in; only when no Formic component exists at all, build one in \`$DEST/components\` from primitives and say so), use only the token utilities (\`text-ink\`, \`bg-surface\`, \`text-body\`, ...), never hardcode colours, font sizes, radii, shadows, or easings, and finish by running \`python3 $DEST/scripts/formic_check.py $SRC_DIR\` and \`python3 $DEST/scripts/compose_check.py $SRC_DIR\` until both pass.
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

Before writing or changing any UI, read @AGENTS.md and follow its procedure in order: confirm \`$DEST/styles/tokens.css\` exists, read it, list \`$DEST/components/\`, import existing components instead of re-creating them, compose new patterns from \`$DEST/components/primitives.tsx\`, build only from its components (a raw <button>, <input>, <table> or <svg> in a page is a defect; when a component you need is not in \`$DEST/components\` run \`npx formicai add <name>\` (\`npx formicai add --list\` names them), never a stand-in; only when no Formic component exists at all, build one in \`$DEST/components\` from primitives and say so), and finish by running \`python3 $DEST/scripts/formic_check.py $SRC_DIR\` and \`python3 $DEST/scripts/compose_check.py $SRC_DIR\` until both pass.
EOF
say ".cursor/rules/formic-design-system.mdc"

# ── 5. GitHub Copilot — repository instructions ────────────
mkdir -p .github
if [ ! -f .github/copilot-instructions.md ] || ! grep -q "Formic" .github/copilot-instructions.md; then
  cat >> .github/copilot-instructions.md <<EOF

## UI: Formic AI Design System

All UI in this project is built with the Formic AI Design System, vendored at \`$DEST/\`. Before writing or changing any UI, read \`AGENTS.md\` at the project root and follow its procedure: import components from \`$DEST/components\` (never a raw <button>, <input>, <table> or <svg>; when a component you need is not in \`$DEST/components\` run \`npx formicai add <name>\` (\`npx formicai add --list\` names them), never a stand-in; only when no Formic component exists at all, build one in \`$DEST/components\` from primitives and say so), use only the token utilities (\`text-ink\`, \`bg-surface\`, \`text-body\`, ...), never hardcode colours, font sizes, radii, shadows, or easings, and finish by running \`python3 $DEST/scripts/formic_check.py $SRC_DIR\` and \`python3 $DEST/scripts/compose_check.py $SRC_DIR\` until both pass.
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
    if grep -q '"@phosphor-icons/react"' package.json && grep -q '"@dicebear/core"' package.json; then DEPS_WIRED=1
    else npm install --silent --no-fund --no-audit @phosphor-icons/react @dicebear/core @dicebear/notionists && DEPS_WIRED=1 && say "@phosphor-icons/react, @dicebear/core and @dicebear/notionists installed"; fi
  fi
fi

# ── 5c. Git hook: the two gates run on every commit ─────────
write_hook() {
  [ -d .git ] || return 0
  mkdir -p .git/hooks
  # the hook checks the files in the commit, not the whole app: in an
  # existing project the old pages fail the gates until they are migrated,
  # and a hook that blocks every commit from day one gets deleted.
  # `npm run formic` still checks all of src.
  HOOK="# Formic gates on the files being committed (npm run formic checks everything)
FORMIC_FILES=\$(git diff --cached --name-only --diff-filter=ACMR -- '*.tsx' '*.jsx' | grep -v '^$DEST/' || true)
if [ -n \"\$FORMIC_FILES\" ]; then
  python3 $DEST/scripts/formic_check.py \$FORMIC_FILES && python3 $DEST/scripts/compose_check.py \$FORMIC_FILES || exit 1
fi"
  if [ ! -f .git/hooks/pre-commit ]; then
    printf '#!/bin/sh\n%s\n' "$HOOK" > .git/hooks/pre-commit
    chmod +x .git/hooks/pre-commit && say ".git/hooks/pre-commit (formic_check + compose_check run on the files of every commit)"
  elif ! grep -q "formic_check" .git/hooks/pre-commit; then
    printf '\n%s\n' "$HOOK" >> .git/hooks/pre-commit
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
  printf 'Then open your AI tool (Claude Code, Cursor, Antigravity, Copilot, any of them) in this folder and paste one of the three test prompts on that page (a dashboard, a course registration form, a settings page).\n\n'
  printf 'After that, start every prompt with:  %s  and say what you want.\n\n' "Use Formic (src/formic), read AGENTS.md, then"
  printf 'Info: your own colours, font and rail come from https://formicai.dev/customize (copy, paste into the same chat).\n'
  printf '      The Formic gates run on every commit; `npm run formic` runs them any time.\n\n'
  exit 0
fi

ESLINT_CFG="$(ls eslint.config.* .eslintrc* 2>/dev/null | head -1 || true)"
if [ -n "$ESLINT_CFG" ] && ! grep -qs "$DEST" $ESLINT_CFG 2>/dev/null; then
  printf '\nNote: your ESLint config does not ignore %s. Formic keeps its own conventions (it uses useEffect and a few patterns\n      a strict project config may ban); add "%s/**" to its ignores so the vendored files do not fail your lint.\n' "$DEST" "$DEST"
fi
if [ "$CSS_WIRED" = 1 ] && [ "$DEPS_WIRED" = 1 ]; then
  printf '\nDone. Open your AI tool in this folder and paste:\n'
else
  printf '\nDone, with one thing left by hand:\n'
  [ "$DEPS_WIRED" = 1 ] || printf '  • npm install @phosphor-icons/react @dicebear/core @dicebear/notionists\n'
  [ "$CSS_WIRED" = 1 ] || { printf '  • In your global CSS (Tailwind v4), in this order:\n'; printf '       @import "<path to>/%s/styles/fonts.css";\n       @import "tailwindcss";\n       @import "<path to>/%s/styles/formic.css";\n' "$DEST" "$DEST"; }
  printf 'Then open your AI tool in this folder and paste:\n'
fi
printf '  Use Formic (%s), read AGENTS.md, then migrate this whole app to Formic the way AGENTS.md (Migrating an existing app) says: run python3 %s/scripts/formic_check.py --inventory %s for the list, show me the plan, then convert every page and component until both gates print clean. Keep every route, behaviour and data call; do not leave any page on the old UI.\n\n' "$DEST" "$DEST" "$SRC_DIR"
if command -v python3 >/dev/null 2>&1 && [ -d "$SRC_DIR" ]; then
  # the inventory now, so the size of the job is known before the first prompt
  INV="$(python3 "$DEST/scripts/formic_check.py" --inventory "$SRC_DIR" 2>/dev/null | tail -1 || true)"
  [ -n "$INV" ] && printf 'Inventory: %s\n\n' "$INV"
fi
printf 'Info: your own colours, font and rail come from https://formicai.dev/customize (copy, paste into the same chat).\n'
printf '      The Formic gates run on every commit; `npm run formic` runs them any time.\n\n'
