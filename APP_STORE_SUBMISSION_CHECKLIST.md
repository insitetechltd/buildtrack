# Apple App Store Submission Checklist

Based on your current configuration files, here's what you need to do:

## 🔴 CRITICAL Issues to Fix

### 1. Bundle Identifier - **NEEDS CHANGE**

**Current**: `com.buildtrack.app.local`  
**Problem**: The `.local` suffix is typically for development builds  
**Action Required**:

In `app.json`, change:
```json
"ios": {
  "bundleIdentifier": "com.buildtrack.app.local",  // ❌ Change this
  ...
}
```

To:
```json
"ios": {
  "bundleIdentifier": "com.buildtrack.app",  // ✅ Use production bundle ID
  ...
}
```

**⚠️ Important**: 
- This bundle ID must match what's configured in App Store Connect
- Check App Store Connect: https://appstoreconnect.apple.com
- App ID: `6754898737` should have the correct bundle identifier

---

### 2. Apple Developer Account Setup

**Current Status**: 
- ✅ Apple Team ID configured via environment injection
- ✅ App Store Connect App ID: `6754898737`
- ⚠️ Apple credentials source: `remote` (managed by EAS)

**Action Required**:
1. **Verify Apple Developer Membership**:
   - Go to: https://developer.apple.com/account
   - Ensure account is active ($99/year)
   - Team ID: `YOURTEAMID`

2. **Verify App Store Connect**:
   - Go to: https://appstoreconnect.apple.com
   - Sign in with Apple ID
   - Check app exists with ID: `6754898737`
   - Verify bundle identifier matches (after fixing #1)

3. **EAS Credentials** (if needed):
   ```bash
   eas credentials
   ```
   - This will help set up certificates and provisioning profiles
   - EAS can auto-manage these if configured

---

## ⚠️ Configuration Issues

### 3. Apple Team ID Missing from Production Profile

**Current**: Apple identity should not be hardcoded in `eas.json`  
**Fix**: Inject Apple identity using local `.env` (gitignored) or CI/EAS secrets:

```json
EXPO_APPLE_ID=your-apple-id@example.com
EXPO_APPLE_TEAM_ID=YOURTEAMID
```

---

### 4. Bundle ID Consistency

Ensure bundle ID matches across:
- ✅ `app.json` → `ios.bundleIdentifier`
- ✅ App Store Connect → App bundle identifier
- ✅ Xcode project (if using local builds)
- ✅ Apple Developer Portal → App ID

**Current mismatch**: `com.buildtrack.app.local` vs likely `com.buildtrack.app` in App Store Connect

---

## 📋 Required App Store Connect Setup

### 5. App Information (App Store Connect)

Complete in App Store Connect: https://appstoreconnect.apple.com

- [ ] **App Information**:
  - [ ] App name: "Taskr"
  - [ ] Primary language
  - [ ] Bundle ID (must match fixed bundle identifier)
  - [ ] SKU (unique identifier)

- [ ] **Pricing and Availability**:
  - [ ] Price tier (Free/Paid)
  - [ ] Available countries

- [ ] **App Privacy** (Required):
  - [ ] Privacy Policy URL (same as Android)
  - [ ] Data collection declaration:
    - [ ] Camera access
    - [ ] Photo library access
    - [ ] User account data (Supabase)
    - [ ] Data usage explanations

- [ ] **App Store Listing**:
  - [ ] App description
  - [ ] Keywords
  - [ ] Support URL
  - [ ] Marketing URL (optional)
  - [ ] App icon (1024x1024 PNG)
  - [ ] Screenshots:
    - [ ] iPhone 6.7" display (iPhone 14 Pro Max, etc.)
    - [ ] iPhone 6.5" display (iPhone 11 Pro Max, etc.)
    - [ ] iPad Pro (12.9") if `supportsTablet: true`
  - [ ] App preview video (optional)

- [ ] **Version Information**:
  - [ ] Version number: `1.1.2` (from app.json)
  - [ ] Build number: Will auto-increment with EAS
  - [ ] Release notes ("What's New")

---

## 🔧 Technical Requirements

### 6. App Configuration ✅

Already configured correctly:

- ✅ **Deployment Target**: iOS 15.1 (`deploymentTarget: "15.1"`)
- ✅ **Encryption Export Compliance**: `ITSAppUsesNonExemptEncryption: false`
- ✅ **Camera Permission**: `NSCameraUsageDescription` set
- ✅ **Photo Library Permission**: `NSPhotoLibraryUsageDescription` set
- ✅ **Tablet Support**: `supportsTablet: true`
- ✅ **App Icon**: Configured at `./assets/icon-1024.png`

### 7. Build Configuration ✅

- ✅ **EAS Build**: Configured for store distribution
- ✅ **Auto-increment**: Enabled for build numbers
- ✅ **App Store Connect ID**: `6754898737`
- ✅ **CocoaPods**: Version 1.16.1 specified

---

## 🚀 Submission Steps

### Step 1: Fix Bundle Identifier

```bash
# Edit app.json
# Change: "bundleIdentifier": "com.buildtrack.app.local"
# To:     "bundleIdentifier": "com.buildtrack.app"
```

### Step 2: Verify App Store Connect

1. Go to: https://appstoreconnect.apple.com
2. Navigate to: **My Apps** → Find your app (ID: 6754898737)
3. Verify bundle identifier matches (after fix)
4. Complete all required sections listed above

### Step 3: Build for App Store

```bash
# Build iOS app for App Store
eas build --platform ios --profile production
```

Or using your script:
```bash
./build-and-submit.sh ios production
```

### Step 4: Submit to App Store

After build completes:

```bash
# Submit to App Store
eas submit --platform ios --profile production --latest
```

Or wait for auto-submit if configured in `build-and-submit.sh`

---

## 📝 Pre-Submission Checklist

Before submitting, ensure:

- [ ] Bundle identifier fixed (remove `.local`)
- [ ] App version number set correctly (`1.1.2`)
- [ ] Build number will auto-increment
- [ ] Privacy policy URL added in App Store Connect
- [ ] App Store listing complete (description, screenshots, etc.)
- [ ] TestFlight testing completed (optional but recommended)
- [ ] App tested on physical iOS devices
- [ ] All required App Store Connect fields completed
- [ ] App icon is 1024x1024 PNG without transparency
- [ ] Screenshots prepared for required device sizes

---

## 🎯 Quick Fix Summary

**Immediate Actions**:

1. **Fix bundle identifier** in `app.json`:
   ```json
   "bundleIdentifier": "com.buildtrack.app"  // Remove .local
   ```

2. **Verify App Store Connect**:
   - Bundle ID matches
   - All required fields completed

3. **Build and submit**:
   ```bash
   eas build --platform ios --profile production
   eas submit --platform ios --profile production --latest
   ```

---

## 📚 Useful Links

- **App Store Connect**: https://appstoreconnect.apple.com
- **Apple Developer Portal**: https://developer.apple.com/account
- **EAS Build Docs**: https://docs.expo.dev/build/introduction/
- **EAS Submit Docs**: https://docs.expo.dev/submit/introduction/
- **App Store Review Guidelines**: https://developer.apple.com/app-store/review/guidelines/

---

## ⚠️ Common Issues

### "Bundle identifier does not match"
- Fix: Ensure `app.json` bundle ID matches App Store Connect

### "Missing compliance"
- Fix: Ensure `ITSAppUsesNonExemptEncryption: false` is set (✅ already done)

### "Missing app icon"
- Fix: Ensure `./assets/icon-1024.png` exists and is 1024x1024 PNG

### "Missing screenshots"
- Fix: Add screenshots in App Store Connect for required device sizes

---

**Status**: Configuration mostly ready, but **bundle identifier needs to be fixed** before submission.


