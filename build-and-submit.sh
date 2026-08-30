#!/bin/bash

# BuildTrack - Build and Submit
#   default / `dev`  → daily Internal TestFlight (EAS preview = DEV backend)
#   `production`     → App Store / PROD release (Human Gate: CONFIRM=true)

set -e

PLATFORM="${1:-ios}"
PROFILE="${2:-dev}"
CONFIRM="${3:-false}"

PROJECT_ROOT="$(pwd)"
if [[ "$PROJECT_ROOT" == *" "* ]]; then
    echo "❌ Error: Project path contains spaces:"
    echo "   $PROJECT_ROOT"
    echo "   Move the repo to a no-space path, e.g. /Volumes/KooDrive/InsiteApp"
    exit 1
fi

# Legacy name — hard-cut to `dev`
if [ "$PROFILE" = "production-local" ]; then
    echo "❌ Profile 'production-local' was renamed to 'dev'."
    echo "   Daily Internal TF:  ./build-and-submit.sh ios dev"
    echo "   App Store / PROD:   ./build-and-submit.sh ios production true"
    exit 1
fi

if [ "$PROFILE" != "dev" ] && [ "$PROFILE" != "production" ]; then
    echo "❌ Unknown profile: $PROFILE"
    echo "   Use:  dev  (daily Internal TestFlight → DEV)"
    echo "     or: production  (App Store / PROD — requires CONFIRM=true)"
    exit 1
fi

if [ "$PROFILE" = "production" ] && [ "$CONFIRM" != "true" ]; then
    echo "❌ Refusing production (App Store / PROD) without confirm."
    echo "   Daily Internal TF (DEV):  ./build-and-submit.sh ios"
    echo "                          or ./build-and-submit.sh ios dev"
    echo "   Release path:             ./build-and-submit.sh ios production true"
    exit 1
fi

if [ "$PROFILE" = "dev" ]; then
    echo "🚀 BuildTrack — DEV Internal TestFlight"
    echo "======================================="
    echo "  EAS env: preview → DEV backend + Stripe test"
    echo "  Destination: TestFlight Internal"
else
    echo "🚀 BuildTrack — PRODUCTION / App Store release"
    echo "=============================================="
    echo "  EAS env: production → PROD backend + Stripe live"
    echo "  Destination: App Store Connect (release path)"
fi
echo ""
echo "📋 Configuration:"
echo "  Platform: $PLATFORM"
echo "  Profile:  $PROFILE"
echo ""

BUILD_LOCAL_SCRIPT="./build-local.sh"
BUILD_PROFILE="$PROFILE"

echo "🔨 Step 1/2: Building (calling $BUILD_LOCAL_SCRIPT)..."
echo "=========================================================="
echo ""

$BUILD_LOCAL_SCRIPT "$PLATFORM" "$BUILD_PROFILE"
if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Build failed. Aborting submission."
    exit 1
fi

echo ""
echo "✅ Build completed successfully!"
echo ""

ARTIFACT_DIR="${EAS_LOCAL_BUILD_ARTIFACTS_DIR:-"$PROJECT_ROOT/.eas/artifacts"}"
LATEST_IPA=$(ls -t "$ARTIFACT_DIR"/*.ipa 2>/dev/null | head -1 || true)
if [ -z "$LATEST_IPA" ]; then
    echo "❌ Could not find the generated IPA in: $ARTIFACT_DIR"
    echo "   Make sure the local build finished and wrote an IPA into the artifacts directory."
    exit 1
fi

echo "📦 Using build artifact: $LATEST_IPA"
echo ""

echo "🔍 Verifying build..."
echo "----------------------------------------"

APP_VERSION=$(grep -o '"version"[[:space:]]*:[[:space:]]*"[^"]*"' app.json | head -1 | cut -d'"' -f4)
APP_BUILD=$(grep -o '"buildNumber"[[:space:]]*:[[:space:]]*"[0-9]*"' app.json | grep -o '[0-9]*' || echo "unknown")

echo "Built: Version $APP_VERSION (Build $APP_BUILD)"
echo ""

if [ "$PROFILE" = "production" ]; then
    read -p "Submit this PRODUCTION / App Store build to App Store Connect? (Y/n): " CONFIRM_SUBMIT
    if [[ "$CONFIRM_SUBMIT" =~ ^[Nn]$ ]]; then
        echo ""
        echo "⏹️  Submission cancelled by user"
        echo "   Build is ready but not submitted"
        exit 0
    fi
fi

echo ""
echo "📤 Step 2/2: Submitting to App Store Connect..."
echo "=========================================================="
if [ "$PROFILE" = "dev" ]; then
    echo "Uploading DEV build for TestFlight Internal..."
else
    echo "Uploading PRODUCTION build to App Store Connect..."
fi
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
if [ "$PROFILE" = "dev" ]; then
    echo "  ├─ Distribution:   TestFlight Internal (DEV)"
else
    echo "  ├─ Distribution:   App Store / PROD release path"
fi
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
echo "═══════════════════════════════════════════════════════"
echo "Version $APP_VERSION (Build $APP_BUILD) submitted successfully!"
echo "═══════════════════════════════════════════════════════"
echo ""
