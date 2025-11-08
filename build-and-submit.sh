#!/bin/bash

# BuildTrack - Build and Submit Script
# Builds iOS app locally (EAS auto-increments version) and submits to TestFlight

set -e

echo "🚀 BuildTrack - Build and Submit to TestFlight"
echo "=============================================="
echo ""

# Default values
PLATFORM="${1:-ios}"
PROFILE="${2:-production}"

echo "📋 Configuration:"
echo "  Platform: $PLATFORM"
echo "  Profile: $PROFILE"
echo ""

# Note about auto-increment
echo "ℹ️  Note: EAS auto-increment is enabled in eas.json"
echo "   Build number will be automatically incremented during build"
echo ""

# Step 1: Build locally (EAS auto-increments during this step)
echo "🔨 Step 1/2: Building locally..."
echo "----------------------------------------"
echo "Build will auto-increment version number..."
echo ""
npx eas build --platform "$PLATFORM" --profile "$PROFILE" --local --non-interactive

# Check if build succeeded
if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Build failed. Aborting submission."
    exit 1
fi

echo ""
echo "✅ Build completed successfully!"
echo ""

# Get version from app.json
if [ -f "app.json" ]; then
    APP_VERSION=$(grep -o '"version"[[:space:]]*:[[:space:]]*"[^"]*"' app.json | head -1 | cut -d'"' -f4)
fi
echo ""

# Step 2: Submit to TestFlight
echo "📤 Step 2/2: Submitting to App Store Connect..."
echo "----------------------------------------"
echo "Uploading build to App Store Connect for TestFlight distribution..."
echo ""

# Run submission and capture output
SUBMIT_OUTPUT=$(npx eas submit --platform "$PLATFORM" --latest --profile "$PROFILE" --non-interactive 2>&1)
SUBMIT_EXIT_CODE=$?

# Display the output
echo "$SUBMIT_OUTPUT"

# Check if submission succeeded
if [ $SUBMIT_EXIT_CODE -ne 0 ]; then
    echo ""
    echo "❌ Submission to App Store Connect failed."
    echo ""
    echo "💡 Common causes:"
    echo "   1. Network issues - Check your internet connection"
    echo "   2. Apple credentials - Verify in EAS"
    echo "   3. Build already submitted - This is a new build, shouldn't happen"
    echo ""
    echo "🔍 To debug:"
    echo "   - Check build logs: npx eas build:list"
    echo "   - Verify App Store Connect: https://appstoreconnect.apple.com"
    exit 1
fi

# Check if submission was actually successful
if echo "$SUBMIT_OUTPUT" | grep -q "Successfully uploaded"; then
    echo ""
    echo "✅ Successfully submitted to TestFlight!"
elif echo "$SUBMIT_OUTPUT" | grep -q "Submission complete"; then
    echo ""
    echo "✅ Submission to TestFlight complete!"
fi

echo ""
echo "═══════════════════════════════════════════════════════"
echo "✅ BUILD & SUBMISSION SUCCESSFUL!"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "📦 Build Information:"
echo "  ├─ App Version:    ${APP_VERSION:-Check App Store Connect}"
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
echo "     - Build number will be visible there"
echo ""
echo "  3. 👥 Add internal/external testers (if needed)"
echo ""
echo "  4. 📧 Send test invitation to testers"
echo ""
echo "═══════════════════════════════════════════════════════"
echo "Version ${APP_VERSION:-unknown} - Check App Store Connect for build number"
echo "═══════════════════════════════════════════════════════"
echo ""
