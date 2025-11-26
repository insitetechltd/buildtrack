# Android Build Script

This script automates the Android build process for the Insite App, based on the successful build configuration that resolved Kotlin/KSP compatibility issues.

## Quick Start

```bash
# Build APK only
./build-android.sh

# Build and install on emulator
./build-android.sh --install

# Clean build and install
./build-android.sh --clean --install

# Build and install on specific emulator
./build-android.sh --install --emulator emulator-5556
```

## What the Script Does

1. **Validates environment** - Checks for required files and directories
2. **Cleans build** (optional) - Removes previous build artifacts
3. **Runs Expo prebuild** - Regenerates native Android code with `expo prebuild --platform android --clean`
4. **Builds release APK** - Compiles the release APK using Gradle (`./gradlew assembleRelease`)
5. **Installs on emulator** (optional) - Installs and launches the app on the specified emulator

## Prerequisites

- Node.js and npm installed
- Android SDK and Gradle configured
- Expo CLI installed (`npm install -g expo-cli` or use `npx expo`)
- Android emulator running (if using `--install`)

## Configuration

The script uses these default settings:
- **Emulator ID**: `emulator-5554`
- **APK Location**: `android/app/build/outputs/apk/release/app-release.apk`
- **Package Name**: `com.buildtrack.app`

You can override the emulator ID using the `--emulator` flag.

## Build Configuration

The build uses the following configuration (from successful build):

- **Kotlin Version**: 2.1.20 (configured in `gradle.properties` and `app.json`)
- **KSP Version**: 2.1.20-2.0.1
- **Gradle JVM Args**: `-Xmx6144m -XX:MaxMetaspaceSize=2048m`
- **Target SDK**: 35
- **Compile SDK**: 35

## Troubleshooting

### Build Fails with Kotlin/KSP Errors

If you encounter Kotlin version mismatches:
1. Check `android/gradle.properties` - ensure `android.kotlinVersion=2.1.20`
2. Check `android/build.gradle` - ensure Kotlin version is forced to 2.1.20
3. Check `app.json` - ensure `kotlinVersion: "2.1.20"` in `expo-build-properties`

### APK Not Found

If the APK is not at the expected location:
- Check `android/app/build/outputs/apk/` for alternative locations
- Verify the build completed successfully (check for BUILD SUCCESSFUL message)

### Emulator Not Found

If the emulator is not detected:
- List available devices: `adb devices`
- Start an emulator from Android Studio
- Use `--emulator` flag to specify a different device ID

### Installation Fails

If installation fails:
- Ensure the emulator/device is connected: `adb devices`
- Uninstall previous version: `adb uninstall com.buildtrack.app`
- Try manual installation: `adb install -r android/app/build/outputs/apk/release/app-release.apk`

## Manual Build Steps

If you prefer to build manually, follow these steps:

```bash
# 1. Clean (optional)
cd android && ./gradlew clean && cd ..

# 2. Prebuild
npx expo prebuild --platform android --clean

# 3. Build
cd android && ./gradlew assembleRelease && cd ..

# 4. Install (optional)
adb install -r android/app/build/outputs/apk/release/app-release.apk

# 5. Launch (optional)
adb shell am start -n com.buildtrack.app/.MainActivity
```

## Output Files

- **Release APK**: `android/app/build/outputs/apk/release/app-release.apk`
- **Debug APK**: `android/app/build/outputs/apk/debug/app-debug.apk` (if built separately)

## Notes

- The script performs a clean prebuild each time to ensure native code is up to date
- The release APK is a standalone build that includes the JavaScript bundle
- The app runs without requiring a Metro development server
- Build time is typically 4-6 minutes depending on your system

## Related Files

- `android/gradle.properties` - Gradle and Kotlin configuration
- `android/build.gradle` - Top-level build configuration
- `app.json` - Expo build properties
- `package.json` - Dependencies and scripts

