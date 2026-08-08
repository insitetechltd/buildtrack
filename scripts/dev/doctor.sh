#!/usr/bin/env bash
# InsiteApp machine doctor — prove local readiness before Maestro/release claims.
set -u -o pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

PASS=0
FAIL=0
WARN=0

ok()   { PASS=$((PASS+1)); printf 'PASS  %s\n' "$1"; }
bad()  { FAIL=$((FAIL+1)); printf 'FAIL  %s\n' "$1"; }
warn() { WARN=$((WARN+1)); printf 'WARN  %s\n' "$1"; }

env_present() {
  local key="$1"
  local file="$2"
  if [ -n "${!key:-}" ]; then
    return 0
  fi
  if [ -f "$file" ] && grep -E -q "^[[:space:]]*${key}=" "$file"; then
    local val
    val="$(grep -E "^[[:space:]]*${key}=" "$file" | head -n1 | cut -d= -f2- | tr -d '"' | tr -d "'" | tr -d '[:space:]')"
    [ -n "$val" ]
    return $?
  fi
  return 1
}

echo "=== InsiteApp doctor ==="
echo "root: $ROOT"
echo

# Node / npm
if command -v node >/dev/null 2>&1; then
  NODE_V="$(node -v | tr -d 'v')"
  NODE_MAJOR="${NODE_V%%.*}"
  if [ "$NODE_MAJOR" -ge 20 ]; then ok "node v$NODE_V (>=20)"; else bad "node v$NODE_V (need >=20)"; fi
else
  bad "node not found"
fi

if command -v npm >/dev/null 2>&1; then ok "npm $(npm -v)"; else bad "npm not found"; fi
[ -d node_modules ] && ok "node_modules present" || warn "node_modules missing — run npm install --legacy-peer-deps"
[ -f package.json ] && ok "package.json present" || bad "package.json missing"
[ -f app.json ] && ok "app.json present" || bad "app.json missing"
[ -f eas.json ] && ok "eas.json present" || warn "eas.json missing"

# Env presence only (never print values)
ENV_FILE=".env"
if [ ! -f "$ENV_FILE" ]; then
  warn "no .env file"
else
  ok ".env present"
fi

if env_present EXPO_PUBLIC_SUPABASE_URL "${ENV_FILE:-/dev/null}"; then
  ok "EXPO_PUBLIC_SUPABASE_URL set (presence only)"
else
  bad "EXPO_PUBLIC_SUPABASE_URL missing"
fi

if env_present EXPO_PUBLIC_SUPABASE_ANON_KEY "${ENV_FILE:-/dev/null}"; then
  ok "EXPO_PUBLIC_SUPABASE_ANON_KEY set (presence only)"
else
  bad "EXPO_PUBLIC_SUPABASE_ANON_KEY missing"
fi

# Xcode / simctl (macOS)
if command -v xcrun >/dev/null 2>&1; then
  ok "xcrun present"
  if xcrun simctl list devices available >/dev/null 2>&1; then
    ok "simctl available"
  else
    warn "simctl list failed — Xcode/simulator may need setup"
  fi
else
  warn "xcrun missing — iOS simulator / Maestro path unavailable"
fi

# Maestro
MAESTRO_BIN=""
if command -v maestro >/dev/null 2>&1; then
  MAESTRO_BIN="$(command -v maestro)"
elif [ -x "$HOME/.maestro/bin/maestro" ]; then
  MAESTRO_BIN="$HOME/.maestro/bin/maestro"
fi
if [ -n "$MAESTRO_BIN" ]; then
  VER="$("$MAESTRO_BIN" --version 2>/dev/null | head -n1 || true)"
  ok "maestro CLI: $MAESTRO_BIN ${VER:+($VER)}"
else
  warn "maestro CLI missing — run npm run maestro:install before L3"
fi

[ -x scripts/maestro/run-local.sh ] && ok "scripts/maestro/run-local.sh executable" || warn "run-local.sh missing/not executable"

# EAS (advisory)
if command -v eas >/dev/null 2>&1; then
  ok "eas CLI present"
else
  warn "eas CLI missing — needed for cloud builds/submit"
fi

# Cursor harness overlay
[ -d .cursor/rules ] && ok ".cursor/rules present" || bad ".cursor/rules missing"
[ -f .cursor/skills/insite-dev/SKILL.md ] && ok "insite-dev skill present" || warn "insite-dev skill missing"
[ -d .trae ] && warn ".trae/ still present (legacy — Cursor rules are SoT)"

echo
echo "=== summary ==="
echo "pass=$PASS warn=$WARN fail=$FAIL"
if [ "$FAIL" -gt 0 ]; then
  echo "DOCTOR_FAILED"
  exit 1
fi
echo "DOCTOR_OK"
exit 0
