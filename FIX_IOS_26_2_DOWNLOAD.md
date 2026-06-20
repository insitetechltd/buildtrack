# Fix iOS 26.2 Download and CoreSimulator Issues

## Current Status

✅ **iOS 26.2 is available** in Xcode Components
⚠️ **iOS 26.2 needs to be downloaded** (8.39 GB)
❌ **CoreSimulator version mismatch** (1048.0.0 vs 1051.17.7)
❌ **Build failing** at "Run fastlane" step

## Immediate Action: Download iOS 26.2

1. **In the Xcode Components window you have open:**
   - Find **"iOS 26.2"** (8.39 GB)
   - Click the **"Get"** button
   - Wait for download to complete (~8.39 GB)
   - This may take 10-30 minutes depending on your internet speed

2. **After download completes:**
   - iOS 26.2 will show as "Installed"
   - This may also update CoreSimulator framework

## CoreSimulator Version Mismatch

The error shows:
- **Current CoreSimulator:** 1048.0.0
- **Required:** 1051.17.7

### Why This Happens

This mismatch occurs when:
- Xcode 26.2 expects a newer CoreSimulator version
- CoreSimulator framework wasn't updated with Xcode
- Simulators were moved but framework version is stale

### Solutions

#### Option 1: Download iOS 26.2 First
Installing iOS 26.2 may automatically update CoreSimulator to the correct version.

#### Option 2: Update Xcode Completely
1. **Check App Store** for Xcode updates
2. **Install any available updates**
3. **Restart Mac** after update

#### Option 3: Use Cloud Builds (Workaround)
If local builds continue to fail:

```bash
# Build on EAS servers (bypasses local issues)
npx eas build --platform ios --profile production
```

This doesn't require local Xcode/Simulator setup.

## After Downloading iOS 26.2

1. **Verify installation:**
   ```bash
   xcodebuild -showsdks | grep -i "ios 26.2"
   ```

2. **Check device support:**
   ```bash
   ls -la /Applications/Xcode.app/Contents/Developer/Platforms/iPhoneOS.platform/DeviceSupport/ | grep "26.2"
   ```

3. **Try build again:**
   ```bash
   ./build-and-submit.sh ios production-local
   ```

## If CoreSimulator Issue Persists

If after downloading iOS 26.2 the CoreSimulator version is still wrong:

1. **Check Xcode version:**
   ```bash
   xcodebuild -version
   ```
   Should show: Xcode 26.2

2. **Check for Xcode updates:**
   - App Store → Updates
   - Install any Xcode updates

3. **Restart Xcode services:**
   ```bash
   killall Xcode 2>/dev/null || true
   killall Simulator 2>/dev/null || true
   killall com.apple.CoreSimulator.CoreSimulatorService 2>/dev/null || true
   ```

4. **Restart your Mac**

## Build Error Details

The build is failing at:
- **Step:** "Run fastlane"
- **Error:** CoreSimulator version mismatch
- **Destination:** "generic:1, platform:iOS"

This suggests the build is trying to use a generic iOS destination but CoreSimulator can't handle it due to version mismatch.

## Quick Fix Steps

1. ✅ **Download iOS 26.2** (click "Get" in Components window)
2. ⏳ **Wait for download** (~8.39 GB)
3. 🔄 **Restart Xcode** after download
4. 🔄 **Restart Mac** (recommended)
5. 🧪 **Try build again**

## Alternative: Skip Local Build

If you need to build immediately:

```bash
# Use cloud builds (no local Xcode issues)
npx eas build --platform ios --profile production
```

Then submit after build completes:
```bash
npx eas submit --platform ios --latest --profile production
```

