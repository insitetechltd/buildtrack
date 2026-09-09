#!/usr/bin/env bash
# Sync a shared integer build number into app.json for BOTH platforms.
# Store IDs stay numeric. Display labels add platform + purpose:
#   v1.1.3 (248i-tf) / v1.1.3 (248a-rc)
#
# Usage:
#   bash scripts/sync-shared-build-number.sh           # NEXT = max(ios,android,eas)+1
#   bash scripts/sync-shared-build-number.sh --set 249 # force N
#   bash scripts/sync-shared-build-number.sh --dry-run
#   bash scripts/sync-shared-build-number.sh --no-bump # write max without +1
#
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP_JSON="$ROOT/app.json"
DRY_RUN=0
NO_BUMP=0
SET_N=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=1; shift ;;
    --no-bump) NO_BUMP=1; shift ;;
    --set)
      SET_N="${2:-}"
      if [[ -z "$SET_N" || ! "$SET_N" =~ ^[0-9]+$ ]]; then
        echo "❌ --set requires a positive integer"
        exit 1
      fi
      shift 2
      ;;
    -h|--help)
      sed -n '2,12p' "$0"
      exit 0
      ;;
    *)
      echo "❌ Unknown arg: $1"
      exit 1
      ;;
  esac
done

if [[ ! -f "$APP_JSON" ]]; then
  echo "❌ Missing $APP_JSON"
  exit 1
fi

cd "$ROOT"

LOCAL_LINE="$(python3 - <<'PY'
import json
from pathlib import Path
app = json.loads(Path("app.json").read_text())
expo = app.get("expo") or {}
ios_bn = str((expo.get("ios") or {}).get("buildNumber") or "0")
android_vc = (expo.get("android") or {}).get("versionCode")
version = str(expo.get("version") or "0.0.0")
ios_n = int("".join(ch for ch in ios_bn if ch.isdigit()) or "0")
try:
    android_n = int(android_vc) if android_vc is not None else 0
except (TypeError, ValueError):
    android_n = 0
print(f"{version}\t{ios_n}\t{android_n}")
PY
)"

MARKETING_VERSION="$(echo "$LOCAL_LINE" | cut -f1)"
LOCAL_IOS="$(echo "$LOCAL_LINE" | cut -f2)"
LOCAL_ANDROID="$(echo "$LOCAL_LINE" | cut -f3)"

EAS_IOS=0
EAS_ANDROID=0
# When appVersionSource=local, eas build:version:get is unavailable.
# Fall back to scanning local IPA Info.plist CFBundleVersion values.
ARTIFACT_MAX=0
if [[ -d "$ROOT/.eas/artifacts" ]]; then
  ARTIFACT_MAX="$(python3 - <<'PY'
import plistlib, subprocess, tempfile, zipfile
from pathlib import Path
root = Path(".eas/artifacts")
best = 0
for ipa in root.glob("*.ipa"):
    try:
        with zipfile.ZipFile(ipa) as zf:
            plist_name = next((n for n in zf.namelist() if n.endswith(".app/Info.plist")), None)
            if not plist_name:
                continue
            with zf.open(plist_name) as fh:
                data = plistlib.load(fh)
            bn = str(data.get("CFBundleVersion") or "0")
            n = int("".join(ch for ch in bn if ch.isdigit()) or "0")
            best = max(best, n)
    except Exception:
        continue
print(best)
PY
)"
fi

MAX_N="$LOCAL_IOS"
for candidate in "$LOCAL_ANDROID" "$EAS_IOS" "$EAS_ANDROID" "$ARTIFACT_MAX"; do
  if [[ "$candidate" -gt "$MAX_N" ]]; then
    MAX_N="$candidate"
  fi
done

if [[ -n "$SET_N" ]]; then
  NEXT="$SET_N"
elif [[ "$NO_BUMP" -eq 1 ]]; then
  NEXT="$MAX_N"
else
  NEXT=$((MAX_N + 1))
fi

echo "Shared build number sync"
echo "  marketing:     $MARKETING_VERSION"
echo "  local ios:     $LOCAL_IOS"
echo "  local android: $LOCAL_ANDROID"
echo "  eas ios:       $EAS_IOS (0 if appVersionSource=local)"
echo "  eas android:   $EAS_ANDROID"
echo "  artifact max:  $ARTIFACT_MAX"
echo "  max:           $MAX_N"
echo "  next:          $NEXT"
echo "  display iOS:   v${MARKETING_VERSION} (${NEXT}i-tf) / (${NEXT}i-rc) / (${NEXT}i-sim)"
echo "  display And:   v${MARKETING_VERSION} (${NEXT}a-tf) / (${NEXT}a-rc)"

if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "Dry run — app.json not modified."
  exit 0
fi

python3 - <<PY
import json
from pathlib import Path
path = Path("app.json")
app = json.loads(path.read_text())
expo = app.setdefault("expo", {})
ios = expo.setdefault("ios", {})
android = expo.setdefault("android", {})
next_n = int("$NEXT")
ios["buildNumber"] = str(next_n)
android["versionCode"] = next_n
path.write_text(json.dumps(app, indent=2) + "\n")
print(f"Wrote app.json → ios.buildNumber={next_n} android.versionCode={next_n}")
PY

echo "Note: eas.json appVersionSource=local — binary uses app.json (script is SoT)."
echo "✅ Shared build number is $NEXT"
