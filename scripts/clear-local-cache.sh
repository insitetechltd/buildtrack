#!/bin/bash

echo "🧹 Clearing local development cache..."

# Clear Metro bundler cache
echo "Clearing Metro cache..."
rm -rf .expo
rm -rf node_modules/.cache

# Clear watchman
echo "Clearing Watchman..."
watchman watch-del-all 2>/dev/null || echo "Watchman not running"

# Clear iOS simulator data for BuildTrack
echo "Clearing iOS simulator app data..."
xcrun simctl listapps booted | grep -i buildtrack || echo "BuildTrack not installed on booted simulator"

echo ""
echo "✅ Cache cleared!"
echo ""
echo "📱 To fully reset the app on simulator:"
echo "1. Delete the BuildTrack app from the simulator"
echo "2. Run: npm start -- --clear"
echo ""
