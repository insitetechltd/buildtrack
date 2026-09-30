#!/bin/bash
# Manual PhotoKit Options Probe Execution Guide
# Run this to get step-by-step instructions

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd )"
EVIDENCE_DIR="$ROOT_DIR/.cache/insite-perf20/sim-photokit-dig/callpath-ab/options-probe"

SIM_UDID="B7B2640C-4738-4F8A-AEEE-5DF3D21D2533"
BUNDLE_ID="com.buildtrack.app.local"

echo "==============================================="
echo "PhotoKit Options Probe - Manual Execution"
echo "==============================================="
echo ""
echo "Simulator: $SIM_UDID"
echo "App: $BUNDLE_ID"
echo "Evidence: $EVIDENCE_DIR"
echo ""

# Check prerequisites
echo "Checking prerequisites..."

SIM_STATE=$(xcrun simctl list devices | grep "$SIM_UDID" | grep -o "Booted\|Shutdown" || echo "Unknown")
if [ "$SIM_STATE" != "Booted" ]; then
    echo "❌ Simulator not booted"
    echo "   Run: xcrun simctl boot $SIM_UDID"
    exit 1
fi
echo "✓ Simulator booted"

if ! xcrun simctl listapps "$SIM_UDID" | grep -q "$BUNDLE_ID"; then
    echo "❌ App not installed"
    echo "   Run: npm run ios"
    exit 1
fi
echo "✓ App installed"

if ! lsof -ti:8081 >/dev/null 2>&1; then
    echo "❌ Metro not running"
    echo "   Run: npm start"
    exit 1
fi
echo "✓ Metro running"

echo ""
echo "==============================================="
echo "EXECUTION METHOD (choose one):"
echo "==============================================="
echo ""

echo "METHOD 1: Floating Button (Simplest)"
echo "-------------------------------------"
echo "1. Launch app if not running:"
echo "   xcrun simctl launch $SIM_UDID $BUNDLE_ID"
echo ""
echo "2. Look for floating 🔬 button in bottom-right corner"
echo ""
echo "3. Tap the button"
echo ""
echo "4. Check Metro console for [PhotokitProbe] logs"
echo ""
echo "5. Results auto-saved to:"
echo "   $EVIDENCE_DIR"
echo ""

echo "METHOD 2: Developer Console (Direct)"
echo "------------------------------------"
echo "1. Open Safari Developer menu → your Mac name → Simulator"
echo ""
echo "2. In Console tab, paste:"
echo ""
cat <<'EOF'
import("./src/modules/mediaLibrary/PhotokitThumbView").then(async (module) => {
  const { probePhotokitRequestOptions, previewPhotokitNewestIds } = module;
  const ids = await previewPhotokitNewestIds(1);
  if (ids.length === 0) { console.log('[Probe] No photos'); return; }
  console.log(`[Probe] Testing: ${ids[0]}`);
  const result = await probePhotokitRequestOptions(ids[0], 256);
  console.log('[Probe] RESULTS:', JSON.stringify(result, null, 2));
  const pass = result.variants.filter(v => v.status === 'PASS');
  console.log(`[Probe] ${pass.length} PASS, ${result.variants.length - pass.length} FAIL`);
});
EOF
echo ""
echo ""

echo "METHOD 3: Xcode Console"
echo "----------------------"
echo "1. Open Xcode → Window → Devices and Simulators"
echo ""
echo "2. Select your simulator → Open Console"
echo ""
echo "3. In app, tap the 🔬 button"
echo ""
echo "4. Watch for [PhotokitProbe] logs in Xcode console"
echo ""

echo "==============================================="
echo "After execution, check:"
echo "==============================================="
echo "- Metro console for detailed logs"
echo "- Evidence directory for JSON results"
echo "- Create RESULT.md summary matrix"
echo ""
echo "Next: npm run photokit:analyze-results"
echo ""
