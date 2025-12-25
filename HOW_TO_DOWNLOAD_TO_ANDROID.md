# How to Download App to Android Phone

## Option 1: Internal Testing via Play Store (Recommended)

Since your app was submitted to the **internal** track, you can set up internal testing:

### Step 1: Set Up Internal Testers

1. **Go to Play Console**:
   - https://play.google.com/console
   - Sign in: **insite.tech.ltd@gmail.com**
   - Select app: **Taskr**

2. **Navigate to Testing**:
   - Left sidebar → **Testing** → **Internal testing**
   - Or direct link: https://play.google.com/console/u/0/developers/~/app/[APP_ID]/tracks/internal

3. **Add Testers**:
   - Click **Testers** tab
   - Click **Create email list**
   - Name it (e.g., "Team Testers")
   - Add tester emails (including your own Gmail address)
   - Click **Save changes**

4. **Get Opt-in URL**:
   - Copy the **Opt-in URL** (looks like):
     ```
     https://play.google.com/apps/internaltest/...
     ```
   - Share this URL with testers

### Step 2: Install on Your Phone

1. **Open the Opt-in URL** on your Android phone
2. **Click "Become a tester"** button
3. **Accept the invitation**
4. **Go to Google Play Store**
5. **Search for "Taskr"** or find it in "My apps & games"
6. **Install the app**

---

## Option 2: Build APK for Direct Installation

If you want to install directly without Play Store:

### Step 1: Build Release APK

```bash
cd android
./gradlew assembleRelease
cd ..
```

The APK will be at: `android/app/build/outputs/apk/release/app-release.apk`

### Step 2: Transfer to Phone

**Method A: USB/ADB**
```bash
adb install android/app/build/outputs/apk/release/app-release.apk
```

**Method B: Email/Cloud Storage**
1. Upload APK to Google Drive/Dropbox
2. Share link with yourself
3. Open link on phone
4. Download and install

### Step 3: Enable Unknown Sources

Before installing APK directly:
1. **Settings** → **Security** (or **Apps** → **Special app access**)
2. Enable **"Install unknown apps"** or **"Unknown sources"**
3. Select the app you're using to install (Chrome, Files, etc.)

---

## Option 3: Use EAS Build (Alternative)

If you want a development build:

```bash
# Build APK with EAS
eas build --platform android --profile preview

# Download the APK from EAS dashboard
# Then install via USB or share link
```

---

## Quick Summary

### For Internal Testing (Easiest):

1. ✅ Play Console → Testing → Internal testing → Testers
2. ✅ Add your email to testers list
3. ✅ Copy the opt-in URL
4. ✅ Open URL on phone → Become a tester
5. ✅ Install from Play Store

### For Direct APK Install:

1. ✅ Build APK: `cd android && ./gradlew assembleRelease`
2. ✅ Transfer APK to phone (USB, email, cloud)
3. ✅ Enable "Install unknown apps" in phone settings
4. ✅ Tap APK file → Install

---

## Troubleshooting

### "App not found in Play Store"
- Make sure you clicked "Become a tester" first
- Wait 5-10 minutes after joining tester group
- Check you're signed into the correct Google account

### "Cannot install APK"
- Enable "Install unknown apps" in Settings
- Make sure the APK isn't corrupted
- Check Android version compatibility

### "App won't open after install"
- Check app logs: `adb logcat | grep -E '(FATAL|Error|com.buildtrack)'`
- Verify app has necessary permissions
- Rebuild if needed

---

## Recommended Approach

**For testing**: Use **Internal Testing** (Option 1) - it's the easiest and most Play Store-like experience.

**For quick local testing**: Use **Direct APK install** (Option 2) - faster for development but requires manual updates.

---

**Next Steps**: Set up internal testing in Play Console and use the opt-in URL to install on your phone! 📱



