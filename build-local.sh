#!/bin/bash

# BuildTrack Local Build Script (FIXED)
# Properly increments build number before building
# Uses existing EAS login session + Apple credentials from .env

set -e

echo "🔨 BuildTrack Local Build (Fixed Version)"
echo "=========================================="
echo ""

# Arguments: PLATFORM PROFILE [SKIP_INCREMENT] [CHANGE_VERSION]
# Example: ./build-local.sh ios production
# To change version: ./build-local.sh ios production false true
PLATFORM="${1:-ios}"
PROFILE="${2:-production-local}"
SKIP_INCREMENT="${3:-true}"  # Default: EAS remote build number auto-increments
CHANGE_VERSION="${4:-false}"  # Set to true to prompt for version change

echo "📋 Configuration:"
echo "  Platform: $PLATFORM"
echo "  Profile: $PROFILE"
echo ""

# Step 1: Increment build number (unless skipped)
if [ "$SKIP_INCREMENT" != "true" ]; then
    echo "📊 Step 1/3: Checking version numbers..."
    echo "----------------------------------------"
    
    # Get current version and build from app.json
    CURRENT_VERSION=$(grep -o '"version"[[:space:]]*:[[:space:]]*"[^"]*"' app.json | head -1 | cut -d'"' -f4)
    CURRENT_BUILD=$(grep -o '"buildNumber"[[:space:]]*:[[:space:]]*"[0-9]*"' app.json | grep -o '[0-9]*' || echo "0")
    
    echo "Current: Version $CURRENT_VERSION (Build $CURRENT_BUILD)"
    echo ""
    
    # Only prompt if CHANGE_VERSION is true
    if [ "$CHANGE_VERSION" = "true" ]; then
        # Ask if version should be incremented
        echo "❓ Is this a new version with new features?"
        echo "   - If YES: You should increment the version number (e.g., 1.1.2 → 1.1.3)"
        echo "   - If NO (bug fix only): Keep version the same"
        echo ""
        read -p "Keep current version $CURRENT_VERSION? (Y/n): " KEEP_VERSION
        
        if [[ "$KEEP_VERSION" =~ ^[Nn]$ ]]; then
            echo ""
            echo "⚠️  Please manually edit app.json to update the version number"
            echo "   Then run this script again"
            exit 1
        fi
        
        echo ""
        echo "✅ Keeping version: $CURRENT_VERSION"
        echo ""
    else
        # Default: Keep version without prompting
        echo "✅ Keeping version: $CURRENT_VERSION (use 4th arg 'true' to change)"
        echo ""
    fi
    
    # Increment build number
    echo "🔢 Incrementing build number..."
    if [ -f "./increment-build-FIXED.sh" ]; then
        ./increment-build-FIXED.sh
    elif [ -f "./increment-build.sh" ]; then
        echo "⚠️  Using old increment-build.sh (may not work correctly)"
        ./increment-build.sh
    else
        echo "❌ Error: increment-build script not found"
        exit 1
    fi
    echo ""
else
    echo "⏭️  Skipping build number increment (already done)"
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
echo ""

# Step 3: Build
echo "🔨 Step 3/3: Building..."
echo "----------------------------------------"
echo "Starting local build..."
echo ""

# Get final version info for display
FINAL_VERSION=$(grep -o '"version"[[:space:]]*:[[:space:]]*"[^"]*"' app.json | head -1 | cut -d'"' -f4)
FINAL_BUILD=$(grep -o '"buildNumber"[[:space:]]*:[[:space:]]*"[0-9]*"' app.json | grep -o '[0-9]*' || echo "unknown")

echo "Building: Version $FINAL_VERSION (Build $FINAL_BUILD)"
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

npx eas build --platform "$PLATFORM" --profile "$PROFILE" --local --non-interactive

echo ""
echo "✅ Build completed successfully!"
echo ""
echo "📦 Build Information:"
echo "  ├─ Version: $FINAL_VERSION"
echo "  ├─ Build:   $FINAL_BUILD"
echo "  ├─ Display: $FINAL_VERSION ($FINAL_BUILD)"
echo "  ├─ Platform: $PLATFORM"
echo "  └─ Profile: $PROFILE"
echo ""
