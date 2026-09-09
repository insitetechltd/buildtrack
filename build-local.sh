#!/bin/bash

# BuildTrack Local Build Script (FIXED)
# Properly increments build number before building
# Uses existing EAS login session + Apple credentials from .env

set -e

echo "🔨 BuildTrack Local Build (Fixed Version)"
echo "=========================================="
echo ""

# Arguments: PLATFORM PROFILE [SKIP_INCREMENT] [CHANGE_VERSION]
# Example (daily DEV TF): ./build-local.sh ios dev
# Example (App Store / PROD): ./build-local.sh ios production
# To change version: ./build-local.sh ios production false true
PLATFORM="${1:-ios}"
PROFILE="${2:-dev}"
SKIP_INCREMENT="${3:-false}"  # Default: bump shared iOS+Android build number
CHANGE_VERSION="${4:-false}"  # Set to true to prompt for version change

if [ "$PROFILE" = "production-local" ]; then
    echo "❌ Profile 'production-local' was renamed to 'dev'."
    echo "   Daily DEV TF:     ./build-local.sh ios dev"
    echo "   App Store / PROD: ./build-local.sh ios production"
    exit 1
fi

echo "📋 Configuration:"
echo "  Platform: $PLATFORM"
echo "  Profile: $PROFILE"
if [ "$PROFILE" = "dev" ]; then
    echo "  Intent:  DEV Internal TestFlight (EAS preview)"
elif [ "$PROFILE" = "production" ]; then
    echo "  Intent:  App Store / PROD (EAS production)"
fi
echo ""

# Step 1: Sync shared build number (iOS buildNumber + Android versionCode)
echo "📊 Step 1/3: Syncing shared build number..."
echo "----------------------------------------"
if [ "$SKIP_INCREMENT" = "true" ]; then
  bash ./scripts/sync-shared-build-number.sh --no-bump
else
  bash ./scripts/sync-shared-build-number.sh
fi
echo ""

if [ "$CHANGE_VERSION" = "true" ]; then
    CURRENT_VERSION=$(grep -o '"version"[[:space:]]*:[[:space:]]*"[^"]*"' app.json | head -1 | cut -d'"' -f4)
    echo "❓ Marketing version is $CURRENT_VERSION"
    echo "   Edit app.json manually if you need a new marketing version, then re-run."
    echo ""
fi

# Step 2: Verify credentials
echo "🔐 Step 2/3: Verifying credentials..."
echo "----------------------------------------"

# Load Apple credentials from .env if it exists
if [ -f .env ]; then
  echo "Loading Apple credentials from .env..."
  export $(grep -v '^#' .env | grep -E '^EXPO_APPLE' | xargs)
else
  echo "⚠️  Warning: .env file not found"
fi

# Verify authentication using existing EAS session
echo "Checking EAS authentication..."
CURRENT_USER=$(npx eas whoami 2>/dev/null | head -n 1)
if [ -z "$CURRENT_USER" ]; then
  echo "❌ Error: Not logged in to EAS"
  echo "   Please run: npx eas login"
  echo "   Then try again"
  exit 1
fi
echo "✅ Authenticated as: $CURRENT_USER"

# Verify Apple credentials are set
if [ -n "$EXPO_APPLE_ID" ] && [ -n "$EXPO_APPLE_TEAM_ID" ]; then
  echo "✅ Apple ID: $EXPO_APPLE_ID"
  echo "✅ Apple Team ID: $EXPO_APPLE_TEAM_ID"
else
  echo "⚠️  Warning: Apple credentials not found in .env"
  echo "   Build may prompt for Apple account information"
fi

# Non-interactive eas-cli cannot 2FA. Reuse the submit-profile ASC API key
# already in eas.json so iOS credential setup can finish without a TTY.
if [ -z "${EXPO_ASC_API_KEY_PATH:-}" ] && [ -f eas.json ]; then
  eval "$(python3 - <<'PY'
import json
from pathlib import Path
eas = json.loads(Path("eas.json").read_text())
ios = eas.get("submit", {}).get("production", {}).get("ios", {})
key_path = ios.get("ascApiKeyPath")
if key_path and Path(key_path).is_file():
    print(f'export EXPO_ASC_API_KEY_PATH={json.dumps(str(Path(key_path).resolve()))}')
    print(f'export EXPO_ASC_KEY_ID={json.dumps(ios.get("ascApiKeyId") or "")}')
    print(f'export EXPO_ASC_ISSUER_ID={json.dumps(ios.get("ascApiKeyIssuerId") or "")}')
PY
)"
fi
# Skip the "Select your Apple Team Type" prompt (store = App Store team, not Enterprise).
if [ -z "${EXPO_APPLE_TEAM_TYPE:-}" ]; then
  export EXPO_APPLE_TEAM_TYPE="COMPANY_OR_ORGANIZATION"
fi
if [ -n "${EXPO_ASC_KEY_ID:-}" ]; then
  echo "✅ ASC API key id: $EXPO_ASC_KEY_ID (for non-interactive iOS credentials)"
  echo "✅ Apple Team Type: $EXPO_APPLE_TEAM_TYPE"
fi
echo ""

# Step 3: Build
echo "🔨 Step 3/3: Building..."
echo "----------------------------------------"
echo "Starting local build..."
echo ""

# Get final version info for display (shared integer + platform/purpose postfix)
FINAL_VERSION=$(grep -o '"version"[[:space:]]*:[[:space:]]*"[^"]*"' app.json | head -1 | cut -d'"' -f4)
FINAL_BUILD=$(grep -o '"buildNumber"[[:space:]]*:[[:space:]]*"[0-9]*"' app.json | grep -o '[0-9]*' || echo "unknown")
case "$PLATFORM" in
  android) PLATFORM_TOKEN="a" ;;
  *) PLATFORM_TOKEN="i" ;;
esac
case "$PROFILE" in
  production) BUILD_CHANNEL="rc" ;;
  simulator) BUILD_CHANNEL="sim" ;;
  preview|dev) BUILD_CHANNEL="tf" ;;
  *) BUILD_CHANNEL="dev" ;;
esac
DISPLAY_LABEL="v${FINAL_VERSION} (${FINAL_BUILD}${PLATFORM_TOKEN}-${BUILD_CHANNEL})"

echo "Building: $DISPLAY_LABEL"
echo ""

PROJECT_ROOT="$(pwd)"
if [[ "$PROJECT_ROOT" == *" "* ]]; then
  echo "❌ Error: Project path contains spaces:"
  echo "   $PROJECT_ROOT"
  echo "   Move the repo to a no-space path, e.g. /Volumes/KooDrive/InsiteApp"
  exit 1
fi
LOCAL_BUILD_WORKDIR_BASE="${EAS_LOCAL_BUILD_WORKINGDIR:-"$PROJECT_ROOT/.eas/local-build"}"
LOCAL_BUILD_WORKDIR="$LOCAL_BUILD_WORKDIR_BASE/run-$(date +%s)"
LOCAL_BUILD_ARTIFACTS_DIR="${EAS_LOCAL_BUILD_ARTIFACTS_DIR:-"$PROJECT_ROOT/.eas/artifacts"}"

mkdir -p "$LOCAL_BUILD_WORKDIR"
mkdir -p "$LOCAL_BUILD_ARTIFACTS_DIR"

export EAS_LOCAL_BUILD_WORKINGDIR="$LOCAL_BUILD_WORKDIR"
export EAS_LOCAL_BUILD_ARTIFACTS_DIR="$LOCAL_BUILD_ARTIFACTS_DIR"
export EAS_LOCAL_BUILD_SKIP_CLEANUP="${EAS_LOCAL_BUILD_SKIP_CLEANUP:-1}"
export EAS_BUILD_PROFILE="$PROFILE"

EAS_BUILD_ARGS=(--platform "$PLATFORM" --profile "$PROFILE" --local)
# Default: non-interactive (agent/CI). Set EAS_ALLOW_INTERACTIVE=1 when a TTY
# can finish first-time Apple credential setup (expect wrapper or Terminal).
if [ "${EAS_ALLOW_INTERACTIVE:-}" != "1" ]; then
  EAS_BUILD_ARGS+=(--non-interactive)
fi
npx eas build "${EAS_BUILD_ARGS[@]}"

echo ""
echo "✅ Build completed successfully!"
echo ""
echo "📦 Build Information:"
echo "  ├─ Version: $FINAL_VERSION"
echo "  ├─ Build:   $FINAL_BUILD (shared iOS+Android integer)"
echo "  ├─ Display: $DISPLAY_LABEL"
echo "  ├─ Platform: $PLATFORM"
echo "  └─ Profile: $PROFILE"
echo ""
