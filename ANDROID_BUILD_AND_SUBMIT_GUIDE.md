# Android Build and Submit Guide

This guide explains how to build an Android App Bundle (AAB) locally and submit it to Google Play Store using EAS.

## Quick Start

```bash
# Build AAB locally and submit to Play Store (internal track)
./build-and-submit-android.sh

# Submit to production track
./build-and-submit-android.sh --track production

# Clean build and submit
./build-and-submit-android.sh --clean

# Skip prebuild (faster if no native code changes)
./build-and-submit-android.sh --skip-prebuild
```

## Prerequisites

✅ **EAS CLI installed and authenticated**
```bash
npm install -g eas-cli
eas login
```

✅ **Google Service Account configured**
- Service account file: `./google-service-account.json`
- Already configured in `eas.json`

✅ **Android SDK and Gradle**
- Required for local builds
- Gradle wrapper is included in the project

✅ **App registered in Google Play Console**
- Package name: `com.buildtrack.app`
- Developer account: insite.tech.ltd@gmail.com

## Build Process

The script performs these steps:

1. **Authentication Check** - Verifies EAS login
2. **Clean Build** (optional) - Removes previous artifacts
3. **Expo Prebuild** - Regenerates native Android code
4. **Build AAB** - Compiles release AAB using Gradle
5. **Submit to Play Store** - Uploads via EAS Submit

## Script Options

| Option | Description |
|--------|-------------|
| `--clean` / `-c` | Perform clean build (removes previous artifacts) |
| `--skip-prebuild` / `-s` | Skip expo prebuild step (faster if native code unchanged) |
| `--track TRACK` / `-t` | Submit track: `internal`, `alpha`, `beta`, or `production` |
| `--profile PROFILE` / `-p` | EAS profile to use (default: `production`) |
| `--help` / `-h` | Show help message |

## Submit Tracks

Choose the appropriate track for your release:

- **internal** - Internal testing (fastest, limited testers)
- **alpha** - Alpha testing (closed testing)
- **beta** - Beta testing (open or closed)
- **production** - Production release (public)

## Manual Steps

If you prefer to build and submit manually:

### 1. Build AAB Locally

```bash
# Option A: Using the script (recommended)
./build-and-submit-android.sh --skip-prebuild

# Option B: Manual build
npx expo prebuild --platform android --clean
cd android
./gradlew bundleRelease
cd ..
```

The AAB will be at: `android/app/build/outputs/bundle/release/app-release.aab`

### 2. Submit via EAS

```bash
# Submit with service account (automated)
eas submit --platform android --path android/app/build/outputs/bundle/release/app-release.aab --track internal --profile production

# Submit interactively (will open browser)
eas submit --platform android --path android/app/build/outputs/bundle/release/app-release.aab --track internal
```

## Version Management

### Version Code

The version code must increment for each release. Currently configured in:
- `android/app/build.gradle`: `versionCode 1`

**Important**: You need to increment this manually before building. The script does NOT auto-increment version codes.

```gradle
// android/app/build.gradle
defaultConfig {
    versionCode 2  // Increment this for each release
    versionName "1.1.2"
}
```

### Version Name

Version name is managed in `app.json`:
- `app.json`: `"version": "1.1.2"`

## Troubleshooting

### Build Fails

**Issue**: Build fails with Gradle errors
```bash
# Try a clean build
./build-and-submit-android.sh --clean
```

**Issue**: Native code out of sync
```bash
# Don't skip prebuild
./build-and-submit-android.sh
```

### Submission Fails

**Issue**: "App not found in Play Console"
- Ensure app is created in [Google Play Console](https://play.google.com/console)
- Verify package name matches: `com.buildtrack.app`

**Issue**: "Service account not authorized"
- Check service account has access in Play Console → Setup → API access
- Verify `google-service-account.json` file exists and is valid

**Issue**: "Version code already exists"
- Increment `versionCode` in `android/app/build.gradle`
- Rebuild the AAB

**Issue**: "EAS not authenticated"
```bash
eas login
```

### AAB Not Found

If the script can't find the AAB:
1. Check build completed successfully
2. Verify location: `android/app/build/outputs/bundle/release/app-release.aab`
3. Try manual build to see actual output location

## Verification

After submission:

1. **Check Play Console** → Release → [Your Track]
2. **Verify AAB uploaded** - Check version code and name
3. **Add Release Notes** - Describe what's new
4. **Review and Rollout** - Start rollout or publish

## Configuration Files

- **EAS Config**: `eas.json`
  - Submit profile: `production`
  - Default track: `internal`
  - Service account: `./google-service-account.json`

- **App Config**: `app.json`
  - Package: `com.buildtrack.app`
  - Version: `1.1.2`

- **Build Config**: `android/app/build.gradle`
  - Version Code: `1` (must increment manually)
  - Version Name: `1.1.2`

## Workflow Example

```bash
# 1. Update version code in android/app/build.gradle (if needed)
# versionCode 2

# 2. Build and submit to internal testing
./build-and-submit-android.sh --track internal

# 3. Test the internal release

# 4. When ready, submit to production
./build-and-submit-android.sh --track production
```

## Notes

- **Build Time**: Typically 4-8 minutes depending on your system
- **AAB Size**: Usually 30-60 MB (Play Store generates optimized APKs)
- **Version Code**: Must always increment (Play Store requirement)
- **Version Name**: Can stay the same for patches

## Resources

- [EAS Submit Documentation](https://docs.expo.dev/submit/introduction/)
- [Google Play Console](https://play.google.com/console)
- [AAB vs APK](https://developer.android.com/guide/app-bundle)

---

**Developer Account**: insite.tech.ltd@gmail.com  
**Package Name**: com.buildtrack.app  
**AAB Location**: android/app/build/outputs/bundle/release/app-release.aab

