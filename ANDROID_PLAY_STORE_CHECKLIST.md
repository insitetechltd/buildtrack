# Android Play Store Publishing Checklist

## Current Configuration Status

### ✅ Already Configured

1. **App Identity**
   - Package Name: `com.buildtrack.app` ✅
   - App Name: "Taskr" ✅
   - Version Name: `1.1.2` ✅
   - Version Code: `1` ⚠️ (needs incrementing for each release)

2. **Build Configuration**
   - Target SDK: 35 ✅ (latest)
   - Compile SDK: 35 ✅
   - Min SDK: Configured ✅
   - Build Tools: 35.0.0 ✅
   - Kotlin Version: 2.1.20 ✅

3. **App Assets**
   - Icon: `./assets/icon-1024.png` ✅
   - Adaptive Icon: Configured ✅
   - Splash Screen: Configured ✅

4. **Permissions** (AndroidManifest.xml)
   - Camera ✅
   - Storage (Read/Write) ✅
   - Location ✅
   - Internet ✅
   - Contacts ✅
   - Calendar ✅
   - Audio Recording ✅

5. **EAS Build Configuration**
   - Production profile exists ✅
   - Auto-increment enabled ✅
   - Remote credentials configured ✅

### ⚠️ Critical Issues to Fix

1. **App Signing - CRITICAL** 🔴
   - **Current Issue**: Release builds are using debug keystore
   - **Location**: `android/app/build.gradle` line 115
   - **Problem**: `signingConfig signingConfigs.debug` in release build
   - **Action Required**: 
     - Generate production keystore
     - Configure release signing
     - Store keystore securely (use EAS credentials or secure storage)

2. **Version Code** ⚠️
   - **Current**: `1` (in `android/app/build.gradle`)
   - **Issue**: Must increment for each Play Store release
   - **Action**: Set to appropriate number (e.g., `12` for version 1.1.2)
   - **Note**: EAS auto-increment may handle this, but verify

### 📋 Required for Play Store Submission

#### 1. App Signing Setup
- [ ] Generate production keystore file
- [ ] Upload keystore to EAS credentials (recommended) OR store securely
- [ ] Update `android/app/build.gradle` to use production signing config
- [ ] Test signed APK/AAB locally

#### 2. Version Management
- [ ] Increment `versionCode` in `android/app/build.gradle` (currently `1`)
- [ ] Ensure `versionName` matches `app.json` version (`1.1.2`)
- [ ] Set up automated version incrementing (EAS handles this)

#### 3. Play Store Console Setup
- [ ] Create Google Play Developer account ($25 one-time fee)
- [ ] Complete developer account verification
- [ ] Create new app in Play Console

#### 4. Store Listing Assets
- [ ] App name (max 50 characters)
- [ ] Short description (max 80 characters)
- [ ] Full description (max 4000 characters)
- [ ] App icon (512x512 PNG, no transparency)
- [ ] Feature graphic (1024x500 PNG)
- [ ] Screenshots (at least 2, up to 8)
  - Phone: 16:9 or 9:16 aspect ratio
  - Tablet (if supported): 7" and 10" tablets
- [ ] Promotional video (optional, YouTube URL)

#### 5. Content Rating
- [ ] Complete content rating questionnaire
- [ ] Get rating certificate (IARC, ESRB, etc.)

#### 6. Privacy Policy
- [ ] Create privacy policy URL
- [ ] Add privacy policy link in Play Console
- [ ] Ensure privacy policy covers:
  - Data collection (camera, location, contacts, etc.)
  - Data usage
  - Third-party services (Supabase, OpenAI, Anthropic, etc.)
  - User rights

#### 7. App Content
- [ ] Target audience
- [ ] Category selection
- [ ] Contact details (email, phone, website)
- [ ] Support URL (optional)

#### 8. Pricing & Distribution
- [ ] Set app as Free or Paid
- [ ] Select countries for distribution
- [ ] Set up pricing (if paid)

#### 9. Data Safety Section
- [ ] Declare data collection practices:
  - Personal info (names, emails, phone numbers)
  - Photos and videos
  - Location data
  - Device/app history
- [ ] Explain data usage
- [ ] Declare data sharing (Supabase, AI services)
- [ ] Security practices

#### 10. Permissions Justification
- [ ] Camera: "For taking photos for task attachments"
- [ ] Storage: "For saving and accessing task photos"
- [ ] Location: "For location-based task management" (if used)
- [ ] Contacts: "For assigning tasks to team members" (if used)
- [ ] Calendar: "For scheduling task due dates" (if used)

#### 11. Build & Test
- [ ] Build production AAB (Android App Bundle) using EAS:
  ```bash
  eas build --platform android --profile production
  ```
- [ ] Test AAB on multiple devices
- [ ] Verify all features work correctly
- [ ] Test on different Android versions (API levels)

#### 12. Pre-launch Checklist
- [ ] Remove debug code/logging
- [ ] Verify API keys are production (not exposed)
- [ ] Test offline functionality
- [ ] Verify deep linking works
- [ ] Test app updates mechanism
- [ ] Verify push notifications (if used)

## Recommended Actions

### Immediate (Before First Build)

1. **Fix App Signing** (Priority 1)
   ```gradle
   // In android/app/build.gradle, replace:
   release {
       signingConfig signingConfigs.debug  // ❌ Remove this
       // Add production signing config
   }
   ```

2. **Update Version Code**
   ```gradle
   // In android/app/build.gradle
   versionCode 12  // Increment from 1
   versionName "1.1.2"
   ```

3. **Set Up EAS Credentials**
   ```bash
   eas credentials
   # Configure Android keystore
   ```

### Before Submission

1. **Prepare Store Assets**
   - Create screenshots (minimum 2, recommended 4-8)
   - Write app description
   - Prepare feature graphic

2. **Create Privacy Policy**
   - Host on website or use privacy policy generator
   - Cover all data collection points

3. **Complete Content Rating**
   - Answer questionnaire in Play Console
   - Get rating certificate

## Build Commands

### Using EAS Build (Recommended)
```bash
# Build production AAB for Play Store
eas build --platform android --profile production

# Build and submit to Play Store (if configured)
eas build --platform android --profile production --auto-submit
```

### Local Build (for testing)
```bash
# Build release AAB locally
cd android
./gradlew bundleRelease

# Output: android/app/build/outputs/bundle/release/app-release.aab
```

## Version Management Strategy

- **Version Name** (`versionName`): User-visible version (e.g., "1.1.2")
  - Managed in `app.json` → synced to Android
- **Version Code** (`versionCode`): Internal integer that must increase
  - Start at 1, increment by 1 for each release
  - EAS can auto-increment if configured

## Security Notes

1. **Never commit keystore files to git**
2. **Store keystore passwords securely**
3. **Use EAS credentials management** (recommended)
4. **Rotate API keys** if accidentally exposed
5. **Review permissions** - only request what's needed

## Testing Checklist

- [ ] Install AAB on physical device
- [ ] Test all core features
- [ ] Test camera functionality
- [ ] Test file uploads
- [ ] Test offline mode
- [ ] Test app updates
- [ ] Test on different screen sizes
- [ ] Test on different Android versions (8.0+)

## Resources

- [Google Play Console](https://play.google.com/console)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [Android App Bundle Guide](https://developer.android.com/guide/app-bundle)
- [Play Store Policies](https://play.google.com/about/developer-content-policy/)

## Next Steps

1. Fix app signing configuration
2. Set up EAS credentials for Android
3. Build production AAB
4. Create Google Play Developer account
5. Prepare store listing assets
6. Complete content rating
7. Submit for review

---

**Last Updated**: Based on current codebase analysis
**App Version**: 1.1.2
**Version Code**: 1 (needs update)




