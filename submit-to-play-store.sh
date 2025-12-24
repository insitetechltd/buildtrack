#!/bin/bash

# Automated Play Store Submission Script
# Submits Android AAB to Google Play Store using EAS Submit

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Play Store Submission Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Configuration
AAB_PATH="android/app/build/outputs/bundle/release/app-release.aab"
SERVICE_ACCOUNT_PATH="./google-service-account.json"
TRACK="${1:-internal}"  # Default to internal, can override: ./submit-to-play-store.sh production

# Check if AAB exists
if [ ! -f "$AAB_PATH" ]; then
    echo -e "${RED}❌ AAB not found at: $AAB_PATH${NC}"
    echo -e "${YELLOW}Building AAB first...${NC}"
    echo ""
    
    cd android
    ./gradlew bundleRelease
    cd ..
    
    if [ ! -f "$AAB_PATH" ]; then
        echo -e "${RED}❌ Failed to build AAB${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ AAB built successfully${NC}"
    echo ""
fi

# Check AAB size
AAB_SIZE=$(du -h "$AAB_PATH" | cut -f1)
echo -e "${BLUE}📦 AAB Details:${NC}"
echo -e "  Location: $AAB_PATH"
echo -e "  Size: $AAB_SIZE"
echo ""

# Check if service account exists
if [ ! -f "$SERVICE_ACCOUNT_PATH" ]; then
    echo -e "${YELLOW}⚠️  Service account not found: $SERVICE_ACCOUNT_PATH${NC}"
    echo ""
    echo -e "${BLUE}You have two options:${NC}"
    echo ""
    echo -e "${GREEN}Option 1: Set up service account (recommended)${NC}"
    echo -e "  1. Follow: SETUP_GOOGLE_SERVICE_ACCOUNT.md"
    echo -e "  2. Save JSON key as: $SERVICE_ACCOUNT_PATH"
    echo -e "  3. Run this script again"
    echo ""
    echo -e "${GREEN}Option 2: Manual upload${NC}"
    echo -e "  1. Go to: https://play.google.com/console"
    echo -e "  2. Select your app"
    echo -e "  3. Go to Production/Internal testing"
    echo -e "  4. Upload: $AAB_PATH"
    echo ""
    echo -e "${YELLOW}AAB is ready at: $AAB_PATH${NC}"
    exit 0
fi

echo -e "${GREEN}✅ Service account found${NC}"
echo ""

# Check EAS login
echo -e "${BLUE}🔐 Checking EAS authentication...${NC}"
if ! eas whoami &>/dev/null; then
    echo -e "${RED}❌ Not logged in to EAS${NC}"
    echo -e "${YELLOW}Logging in...${NC}"
    eas login
fi

EAS_USER=$(eas whoami 2>/dev/null | head -1)
echo -e "${GREEN}✅ Logged in as: $EAS_USER${NC}"
echo ""

# Validate track
VALID_TRACKS=("internal" "alpha" "beta" "production")
if [[ ! " ${VALID_TRACKS[@]} " =~ " ${TRACK} " ]]; then
    echo -e "${RED}❌ Invalid track: $TRACK${NC}"
    echo -e "${YELLOW}Valid tracks: ${VALID_TRACKS[*]}${NC}"
    exit 1
fi

echo -e "${BLUE}📤 Submitting to track: ${TRACK}${NC}"
echo ""

# Submit to Play Store
# Note: Track is configured in eas.json profile, not as CLI argument
echo -e "${BLUE}Uploading to Play Store...${NC}"
echo -e "${YELLOW}ℹ️  Using track from eas.json profile configuration${NC}"
echo ""

# Update track in eas.json if different from current
CURRENT_TRACK=$(grep -A 3 '"android"' eas.json | grep '"track"' | head -1 | sed 's/.*"track"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')
if [ "$CURRENT_TRACK" != "$TRACK" ]; then
    echo -e "${YELLOW}⚠️  Warning: Track in eas.json ($CURRENT_TRACK) differs from requested ($TRACK)${NC}"
    echo -e "${YELLOW}   Using track from eas.json: $CURRENT_TRACK${NC}"
    echo -e "${YELLOW}   To change, update 'track' in eas.json submit.production.android section${NC}"
    echo ""
fi

eas submit --platform android \
    --profile production \
    --path "$AAB_PATH" \
    --non-interactive

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}========================================${NC}"
    echo -e "${GREEN}✅ Submission Successful!${NC}"
    echo -e "${GREEN}========================================${NC}"
    echo ""
    echo -e "${BLUE}📋 Next Steps:${NC}"
    echo -e "  1. Go to: https://play.google.com/console"
    echo -e "  2. Check your app's ${TRACK} track"
    echo -e "  3. Review the uploaded AAB"
    echo -e "  4. Add release notes if needed"
    echo -e "  5. Start rollout or publish"
    echo ""
else
    echo ""
    echo -e "${RED}========================================${NC}"
    echo -e "${RED}❌ Submission Failed${NC}"
    echo -e "${RED}========================================${NC}"
    echo ""
    echo -e "${YELLOW}Troubleshooting:${NC}"
    echo -e "  1. Check service account permissions in Play Console"
    echo -e "  2. Verify app exists in Play Console"
    echo -e "  3. Check EAS logs for details"
    echo ""
    exit 1
fi


