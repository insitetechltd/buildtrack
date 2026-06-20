# How to Deactivate Previous Versions in Google Play Console

## Overview

You want to deactivate all previous app versions except version 9. This ensures only the latest version (without ACTIVITY_RECOGNITION permission) is active.

## Method 1: Via Google Play Console (Recommended)

### Step 1: Navigate to Release Management

1. Go to [Google Play Console](https://play.google.com/console)
2. Sign in with your developer account
3. Select your app: **Taskr** (com.buildtrack.app)
4. In the left sidebar, go to: **Release** → **Production** (or **Testing** → **Internal testing**)

### Step 2: Deactivate Previous Versions

1. **For Internal Testing Track:**
   - Go to: **Release** → **Testing** → **Internal testing**
   - You'll see a list of all versions
   - For each version (except version 9):
     - Click on the version
     - Click **"Deactivate"** or **"Remove"** button
     - Confirm the deactivation

2. **For Production Track (if any):**
   - Go to: **Release** → **Production**
   - Repeat the same process for each version except version 9

### Step 3: Verify

- Check that only version 9 is active
- All other versions should show as "Deactivated" or "Removed"

## Method 2: Using EAS Submit (Automated)

EAS Submit can automatically deactivate previous versions when submitting a new one. Update your `eas.json`:

```json
{
  "submit": {
    "internal": {
      "android": {
        "serviceAccountKeyPath": "./google-service-account.json",
        "track": "internal",
        "releaseStatus": "draft",
        "deactivateOnPromote": true
      }
    }
  }
}
```

However, this only works when promoting between tracks. For deactivating within the same track, use Method 1.

## Method 3: Using Google Play Developer API

You can use the Google Play Developer API to programmatically deactivate versions, but this requires API setup and is more complex.

## Quick Steps Summary

1. **Go to Play Console**: https://play.google.com/console
2. **Navigate**: Release → Testing → Internal testing (or Production)
3. **For each old version**:
   - Click the version
   - Click "Deactivate" or "Remove"
   - Confirm
4. **Keep version 9 active**

## Important Notes

- ⚠️ **Deactivating a version** removes it from the track but doesn't delete it from Play Console
- ✅ **Version 9** will remain active (this is the one without ACTIVITY_RECOGNITION)
- 📱 **Users** who already have older versions installed can still use them, but won't receive updates
- 🔄 **New installs** will only get version 9

## Verification

After deactivating:
1. Go to: **Release** → **Testing** → **Internal testing**
2. Check the version list
3. Only version 9 should show as "Active"
4. All others should show as "Deactivated" or "Removed"

## Troubleshooting

### If "Deactivate" button is not available:
- The version might already be deactivated
- You might need to wait for the version to finish processing
- Check if you have the correct permissions (Admin or Release Manager)

### If you want to completely remove versions:
- Some versions cannot be completely removed if they were published
- Deactivation is usually sufficient
- Contact Google Play Support if you need to completely remove a published version

