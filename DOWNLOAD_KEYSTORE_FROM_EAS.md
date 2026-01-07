# How to Download Keystore from EAS

This guide shows you how to download the keystore that EAS has stored remotely and check if it matches your upload key.

## Quick Steps

### Step 1: Download Credentials from EAS

Run the EAS credentials command:

```bash
npx eas credentials --platform android
```

**Follow these prompts:**
1. **Select build profile**: Choose `production` (or `production-local` if you used that)
2. **Choose action**: Select `credentials.json: Upload/Download credentials between EAS servers and your local json`
3. **Select option**: Choose `Download credentials from EAS to credentials.json`

This will create a `credentials.json` file in your project root.

### Step 2: Extract and Verify the Keystore

You have two options:

#### Option A: Use the Automated Script (Recommended)

```bash
# Make sure you're in the project root
cd "/Volumes/KooDrive/Insite App"

# Run the extraction script
./scripts/extract-keystore-from-eas.sh
```

This script will:
- Extract the keystore from `credentials.json`
- Save it to `android/app/release-key.keystore`
- Create `android/keystore.properties` with credentials
- Verify the keystore

#### Option B: Use the Verification Script

```bash
# Run the check script (it will download and verify)
./check-eas-keystore.sh
```

This script will:
- Download credentials from EAS
- Check if the keystore SHA-1 matches the upload key
- Tell you if it's the correct keystore

### Step 3: Verify Against Upload Key

After extracting, verify the keystore matches your upload key:

```bash
# Expected upload key SHA-1
EXPECTED_SHA1="5B:2A:6A:49:4B:C8:84:09:91:83:08:D9:94:4B:4B:F8:C9:E1:DC:16"

# Use the verification script
./verify-upload-keystore.sh android/app/release-key.keystore <password> <alias>
```

Or manually check:

```bash
# Get password and alias from credentials.json
KEYSTORE_PASSWORD=$(jq -r '.android.keystore.keystorePassword' credentials.json)
KEY_ALIAS=$(jq -r '.android.keystore.keyAlias' credentials.json)

# Check SHA-1
keytool -list -v -keystore android/app/release-key.keystore \
  -storepass "$KEYSTORE_PASSWORD" \
  -alias "$KEY_ALIAS" | grep "SHA1:"
```

## Manual Extraction (If Scripts Don't Work)

If the keystore is base64-encoded in `credentials.json`:

```bash
# Extract base64 keystore
cat credentials.json | jq -r '.android.keystore.keystore' | base64 -d > android/app/release-key.keystore

# Get credentials
KEYSTORE_PASSWORD=$(jq -r '.android.keystore.keystorePassword' credentials.json)
KEY_ALIAS=$(jq -r '.android.keystore.keyAlias' credentials.json)
KEY_PASSWORD=$(jq -r '.android.keystore.keyPassword' credentials.json)

# Verify
keytool -list -v -keystore android/app/release-key.keystore \
  -storepass "$KEYSTORE_PASSWORD" \
  -alias "$KEY_ALIAS"
```

## Check Multiple Profiles

If the `production` profile doesn't have the upload key, try other profiles:

```bash
# Check production-local
npx eas credentials --platform android
# Select: production-local
# Download and verify

# Check other profiles if they exist
```

## Expected Results

### ✅ If Keystore Matches Upload Key

- SHA-1 will be: `5B:2A:6A:49:4B:C8:84:09:91:83:08:D9:94:4B:4B:F8:C9:E1:DC:16`
- You can use this keystore for signing future builds
- Save it securely and update your build configuration

### ❌ If Keystore Doesn't Match

- The keystore in EAS is different from the upload key
- This means either:
  - The upload was done manually (not via EAS)
  - The keystore was changed after the first upload
  - A different profile was used for the first upload
- **Solution**: You'll need to reset the upload key in Google Play Console

## Security Notes

⚠️ **Important**: 
- `credentials.json` contains sensitive data
- Delete it after extracting: `rm credentials.json`
- Never commit `credentials.json` or keystore files to git
- Store the keystore file and passwords securely

## Troubleshooting

### "jq not found"
Install jq:
```bash
brew install jq  # macOS
```

### "credentials.json not found"
Make sure you completed Step 1 and downloaded credentials from EAS.

### "Keystore password incorrect"
Double-check the password in `credentials.json`:
```bash
jq '.android.keystore.keystorePassword' credentials.json
```

### "No keystore data found"
EAS might not have a keystore stored for this profile. Try:
- Different build profiles
- Check if credentials were ever uploaded to EAS
- The upload might have been done manually

## Next Steps

Once you have the keystore:

1. **If it matches the upload key**:
   - Use it for signing builds
   - Update `android/keystore.properties` if needed
   - Build and submit normally

2. **If it doesn't match**:
   - See `UPLOAD_KEY_RESET_GUIDE.md` for resetting the upload key
   - Or continue using EAS remote credentials (if they work)

