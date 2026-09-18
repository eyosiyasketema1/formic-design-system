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
const CLOSE = "Everything must work, not look like it works. Use the demo data the components ship (Formic Studio, ETB); no empty states, no placeholders. Everything you need is in src/formic and AGENTS.md; do not fetch formicai.dev.";

/* Three test prompts, three different screens, so the first page is not
   always a dashboard. Each one replaces the welcome page; App.tsx is the
   AI tool's to change, main.tsx and CustomizeNudge.tsx are not. */
const PROMPTS: { label: string; title: string; caption: string; text: string }[] = [
  {
    label: "Test prompt 1",
    title: "Studio dashboard",
    caption: "Figures, two charts and a table; the classic first screen",
    text: `${PREFIX} replace the welcome page (App.tsx is yours to change; keep main.tsx and CustomizeNudge.tsx as they are) with Formic Studio's dashboard, composed the way AGENTS.md (Composition intelligence, Dashboard) says: an AppShell with the rail from the config; a page header with a caption whose actions hold a segmented Tabs time range (7 days, 30 days, 90 days) that changes every figure and chart below, plus two buttons (Export, New report; the label is the verb only, the icon goes in the \`icon\` prop, \`icon="download"\` and \`icon="plus"\`, never as a word in the label); no filter row under the header; four StatCards in one row with deltas and sparklines; then three Panels in one row: a half-width Panel holding a LineChart of revenue by month (\`guides\`, two series where one has values below zero, a ChartLegend), a quarter-width Panel holding a DonutChart of revenue by client with \`segments\` and the leading client named in the centre, its legend rows under the ring (not \`legend="list"\`), and a quarter-width Panel holding a Gauge (\`percent\`, \`label\`) for the share of proposals that became clients; then a recent invoices DataTable on its own, filling the full width, built like the gallery's Invoices table: a toolbar with a page-size Select, the one accent action (New invoice), and at the right end the search Input and a status Select (all, paid, due, overdue) that filters the rows; columns with widths (id 120px muted, status 110px as a StatusCell, client as a PersonCell with the contact and the company, amount \`align: "end"\` tabular, date muted) so only the client column stretches and rows stay one line high; selectable rows with the mixed header box, RowActions per row, and the paged footer. The theme switch beside the profile flips and the rail collapses. ${CLOSE}`,
  },
  {
    label: "Test prompt 2",
    title: "Course registration",
    caption: "A stepper form with a header image, and the list it fills",
    text: `${PREFIX} replace the welcome page (App.tsx is yours to change; keep main.tsx and CustomizeNudge.tsx as they are) with a course registration page for a student, composed the way AGENTS.md (Composition intelligence, App shell) says: it stands alone, so an AppShell with \`rail="none"\`, the title Course registration and the caption for the term; the content one centred column (\`max-w-3xl\`); at the top a Card whose CardMedia is a header image (\`src="https://formicai.dev/assets/live-bg-1280.webp"\`) with a CardTitle for the programme and a CardDescription for the dates; under it a Panel holding a Steps stepper with four steps (Student, Courses, Schedule, Review) and the form of the current step: Student is Fields with Inputs for full name, email and phone and a Select for the programme, all required with real validation; Courses is a CardGroup of at least six course Cards (title, credits, seats left) each with a CardButton that toggles it chosen, at least one required; Schedule is a DatePicker for the start date and segmented Tabs for morning or evening; Review lists every answer and ends with a Register accent button; Back and Next move between steps and the completed steps in the stepper can be clicked to go back; Register adds the student to a Registered students DataTable under the panel (name, programme, courses, start date, a status Badge), shows a Toast, and resets the stepper. The DataTable starts with the demo data the components ship (six students) and has toolbar search and pagination. The theme switch at the right of the header strip flips. ${CLOSE}`,
  },
  {
    label: "Test prompt 3",
    title: "Client record",
    caption: "One record under a top bar: a client dashboard, tables and an edit form",
    text: `${PREFIX} replace the welcome page (App.tsx is yours to change; keep main.tsx and CustomizeNudge.tsx as they are) with a client record page for Formic Studio, composed the way AGENTS.md (Composition intelligence, App shell) says: an AppShell with \`rail="topbar"\` (the rail plus the TopBar above the page: title, search, theme, notifications, the account menu); a page header with the client's name, a caption (sector, city, client since) and two actions (Edit, New invoice; the icon goes in the \`icon\` prop, never as a word in the label); a StatStrip of four figures (billed this year, outstanding, open proposals, last payment); underline Tabs for Overview, Invoices, Proposals and Activity that switch the content below. Overview is a small dashboard for this one client: four StatCards in one row with deltas and sparklines (billed, paid, outstanding, average days to pay); a two-thirds Panel holding a BarChart of billing by month (\`axis\`, values on the bars) beside a one-third Panel holding a DonutChart of billing by service line with a list legend (\`segments\`, \`legend="list"\`, \`center\`); under them a two-thirds Panel of MetricRows (revenue by service line with \`progress\`) beside a one-third Panel holding a Timeline of recent events. Invoices is a DataTable with toolbar search, a status Select and pagination; Proposals is a DataTable too; Activity is the Timeline on its own. Edit opens a Drawer from the right with a form (Input for name and email, Select for sector, TagInput for tags, a Save accent button and Cancel) that updates the header when saved. The theme switch in the TopBar flips. ${CLOSE}`,
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
  return (
    <Panel title={`${label}: ${title}`} caption={caption}>
      <div className="flex flex-col gap-3">
        <p className="rounded-md bg-inset p-4 text-body leading-relaxed text-ink">{text}</p>
        <div className="flex justify-end">
          <Button variant="accent" size="md" onClick={() => copy(text)} icon={<Icon name={copied ? "check" : "copy"} />} aria-live="polite">
            {copied ? "Copied" : "Copy prompt"}
          </Button>
        </div>
      </div>
    </Panel>
  );
}

export default function Welcome() {
  const [copiedPrefix, copyPrefix] = useCopy();
  return (
    <main data-formic-welcome className="flex min-h-dvh items-center justify-center bg-canvas p-6 sm:p-8">
      <div className="flex w-full max-w-2xl flex-col gap-6">
        <header className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-12 items-center justify-center rounded-md bg-accent-tint text-accent"><FormicMark size={26} /></span>
          <div>
            <h1 className="text-display font-semibold text-ink">Formic is working</h1>
            <p className="mt-1 text-body text-ink-2">Components, tokens, the rules for your AI tool and a check before every commit are in place.</p>
          </div>
        </header>

        <div className="rounded-md bg-inset px-4 py-3 text-caption text-ink-2">
          <p className="font-medium text-ink">Next: let your AI tool build the first page.</p>
          <p className="mt-0.5">Open your AI tool (Claude Code, Cursor, Antigravity, Copilot, Codex, any of them) in this folder and paste one of the three test prompts. Each builds a different screen; pick the one closest to your product. If the result looks generic, say "That is not Formic, read AGENTS.md and redo it".</p>
        </div>

        {PROMPTS.map((p) => <PromptPanel key={p.label} {...p} />)}

        <Panel title="Every prompt after that" caption="Start it the same way, then say what you want">
          <div className="flex items-center justify-between gap-3">
            <p className="min-w-0 flex-1 rounded-md bg-inset px-4 py-3 font-mono text-caption text-ink">{PREFIX} <span className="text-ink-3">add a clients page with a DataTable…</span></p>
            <Button variant="secondary" size="md" onClick={() => copyPrefix(PREFIX + " ")} icon={<Icon name={copiedPrefix ? "check" : "copy"} />} aria-live="polite" className="shrink-0">
              {copiedPrefix ? "Copied" : "Copy"}
            </Button>
          </div>
        </Panel>
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
    if grep -q '"@phosphor-icons/react"' package.json; then DEPS_WIRED=1
    else npm install --silent --no-fund --no-audit @phosphor-icons/react && DEPS_WIRED=1 && say "@phosphor-icons/react installed"; fi
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
  printf 'Then open your AI tool (Claude Code, Cursor, Antigravity, Copilot, any of them) in this folder and paste one of the three test prompts on that page (a dashboard, a course registration form, a client record).\n\n'
  printf 'After that, start every prompt with:  %s  and say what you want.\n\n' "Use Formic (src/formic), read AGENTS.md, then"
  printf 'Info: your own colours, font and rail come from https://formicai.dev/customize (copy, paste into the same chat).\n'
  printf '      The Formic gates run on every commit; `npm run formic` runs them any time.\n\n'
  exit 0
fi

if [ "$CSS_WIRED" = 1 ] && [ "$DEPS_WIRED" = 1 ]; then
  printf '\nDone. Open your AI tool in this folder and paste:\n'
else
  printf '\nDone, with one thing left by hand:\n'
  [ "$DEPS_WIRED" = 1 ] || printf '  • npm install @phosphor-icons/react\n'
  [ "$CSS_WIRED" = 1 ] || { printf '  • In your global CSS (Tailwind v4), in this order:\n'; printf '       @import "<path to>/%s/styles/fonts.css";\n       @import "tailwindcss";\n       @import "<path to>/%s/styles/formic.css";\n' "$DEST" "$DEST"; }
  printf 'Then open your AI tool in this folder and paste:\n'
fi
printf '  Use Formic (%s), read AGENTS.md, then migrate this whole app to Formic the way AGENTS.md (Migrating an existing app) says: run python3 %s/scripts/formic_check.py --inventory src for the list, show me the plan, then convert every page and component until both gates print clean. Keep every route, behaviour and data call; do not leave any page on the old UI.\n\n' "$DEST" "$DEST"
if command -v python3 >/dev/null 2>&1 && [ -d src ]; then
  # the inventory now, so the size of the job is known before the first prompt
  INV="$(python3 "$DEST/scripts/formic_check.py" --inventory src 2>/dev/null | tail -1 || true)"
  [ -n "$INV" ] && printf 'Inventory: %s\n\n' "$INV"
fi
printf 'Info: your own colours, font and rail come from https://formicai.dev/customize (copy, paste into the same chat).\n'
printf '      The Formic gates run on every commit; `npm run formic` runs them any time.\n\n'
