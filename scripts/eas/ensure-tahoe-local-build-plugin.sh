#!/usr/bin/env bash
# Install + patch eas-cli-local-build-plugin for macOS Tahoe local iOS builds.
# Root cause: find-identity -v on EAS ephemeral keychain falsely returns 0
# identities (expo/eas-cli#3678 / PR #3679 — still open as of 2026-09).
# Keychain Access never pops up; Dist is imported unlocked into a temp keychain.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PLUGIN_DIR="$ROOT/.cache/eas-tahoe-local-build-plugin"
# Match global eas-cli's @expo/eas-build-job so job schema stays compatible.
EAS_JOB_VER="$(node -e "try{console.log(require('@expo/eas-build-job/package.json').version)}catch(e){}" 2>/dev/null || true)"
if [ -z "$EAS_JOB_VER" ]; then
  EAS_CLI_ROOT="$(dirname "$(dirname "$(command -v eas)")")/lib/node_modules/eas-cli"
  EAS_JOB_VER="$(node -e "console.log(require('$EAS_CLI_ROOT/node_modules/@expo/eas-build-job/package.json').version)" 2>/dev/null || true)"
fi
PLUGIN_VER="${EAS_LOCAL_BUILD_PLUGIN_VERSION:-${EAS_JOB_VER:-20.5.1}}"

echo "Installing eas-cli-local-build-plugin@$PLUGIN_VER into $PLUGIN_DIR"
mkdir -p "$PLUGIN_DIR"
cd "$PLUGIN_DIR"
if [ ! -f package.json ]; then
  npm init -y >/dev/null
fi
npm install "eas-cli-local-build-plugin@$PLUGIN_VER" --no-fund --no-audit

python3 <<'PY'
from pathlib import Path
import sys
root = Path("node_modules/@expo/build-tools")
if not root.is_dir():
    print("ERROR: @expo/build-tools missing under plugin install", file=sys.stderr)
    sys.exit(1)
old = "['find-identity', '-v', '-s',"
new = "['find-identity', '-s',"
n = 0
for p in root.rglob("keychain.js"):
    text = p.read_text()
    if old in text:
        p.write_text(text.replace(old, new))
        print(f"patched {p}")
        n += 1
    elif new in text:
        print(f"already patched {p}")
        n += 1
    else:
        print(f"NO MATCH {p}", file=sys.stderr)
if n == 0:
    sys.exit(2)
PY

BIN="$PLUGIN_DIR/node_modules/eas-cli-local-build-plugin/bin/run"
chmod +x "$BIN"
echo ""
echo "OK. build-local.sh will auto-use:"
echo "  EAS_LOCAL_BUILD_PLUGIN_PATH=$BIN"
echo "Or export that env yourself before eas build --local."
