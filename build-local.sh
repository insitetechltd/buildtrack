#!/bin/bash

# BuildTrack Local Build Script
# Fully automated non-interactive builds using credentials from .env
# Uses existing EAS login session + Apple credentials from .env

set -e

echo "🔨 BuildTrack Local Build Helper (Fully Automated)"
echo ""

# Arguments: PLATFORM PROFILE
# Example: ./build-local.sh ios production-local
PLATFORM="${1:-ios}"
PROFILE="${2:-production-local}"

echo "Platform: $PLATFORM"
echo "Profile: $PROFILE"
echo ""

# Load Apple credentials from .env if it exists
if [ -f .env ]; then
  echo "Loading Apple credentials from .env..."
  # Export only Apple credentials (not EXPO_TOKEN as we use existing session)
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

# Run the build
# --local: Build on local machine
# --non-interactive: No prompts
# credentialsSource: remote (configured in eas.json) - uses EAS credentials
# Uses existing EAS login session for authentication
# EXPO_APPLE_ID & EXPO_APPLE_TEAM_ID: Automatic Apple account selection
echo "Starting fully automated local build..."
npx eas build --platform "$PLATFORM" --profile "$PROFILE" --local --non-interactive

echo ""
echo "✅ Build script completed!"

