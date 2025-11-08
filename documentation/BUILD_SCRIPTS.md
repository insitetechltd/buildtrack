# Build Scripts Reference

Quick reference for the build automation scripts in this project.

## Available Scripts

### 1. `increment-build.sh` - Increment Build Number Only

Automatically increments the build number based on the last EAS build.

**Usage:**
```bash
./increment-build.sh
```

**What it does:**
1. ✅ Fetches last build number from EAS
2. ✅ Increments by 1
3. ✅ Updates `app.json`
4. ✅ Updates `Info.plist`
5. ✅ Shows new build number

**When to use:**
- Before building manually
- To skip a build number
- To fix version conflicts

---

### 2. `build-local.sh` - Build Only

Builds the app locally on your Mac without submitting.

**Usage:**
```bash
# Default: iOS production
./build-local.sh

# Specify platform and profile
./build-local.sh <profile> <platform>
```

**Examples:**
```bash
./build-local.sh production ios     # Production iOS build
./build-local.sh preview ios        # Preview iOS build
./build-local.sh simulator ios      # Simulator iOS build
./build-local.sh production android # Android production build
```

**Output:**
- `.ipa` file (iOS) or `.apk`/`.aab` file (Android) in your project directory

---

### 3. `build-and-submit.sh` - Build + Submit to TestFlight

Builds the app locally AND automatically submits it to TestFlight/App Store Connect.

**✨ NEW: Now automatically increments build number!**

**Usage:**
```bash
# Default: iOS production
./build-and-submit.sh

# Specify platform and profile
./build-and-submit.sh <platform> <profile>
```

**Examples:**
```bash
./build-and-submit.sh ios production  # Build iOS and submit to TestFlight
./build-and-submit.sh android production # Build Android and submit to Play Store
```

**What it does:**
1. ✅ Builds the app locally using EAS Build
2. ✅ **EAS auto-increments build number** (configured in eas.json)
3. ✅ Waits for build to complete
4. ✅ Automatically submits to TestFlight
5. ✅ Shows success message with next steps

**Important:** Each build creates a NEW version number automatically (autoIncrement enabled in eas.json)

**Output:**
- Build submitted to TestFlight
- Appears in App Store Connect within minutes

---

## Script Details

### Build Process

Both scripts use EAS Build with the `--local` flag:
- Runs on your Mac (not EAS cloud servers)
- Requires Fastlane installed
- Uses remote credentials from EAS
- Auto-increments build numbers

### Requirements

- macOS with Xcode installed
- Fastlane: `brew install fastlane`
- EAS CLI: `npm install -g eas-cli`
- Apple Developer account configured in EAS

### Build Times

- **iOS Production**: 5-10 minutes
- **iOS Simulator**: 3-5 minutes
- **Android**: 5-8 minutes

### Error Handling

Both scripts will:
- Stop on errors (`set -e`)
- Show clear error messages
- Exit with appropriate status codes

---

## Typical Workflows

### Development Testing
```bash
# Quick simulator build for testing
./build-local.sh simulator ios
```

### Internal Testing (TestFlight)
```bash
# Build and send to TestFlight testers
./build-and-submit.sh ios production
```

### Production Release
```bash
# 1. Build and submit to TestFlight
./build-and-submit.sh ios production

# 2. Test with TestFlight testers

# 3. Submit to App Store review via App Store Connect
```

---

## Manual Commands

If you prefer manual control:

```bash
# Build manually
npx eas build --platform ios --profile production --local

# Then submit manually
npx eas submit --platform ios --latest --profile production
```

---

## Troubleshooting

### Script won't run
```bash
# Make sure scripts are executable
chmod +x build-local.sh build-and-submit.sh
```

### Build fails with network errors
Local builds may fail with network issues. Try:
1. Check your internet connection
2. Retry the build
3. Or use cloud build: `npx eas build --platform ios --profile production`

### Submission fails with "already submitted"
The build number is already in TestFlight. The script will auto-increment on the next build.

### Apple credentials prompt
EAS will prompt for Apple credentials interactively. This is normal for local builds.

---

## Quick Reference

| Task | Command |
|------|---------|
| Increment build number | `./increment-build.sh` |
| Build only (iOS) | `./build-local.sh production ios` |
| Build + Submit (iOS) | `./build-and-submit.sh ios production` |
| Simulator build | `./build-local.sh simulator ios` |
| Android build | `./build-local.sh production android` |
| Manual build | `npx eas build --platform ios --profile production --local` |
| Manual submit | `npx eas submit --platform ios --latest` |

---

## Related Documentation

- [BUILD_CONFIGURATION.md](./BUILD_CONFIGURATION.md) - Full build configuration details
- [QUICK_BUILD_GUIDE.md](./QUICK_BUILD_GUIDE.md) - Quick build reference
- [LOCAL_BUILD_GUIDE.md](./LOCAL_BUILD_GUIDE.md) - Detailed local build instructions

