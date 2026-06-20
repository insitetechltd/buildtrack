# Generate 7-inch Tablet Screenshots Guide

This guide explains how to generate 7-inch tablet screenshots for Google Play Store submission.

## Quick Start

```bash
./generate-tablet-screenshots.sh
```

## What It Does

1. Creates a 7-inch tablet Android emulator (1024x600 resolution)
2. Builds and installs your app
3. Takes screenshots of key screens
4. Saves screenshots to `./screenshots/7inch-tablet/`

## Requirements

- Android SDK installed
- `ANDROID_HOME` environment variable set (or SDK in `~/Library/Android/sdk`)
- Android system image for API level 34 (Android 14)

## Screenshots Generated

The script will capture:
1. **Login Screen** - Initial app screen

## Capturing Additional Screenshots

To capture more screens after the script runs:

### Option 1: Use the Helper Script (Easiest)

1. **Login to the app** (you'll need valid credentials)
2. **Navigate to the desired screen** in the emulator
3. **Take a screenshot:**
   ```bash
   ./take-tablet-screenshot.sh 02_dashboard
   ```

### Option 2: Manual ADB Command

1. **Login to the app** (you'll need valid credentials)
2. **Navigate to the desired screen** in the emulator
3. **Take a screenshot:**
   ```bash
   adb shell screencap -p > screenshots/7inch-tablet/02_dashboard.png
   ```

### Recommended Screenshots for Play Store

1. **Login Screen** ✅ (automated)
2. **Dashboard** - Main task overview
3. **Tasks List** - List of tasks
4. **Task Detail** - Individual task view
5. **Projects** - Project list
6. **Create Task** - Task creation form
7. **Profile** - User profile screen

## Manual Screenshot Process

If you prefer to take screenshots manually:

1. **Start the emulator:**
   ```bash
   emulator -avd 7inch_tablet_screenshots
   ```

2. **Install the app:**
   ```bash
   adb install android/app/build/outputs/apk/release/app-release.apk
   ```

3. **Launch the app:**
   ```bash
   adb shell am start -n com.buildtrack.app/.MainActivity
   ```

4. **Navigate and take screenshots:**
   ```bash
   # Navigate to desired screen in emulator, then:
   adb shell screencap -p > screenshots/7inch-tablet/screen_name.png
   ```

## Screenshot Specifications

For 7-inch tablets, Google Play Store requires:
- **Resolution:** 1024x600 (landscape) or 600x1024 (portrait)
- **Format:** PNG
- **Max file size:** 8 MB per image
- **Recommended:** 2-8 screenshots

## Troubleshooting

### Emulator won't start
- Check if `ANDROID_HOME` is set correctly
- Ensure system image is installed: `sdkmanager "system-images;android-34;google_apis;x86_64"`

### App won't install
- Uninstall existing version: `adb uninstall com.buildtrack.app`
- Rebuild APK: `cd android && ./gradlew assembleRelease`

### Screenshots are blank
- Wait a few seconds after navigating to screen
- Ensure app is fully loaded before taking screenshot

## Alternative: Use Android Studio

You can also use Android Studio's built-in screenshot tool:

1. Open Android Studio
2. Tools → Device Manager
3. Create/Start 7-inch tablet emulator
4. Run app on emulator
5. View → Tool Windows → App Inspection
6. Use screenshot button

## File Organization

Screenshots are saved in:
```
screenshots/
└── 7inch-tablet/
    ├── 01_login.png
    ├── 02_dashboard.png
    ├── 03_tasks.png
    └── ...
```

## Next Steps

After generating screenshots:
1. Review screenshots for quality
2. Optimize file sizes if needed
3. Upload to Google Play Console → Store Listing → Screenshots → 7" Tablets

