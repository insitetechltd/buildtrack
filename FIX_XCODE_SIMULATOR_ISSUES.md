# Fix Xcode/Simulator Issues After Move to /Volumes/KooDrive

## Current Situation

✅ **Simulators are correctly located:**
- Simulators moved to: `/Volumes/KooDrive/Xcode/CoreSimulator`
- Symlink exists: `~/Library/Developer/CoreSimulator` → `/Volumes/KooDrive/Xcode/CoreSimulator`
- Xcode 26.2 is installed
- iOS 26.2 SDK is installed

❌ **Issues:**
1. **CoreSimulator framework version mismatch:**
   - Current: 1048.0.0
   - Required: 1051.17.7
   - This is causing build failures

2. **iOS 26.2 device support missing:**
   - Device support files not found in DeviceSupport folder
   - Needed for device builds (not just simulator)

## Root Cause

The CoreSimulator framework version doesn't match what Xcode 26.2 expects. This can happen when:
- Xcode was updated but CoreSimulator framework wasn't
- Simulators were moved but framework wasn't updated
- Version mismatch between Xcode and CoreSimulator

## Solutions

### Solution 1: Update Xcode Completely (Recommended)

1. **Open App Store**
2. **Check for Xcode updates**
3. **Install any available updates**
4. **Restart your Mac** after update

This will update both Xcode and CoreSimulator framework to matching versions.

### Solution 2: Reinstall CoreSimulator Components

If Xcode is already up to date, you may need to reinstall CoreSimulator:

1. **Open Xcode**
2. **Go to:** Xcode → Settings → Platforms (or Components)
3. **Check for any updates or reinstall options**
4. **Download/Reinstall iOS 26.2 components**

### Solution 3: Download iOS 26.2 Device Support

The build error mentioned iOS 26.2 device support is missing:

1. **Open Xcode**
2. **Xcode → Settings → Platforms**
3. **Find iOS 26.2**
4. **Click Download** if available
5. **Wait for download to complete**

### Solution 4: Use Cloud Builds (Workaround)

If local builds continue to fail, use EAS cloud builds:

```bash
# Build on EAS servers (no local Xcode issues)
npx eas build --platform ios --profile production
```

This bypasses all local Xcode/Simulator issues.

## Verification Steps

After fixing, verify:

1. **Check CoreSimulator version:**
   ```bash
   /usr/libexec/PlistBuddy -c "Print CFBundleShortVersionString" \
     /Applications/Xcode.app/Contents/Developer/Library/Frameworks/CoreSimulator.framework/Versions/A/Resources/Info.plist
   ```
   Should show: 1051.17.7 or higher

2. **Check iOS 26.2 device support:**
   ```bash
   ls -la /Applications/Xcode.app/Contents/Developer/Platforms/iPhoneOS.platform/DeviceSupport/ | grep "26"
   ```
   Should show iOS 26.2 directory

3. **Test build:**
   ```bash
   ./build-and-submit.sh ios production-local
   ```

## Quick Fix Commands

### Update Command Line Tools
```bash
# This may require password
softwareupdate --install "Command Line Tools for Xcode 26.2-26.2"
```

### Verify Symlink
```bash
# Check if symlink is correct
ls -la ~/Library/Developer/CoreSimulator
# Should show: -> /Volumes/KooDrive/Xcode/CoreSimulator
```

### Restart Xcode Services
```bash
# Kill any running Xcode processes
killall Xcode Simulator 2>/dev/null || true
killall com.apple.CoreSimulator.CoreSimulatorService 2>/dev/null || true
```

## Expected Outcome

After fixing:
- ✅ CoreSimulator version matches Xcode version
- ✅ iOS 26.2 device support installed
- ✅ Local builds work without errors
- ✅ Simulators accessible from /Volumes/KooDrive

## If Issues Persist

1. **Check Xcode version compatibility:**
   - Ensure Xcode 26.2 is fully updated
   - Check App Store for any pending updates

2. **Recreate symlink (if needed):**
   ```bash
   # Remove old symlink
   rm ~/Library/Developer/CoreSimulator
   # Create new symlink
   ln -s /Volumes/KooDrive/Xcode/CoreSimulator ~/Library/Developer/CoreSimulator
   ```

3. **Use cloud builds as fallback:**
   - EAS cloud builds don't require local Xcode setup
   - They handle all dependencies automatically

