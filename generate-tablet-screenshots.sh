#!/bin/bash
# Script to generate 7-inch tablet screenshots for Google Play Store

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
AVD_NAME="7inch_tablet_screenshots"
SCREENSHOT_DIR="./screenshots/7inch-tablet"
API_LEVEL=34  # Android 14
DEVICE_NAME="7in WSVGA (Tablet)"  # 1024x600 resolution

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Generate 7-inch Tablet Screenshots${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if Android SDK is available
if [ -z "$ANDROID_HOME" ]; then
    if [ -d "$HOME/Library/Android/sdk" ]; then
        export ANDROID_HOME="$HOME/Library/Android/sdk"
    else
        echo -e "${RED}❌ ANDROID_HOME not set and not found in default location${NC}"
        echo "Please set ANDROID_HOME or install Android SDK"
        exit 1
    fi
fi

export PATH="$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$ANDROID_HOME/tools:$PATH"

# Create screenshots directory
mkdir -p "$SCREENSHOT_DIR"

# Check if AVD already exists
if avdmanager list avd | grep -q "$AVD_NAME"; then
    echo -e "${YELLOW}⚠️  AVD '$AVD_NAME' already exists${NC}"
    read -p "Delete and recreate? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}Deleting existing AVD...${NC}"
        avdmanager delete avd -n "$AVD_NAME" || true
    else
        echo -e "${YELLOW}Using existing AVD${NC}"
    fi
fi

# Create AVD if it doesn't exist
if ! avdmanager list avd | grep -q "$AVD_NAME"; then
    echo -e "${BLUE}Creating 7-inch tablet AVD...${NC}"
    
    # Check if system image exists
    if ! sdkmanager --list_installed 2>/dev/null | grep -q "system-images;android-$API_LEVEL"; then
        echo -e "${YELLOW}⚠️  System image for API $API_LEVEL not found${NC}"
        echo "Installing system image..."
        sdkmanager "system-images;android-$API_LEVEL;google_apis;x86_64"
    fi
    
    # Create AVD
    echo "no" | avdmanager create avd \
        -n "$AVD_NAME" \
        -k "system-images;android-$API_LEVEL;google_apis;x86_64" \
        -d "$DEVICE_NAME" \
        --force
    
    echo -e "${GREEN}✅ AVD created${NC}"
fi

# Start emulator
echo -e "${BLUE}Starting emulator...${NC}"
emulator -avd "$AVD_NAME" -no-snapshot-load -wipe-data > /dev/null 2>&1 &
EMULATOR_PID=$!

# Wait for emulator to boot
echo -e "${BLUE}Waiting for emulator to boot...${NC}"
adb wait-for-device
echo -e "${YELLOW}Emulator is booting, waiting for system to be ready...${NC}"

# Wait for boot to complete
timeout=0
max_timeout=300
while [ $timeout -lt $max_timeout ]; do
    if adb shell getprop sys.boot_completed | grep -q "1"; then
        break
    fi
    sleep 2
    timeout=$((timeout + 2))
    echo -n "."
done
echo ""

if [ $timeout -ge $max_timeout ]; then
    echo -e "${RED}❌ Emulator failed to boot in time${NC}"
    kill $EMULATOR_PID 2>/dev/null || true
    exit 1
fi

echo -e "${GREEN}✅ Emulator is ready${NC}"

# Wait a bit more for UI to stabilize
sleep 5

# Build and install app
echo -e "${BLUE}Building and installing app...${NC}"
cd "$(dirname "$0")"

# Build APK
if [ ! -f "android/app/build/outputs/apk/release/app-release.apk" ]; then
    echo -e "${BLUE}Building release APK...${NC}"
    cd android
    ./gradlew assembleRelease -x lintVitalRelease
    cd ..
fi

# Install APK
echo -e "${BLUE}Installing app on emulator...${NC}"
adb install -r android/app/build/outputs/apk/release/app-release.apk || {
    echo -e "${YELLOW}⚠️  Install failed, trying uninstall first...${NC}"
    adb uninstall com.buildtrack.app || true
    adb install android/app/build/outputs/apk/release/app-release.apk
}

echo -e "${GREEN}✅ App installed${NC}"

# Launch app
echo -e "${BLUE}Launching app...${NC}"
adb shell am start -n com.buildtrack.app/.MainActivity
sleep 5

# Function to take screenshot
take_screenshot() {
    local screen_name=$1
    local filename="${SCREENSHOT_DIR}/${screen_name}.png"
    adb shell screencap -p > "$filename"
    echo -e "${GREEN}✅ Screenshot saved: $filename${NC}"
    sleep 2
}

# Take screenshots of key screens
echo -e "${BLUE}Taking screenshots...${NC}"

# 1. Login Screen
echo -e "${BLUE}1. Login Screen${NC}"
take_screenshot "01_login"

# Note: For other screens, you would need to:
# - Login (requires credentials)
# - Navigate to different screens
# - Take screenshots

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}✅ Screenshot generation complete!${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${BLUE}Screenshots saved to:${NC} $SCREENSHOT_DIR"
echo ""
echo -e "${YELLOW}Note:${NC} To capture more screens:"
echo "  1. Login to the app manually"
echo "  2. Navigate to desired screens"
echo "  3. Run: ./take-tablet-screenshot.sh screen_name"
echo "     Or: adb shell screencap -p > $SCREENSHOT_DIR/screen_name.png"
echo ""
echo -e "${BLUE}To stop the emulator:${NC}"
echo "  adb emu kill"
echo "  or"
echo "  kill $EMULATOR_PID"

