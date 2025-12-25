# Android Production Signing Setup Guide

This guide explains the production signing setup for Android Play Store releases.

## ✅ What Has Been Configured

### 1. Production Keystore Generation Script
- **File**: `generate-keystore.sh`
- **Purpose**: Generates a production keystore with secure random passwords
- **Location**: `android/app/release.keystore`
- **Credentials**: Stored in `android/keystore.properties`

### 2. Version Code Management
- **File**: `android/version-code.txt`
- **Current Version Code**: 12
- **Increment Script**: `increment-android-version.sh`
- **Auto-sync**: Build.gradle reads from this file

### 3. Build Configuration
- **File**: `android/app/build.gradle`
- **Production Signing**: Configured to use `release.keystore`
- **Fallback**: Uses debug keystore if production keystore not found (for development)
- **Version Management**: Automatically reads version code and version name

### 4. Build Script Updates
- **File**: `build-android.sh`
- **New Option**: `--increment` or `-v` to auto-increment version code before building

## 🔐 Generating the Production Keystore

### Step 1: Generate Keystore

Run the keystore generation script:

```bash
./generate-keystore.sh
```

This will:
- Generate a secure production keystore
- Create `android/app/release.keystore`
- Create `android/keystore.properties` with passwords
- Set secure file permissions (600)

### Step 2: Backup the Keystore (CRITICAL!)

**⚠️ IMPORTANT**: If you lose the keystore, you **cannot** update your app on Play Store!

1. **Copy the keystore file** to a secure location:
   ```bash
   cp android/app/release.keystore ~/secure-backup/
   ```

2. **Save the passwords** from `android/keystore.properties`:
   ```bash
   cat android/keystore.properties
   ```
   
   Save these in a secure password manager:
   - Store Password
   - Key Password
   - Key Alias: `buildtrack-release`

3. **Store in multiple secure locations**:
   - Password manager (1Password, LastPass, etc.)
   - Encrypted cloud storage
   - Secure physical backup

### Step 3: Verify Keystore

Check that the keystore was created:

```bash
ls -lh android/app/release.keystore
keytool -list -v -keystore android/app/release.keystore -storepass <your-store-password>
```

## 📦 Building for Production

### Build Release APK

```bash
# Standard build
./build-android.sh

# Build with version increment
./build-android.sh --increment

# Clean build with version increment
./build-android.sh --clean --increment
```

### Build Android App Bundle (AAB) for Play Store

```bash
cd android
./gradlew bundleRelease
cd ..

# AAB location: android/app/build/outputs/bundle/release/app-release.aab
```

### Manual Version Code Increment

```bash
./increment-android-version.sh
```

## 🔍 How It Works

### Version Code Management

1. **Version Code File**: `android/version-code.txt`
   - Contains a single integer (currently: 12)
   - Must increment for each Play Store release
   - Managed by `increment-android-version.sh`

2. **Version Name**: Read from `app.json`
   - Current: "1.1.2"
   - User-visible version
   - Can be the same across multiple releases

3. **Build.gradle Integration**:
   - Automatically reads version code from `version-code.txt`
   - Automatically reads version name from `app.json`
   - No manual editing needed

### Signing Configuration

1. **Keystore Properties**: `android/keystore.properties`
   ```properties
   storeFile=release.keystore
   storePassword=<generated-password>
   keyAlias=buildtrack-release
   keyPassword=<generated-password>
   ```

2. **Build.gradle Logic**:
   - Checks if `keystore.properties` exists
   - If found: Uses production signing
   - If not found: Falls back to debug signing (for development)

3. **Security**:
   - Keystore files are in `.gitignore`
   - Properties file has secure permissions (600)
   - Never committed to git

## 📋 Play Store Submission Checklist

Before submitting to Play Store:

- [ ] Production keystore generated
- [ ] Keystore backed up securely
- [ ] Version code incremented (if needed)
- [ ] Version name updated in `app.json` (if needed)
- [ ] AAB built successfully
- [ ] AAB tested on device
- [ ] All features working correctly

## 🚨 Troubleshooting

### "keystore.properties not found"

**Solution**: Run `./generate-keystore.sh` to create the keystore and properties file.

### "Invalid keystore password"

**Solution**: Check `android/keystore.properties` for the correct passwords.

### "Version code must be incremented"

**Solution**: Run `./increment-android-version.sh` before building.

### Build uses debug keystore

**Check**:
1. Does `android/keystore.properties` exist?
2. Does `android/app/release.keystore` exist?
3. Check build logs for signing config messages

## 📝 File Locations

- **Keystore**: `android/app/release.keystore`
- **Keystore Properties**: `android/keystore.properties`
- **Version Code**: `android/version-code.txt`
- **Build Script**: `build-android.sh`
- **Version Increment Script**: `increment-android-version.sh`
- **Keystore Generator**: `generate-keystore.sh`

## 🔗 Related Documentation

- [Android Play Store Checklist](./ANDROID_PLAY_STORE_CHECKLIST.md)
- [Build Android README](./BUILD_ANDROID_README.md)

## 📞 Support

For issues or questions:
- Check build logs: `android/app/build/outputs/logs/`
- Verify keystore: `keytool -list -v -keystore android/app/release.keystore`
- Check Gradle logs: `cd android && ./gradlew bundleRelease --info`

---

**Last Updated**: After production signing setup
**Google Developer Account**: insite.tech.ltd@gmail.com




