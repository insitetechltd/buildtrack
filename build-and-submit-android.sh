#!/bin/bash

# Android AAB Build and Submit Script
# Builds Android App Bundle locally and submits to Google Play Store via EAS

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CLEAN_BUILD=false
SKIP_PREBUILD=false
SUBMIT_TRACK="internal"  # Options: internal, alpha, beta, production
PROFILE="production"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --clean|-c)
      CLEAN_BUILD=true
      shift
      ;;
    --skip-prebuild|-s)
      SKIP_PREBUILD=true
      shift
      ;;
    --track|-t)
      SUBMIT_TRACK="$2"
      shift 2
      ;;
    --profile|-p)
      PROFILE="$2"
      shift 2
      ;;
    --help|-h)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  -c, --clean           Perform clean build (removes previous artifacts)"
      echo "  -s, --skip-prebuild   Skip expo prebuild step (use if native code unchanged)"
      echo "  -t, --track TRACK     Submit to track: internal, alpha, beta, production (default: internal)"
      echo "  -p, --profile PROFILE EAS profile to use (default: production)"
      echo "  -h, --help            Show this help message"
      echo ""
      echo "Examples:"
      echo "  $0                          # Build and submit to internal track"
      echo "  $0 --clean                  # Clean build and submit"
      echo "  $0 --track production       # Submit to production track"
      echo "  $0 --skip-prebuild          # Skip prebuild (faster if no native changes)"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Get the script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Android AAB Build & Submit Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo -e "${RED}Error: package.json not found. Please run this script from the project root.${NC}"
  exit 1
fi

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null && ! command -v npx &> /dev/null; then
  echo -e "${RED}Error: EAS CLI not found. Please install: npm install -g eas-cli${NC}"
  exit 1
fi

# Check EAS authentication
echo -e "${BLUE}🔐 Checking EAS authentication...${NC}"
if command -v eas &> /dev/null; then
  CURRENT_USER=$(eas whoami 2>/dev/null | head -n 1 || echo "")
else
  CURRENT_USER=$(npx eas whoami 2>/dev/null | head -n 1 || echo "")
fi

if [ -z "$CURRENT_USER" ]; then
  echo -e "${YELLOW}⚠️  Not logged in to EAS${NC}"
  echo -e "${YELLOW}Please run: npx eas login${NC}"
  exit 1
fi
echo -e "${GREEN}✅ Authenticated as: $CURRENT_USER${NC}"
echo ""

# Check for service account file (for automated submission)
SERVICE_ACCOUNT_PATH="./google-service-account.json"
if [ ! -f "$SERVICE_ACCOUNT_PATH" ]; then
  echo -e "${YELLOW}⚠️  Warning: Service account file not found at $SERVICE_ACCOUNT_PATH${NC}"
  echo -e "${YELLOW}EAS will use interactive authentication instead${NC}"
  echo ""
fi

# Step 1: Clean build if requested
if [ "$CLEAN_BUILD" = true ]; then
  echo -e "${BLUE}🧹 Step 1/5: Cleaning previous build...${NC}"
  if [ -d "android" ]; then
    cd android
    ./gradlew clean
    cd ..
  fi
  echo -e "${GREEN}✅ Clean complete${NC}"
  echo ""
fi

# Step 2: Run Expo prebuild (unless skipped)
if [ "$SKIP_PREBUILD" = false ]; then
  echo -e "${BLUE}📱 Step 2/5: Running Expo prebuild...${NC}"
  npx expo prebuild --platform android --clean
  echo -e "${GREEN}✅ Prebuild complete${NC}"
  echo ""
  
  # Reapply fixes after prebuild (prebuild clears android directory)
  echo -e "${BLUE}🔧 Reapplying build fixes...${NC}"
  
  # Reapply imgly patch
  if [ -f "patches/@imgly+editor-react-native+1.66.0.patch" ]; then
    npx patch-package @imgly/editor-react-native 2>/dev/null || true
    echo -e "${GREEN}✅ Imgly patch reapplied${NC}"
  fi
  
  # Add Compose Compiler plugin to build.gradle
  if [ -f "android/build.gradle" ]; then
    if ! grep -q "compose-compiler-gradle-plugin" android/build.gradle; then
      # Add the Compose Compiler plugin dependency (using temporary file for macOS compatibility)
      cp android/build.gradle android/build.gradle.tmp
      awk '/classpath.*kotlin-gradle-plugin/ { print; print "    // Compose Compiler plugin for Kotlin 2.0+ (required by @imgly/editor-react-native)"; print "    classpath('\''org.jetbrains.kotlin:compose-compiler-gradle-plugin:2.0.21'\'')"; next }1' android/build.gradle.tmp > android/build.gradle
      rm android/build.gradle.tmp
      echo -e "${GREEN}✅ Compose Compiler plugin added${NC}"
    fi
  fi
  
  # Add release signingConfig and package name fix to app/build.gradle if not already present
  if [ -f "android/app/build.gradle" ]; then
    # Add release signingConfig if it doesn't exist
    if ! grep -q "signingConfigs.release" android/app/build.gradle; then
      # Insert release signingConfig after the debug config closes using Python
      python3 << 'PYEOF'
import re
with open('android/app/build.gradle', 'r') as f:
    content = f.read()

# Simple regex replacement - insert release config before closing brace of signingConfigs
pattern = r'(        }\s*\n)(    \}\s*\n    buildTypes)'
replacement = r'''        }
        release {
            def keystorePropertiesFile = rootProject.file('keystore.properties')
            if (keystorePropertiesFile.exists()) {
                def keystoreProperties = new Properties()
                keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
            } else {
                storeFile file('debug.keystore')
                storePassword 'android'
                keyAlias 'androiddebugkey'
                keyPassword 'android'
                println "WARNING: keystore.properties not found. Using debug signing for release build."
            }
        }
\2'''

content = re.sub(pattern, replacement, content)
content = re.sub(r'signingConfig signingConfigs\.debug', 'signingConfig signingConfigs.release', content, count=1)

with open('android/app/build.gradle', 'w') as f:
    f.write(content)
PYEOF
      
      if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Added release signingConfig to build.gradle${NC}"
      else
        echo -e "${YELLOW}⚠️  Could not add release signingConfig (Python may not be available)${NC}"
      fi
    fi
    
    # Add package name fix task if not already present
    if ! grep -q "Fix autogenerated ReactNativeApplicationEntryPoint.java package name" android/app/build.gradle; then
      cat >> android/app/build.gradle << 'FIXEOF'

// Fix autogenerated ReactNativeApplicationEntryPoint.java package name
// React Native autolinking generates this with wrong package name - fix any incorrect package to use correct one
afterEvaluate {
    tasks.matching { it.name == 'compileReleaseJavaWithJavac' || it.name == 'compileDebugJavaWithJavac' }.all {
        doFirst {
            def entryPointFile = file("${buildDir}/generated/autolinking/src/main/java/com/facebook/react/ReactNativeApplicationEntryPoint.java")
            if (entryPointFile.exists()) {
                def content = entryPointFile.text
                // Fix any incorrect package names (com.taskr, com.helloworld, etc.) to correct one
                def correctedContent = content.replaceAll(/com\.(taskr|helloworld)/, 'com.buildtrack.app')
                if (correctedContent != content) {
                    entryPointFile.text = correctedContent
                    println "✅ Fixed package name in ReactNativeApplicationEntryPoint.java"
                }
            }
        }
    }
}
FIXEOF
      echo -e "${GREEN}✅ Added package name fix task to build.gradle${NC}"
    fi
  fi
  
  # Restore keystore files after prebuild (prebuild clears android directory)
  if [ -f "credentials.json" ] && [ -f "credentials/android/keystore.jks" ]; then
    echo -e "${BLUE}🔐 Restoring production keystore files...${NC}"
    
    # Restore keystore.properties
    cat credentials.json | jq -r '.android.keystore | "storeFile=release-key.keystore\nstorePassword=\(.keystorePassword)\nkeyAlias=\(.keyAlias)\nkeyPassword=\(.keyPassword)"' > android/keystore.properties 2>/dev/null || true
    
    # Restore keystore file
    cp credentials/android/keystore.jks android/app/release-key.keystore 2>/dev/null || true
    
    if [ -f "android/keystore.properties" ] && [ -f "android/app/release-key.keystore" ]; then
      echo -e "${GREEN}✅ Production keystore files restored${NC}"
    else
      echo -e "${YELLOW}⚠️  Warning: Could not restore keystore files. Build will use debug signing.${NC}"
    fi
  elif [ -f "android/keystore.properties.backup" ] && [ -f "android/app/release-key.keystore.backup" ]; then
    # Fallback: restore from backup if credentials.json not available
    cp android/keystore.properties.backup android/keystore.properties 2>/dev/null || true
    cp android/app/release-key.keystore.backup android/app/release-key.keystore 2>/dev/null || true
    echo -e "${GREEN}✅ Production keystore files restored from backup${NC}"
  else
    echo -e "${YELLOW}⚠️  Warning: keystore files not found. Build will use debug signing (not suitable for Play Store).${NC}"
  fi
  
  echo ""
else
  echo -e "${YELLOW}⏭️  Skipping prebuild (native code assumed unchanged)${NC}"
  echo ""
fi

# Step 2.5: Validate build configuration
echo -e "${BLUE}🔍 Step 2.5/5: Validating build configuration...${NC}"
if [ -f "scripts/validate-build-config.sh" ]; then
  if ! ./scripts/validate-build-config.sh; then
    echo -e "${RED}❌ Build configuration validation failed!${NC}"
    echo -e "${YELLOW}Please fix the configuration errors before building.${NC}"
    echo -e "${YELLOW}Run './scripts/validate-build-config.sh' for details.${NC}"
    exit 1
  fi
  echo ""
else
  echo -e "${YELLOW}⚠️  Validation script not found, skipping validation${NC}"
  echo ""
fi

# Step 3: Build release AAB
echo -e "${BLUE}🔨 Step 3/5: Building release AAB...${NC}"
echo -e "${BLUE}   This may take several minutes...${NC}"

cd android

# Build the release AAB (Android App Bundle)
# Skip lint tasks to avoid Metaspace errors (lint checks can be done separately)
# The package name fix is handled automatically by the Gradle task we added
./gradlew bundleRelease -x lintVitalRelease -x lintVitalAnalyzeRelease

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Build failed!${NC}"
  exit 1
fi

cd ..

# Step 4: Locate the AAB
AAB_PATH="android/app/build/outputs/bundle/release/app-release.aab"

if [ ! -f "$AAB_PATH" ]; then
  echo -e "${RED}❌ AAB not found at expected location: $AAB_PATH${NC}"
  echo -e "${YELLOW}Checking alternative locations...${NC}"
  
  # Try to find AAB in common locations
  ALTERNATIVE_PATHS=(
    "android/app/build/outputs/bundle/release/*.aab"
    "android/app/build/outputs/bundle/*.aab"
  )
  
  FOUND=false
  for pattern in "${ALTERNATIVE_PATHS[@]}"; do
    if ls $pattern 1> /dev/null 2>&1; then
      AAB_PATH=$(ls $pattern | head -1)
      FOUND=true
      break
    fi
  done
  
  if [ "$FOUND" = false ]; then
    echo -e "${RED}❌ Could not find AAB file${NC}"
    exit 1
  fi
fi

AAB_SIZE=$(du -h "$AAB_PATH" | cut -f1)
echo -e "${GREEN}✅ Build successful!${NC}"
echo -e "${GREEN}📦 AAB location: $AAB_PATH${NC}"
echo -e "${GREEN}📊 AAB size: $AAB_SIZE${NC}"
echo ""

# Step 5: Submit to Play Store via EAS
echo -e "${BLUE}🚀 Step 4/5: Submitting to Google Play Store...${NC}"
echo -e "${BLUE}   Track: $SUBMIT_TRACK${NC}"
echo ""

# Determine submit profile based on track
if [ "$SUBMIT_TRACK" == "production" ]; then
  SUBMIT_PROFILE="production"
else
  SUBMIT_PROFILE="internal"
fi

# Check if we should use service account or interactive
# Note: Track is configured in eas.json submit profile
EAS_CMD="npx eas submit --platform android --path \"$AAB_PATH\" --profile $SUBMIT_PROFILE"

if [ -f "$SERVICE_ACCOUNT_PATH" ]; then
  echo -e "${GREEN}✅ Using service account for automated submission${NC}"
else
  echo -e "${YELLOW}⚠️  Using interactive authentication${NC}"
  echo -e "${YELLOW}   EAS will open a browser for Google authentication${NC}"
fi

echo ""

# Run EAS submit
eval $EAS_CMD

SUBMIT_EXIT_CODE=$?

if [ $SUBMIT_EXIT_CODE -ne 0 ]; then
  echo -e "${RED}❌ Submission failed!${NC}"
  echo -e "${YELLOW}AAB file is still available at: $AAB_PATH${NC}"
  echo -e "${YELLOW}You can submit manually later with:${NC}"
  echo -e "${YELLOW}  eas submit --platform android --path \"$AAB_PATH\" --track $SUBMIT_TRACK${NC}"
  exit 1
fi

# Step 6: Save successful build configuration
echo ""
echo -e "${BLUE}💾 Step 5/5: Saving successful build configuration...${NC}"
if [ -f "scripts/save-successful-build-config.sh" ]; then
  ./scripts/save-successful-build-config.sh
  echo -e "${GREEN}✅ Configuration saved for future builds${NC}"
else
  echo -e "${YELLOW}⚠️  Save script not found, skipping configuration save${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Build and Submit Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Summary:${NC}"
echo -e "  ├─ AAB Location: $AAB_PATH"
echo -e "  ├─ AAB Size: $AAB_SIZE"
echo -e "  ├─ Track: $SUBMIT_TRACK"
echo -e "  └─ Profile: $PROFILE"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo -e "  1. Check Google Play Console for the submission"
echo -e "  2. Add release notes if needed"
echo -e "  3. Review and rollout when ready"
echo ""
echo -e "${BLUE}Play Console:${NC}"
echo -e "  https://play.google.com/console"
echo ""

