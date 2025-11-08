#!/bin/bash

# BuildTrack Local Build Script
# This script makes it easy to run local builds without remembering the --local flag

set -e

echo "🔨 BuildTrack Local Build Helper"
echo ""

# Default to production if no profile specified
PROFILE="${1:-production}"
PLATFORM="${2:-ios}"

echo "Profile: $PROFILE"
echo "Platform: $PLATFORM"
echo ""

# Run the build
npx eas build --platform "$PLATFORM" --profile "$PROFILE" --local

echo ""
echo "✅ Build script completed!"

