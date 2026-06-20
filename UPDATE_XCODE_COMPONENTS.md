# Update Xcode Components to Fix Build Issues

## Issues Found

1. ✅ **Simulators correctly located** at `/Volumes/KooDrive/Xcode/CoreSimulator`
2. ✅ **Symlink working** properly
3. ❌ **CoreSimulator framework outdated** (1048.0.0 vs 1051.17.7)
4. ❌ **iOS 26.2 device support missing** (only up to iOS 16.4 installed)

## Manual Update Steps

Since automated updates require your password, follow these steps:

### Step 1: Update Xcode (if available)

1. **Open App Store**
2. **Click "Updates" tab** (or search for "Xcode")
3. **If Xcode update is available**, click **"Update"**
4. **Wait for update to complete**
5. **Restart your Mac** after update

### Step 2: Install iOS 26.2 Device Support

1. **Open Xcode**
2. **Go to:** Xcode → Settings (or Preferences)
3. **Click "Platforms" tab** (or "Components" in older versions)
4. **Find "iOS 26.2"** in the list
5. **Click the download button** (cloud icon) next to it
6. **Wait for download to complete**

### Step 3: Update Command Line Tools

1. **Open Terminal**
2. **Run:**
   ```bash
   sudo softwareupdate --install "Command Line Tools for Xcode 26.2-26.2"
   ```
3. **Enter your password** when prompted
4. **Wait for installation to complete**

### Step 4: Verify Updates

After updates, verify:

```bash
# Check Xcode version
xcodebuild -version

# Check iOS SDKs
xcodebuild -showsdks | grep -i ios

# Check device support
ls -la /Applications/Xcode.app/Contents/Developer/Platforms/iPhoneOS.platform/DeviceSupport/ | grep "26"
```

### Step 5: Restart Services

After updates:

```bash
# Kill Xcode processes
killall Xcode 2>/dev/null || true
killall Simulator 2>/dev/null || true
killall com.apple.CoreSimulator.CoreSimulatorService 2>/dev/null || true

# Restart your Mac (recommended)
```

## Alternative: Use Cloud Builds

If local updates don't work or you want to build immediately:

```bash
# Build on EAS servers (no local Xcode needed)
npx eas build --platform ios --profile production
```

This bypasses all local Xcode/Simulator issues.

## Why This Happened

The issues likely occurred because:
1. **Xcode was updated** but CoreSimulator framework wasn't fully updated
2. **iOS 26.2 device support** wasn't automatically downloaded
3. **Command Line Tools** may be out of sync with Xcode version

## After Updates

Once everything is updated:

1. **Try the build again:**
   ```bash
   ./build-and-submit.sh ios production-local
   ```

2. **If it still fails**, check the error message and:
   - Verify CoreSimulator version matches Xcode
   - Ensure iOS 26.2 device support is installed
   - Check that symlink is still working

## Quick Checklist

- [ ] Xcode updated to latest version
- [ ] iOS 26.2 device support downloaded
- [ ] Command Line Tools updated
- [ ] Mac restarted
- [ ] Symlink verified: `ls -la ~/Library/Developer/CoreSimulator`
- [ ] Build tested

