#!/bin/bash
# HQ daily Internal TestFlight — same DEV law as Taskr ./build-and-submit.sh ios
#   default / `dev`  → EAS environment `preview` → DEV backend
#   `production`     → refused (HQ is never App Store)

set -e

PLATFORM="${1:-ios}"
PROFILE="${2:-dev}"

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

if [ "$PROFILE" = "production" ] || [ "$PROFILE" = "production-local" ]; then
  echo "❌ HQ has no App Store / EAS production path."
  echo "   Daily DEV Internal TF:  ./build-and-submit.sh ios"
  echo "                        or ./build-and-submit.sh ios dev"
  exit 1
fi

if [ "$PROFILE" != "dev" ]; then
  echo "❌ Unknown HQ profile: $PROFILE"
  echo "   Use:  dev  (Internal TestFlight → EAS preview → DEV)"
  exit 1
fi

if [ "$PLATFORM" != "ios" ]; then
  echo "❌ HQ TestFlight is iOS-only. Got: $PLATFORM"
  exit 1
fi

echo "🚀 HQ — DEV Internal TestFlight"
echo "================================"
echo "  EAS env: preview → DEV backend"
echo "  Destination: TestFlight Internal (com.insite.hq)"
echo "  Never App Store / External TF"
echo ""

if [ -f ../../.env ]; then
  echo "Loading Apple credentials from repo .env..."
  eval "$(grep -v '^#' ../../.env | grep -E '^EXPO_APPLE' | sed 's/^/export /')"
fi

if [ -z "${EXPO_ASC_API_KEY_PATH:-}" ]; then
  eval "$(python3 - <<'PY'
import json
from pathlib import Path
eas = json.loads(Path("eas.json").read_text())
ios = eas.get("submit", {}).get("dev", {}).get("ios", {})
key_path = ios.get("ascApiKeyPath")
if key_path and Path(key_path).is_file():
    print(f'export EXPO_ASC_API_KEY_PATH={json.dumps(str(Path(key_path).resolve()))}')
    print(f'export EXPO_ASC_KEY_ID={json.dumps(ios.get("ascApiKeyId") or "")}')
    print(f'export EXPO_ASC_ISSUER_ID={json.dumps(ios.get("ascApiKeyIssuerId") or "")}')
PY
)"
fi
if [ -z "${EXPO_APPLE_TEAM_TYPE:-}" ]; then
  export EXPO_APPLE_TEAM_TYPE="COMPANY_OR_ORGANIZATION"
fi

CURRENT_USER=$(npx eas whoami 2>/dev/null | head -n 1)
if [ -z "$CURRENT_USER" ]; then
  echo "❌ Error: Not logged in to EAS"
  echo "   Please run: npx eas login"
  exit 1
fi
echo "✅ Authenticated as: $CURRENT_USER"

LOCAL_BUILD_WORKDIR_BASE="${EAS_LOCAL_BUILD_WORKINGDIR:-"$ROOT/.eas/local-build"}"
LOCAL_BUILD_WORKDIR="$LOCAL_BUILD_WORKDIR_BASE/run-$(date +%s)"
LOCAL_BUILD_ARTIFACTS_DIR="${EAS_LOCAL_BUILD_ARTIFACTS_DIR:-"$ROOT/.eas/artifacts"}"
mkdir -p "$LOCAL_BUILD_WORKDIR" "$LOCAL_BUILD_ARTIFACTS_DIR"
export EAS_LOCAL_BUILD_WORKINGDIR="$LOCAL_BUILD_WORKDIR"
export EAS_LOCAL_BUILD_ARTIFACTS_DIR="$LOCAL_BUILD_ARTIFACTS_DIR"
export EAS_LOCAL_BUILD_SKIP_CLEANUP="${EAS_LOCAL_BUILD_SKIP_CLEANUP:-1}"
export EAS_BUILD_PROFILE="$PROFILE"

echo ""
echo "🔨 Step 1/2: Building (profile $PROFILE, --local)..."
echo "===================================================="
EAS_BUILD_ARGS=(--platform "$PLATFORM" --profile "$PROFILE" --local)
if [ "${EAS_ALLOW_INTERACTIVE:-}" != "1" ]; then
  EAS_BUILD_ARGS+=(--non-interactive)
fi
npx eas build "${EAS_BUILD_ARGS[@]}"

LATEST_IPA=$(ls -t "$LOCAL_BUILD_ARTIFACTS_DIR"/*.ipa 2>/dev/null | head -1 || true)
if [ -z "$LATEST_IPA" ]; then
  echo "❌ Could not find the generated IPA in: $LOCAL_BUILD_ARTIFACTS_DIR"
  exit 1
fi

echo ""
echo "📦 Using build artifact: $LATEST_IPA"
echo ""
echo "📤 Step 2/2: Submitting DEV Internal TestFlight..."
echo "===================================================="
npx eas submit --platform "$PLATFORM" --path "$LATEST_IPA" --profile "$PROFILE" --non-interactive

echo ""
echo "✅ HQ DEV Internal TestFlight uploaded."
echo "   ASC: https://appstoreconnect.apple.com/apps/6806629041/testflight/ios"
echo ""
