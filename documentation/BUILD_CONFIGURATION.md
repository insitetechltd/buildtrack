# Build Configuration

This document explains the build configuration for the BuildTrack app.

## Local Builds Configuration

To build locally, use the `--local` flag with any build profile.

### Quick Local Builds Using Helper Scripts

```bash
# Production build only
./build-local.sh production ios

# Preview build
./build-local.sh preview ios

# Simulator build
./build-local.sh simulator ios

# Android build
./build-local.sh production android

# Build AND submit to TestFlight (all-in-one)
./build-and-submit.sh ios production
```

### Build Profiles

#### Production
```bash
# Builds locally on your Mac
npx eas build --platform ios --profile production --local
```
- Distribution: App Store
- Auto-increments build number
- Uses remote credentials from EAS

#### Preview
```bash
# Builds locally for internal testing
npx eas build --platform ios --profile preview --local
```
- Distribution: Internal (TestFlight)
- Uses remote credentials

#### Simulator
```bash
# Builds locally for iOS Simulator
npx eas build --platform ios --profile simulator --local
```
- Distribution: Internal
- For simulator only (no signing required)

## Configuration Details

### eas.json
- `appVersionSource`: "remote" (EAS manages version numbers)
- CocoaPods version: 1.16.1
- Legacy peer deps enabled
- Use `--local` flag for local builds

### app.json
- Bundle ID: `com.buildtrack.app.local`
- Version: 1.1.2
- Build numbers are auto-incremented by EAS (stored remotely)

### Info.plist
- CFBundleVersion: Managed by EAS (currently at 26+)
- CFBundleShortVersionString: 1.1.2

## Build Commands

### Local Builds (Use --local flag)
```bash
# iOS Production
npx eas build --platform ios --profile production --local

# iOS Preview
npx eas build --platform ios --profile preview --local

# iOS Simulator
npx eas build --platform ios --profile simulator --local

# Android Production
npx eas build --platform android --profile production --local
```

### Or Use the Helper Scripts
```bash
# Quick production build
./build-local.sh

# Specify profile and platform
./build-local.sh preview ios
./build-local.sh production android

# Build AND submit in one command
./build-and-submit.sh ios production
```

### Cloud Builds (Default without --local)
```bash
# Build on EAS servers instead of locally
npx eas build --platform ios --profile production
```

### Submit to TestFlight/App Store
```bash
# Submit latest build to TestFlight
npx eas submit --platform ios --latest

# Or specify a build ID
npx eas submit --platform ios --id BUILD_ID
```

### Manual Xcode Build (Alternative)
```bash
# Open in Xcode
open ios/BuildTrack.xcworkspace

# Then: Product → Archive → Distribute
```

## Requirements for Local Builds

- macOS with Xcode installed
- Fastlane installed: `brew install fastlane`
- EAS CLI: `npm install -g eas-cli`
- Apple Developer account credentials configured

## Build Output

Local builds will create `.ipa` files in your project directory that can be:
- Submitted to TestFlight/App Store
- Installed on devices via Xcode
- Distributed via enterprise distribution

## Troubleshooting

### If build requires credentials
EAS will prompt for Apple credentials interactively during local builds.

### If you want cloud builds instead
Simply omit the `--local` flag:
```bash
npx eas build --platform ios --profile production
```

### Version conflicts
Build numbers are auto-incremented by EAS. If you get version conflicts:
1. Check current version: `npx eas build:list`
2. EAS will automatically increment to the next available number

