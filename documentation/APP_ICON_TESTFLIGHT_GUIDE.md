# How to Make App Icon Appear on TestFlight

## Current Status

Your app icon is properly configured in the build, but it may not appear immediately on TestFlight for these reasons:

### Why Icon Might Not Show Yet:

1. **Apple is still processing the build** (5-10 minutes after submission)
2. **First-time app submission** requires manual icon upload to App Store Connect
3. **Cache delay** - TestFlight may take a few minutes to refresh

## Solution 1: Wait for Processing ⏳

**Most Common Solution**: Just wait!

1. Check your email for: **"Your app is ready to test"** from Apple
2. Once received, refresh TestFlight
3. Icon should appear automatically

**Timeline**: Usually 5-10 minutes after submission

## Solution 2: Upload Icon to App Store Connect 🎨

If the icon still doesn't appear after processing completes:

### Steps:

1. **Go to App Store Connect**
   - Visit: https://appstoreconnect.apple.com
   - Sign in with: tristan.koo@insiteworks.com

2. **Navigate to Your App**
   - Click on **"Insite Trackr"** (or your app name)
   - Status should show: "Prepare for Submission"

3. **Upload App Icon**
   - Click **"App Information"** in the left sidebar
   - Scroll down to **"App Icon"** section
   - Click **"Choose File"**
   - Upload: `/Volumes/KooDrive/Insite App/assets/icon-1024.png`
   - Click **"Save"**

4. **Verify Icon**
   - Go to **TestFlight** tab
   - Select your build
   - Icon should now appear

## Icon Requirements ✅

Your icon meets all Apple requirements:

- ✅ **Size**: 1024x1024 pixels
- ✅ **Format**: PNG
- ✅ **Color Space**: RGB
- ✅ **No Alpha Channel**: Required for App Store (but OK for TestFlight)
- ✅ **No Rounded Corners**: iOS adds them automatically

### Icon Locations:

1. **Source Icon**: `assets/icon.png` (512x512)
2. **App Store Icon**: `assets/icon-1024.png` (1024x1024) ← **Use this for upload**
3. **iOS Assets**: `ios/BuildTrack/Images.xcassets/AppIcon.appiconset/`

## Troubleshooting

### Icon Still Not Showing?

#### 1. Check Build Status
```bash
# Check latest build status
eas build:list --platform ios --limit 1
```

**Look for**: Status should be "FINISHED" not "IN_QUEUE" or "IN_PROGRESS"

#### 2. Check Submission Status
```bash
# Check latest submission
eas submit:list --platform ios --limit 1
```

**Look for**: Status should be "FINISHED"

#### 3. Verify Icon in Build

The icon is embedded in the build at:
- `ios/BuildTrack/Images.xcassets/AppIcon.appiconset/`

To regenerate icons:
```bash
# Regenerate all icon sizes
npx expo prebuild --clean
```

#### 4. Clear TestFlight Cache

On your iOS device:
1. Open **TestFlight** app
2. Pull down to refresh
3. If still not showing, delete and reinstall TestFlight app

### Common Issues:

| Issue | Solution |
|-------|----------|
| Icon is blurry | Use 1024x1024 PNG with no compression |
| Icon has white border | Remove padding from source image |
| Icon doesn't update | Wait 10-15 minutes for Apple's CDN to refresh |
| Wrong icon showing | Clear TestFlight cache and refresh |

## Best Practices

### For Future Builds:

1. **Always use 1024x1024 source icon**
   - Expo will automatically generate all required sizes
   - Better quality when scaling down

2. **Update app.json if changing icon**
   ```json
   {
     "expo": {
       "icon": "./assets/icon.png",
       "ios": {
         "icon": "./assets/icon.png"
       }
     }
   }
   ```

3. **Regenerate after icon changes**
   ```bash
   npx expo prebuild --clean
   eas build --platform ios --profile production
   ```

## Quick Reference

### Current Build Info:
- **App Name**: Insite Trackr
- **Bundle ID**: com.buildtrack.app.local
- **Latest Build**: 60
- **Version**: 1.1.2
- **Icon**: 1024x1024 PNG ready at `assets/icon-1024.png`

### Useful Links:
- **App Store Connect**: https://appstoreconnect.apple.com/apps/6754898737
- **TestFlight**: https://appstoreconnect.apple.com/apps/6754898737/testflight/ios
- **EAS Dashboard**: https://expo.dev/accounts/insitetech/projects/buildtrack

## Expected Timeline

| Step | Time | Status |
|------|------|--------|
| Build submitted | Immediate | ✅ Done |
| Apple processing | 5-10 min | ⏳ In Progress |
| Email notification | After processing | 📧 Pending |
| Icon appears on TestFlight | After processing | 🎨 Pending |
| Ready for testing | After processing | 🚀 Soon |

## What to Do Now

### Recommended Actions:

1. ✅ **Wait 10 minutes** for Apple to process the build
2. ✅ **Check your email** for "ready to test" notification
3. ✅ **Refresh TestFlight** page in App Store Connect
4. ⏸️ **If icon still missing after 15 minutes**, upload `assets/icon-1024.png` manually

### Don't Need To:
- ❌ Rebuild the app (icon is already in the build)
- ❌ Change any code
- ❌ Resubmit to TestFlight

---

**Status**: ✅ Icon ready, waiting for Apple processing
**Next Check**: In 10 minutes
**Last Updated**: November 12, 2025


