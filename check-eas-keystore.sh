#!/bin/bash
# Check EAS for the upload key keystore

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

EXPECTED_SHA1="5B:2A:6A:49:4B:C8:84:09:91:83:08:D9:94:4B:4B:F8:C9:E1:DC:16"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Checking EAS for Upload Keystore${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}This script will help you check if EAS has the upload key keystore.${NC}"
echo -e "${YELLOW}Expected Upload Key SHA-1: ${EXPECTED_SHA1}${NC}"
echo ""

# Check if we're authenticated
if ! npx eas whoami &>/dev/null; then
    echo -e "${RED}❌ Not authenticated with EAS${NC}"
    echo -e "${YELLOW}Please run: npx eas login${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Authenticated with EAS${NC}"
echo ""

# Try to download credentials for production profile
echo -e "${BLUE}Downloading credentials from EAS (production profile)...${NC}"
echo -e "${YELLOW}Follow the prompts and select:${NC}"
echo -e "  1. Build profile: ${GREEN}production${NC}"
echo -e "  2. Action: ${GREEN}Download credentials from EAS to credentials.json${NC}"
echo ""

# This will be interactive
npx eas credentials --platform android --profile production

if [ ! -f "credentials.json" ]; then
    echo -e "${RED}❌ credentials.json not found${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}Checking downloaded keystore...${NC}"

# Check if keystore is base64 encoded or a path
KEYSTORE_B64=$(jq -r '.android.keystore.keystore' credentials.json 2>/dev/null)
KEYSTORE_PATH=$(jq -r '.android.keystore.keystorePath' credentials.json 2>/dev/null)

if [ "$KEYSTORE_PATH" != "null" ] && [ -n "$KEYSTORE_PATH" ]; then
    echo -e "${BLUE}Keystore found at path: $KEYSTORE_PATH${NC}"
    
    if [ -f "$KEYSTORE_PATH" ]; then
        KEYSTORE_PASSWORD=$(jq -r '.android.keystore.keystorePassword' credentials.json)
        KEY_ALIAS=$(jq -r '.android.keystore.keyAlias' credentials.json)
        
        echo -e "${BLUE}Extracting SHA-1...${NC}"
        SHA1=$(keytool -list -v -keystore "$KEYSTORE_PATH" -storepass "$KEYSTORE_PASSWORD" -alias "$KEY_ALIAS" 2>&1 | grep "SHA1:" | awk '{print $2}')
        
        echo "SHA-1: $SHA1"
        echo "Expected: $EXPECTED_SHA1"
        
        if [ "$SHA1" == "$EXPECTED_SHA1" ]; then
            echo -e "${GREEN}✅ MATCH! This is the upload key keystore!${NC}"
            echo ""
            echo -e "${GREEN}You can use this keystore for signing:${NC}"
            echo -e "  ${YELLOW}$KEYSTORE_PATH${NC}"
        else
            echo -e "${RED}❌ SHA-1 doesn't match. This is not the upload key.${NC}"
        fi
    else
        echo -e "${RED}❌ Keystore file not found at: $KEYSTORE_PATH${NC}"
    fi
elif [ "$KEYSTORE_B64" != "null" ] && [ -n "$KEYSTORE_B64" ]; then
    echo -e "${BLUE}Keystore is base64 encoded. Decoding...${NC}"
    
    TEMP_KEYSTORE=$(mktemp).keystore
    echo "$KEYSTORE_B64" | base64 -d > "$TEMP_KEYSTORE"
    
    KEYSTORE_PASSWORD=$(jq -r '.android.keystore.keystorePassword' credentials.json)
    KEY_ALIAS=$(jq -r '.android.keystore.keyAlias' credentials.json)
    
    echo -e "${BLUE}Extracting SHA-1...${NC}"
    SHA1=$(keytool -list -v -keystore "$TEMP_KEYSTORE" -storepass "$KEYSTORE_PASSWORD" -alias "$KEY_ALIAS" 2>&1 | grep "SHA1:" | awk '{print $2}')
    
    echo "SHA-1: $SHA1"
    echo "Expected: $EXPECTED_SHA1"
    
    if [ "$SHA1" == "$EXPECTED_SHA1" ]; then
        echo -e "${GREEN}✅ MATCH! This is the upload key keystore!${NC}"
        echo ""
        echo -e "${GREEN}Saving keystore to: android/app/upload-key.keystore${NC}"
        cp "$TEMP_KEYSTORE" "android/app/upload-key.keystore"
        echo -e "${GREEN}✅ Keystore saved!${NC}"
    else
        echo -e "${RED}❌ SHA-1 doesn't match. This is not the upload key.${NC}"
    fi
    
    rm -f "$TEMP_KEYSTORE"
else
    echo -e "${RED}❌ Could not find keystore data in credentials.json${NC}"
fi

echo ""
echo -e "${BLUE}Note:${NC} If this doesn't match, try checking other build profiles or"
echo -e "contact EAS support to see if there's an older keystore stored."

