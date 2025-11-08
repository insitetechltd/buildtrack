#!/bin/bash

# BuildTrack - Icon Sync Script
# Ensures app icon is synced from assets/icon.png to native projects

set -e

echo "🎨 Syncing App Icons"
echo "===================="
echo ""

ICON_SOURCE="./assets/icon.png"
IOS_ICON_DEST="./ios/BuildTrack/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png"

# Check if source icon exists
if [ ! -f "$ICON_SOURCE" ]; then
    echo "❌ Error: Icon not found at $ICON_SOURCE"
    exit 1
fi

# Check icon dimensions
echo "📏 Checking icon dimensions..."
DIMENSIONS=$(file "$ICON_SOURCE" | grep -o '[0-9]* x [0-9]*' | head -1)
echo "   Source icon: $DIMENSIONS"

if [[ ! "$DIMENSIONS" =~ "1024 x 1024" ]]; then
    echo "⚠️  Warning: Icon should be 1024x1024 pixels for best results"
fi

# Sync to iOS
if [ -d "./ios/BuildTrack/Images.xcassets/AppIcon.appiconset" ]; then
    echo ""
    echo "📱 Syncing to iOS..."
    cp "$ICON_SOURCE" "$IOS_ICON_DEST"
    echo "   ✅ iOS icon updated"
else
    echo "   ⚠️  iOS assets directory not found (run npx expo prebuild first)"
fi

# Note about Android
echo ""
echo "🤖 Android icon:"
echo "   Android icons are generated during build from app.json configuration"
echo "   No manual sync needed for Android"

echo ""
echo "✅ Icon sync complete!"
echo ""
echo "💡 Next steps:"
echo "   1. Build your app: ./build-local.sh"
echo "   2. The updated icon will be included in the build"
echo ""

