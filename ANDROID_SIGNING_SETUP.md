# Android Production Signing Setup

This guide explains how to set up local production signing for Android builds.

## Overview

For Play Store submission, your AAB must be signed with the same production keystore that matches your Google Play Console configuration. The build system uses a `keystore.properties` file (gitignored) to store keystore credentials.

## Setup Steps

### Option 1: Get Keystore from EAS (Recommended)

If you've been using EAS builds, your keystore is stored securely with EAS. To download it:

#### Method 1: Using EAS CLI (Recommended)

1. **Ensure you're logged in to EAS**:
   ```bash
   npx eas login
   ```

2. **Navigate to your project directory**:
   ```bash
   cd /path/to/your/project
   ```

3. **Run the credentials command**:
   ```bash
   npx eas credentials --platform android
   ```

4. **Follow the interactive prompts**:
   - Select the build profile (usually `production` for Play Store builds)
   - Choose: `credentials.json: Upload/Download credentials between EAS servers and your local json`
   - Select: `Download credentials from EAS to credentials.json`

5. **Extract the keystore from credentials.json**:
   - A `credentials.json` file will be created in your project root
   - Open `credentials.json` and look for the `keystore` object
   - The keystore object contains:
     - `keystore`: Base64-encoded keystore data
     - `keystorePassword`: The keystore password
     - `keyAlias`: The key alias
     - `keyPassword`: The key password

6. **Save the keystore file**:
   ```bash
   # Extract base64 keystore from credentials.json
   # You can use a script or manually decode it
   # For example, if keystore is base64-encoded:
   cat credentials.json | jq -r '.android.keystore.keystore' | base64 -d > android/app/release-key.keystore
   ```

   Or manually:
   - Copy the base64 string from `credentials.json` → `android.keystore.keystore`
   - Decode it: `echo "BASE64_STRING" | base64 -d > android/app/release-key.keystore`

7. **Create keystore.properties**:
   ```bash
   cp keystore.properties.template android/keystore.properties
   ```

   Edit `android/keystore.properties`:
   ```properties
   storeFile=release-key.keystore
   storePassword=<from credentials.json: android.keystore.keystorePassword>
   keyAlias=<from credentials.json: android.keystore.keyAlias>
   keyPassword=<from credentials.json: android.keystore.keyPassword>
   ```

   **OR use the automated script**:
   ```bash
   ./scripts/extract-keystore-from-eas.sh
   ```
   This script automatically extracts the keystore and creates `keystore.properties` for you.

8. **Clean up** (optional but recommended):
   ```bash
   # credentials.json contains sensitive data, remove it after extracting keystore
   rm credentials.json
   ```

#### Method 2: Contact EAS Support

If the CLI method doesn't work or you need assistance:

- **Email**: support@expo.dev
- **Request**: Download of Android production keystore for package `com.buildtrack.app`
- **Provide**: 
  - Your EAS account email
  - Project ID (from `app.json` → `extra.eas.projectId` or `eas.json`)
  - Package name: `com.buildtrack.app`

### Option 2: Use Existing Keystore

If you already have your production keystore file:

1. Place your `.keystore` or `.jks` file in `android/app/` directory
   ```bash
   cp /path/to/your/release-key.keystore android/app/
   ```

2. Copy the template and configure it:
   ```bash
   cp keystore.properties.template android/keystore.properties
   ```

3. Edit `android/keystore.properties` with your keystore details:
   ```properties
   # Path is relative to android/app/ directory
   storeFile=release-key.keystore
   storePassword=your-store-password
   keyAlias=your-key-alias
   keyPassword=your-key-password
   ```

### Option 3: Generate New Keystore (Only if starting fresh)

⚠️ **WARNING**: Only do this if you haven't published the app to Play Store yet. If you already have published versions, you MUST use the same keystore.

```bash
cd android/app
keytool -genkeypair -v -storetype PKCS12 -keystore release-key.keystore -alias release-key -keyalg RSA -keysize 2048 -validity 10000
```

Then create `android/keystore.properties`:
```properties
# Path is relative to android/app/ directory
storeFile=release-key.keystore
storePassword=your-store-password
keyAlias=release-key
keyPassword=your-key-password
```

## Verification

After setting up `keystore.properties`, verify the signing:

```bash
./build-and-submit-android.sh --track production
```

The build should complete and the AAB should be signed with the production key. You can verify the signature:

```bash
keytool -list -v -keystore android/app/release-key.keystore
jarsigner -verify -verbose -certs android/app/build/outputs/bundle/release/app-release.aab
```

The SHA-1 fingerprint should match what's configured in Google Play Console.

## Security Notes

- ⚠️ **NEVER commit `keystore.properties` or `.keystore` files to git**
- ⚠️ Store keystore files securely (password manager, encrypted storage)
- ⚠️ Keep backups of your keystore in a secure location
- ⚠️ If you lose the keystore, you cannot update the app on Play Store

## Troubleshooting

### "The Android App Bundle was signed with the wrong key"

This means the keystore you're using doesn't match the upload key registered in Google Play Console. 

**If you have Google Play App Signing enabled** (which manages the app signing key separately), you may need to reset the upload key in Play Console if you can't find the original upload key.

**See**: [`KEYSTORE_MISMATCH_TROUBLESHOOTING.md`](./KEYSTORE_MISMATCH_TROUBLESHOOTING.md) for detailed steps on:
- How to reset the upload key in Google Play Console
- Verifying the upload key certificate
- Alternative solutions using EAS-managed keys

**Quick steps if you have the original upload key:**
1. Use the exact same keystore that was used for the first upload
2. Contact EAS support to download your keystore if it was managed by EAS
3. Check Google Play Console → Setup → App integrity → App signing → Upload key certificate to see the expected SHA1 fingerprint

### "keystore.properties not found"

If you see this warning during build:
1. Copy `keystore.properties.template` to `android/keystore.properties`
2. Fill in your keystore details
3. Ensure the keystore file path is correct (relative to android/ directory)

### Build still uses debug signing

Check that:
1. `keystore.properties` exists in the `android/` directory (not in `android/app/`)
2. All properties are filled in correctly
3. The keystore file path is correct (relative to `android/app/`) and the file exists
4. File permissions allow reading the keystore file

## Related Files

- `keystore.properties.template` - Template for keystore configuration (copy to `android/keystore.properties`)
- `android/app/build.gradle` - Contains signing configuration
- `.gitignore` - Ensures keystore files are not committed
