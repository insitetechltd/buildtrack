# Upload Key Mismatch - Troubleshooting Guide

## Problem

Your AAB is signed with a keystore that doesn't match the upload key registered in Google Play Console.

- **Current keystore SHA1**: `19:84:71:F5:89:60:32:CD:3E:FF:19:CE:E7:7C:F7:71:FC:18:D6:D3`
- **Google Play expects SHA1**: `5B:2A:6A:49:4B:C8:84:09:91:83:08:D9:94:4B:4B:F8:C9:E1:DC:16`

This happens when:
- Google Play App Signing is enabled (which it is in your case)
- The upload key used for the initial app upload is different from your current keystore
- The original upload key was lost or is inaccessible

## Solution: Reset Upload Key in Google Play Console

Since you can't find the original upload key, you need to reset it in Google Play Console. Here's how:

### Step 1: Access App Integrity Settings

1. Go to [Google Play Console](https://play.google.com/console)
2. Select your app: **Taskr** (com.buildtrack.app)
3. Navigate to: **Setup** → **App integrity**
4. Scroll to the **App signing** section

### Step 2: Request Upload Key Reset

1. In the **App signing** section, look for **Upload key certificate**
2. Click on **Request upload key reset** or **Reset upload key** button
3. Follow Google's verification process (may require:
   - App verification
   - Domain verification (if applicable)
   - Contact information confirmation
   - Waiting period (usually 24-48 hours)

### Step 3: After Upload Key Reset is Approved

Once Google approves the upload key reset:

1. **Download the new upload key certificate** (if provided)
2. **Use your current keystore** (`android/app/release-key.keystore`) to sign new uploads
3. Google will register your current keystore's SHA1 as the new upload key

### Alternative: Use EAS to Manage Keys

If resetting the upload key seems complicated, you can let EAS handle signing:

1. Remove local signing configuration from `android/app/build.gradle` (set `credentialsSource` to `"remote"` in `eas.json`)
2. Let EAS manage the keystore automatically
3. Use `eas build --platform android` instead of local builds

## Verify Upload Key After Reset

After the reset is approved, verify the new upload key:

```bash
# Check your keystore's SHA1
keytool -list -v -keystore android/app/release-key.keystore \
  -storepass <your-store-password> \
  -alias <your-key-alias> | grep SHA1

# This should match the "Upload key certificate" SHA1 in Play Console
```

## Important Notes

⚠️ **Before resetting:**
- Make sure you have a backup of your current production keystore (`android/app/release-key.keystore`)
- Store the keystore password and key alias securely
- The reset process may take 24-48 hours for Google to approve

✅ **After resetting:**
- Your current keystore (`release-key.keystore`) will become the new upload key
- All future uploads must use this keystore
- The app signing key (managed by Google) remains unchanged

## Current Configuration

Your build is correctly configured to use production signing:
- `android/app/build.gradle` → `signingConfigs.release` → reads from `android/keystore.properties`
- `android/keystore.properties` → points to `android/app/release-key.keystore`
- The release buildType uses `signingConfigs.release`

The only issue is the SHA1 mismatch, which requires the upload key reset in Play Console.
