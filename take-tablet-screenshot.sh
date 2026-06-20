#!/bin/bash
# Helper script to quickly take a screenshot on the tablet emulator

SCREENSHOT_DIR="./screenshots/7inch-tablet"
SCREEN_NAME=${1:-"screenshot_$(date +%Y%m%d_%H%M%S)"}

mkdir -p "$SCREENSHOT_DIR"

filename="${SCREENSHOT_DIR}/${SCREEN_NAME}.png"

echo "Taking screenshot: $filename"
adb shell screencap -p > "$filename"

if [ -f "$filename" ]; then
    echo "✅ Screenshot saved: $filename"
    
    # Get file size
    size=$(ls -lh "$filename" | awk '{print $5}')
    echo "   Size: $size"
else
    echo "❌ Failed to take screenshot"
    exit 1
fi

