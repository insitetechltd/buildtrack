# How to Update Health Declaration in Google Play Console

## Current Situation

✅ **Your codebase is clean:**
- `ACTIVITY_RECOGNITION` permission removed from AndroidManifest.xml
- `expo-sensors` removed from package.json
- Version 6 (1.1.2) submitted successfully without the permission

⚠️ **Play Console still shows health declaration because:**
- It's referencing the old version (version 1) that had the permission
- Version 6 was just submitted and may not be fully processed yet

## Solution: Update Health Declaration Now

You can update the health declaration **immediately** without waiting for version 6 to be fully processed. Here's how:

### Step 1: Navigate to Health Apps Section

1. Go to [Google Play Console](https://play.google.com/console)
2. Sign in with your developer account
3. Select your app: **Taskr** (com.buildtrack.app)
4. In the left sidebar, navigate to: **Policy** → **App content**
5. Scroll down to find the **"Health apps"** section
6. Click **"Start"** or **"Manage"** (if already started)

### Step 2: Update the Declaration

You'll see a screen asking about health features in your app. 

**Select the option:**
- ✅ **"My app does not have any health features"**
- OR
- ✅ **"No, my app does not access health or fitness data"**

The exact wording may vary, but select the option that indicates your app does NOT have health features.

### Step 3: Complete the Form

1. Answer any additional questions:
   - **"Does your app have health features?"** → **No**
   - **"Does your app access health data?"** → **No**
   - Any other health-related questions → **No**

2. Click **"Save"** or **"Submit"** to save your changes

### Step 4: Verify the Update

1. Go back to **Policy** → **App content**
2. Check the **"Health apps"** section
3. It should now show: **"No health features"** or similar
4. The warning/requirement should disappear

## Why This Works

Even though version 6 is still processing, you can update the declaration because:
- The declaration is about your **app's intent**, not just the current build
- You're telling Google: "My app does not have health features"
- When version 6 is fully processed, it will confirm this declaration
- The old version (version 1) will eventually be superseded by version 6

## After Version 6 is Processed

Once version 6 is fully processed and live:

1. Go to: **Policy** → **App content** → **App bundles and APKs using sensitive permissions**
2. Check version 6
3. It should **NOT** show `ACTIVITY_RECOGNITION` permission
4. This confirms your declaration is correct

## Troubleshooting

### If you can't find the Health Apps section:

1. Try: **Policy** → **App content** → **Sensitive permissions**
2. Look for any sections related to health or fitness
3. The section may be under a different name depending on your Play Console version

### If the declaration doesn't save:

1. Make sure you're selecting "No health features" clearly
2. Answer all required questions
3. Try refreshing the page and trying again
4. Check if there are any validation errors shown

### If it still shows after updating:

1. Wait 24-48 hours for Play Console to process the update
2. Check that version 6 is fully processed
3. Verify version 6 doesn't have the permission (it shouldn't)
4. Contact Google Play Support if it persists

## Summary

**Action Required:**
1. ✅ Go to Play Console → Policy → App content → Health apps
2. ✅ Select "My app does not have any health features"
3. ✅ Save the changes
4. ✅ Wait for version 6 to be processed (confirms the declaration)

**Your code is already correct** - you just need to update the declaration in Play Console to match your app's actual functionality.

