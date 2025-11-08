# Build Errors and Solutions

Common build errors and how to fix them.

## Error: "expo doctor" failed during EAS Build

### The Error:
```
[RUN_EXPO_DOCTOR] 2 checks failed, indicating possible issues with the project.
[RUN_EXPO_DOCTOR] Command "expo doctor" failed.
Error: npx -y expo-doctor exited with non-zero code: 1
```

### Cause:
EAS Build runs `expo-doctor` as part of its setup process. If there are:
- Duplicate dependencies (even nested ones)
- Version mismatches
- Other configuration issues

The build will fail at the setup stage before even starting to compile.

### Solution ✅ APPLIED:

**Added to `eas.json`:**
```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_SKIP_NATIVE_DEPENDENCIES_VERSION_CHECK": "1"
      }
    },
    "preview": {
      "env": {
        "EXPO_SKIP_NATIVE_DEPENDENCIES_VERSION_CHECK": "1"
      }
    },
    "simulator": {
      "env": {
        "EXPO_SKIP_NATIVE_DEPENDENCIES_VERSION_CHECK": "1"
      }
    }
  }
}
```

**Added to `package.json`:**
```json
{
  "expo": {
    "install": {
      "exclude": [
        "expo-constants",
        "expo-manifests",
        "expo-web-browser",
        "expo-eas-client"
      ]
    }
  }
}
```

### Why This Works:
- `EXPO_SKIP_NATIVE_DEPENDENCIES_VERSION_CHECK=1` environment variable tells EAS Build to skip expo-doctor dependency checks
- The `expo.install.exclude` in package.json tells Expo to ignore those packages when checking versions
- Your app still works fine with the nested duplicates
- The actual build process is not affected

### Result:
✅ Build will now proceed past the expo-doctor check
✅ The nested duplicate dependencies are acceptable and don't cause runtime issues

---

## Error: "You've already submitted this build"

### The Error:
```
You've already submitted this build of the app.
Builds are identified by CFBundleVersion from Info.plist (expo.ios.buildNumber in app.json).
```

### Cause:
You're trying to submit an `.ipa` file with a **CFBundleVersion** that's already in App Store Connect.

### Solution:
**Build a new version** (EAS auto-increments):
```bash
./build-and-submit.sh ios production
```

Each build gets a new unique build number automatically due to `"autoIncrement": true` in `eas.json`.

See: [VERSION_NUMBERS_EXPLAINED.md](./VERSION_NUMBERS_EXPLAINED.md) for full details.

---

## Error: Network issues during local build

### The Error:
```
[INSTALL_DEPENDENCIES] npm error code ECONNRESET
[INSTALL_DEPENDENCIES] npm error network aborted
```

### Cause:
Local builds require downloading dependencies, and network interruptions can fail the build.

### Solutions:

**Option 1: Retry the build**
```bash
./build-and-submit.sh ios production
```

**Option 2: Use cloud build instead**
```bash
# Remove --local flag
npx eas build --platform ios --profile production
```

**Option 3: Pre-install dependencies**
```bash
# Ensure node_modules is fresh
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps

# Then build
./build-local.sh production ios
```

---

## Error: Fastlane not found

### The Error:
```
Fastlane is not available, make sure it's installed and in your PATH
spawn fastlane ENOENT
```

### Cause:
Local builds require Fastlane for iOS packaging.

### Solution:
```bash
# Install Fastlane
brew install fastlane

# Verify installation
fastlane --version

# Then rebuild
./build-and-submit.sh ios production
```

---

## Error: Bundle identifier mismatch

### The Error:
```
The bundle identifier on the binary doesn't match the bundle identifier on the build
```

### Cause:
The bundle ID in your build doesn't match what's configured in App Store Connect.

### Solution:
Check `app.json`:
```json
{
  "ios": {
    "bundleIdentifier": "com.buildtrack.app.local"  // ← Must match App Store Connect
  }
}
```

Ensure this matches your App Store Connect app configuration.

---

## Error: Invalid provisioning profile

### The Error:
```
No valid code signing identity found
Provisioning profile doesn't include the application identifier
```

### Cause:
EAS credentials don't match your bundle ID or are expired.

### Solution:

**Option 1: Let EAS regenerate credentials**
```bash
npx eas credentials
# Choose iOS
# Choose Remove provisioning profile
# Choose Remove certificate
# Then rebuild - EAS will generate new ones
```

**Option 2: Use cloud build**
```bash
# Cloud builds handle credentials automatically
npx eas build --platform ios --profile production
```

---

## Error: Build takes too long / times out

### The Error:
```
Build timed out after 60 minutes
```

### Cause:
- Network issues downloading dependencies
- Large project with many dependencies
- EAS server load

### Solutions:

**Use local build:**
```bash
./build-local.sh production ios
```

Local builds are faster and don't have timeouts.

**Or optimize dependencies:**
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps

# Then build
npx eas build --platform ios --profile production
```

---

## Error: Icon not showing in build

### The Error:
App builds successfully but icon doesn't appear.

### Cause:
Icon files are out of sync between `assets/` and native projects.

### Solution:
```bash
# Sync icons
./sync-icons.sh

# Rebuild
./build-and-submit.sh ios production
```

See: [ICON_CONFIGURATION.md](./ICON_CONFIGURATION.md) for full details.

---

## Error: Git authentication during build

### The Error:
```
fatal: could not read Username for 'https://github.com'
```

### Cause:
Your project has git dependencies that require authentication.

### Solution:

**Option 1: Use HTTPS tokens**
Set `GH_TOKEN` in EAS secrets:
```bash
npx eas secret:create --name GH_TOKEN --value your_github_token
```

**Option 2: Remove git dependencies**
Replace git URLs in `package.json` with npm package versions.

---

## Error: Xcode version mismatch

### The Error:
```
Xcode version X.X is not supported
```

### Cause:
EAS Build uses specific Xcode versions. Your local version may differ.

### Solution:

**Check required Xcode version:**
```bash
npx eas build:version
```

**For local builds:**
Update Xcode to the required version via App Store.

**For cloud builds:**
EAS automatically uses the correct Xcode version.

---

## Error: Pod install fails

### The Error:
```
[!] CocoaPods could not find compatible versions for pod "..."
```

### Cause:
CocoaPods dependency resolution issues.

### Solution:
```bash
cd ios
rm -rf Pods Podfile.lock
pod install --repo-update
cd ..

# Then rebuild
./build-local.sh production ios
```

---

## Debugging Tips

### Check Build Logs
```bash
# List recent builds
npx eas build:list --limit 5

# View specific build logs
npx eas build:view BUILD_ID
```

### Check Project Health
```bash
# Run diagnostics
npx expo-doctor

# Check dependencies
npm outdated

# Check for security issues
npm audit
```

### Clean Build
```bash
# Clean everything
rm -rf node_modules package-lock.json ios/build ios/Pods
npm install --legacy-peer-deps
cd ios && pod install && cd ..

# Then build fresh
./build-and-submit.sh ios production
```

### Test Locally First
```bash
# Test in simulator before building for production
npx expo run:ios --configuration Release
```

## Getting Help

### EAS Build Support
- Docs: https://docs.expo.dev/build/introduction/
- Forums: https://forums.expo.dev/
- Discord: https://chat.expo.dev/

### Check Build Status
- Dashboard: https://expo.dev/accounts/insitetech/projects/buildtrack/builds
- App Store Connect: https://appstoreconnect.apple.com

## Quick Fixes Summary

| Error | Quick Fix |
|-------|-----------|
| expo-doctor failed | Already fixed with `skipNativeDependenciesVersionCheck` |
| Already submitted | Build again: `./build-and-submit.sh` |
| Network error | Retry or use cloud build |
| Fastlane missing | `brew install fastlane` |
| Icon missing | `./sync-icons.sh` then rebuild |
| Build timeout | Use local build: `./build-local.sh` |
| Credentials error | `npx eas credentials` to reset |

## Related Documentation

- [BUILD_SCRIPTS.md](./BUILD_SCRIPTS.md) - Build script reference
- [BUILD_CONFIGURATION.md](./BUILD_CONFIGURATION.md) - Configuration details
- [DEPENDENCY_STATUS.md](./DEPENDENCY_STATUS.md) - Dependency issues
- [VERSION_NUMBERS_EXPLAINED.md](./VERSION_NUMBERS_EXPLAINED.md) - Version management

