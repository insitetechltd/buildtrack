# Local Production Build Guide

## Prerequisites

### For iOS:
- macOS with Xcode installed (version 15.0 or later)
- CocoaPods installed (`sudo gem install cocoapods`)
- iOS Developer account (for device builds)

### For Android:
- Android Studio installed
- Android SDK configured
- Java Development Kit (JDK)

## Option 1: Local Build with Expo CLI (Recommended)

### Step 1: Prebuild (Generate Native Folders)
```bash
npx expo prebuild
```

This will generate the `ios/` and `android/` directories with native code.

### Step 2: Build for iOS (Local)
```bash
# For iOS Simulator (no signing required)
npx expo run:ios --configuration Release

# For iOS Device (requires Apple Developer account)
npx expo run:ios --device --configuration Release
```

### Step 3: Build for Android (Local)
```bash
# For Android Emulator
npx expo run:android --variant release

# For Android Device
npx expo run:android --device --variant release
```

## Option 2: EAS Build Locally

EAS Build can run locally and gives you more control over the build process.

### Step 1: Install EAS CLI
```bash
npm install -g eas-cli
```

### Step 2: Login to Expo
```bash
eas login
```

### Step 3: Build Locally
```bash
# iOS
eas build --platform ios --profile production --local

# Android
eas build --platform android --profile production --local

# Both platforms
eas build --platform all --profile production --local
```

## Option 3: Manual Xcode Build (iOS Only)

### Step 1: Prebuild
```bash
npx expo prebuild --platform ios
```

### Step 2: Install Pods
```bash
cd ios
pod install
cd ..
```

### Step 3: Open in Xcode
```bash
open ios/buildtrack.xcworkspace
```

### Step 4: In Xcode:
1. Select your development team in "Signing & Capabilities"
2. Choose your target device
3. Product → Archive
4. Follow the prompts to export or upload to TestFlight

## Option 4: Manual Gradle Build (Android Only)

### Step 1: Prebuild
```bash
npx expo prebuild --platform android
```

### Step 2: Build APK
```bash
cd android
./gradlew assembleRelease
```

The APK will be at: `android/app/build/outputs/apk/release/app-release.apk`

### Step 3: Build AAB (for Play Store)
```bash
cd android
./gradlew bundleRelease
```

The AAB will be at: `android/app/build/outputs/bundle/release/app-release.aab`

## Quick Commands Reference

```bash
# Clean start
npx expo prebuild --clean

# iOS Simulator Release
npx expo run:ios --configuration Release

# iOS Device Release
npx expo run:ios --device --configuration Release

# Android Release APK
cd android && ./gradlew assembleRelease

# Android Release AAB (Play Store)
cd android && ./gradlew bundleRelease

# EAS Local Build (iOS)
eas build --platform ios --profile production --local

# EAS Local Build (Android)
eas build --platform android --profile production --local
```

## Troubleshooting

### iOS Build Issues

**Pods not found:**
```bash
cd ios
pod install --repo-update
cd ..
```

**Signing errors:**
- Open `ios/buildtrack.xcworkspace` in Xcode
- Go to Signing & Capabilities
- Select your development team
- Ensure bundle identifier matches: `com.buildtrack.app`

**Build fails:**
```bash
# Clean build
cd ios
xcodebuild clean
rm -rf build/
pod deintegrate
pod install
cd ..
```

### Android Build Issues

**Gradle errors:**
```bash
cd android
./gradlew clean
cd ..
```

**SDK not found:**
- Open Android Studio
- Go to SDK Manager
- Install required SDK versions

### General Issues

**Clear Expo cache:**
```bash
npx expo start --clear
```

**Reinstall dependencies:**
```bash
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps
```

**Clean prebuild:**
```bash
npx expo prebuild --clean
```

## Build Outputs

### iOS:
- **Simulator**: Built app runs directly on simulator
- **Device**: `.app` file in `ios/build/Build/Products/Release-iphoneos/`
- **Archive**: `.ipa` file (created via Xcode → Archive → Export)

### Android:
- **APK**: `android/app/build/outputs/apk/release/app-release.apk`
- **AAB**: `android/app/build/outputs/bundle/release/app-release.aab`

## Notes

1. **First time**: Always run `npx expo prebuild` first to generate native code
2. **Signing**: iOS requires Apple Developer account for device builds
3. **Legacy peer deps**: Already configured in `eas.json` for EAS builds
4. **CocoaPods**: Version 1.16.1 is specified in `eas.json`
5. **Auto-increment**: Production builds auto-increment version numbers

## Recommended Workflow

For development and testing:
```bash
npx expo prebuild
npx expo run:ios --configuration Release
```

For distribution (TestFlight/Play Store):
```bash
eas build --platform ios --profile production
eas build --platform android --profile production
```

This uses EAS cloud build which handles signing and distribution automatically.

