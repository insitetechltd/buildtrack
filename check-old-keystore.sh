#!/bin/bash
# Check old_keystore.jks with various password combinations

set -e

EXPECTED_SHA1="5B:2A:6A:49:4B:C8:84:09:91:83:08:D9:94:4B:4B:F8:C9:E1:DC:16"
KEYSTORE="./old_keystore.jks"
ALIAS="jks-js"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Checking old_keystore.jks${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}Expected SHA-1:${NC} ${EXPECTED_SHA1}"
echo -e "${YELLOW}Keystore:${NC} ${KEYSTORE}"
echo -e "${YELLOW}Alias:${NC} ${ALIAS}"
echo ""

if [ ! -f "$KEYSTORE" ]; then
    echo -e "${RED}❌ Keystore file not found: $KEYSTORE${NC}"
    exit 1
fi

# Common password list to try
PASSWORDS=(
    "dfc88498be1516dad38326fe0c39bcf7"
    "59b6299dec7d2ca0593156274e73cf7"
    "android"
    "buildtrack"
    "insite"
    "insitetech"
    "release"
    "keystore"
    "jks-js"
    "password"
    "123456"
    ""
)

echo -e "${BLUE}Trying password combinations...${NC}"
echo ""

MATCHED=false
for pass in "${PASSWORDS[@]}"; do
    if [ -z "$pass" ]; then
        continue
    fi
    
    SHA1=$(keytool -list -v -keystore "$KEYSTORE" -storepass "$pass" -alias "$ALIAS" 2>&1 | grep "SHA1:" | awk '{print $2}' | head -1)
    
    if [ -n "$SHA1" ] && [ "$SHA1" != "null" ] && [ "$SHA1" != "SHA1:" ] && ! echo "$SHA1" | grep -q "Error"; then
        echo -e "${GREEN}✅ Password works: ${YELLOW}${pass:0:20}${NC}"
        echo -e "   SHA-1: ${SHA1}"
        
        # Normalize for comparison
        SHA1_NORM=$(echo "$SHA1" | tr -d ':' | tr '[:lower:]' '[:upper:]')
        EXPECTED_NORM=$(echo "$EXPECTED_SHA1" | tr -d ':' | tr '[:upper:]' '[:upper:]')
        
        if [ "$SHA1_NORM" == "$EXPECTED_NORM" ]; then
            echo -e "   ${GREEN}✅✅✅ MATCH FOUND! This is the upload key keystore! ✅✅✅${NC}"
            echo ""
            echo -e "${GREEN}Keystore Details:${NC}"
            echo -e "  File: ${YELLOW}$KEYSTORE${NC}"
            echo -e "  Alias: ${YELLOW}$ALIAS${NC}"
            echo -e "  Password: ${YELLOW}$pass${NC}"
            echo -e "  SHA-1: ${YELLOW}$SHA1${NC}"
            echo ""
            echo -e "${BLUE}To use this keystore:${NC}"
            echo -e "  1. Copy to android/app/release-key.keystore"
            echo -e "  2. Update android/keystore.properties:"
            echo -e "     storeFile=release-key.keystore"
            echo -e "     storePassword=$pass"
            echo -e "     keyAlias=$ALIAS"
            echo -e "     keyPassword=$pass"
            MATCHED=true
            break
        else
            echo -e "   ${RED}❌ Does not match upload key${NC}"
        fi
        echo ""
    fi
done

if [ "$MATCHED" = false ]; then
    echo -e "${RED}❌ Could not find matching password${NC}"
    echo ""
    echo -e "${YELLOW}The keystore might use a different password.${NC}"
    echo -e "${YELLOW}You can try manually:${NC}"
    echo -e "  ${BLUE}keytool -list -v -keystore $KEYSTORE -alias $ALIAS${NC}"
    echo ""
    echo -e "${YELLOW}Or check if there are password hints in:${NC}"
    echo -e "  - Documentation files"
    echo -e "  - Password managers"
    echo -e "  - Team members"
fi

