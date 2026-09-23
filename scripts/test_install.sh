#!/usr/bin/env bash
# Install test: puts Formic into a copy of one of the fixtures under
# fixtures/ and checks that the result installs, type-checks, builds, passes
# the gates and commits through the hook. Prints PASS/FAIL per step and exits
# 1 when any step failed (Phase 0 of PLAN-adoption.md).
#
#   scripts/test_install.sh vite-fresh            # scaffold with install.sh --new
#   scripts/test_install.sh next-app [--keep]     # existing Next.js 15 project
#   scripts/test_install.sh old-app  [--keep]     # existing legacy Vite project
#   scripts/test_install.sh old-app --cli         # the same, installed with `formicai init`
#
# --keep leaves the temp dir behind and prints its path.
# --cli installs with node cli/bin/formicai.js (init --new for vite-fresh,
#   init for the others, --eslint-ignore for old-app) from a registry built
#   out of the working tree and served on a free local port, instead of
#   install.sh; it adds a `doctor` step, and in an existing project (next-app,
#   old-app) a `legacy` step (init marked the source folder legacy, so the
#   hook lets an untouched-by-Formic file through with a note and refuses it
#   once `formicai scope add` claims its folder) and, for old-app, a `migrate`
#   step (`formicai migrate --write` on the three busiest pages drops their
#   formic_check issues by at least 80% and the app still builds) wrapped in
#   a `visual` step (scripts/visual_check.sh: screenshots of the three
#   routes at two viewports in light and dark before the migration and
#   after it, compared pixel by pixel against $FORMIC_VISUAL_THRESHOLD
#   (light) and $FORMIC_VISUAL_THRESHOLD_DARK; on a
#   machine with no browser it passes as "skipped: no browser"). Same
#   PASS/FAIL lines otherwise.
set -uo pipefail

REPO="$(cd "$(dirname "$0")/.." && pwd)"
FIXTURE="${1:-}"; KEEP=0; CLI=0
for a in "${@:2}"; do
  case "$a" in
    --keep) KEEP=1 ;;
    --cli) CLI=1 ;;
    *) printf 'unknown option %s\n' "$a" >&2; exit 2 ;;
  esac
done
case "$FIXTURE" in
  vite-fresh|next-app|old-app) ;;
  *) printf 'usage: %s <vite-fresh|next-app|old-app> [--keep] [--cli]\n' "$0" >&2; exit 2 ;;
esac

BRANCH="$(git -C "$REPO" branch --show-current)"
[ -n "$BRANCH" ] || { echo "the repo is on a detached HEAD; check out a branch first" >&2; exit 2; }
if [ "$CLI" = 0 ] && [ -n "$(git -C "$REPO" status --porcelain -- styles components scripts AGENTS.md skill formic.config.json package.json 2>/dev/null)" ]; then
  printf 'warning: uncommitted changes in the repo; the installer clones, so the test installs the LAST COMMIT on %s (install.sh itself runs from the working tree; --cli installs the working tree)\n' "$BRANCH"
fi

TMP="$(mktemp -d "${TMPDIR:-/tmp}/formic-install-$FIXTURE.XXXXXX")"
LOG="$TMP/test.log"
SERVER=""
cleanup() { [ -n "$SERVER" ] && kill "$SERVER" 2>/dev/null; [ "$KEEP" = 1 ] || rm -rf "$TMP"; }
trap cleanup EXIT
FAILED=0; RESULTS=()

# --cli: a registry built from the working tree, served locally, and the CLI pointed at it
FORMICAI=(node "$REPO/cli/bin/formicai.js")
if [ "$CLI" = 1 ]; then
  PORT="$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1",0)); print(s.getsockname()[1])')"
  python3 "$REPO/scripts/build_registry.py" --base-url "http://127.0.0.1:$PORT" --out "$TMP/registry" >> "$LOG" 2>&1 || { echo "build_registry.py failed; see $LOG" >&2; exit 2; }
  (cd "$TMP/registry" && python3 -m http.server "$PORT" --bind 127.0.0.1 >> "$LOG" 2>&1) &
  SERVER=$!
  for _ in 1 2 3 4 5 6 7 8 9 10; do curl -fs "http://127.0.0.1:$PORT/registry.json" >/dev/null 2>&1 && break; sleep 0.5; done
  export FORMIC_REGISTRY="http://127.0.0.1:$PORT"
fi

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
printf 'fixture %s in %s (Formic from %s @ %s%s)\n' "$FIXTURE" "$TMP" "$REPO" "$BRANCH" "$([ "$CLI" = 1 ] && printf ', via formicai init against %s' "$FORMIC_REGISTRY")"

# ── set up the project and install ──────────────────────────
if [ "$FIXTURE" = vite-fresh ]; then
  APP="$TMP/app"; CSS="src/index.css"; BUILDER=vite; SRC=src
  if [ "$CLI" = 1 ]; then cd "$TMP" && run install "${FORMICAI[@]}" init --new app --yes
  else cd "$TMP" && run install bash "$REPO/install.sh" --new app; fi
  cd "$APP" 2>/dev/null || { fail deps "no app dir"; fail css; fail typecheck; fail build; fail gates; fail hook; }
else
  APP="$TMP/app"
  cp -R "$REPO/fixtures/$FIXTURE" "$APP"
  cd "$APP"
  if [ "$FIXTURE" = old-app ]; then
    python3 generate.py "$APP" >> "$LOG" 2>&1 || { echo "generate.py failed" >&2; exit 2; }
    # the fixture's .gitignore keeps the generated files out of THIS repo; in
    # the copy they are the project's own tracked files
    printf 'node_modules\ndist\n.formic-visual\n' > .gitignore
    CSS="src/index.css"; BUILDER=vite; SRC=src
  else
    CSS="app/globals.css"; BUILDER=next; SRC=app
  fi
  # an existing project is a git repo with its dependencies installed
  git init -q && git add -A && git commit -qm "fixture seed" >> "$LOG" 2>&1
  printf 'npm install (project deps)…\n'
  npm install --no-audit --no-fund --silent >> "$LOG" 2>&1 || { echo "npm install of the fixture failed; see $LOG" >&2; exit 2; }
  if [ "$CLI" = 1 ]; then
    if [ "$FIXTURE" = old-app ]; then run install "${FORMICAI[@]}" init --yes --eslint-ignore; else run install "${FORMICAI[@]}" init --yes; fi
  else run install bash "$REPO/install.sh"; fi
fi
cd "$APP" || exit 1

# ── doctor (--cli): every check green ─────────────────────────
[ "$CLI" = 1 ] && run doctor "${FORMICAI[@]}" doctor

# ── add (--cli): init installs the base only, so the smoke page's components
# come through `formicai add`, the way an agent gets them ──────
[ "$CLI" = 1 ] && run add "${FORMICAI[@]}" add app-shell panel button

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
  # old-app's smoke file imports by relative path, like most older apps do
  # (the fixture has the @ alias in both configs since Phase 3 so doctor can be strict)
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

# ── visual, before (--cli, old-app): the three routes as they are now ──
# The migration rewrites palette greys to Formic greys and rounded-lg to the
# scale, so the pages WILL move; the threshold is the measured diff plus a
# margin (see the `visual` step after migrate), and a regression is a diff
# above it. Exit 3 from the script means no browser could be installed or
# launched (CI without Playwright's system libraries): the step passes with
# a note rather than failing on the machine.
# Measured on the first run: light 3.6–7.5% (greys, radii, the accent
# button, the Urbanist glyphs), dark 27.7–37.0% (the migrated regions now
# carry tokens, so they turn dark while the unmigrated shell stays light);
# the bars are those plus a margin.
VISUAL=""; VISUAL_ROUTES="/,/#/2,/#/3"; VISUAL_THRESHOLD="${FORMIC_VISUAL_THRESHOLD:-12}"; VISUAL_THRESHOLD_DARK="${FORMIC_VISUAL_THRESHOLD_DARK:-45}"
if [ "$CLI" = 1 ] && [ "$FIXTURE" = old-app ]; then
  VISUAL_T0="$(date +%s)"
  out="$(bash "$REPO/scripts/visual_check.sh" "$APP" before --routes "$VISUAL_ROUTES" --no-build 2>&1)"; rc=$?
  printf '\n### visual before (exit %s)\n%s\n' "$rc" "$out" >> "$LOG"
  case $rc in
    0) VISUAL=ok; printf '%s\n' "$out" | grep '^visual: before:' | tail -1 ;;
    3) VISUAL=skip; pass "visual (skipped: no browser — $(printf '%s' "$out" | tail -1 | sed 's/^visual: skipped: no browser (//; s/)$//'))" ;;
    *) VISUAL=fail; fail visual "before: $(printf '%s' "$out" | tail -1)" ;;
  esac
fi

# ── gates ───────────────────────────────────────────────────
if grep -q '"formic"' package.json; then run gates npm run formic --silent
else run gates sh -c "python3 src/formic/scripts/formic_check.py $SRC && python3 src/formic/scripts/compose_check.py $SRC"; fi

# ── hook: an unrelated commit passes, a legacy file is refused ──
# (--cli in an existing project: init marked $SRC legacy, so a legacy file
# passes with a note until `formicai scope add` claims its folder, then it
# is refused; the `legacy` step records that)
[ -d .git ] || git init -q
if [ ! -f .git/hooks/pre-commit ] || ! grep -q formic_check .git/hooks/pre-commit; then
  fail hook "no pre-commit hook with formic_check was written"
else
  printf 'install test\n' > NOTES.md
  git add NOTES.md
  if git commit -qm "unrelated file" >> "$LOG" 2>&1; then
    if [ "$FIXTURE" = old-app ]; then
      BAD="src/pages/Page001.tsx"; SCOPED="src/pages"; printf '// touched\n' >> "$BAD"
    else
      BAD="$SRC/legacy-check/Legacy.tsx"; SCOPED="$SRC/legacy-check"; mkdir -p "$SRC/legacy-check"
      printf 'export default function Legacy() {\n  return <button className="rounded-lg bg-blue-600 px-4 text-white shadow-md">Old</button>;\n}\n' > "$BAD"
    fi
    git add "$BAD" || fail hook "could not stage $BAD"
    out="$(git commit -qm "legacy file" 2>&1)"; rc=$?
    printf '\n### hook: commit of %s (exit %s)\n%s\n' "$BAD" "$rc" "$out" >> "$LOG"
    if [ "$CLI" = 1 ] && [ "$FIXTURE" != vite-fresh ]; then
      # legacy: the file went through with the note, and package.json says why
      if node -e 'const p=require("./package.json").formic;process.exit(Array.isArray(p&&p.legacy)&&p.legacy.includes(process.argv[1])?0:1)' "$SRC" \
         && [ $rc -eq 0 ] && printf '%s' "$out" | grep -q "legacy folder"; then pass legacy
      elif [ $rc -ne 0 ]; then fail legacy "the hook refused $BAD although init marked $SRC legacy: $(printf '%s' "$out" | tail -2 | tr '\n' ' | ')"
      else fail legacy "package.json → formic.legacy does not list $SRC, or the hook printed no legacy note"; fi
      # scope: once the folder is claimed the same file is refused
      "${FORMICAI[@]}" scope add "$SCOPED" >> "$LOG" 2>&1 || fail hook "formicai scope add $SCOPED failed"
      printf '// touched again\n' >> "$BAD"; git add "$BAD"
      out="$(git commit -qm "scoped file" 2>&1)"; rc=$?
      printf '\n### hook: commit of %s after scope add %s (exit %s)\n%s\n' "$BAD" "$SCOPED" "$rc" "$out" >> "$LOG"
      if [ $rc -eq 0 ]; then fail hook "the hook let $BAD through after formicai scope add $SCOPED"
      elif printf '%s' "$out" | grep -q "usage issue"; then pass hook
      else fail hook "commit of $BAD failed, but not because of the gates: $(printf '%s' "$out" | tail -2 | tr '\n' ' | ')"; fi
      git reset -q HEAD "$BAD" 2>/dev/null; git checkout -q -- "$BAD"
      if [ "$FIXTURE" != old-app ]; then "${FORMICAI[@]}" scope remove "$SCOPED" >> "$LOG" 2>&1; git rm -rq "$SRC/legacy-check" >> "$LOG" 2>&1; git commit -qm "legacy check removed" >> "$LOG" 2>&1; fi
    else
      if [ $rc -eq 0 ]; then fail hook "the hook let $BAD through"
      elif printf '%s' "$out" | grep -q "usage issue"; then pass hook
      else fail hook "commit of $BAD failed, but not because of the gates: $(printf '%s' "$out" | tail -2 | tr '\n' ' | ')"; fi
      git reset -q HEAD "$BAD" 2>/dev/null; if [ "$FIXTURE" = old-app ]; then git checkout -q -- "$BAD"; else rm -f "$BAD"; fi
    fi
  else
    fail hook "the hook refused a commit of NOTES.md: $(tail -3 "$LOG" | tr '\n' ' | ')"
  fi
fi

# ── migrate (--cli, old-app): the codemods on the three busiest pages ──
# PASS when formic_check's issue count over the three files drops by at
# least 80% and `vite build` still passes; the before/after numbers, the
# todos left and the remaining issues go to the log.
if [ "$CLI" = 1 ] && [ "$FIXTURE" = old-app ]; then
  PAGES="src/pages/Page001.tsx src/pages/Page002.tsx src/pages/Page003.tsx"
  count_issues() { local o; o="$(python3 src/formic/scripts/formic_check.py $PAGES 2>&1)"; printf '%s' "$o" | grep -o '[0-9]* usage issue' | grep -o '^[0-9]*' || printf '0'; }
  BEFORE="$(count_issues)"
  out="$("${FORMICAI[@]}" migrate $PAGES --write 2>&1)"; rc=$?
  printf '\n### migrate (exit %s)\n%s\n' "$rc" "$out" >> "$LOG"
  AFTER="$(count_issues)"
  TODOS="$(grep -c 'formic-todo' $PAGES | awk -F: '{s+=$2} END {print s+0}')"
  printf 'migrate: formic_check %s → %s issue(s) over 3 files, %s formic-todo comment(s) left\n' "$BEFORE" "$AFTER" "$TODOS"
  if [ $rc -ne 0 ]; then fail migrate "formicai migrate exited $rc: $(printf '%s' "$out" | tail -1)"
  elif [ "$BEFORE" -eq 0 ] || [ $((AFTER * 5)) -gt "$BEFORE" ]; then fail migrate "issues went $BEFORE → $AFTER, less than an 80% drop"
  elif ! npx vite build > "$TMP/migrate-build.log" 2>&1; then cat "$TMP/migrate-build.log" >> "$LOG"; fail migrate "vite build fails after the rewrite ($BEFORE → $AFTER issues)"
  else pass "migrate ($BEFORE → $AFTER issues, $TODOS todo(s), build ok)"; fi
fi

# ── visual, after + compare (--cli, old-app) ─────────────────
# `after` rebuilds (so a rewrite that broke the build fails here too, not
# silently against a stale dist/), then compare prints the table and the
# verdict; .formic-visual/report.html in the app dir shows before / after /
# diff for anything above 0.1%.
if [ "$VISUAL" = ok ]; then
  out="$(bash "$REPO/scripts/visual_check.sh" "$APP" after --routes "$VISUAL_ROUTES" 2>&1)"; rc=$?
  printf '\n### visual after (exit %s)\n%s\n' "$rc" "$out" >> "$LOG"
  if [ $rc -ne 0 ]; then fail visual "after: $(printf '%s' "$out" | tail -1)"
  else
    out="$(bash "$REPO/scripts/visual_check.sh" "$APP" compare --threshold "$VISUAL_THRESHOLD" --threshold-dark "$VISUAL_THRESHOLD_DARK" 2>&1)"; rc=$?
    printf '\n### visual compare (exit %s)\n%s\n' "$rc" "$out" >> "$LOG"
    printf '%s\n' "$out" | grep -v '^PASS:\|^FAIL:' | sed 's/^/  /'
    VERDICT="$(printf '%s' "$out" | grep '^PASS:\|^FAIL:' | tail -1 | sed 's/; report:.*//; s/; see .*//')"
    printf 'visual: %ss, %s in .formic-visual\n' "$(( $(date +%s) - VISUAL_T0 ))" "$(du -sh .formic-visual 2>/dev/null | cut -f1)"
    if [ $rc -eq 0 ]; then pass "visual (${VERDICT#PASS: })"; else fail visual "${VERDICT#FAIL: }"; fi
  fi
fi

# ── eslint: the project's own config over the vendored folder (old-app) ──
# clean, or ignored by the config (what `formicai init --eslint-ignore` writes), both pass
if [ "$FIXTURE" = old-app ]; then
  out="$(npx eslint src/formic 2>&1)"; rc=$?
  printf '\n### eslint (exit %s)\n%s\n' "$rc" "$out" >> "$LOG"
  if [ $rc -eq 0 ]; then pass eslint
  elif printf '%s' "$out" | grep -q 'are ignored'; then pass eslint
  else fail eslint "$(printf '%s' "$out" | grep -E '[0-9]+ problems?' | tail -1)"; fi
fi

# ── summary ─────────────────────────────────────────────────
printf '\n%s summary:\n' "$FIXTURE"
printf '  %s\n' "${RESULTS[@]}"
[ "$KEEP" = 1 ] && printf 'kept: %s (log: %s)\n' "$APP" "$LOG"
[ "$FAILED" = 0 ] && { printf 'all steps passed\n'; exit 0; } || { printf 'some steps failed\n'; exit 1; }
