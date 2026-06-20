# Motorola E(7) Compatibility Issue - Fix Guide

## Problem

The Google Play Store is showing that the app is not compatible with Motorola E(7) devices, even though:
- Motorola E(7) runs Android 10 (API 29)
- App's minSdkVersion is 24 (Android 7.0)
- The device should be compatible

## Common Causes

### 1. **Architecture Mismatch (Most Likely)**

The Motorola E(7) uses **ARMv7 (32-bit)** architecture. If your app only includes 64-bit native libraries (arm64-v8a), it won't be compatible.

**Check your AAB:**
- The AAB might only include `arm64-v8a` libraries
- Motorola E(7) needs `armeabi-v7a` (32-bit ARM) support

### 2. **Missing Hardware Feature Declarations**

If your manifest declares features as required (not optional), devices without those features will be excluded.

### 3. **Play Console Device Filtering**

The Play Console might have device-specific exclusions configured.

## Solutions

### Solution 1: Ensure 32-bit ARM Support (Recommended)

The Motorola E(7) uses ARMv7 (32-bit). You need to ensure your app includes 32-bit native libraries.

**Check if 32-bit support is included:**

1. **Inspect your AAB:**
   ```bash
   # Extract and check native libraries
   unzip -l android/app/build/outputs/bundle/release/app-release.aab | grep -i "lib/.*/lib"
   ```

2. **Look for these directories in the AAB:**
   - `lib/armeabi-v7a/` - 32-bit ARM (needed for Motorola E(7))
   - `lib/arm64-v8a/` - 64-bit ARM
   - `lib/x86/` - 32-bit x86
   - `lib/x86_64/` - 64-bit x86

**If `armeabi-v7a` is missing:**

The issue is likely that React Native/Expo is only building 64-bit libraries. You need to ensure 32-bit support is included.

### Solution 2: Check Play Console Device Catalog

1. Go to [Google Play Console](https://play.google.com/console)
2. Navigate to: **Release** → **Testing** → **Internal testing** (or your active track)
3. Click on your version (version 9)
4. Scroll to **"Device catalog"** or **"Supported devices"**
5. Search for "Motorola E(7)" or "Moto E7"
6. Check if it's marked as incompatible and see the reason

### Solution 3: Verify No Restrictive Feature Declarations

Check your `AndroidManifest.xml` for any `<uses-feature>` tags that might exclude the device:

```xml
<!-- If you have this, it might exclude devices without camera -->
<uses-feature android:name="android.hardware.camera" android:required="true"/>
```

**Fix:** Make features optional if they're not critical:
```xml
<uses-feature android:name="android.hardware.camera" android:required="false"/>
```

### Solution 4: Check Build Configuration

Verify your `build.gradle` doesn't exclude 32-bit architectures:

```gradle
android {
    defaultConfig {
        ndk {
            abiFilters 'armeabi-v7a', 'arm64-v8a', 'x86', 'x86_64'
        }
    }
}
```

**If you see:**
```gradle
abiFilters 'arm64-v8a'  // Only 64-bit - this excludes Motorola E(7)!
```

**Change to:**
```gradle
abiFilters 'armeabi-v7a', 'arm64-v8a', 'x86', 'x86_64'
```

## ✅ Verification Results

**Good News:** Your AAB (version 9) **DOES include** 32-bit ARM support:
- ✅ `base/lib/armeabi-v7a/` - Contains all required native libraries
- ✅ Libraries present: `libcesdk-android.so`, `libexpo-modules-core.so`, `libreactnative.so`, etc.

**Conclusion:** Architecture support is correct. The issue is likely in Play Console configuration or device filtering.

## Immediate Actions

### Step 1: Check Play Console Device Catalog (CRITICAL)

This is the most important step to find the exact reason:

1. Go to [Google Play Console](https://play.google.com/console)
2. Navigate to: **Release** → **Testing** → **Internal testing** → **Version 9**
3. Scroll to **"Device catalog"** or **"Supported devices"**
4. Search for "Motorola E(7)" or "Moto E7"
5. **Click on the device** to see the exact incompatibility reason

Common reasons you might see:
- "Device excluded by country/region"
- "Device excluded by device filter"
- "Missing required feature: [feature name]"
- "App not available in your country"

### Step 2: Verify AAB Architecture Support

Run this command to check what architectures are in your AAB:

```bash
cd "/Volumes/KooDrive/Insite App"
bundletool dump manifest --bundle=android/app/build/outputs/bundle/release/app-release.aab | grep -i "native"
```

Or extract and check:
```bash
unzip -l android/app/build/outputs/bundle/release/app-release.aab | grep "lib/"
```

### Step 3: Rebuild with 32-bit Support (If Needed)

If `armeabi-v7a` is missing, you may need to:

1. **Check Expo/React Native configuration** - Ensure it's not excluding 32-bit
2. **Rebuild the AAB** with 32-bit support included
3. **Resubmit to Play Store**

## Motorola E(7) Specifications

- **Android Version:** Android 10 (API 29) ✅ Compatible
- **Architecture:** ARMv7 (32-bit) - **This is the likely issue**
- **RAM:** 2GB
- **Storage:** 32GB

## Next Steps

1. **Check Play Console** for the exact incompatibility reason
2. **Verify AAB architecture support** (check for `armeabi-v7a`)
3. **If 32-bit is missing**, rebuild with 32-bit support
4. **Resubmit version 10** with the fix

## Testing

After fixing, test on:
- Motorola E(7) (if available)
- Another ARMv7 device
- Use Play Console's pre-launch report to verify compatibility

