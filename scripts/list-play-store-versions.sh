#!/bin/bash

# Script to list versions in Google Play Console
# Note: This requires Google Play Developer API access

set -e

echo "📋 Listing versions in Google Play Console..."
echo ""
echo "To deactivate previous versions manually:"
echo ""
echo "1. Go to: https://play.google.com/console"
echo "2. Navigate: Release → Testing → Internal testing"
echo "3. For each version (except version 9):"
echo "   - Click the version"
echo "   - Click 'Deactivate' or 'Remove'"
echo "   - Confirm"
echo ""
echo "Current active version should be: 9 (1.1.2)"
echo ""
echo "Versions to deactivate:"
echo "  - Version 1 (1.1.2) - Has ACTIVITY_RECOGNITION"
echo "  - Version 6 (1.1.2) - Previous submission"
echo "  - Version 7 (1.1.2) - Previous submission"
echo "  - Version 8 (1.1.2) - Previous submission"
echo ""
echo "Keep active:"
echo "  - Version 9 (1.1.2) - No ACTIVITY_RECOGNITION ✅"
