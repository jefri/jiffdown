#!/usr/bin/env bash
#
# Feature test for the marked 4.3.0 -> 18.0.4 upgrade.
#
# Encodes the four metrics from
# docs/developer/2026-06-01-A-update-marked/design.md as a single
# pass/fail command. The upgrade is "done" when this script exits 0.
#
# Run from the project root:  ./scripts/verify-marked-upgrade.sh

set -u

cd "$(dirname "$0")/.."

EXPECTED_MARKED="18.0.4"
fail=0

note() { printf '  %s\n' "$1"; }
metric() { printf '\n[%s] %s\n' "$1" "$2"; }
pass() { printf 'PASS: %s\n' "$1"; }
miss() { printf 'FAIL: %s\n' "$1"; fail=1; }

# --- Metric 1: node --test reports 26 passing, 0 failing -------------------
# Expected count was 18 before the migration, when src/reference.test.mjs and
# test/golden.mjs both crashed at import (the Node 24 `assert`->`with` JSON
# breakage) and node counted each crashing file as a single test. With the
# import fixed those files register their real sub-tests: test/golden.mjs goes
# 1->9 (one per golden/* dir) and src/reference.test.mjs goes file->1, +8 net.
# The TAP reporter is forced so the `# pass`/`# fail` summary is emitted
# regardless of whether stdout is a TTY (node 24's default reporter prints
# `ℹ pass` to a pipe, which this parser cannot read).
EXPECTED_PASS=26
metric 1 "test suite is fully green"
test_output="$(node --test --test-reporter=tap 2>&1)"
pass_count="$(printf '%s\n' "$test_output" | sed -n 's/^# pass \([0-9]*\)$/\1/p' | tail -1)"
fail_count="$(printf '%s\n' "$test_output" | sed -n 's/^# fail \([0-9]*\)$/\1/p' | tail -1)"
note "pass=${pass_count:-?} fail=${fail_count:-?}"
if [ "${pass_count:-0}" -eq "$EXPECTED_PASS" ] && [ "${fail_count:-1}" -eq 0 ]; then
  pass "node --test reports ${EXPECTED_PASS} passing, 0 failing"
else
  miss "node --test must report ${EXPECTED_PASS} passing, 0 failing (got pass=${pass_count:-?}, fail=${fail_count:-?})"
fi

# --- Metric 3: declared, installed, and coded versions agree at 18.0.4 -----
metric 3 "declared / installed version agree at ${EXPECTED_MARKED}; no removed API"
declared="$(node -p "require('./package.json').dependencies.marked" 2>/dev/null)"
note "package.json declares marked ${declared}"
case "$declared" in
  "^${EXPECTED_MARKED}") pass "package.json declares marked ^${EXPECTED_MARKED}" ;;
  *) miss "package.json must declare marked ^${EXPECTED_MARKED} (got ${declared})" ;;
esac

installed="$(node -p "require('./node_modules/marked/package.json').version" 2>/dev/null)"
note "installed marked ${installed}"
case "$installed" in
  18.*) pass "installed marked is a v18 (${installed})" ;;
  *) miss "installed marked must be v18 (got ${installed})" ;;
esac

if grep -rn "walkTokens *=" src/ index.mjs >/dev/null 2>&1; then
  miss "no marked.walkTokens reassignment may remain (removed API)"
  grep -rn "walkTokens *=" src/ index.mjs | sed 's/^/  /'
else
  pass "no marked.walkTokens reassignment remains"
fi

# --- Metric 4: dependency tree clean; no @types/marked, no highlight.js ----
metric 4 "dependency tree clean"
if npm ls >/dev/null 2>&1; then
  pass "npm ls is clean"
else
  miss "npm ls reports an unclean dependency tree"
fi

if node -p "require('./package.json').devDependencies?.['@types/marked'] ?? ''" 2>/dev/null | grep -q .; then
  miss "@types/marked must not be a dependency"
else
  pass "no @types/marked dependency"
fi

if node -p "require('./package.json').dependencies?.['highlight.js'] ?? ''" 2>/dev/null | grep -q .; then
  miss "highlight.js must not be a dependency"
else
  pass "no highlight.js dependency"
fi

# --- Verdict ---------------------------------------------------------------
printf '\n'
if [ "$fail" -eq 0 ]; then
  printf 'UPGRADE VERIFIED: all metrics green.\n'
else
  printf 'UPGRADE INCOMPLETE: one or more metrics failed.\n'
fi
exit "$fail"
