# How to Remove Health Declaration from Google Play Console

## Overview

The health declaration appears in Play Console because your app uses the `ACTIVITY_RECOGNITION` permission. Since we've removed this permission from the codebase, you need to update the declaration in Play Console.

## Step-by-Step Instructions

### Method 1: Update Health Apps Declaration (Recommended)

1. **Go to Google Play Console**
   - Navigate to: https://play.google.com/console
   - Sign in with your developer account
   - Select your app: **Taskr** (com.buildtrack.app)

2. **Navigate to Health Apps Section**
   - In the left sidebar, go to: **Policy** → **App content**
   - Scroll down to find **"Health apps"** section
   - Click **"Start"** or **"Manage"** (if already started)

3. **Update the Declaration**
   - You'll see options about health features
   - Select: **"My app does not have any health features"**
   - Or: **"No, my app does not access health or fitness data"**

4. **Save Changes**
   - Click **"Save"** to apply the changes
   - The declaration will be updated

### Method 2: Remove via Sensitive Permissions

1. **Go to Sensitive Permissions**
   - Navigate to: **Policy** → **App content** → **Sensitive permissions**
   - Or: **Policy** → **App content** → **App bundles and APKs using sensitive permissions**

2. **Find the Version with ACTIVITY_RECOGNITION**
   - Look for version **1 (1.1.2)** in the internal testing track
   - This is the old build that still has the permission

3. **Update or Remove**
   - You can't directly remove it from an old version
   - **Solution**: Submit a new build (version 5+) without the permission
   - The new build will automatically not show the health declaration

## Important Notes

### Why the Declaration Still Shows

- The Play Console screenshot shows **version 1 (1.1.2)** which is an **old build**
- This build was created **before** we removed `expo-sensors`
- Old builds cannot be modified - you must submit a new version

### What We've Done

✅ **Removed from codebase:**
- `expo-sensors` removed from `package.json`
- `ACTIVITY_RECOGNITION` explicitly removed in `AndroidManifest.xml`
- Current builds (version 5+) don't have the permission

✅ **Verified:**
- Current AAB/APK: No `ACTIVITY_RECOGNITION` permission
- New builds will not trigger health declaration

### Next Steps

1. **Submit a new build** (version 5 or higher) to Play Console
2. **The new build will NOT have ACTIVITY_RECOGNITION**
3. **The health declaration will automatically disappear** for the new version
4. **Update the Health Apps declaration** to "No health features" (Method 1 above)

## Verification

After submitting a new build, verify the permission is removed:

1. Go to: **Policy** → **App content** → **App bundles and APKs using sensitive permissions**
2. Check the new version (5+)
3. It should **NOT** show `ACTIVITY_RECOGNITION`
4. The health declaration should no longer be required

## Troubleshooting

### If the declaration still appears after submitting a new build:

1. **Wait 24-48 hours** - Play Console may take time to process
2. **Check the new version** - Make sure you're looking at version 5+, not version 1
3. **Verify the build** - Check that the AAB doesn't have the permission:
   ```bash
   aapt dump permissions android/app/build/outputs/bundle/release/app-release.aab | grep -i activity
   ```
   (Should return nothing)

4. **Contact Google Play Support** - If it persists, contact support for manual removal

## Summary

- **Old version (1)**: Still shows ACTIVITY_RECOGNITION (cannot be changed)
- **New versions (5+)**: Will NOT have ACTIVITY_RECOGNITION
- **Action needed**: Submit new build + update Health Apps declaration to "No health features"

