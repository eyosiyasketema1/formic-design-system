#!/usr/bin/env bash
# Formic AI Design System — project installer
#
#   curl -fsSL https://formicai.dev/install.sh | bash
#   curl -fsSL https://formicai.dev/install.sh | bash -s -- app/formic   # custom folder
#
# Run it from the root of YOUR project. It copies the system in and writes
# the instruction files every AI coding tool reads, so the agent builds with
# Formic instead of inventing generic Tailwind. Safe to re-run: it refreshes
# styles/ and components/ and leaves your own files alone.
set -euo pipefail

REPO="https://github.com/eyosiyasketema1/formic-design-system.git"
DEST="${1:-src/formic}"
DEST="${DEST%/}"

say()  { printf '  \033[32m✓\033[0m %s\n' "$1"; }
skip() { printf '  \033[90m–\033[0m %s\n' "$1"; }
die()  { printf '  \033[31m✗\033[0m %s\n' "$1" >&2; exit 1; }

command -v git >/dev/null 2>&1 || die "git is required (https://git-scm.com)"
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

# ── 6. What is left for a human ────────────────────────────
NEED_TABLER=1
if [ -f package.json ] && grep -q '"@tabler/icons-react"' package.json; then NEED_TABLER=0; fi
printf '\nNext, by hand:\n'
[ "$NEED_TABLER" = 1 ] && printf '  • npm install @tabler/icons-react        # the one peer dependency besides React\n'
printf '  • In your global CSS (Tailwind v4), after @import "tailwindcss":\n'
printf '       @import "<relative path to>/%s/styles/tokens.css";\n' "$DEST"
printf '       @import "<relative path to>/%s/styles/themes.css";         /* optional palettes */\n' "$DEST"
printf '       @import "<relative path to>/%s/styles/tailwind-theme.css";\n' "$DEST"
printf '  • Open your agent and start with:\n'
printf '       "Use Formic (%s). Read AGENTS.md first, then build ..."\n\n' "$DEST"
