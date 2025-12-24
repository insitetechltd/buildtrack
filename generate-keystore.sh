#!/bin/bash

# Generate Production Keystore for Android
# This script generates a production keystore for signing Android release builds

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Android Production Keystore Generator${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Configuration
KEYSTORE_PATH="android/app/release.keystore"
KEYSTORE_PROPERTIES="android/keystore.properties"
KEY_ALIAS="buildtrack-release"
VALIDITY_YEARS=25  # Google requires at least 25 years for Play Store

# Check if keystore already exists
if [ -f "$KEYSTORE_PATH" ]; then
    echo -e "${YELLOW}⚠️  Keystore already exists at: $KEYSTORE_PATH${NC}"
    echo -e "${YELLOW}   If you continue, it will be overwritten!${NC}"
    read -p "Continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 1
    fi
    rm -f "$KEYSTORE_PATH"
fi

# Generate secure passwords
echo -e "${BLUE}🔐 Generating secure passwords...${NC}"
STORE_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
KEY_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)

echo -e "${GREEN}✅ Passwords generated${NC}"
echo ""

# Create keystore directory if it doesn't exist
mkdir -p "$(dirname "$KEYSTORE_PATH")"

# Generate keystore
echo -e "${BLUE}📝 Generating keystore...${NC}"
echo -e "${YELLOW}   This may take a moment...${NC}"

keytool -genkeypair \
    -v \
    -storetype PKCS12 \
    -keystore "$KEYSTORE_PATH" \
    -alias "$KEY_ALIAS" \
    -keyalg RSA \
    -keysize 2048 \
    -validity $((VALIDITY_YEARS * 365)) \
    -storepass "$STORE_PASSWORD" \
    -keypass "$KEY_PASSWORD" \
    -dname "CN=Insite Tech Ltd, OU=Development, O=Insite Tech Ltd, L=Hong Kong, ST=Hong Kong, C=HK"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to generate keystore!${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Keystore generated successfully!${NC}"
echo ""

# Create keystore.properties file
echo -e "${BLUE}📝 Creating keystore.properties file...${NC}"

cat > "$KEYSTORE_PROPERTIES" << EOF
storeFile=release.keystore
storePassword=$STORE_PASSWORD
keyAlias=$KEY_ALIAS
keyPassword=$KEY_PASSWORD
EOF

echo -e "${GREEN}✅ Properties file created${NC}"
echo ""

# Set secure permissions
chmod 600 "$KEYSTORE_PROPERTIES"
chmod 600 "$KEYSTORE_PATH"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Keystore Setup Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}📋 Summary:${NC}"
echo -e "  Keystore: ${KEYSTORE_PATH}"
echo -e "  Key Alias: ${KEY_ALIAS}"
echo -e "  Validity: ${VALIDITY_YEARS} years"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT SECURITY NOTES:${NC}"
echo -e "  1. The keystore.properties file contains sensitive passwords"
echo -e "  2. Make sure keystore.properties is in .gitignore"
echo -e "  3. BACKUP the keystore file and passwords securely"
echo -e "  4. If you lose the keystore, you cannot update your app on Play Store"
echo ""
echo -e "${BLUE}💾 Backup Information:${NC}"
echo -e "  Store the following information in a secure password manager:"
echo -e "  - Keystore file: ${KEYSTORE_PATH}"
echo -e "  - Store Password: (saved in keystore.properties)"
echo -e "  - Key Password: (saved in keystore.properties)"
echo -e "  - Key Alias: ${KEY_ALIAS}"
echo ""
echo -e "${GREEN}✅ Next step: Update build.gradle to use this keystore${NC}"


