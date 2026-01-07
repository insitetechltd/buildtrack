#!/bin/bash
# Extract Android Keystore from EAS credentials.json
# This script helps extract the keystore file from credentials.json downloaded from EAS

set -e

CREDENTIALS_FILE="credentials.json"
KEYSTORE_OUTPUT="android/app/release-key.keystore"
KEYSTORE_PROPERTIES="android/keystore.properties"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}EAS Keystore Extraction Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if credentials.json exists
if [ ! -f "$CREDENTIALS_FILE" ]; then
    echo -e "${YELLOW}⚠️  $CREDENTIALS_FILE not found in current directory${NC}"
    echo ""
    echo -e "${BLUE}To download credentials from EAS:${NC}"
    echo ""
    echo -e "${GREEN}Step 1:${NC} Run the EAS credentials command:"
    echo -e "  ${YELLOW}npx eas credentials --platform android${NC}"
    echo ""
    echo -e "${GREEN}Step 2:${NC} Follow the interactive prompts:"
    echo -e "  1. Select your build profile (e.g., ${YELLOW}production${NC})"
    echo -e "  2. Choose: ${YELLOW}credentials.json: Upload/Download credentials...${NC}"
    echo -e "  3. Select: ${YELLOW}Download credentials from EAS to credentials.json${NC}"
    echo ""
    echo -e "${GREEN}Step 3:${NC} Once credentials.json is downloaded, run this script again:"
    echo -e "  ${YELLOW}./scripts/extract-keystore-from-eas.sh${NC}"
    echo ""
    echo -e "${BLUE}Note:${NC} Make sure you're in the project root directory when running both commands."
    echo ""
    exit 1
fi

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo -e "${RED}❌ Error: jq is required but not installed${NC}"
    echo -e "${YELLOW}Install jq: brew install jq (macOS) or apt-get install jq (Linux)${NC}"
    exit 1
fi

# Extract keystore data
echo -e "${BLUE}📦 Extracting keystore data from credentials.json...${NC}"

KEYSTORE_PATH=$(jq -r '.android.keystore.keystorePath // empty' "$CREDENTIALS_FILE")
KEYSTORE_B64=$(jq -r '.android.keystore.keystore // empty' "$CREDENTIALS_FILE")
KEYSTORE_PASSWORD=$(jq -r '.android.keystore.keystorePassword // empty' "$CREDENTIALS_FILE")
KEY_ALIAS=$(jq -r '.android.keystore.keyAlias // empty' "$CREDENTIALS_FILE")
KEY_PASSWORD=$(jq -r '.android.keystore.keyPassword // empty' "$CREDENTIALS_FILE")

# Check if keystore data exists
if [ -z "$KEYSTORE_PASSWORD" ] || [ -z "$KEY_ALIAS" ] || [ -z "$KEY_PASSWORD" ]; then
    echo -e "${RED}❌ Error: Keystore credentials not found in credentials.json${NC}"
    echo -e "${YELLOW}Make sure you downloaded Android credentials from EAS${NC}"
    echo -e "${YELLOW}Found in credentials.json:${NC}"
    jq '.android.keystore' "$CREDENTIALS_FILE" 2>/dev/null || echo "Could not parse JSON"
    exit 1
fi

# Handle keystore file - either from path or base64 encoded
if [ -n "$KEYSTORE_PATH" ] && [ "$KEYSTORE_PATH" != "null" ]; then
    # Keystore file path is provided - copy it
    echo -e "${BLUE}🔐 Copying keystore file from path...${NC}"
    
    # Check if path is relative or absolute
    if [ -f "$KEYSTORE_PATH" ]; then
        # Absolute or relative path from project root
        cp "$KEYSTORE_PATH" "$KEYSTORE_OUTPUT"
    elif [ -f "credentials/$KEYSTORE_PATH" ]; then
        # Try relative to credentials directory
        cp "credentials/$KEYSTORE_PATH" "$KEYSTORE_OUTPUT"
    else
        # Try with the path as-is from credentials directory structure
        FULL_PATH=$(echo "$KEYSTORE_PATH" | sed 's|^credentials/||')
        if [ -f "$FULL_PATH" ]; then
            cp "$FULL_PATH" "$KEYSTORE_OUTPUT"
        else
            echo -e "${YELLOW}⚠️  Keystore file not found at: $KEYSTORE_PATH${NC}"
            echo -e "${YELLOW}⚠️  Keystore file not found at: credentials/$KEYSTORE_PATH${NC}"
            echo -e "${YELLOW}⚠️  Keystore file not found at: $FULL_PATH${NC}"
            echo -e "${BLUE}ℹ️  The keystore file may need to be downloaded separately from EAS${NC}"
            echo -e "${BLUE}ℹ️  Continuing with credentials only - you'll need to provide the keystore file manually${NC}"
            echo ""
            echo -e "${YELLOW}Please place your keystore file at: $KEYSTORE_OUTPUT${NC}"
            echo -e "${YELLOW}Or update android/keystore.properties with the correct path after it's created${NC}"
            echo ""
            read -p "Press Enter to continue creating keystore.properties without the keystore file..."
        fi
    fi
    
    if [ -f "$KEYSTORE_OUTPUT" ]; then
        echo -e "${GREEN}✅ Keystore copied to: $KEYSTORE_OUTPUT${NC}"
    fi
elif [ -n "$KEYSTORE_B64" ] && [ "$KEYSTORE_B64" != "null" ]; then
    # Base64 encoded keystore - decode it
    echo -e "${BLUE}🔐 Decoding base64 keystore data...${NC}"
    echo "$KEYSTORE_B64" | base64 -d > "$KEYSTORE_OUTPUT"
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Error: Failed to decode keystore${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Keystore decoded and saved to: $KEYSTORE_OUTPUT${NC}"
else
    echo -e "${YELLOW}⚠️  No keystore file path or base64 data found${NC}"
    echo -e "${BLUE}ℹ️  You may need to download the keystore file separately from EAS${NC}"
    echo -e "${BLUE}ℹ️  Creating keystore.properties with credentials - update storeFile path manually${NC}"
fi

# Create keystore.properties
echo -e "${BLUE}📝 Creating keystore.properties...${NC}"

# Check if template exists
if [ ! -f "keystore.properties.template" ]; then
    echo -e "${YELLOW}⚠️  Template not found, creating basic keystore.properties...${NC}"
    cat > "$KEYSTORE_PROPERTIES" << EOF
# Android Release Keystore Configuration
# Generated from EAS credentials

storeFile=release-key.keystore
storePassword=$KEYSTORE_PASSWORD
keyAlias=$KEY_ALIAS
keyPassword=$KEY_PASSWORD
EOF
else
    # Copy template and replace values
    cp keystore.properties.template "$KEYSTORE_PROPERTIES"
    
    # Replace values (using sed with proper escaping)
    sed -i '' "s|storeFile=.*|storeFile=release-key.keystore|" "$KEYSTORE_PROPERTIES"
    sed -i '' "s|storePassword=.*|storePassword=$KEYSTORE_PASSWORD|" "$KEYSTORE_PROPERTIES"
    sed -i '' "s|keyAlias=.*|keyAlias=$KEY_ALIAS|" "$KEYSTORE_PROPERTIES"
    sed -i '' "s|keyPassword=.*|keyPassword=$KEY_PASSWORD|" "$KEYSTORE_PROPERTIES"
fi

echo -e "${GREEN}✅ keystore.properties created at: $KEYSTORE_PROPERTIES${NC}"

# Verify keystore (only if file exists)
if [ -f "$KEYSTORE_OUTPUT" ]; then
    echo -e "${BLUE}🔍 Verifying keystore...${NC}"
    if command -v keytool &> /dev/null; then
        keytool -list -v -keystore "$KEYSTORE_OUTPUT" -storepass "$KEYSTORE_PASSWORD" > /dev/null 2>&1
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Keystore is valid${NC}"
            echo ""
            echo -e "${BLUE}Keystore information:${NC}"
            keytool -list -v -keystore "$KEYSTORE_OUTPUT" -storepass "$KEYSTORE_PASSWORD" | grep -E "(Alias name|Valid from|SHA1|SHA256)"
        else
            echo -e "${YELLOW}⚠️  Could not verify keystore (password may be incorrect)${NC}"
        fi
    else
        echo -e "${YELLOW}⚠️  keytool not found, skipping verification${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Keystore file not found - you'll need to provide it manually${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Summary:${NC}"
echo -e "  ├─ Keystore: $KEYSTORE_OUTPUT"
echo -e "  ├─ Properties: $KEYSTORE_PROPERTIES"
echo -e "  ├─ Key Alias: $KEY_ALIAS"
echo ""
echo -e "${YELLOW}⚠️  Security Reminder:${NC}"
echo -e "  ├─ credentials.json contains sensitive data"
echo -e "  ├─ Consider removing it: rm credentials.json"
echo -e "  └─ Both files are gitignored and should NOT be committed"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo -e "  1. Verify keystore.properties looks correct"
echo -e "  2. Test build: ./build-and-submit-android.sh --track production"
echo ""

