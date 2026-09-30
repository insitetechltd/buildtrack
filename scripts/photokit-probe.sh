#!/bin/bash
# PhotoKit Options Probe - Manual L3 Test Harness
# Runs diagnostic on Debug sim B7B2640C-4738-4F8A-AEEE-5DF3D21D2533

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
EVIDENCE_DIR="$ROOT_DIR/.cache/insite-perf20/sim-photokit-dig/callpath-ab/options-probe"

SIM_UDID="B7B2640C-4738-4F8A-AEEE-5DF3D21D2533"
BUNDLE_ID="com.buildtrack.app.local"

echo "=== PhotoKit Options Probe ==="
echo "Sim UDID: $SIM_UDID"
echo "Bundle: $BUNDLE_ID"
echo "Evidence: $EVIDENCE_DIR"
echo ""

# Ensure evidence dir exists
mkdir -p "$EVIDENCE_DIR"

# Check sim is booted
echo "Checking simulator..."
SIM_STATE=$(xcrun simctl list devices | grep "$SIM_UDID" | grep -o "Booted\|Shutdown" || echo "Unknown")

if [ "$SIM_STATE" != "Booted" ]; then
    echo "ERROR: Simulator $SIM_UDID is not booted (state: $SIM_STATE)"
    echo "Boot it first: xcrun simctl boot $SIM_UDID"
    exit 1
fi

echo "✓ Simulator is booted"

# Check app is installed
if ! xcrun simctl listapps "$SIM_UDID" | grep -q "$BUNDLE_ID"; then
    echo "ERROR: App $BUNDLE_ID is not installed on simulator"
    echo "Build and install first: npm run ios"
    exit 1
fi

echo "✓ App is installed"
echo ""

# Launch app
echo "Launching app..."
xcrun simctl launch "$SIM_UDID" "$BUNDLE_ID"

echo ""
echo "=== Manual Test Instructions ==="
echo ""
echo "1. Navigate to Developer Settings (Profile tab → gear icon)"
echo "2. Or run this deep link command:"
echo "   xcrun simctl openurl $SIM_UDID 'exp://localhost:8081/--/photokit-probe'"
echo ""
echo "3. Or inject the probe via Metro console:"
echo "   - Press 'd' in Metro terminal"
echo "   - Paste and run:"
echo ""
echo "   import { probePhotokitRequestOptions, previewPhotokitNewestIds } from './src/modules/mediaLibrary/PhotokitThumbView';"
echo "   (async () => {"
echo "     const ids = await previewPhotokitNewestIds(1);"
echo "     if (ids.length === 0) { console.log('No photos'); return; }"
echo "     console.log('Testing asset:', ids[0]);"
echo "     const result = await probePhotokitRequestOptions(ids[0], 256);"
echo "     console.log('PROBE RESULTS:', JSON.stringify(result, null, 2));"
echo "   })();"
echo ""
echo "4. Results will be written to:"
echo "   $EVIDENCE_DIR"
echo ""
echo "5. Check Metro console for detailed output"
echo ""
