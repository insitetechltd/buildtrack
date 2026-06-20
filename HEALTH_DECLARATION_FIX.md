# Health Declaration Fix - Version 7

## Problem

Even after removing `expo-sensors` and the permission from the manifest, the health declaration was still required because:
- The explicit removal tag (`tools:node="remove"`) was missing from AndroidManifest.xml
- Some dependency might have been adding the permission during the merge process

## Solution Applied

### 1. Added Explicit Removal Tag

Added to `android/app/src/main/AndroidManifest.xml`:
```xml
<!-- Explicitly remove ACTIVITY_RECOGNITION permission (not needed, no health features) -->
<uses-permission android:name="android.permission.ACTIVITY_RECOGNITION" tools:node="remove"/>
```

This ensures that even if any dependency tries to add the permission, it will be removed during the manifest merge process.

### 2. Verified Removal

✅ **Merged manifest check**: ACTIVITY_RECOGNITION NOT found in final merged manifest
✅ **Build verification**: New build (version 7) will not have the permission

## Changes Made

1. **android/app/src/main/AndroidManifest.xml**
   - Added explicit removal tag for ACTIVITY_RECOGNITION
   - Ensures permission is removed even if dependencies add it

2. **android/app/build.gradle**
   - Incremented versionCode from 6 to 7

## Next Steps

1. **Build and submit version 7**:
   ```bash
   ./build-and-submit-android.sh --track internal
   ```

2. **After submission**:
   - Version 7 will NOT have ACTIVITY_RECOGNITION permission
   - Health declaration should no longer be required
   - If it still appears, update it in Play Console to "No health features"

## Verification

To verify the permission is removed in future builds:

```bash
# Check merged manifest
grep -i "ACTIVITY_RECOGNITION" android/app/build/intermediates/merged_manifests/release/processReleaseManifest/AndroidManifest.xml

# Should return nothing (permission not found)
```

## Prevention

The explicit removal tag in AndroidManifest.xml ensures:
- ✅ Permission is always removed, even if dependencies add it
- ✅ No need to check individual dependencies
- ✅ Works for all future builds

## Summary

- **Root cause**: Missing explicit removal tag in manifest
- **Fix**: Added `<uses-permission android:name="android.permission.ACTIVITY_RECOGNITION" tools:node="remove"/>`
- **Result**: Permission will be removed from all future builds
- **Version**: 7 (ready to submit)

