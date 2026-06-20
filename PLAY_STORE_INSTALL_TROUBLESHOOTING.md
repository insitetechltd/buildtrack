# Play Store Installation Troubleshooting - Device Shows Supported But Can't Install

## Problem

- ✅ Motorola E(7) is marked as **supported** in Play Console
- ❌ Play Store app on the device says **"not compatible"** or **"not available"**

## Common Causes & Solutions

### 1. **Version Not Published/Rolled Out (Most Likely)**

Your version 9 is submitted as **"DRAFT"** status. Draft releases are not available to users.

**Check:**
1. Go to Play Console → Release → Testing → Internal testing
2. Find version 9
3. Check the status:
   - **Draft** = Not available to users ❌
   - **In review** = Not available yet ⏳
   - **Available** = Should be available ✅

**Solution:**
- If it's a draft, you need to **publish/rollout** the version
- Click on version 9 → Click **"Review release"** → **"Start rollout to Internal testing"**

### 2. **Internal Testing Track Restrictions**

If you're using the **Internal testing** track, the device must be:
- Added to the internal testing group
- Using the same Google account that's in the testing group

**Check:**
1. Play Console → Testing → Internal testing
2. Go to **"Testers"** tab
3. Verify the Google account on the Motorola E(7) is added as a tester

**Solution:**
- Add the device's Google account to the internal testing group
- Or switch to **Closed testing** or **Open testing** track

### 3. **Country/Region Restriction**

The app might be restricted in your country.

**Check:**
1. Play Console → Policy → App content → Countries/regions
2. Verify your country is included in the list

**Solution:**
- Add your country to the available countries list
- Or check if there are any country-specific restrictions

### 4. **Play Store Cache/Update Issue**

The Play Store app on the device might be showing cached information.

**Solution:**
1. On the Motorola E(7):
   - Clear Play Store cache: Settings → Apps → Google Play Store → Storage → Clear cache
   - Or update Play Store app
   - Restart the device
   - Try again

### 5. **Wrong Google Account**

The device might be using a different Google account than the one in the testing group.

**Solution:**
- Ensure the device is signed in with the correct Google account
- The account must match the one added to the internal testing group

### 6. **Version Still Processing**

Google Play might still be processing version 9.

**Check:**
1. Play Console → Release → Testing → Internal testing → Version 9
2. Look for processing status
3. Wait for it to complete (usually 1-2 hours)

### 7. **Device Looking at Wrong Track**

The device might be trying to access the production track instead of internal testing.

**Solution:**
- Use the internal testing link:
  - Play Console → Testing → Internal testing → **"Copy link"**
  - Share this link with the device
  - Open the link on the Motorola E(7) to access the internal testing version

## Step-by-Step Fix

### Step 1: Verify Version Status
1. Go to Play Console → Release → Testing → Internal testing
2. Check version 9 status
3. If it says "Draft", click **"Review release"** → **"Start rollout"**

### Step 2: Verify Tester Access
1. Play Console → Testing → Internal testing → **"Testers"** tab
2. Ensure the device's Google account is added
3. If not, add it:
   - Click **"Create email list"** or **"Add testers"**
   - Add the email address
   - Save

### Step 3: Get Internal Testing Link
1. Play Console → Testing → Internal testing
2. Click **"Copy link"** or **"Get link"**
3. Share this link with the device
4. Open the link on Motorola E(7) to access the app

### Step 4: Clear Play Store Cache (on device)
1. Settings → Apps → Google Play Store
2. Storage → Clear cache
3. Restart device
4. Try installing again

## Quick Checklist

- [ ] Version 9 is published/rolled out (not draft)
- [ ] Device's Google account is in the internal testing group
- [ ] Country/region is not restricted
- [ ] Play Store cache cleared on device
- [ ] Using the internal testing link (not searching in Play Store)
- [ ] Version 9 has finished processing in Play Console

## Alternative: Install APK Directly

If you need to test immediately, you can install the APK directly:

1. **Build APK:**
   ```bash
   cd android
   ./gradlew assembleRelease
   ```

2. **Transfer to device:**
   - Copy `android/app/build/outputs/apk/release/app-release.apk` to the device
   - Enable "Install from unknown sources" in device settings
   - Install the APK

**Note:** This bypasses Play Store, so it's only for testing. For production, fix the Play Store distribution.

## Most Likely Issue

Based on your `eas.json` configuration, version 9 is submitted with `"releaseStatus": "draft"`. **Draft releases are not available to users** - you need to publish/rollout the version in Play Console.

