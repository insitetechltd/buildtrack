#!/bin/bash

# Build Configuration Validation Script
# Ensures build configuration matches last successful build

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"
CONFIG_FILE="$PROJECT_ROOT/.build-config-success.json"

echo -e "${BLUE}🔍 Validating build configuration...${NC}"
echo ""

# Check if config file exists
if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${YELLOW}⚠️  No successful build configuration found.${NC}"
    echo -e "${YELLOW}   This is the first validation run.${NC}"
    echo ""
    exit 0
fi

# Load expected configuration
EXPECTED_SHA1=$(jq -r '.lastSuccessfulBuild.keystore.sha1' "$CONFIG_FILE")
EXPECTED_KEYSTORE=$(jq -r '.lastSuccessfulBuild.keystore.file' "$CONFIG_FILE")
EXPECTED_ALIAS=$(jq -r '.lastSuccessfulBuild.keystore.alias' "$CONFIG_FILE")
KEYSTORE_PROPERTIES=$(jq -r '.lastSuccessfulBuild.buildGradle.keystorePropertiesPath' "$CONFIG_FILE")

ERRORS=0
WARNINGS=0

# 1. Check if keystore file exists
echo -e "${BLUE}1. Checking keystore file...${NC}"
if [ ! -f "$PROJECT_ROOT/$EXPECTED_KEYSTORE" ]; then
    echo -e "${RED}❌ Keystore file not found: $EXPECTED_KEYSTORE${NC}"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✅ Keystore file exists: $EXPECTED_KEYSTORE${NC}"
fi

# 2. Check keystore.properties exists
echo -e "${BLUE}2. Checking keystore.properties...${NC}"
if [ ! -f "$PROJECT_ROOT/$KEYSTORE_PROPERTIES" ]; then
    echo -e "${RED}❌ keystore.properties not found: $KEYSTORE_PROPERTIES${NC}"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✅ keystore.properties exists${NC}"
    
    # Check if it points to correct keystore
    PROPERTIES_FILE=$(grep "^storeFile=" "$PROJECT_ROOT/$KEYSTORE_PROPERTIES" | cut -d'=' -f2)
    if [ "$PROPERTIES_FILE" != "$(basename $EXPECTED_KEYSTORE)" ]; then
        echo -e "${YELLOW}⚠️  keystore.properties points to: $PROPERTIES_FILE${NC}"
        echo -e "${YELLOW}   Expected: $(basename $EXPECTED_KEYSTORE)${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
fi

# 3. Verify keystore SHA-1 matches
echo -e "${BLUE}3. Verifying keystore SHA-1...${NC}"
if [ -f "$PROJECT_ROOT/$EXPECTED_KEYSTORE" ] && [ -f "$PROJECT_ROOT/$KEYSTORE_PROPERTIES" ]; then
    STORE_PASSWORD=$(grep "^storePassword=" "$PROJECT_ROOT/$KEYSTORE_PROPERTIES" | cut -d'=' -f2)
    KEY_ALIAS=$(grep "^keyAlias=" "$PROJECT_ROOT/$KEYSTORE_PROPERTIES" | cut -d'=' -f2)
    
    ACTUAL_SHA1=$(keytool -list -v -keystore "$PROJECT_ROOT/$EXPECTED_KEYSTORE" -storepass "$STORE_PASSWORD" -alias "$KEY_ALIAS" 2>&1 | grep "SHA1:" | awk '{print $2}' | head -1)
    
    if [ -z "$ACTUAL_SHA1" ]; then
        echo -e "${RED}❌ Could not read keystore SHA-1 (check password/alias)${NC}"
        ERRORS=$((ERRORS + 1))
    else
        # Normalize SHA-1 for comparison
        ACTUAL_NORM=$(echo "$ACTUAL_SHA1" | tr -d ':' | tr '[:lower:]' '[:upper:]')
        EXPECTED_NORM=$(echo "$EXPECTED_SHA1" | tr -d ':' | tr '[:upper:]' '[:upper:]')
        
        if [ "$ACTUAL_NORM" == "$EXPECTED_NORM" ]; then
            echo -e "${GREEN}✅ Keystore SHA-1 matches: $ACTUAL_SHA1${NC}"
        else
            echo -e "${RED}❌ Keystore SHA-1 mismatch!${NC}"
            echo -e "${RED}   Expected: $EXPECTED_SHA1${NC}"
            echo -e "${RED}   Found:    $ACTUAL_SHA1${NC}"
            ERRORS=$((ERRORS + 1))
        fi
    fi
else
    echo -e "${YELLOW}⚠️  Skipping SHA-1 check (keystore or properties missing)${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# 4. Check build.gradle signing configuration
echo -e "${BLUE}4. Checking build.gradle signing configuration...${NC}"
BUILD_GRADLE="$PROJECT_ROOT/android/app/build.gradle"
if [ ! -f "$BUILD_GRADLE" ]; then
    echo -e "${RED}❌ build.gradle not found${NC}"
    ERRORS=$((ERRORS + 1))
else
    # Check release build type uses signingConfigs.release
    if grep -q "signingConfig signingConfigs.release" "$BUILD_GRADLE"; then
        echo -e "${GREEN}✅ Release build type uses signingConfigs.release${NC}"
    elif grep -q "signingConfig signingConfigs.debug" "$BUILD_GRADLE" | grep -q "release"; then
        echo -e "${RED}❌ Release build type is using signingConfigs.debug!${NC}"
        echo -e "${RED}   This will cause signing failures.${NC}"
        ERRORS=$((ERRORS + 1))
    else
        echo -e "${YELLOW}⚠️  Could not verify release signing config${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
    
    # Check debug build type uses signingConfigs.debug
    if grep -A 2 "buildTypes {" "$BUILD_GRADLE" | grep -A 1 "debug {" | grep -q "signingConfig signingConfigs.debug"; then
        echo -e "${GREEN}✅ Debug build type uses signingConfigs.debug${NC}"
    else
        echo -e "${YELLOW}⚠️  Debug signing config may be incorrect${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
fi

echo ""
if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}❌ Validation failed with $ERRORS error(s)${NC}"
    if [ $WARNINGS -gt 0 ]; then
        echo -e "${YELLOW}   and $WARNINGS warning(s)${NC}"
    fi
    echo ""
    echo -e "${YELLOW}Please fix the errors before building.${NC}"
    exit 1
elif [ $WARNINGS -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Validation passed with $WARNINGS warning(s)${NC}"
    exit 0
else
    echo -e "${GREEN}✅ All validations passed!${NC}"
    exit 0
fi

