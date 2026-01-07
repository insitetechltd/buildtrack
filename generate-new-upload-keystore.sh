#!/bin/bash
# Generate a new upload keystore for Android app signing
# This keystore can be used after resetting the upload key in Play Console

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

KEYSTORE_FILE="upload-keystore.jks"
CERTIFICATE_FILE="upload_certificate.pem"
KEY_ALIAS="upload"
VALIDITY_YEARS=25  # Google Play requires at least 25 years

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Generate New Upload Keystore${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if keystore already exists
if [ -f "$KEYSTORE_FILE" ]; then
    echo -e "${YELLOW}⚠️  $KEYSTORE_FILE already exists${NC}"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}Cancelled${NC}"
        exit 1
    fi
    rm -f "$KEYSTORE_FILE"
fi

# Get keystore password
echo -e "${BLUE}Enter keystore password (will be hidden):${NC}"
read -s KEYSTORE_PASSWORD
echo ""

if [ -z "$KEYSTORE_PASSWORD" ]; then
    echo -e "${RED}❌ Password cannot be empty${NC}"
    exit 1
fi

# Confirm password
echo -e "${BLUE}Confirm keystore password:${NC}"
read -s KEYSTORE_PASSWORD_CONFIRM
echo ""

if [ "$KEYSTORE_PASSWORD" != "$KEYSTORE_PASSWORD_CONFIRM" ]; then
    echo -e "${RED}❌ Passwords do not match${NC}"
    exit 1
fi

# Get key password (can be same as keystore password)
echo -e "${BLUE}Enter key password (press Enter to use same as keystore password):${NC}"
read -s KEY_PASSWORD
echo ""

if [ -z "$KEY_PASSWORD" ]; then
    KEY_PASSWORD="$KEYSTORE_PASSWORD"
    echo -e "${YELLOW}Using keystore password for key password${NC}"
fi

# Generate keystore
echo ""
echo -e "${BLUE}Generating keystore...${NC}"
echo -e "${YELLOW}This may take a moment...${NC}"
echo ""

keytool -genkeypair \
    -v \
    -keystore "$KEYSTORE_FILE" \
    -alias "$KEY_ALIAS" \
    -keyalg RSA \
    -keysize 2048 \
    -validity $((VALIDITY_YEARS * 365)) \
    -storepass "$KEYSTORE_PASSWORD" \
    -keypass "$KEY_PASSWORD" \
    -dname "CN=Insite Tech Ltd, OU=Development, O=Insite Tech Ltd, L=Hong Kong, ST=Hong Kong, C=HK"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to generate keystore${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Keystore generated: $KEYSTORE_FILE${NC}"
echo ""

# Get SHA-1 fingerprint
echo -e "${BLUE}Keystore Information:${NC}"
SHA1=$(keytool -list -v -keystore "$KEYSTORE_FILE" -storepass "$KEYSTORE_PASSWORD" -alias "$KEY_ALIAS" | grep "SHA1:" | awk '{print $2}')
SHA256=$(keytool -list -v -keystore "$KEYSTORE_FILE" -storepass "$KEYSTORE_PASSWORD" -alias "$KEY_ALIAS" | grep "SHA256:" | awk '{print $2}')

echo -e "  SHA-1:   ${YELLOW}$SHA1${NC}"
echo -e "  SHA-256: ${YELLOW}$SHA256${NC}"
echo ""

# Export certificate
echo -e "${BLUE}Exporting certificate...${NC}"
keytool -export -rfc \
    -keystore "$KEYSTORE_FILE" \
    -alias "$KEY_ALIAS" \
    -file "$CERTIFICATE_FILE" \
    -storepass "$KEYSTORE_PASSWORD"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to export certificate${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Certificate exported: $CERTIFICATE_FILE${NC}"
echo ""

# Create keystore.properties template
PROPERTIES_FILE="keystore-upload.properties"
cat > "$PROPERTIES_FILE" << EOF
# Upload Keystore Configuration
# Generated: $(date)

storeFile=$KEYSTORE_FILE
storePassword=$KEYSTORE_PASSWORD
keyAlias=$KEY_ALIAS
keyPassword=$KEY_PASSWORD
EOF

chmod 600 "$PROPERTIES_FILE"
echo -e "${GREEN}✅ Properties file created: $PROPERTIES_FILE${NC}"
echo ""

# Save credentials securely
CREDENTIALS_FILE="upload-keystore-credentials.txt"
cat > "$CREDENTIALS_FILE" << EOF
# Upload Keystore Credentials
# ⚠️  KEEP THIS FILE SECURE - DO NOT COMMIT TO GIT
# Generated: $(date)

Keystore File: $KEYSTORE_FILE
Key Alias: $KEY_ALIAS
Keystore Password: $KEYSTORE_PASSWORD
Key Password: $KEY_PASSWORD

SHA-1 Fingerprint: $SHA1
SHA-256 Fingerprint: $SHA256

Certificate File: $CERTIFICATE_FILE

⚠️  IMPORTANT:
- Backup this keystore file securely
- Store credentials in a password manager
- Do NOT commit keystore or credentials to git
- You'll need this keystore for ALL future app updates
EOF

chmod 600 "$CREDENTIALS_FILE"
echo -e "${GREEN}✅ Credentials saved: $CREDENTIALS_FILE${NC}"
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Keystore Generation Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Files Created:${NC}"
echo -e "  ├─ ${YELLOW}$KEYSTORE_FILE${NC} - Keystore file (KEEP SECURE)"
echo -e "  ├─ ${YELLOW}$CERTIFICATE_FILE${NC} - Certificate (can be shared)"
echo -e "  ├─ ${YELLOW}$PROPERTIES_FILE${NC} - Properties file for build"
echo -e "  └─ ${YELLOW}$CREDENTIALS_FILE${NC} - Credentials (KEEP SECURE)"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo -e "  1. ${YELLOW}Backup the keystore file securely${NC}"
echo -e "  2. ${YELLOW}Request upload key reset in Google Play Console${NC}"
echo -e "  3. ${YELLOW}Upload the certificate ($CERTIFICATE_FILE) when requested${NC}"
echo -e "  4. ${YELLOW}Wait for Google approval (24-48 hours)${NC}"
echo -e "  5. ${YELLOW}After approval, use this keystore for signing${NC}"
echo ""
echo -e "${YELLOW}⚠️  SECURITY WARNING:${NC}"
echo -e "  - Do NOT commit $KEYSTORE_FILE to git"
echo -e "  - Do NOT commit $CREDENTIALS_FILE to git"
echo -e "  - Store credentials in a password manager"
echo -e "  - Keep multiple secure backups"
echo ""

