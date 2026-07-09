#!/bin/bash

# BuildTrack - Build and Submit Script (REFACTORED)
# Calls build-local-FIXED.sh for building, then submits to TestFlight
# This ensures consistent build process across all scripts

set -e

echo "🚀 BuildTrack - Build and Submit to TestFlight (Refactored)"
echo "==========================================================="
echo ""

# Default values
PLATFORM="${1:-ios}"
PROFILE="${2:-production}"
CONFIRM="${3:-false}"

echo "📋 Configuration:"
echo "  Platform: $PLATFORM"
echo "  Profile: $PROFILE"
echo ""

PROJECT_ROOT="$(pwd)"
if [[ "$PROJECT_ROOT" == *" "* ]]; then
    echo "❌ Error: Project path contains spaces:"
    echo "   $PROJECT_ROOT"
    echo "   Move the repo to a no-space path, e.g. /Volumes/KooDrive/InsiteApp"
    exit 1
fi

# Determine which build-local script to use

BUILD_LOCAL_SCRIPT="./build-local.sh"


# Step 1: Build using build-local script
echo "🔨 Step 1/2: Building (calling $BUILD_LOCAL_SCRIPT)..."
echo "=========================================================="
echo ""

# Map profile for build-local
# build-and-submit uses "production" but build-local expects "production-local" for local builds
if [ "$PROFILE" = "production" ]; then
    BUILD_PROFILE="production-local"
else
    BUILD_PROFILE="$PROFILE"
fi

# Call build-local script
$BUILD_LOCAL_SCRIPT "$PLATFORM" "$BUILD_PROFILE"

# Check if build succeeded
if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Build failed. Aborting submission."
    exit 1
fi

echo ""
echo "✅ Build completed successfully!"
echo ""

# Locate the freshly built IPA
ARTIFACT_DIR="${EAS_LOCAL_BUILD_ARTIFACTS_DIR:-"$PROJECT_ROOT/.eas/artifacts"}"
LATEST_IPA=$(ls -t "$ARTIFACT_DIR"/*.ipa 2>/dev/null | head -1 || true)
if [ -z "$LATEST_IPA" ]; then
    echo "❌ Could not find the generated IPA in: $ARTIFACT_DIR"
    echo "   Make sure the local build finished and wrote an IPA into the artifacts directory."
    exit 1
fi

echo "📦 Using build artifact: $LATEST_IPA"
echo ""

# Step 2: Get build info for confirmation
echo "🔍 Verifying build..."
echo "----------------------------------------"

APP_VERSION=$(grep -o '"version"[[:space:]]*:[[:space:]]*"[^"]*"' app.json | head -1 | cut -d'"' -f4)
APP_BUILD=$(grep -o '"buildNumber"[[:space:]]*:[[:space:]]*"[0-9]*"' app.json | grep -o '[0-9]*' || echo "unknown")

echo "Built: Version $APP_VERSION (Build $APP_BUILD)"
echo ""

if [ "$CONFIRM" = "true" ]; then
    read -p "Submit this build to App Store Connect? (Y/n): " CONFIRM_SUBMIT
    if [[ "$CONFIRM_SUBMIT" =~ ^[Nn]$ ]]; then
        echo ""
        echo "⏹️  Submission cancelled by user"
        echo "   Build is ready but not submitted"
        exit 0
    fi
fi

echo ""

# Step 3: Submit to TestFlight
echo "📤 Step 2/2: Submitting to App Store Connect..."
echo "=========================================================="
echo "Uploading build to App Store Connect for TestFlight distribution..."
echo ""

npx eas submit --platform "$PLATFORM" --path "$LATEST_IPA" --profile "$PROFILE" --non-interactive
if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Submission to App Store Connect failed."
    echo ""
    echo "💡 Common causes:"
    echo "   1. Build number already used - Check App Store Connect"
    echo "   2. Network issues - Check your internet connection"
    echo "   3. Apple credentials - Verify in EAS"
    echo ""
    echo "🔍 To debug:"
    echo "   - Check build logs: npx eas build:list"
    echo "   - Verify App Store Connect: https://appstoreconnect.apple.com"
    echo "   - Check build number in App Store Connect matches: $APP_BUILD"
    exit 1
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo "✅ BUILD & SUBMISSION SUCCESSFUL!"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "📦 Build Information:"
echo "  ├─ App Version:    $APP_VERSION"
echo "  ├─ Build Number:   $APP_BUILD"
echo "  ├─ Display:        $APP_VERSION ($APP_BUILD)"
echo "  ├─ Platform:       $PLATFORM"
echo "  └─ Profile:        $PROFILE"
echo ""
echo "📤 Submission Status:"
echo "  ├─ Destination:    App Store Connect"
echo "  ├─ Distribution:   TestFlight"
echo "  └─ Status:         ✅ Uploaded successfully"
echo ""
echo "🎉 Your build is now processing in App Store Connect!"
echo ""
echo "⏱️  Next Steps (Processing takes ~5-10 minutes):"
echo "  1. 🔗 Open App Store Connect:"
echo "     https://appstoreconnect.apple.com"
echo ""
echo "  2. 📱 Check TestFlight tab for your app"
echo "     - Build will appear after processing"
echo "     - Status will change: Processing → Ready to Test"
echo "     - Verify build number shows: $APP_BUILD"
echo ""
echo "  3. 👥 Add internal/external testers (if needed)"
echo ""
echo "  4. 📧 Send test invitation to testers"
echo ""
echo "═══════════════════════════════════════════════════════"
echo "Version $APP_VERSION (Build $APP_BUILD) submitted successfully!"
echo "═══════════════════════════════════════════════════════"
echo ""
