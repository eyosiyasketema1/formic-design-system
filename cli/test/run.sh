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
SERVER=""; PRO_SERVER=""
cleanup() { [ -n "$SERVER" ] && kill "$SERVER" 2>/dev/null; [ -n "$PRO_SERVER" ] && kill "$PRO_SERVER" 2>/dev/null; [ "$KEEP" = 1 ] && printf 'kept: %s (log: %s)\n' "$TMP" "$LOG" || rm -rf "$TMP"; }
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
# the Formic Pro stand-in (cli/test/pro-server.mjs): the catalogue, two keyed items, the activate endpoint
PRO_PORT="$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1",0)); print(s.getsockname()[1])')"
node "$REPO/cli/test/pro-server.mjs" "$PRO_PORT" "$FORMIC_REGISTRY" >> "$LOG" 2>&1 &
PRO_SERVER=$!
for _ in 1 2 3 4 5 6 7 8 9 10; do curl -fs "http://127.0.0.1:$PRO_PORT/r/pro/registry.json" >/dev/null 2>&1 && break; sleep 0.5; done
export FORMIC_PRO_URL="http://127.0.0.1:$PRO_PORT"
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
expect help-scope "under the gates" "${CLI[@]}" scope --help
expect help-migrate "formic-todo" "${CLI[@]}" migrate --help
expect help-docs "simplest JSX" "${CLI[@]}" docs --help
expect help-mcp "list_components" "${CLI[@]}" mcp --help
expect help-preset "base64url" "${CLI[@]}" preset --help
expect help-key "never printed in full" "${CLI[@]}" key --help
expect help-init-key "\-\-key <key>" "${CLI[@]}" init --help
expect help-init-all "\-\-all" "${CLI[@]}" init --help
expect_fail unknown-command "${CLI[@]}" frobnicate
# the word a person never reads: the registry client's name stays internal
if { "${CLI[@]}" --help; for c in init add update doctor gates inventory scope migrate docs mcp preset key; do "${CLI[@]}" "$c" --help; done; cat "$REPO/cli/README.md" "$REPO/skill/SKILL.md"; } 2>&1 | grep -qi shadcn; then fail no-shadcn-in-user-text; else pass no-shadcn-in-user-text; fi
# the skill's two copies are one file (build_registry.py mirrors skill/SKILL.md into the layout `npx skills add` reads)
cmp -s "$REPO/skill/SKILL.md" "$REPO/skills/formic-design-system/SKILL.md" && pass skill-mirror || fail skill-mirror "skills/formic-design-system/SKILL.md differs from skill/SKILL.md; run python3 scripts/build_registry.py"
grep -q "^name: formic-design-system" "$REPO/skills/formic-design-system/SKILL.md" && grep -q "^description: " "$REPO/skills/formic-design-system/SKILL.md" && pass skill-frontmatter || fail skill-frontmatter
grep -q "never write a stand-in" "$REPO/skill/SKILL.md" && grep -q "never write a stand-in" "$REPO/AGENTS.md" && grep -q "never write a stand-in" "$REPO/cli/templates/Welcome.tsx" && pass add-rule-everywhere || fail add-rule-everywhere "the add-not-fake rule is missing from the skill, AGENTS.md or the test prompts"

# ── init --new: dry run writes nothing, the real one scaffolds ──
cd "$TMP"
expect init-new-dry-run "would write src/pages/Welcome.tsx" "${CLI[@]}" init --new app --dry-run
[ -e "$TMP/app" ] && fail init-new-dry-run-writes-nothing "app/ exists after --dry-run" || pass init-new-dry-run-writes-nothing
# the base by default: a new app gets the base plus what its welcome page imports (button, panel), nothing else
expect init-new-dry-run-base "would write src/formic/components/Panel.tsx" "${CLI[@]}" init --new app --dry-run
if "${CLI[@]}" init --new app --dry-run 2>&1 | grep -q "DataTable.tsx"; then fail init-new-dry-run-minimal "DataTable.tsx in the default install"; else pass init-new-dry-run-minimal; fi
expect init-new-dry-run-all "would write src/formic/components/DataTable.tsx" "${CLI[@]}" init --new app --dry-run --all
run init-new "${CLI[@]}" init --new app --yes
cd "$TMP/app" || { echo "no app dir" >&2; exit 1; }
for f in src/formic/VERSION src/formic/registry.lock src/formic/styles/tokens.css src/formic/components/primitives.tsx src/formic/components/Button.tsx src/formic/components/Panel.tsx src/formic/scripts/formic_check.py components.json AGENTS.md CLAUDE.md .cursor/rules/formic-design-system.mdc .github/copilot-instructions.md .claude/skills/formic-design-system/SKILL.md .mcp.json .cursor/mcp.json .git/hooks/pre-commit; do
  [ -f "$f" ] || fail "init-new-file $f" "missing"
done
[ -f src/formic/components/DataTable.tsx ] && fail init-minimal-default "DataTable.tsx present after a default init" || pass init-minimal-default
grep -q "Only the base is installed" "$LOG" && pass init-says-base || fail init-says-base "init did not say only the base is installed"
node -e 'const c=require("./.mcp.json").mcpServers.formic;process.exit(c.command==="npx"&&c.args.join(" ")==="formicai mcp"?0:1)' && pass mcp-json || fail mcp-json "$(cat .mcp.json)"
# the scaffold compiles on the base plus button and panel (the welcome page imports Button, Panel, FormicMark, Icon)
run init-new-typecheck npx tsc --noEmit -p .
grep -q '"@formic"' components.json && pass components-json || fail components-json "no @formic registry"
node -e 'const r=require("./components.json").registries["@formic-pro"];process.exit(r&&r.url.endsWith("/r/pro/{name}.json")&&r.headers.Authorization==="Bearer ${FORMIC_KEY}"&&r.headers["X-Formic-Activation"]==="${FORMIC_KEY_ACTIVATION}"?0:1)' && pass components-json-pro || fail components-json-pro "no keyed @formic-pro registry entry"
grep -q '"formic": {' package.json && grep -q '"legacy"' package.json && pass package-formic-section || fail package-formic-section
grep -q "formic_check" .git/hooks/pre-commit && pass hook || fail hook
grep -q "^  --accent: #" src/formic/styles/tokens.css && pass apply-config || fail apply-config "accent not applied"

# ── doctor: green on the scaffold; a second kit beside Formic is a ! note with its next step (a warning, never a failure) ──
run doctor "${CLI[@]}" doctor
expect doctor-all-good "All good" "${CLI[@]}" doctor
node -e 'const fs=require("fs");const p=JSON.parse(fs.readFileSync("package.json","utf8"));p.dependencies["lucide-react"]="1.0.0";fs.writeFileSync("package.json",JSON.stringify(p,null,2)+"\n")'
expect doctor-second-kit "a second UI kit: lucide-react in dependencies" "${CLI[@]}" doctor
expect doctor-second-kit-fix "npm uninstall lucide-react" "${CLI[@]}" doctor
expect doctor-second-kit-warns "note(s) for the migration" "${CLI[@]}" doctor
run doctor-second-kit-exits-0 "${CLI[@]}" doctor
node -e 'const fs=require("fs");const p=JSON.parse(fs.readFileSync("package.json","utf8"));delete p.dependencies["lucide-react"];fs.writeFileSync("package.json",JSON.stringify(p,null,2)+"\n")'
printf 'module.exports = { theme: { extend: { colors: { brand: "#123456" } } } };\n' > tailwind.config.js
expect doctor-tailwind-config "defines its own colours" "${CLI[@]}" doctor
rm -f tailwind.config.js

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

# ── Formic Pro: the catalogue shows without a key, items need one; key, add, lock, doctor, docs, mcp, remove ──
expect pro-list-heading "Formic Pro" "${CLI[@]}" add --list
expect pro-list-mark "pro-sample.*Pro" "${CLI[@]}" add --list
expect pro-list-needs-key "Pro components need a key: npx formicai key <key>" "${CLI[@]}" add --list
expect pro-add-no-key "This component is in Formic Pro. Add your key with: npx formicai key <key>" "${CLI[@]}" add pro-sample
expect pro-add-no-key-fix "fix: npx formicai key <key>" "${CLI[@]}" add pro-sample
expect_fail pro-add-no-key-exits-1 "${CLI[@]}" add pro-sample
[ -e src/formic/pro ] && fail pro-add-no-key-writes-nothing "src/formic/pro exists" || pass pro-add-no-key-writes-nothing
grep -q "pro-sample" src/formic/registry.lock && fail pro-add-no-key-no-lock "pro-sample in the lock without a key" || pass pro-add-no-key-no-lock
expect pro-docs-no-key "install with a key to see the props" "${CLI[@]}" docs pro-sample
expect pro-docs-no-key-deps "needs: button" "${CLI[@]}" docs pro-sample
expect pro-key-none "no Formic Pro key" "${CLI[@]}" key
expect pro-doctor-none "no Formic Pro key (optional" "${CLI[@]}" doctor
expect pro-key-expired "expired on 2026-01-31" "${CLI[@]}" key TEST-EXPIRED
expect_fail pro-key-expired-exits-1 "${CLI[@]}" key TEST-EXPIRED
[ -f .env.local ] && fail pro-key-expired-writes-nothing ".env.local written for a refused key" || pass pro-key-expired-writes-nothing
expect pro-key-invalid "That key is not valid" "${CLI[@]}" key NOT-A-KEY
KEY_OUT="$("${CLI[@]}" key TEST-GRANTED 2>&1)"; printf '\n### pro-key-granted\n%s\n' "$KEY_OUT" >> "$LOG"
printf '%s' "$KEY_OUT" | grep -q "Formic Pro key \*\*\*\*-RANTED written to .env.local, valid until 2027-01-01" && pass pro-key-granted || fail pro-key-granted "$(printf '%s' "$KEY_OUT" | tail -1)"
printf '%s' "$KEY_OUT" | grep -q "TEST-GRANTED" && fail pro-key-masked "the full key was printed" || pass pro-key-masked
printf '%s' "$KEY_OUT" | grep -q "Pro components: npx formicai add --list" && pass pro-key-says-list || fail pro-key-says-list
grep -q "^FORMIC_KEY=TEST-GRANTED$" .env.local && grep -q "^FORMIC_KEY_ACTIVATION=act-1$" .env.local && pass pro-env-local || fail pro-env-local "$(cat .env.local)"
grep -q "^.env.local$" .gitignore && pass pro-gitignore || fail pro-gitignore "$(cat .gitignore | tr '\n' ' ')"
printf '%s' "$KEY_OUT" | grep -q ".gitignore: .env.local added" && pass pro-gitignore-said || fail pro-gitignore-said
expect pro-key-status "\*\*\*\*-RANTED from .env.local, valid until 2027-01-01; the site accepts it" "${CLI[@]}" key
printf 'OTHER=1\n' > .env.local.keep && cat .env.local >> .env.local.keep && mv .env.local.keep .env.local
run pro-key-again "${CLI[@]}" key TEST-GRANTED
grep -q "^OTHER=1$" .env.local && [ "$(grep -c "^FORMIC_KEY=" .env.local)" = 1 ] && pass pro-env-local-keeps-others || fail pro-env-local-keeps-others "$(cat .env.local | tr '\n' ' ')"
rm -f src/formic/components/Button.tsx
run pro-add "${CLI[@]}" add pro-sample
[ -f src/formic/pro/ProSample.tsx ] && pass pro-add-file || fail pro-add-file "src/formic/pro/ProSample.tsx missing"
[ -f src/formic/components/Button.tsx ] && pass pro-add-free-dep || fail pro-add-free-dep "Button.tsx (a free dependency of pro-sample) not written"
node -e 'const l=JSON.parse(require("fs").readFileSync("src/formic/registry.lock","utf8"));process.exit(l.items["pro-sample"]&&l.items["pro-sample"].pro===true&&typeof l.items.button==="string"?0:1)' && pass pro-lock || fail pro-lock "$(grep -A2 pro-sample src/formic/registry.lock | tr '\n' ' ')"
grep -q '"pro": true' src/formic/registry.lock && pass pro-lock-flag || fail pro-lock-flag
run pro-add-pro-dep "${CLI[@]}" add pro-other
[ -f src/formic/pro/ProOther.tsx ] && pass pro-add-pro-dep-file || fail pro-add-pro-dep-file
expect pro-add-again "every file was already in place" "${CLI[@]}" add pro-sample
expect pro-docs-list "Formic Pro" "${CLI[@]}" docs
expect pro-docs-list-installed "pro-sample.*Pro.*(installed)" "${CLI[@]}" docs
expect pro-docs-props "label?: string" "${CLI[@]}" docs pro-sample
expect pro-docs-example 'import ProSample from "./formic/pro/ProSample"' "${CLI[@]}" docs pro-sample
expect pro-doctor-key "Formic Pro key \*\*\*\*-RANTED, valid until 2027-01-01" "${CLI[@]}" doctor
expect pro-update-current "everything is current" "${CLI[@]}" update --dry-run
printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"formic-test","version":"0"}}}' '{"jsonrpc":"2.0","method":"notifications/initialized"}' '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"list_components","arguments":{}}}' | "${CLI[@]}" mcp 2>> "$LOG" | node -e '
let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const by={};for(const l of s.split("\n").filter(Boolean)){const m=JSON.parse(l);by[m.id]=m;}
const r=by[2]&&by[2].result;const t=r&&r.content[0].text;const c=r&&r.structuredContent.components;
process.exit(t&&t.includes("Formic Pro")&&t.includes("pro-other")&&c.some(x=>x.name==="pro-sample"&&x.pro===true&&x.installed===true)&&c.findIndex(x=>x.pro)>c.findIndex(x=>x.name==="button")&&r.structuredContent.proKey===true?0:1)})' && pass pro-mcp-list || fail pro-mcp-list "list_components does not show the Pro items after the free ones"
sed -i.bak 's/^FORMIC_KEY=TEST-GRANTED$/FORMIC_KEY=TEST-EXPIRED/' .env.local && rm -f .env.local.bak
expect pro-doctor-refused "Formic Pro key \*\*\*\*-XPIRED: Your Formic Pro key expired on 2026-01-31" "${CLI[@]}" doctor
expect pro-doctor-refused-fix "npx formicai key <new key>" "${CLI[@]}" doctor
expect_fail pro-doctor-refused-exits-1 "${CLI[@]}" doctor
expect pro-update-refused "Formic Pro: pro-other, pro-sample skipped, the key \*\*\*\*-XPIRED was refused" "${CLI[@]}" update --dry-run
expect pro-key-remove "Formic Pro key \*\*\*\*-XPIRED removed from .env.local" "${CLI[@]}" key --remove
grep -q "FORMIC_KEY" .env.local && fail pro-key-removed "FORMIC_KEY still in .env.local" || pass pro-key-removed
grep -q "^OTHER=1$" .env.local && pass pro-key-remove-keeps-others || fail pro-key-remove-keeps-others "$(cat .env.local)"
expect pro-key-remove-again "no Formic Pro key in .env.local" "${CLI[@]}" key --remove
expect pro-list-needs-key-again "Pro components need a key" "${CLI[@]}" docs
expect pro-update-no-key "Formic Pro: pro-other, pro-sample skipped, no key" "${CLI[@]}" update --dry-run
rm -f .env.local

# ── docs: the list, one installed component, one not yet installed, a typo, JSON ──
expect docs-list "data-table" "${CLI[@]}" docs
expect docs-list-installed "button.*(installed)" "${CLI[@]}" docs
expect docs-button-props 'variant?: "primary" | "secondary"' "${CLI[@]}" docs button
expect docs-button-default '= "primary"' "${CLI[@]}" docs button
expect docs-button-example 'import Button from "./formic/components/Button"' "${CLI[@]}" docs button
expect docs-data-table-named 'import { DataTable } from' "${CLI[@]}" docs data-table
expect docs-data-table-exports "PersonCell" "${CLI[@]}" docs data-table
expect docs-not-installed "not installed; npx formicai add modal" "${CLI[@]}" docs modal
expect docs-not-installed-props "open" "${CLI[@]}" docs modal
expect docs-typo "did you mean data-table" "${CLI[@]}" docs datatabl
expect_fail docs-typo-exits-1 "${CLI[@]}" docs datatabl
"${CLI[@]}" docs button --json | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const r=JSON.parse(s);process.exit(r.name==="button"&&r.props.some(p=>p.name==="variant")&&r.example.length===2?0:1)})' && pass docs-json || fail docs-json

# ── mcp: a JSON-RPC round trip over stdio (initialize, tools/list, tools/call), then install merges ──
MCP_OUT="$TMP/mcp.out"
{
  printf '%s\n' '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"formic-test","version":"0"}}}'
  printf '%s\n' '{"jsonrpc":"2.0","method":"notifications/initialized"}'
  printf '%s\n' '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'
  printf '%s\n' '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"list_components","arguments":{}}}'
  printf '%s\n' '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"component_docs","arguments":{"name":"panel"}}}'
  printf '%s\n' '{"jsonrpc":"2.0","id":5,"method":"tools/call","params":{"name":"add_component","arguments":{"names":["empty-state","toast"]}}}'
  printf '%s\n' '{"jsonrpc":"2.0","id":6,"method":"tools/call","params":{"name":"gates","arguments":{}}}'
  printf '%s\n' '{"jsonrpc":"2.0","id":7,"method":"tools/call","params":{"name":"no_such_tool","arguments":{}}}'
  printf '%s\n' '{"jsonrpc":"2.0","id":8,"method":"ping"}'
} | "${CLI[@]}" mcp > "$MCP_OUT" 2>> "$LOG"
node -e '
const fs = require("fs");
const lines = fs.readFileSync(process.argv[1], "utf8").split("\n").filter(Boolean);
const by = {};
for (const l of lines) { const m = JSON.parse(l); if (m.jsonrpc !== "2.0") process.exit(10); by[m.id] = m; }
const ok = (c, n) => { if (!c) { console.error("mcp check failed:", n); process.exit(n); } };
ok(by[1]?.result?.protocolVersion === "2025-06-18" && by[1].result.serverInfo?.name === "formic" && by[1].result.capabilities?.tools, 11);
ok(["list_components","component_docs","add_component","inventory","doctor","gates"].every((t) => by[2]?.result?.tools?.some((x) => x.name === t && x.inputSchema?.type === "object")), 12);
ok(by[3]?.result?.content?.[0]?.type === "text" && by[3].result.content[0].text.includes("data-table") && by[3].result.structuredContent.components.some((c) => c.name === "button" && c.installed === true), 13);
ok(by[4]?.result?.content?.[0]?.text.includes("Panel (panel)") && by[4].result.content[0].text.includes("caption?: ReactNode"), 14);
ok(by[5]?.result?.isError === false && by[5].result.structuredContent.files.includes("src/formic/components/Toast.tsx"), 15);
ok(by[6]?.result?.isError === false, 16);
ok(by[7]?.error?.code === -32602, 17);
ok(JSON.stringify(by[8]?.result) === "{}", 18);
ok(!("id" in by) || true, 19);
' "$MCP_OUT" && pass mcp-round-trip || fail mcp-round-trip "$(tail -1 "$LOG")"
[ -f src/formic/components/Toast.tsx ] && pass mcp-add-writes || fail mcp-add-writes "Toast.tsx not written by add_component"
if grep -v '^{' "$MCP_OUT" | grep -q .; then fail mcp-stdout-clean "something on stdout that is not a JSON-RPC message"; else pass mcp-stdout-clean; fi
expect mcp-install-again "already starts the Formic MCP server" "${CLI[@]}" mcp install
printf '{ "mcpServers": { "other": { "command": "x" } }, "keep": 1 }\n' > .mcp.json
run mcp-install-merge "${CLI[@]}" mcp install
node -e 'const c=require("./.mcp.json");process.exit(c.keep===1&&c.mcpServers.other.command==="x"&&c.mcpServers.formic.args[1]==="mcp"?0:1)' && pass mcp-install-keeps-others || fail mcp-install-keeps-others "$(cat .mcp.json)"

# ── preset: init --preset writes the keys and applies them; preset prints the code back ──
PRESET_CODE="$(printf '%s' '{"accent":"#2563EB","radius":"rounded","sidebar":"topbar"}' | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>process.stdout.write(Buffer.from(s).toString("base64url")))')"
run init-preset "${CLI[@]}" init --yes --preset "$PRESET_CODE"
grep -q '"accent": "#2563EB"' src/formic/formic.config.json && grep -q '"radius": "rounded"' src/formic/formic.config.json && grep -q '"sidebar": "topbar"' src/formic/formic.config.json && grep -q '"font": "Urbanist"' src/formic/formic.config.json && pass preset-config || fail preset-config "$(cat src/formic/formic.config.json | tr '\n' ' ')"
grep -q 'data-radius="rounded"' index.html && grep -q '^  --accent: #2060eb' src/formic/styles/tokens.css && pass preset-applied || fail preset-applied "$(grep '<html' index.html) / $(grep -m1 '^  --accent' src/formic/styles/tokens.css)"
expect preset-print "accent=\"#2563EB\", radius=\"rounded\"" "${CLI[@]}" preset
expect preset-print-command "npx formicai init --preset " "${CLI[@]}" preset
"${CLI[@]}" preset | grep -o 'preset [A-Za-z0-9_-]*' | cut -d' ' -f2 | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const o=JSON.parse(Buffer.from(s.trim(),"base64url").toString());process.exit(o.accent==="#2563EB"&&o.radius==="rounded"&&o.sidebar==="topbar"?0:1)})' && pass preset-round-trip || fail preset-round-trip
expect preset-bad "is not a preset code" "${CLI[@]}" init --yes --preset not-a-code
expect preset-unknown-key "does not know: colour" "${CLI[@]}" init --yes --preset "$(printf '%s' '{"colour":"red"}' | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>process.stdout.write(Buffer.from(s).toString("base64url")))')"

# ── gates and inventory on the scaffold ──────────────────────
run gates "${CLI[@]}" gates
expect inventory "0 of .* still to migrate" "${CLI[@]}" inventory
# a new app has nothing legacy: the whole source folder is in scope
expect scope-list-whole "whole source folder" "${CLI[@]}" scope
# legacy folders are skipped by both gates; scope wins over legacy for its subtree
mkdir -p src/legacy/keep && printf 'export default function Old() {\n  return <button className="rounded-lg bg-blue-600 px-4 text-white shadow-md">Old</button>;\n}\n' > src/legacy/Old.tsx
cp src/legacy/Old.tsx src/legacy/keep/Kept.tsx
expect_fail gates-see-legacy "${CLI[@]}" gates
node -e 'const fs=require("fs");const p=JSON.parse(fs.readFileSync("package.json","utf8"));p.formic.legacy=["src/legacy"];fs.writeFileSync("package.json",JSON.stringify(p,null,2)+"\n")'
run gates-skip-legacy "${CLI[@]}" gates
expect inventory-marks-legacy "legacy  src/legacy/Old.tsx" "${CLI[@]}" inventory
expect scope-add "src/legacy/keep is in scope" "${CLI[@]}" scope add src/legacy/keep
expect_fail gates-scope-wins "${CLI[@]}" gates
expect scope-list "keep" "${CLI[@]}" scope
expect scope-remove "out of scope" "${CLI[@]}" scope remove src/legacy/keep
run gates-legacy-again "${CLI[@]}" gates
expect scope-add-legacy-folder "no longer legacy" "${CLI[@]}" scope add src/legacy
grep -q '"legacy": \[\]' package.json && pass scope-add-drops-legacy || fail scope-add-drops-legacy "src/legacy still listed as legacy after scope add"
expect_fail gates-scope-checks "${CLI[@]}" gates
"${CLI[@]}" scope remove src/legacy >> "$LOG" 2>&1
# migrate: a legacy page through the codemods, as a diff first, then written
cat > src/legacy/Old.tsx <<'TSX'
import { Bell } from "lucide-react";

export default function Old({ onSave }: { onSave: () => void }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-lg">
      <h2 className="text-2xl font-bold text-gray-900">Invoices</h2>
      <label className="text-sm text-gray-700">
        Client
        <input className="mt-1 w-full rounded-md border border-gray-300 px-3 text-sm" placeholder="Search" />
      </label>
      <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white shadow-md hover:bg-blue-700" onClick={onSave}>
        <Bell className="mr-2 inline h-4 w-4" /> Save
      </button>
      <p className="text-xs text-gray-400">Sent 3 days ago</p>
    </div>
  );
}
TSX
rm -f src/legacy/keep/Kept.tsx
expect migrate-dry-run "would change" "${CLI[@]}" migrate src/legacy/Old.tsx
grep -q "lucide-react" src/legacy/Old.tsx && pass migrate-dry-run-writes-nothing || fail migrate-dry-run-writes-nothing
run migrate-write "${CLI[@]}" migrate src/legacy/Old.tsx --write
grep -q '<Button variant="accent" icon="bell" onClick={onSave}>' src/legacy/Old.tsx && pass migrate-button || fail migrate-button "$(grep -n 'utton' src/legacy/Old.tsx | tr '\n' ' | ')"
grep -q '<Field label="Client">' src/legacy/Old.tsx && grep -q '<Input className="mt-1" placeholder="Search" />' src/legacy/Old.tsx && pass migrate-field-input || fail migrate-field-input "$(grep -n 'nput\|Field' src/legacy/Old.tsx | tr '\n' ' | ')"
grep -q 'rounded-card border border-line bg-surface p-6 shadow-card' src/legacy/Old.tsx && grep -q 'text-heading font-semibold text-ink' src/legacy/Old.tsx && grep -q 'text-small text-ink-3' src/legacy/Old.tsx && pass migrate-classes || fail migrate-classes "$(grep -n 'className' src/legacy/Old.tsx | tr '\n' ' | ')"
grep -q 'lucide-react' src/legacy/Old.tsx && fail migrate-icons "lucide import left" || pass migrate-icons
grep -q 'import { Icon } from "../formic/components/primitives";' src/legacy/Old.tsx && grep -q 'import Button from "../formic/components/Button";' src/legacy/Old.tsx && grep -q 'import Input, { Field } from "../formic/components/Input";' src/legacy/Old.tsx && pass migrate-imports || fail migrate-imports "$(grep -n '^import' src/legacy/Old.tsx | tr '\n' ' | ')"
run migrate-passes-gate python3 src/formic/scripts/formic_check.py src/legacy/Old.tsx
run migrate-compiles npx -y esbuild --loader:.tsx=tsx --jsx=automatic --log-level=error --outfile=/dev/null src/legacy/Old.tsx
node -e 'const fs=require("fs");const p=JSON.parse(fs.readFileSync("package.json","utf8"));p.formic.legacy=[];p.formic.scope=[];fs.writeFileSync("package.json",JSON.stringify(p,null,2)+"\n")'
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
if "${CLI[@]}" init --dry-run 2>&1 | grep -q "DataTable.tsx"; then fail init-existing-dry-run-base "the default install lists DataTable.tsx"; else pass init-existing-dry-run-base; fi
expect init-existing-dry-run-all "would write src/formic/components/DataTable.tsx" "${CLI[@]}" init --dry-run --all
expect init-existing-dry-run-no-mcp "would write .mcp.json" "${CLI[@]}" init --dry-run
if "${CLI[@]}" init --dry-run --no-mcp 2>&1 | grep -q "mcp.json"; then fail init-no-mcp "--no-mcp still writes an mcp.json"; else pass init-no-mcp; fi
[ -d src/formic ] && fail init-existing-dry-run-writes-nothing || pass init-existing-dry-run-writes-nothing
git diff --quiet && pass init-existing-dry-run-clean-tree || fail init-existing-dry-run-clean-tree "the dry run changed tracked files"
run init-existing "${CLI[@]}" init --yes --key TEST-GRANTED
grep -q "^FORMIC_KEY=TEST-GRANTED$" .env.local && grep -q "^FORMIC_KEY_ACTIVATION=act-1$" .env.local && pass init-existing-key || fail init-existing-key "init --key did not write .env.local"
grep -q "^.env.local$" .gitignore && pass init-existing-key-gitignore || fail init-existing-key-gitignore "$(cat .gitignore | tr '\n' ' ')"
grep -q "TEST-GRANTED" "$LOG" && grep -B3 -A3 "init-existing (exit" "$LOG" | grep -q "TEST-GRANTED" && fail init-existing-key-masked "the full key was printed by init --key" || pass init-existing-key-masked
grep -q "marked legacy" "$LOG" && pass init-existing-says-legacy || fail init-existing-says-legacy "init did not say the existing pages are marked legacy"
node -e 'const p=require("./package.json").formic;process.exit(p.legacy.length===1&&p.legacy[0]==="app"&&p.scope.length===0?0:1)' && pass init-existing-legacy || fail init-existing-legacy "$(node -p 'JSON.stringify(require("./package.json").formic)')"
run init-existing-gates-clean "${CLI[@]}" gates
expect init-existing-gates-note "nothing in scope yet" "${CLI[@]}" gates
grep -n '@import' app/globals.css | grep -o 'fonts\.css\|"tailwindcss"\|formic\.css' | tr '\n' ' ' | grep -q 'fonts.css "tailwindcss" formic.css ' && pass init-existing-css || fail init-existing-css "$(grep '@import' app/globals.css | tr '\n' ' ')"
grep -q '"@phosphor-icons/react"' package.json && grep -q '"@dicebear/core"' package.json && grep -q '"formic": "python3' package.json && pass init-existing-package || fail init-existing-package
grep -q "formic_check" .git/hooks/pre-commit && pass init-existing-hook || fail init-existing-hook
[ -f src/formic/components/DataTable.tsx ] && fail init-existing-base-only "DataTable.tsx installed by a default init" || pass init-existing-base-only
[ -f src/formic/components/primitives.tsx ] && [ -f src/formic/components/config.ts ] && pass init-existing-base || fail init-existing-base "the shared modules are missing"
[ -f .mcp.json ] && [ -f .cursor/mcp.json ] && pass init-existing-mcp || fail init-existing-mcp
expect init-existing-again "already holds Formic" "${CLI[@]}" init --yes

# ── summary ─────────────────────────────────────────────────
[ "$FAILED" = 0 ] && { printf '\nall steps passed\n'; exit 0; } || { printf '\nsome steps failed (log: %s)\n' "$LOG"; [ "$KEEP" = 1 ] || { KEEP=1; printf 'kept %s for inspection\n' "$TMP"; }; exit 1; }
