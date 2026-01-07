#!/bin/bash
# Download and verify keystores from all EAS profiles
# Finds the keystore that matches the upload key

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

EXPECTED_SHA1="5B:2A:6A:49:4B:C8:84:09:91:83:08:D9:94:4B:4B:F8:C9:E1:DC:16"
OUTPUT_DIR="eas-keystores"
MATCHED_KEYSTORE=""

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Download All EAS Keystores${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${YELLOW}Expected Upload Key SHA-1:${NC} ${EXPECTED_SHA1}"
echo ""

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo -e "${RED}❌ Error: jq is required but not installed${NC}"
    echo -e "${YELLOW}Install jq: brew install jq (macOS)${NC}"
    exit 1
fi

# Check if keytool is available
if ! command -v keytool &> /dev/null; then
    echo -e "${RED}❌ Error: keytool is required but not installed${NC}"
    echo -e "${YELLOW}keytool comes with Java JDK${NC}"
    exit 1
fi

# Create output directory
mkdir -p "$OUTPUT_DIR"
echo -e "${BLUE}📁 Output directory: $OUTPUT_DIR${NC}"
echo ""

# Get list of profiles from eas.json
echo -e "${BLUE}📋 Reading profiles from eas.json...${NC}"
PROFILES=$(jq -r '.build | keys[]' eas.json 2>/dev/null | grep -v "^_" || echo "")

if [ -z "$PROFILES" ]; then
    echo -e "${YELLOW}⚠️  No profiles found in eas.json${NC}"
    echo -e "${BLUE}Will try common profiles: production, production-local, preview${NC}"
    PROFILES="production production-local preview"
fi

echo -e "${GREEN}Found profiles:${NC}"
echo "$PROFILES" | while read profile; do
    echo -e "  - ${YELLOW}$profile${NC}"
done
echo ""

# Check EAS authentication
if ! npx eas whoami &>/dev/null; then
    echo -e "${RED}❌ Not authenticated with EAS${NC}"
    echo -e "${YELLOW}Please run: npx eas login${NC}"
    exit 1
fi

EAS_USER=$(npx eas whoami 2>/dev/null | head -1)
echo -e "${GREEN}✅ Authenticated as: $EAS_USER${NC}"
echo ""

# Function to download and verify keystore for a profile
download_and_verify() {
    local profile=$1
    local credentials_file="$OUTPUT_DIR/credentials-$profile.json"
    local keystore_file="$OUTPUT_DIR/keystore-$profile.keystore"
    
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}Profile: ${YELLOW}$profile${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    # Check if this profile has Android credentials
    echo -e "${BLUE}Downloading credentials...${NC}"
    
    # Try to download credentials (this will be interactive)
    echo -e "${YELLOW}⚠️  Interactive step required:${NC}"
    echo -e "  1. Select profile: ${GREEN}$profile${NC}"
    echo -e "  2. Choose: ${GREEN}Download credentials from EAS to credentials.json${NC}"
    echo ""
    
    # Save current credentials.json if it exists
    if [ -f "credentials.json" ]; then
        cp credentials.json "credentials.json.backup"
    fi
    
    # Download credentials (interactive)
    npx eas credentials --platform android --profile "$profile" 2>&1 | tee "$OUTPUT_DIR/download-$profile.log" || {
        echo -e "${YELLOW}⚠️  Failed to download credentials for profile: $profile${NC}"
        echo -e "${YELLOW}   This profile might not have Android credentials configured${NC}"
        echo ""
        return 1
    }
    
    # Check if credentials.json was created
    if [ ! -f "credentials.json" ]; then
        echo -e "${YELLOW}⚠️  credentials.json not found after download${NC}"
        echo -e "${YELLOW}   Profile might not have Android credentials${NC}"
        echo ""
        return 1
    fi
    
    # Copy credentials file
    cp credentials.json "$credentials_file"
    echo -e "${GREEN}✅ Credentials saved to: $credentials_file${NC}"
    
    # Extract keystore data
    KEYSTORE_B64=$(jq -r '.android.keystore.keystore // empty' "$credentials_file" 2>/dev/null)
    KEYSTORE_PATH=$(jq -r '.android.keystore.keystorePath // empty' "$credentials_file" 2>/dev/null)
    KEYSTORE_PASSWORD=$(jq -r '.android.keystore.keystorePassword // empty' "$credentials_file" 2>/dev/null)
    KEY_ALIAS=$(jq -r '.android.keystore.keyAlias // empty' "$credentials_file" 2>/dev/null)
    KEY_PASSWORD=$(jq -r '.android.keystore.keyPassword // empty' "$credentials_file" 2>/dev/null)
    
    if [ -z "$KEYSTORE_PASSWORD" ] || [ -z "$KEY_ALIAS" ]; then
        echo -e "${YELLOW}⚠️  No keystore credentials found in this profile${NC}"
        echo ""
        return 1
    fi
    
    # Extract keystore file
    if [ -n "$KEYSTORE_B64" ] && [ "$KEYSTORE_B64" != "null" ] && [ -n "$KEYSTORE_B64" ]; then
        echo -e "${BLUE}Extracting keystore from base64...${NC}"
        echo "$KEYSTORE_B64" | base64 -d > "$keystore_file" 2>/dev/null || {
            echo -e "${RED}❌ Failed to decode keystore${NC}"
            echo ""
            return 1
        }
    elif [ -n "$KEYSTORE_PATH" ] && [ "$KEYSTORE_PATH" != "null" ]; then
        echo -e "${BLUE}Copying keystore from path: $KEYSTORE_PATH${NC}"
        if [ -f "$KEYSTORE_PATH" ]; then
            cp "$KEYSTORE_PATH" "$keystore_file"
        elif [ -f "credentials/$KEYSTORE_PATH" ]; then
            cp "credentials/$KEYSTORE_PATH" "$keystore_file"
        else
            echo -e "${YELLOW}⚠️  Keystore file not found at: $KEYSTORE_PATH${NC}"
            echo ""
            return 1
        fi
    else
        echo -e "${YELLOW}⚠️  No keystore data found in credentials${NC}"
        echo ""
        return 1
    fi
    
    if [ ! -f "$keystore_file" ]; then
        echo -e "${RED}❌ Keystore file not created${NC}"
        echo ""
        return 1
    fi
    
    echo -e "${GREEN}✅ Keystore saved to: $keystore_file${NC}"
    
    # Verify keystore and get SHA-1
    echo -e "${BLUE}Verifying keystore...${NC}"
    SHA1=$(keytool -list -v -keystore "$keystore_file" -storepass "$KEYSTORE_PASSWORD" -alias "$KEY_ALIAS" 2>&1 | grep "SHA1:" | awk '{print $2}' | head -1)
    
    if [ -z "$SHA1" ]; then
        echo -e "${RED}❌ Could not extract SHA-1 from keystore${NC}"
        echo -e "${YELLOW}   Check password and alias${NC}"
        echo ""
        return 1
    fi
    
    echo -e "${BLUE}Keystore SHA-1:    ${SHA1}${NC}"
    echo -e "${BLUE}Expected SHA-1:   ${EXPECTED_SHA1}${NC}"
    
    # Normalize SHA-1 for comparison
    SHA1_NORM=$(echo "$SHA1" | tr -d ':' | tr '[:lower:]' '[:upper:]')
    EXPECTED_NORM=$(echo "$EXPECTED_SHA1" | tr -d ':' | tr '[:upper:]' '[:upper:]')
    
    if [ "$SHA1_NORM" == "$EXPECTED_NORM" ]; then
        echo -e "${GREEN}✅✅✅ MATCH! This is the upload key keystore! ✅✅✅${NC}"
        echo ""
        MATCHED_KEYSTORE="$keystore_file"
        
        # Save the matching credentials
        echo -e "${GREEN}Saving matching keystore info...${NC}"
        cat > "$OUTPUT_DIR/MATCHED_KEYSTORE.txt" << EOF
Profile: $profile
Keystore File: $keystore_file
Credentials File: $credentials_file
SHA-1: $SHA1
Key Alias: $KEY_ALIAS
Store Password: $KEYSTORE_PASSWORD
Key Password: $KEY_PASSWORD

To use this keystore:
1. Copy to android/app/release-key.keystore
2. Update android/keystore.properties with:
   storeFile=release-key.keystore
   storePassword=$KEYSTORE_PASSWORD
   keyAlias=$KEY_ALIAS
   keyPassword=$KEY_PASSWORD
EOF
        echo -e "${GREEN}✅ Info saved to: $OUTPUT_DIR/MATCHED_KEYSTORE.txt${NC}"
        return 0
    else
        echo -e "${RED}❌ Does not match upload key${NC}"
        echo ""
        return 1
    fi
}

# Process each profile
MATCHED=false
for profile in $PROFILES; do
    if download_and_verify "$profile"; then
        MATCHED=true
        break  # Found the match, can stop here
    fi
done

echo ""
echo -e "${BLUE}========================================${NC}"
if [ "$MATCHED" = true ]; then
    echo -e "${GREEN}✅ SUCCESS! Found matching keystore!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "${BLUE}Matching keystore details:${NC}"
    cat "$OUTPUT_DIR/MATCHED_KEYSTORE.txt"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo -e "  1. Copy the keystore: ${YELLOW}cp $MATCHED_KEYSTORE android/app/release-key.keystore${NC}"
    echo -e "  2. Update keystore.properties (see MATCHED_KEYSTORE.txt above)"
    echo -e "  3. Rebuild: ${YELLOW}cd android && ./gradlew clean bundleRelease${NC}"
    echo -e "  4. Submit: ${YELLOW}npx eas submit --platform android --path android/app/build/outputs/bundle/release/app-release.aab${NC}"
else
    echo -e "${RED}❌ No matching keystore found in any profile${NC}"
    echo -e "${RED}========================================${NC}"
    echo ""
    echo -e "${YELLOW}All downloaded keystores are in: $OUTPUT_DIR${NC}"
    echo -e "${YELLOW}You may need to:${NC}"
    echo -e "  1. Check if there are other profiles not in eas.json"
    echo -e "  2. Check if the upload was done manually (not via EAS)"
    echo -e "  3. Consider resetting the upload key in Play Console"
    echo ""
    echo -e "${BLUE}Downloaded files:${NC}"
    ls -lh "$OUTPUT_DIR"/*.keystore "$OUTPUT_DIR"/*.json 2>/dev/null || echo "No files found"
fi

echo ""

