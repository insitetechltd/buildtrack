# Quick Start: Submit to Play Store

Your AAB is ready! Choose your submission method below.

## 🚨 Troubleshooting: Debug Signing Error

**If Play Store rejects your AAB with "signed in debug mode" error:**

1. **Generate a production keystore** (one-time setup):
   ```bash
   ./generate-keystore.sh
   ```
   This creates:
   - `android/app/release.keystore` - Production keystore file
   - `android/keystore.properties` - Keystore credentials

2. **Rebuild the AAB** with production signing:
   ```bash
   cd android && ./gradlew clean bundleRelease && cd ..
   ```

3. **Verify the new AAB** is signed correctly:
   ```bash
   # Check signing info
   jarsigner -verify -verbose -certs android/app/build/outputs/bundle/release/app-release.aab
   ```

4. **Upload the new AAB** to Play Store

**⚠️ IMPORTANT**: Backup the keystore file and passwords! If you lose them, you cannot update your app on Play Store.

See `ANDROID_SIGNING_SETUP.md` for detailed signing setup instructions.

---

## ✅ Current Status

- ✅ AAB Built: `android/app/build/outputs/bundle/release/app-release.aab` (53MB)
- ✅ EAS CLI: Installed and logged in
- ✅ Scripts: Created and ready
- ⏳ Service Account: Needs setup (for automated submission)

## 🚀 Two Options to Submit

### Option 1: Manual Upload (Easiest - Start Here!)

**Best for**: First-time submission, quick upload

1. **Go to Play Console**: https://play.google.com/console
2. **Sign in**: insite.tech.ltd@gmail.com
3. **Select app**: Taskr (or create if needed)
4. **Navigate**: Release → Production (or Testing → Internal testing)
5. **Upload**: Click "Create new release" → Upload AAB
6. **File location**: 
   ```
   /Volumes/KooDrive/Insite App/android/app/build/outputs/bundle/release/app-release.aab
   ```
7. **Add release notes** and publish

**Full guide**: See `MANUAL_UPLOAD_GUIDE.md`

⏱️ **Time**: 10-15 minutes  
✅ **No setup required**

---

### Option 2: Automated EAS Submit (For Future Releases)

**Best for**: Automated submissions, CI/CD, multiple releases

#### Quick Setup (One-Time):

1. **Create Service Account**:
   - Follow: `GOOGLE_SERVICE_ACCOUNT_STEP_BY_STEP.md`
   - Takes ~10 minutes
   - One-time setup

2. **Save JSON Key**:
   ```bash
   # Move downloaded JSON to project root
   mv ~/Downloads/your-project-*.json ./google-service-account.json
   chmod 600 google-service-account.json
   ```

3. **Submit**:
   ```bash
   ./submit-to-play-store.sh internal
   ```

**Full guide**: See `GOOGLE_SERVICE_ACCOUNT_STEP_BY_STEP.md`

⏱️ **Setup time**: 10-15 minutes (one-time)  
⏱️ **Submit time**: 2-3 minutes (automated)  
✅ **Automated for future releases**

---

## 📋 Pre-Submission Checklist

Before submitting (especially first time):

- [ ] App created in Play Console
- [ ] App name set: **Taskr**
- [ ] Package name matches: **com.buildtrack.app**
- [ ] Store listing completed:
  - [ ] Short description (max 80 chars)
  - [ ] Full description (max 4000 chars)
  - [ ] App icon (512x512 PNG)
  - [ ] Feature graphic (1024x500 PNG)
  - [ ] Screenshots (min 2, recommended 4-8)
- [ ] Privacy policy URL added
- [ ] Content rating completed
- [ ] Data safety section filled
- [ ] Version code incremented (if needed)
- [ ] AAB tested on device

## 🎯 Recommended Path

### For First Release:

1. **Use Manual Upload** (Option 1)
   - Faster to get started
   - No service account setup needed
   - Complete all Play Console requirements

2. **Set up Service Account** (Option 2) later
   - After first release is successful
   - For future automated releases

### For Future Releases:

Use **Automated EAS Submit** (Option 2)
- Much faster (2-3 minutes vs 10-15 minutes)
- Can be scripted for CI/CD
- Less error-prone

## 📁 File Reference

| File | Purpose |
|------|---------|
| `submit-to-play-store.sh` | Automated submission script |
| `GOOGLE_SERVICE_ACCOUNT_STEP_BY_STEP.md` | Service account setup guide |
| `MANUAL_UPLOAD_GUIDE.md` | Manual upload instructions |
| `EAS_SUBMIT_GUIDE.md` | Complete EAS submit reference |
| `android/app/build/outputs/bundle/release/app-release.aab` | Your AAB file |

## 🔧 Quick Commands

### Check AAB
```bash
ls -lh android/app/build/outputs/bundle/release/app-release.aab
```

### Rebuild AAB (if needed)

**⚠️ IMPORTANT: Make sure you have a production keystore!**

If you get an error about debug signing, you need to generate a production keystore:

```bash
# Generate production keystore (one-time setup)
./generate-keystore.sh

# Then rebuild the AAB
cd android && ./gradlew bundleRelease && cd ..
```

The keystore will be created at `android/app/release.keystore` and credentials saved in `android/keystore.properties`.

### Submit with EAS (after service account setup)
```bash
./submit-to-play-store.sh internal    # Internal testing
./submit-to-play-store.sh alpha       # Alpha testing
./submit-to-play-store.sh beta        # Beta testing
./submit-to-play-store.sh production  # Production
```

## 🆘 Need Help?

### Manual Upload Issues
→ See `MANUAL_UPLOAD_GUIDE.md` → Troubleshooting section

### Service Account Setup Issues
→ See `GOOGLE_SERVICE_ACCOUNT_STEP_BY_STEP.md` → Troubleshooting section

### EAS Submit Issues
→ See `EAS_SUBMIT_GUIDE.md` → Troubleshooting section

## 📞 Quick Links

- **Play Console**: https://play.google.com/console
- **Google Cloud Console**: https://console.cloud.google.com/
- **EAS Documentation**: https://docs.expo.dev/submit/introduction/

---

**Ready to submit?** Start with **Option 1: Manual Upload** for the fastest path to the Play Store!

**Google Account**: insite.tech.ltd@gmail.com  
**Package**: com.buildtrack.app  
**AAB**: android/app/build/outputs/bundle/release/app-release.aab (53MB)

