#!/usr/bin/env bash
# Install test: puts Formic into a copy of one of the fixtures under
# fixtures/ and checks that the result installs, type-checks, builds, passes
# the gates and commits through the hook. Prints PASS/FAIL per step and exits
# 1 when any step failed (Phase 0 of PLAN-adoption.md).
#
#   scripts/test_install.sh vite-fresh            # scaffold with install.sh --new
#   scripts/test_install.sh next-app [--keep]     # existing Next.js 15 project
#   scripts/test_install.sh old-app  [--keep]     # existing legacy Vite project
#
# --keep leaves the temp dir behind and prints its path.
set -uo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
FIXTURE="${1:-}"; KEEP=0
[ "${2:-}" = "--keep" ] && KEEP=1
case "$FIXTURE" in
  vite-fresh|next-app|old-app) ;;
  *) printf 'usage: %s <vite-fresh|next-app|old-app> [--keep]\n' "$0" >&2; exit 2 ;;
esac

BRANCH="$(git -C "$REPO" branch --show-current)"
[ -n "$BRANCH" ] || { echo "the repo is on a detached HEAD; check out a branch first" >&2; exit 2; }
if [ -n "$(git -C "$REPO" status --porcelain -- styles components scripts AGENTS.md skill formic.config.json package.json 2>/dev/null)" ]; then
  printf 'warning: uncommitted changes in the repo; the installer clones, so the test installs the LAST COMMIT on %s (install.sh itself runs from the working tree)\n' "$BRANCH"
fi

TMP="$(mktemp -d "${TMPDIR:-/tmp}/formic-install-$FIXTURE.XXXXXX")"
LOG="$TMP/test.log"
[ "$KEEP" = 1 ] || trap 'rm -rf "$TMP"' EXIT
FAILED=0; RESULTS=()

pass() { RESULTS+=("PASS $1"); printf 'PASS %s\n' "$1"; }
fail() { RESULTS+=("FAIL $1${2:+ — $2}"); printf 'FAIL %s%s\n' "$1" "${2:+ — $2}"; FAILED=1; }
# run <step> <cmd...>: PASS on exit 0, FAIL (with the last lines of output) otherwise
run() {
  local step="$1"; shift
  local out; out="$("$@" 2>&1)"; local rc=$?
  printf '\n### %s (exit %s)\n%s\n' "$step" "$rc" "$out" >> "$LOG"
  if [ $rc -eq 0 ]; then pass "$step"; else fail "$step" "$(printf '%s' "$out" | grep -v "^\s*$" | grep -v "^\s" | tail -2 | tr '\n' ' | ')"; fi
  return $rc
}

export FORMIC_REPO="$REPO" FORMIC_BRANCH="$BRANCH"
export GIT_AUTHOR_NAME=formic-test GIT_AUTHOR_EMAIL=test@formicai.dev GIT_COMMITTER_NAME=formic-test GIT_COMMITTER_EMAIL=test@formicai.dev
printf 'fixture %s in %s (Formic from %s @ %s)\n' "$FIXTURE" "$TMP" "$REPO" "$BRANCH"

# ── set up the project and install ──────────────────────────
if [ "$FIXTURE" = vite-fresh ]; then
  APP="$TMP/app"; CSS="src/index.css"; BUILDER=vite; SRC=src
  cd "$TMP" && run install bash "$REPO/install.sh" --new app
  cd "$APP" 2>/dev/null || { fail deps "no app dir"; fail css; fail typecheck; fail build; fail gates; fail hook; }
else
  APP="$TMP/app"
  cp -R "$REPO/fixtures/$FIXTURE" "$APP"
  cd "$APP"
  if [ "$FIXTURE" = old-app ]; then
    python3 generate.py "$APP" >> "$LOG" 2>&1 || { echo "generate.py failed" >&2; exit 2; }
    # the fixture's .gitignore keeps the generated files out of THIS repo; in
    # the copy they are the project's own tracked files
    printf 'node_modules\ndist\n' > .gitignore
    CSS="src/index.css"; BUILDER=vite; SRC=src
  else
    CSS="app/globals.css"; BUILDER=next; SRC=app
  fi
  # an existing project is a git repo with its dependencies installed
  git init -q && git add -A && git commit -qm "fixture seed" >> "$LOG" 2>&1
  printf 'npm install (project deps)…\n'
  npm install --no-audit --no-fund --silent >> "$LOG" 2>&1 || { echo "npm install of the fixture failed; see $LOG" >&2; exit 2; }
  run install bash "$REPO/install.sh"
fi
cd "$APP" || exit 1

# ── deps ────────────────────────────────────────────────────
if [ -d node_modules/@phosphor-icons/react ] && [ -d node_modules/@dicebear/core ]; then pass deps
else fail deps "missing: $([ -d node_modules/@phosphor-icons/react ] || printf '@phosphor-icons/react ')$([ -d node_modules/@dicebear/core ] || printf '@dicebear/core')"; fi

# ── css: fonts.css, then tailwindcss, then formic.css ───────
if [ -f "$CSS" ]; then
  ORDER="$(grep -n '@import' "$CSS" | grep -o 'fonts\.css\|"tailwindcss"\|formic\.css' | tr '\n' ' ')"
  if [ "$ORDER" = 'fonts.css "tailwindcss" formic.css ' ]; then pass css
  else fail css "$CSS imports: ${ORDER:-none of the three}"; fi
else fail css "$CSS not found"; fi

# ── typecheck and build ─────────────────────────────────────
# A page that imports Formic, so the build compiles the vendored folder and
# not just the fixture's own files (a build that never touches src/formic
# proves nothing about it).
SMOKE='import Button from "@/src/formic/components/Button";
import Panel from "@/src/formic/components/Panel";
import AppShell from "@/src/formic/components/AppShell";
import { Icon } from "@/src/formic/components/primitives";

export default function FormicSmoke() {
  return (
    <AppShell title="Smoke">
      <Panel title="Formic smoke test" caption="One shell, one panel, one button, so the build compiles the vendored folder">
        <Button variant="accent" icon={<Icon name="check" />}>It builds</Button>
      </Panel>
    </AppShell>
  );
}'
if [ "$BUILDER" = next ]; then
  mkdir -p app/formic-smoke && printf '%s\n' "$SMOKE" > app/formic-smoke/page.tsx
elif [ "$FIXTURE" = old-app ]; then
  # old-app declares @/* only in tsconfig (no vite alias), like many older
  # apps, so the smoke file imports by relative path
  printf '%s\n' "$SMOKE" | sed 's#@/src/formic#./formic#' > src/FormicSmoke.tsx
  printf 'import "./FormicSmoke";\n' >> src/main.tsx
fi
if [ "$BUILDER" = next ]; then
  run build npx next build
  run typecheck npx tsc --noEmit -p .
else
  run typecheck npx tsc --noEmit -p .
  run build npx vite build
fi

# ── gates ───────────────────────────────────────────────────
if grep -q '"formic"' package.json; then run gates npm run formic --silent
else run gates sh -c "python3 src/formic/scripts/formic_check.py $SRC && python3 src/formic/scripts/compose_check.py $SRC"; fi

# ── hook: an unrelated commit passes, a legacy file is refused ──
[ -d .git ] || git init -q
if [ ! -f .git/hooks/pre-commit ] || ! grep -q formic_check .git/hooks/pre-commit; then
  fail hook "no pre-commit hook with formic_check was written"
else
  printf 'install test\n' > NOTES.md
  git add NOTES.md
  if git commit -qm "unrelated file" >> "$LOG" 2>&1; then
    if [ "$FIXTURE" = old-app ]; then
      BAD="src/pages/Page001.tsx"; printf '// touched\n' >> "$BAD"
    else
      BAD="$SRC/Legacy.tsx"
      printf 'export default function Legacy() {\n  return <button className="rounded-lg bg-blue-600 px-4 text-white shadow-md">Old</button>;\n}\n' > "$BAD"
    fi
    git add "$BAD" || fail hook "could not stage $BAD"
    out="$(git commit -qm "legacy file" 2>&1)"; rc=$?
    printf '\n### hook: commit of %s (exit %s)\n%s\n' "$BAD" "$rc" "$out" >> "$LOG"
    if [ $rc -eq 0 ]; then fail hook "the hook let $BAD through"
    elif printf '%s' "$out" | grep -q "usage issue"; then pass hook
    else fail hook "commit of $BAD failed, but not because of the gates: $(printf '%s' "$out" | tail -2 | tr '\n' ' | ')"; fi
    git reset -q HEAD "$BAD" 2>/dev/null; if [ "$FIXTURE" = old-app ]; then git checkout -q -- "$BAD"; else rm -f "$BAD"; fi
  else
    fail hook "the hook refused a commit of NOTES.md: $(tail -3 "$LOG" | tr '\n' ' | ')"
  fi
fi

# ── eslint: the project's own config over the vendored folder (old-app) ──
if [ "$FIXTURE" = old-app ]; then
  out="$(npx eslint src/formic 2>&1)"; rc=$?
  printf '\n### eslint (exit %s)\n%s\n' "$rc" "$out" >> "$LOG"
  if [ $rc -eq 0 ]; then pass eslint
  else fail eslint "$(printf '%s' "$out" | grep -E '[0-9]+ problems?' | tail -1)"; fi
fi

# ── summary ─────────────────────────────────────────────────
printf '\n%s summary:\n' "$FIXTURE"
printf '  %s\n' "${RESULTS[@]}"
[ "$KEEP" = 1 ] && printf 'kept: %s (log: %s)\n' "$APP" "$LOG"
[ "$FAILED" = 0 ] && { printf 'all steps passed\n'; exit 0; } || { printf 'some steps failed\n'; exit 1; }
