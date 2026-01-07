#!/bin/bash
# Fix Android Build Issues
# Clears caches and fixes common build problems

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Android Build Fix Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Step 1: Clear Metro bundler cache
echo -e "${BLUE}Step 1/4: Clearing Metro bundler cache...${NC}"
rm -rf node_modules/.cache 2>/dev/null || true
rm -rf .expo 2>/dev/null || true
rm -rf /tmp/metro-* 2>/dev/null || true
rm -rf /tmp/haste-map-* 2>/dev/null || true
echo -e "${GREEN}✅ Metro cache cleared${NC}"
echo ""

# Step 2: Clear Gradle cache
echo -e "${BLUE}Step 2/4: Clearing Gradle build cache...${NC}"
if [ -d "android" ]; then
    cd android
    ./gradlew clean 2>/dev/null || true
    rm -rf app/build .gradle build 2>/dev/null || true
    cd ..
    echo -e "${GREEN}✅ Gradle cache cleared${NC}"
else
    echo -e "${YELLOW}⚠️  android directory not found${NC}"
fi
echo ""

# Step 3: Clear watchman cache (if installed)
echo -e "${BLUE}Step 3/4: Clearing Watchman cache...${NC}"
if command -v watchman &> /dev/null; then
    watchman watch-del-all 2>/dev/null || true
    echo -e "${GREEN}✅ Watchman cache cleared${NC}"
else
    echo -e "${YELLOW}⚠️  Watchman not installed (optional)${NC}"
fi
echo ""

# Step 4: Reinstall node modules (optional, but recommended)
echo -e "${BLUE}Step 4/4: Checking node_modules...${NC}"
if [ ! -d "node_modules" ] || [ ! -f "node_modules/.bin/expo" ]; then
    echo -e "${YELLOW}⚠️  node_modules missing or incomplete${NC}"
    echo -e "${BLUE}Installing dependencies...${NC}"
    npm install
    echo -e "${GREEN}✅ Dependencies installed${NC}"
else
    echo -e "${GREEN}✅ node_modules looks good${NC}"
fi
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Build Fix Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo -e "  1. Try building again: ${YELLOW}./build-and-submit-android.sh${NC}"
echo -e "  2. If issues persist, run with clean: ${YELLOW}./build-and-submit-android.sh --clean${NC}"
echo ""

