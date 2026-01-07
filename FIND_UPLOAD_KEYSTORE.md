# Finding Your Upload Keystore File

You have the **upload key certificate** (`upload_cert.der`) with SHA-1: `5B:2A:6A:49:4B:C8:84:09:91:83:08:D9:94:4B:4B:F8:C9:E1:DC:16`

Now you need to find the **actual keystore file** (`.jks` or `.keystore`) that contains the private key matching this certificate.

## Where to Look

### 1. **EAS Credentials** (Most Likely)
If your app was originally built and uploaded via EAS, the keystore might be stored with EAS:

```bash
# Check if EAS has a different keystore
npx eas credentials --platform android

# Look for options to download credentials
# Check if there's a different keystore than what we've seen
```

**Note**: The `credentials/android/keystore.jks` we found has SHA-1 `19:84:71:F5:...` which doesn't match. There might be an older keystore in EAS.

### 2. **Backup Locations**
Check these common backup locations:

- **External drives** (USB, external hard drives)
- **Cloud storage**:
  - Google Drive
  - Dropbox
  - OneDrive
  - iCloud Drive
- **Password managers** (may store keystore files or passwords):
  - 1Password
  - LastPass
  - Bitwarden
  - Keychain (macOS)
- **Encrypted storage** (VeraCrypt, encrypted folders)

### 3. **Team Member Computers**
Ask team members who worked on the app:
- Check their local machines
- Look in their `~/Downloads` or `~/Documents`
- Search for files with names like:
  - `release.keystore`
  - `buildtrack.keystore`
  - `upload-key.jks`
  - `android-release.jks`

### 4. **Project History/Archives**
- Old project backups or archives
- Git repository history (though keystores should be gitignored)
- Old laptops or computers used for development
- Time Machine backups (macOS)

### 5. **Development Environment**
Check if it was created on a different machine:
- Look for keystore generation scripts
- Check project documentation
- Look for notes about keystore location

## Certificate Information

Your upload certificate shows:
- **Owner**: CN=Insite Tech Ltd, OU=Development, O=Insite Tech Ltd
- **Location**: Hong Kong
- **SHA-1**: `5B:2A:6A:49:4B:C8:84:09:91:83:08:D9:94:4B:4B:F8:C9:E1:DC:16`

This suggests it was created by someone at Insite Tech Ltd. Ask your team:
- Who created the original Android build?
- Where did they store the keystore?
- Do they have backups?

## If You Find a Keystore File

Use the verification script to check if it matches:

```bash
./verify-upload-keystore.sh <path-to-keystore> <keystore-password> <key-alias>
```

Example:
```bash
./verify-upload-keystore.sh ~/Downloads/my-keystore.jks mypassword mykeyalias
```

## If You Can't Find It

If you cannot locate the original keystore file, you have two options:

### Option 1: Reset Upload Key in Google Play Console (Recommended)

1. Go to Google Play Console → Your App → Setup → App integrity → App signing
2. Find "Upload key certificate" section
3. Click "Request upload key reset"
4. Follow Google's verification process (24-48 hours)
5. Once approved, you can use your current keystore (`credentials/android/keystore.jks`) as the new upload key

### Option 2: Use EAS-Managed Signing

Let EAS handle the signing automatically:

1. Update `eas.json` to use remote credentials:
   ```json
   "android": {
     "credentialsSource": "remote"
   }
   ```

2. Build and submit via EAS:
   ```bash
   eas build --platform android
   eas submit --platform android
   ```

## Quick Search Commands

To search for keystore files on your Mac:

```bash
# Search entire system (slow but thorough)
sudo find / -name "*.keystore" -o -name "*.jks" 2>/dev/null

# Search common locations
find ~/Downloads ~/Documents ~/Desktop -name "*.keystore" -o -name "*.jks" 2>/dev/null

# Search cloud storage locations
find ~/Library/CloudStorage -name "*.keystore" -o -name "*.jks" 2>/dev/null
```

## Current Status

- ✅ **Upload certificate found**: `upload_cert.der`
- ❌ **Keystore file not found**: Need `.jks` or `.keystore` file matching SHA-1 `5B:2A:6A:49:...`
- ✅ **Verification script ready**: `verify-upload-keystore.sh`

