#!/bin/bash

# BuildTrack - Increment Build Number Script (FIXED)
# Increments the build number in app.json and Info.plist
# Uses app.json as source of truth (not EAS API which is unreliable)

set -e

echo "🔢 Incrementing Build Number (Fixed Version)"
echo "=============================================="
echo ""

# Get current build number from app.json (source of truth)
CURRENT_BUILD_NUM=$(grep -o '"buildNumber"[[:space:]]*:[[:space:]]*"[0-9]*"' app.json | grep -o '[0-9]*' || echo "0")

if [ "$CURRENT_BUILD_NUM" = "0" ]; then
    echo "❌ Error: Could not find buildNumber in app.json"
    echo "   Please ensure app.json has: \"buildNumber\": \"XX\" in the ios section"
    exit 1
fi

echo "Current build number: $CURRENT_BUILD_NUM"
echo ""

# Increment build number
NEW_BUILD_NUM=$((CURRENT_BUILD_NUM + 1))
echo "Incrementing: $CURRENT_BUILD_NUM → $NEW_BUILD_NUM"
echo ""

# Update app.json with new build number
if grep -q '"buildNumber"' app.json; then
    # Update existing buildNumber
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/\"buildNumber\"[[:space:]]*:[[:space:]]*\"[0-9]*\"/\"buildNumber\": \"$NEW_BUILD_NUM\"/" app.json
    else
        # Linux
        sed -i "s/\"buildNumber\"[[:space:]]*:[[:space:]]*\"[0-9]*\"/\"buildNumber\": \"$NEW_BUILD_NUM\"/" app.json
    fi
    echo "✅ Updated app.json → buildNumber: $NEW_BUILD_NUM"
else
    echo "❌ Error: buildNumber field not found in app.json"
    exit 1
fi

# Update Info.plist if it exists
if [ -f "ios/BuildTrack/Info.plist" ]; then
    /usr/libexec/PlistBuddy -c "Set :CFBundleVersion $NEW_BUILD_NUM" ios/BuildTrack/Info.plist 2>/dev/null || true
    echo "✅ Updated Info.plist → CFBundleVersion: $NEW_BUILD_NUM"
else
    echo "⚠️  Info.plist not found (will be generated during build)"
fi

echo ""
echo "🎉 Build number incremented to $NEW_BUILD_NUM!"
echo ""
echo "📋 Summary:"
echo "  Old build: $CURRENT_BUILD_NUM"
echo "  New build: $NEW_BUILD_NUM"
echo ""
echo "💡 Next steps:"
echo "   - Build locally: ./build-local-FIXED.sh ios production"
echo "   - Or build & submit: ./build-and-submit-FIXED.sh ios production"
echo ""

