#!/bin/bash

# Android Build Script for Insite App
# This script builds a standalone Android release APK and optionally installs it on an emulator
# Based on the successful build process that resolved Kotlin/KSP compatibility issues

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
EMULATOR_ID="emulator-5554"  # Default emulator, can be overridden
INSTALL_ON_EMULATOR=false    # Set to true to auto-install after build
CLEAN_BUILD=false            # Set to true to do a clean build

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --install|-i)
      INSTALL_ON_EMULATOR=true
      shift
      ;;
    --clean|-c)
      CLEAN_BUILD=true
      shift
      ;;
    --emulator|-e)
      EMULATOR_ID="$2"
      shift 2
      ;;
    --help|-h)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  -i, --install       Install APK on emulator after build"
      echo "  -c, --clean         Perform clean build"
      echo "  -e, --emulator ID   Specify emulator ID (default: emulator-5554)"
      echo "  -h, --help          Show this help message"
      echo ""
      echo "Examples:"
      echo "  $0                  # Build APK only"
      echo "  $0 --install         # Build and install on default emulator"
      echo "  $0 --clean --install # Clean build and install"
      echo "  $0 -i -e emulator-5556  # Build and install on specific emulator"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Android Build Script for Insite App${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo -e "${RED}Error: package.json not found. Please run this script from the project root.${NC}"
  exit 1
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
  echo -e "${YELLOW}Warning: .env file not found. Some environment variables may be missing.${NC}"
fi

# Step 1: Clean build if requested
if [ "$CLEAN_BUILD" = true ]; then
  echo -e "${YELLOW}🧹 Cleaning previous build...${NC}"
  cd android
  ./gradlew clean
  cd ..
  echo -e "${GREEN}✅ Clean complete${NC}"
  echo ""
fi

# Step 2: Run Expo prebuild (regenerates native code)
echo -e "${BLUE}📱 Running Expo prebuild...${NC}"
npx expo prebuild --platform android --clean
echo -e "${GREEN}✅ Prebuild complete${NC}"
echo ""

# Step 3: Build release APK
echo -e "${BLUE}🔨 Building release APK...${NC}"
cd android

# Build the release APK
./gradlew assembleRelease

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Build failed!${NC}"
  exit 1
fi

cd ..

# Step 4: Locate the APK
APK_PATH="android/app/build/outputs/apk/release/app-release.apk"

if [ ! -f "$APK_PATH" ]; then
  echo -e "${RED}❌ APK not found at expected location: $APK_PATH${NC}"
  exit 1
fi

APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
echo -e "${GREEN}✅ Build successful!${NC}"
echo -e "${GREEN}📦 APK location: $APK_PATH${NC}"
echo -e "${GREEN}📊 APK size: $APK_SIZE${NC}"
echo ""

# Step 5: Install on emulator if requested
if [ "$INSTALL_ON_EMULATOR" = true ]; then
  echo -e "${BLUE}📲 Installing on emulator ($EMULATOR_ID)...${NC}"
  
  # Check if emulator is running
  if ! adb devices | grep -q "$EMULATOR_ID"; then
    echo -e "${YELLOW}⚠️  Emulator $EMULATOR_ID not found. Checking available devices...${NC}"
    adb devices
    echo ""
    echo -e "${YELLOW}Please start an emulator or connect a device, then run:${NC}"
    echo -e "${YELLOW}  adb install -r $APK_PATH${NC}"
    exit 0
  fi
  
  # Install the APK
  adb -s "$EMULATOR_ID" install -r "$APK_PATH"
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ APK installed successfully!${NC}"
    echo ""
    echo -e "${BLUE}🚀 Launching app...${NC}"
    adb -s "$EMULATOR_ID" shell am start -n com.buildtrack.app/.MainActivity
    
    if [ $? -eq 0 ]; then
      echo -e "${GREEN}✅ App launched!${NC}"
      echo ""
      echo -e "${BLUE}📋 To view logs:${NC}"
      echo -e "  adb -s $EMULATOR_ID logcat | grep -E '(com.buildtrack|FATAL|Error)'"
    else
      echo -e "${YELLOW}⚠️  App may have launched but there was an error${NC}"
    fi
  else
    echo -e "${RED}❌ Installation failed!${NC}"
    exit 1
  fi
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Build process complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}APK Location:${NC} $APK_PATH"
echo -e "${BLUE}APK Size:${NC} $APK_SIZE"
echo ""

if [ "$INSTALL_ON_EMULATOR" = false ]; then
  echo -e "${YELLOW}To install manually:${NC}"
  echo -e "  adb install -r $APK_PATH"
  echo ""
  echo -e "${YELLOW}To install and launch:${NC}"
  echo -e "  adb install -r $APK_PATH && adb shell am start -n com.buildtrack.app/.MainActivity"
fi

