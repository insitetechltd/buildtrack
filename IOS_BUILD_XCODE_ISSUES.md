# iOS Build Issues - Xcode/Simulator Problems

## Current Errors

1. **CoreSimulator version mismatch:**
   - Current: 1048.0.0
   - Required: 1051.17.7
   - Error: "CoreSimulator is out of date"

2. **iOS 26.2 not installed:**
   - Error: "iOS 26.2 is not installed. Please download and install the platform from Xcode > Settings > Components"

3. **expo-doctor warnings:**
   - 61 packages out of date
   - Major version mismatches in dependencies

## Solutions

### Option 1: Fix Xcode/Simulator Issues (Recommended for Local Builds)

1. **Update Xcode:**
   - Open **App Store**
   - Check for Xcode updates
   - Install the latest version
   - This will update CoreSimulator automatically

2. **Install iOS 26.2 Platform:**
   - Open **Xcode**
   - Go to **Xcode** → **Settings** (or **Preferences**)
   - Click **Platforms** (or **Components**)
   - Find **iOS 26.2** and click **Download**
   - Wait for download to complete

3. **Update Command Line Tools:**
   ```bash
   sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
   sudo xcodebuild -runFirstLaunch
   ```

4. **Restart your Mac** after updates

### Option 2: Use Cloud Builds (Easier, No Local Setup)

Instead of local builds, use EAS cloud builds which don't require local Xcode setup:

```bash
# Build on EAS servers (no local Xcode needed)
npx eas build --platform ios --profile production
```

**Note:** Remove `--local` flag to use cloud builds.

### Option 3: Fix Dependency Issues (Optional)

The expo-doctor warnings won't block the build, but you can fix them:

```bash
# Check and update dependencies
npx expo install --check

# This will show what needs updating
# Then update packages as needed
```

## Quick Fix: Use Cloud Build

The fastest solution is to use EAS cloud builds:

```bash
cd "/Volumes/KooDrive/Insite App"
npx eas build --platform ios --profile production
```

This will:
- Build on EAS servers (no local Xcode needed)
- Handle all dependencies automatically
- Submit to App Store Connect after build

## After Fixing Xcode Issues

Once Xcode is updated and iOS 26.2 is installed:

```bash
# Try local build again
./build-and-submit.sh ios production-local
```

Or:

```bash
npx eas build --platform ios --profile production-local --local
```

## Current Status

- ❌ Local build failing due to Xcode/Simulator issues
- ✅ Cloud builds available (use `npx eas build --platform ios --profile production`)
- ⚠️  Dependency warnings (non-blocking but should be addressed)

