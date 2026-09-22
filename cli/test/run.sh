#!/usr/bin/env bash
# Smoke test for the formicai CLI: builds a registry from the working tree,
# serves it on a free local port, and runs every command against a temp
# Vite app. Prints PASS/FAIL per step and exits 1 when any step failed.
#
#   bash cli/test/run.sh            # from the repo root (npm run test:cli)
#   bash cli/test/run.sh --keep     # leave the temp dir behind
#
# Needs node 20+, npm, python3 and network for the app's npm install. The
# full install matrix (typecheck, build, hook) is scripts/test_install.sh
# --cli; this one is about the commands themselves.
set -uo pipefail

REPO="$(cd "$(dirname "$0")/../.." && pwd)"
CLI=(node "$REPO/cli/bin/formicai.js")
KEEP=0; [ "${1:-}" = "--keep" ] && KEEP=1
TMP="$(mktemp -d "${TMPDIR:-/tmp}/formicai-test.XXXXXX")"
LOG="$TMP/test.log"
SERVER=""
cleanup() { [ -n "$SERVER" ] && kill "$SERVER" 2>/dev/null; [ "$KEEP" = 1 ] && printf 'kept: %s (log: %s)\n' "$TMP" "$LOG" || rm -rf "$TMP"; }
trap cleanup EXIT
FAILED=0
pass() { printf 'PASS %s\n' "$1"; }
fail() { printf 'FAIL %s%s\n' "$1" "${2:+ — $2}"; FAILED=1; }
# run <step> <cmd…>: PASS on exit 0
run() { local step="$1"; shift; local out; out="$("$@" 2>&1)"; local rc=$?; printf '\n### %s (exit %s)\n%s\n' "$step" "$rc" "$out" >> "$LOG"; [ $rc -eq 0 ] && pass "$step" || fail "$step" "$(printf '%s' "$out" | tail -1)"; return $rc; }
# expect <step> <pattern> <cmd…>: PASS when the output matches
expect() { local step="$1" pat="$2"; shift 2; local out; out="$("$@" 2>&1)"; printf '\n### %s\n%s\n' "$step" "$out" >> "$LOG"; printf '%s' "$out" | grep -q -- "$pat" && pass "$step" || fail "$step" "expected /$pat/, got: $(printf '%s' "$out" | tail -1)"; }
# expect_fail <step> <cmd…>: PASS when the command exits non-zero
expect_fail() { local step="$1"; shift; local out; out="$("$@" 2>&1)"; local rc=$?; printf '\n### %s (exit %s)\n%s\n' "$step" "$rc" "$out" >> "$LOG"; [ $rc -ne 0 ] && pass "$step" || fail "$step" "exited 0"; }

# ── registry from the working tree, served locally ──────────
PORT="$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1",0)); print(s.getsockname()[1])')"
python3 "$REPO/scripts/build_registry.py" --base-url "http://127.0.0.1:$PORT" --out "$TMP/registry" >> "$LOG" 2>&1 || { echo "build_registry.py failed" >&2; exit 2; }
(cd "$TMP/registry" && python3 -m http.server "$PORT" --bind 127.0.0.1 >> "$LOG" 2>&1) &
SERVER=$!
for _ in 1 2 3 4 5 6 7 8 9 10; do curl -fs "http://127.0.0.1:$PORT/registry.json" >/dev/null 2>&1 && break; sleep 0.5; done
export FORMIC_REGISTRY="http://127.0.0.1:$PORT"
export GIT_AUTHOR_NAME=formic-test GIT_AUTHOR_EMAIL=test@formicai.dev GIT_COMMITTER_NAME=formic-test GIT_COMMITTER_EMAIL=test@formicai.dev
printf 'formicai smoke test in %s (registry at %s)\n' "$TMP" "$FORMIC_REGISTRY"

# ── help and version ─────────────────────────────────────────
expect version "^$(node -p "require('$REPO/cli/package.json').version")\$" "${CLI[@]}" --version
expect help "npx formicai init" "${CLI[@]}" --help
expect help-init "dry-run" "${CLI[@]}" init --help
expect help-add "overwrite" "${CLI[@]}" add --help
expect help-update "force" "${CLI[@]}" update --help
expect help-doctor "Exits 1" "${CLI[@]}" doctor --help
expect help-gates "compose_check" "${CLI[@]}" gates --help
expect help-inventory "worst first" "${CLI[@]}" inventory --help
expect_fail unknown-command "${CLI[@]}" frobnicate
# the word a person never reads: the registry client's name stays internal
if { "${CLI[@]}" --help; for c in init add update doctor gates inventory; do "${CLI[@]}" "$c" --help; done; cat "$REPO/cli/README.md"; } 2>&1 | grep -qi shadcn; then fail no-shadcn-in-user-text; else pass no-shadcn-in-user-text; fi

# ── init --new: dry run writes nothing, the real one scaffolds ──
cd "$TMP"
expect init-new-dry-run "would write src/pages/Welcome.tsx" "${CLI[@]}" init --new app --dry-run --minimal
[ -e "$TMP/app" ] && fail init-new-dry-run-writes-nothing "app/ exists after --dry-run" || pass init-new-dry-run-writes-nothing
run init-new "${CLI[@]}" init --new app --yes --minimal
cd "$TMP/app" || { echo "no app dir" >&2; exit 1; }
for f in src/formic/VERSION src/formic/registry.lock src/formic/styles/tokens.css src/formic/components/primitives.tsx src/formic/scripts/formic_check.py components.json AGENTS.md CLAUDE.md .cursor/rules/formic-design-system.mdc .github/copilot-instructions.md .claude/skills/formic-design-system/SKILL.md .git/hooks/pre-commit; do
  [ -f "$f" ] || fail "init-new-file $f" "missing"
done
[ -f src/formic/components/Button.tsx ] && fail init-minimal "Button.tsx present after --minimal" || pass init-minimal
grep -q '"@formic"' components.json && pass components-json || fail components-json "no @formic registry"
grep -q '"formic": {' package.json && grep -q '"legacy"' package.json && pass package-formic-section || fail package-formic-section
grep -q "formic_check" .git/hooks/pre-commit && pass hook || fail hook
grep -q "^  --accent: #" src/formic/styles/tokens.css && pass apply-config || fail apply-config "accent not applied"

# ── doctor: green on the scaffold ────────────────────────────
run doctor "${CLI[@]}" doctor
expect doctor-all-good "All good" "${CLI[@]}" doctor

# ── add: dry run, typo, real, idempotent, lock ───────────────
expect add-dry-run "components/DataTable.tsx.*create" "${CLI[@]}" add data-table --dry-run
[ -f src/formic/components/DataTable.tsx ] && fail add-dry-run-writes-nothing || pass add-dry-run-writes-nothing
expect add-typo "did you mean data-table" "${CLI[@]}" add datatable
expect_fail add-typo-exits-1 "${CLI[@]}" add datatable
run add "${CLI[@]}" add button data-table
for f in Button.tsx DataTable.tsx Pagination.tsx EmptyState.tsx; do [ -f "src/formic/components/$f" ] || fail "add-file $f" "missing"; done
grep -q '"data-table"' src/formic/registry.lock && grep -q '"pagination"' src/formic/registry.lock && pass add-lock || fail add-lock "lock does not list data-table and its dependency"
expect add-again "every file was already in place" "${CLI[@]}" add button
expect add-list "data-table" "${CLI[@]}" add --list

# ── gates and inventory on the scaffold ──────────────────────
run gates "${CLI[@]}" gates
expect inventory "0 of .* still to migrate" "${CLI[@]}" inventory
# legacy folders are skipped by both gates (the --legacy flag Phase 3 builds on)
mkdir -p src/legacy && printf 'export default function Old() {\n  return <button className="rounded-lg bg-blue-600 px-4 text-white shadow-md">Old</button>;\n}\n' > src/legacy/Old.tsx
expect_fail gates-see-legacy "${CLI[@]}" gates
node -e 'const fs=require("fs");const p=JSON.parse(fs.readFileSync("package.json","utf8"));p.formic.legacy=["src/legacy"];fs.writeFileSync("package.json",JSON.stringify(p,null,2)+"\n")'
run gates-skip-legacy "${CLI[@]}" gates
node -e 'const fs=require("fs");const p=JSON.parse(fs.readFileSync("package.json","utf8"));p.formic.legacy=[];fs.writeFileSync("package.json",JSON.stringify(p,null,2)+"\n")'
rm -rf src/legacy

# ── update: current, then an upstream change, a local edit, a conflict ──
expect update-current "everything is current" "${CLI[@]}" update --dry-run
python3 - "$TMP/registry" <<'PY'
import json, sys
from pathlib import Path
reg = Path(sys.argv[1])
def edit(name, endswith, fn):
    p = reg / f"{name}.json"; d = json.loads(p.read_text())
    for f in d["files"]:
        if f["target"].endswith(endswith): f["content"] = fn(f["content"])
    p.write_text(json.dumps(d))
edit("button", "Button.tsx", lambda c: c.replace('"use client";', '"use client"; // next release', 1))
edit("data-table", "DataTable.tsx", lambda c: c + "\n// upstream change\n")
edit("formic", "tokens.css", lambda c: c + "\n/* upstream token */\n")
PY
printf '\n// my local edit\n' >> src/formic/components/DataTable.tsx
printf '\n// my local edit\n' >> src/formic/components/Pagination.tsx
expect update-dry-run-shows-diff "^+\"use client\"; // next release\|+\"use client\"; // next release" "${CLI[@]}" update --dry-run
expect update-dry-run-conflict "DataTable.tsx.*changed upstream.*edited by you" "${CLI[@]}" update --dry-run
grep -q "next release" src/formic/components/Button.tsx && fail update-dry-run-writes-nothing || pass update-dry-run-writes-nothing
run update-yes "${CLI[@]}" update --yes
grep -q "next release" src/formic/components/Button.tsx && pass update-applies-upstream || fail update-applies-upstream
grep -q "my local edit" src/formic/components/DataTable.tsx && ! grep -q "upstream change" src/formic/components/DataTable.tsx && pass update-keeps-conflict || fail update-keeps-conflict
grep -q "my local edit" src/formic/components/Pagination.tsx && pass update-keeps-local-edit || fail update-keeps-local-edit
grep -q "upstream token" src/formic/styles/tokens.css && grep -q "^  --accent: #" src/formic/styles/tokens.css && pass update-styles-reapplied || fail update-styles-reapplied "tokens.css not refreshed with the accent kept"
run update-force "${CLI[@]}" update --force
grep -q "upstream change" src/formic/components/DataTable.tsx && pass update-force-replaces || fail update-force-replaces

# ── init in an existing project: dry run writes nothing, real run wires everything ──
cd "$TMP" && cp -R "$REPO/fixtures/next-app" next && cd next && git init -q && git add -A && git commit -qm seed >> "$LOG" 2>&1
expect init-existing-dry-run "would change app/globals.css" "${CLI[@]}" init --dry-run
[ -d src/formic ] && fail init-existing-dry-run-writes-nothing || pass init-existing-dry-run-writes-nothing
git diff --quiet && pass init-existing-dry-run-clean-tree || fail init-existing-dry-run-clean-tree "the dry run changed tracked files"
run init-existing "${CLI[@]}" init --yes
grep -n '@import' app/globals.css | grep -o 'fonts\.css\|"tailwindcss"\|formic\.css' | tr '\n' ' ' | grep -q 'fonts.css "tailwindcss" formic.css ' && pass init-existing-css || fail init-existing-css "$(grep '@import' app/globals.css | tr '\n' ' ')"
grep -q '"@phosphor-icons/react"' package.json && grep -q '"@dicebear/core"' package.json && grep -q '"formic": "python3' package.json && pass init-existing-package || fail init-existing-package
grep -q "formic_check" .git/hooks/pre-commit && pass init-existing-hook || fail init-existing-hook
[ -f src/formic/components/DataTable.tsx ] && pass init-existing-all-components || fail init-existing-all-components "formic-all not installed"
expect init-existing-again "already holds Formic" "${CLI[@]}" init --yes

# ── summary ─────────────────────────────────────────────────
[ "$FAILED" = 0 ] && { printf '\nall steps passed\n'; exit 0; } || { printf '\nsome steps failed (log: %s)\n' "$LOG"; [ "$KEEP" = 1 ] || { KEEP=1; printf 'kept %s for inspection\n' "$TMP"; }; exit 1; }
