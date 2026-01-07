# Generate New Upload Keystore Guide

## Overview

Since the original upload key keystore cannot be found, you need to:
1. Generate a new keystore
2. Export its certificate
3. Request upload key reset in Google Play Console
4. Upload the new certificate when requested

## Quick Start

Run the automated script:

```bash
./generate-new-upload-keystore.sh
```

The script will:
- Generate a new keystore (`upload-keystore.jks`)
- Export the certificate (`upload_certificate.pem`)
- Create a properties file for build configuration
- Save credentials securely

## Manual Method

If you prefer to do it manually:

### Step 1: Generate Keystore

```bash
keytool -genkeypair \
    -v \
    -keystore upload-keystore.jks \
    -alias upload \
    -keyalg RSA \
    -keysize 2048 \
    -validity 9125 \
    -storepass YOUR_KEYSTORE_PASSWORD \
    -keypass YOUR_KEY_PASSWORD \
    -dname "CN=Insite Tech Ltd, OU=Development, O=Insite Tech Ltd, L=Hong Kong, ST=Hong Kong, C=HK"
```

**Important:**
- Validity must be at least 25 years (9125 days) for Google Play
- Choose a strong password
- Save the password securely

### Step 2: Export Certificate

```bash
keytool -export -rfc \
    -keystore upload-keystore.jks \
    -alias upload \
    -file upload_certificate.pem \
    -storepass YOUR_KEYSTORE_PASSWORD
```

This creates `upload_certificate.pem` which you'll upload to Play Console.

### Step 3: Get Keystore Information

```bash
# Get SHA-1 fingerprint
keytool -list -v -keystore upload-keystore.jks \
    -alias upload \
    -storepass YOUR_KEYSTORE_PASSWORD | grep SHA1

# Get SHA-256 fingerprint
keytool -list -v -keystore upload-keystore.jks \
    -alias upload \
    -storepass YOUR_KEYSTORE_PASSWORD | grep SHA256
```

## Next Steps After Generation

### 1. Request Upload Key Reset in Play Console

1. Go to Google Play Console → Your App → Setup → App integrity → App signing
2. Click "Request upload key reset"
3. Follow Google's verification process
4. When prompted, upload `upload_certificate.pem`

### 2. Wait for Approval

- Google typically takes 24-48 hours to approve
- You'll receive an email when approved

### 3. Configure Build After Approval

Once approved, update your build configuration:

**Update `android/keystore.properties`:**
```properties
storeFile=upload-keystore.jks
storePassword=YOUR_KEYSTORE_PASSWORD
keyAlias=upload
keyPassword=YOUR_KEY_PASSWORD
```

**Or copy keystore to standard location:**
```bash
cp upload-keystore.jks android/app/release-key.keystore
# Update keystore.properties to point to release-key.keystore
```

### 4. Rebuild and Submit

```bash
# Clean build
cd android && ./gradlew clean && cd ..

# Build AAB
cd android && ./gradlew bundleRelease && cd ..

# Submit
npx eas submit --platform android \
    --path android/app/build/outputs/bundle/release/app-release.aab
```

## Security Best Practices

### ⚠️ CRITICAL: Backup Your Keystore

If you lose the keystore, you **cannot update your app** on Play Store. You would need to:
- Create a new app listing, OR
- Reset the upload key again (requires Google approval)

### Backup Steps

1. **Copy keystore to secure location:**
   ```bash
   cp upload-keystore.jks ~/secure-backup/upload-keystore-backup.jks
   ```

2. **Store credentials in password manager:**
   - Keystore password
   - Key password
   - Key alias: `upload`

3. **Multiple backup locations:**
   - Encrypted cloud storage (Google Drive, Dropbox with encryption)
   - External encrypted drive
   - Password manager
   - Secure physical backup

### Git Security

**DO NOT commit:**
- ❌ `upload-keystore.jks`
- ❌ `upload-keystore-credentials.txt`
- ❌ Any file containing passwords

**Verify .gitignore includes:**
```
*.jks
*.keystore
*credentials*.txt
```

## Files Created

After running the script:

- `upload-keystore.jks` - **KEEP SECURE** - The keystore file
- `upload_certificate.pem` - Certificate (can be shared, used for Play Console)
- `keystore-upload.properties` - Build configuration
- `upload-keystore-credentials.txt` - **KEEP SECURE** - Credentials

## Troubleshooting

### "keytool: command not found"
Install Java JDK:
```bash
brew install openjdk  # macOS
```

### "Keystore was tampered with, or password was incorrect"
- Check that you're using the correct password
- Make sure you're using the correct alias

### "Certificate chain not found"
This is normal for a self-signed certificate. Google Play will accept it after upload key reset.

## Summary

1. ✅ Generate new keystore: `./generate-new-upload-keystore.sh`
2. ✅ Request upload key reset in Play Console
3. ✅ Upload certificate when requested
4. ✅ Wait for approval (24-48 hours)
5. ✅ Use new keystore for signing after approval
6. ✅ **BACKUP THE KEYSTORE SECURELY**

