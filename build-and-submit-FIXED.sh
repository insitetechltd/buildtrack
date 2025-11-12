#!/bin/bash

# BuildTrack - Build and Submit Script (FIXED)
# Properly increments build number, builds, and submits to TestFlight

set -e

echo "🚀 BuildTrack - Build and Submit to TestFlight (Fixed Version)"
echo "=============================================================="
echo ""

# Default values
PLATFORM="${1:-ios}"
PROFILE="${2:-production}"

echo "📋 Configuration:"
echo "  Platform: $PLATFORM"
echo "  Profile: $PROFILE"
echo ""

# Step 1: Increment build number
echo "📊 Step 1/4: Managing version numbers..."
echo "----------------------------------------"

# Get current version and build from app.json
CURRENT_VERSION=$(grep -o '"version"[[:space:]]*:[[:space:]]*"[^"]*"' app.json | head -1 | cut -d'"' -f4)
CURRENT_BUILD=$(grep -o '"buildNumber"[[:space:]]*:[[:space:]]*"[0-9]*"' app.json | grep -o '[0-9]*' || echo "0")

echo "Current: Version $CURRENT_VERSION (Build $CURRENT_BUILD)"
echo ""

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

# Get updated build number
NEW_BUILD=$(grep -o '"buildNumber"[[:space:]]*:[[:space:]]*"[0-9]*"' app.json | grep -o '[0-9]*' || echo "unknown")
echo "✅ Build number updated: $CURRENT_BUILD → $NEW_BUILD"
echo ""

# Step 2: Build locally
echo "🔨 Step 2/4: Building locally..."
echo "----------------------------------------"
echo "Building: Version $CURRENT_VERSION (Build $NEW_BUILD)"
echo ""

# Load credentials
if [ -f .env ]; then
  export $(grep -v '^#' .env | grep -E '^EXPO_APPLE' | xargs)
fi

# Build
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

# Step 3: Verify build
echo "🔍 Step 3/4: Verifying build..."
echo "----------------------------------------"

# Get version from app.json
APP_VERSION=$(grep -o '"version"[[:space:]]*:[[:space:]]*"[^"]*"' app.json | head -1 | cut -d'"' -f4)
APP_BUILD=$(grep -o '"buildNumber"[[:space:]]*:[[:space:]]*"[0-9]*"' app.json | grep -o '[0-9]*' || echo "unknown")

echo "Built: Version $APP_VERSION (Build $APP_BUILD)"
echo ""

# Confirm submission
read -p "Submit this build to App Store Connect? (Y/n): " CONFIRM_SUBMIT

if [[ "$CONFIRM_SUBMIT" =~ ^[Nn]$ ]]; then
    echo ""
    echo "⏹️  Submission cancelled by user"
    echo "   Build is ready but not submitted"
    exit 0
fi

echo ""

# Step 4: Submit to TestFlight
echo "📤 Step 4/4: Submitting to App Store Connect..."
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

