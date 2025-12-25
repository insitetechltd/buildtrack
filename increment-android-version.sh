#!/bin/bash

# Android Version Code Increment Script
# Increments the version code for Android builds
# Version code must be incremented for each Play Store release

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

VERSION_CODE_FILE="android/version-code.txt"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Android Version Code Increment${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if version code file exists
if [ ! -f "$VERSION_CODE_FILE" ]; then
    echo -e "${YELLOW}⚠️  version-code.txt not found. Creating with initial value...${NC}"
    echo "1" > "$VERSION_CODE_FILE"
    echo -e "${GREEN}✅ Created $VERSION_CODE_FILE with version code: 1${NC}"
    echo ""
fi

# Read current version code
CURRENT_VERSION_CODE=$(cat "$VERSION_CODE_FILE" | tr -d '[:space:]')

if [ -z "$CURRENT_VERSION_CODE" ] || ! [[ "$CURRENT_VERSION_CODE" =~ ^[0-9]+$ ]]; then
    echo -e "${RED}❌ Invalid version code in $VERSION_CODE_FILE: '$CURRENT_VERSION_CODE'${NC}"
    echo -e "${YELLOW}   Setting to 1...${NC}"
    CURRENT_VERSION_CODE=1
fi

# Increment version code
NEW_VERSION_CODE=$((CURRENT_VERSION_CODE + 1))

echo -e "${BLUE}Current version code:${NC} $CURRENT_VERSION_CODE"
echo -e "${BLUE}New version code:${NC} $NEW_VERSION_CODE"
echo ""

# Update version code file
echo "$NEW_VERSION_CODE" > "$VERSION_CODE_FILE"
echo -e "${GREEN}✅ Updated $VERSION_CODE_FILE${NC}"
echo ""

# Also get version name from app.json for reference
if [ -f "app.json" ]; then
    VERSION_NAME=$(grep -o '"version"[[:space:]]*:[[:space:]]*"[^"]*"' app.json | grep -o '[0-9]\+\.[0-9]\+\.[0-9]\+' | head -1)
    if [ -n "$VERSION_NAME" ]; then
        echo -e "${BLUE}Version name (from app.json):${NC} $VERSION_NAME"
    fi
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Version Code Incremented!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}📋 Summary:${NC}"
echo -e "  Old version code: $CURRENT_VERSION_CODE"
echo -e "  New version code: $NEW_VERSION_CODE"
if [ -n "$VERSION_NAME" ]; then
    echo -e "  Version name: $VERSION_NAME"
fi
echo ""
echo -e "${GREEN}✅ Next step: Build your Android app${NC}"
echo -e "  ./build-android.sh"
echo ""




