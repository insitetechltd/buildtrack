# Next Steps: Upload Key Reset Process

## ✅ Keystore Generated Successfully!

Your new upload keystore has been created:
- **Keystore**: `upload-keystore.jks`
- **Certificate**: `upload_certificate.pem`
- **SHA-1**: `0C:FE:9A:F8:F9:9C:9C:85:C0:4C:F1:CB:E4:47:36:4D:33:19:B4:D5`
- **SHA-256**: `7D:BF:2B:DE:29:02:7C:8A:5B:6E:7C:9E:EA:93:F7:77:7F:E2:8D:14:7F:B7:BC:9E:BA:1D:34:B9:FE:C5:76:DB`

## Step 1: Backup the Keystore (CRITICAL!)

**⚠️ DO THIS FIRST - If you lose this keystore, you cannot update your app!**

```bash
# Create secure backup
mkdir -p ~/secure-backup
cp upload-keystore.jks ~/secure-backup/upload-keystore-backup-$(date +%Y%m%d).jks
cp upload-keystore-credentials.txt ~/secure-backup/

# Also backup to cloud storage (encrypted)
# - Google Drive (encrypted folder)
# - Dropbox (encrypted)
# - Password manager (store credentials)
```

**Store these securely:**
- Keystore file (`upload-keystore.jks`)
- Credentials (from `upload-keystore-credentials.txt`)
- In a password manager

## Step 2: Request Upload Key Reset in Google Play Console

### 2.1 Navigate to App Integrity

1. Go to [Google Play Console](https://play.google.com/console)
2. Select your app
3. Navigate to: **Setup** → **App integrity** → **App signing**
4. Scroll to **"Upload key certificate"** section

### 2.2 Request Reset

1. Click **"Request upload key reset"** button
2. If you see "You need permission":
   - Contact the account owner/admin
   - Have them grant you permission OR
   - Have them reset it for you

### 2.3 Upload Certificate

When prompted:
1. Upload the file: `upload_certificate.pem`
2. Google will verify the certificate
3. Submit the request

### 2.4 Wait for Approval

- Google typically takes **24-48 hours** to approve
- You'll receive an email when approved
- Check Play Console for status updates

## Step 3: After Approval - Configure Build

Once Google approves the reset:

### 3.1 Update Keystore Configuration

**Option A: Use the new keystore directly**

```bash
# Copy to standard location
cp upload-keystore.jks android/app/release-key.keystore

# Update keystore.properties
cp keystore-upload.properties android/keystore.properties
```

**Option B: Update build.gradle to use new keystore**

Edit `android/keystore.properties`:
```properties
storeFile=../upload-keystore.jks
storePassword=<your-password>
keyAlias=upload
keyPassword=<your-password>
```

### 3.2 Verify Configuration

```bash
# Check that keystore.properties is correct
cat android/keystore.properties

# Verify keystore is accessible
keytool -list -v -keystore upload-keystore.jks \
    -alias upload \
    -storepass <your-password> | grep SHA1
```

## Step 4: Build and Submit

After configuration:

```bash
# Clean build
cd android && ./gradlew clean && cd ..

# Build AAB
cd android && ./gradlew bundleRelease && cd ..

# Verify signing
jarsigner -verify -verbose -certs \
    android/app/build/outputs/bundle/release/app-release.aab

# Submit to Play Store
npx eas submit --platform android \
    --path android/app/build/outputs/bundle/release/app-release.aab \
    --profile production
```

## Important Notes

### ⚠️ Security

- **DO NOT commit** `upload-keystore.jks` to git
- **DO NOT commit** `upload-keystore-credentials.txt` to git
- **DO commit** `upload_certificate.pem` (it's public, safe to share)
- Store credentials in a password manager

### ✅ Verification

After the reset is approved, your new keystore's SHA-1 will be:
```
0C:FE:9A:F8:F9:9C:9C:85:C0:4C:F1:CB:E4:47:36:4D:33:19:B4:D5
```

This should match what Play Console shows after reset.

### 📋 Checklist

- [ ] Keystore backed up securely
- [ ] Credentials stored in password manager
- [ ] Upload key reset requested in Play Console
- [ ] Certificate (`upload_certificate.pem`) uploaded
- [ ] Waiting for Google approval (24-48 hours)
- [ ] After approval: Update build configuration
- [ ] After approval: Test build and submit

## Troubleshooting

### "You need permission" Error

You need **Owner** or **Admin** role:
1. Go to Play Console → Settings → Users and permissions
2. Contact account owner to grant permission
3. Or have them reset it for you

### Build Fails After Reset

1. Verify `android/keystore.properties` is correct
2. Check keystore file path is correct
3. Verify passwords match
4. Clean and rebuild: `cd android && ./gradlew clean bundleRelease`

### Certificate Upload Fails

1. Verify certificate format: `openssl x509 -in upload_certificate.pem -text`
2. Make sure it's the `.pem` file (not `.jks`)
3. Check file size (should be ~1-2KB)

## Summary

1. ✅ **Keystore generated** - `upload-keystore.jks`
2. ✅ **Certificate exported** - `upload_certificate.pem`
3. ⏳ **Next**: Request upload key reset in Play Console
4. ⏳ **Next**: Upload certificate when requested
5. ⏳ **Next**: Wait for approval (24-48 hours)
6. ⏳ **Next**: Configure build and submit

**Remember**: Backup the keystore NOW before doing anything else!

