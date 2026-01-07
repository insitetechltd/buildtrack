# Fix Keystore Mismatch Error

## Current Error

```
Google Api Error: Invalid request - The Android App Bundle was signed with the wrong key.
Found: SHA1: 5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25
Expected: SHA1: 5B:2A:6A:49:4B:C8:84:09:91:83:08:D9:94:4B:4B:F8:C9:E1:DC:16
```

## Problem

Your AAB is signed with a keystore that doesn't match the upload key registered in Google Play Console.

**Expected Upload Key SHA-1**: `5B:2A:6A:49:4B:C8:84:09:91:83:08:D9:94:4B:4B:F8:C9:E1:DC:16`

**Current Keystore SHA-1**: `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`

## Solution Options

### Option 1: Download Correct Keystore from EAS (Recommended)

If your app was previously uploaded via EAS, the correct keystore should be stored on EAS servers.

**Step 1: Download credentials from EAS**

```bash
npx eas credentials --platform android
```

Follow the prompts:
1. Select build profile: `production`
2. Choose: `credentials.json: Upload/Download credentials between EAS servers and your local json`
3. Select: `Download credentials from EAS to credentials.json`

**Step 2: Extract the keystore**

```bash
# Use the extraction script
./scripts/extract-keystore-from-eas.sh

# Or manually extract from credentials.json
cat credentials.json | jq -r '.android.keystore.keystore' | base64 -d > android/app/release-key.keystore

# Get credentials
KEYSTORE_PASSWORD=$(jq -r '.android.keystore.keystorePassword' credentials.json)
KEY_ALIAS=$(jq -r '.android.keystore.keyAlias' credentials.json)
KEY_PASSWORD=$(jq -r '.android.keystore.keyPassword' credentials.json)

# Update keystore.properties
cat > android/keystore.properties << EOF
storeFile=release-key.keystore
storePassword=$KEYSTORE_PASSWORD
keyAlias=$KEY_ALIAS
keyPassword=$KEY_PASSWORD
EOF
```

**Step 3: Verify the keystore matches**

```bash
./verify-upload-keystore.sh android/app/release-key.keystore "$KEYSTORE_PASSWORD" "$KEY_ALIAS"
```

It should show: ✅ **SUCCESS! This keystore matches the upload key certificate!**

**Step 4: Rebuild and submit**

```bash
# Clean build
cd android && ./gradlew clean && cd ..

# Rebuild AAB
cd android && ./gradlew bundleRelease && cd ..

# Submit
npx eas submit --platform android --path android/app/build/outputs/bundle/release/app-release.aab --profile production
```

### Option 2: Reset Upload Key in Google Play Console

If you cannot find the correct keystore, you need to reset the upload key in Google Play Console.

**⚠️ Important**: This requires admin access and takes 24-48 hours for Google to approve.

**Steps:**

1. **Go to Google Play Console:**
   - Navigate to: Your App → Setup → App integrity → App signing
   - Find "Upload key certificate" section

2. **Request Upload Key Reset:**
   - Click "Request upload key reset" button
   - Follow Google's verification process
   - Wait for approval (24-48 hours)

3. **After Approval:**
   - Use your current keystore (`android/app/release-key.keystore`) for future builds
   - Google will register it as the new upload key
   - Rebuild and submit

**See**: `UPLOAD_KEY_RESET_GUIDE.md` for detailed instructions.

## What I Fixed

1. ✅ **Fixed signing config** - Release builds now use `signingConfigs.release` (was using debug)
2. ✅ **Verified keystore mismatch** - Confirmed current keystore doesn't match upload key

## Current Status

- ❌ **Current keystore**: SHA-1 `5E:8F:16:06:...` (doesn't match)
- ❌ **Upload key expected**: SHA-1 `5B:2A:6A:49:...` (not found locally)
- ✅ **Signing config**: Fixed to use release signing
- ⏳ **Next step**: Download from EAS or reset upload key

## Quick Check

To verify which keystore you're using:

```bash
# Check current keystore
keytool -list -v -keystore android/app/release-key.keystore \
  -storepass $(grep storePassword android/keystore.properties | cut -d'=' -f2) \
  -alias $(grep keyAlias android/keystore.properties | cut -d'=' -f2) | grep SHA1
```

## Next Steps

1. **Try downloading from EAS first** (Option 1) - this is the fastest solution
2. **If EAS doesn't have it**, reset the upload key (Option 2)
3. **After getting the correct keystore**, rebuild and resubmit

