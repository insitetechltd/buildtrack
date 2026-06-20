#!/bin/bash

# Save Successful Build Configuration
# Called after a successful build to remember the configuration

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
CONFIG_FILE="$PROJECT_ROOT/.build-config-success.json"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}💾 Saving successful build configuration...${NC}"

# Get current version info
VERSION_CODE=$(grep "versionCode" "$PROJECT_ROOT/android/app/build.gradle" | head -1 | awk '{print $2}')
VERSION_NAME=$(grep "versionName" "$PROJECT_ROOT/android/app/build.gradle" | head -1 | awk -F'"' '{print $2}')

# Get keystore info
KEYSTORE_PROPERTIES="$PROJECT_ROOT/android/keystore.properties"
if [ -f "$KEYSTORE_PROPERTIES" ]; then
    KEYSTORE_FILE=$(grep "^storeFile=" "$KEYSTORE_PROPERTIES" | cut -d'=' -f2)
    KEYSTORE_PATH="android/app/$KEYSTORE_FILE"
    KEY_ALIAS=$(grep "^keyAlias=" "$KEYSTORE_PROPERTIES" | cut -d'=' -f2)
    STORE_PASSWORD=$(grep "^storePassword=" "$KEYSTORE_PROPERTIES" | cut -d'=' -f2)
    
    # Get SHA-1
    if [ -f "$PROJECT_ROOT/$KEYSTORE_PATH" ]; then
        SHA1=$(keytool -list -v -keystore "$PROJECT_ROOT/$KEYSTORE_PATH" -storepass "$STORE_PASSWORD" -alias "$KEY_ALIAS" 2>&1 | grep "SHA1:" | awk '{print $2}' | head -1)
    else
        SHA1="unknown"
    fi
else
    KEYSTORE_FILE="unknown"
    KEYSTORE_PATH="unknown"
    KEY_ALIAS="unknown"
    SHA1="unknown"
fi

# Check build.gradle signing config
BUILD_GRADLE="$PROJECT_ROOT/android/app/build.gradle"
if grep -q "signingConfig signingConfigs.release" "$BUILD_GRADLE"; then
    RELEASE_SIGNING_CONFIG="signingConfigs.release"
else
    RELEASE_SIGNING_CONFIG="unknown"
fi

# Create/update config file
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

cat > "$CONFIG_FILE" << EOF
{
  "lastSuccessfulBuild": {
    "timestamp": "$TIMESTAMP",
    "versionCode": $VERSION_CODE,
    "versionName": "$VERSION_NAME",
    "keystore": {
      "file": "$KEYSTORE_PATH",
      "sha1": "$SHA1",
      "alias": "$KEY_ALIAS",
      "source": "google certificates/upload-keystore.jks"
    },
    "signingConfig": {
      "releaseBuildType": "$RELEASE_SIGNING_CONFIG",
      "debugBuildType": "signingConfigs.debug"
    },
    "buildGradle": {
      "releaseSigningConfig": "$RELEASE_SIGNING_CONFIG",
      "keystorePropertiesPath": "android/keystore.properties"
    }
  },
  "validationRules": {
    "checkKeystoreSha1": true,
    "checkSigningConfig": true,
    "verifyKeystoreExists": true,
    "verifyPropertiesFile": true
  }
}
EOF

echo -e "${GREEN}✅ Configuration saved to .build-config-success.json${NC}"
echo -e "${BLUE}   Version: $VERSION_NAME (code: $VERSION_CODE)${NC}"
echo -e "${BLUE}   Keystore SHA-1: $SHA1${NC}"
echo ""

