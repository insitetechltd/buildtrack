#!/bin/bash

# BuildTrack - Increment Build Number Script
# Increments the build number in app.json and Info.plist

set -e

echo "🔢 Incrementing Build Number"
echo "=============================="
echo ""

# Get the last build number from EAS
echo "Fetching last build info from EAS..."
LAST_BUILD=$(npx eas build:list --platform ios --limit 1 --json --non-interactive 2>/dev/null | head -1)

if [ -z "$LAST_BUILD" ]; then
    echo "⚠️  Could not fetch last build from EAS."
    # Try to get from app.json
    CURRENT_BUILD_NUM=$(grep -o '"buildNumber"[[:space:]]*:[[:space:]]*"[0-9]*"' app.json | grep -o '[0-9]*' || echo "0")
    if [ "$CURRENT_BUILD_NUM" = "0" ]; then
        # Try Info.plist
        CURRENT_BUILD_NUM=$(/usr/libexec/PlistBuddy -c "Print :CFBundleVersion" ios/BuildTrack/Info.plist 2>/dev/null || echo "1")
    fi
    echo "Using current build number: $CURRENT_BUILD_NUM"
else
    CURRENT_BUILD_NUM=$(echo "$LAST_BUILD" | grep -o '"buildNumber":"[0-9]*"' | grep -o '[0-9]*' || echo "1")
    echo "Last EAS build number: $CURRENT_BUILD_NUM"
fi

# Increment build number
NEW_BUILD_NUM=$((CURRENT_BUILD_NUM + 1))
echo ""
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
    # Add buildNumber field to ios section
    echo "ℹ️  Adding buildNumber field to app.json"
    # This is a simplified approach - manual edit may be needed
    echo "   Please manually add \"buildNumber\": \"$NEW_BUILD_NUM\" to ios section in app.json"
fi

# Update Info.plist if it exists
if [ -f "ios/BuildTrack/Info.plist" ]; then
    /usr/libexec/PlistBuddy -c "Set :CFBundleVersion $NEW_BUILD_NUM" ios/BuildTrack/Info.plist 2>/dev/null || true
    echo "✅ Updated Info.plist → CFBundleVersion: $NEW_BUILD_NUM"
else
    echo "⚠️  Info.plist not found (run npx expo prebuild first)"
fi

echo ""
echo "🎉 Build number incremented to $NEW_BUILD_NUM!"
echo ""
echo "💡 Next steps:"
echo "   - Build: ./build-local.sh production ios"
echo "   - Or build & submit: ./build-and-submit.sh ios production"
echo ""

