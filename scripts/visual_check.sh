#!/usr/bin/env bash
# Visual-regression check around a migration (Phase 3 of PLAN-adoption.md):
# screenshots of an app's routes before and after `formicai migrate`, compared
# pixel by pixel. Drives scripts/visual_check.mjs and finds it a browser.
#
#   scripts/visual_check.sh <app-dir> before  [--routes /,/#/2] [--no-build]
#   scripts/visual_check.sh <app-dir> after   [--routes …] [--no-build]
#   scripts/visual_check.sh <app-dir> compare [--threshold 1.0] [--threshold-dark N]
#
# Playwright is a test-time tool: it is used from the app's node_modules when
# the app has it, otherwise installed once into $FORMIC_VISUAL_HOME (default
# ~/.cache/formic-visual), never into this repo. The browser is Playwright's
# chromium-headless-shell (~110MB, `npx playwright install`); on a machine
# where it cannot be installed or launched (CI without the system libraries:
# add `npx playwright install --with-deps chromium-headless-shell` to the
# job) the script prints "skipped: no browser" and exits 3, so a caller can
# pass the step with that note. Exit: 0 pass, 1 fail, 2 usage, 3 no browser.
set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
APP="${1:-}"; MODE="${2:-}"
case "$MODE" in before|after|compare) ;; *) printf 'usage: %s <app-dir> <before|after|compare> [--routes r1,r2] [--threshold N] [--no-build]\n' "$0" >&2; exit 2 ;; esac
[ -f "$APP/package.json" ] || { printf '%s: no package.json\n' "$APP" >&2; exit 2; }
shift 2

MJS="$HERE/visual_check.mjs"
PW_VERSION="${FORMIC_VISUAL_PLAYWRIGHT_VERSION:-1.63.0}"

# ── where playwright lives ──────────────────────────────────
if [ -d "$APP/node_modules/playwright" ]; then
  export FORMIC_VISUAL_PLAYWRIGHT="$APP"
else
  HOME_DIR="${FORMIC_VISUAL_HOME:-$HOME/.cache/formic-visual}"
  export FORMIC_VISUAL_PLAYWRIGHT="$HOME_DIR"
  if [ ! -d "$HOME_DIR/node_modules/playwright" ]; then
    mkdir -p "$HOME_DIR"
    [ -f "$HOME_DIR/package.json" ] || printf '{ "name": "formic-visual", "private": true, "version": "0.0.0" }\n' > "$HOME_DIR/package.json"
    printf 'visual: installing playwright@%s into %s (test-time only, not in the repo)…\n' "$PW_VERSION" "$HOME_DIR"
    if ! (cd "$HOME_DIR" && npm install --no-audit --no-fund --silent "playwright@$PW_VERSION" > "$HOME_DIR/install.log" 2>&1); then
      printf 'visual: skipped: no browser (npm install playwright failed; see %s/install.log)\n' "$HOME_DIR"; exit 3
    fi
  fi
fi

# ── the browser: install once, then prove it launches ───────
# compare needs no browser; before/after do
if [ "$MODE" != compare ]; then
  if ! node "$MJS" "$APP" probe > /dev/null 2>&1; then
    WITH_DEPS=""; [ "${FORMIC_VISUAL_WITH_DEPS:-0}" = 1 ] && WITH_DEPS="--with-deps"
    printf 'visual: npx playwright install %schromium-headless-shell…\n' "${WITH_DEPS:+$WITH_DEPS }"
    (cd "$FORMIC_VISUAL_PLAYWRIGHT" && npx playwright install $WITH_DEPS chromium-headless-shell > "${TMPDIR:-/tmp}/formic-visual-install.log" 2>&1) || true
    if ! out="$(node "$MJS" "$APP" probe 2>&1)"; then
      printf 'visual: skipped: no browser (%s)\n' "$(printf '%s' "$out" | tail -1 | sed 's/^visual: //')"; exit 3
    fi
  fi
fi

node "$MJS" "$APP" "$MODE" "$@"
