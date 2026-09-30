#!/bin/bash
# Wait for probe execution and capture results

echo "=== Waiting for PhotoKit Probe Execution ==="
echo ""
echo "Execute probe by tapping 🔬 button in app"
echo "Or paste console script in Safari Developer Console"
echo ""
echo "Monitoring for results..."
echo ""

SIM_DATA="/Volumes/KooDrive/tristan-xocde-library/CoreSimulator/Devices/B7B2640C-4738-4F8A-AEEE-5DF3D21D2533/data/Containers/Data/Application"

TIMEOUT=300  # 5 minutes
ELAPSED=0

while [ $ELAPSED -lt $TIMEOUT ]; do
  # Check for probe result files
  RESULT_FILE=$(find "$SIM_DATA" -name "probe-result-*.json" 2>/dev/null | head -1)
  
  if [ -n "$RESULT_FILE" ]; then
    echo "✅ Probe results found!"
    echo "Location: $RESULT_FILE"
    echo ""
    cat "$RESULT_FILE"
    echo ""
    echo "Copying to scripts/ directory..."
    cp "$RESULT_FILE" scripts/probe-result-captured.json
    echo "✅ Results saved to scripts/probe-result-captured.json"
    exit 0
  fi
  
  # Show progress dot every 5 seconds
  if [ $((ELAPSED % 5)) -eq 0 ]; then
    echo -n "."
  fi
  
  sleep 1
  ELAPSED=$((ELAPSED + 1))
done

echo ""
echo "⏱ Timeout after ${TIMEOUT}s - no probe results found"
echo "Make sure to execute the probe via FAB button or console script"
exit 1
