# Icon Configuration Guide

This document explains how app icons are configured and managed in the BuildTrack app.

## Icon Files

### Main Icon File
**Location:** `/assets/icon.png`

**Specifications:**
- Dimensions: 1024x1024 pixels
- Format: PNG
- Color mode: RGBA
- Size: ~5.7KB

This is the **source of truth** for your app icon.

## Platform Configuration

### iOS Configuration

**In `app.json`:**
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

**Native Asset Location:**
```
ios/BuildTrack/Images.xcassets/AppIcon.appiconset/
  └── App-Icon-1024x1024@1x.png
```

iOS uses a single 1024x1024 icon that Xcode automatically scales to all required sizes.

### Android Configuration

**In `app.json`:**
```json
{
  "android": {
    "icon": "./assets/icon.png",
    "adaptiveIcon": {
      "foregroundImage": "./assets/icon.png",
      "backgroundColor": "#ffffff"
    }
  }
}
```

Android icons are generated during the build process from the configuration in `app.json`.

## Syncing Icons

### Automatic Sync Script

Use the provided script to sync icons from `assets/icon.png` to native projects:

```bash
./sync-icons.sh
```

**What it does:**
1. ✅ Validates source icon exists
2. ✅ Checks icon dimensions
3. ✅ Copies to iOS asset catalog
4. ✅ Confirms Android will auto-generate during build

### Manual Sync

If you update the icon manually:

```bash
# Copy to iOS
cp assets/icon.png ios/BuildTrack/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png

# Android icons are auto-generated during build
```

## Updating the App Icon

### Step 1: Replace the Icon File

Replace `/assets/icon.png` with your new 1024x1024 pixel icon.

### Step 2: Sync to Native Projects

```bash
./sync-icons.sh
```

### Step 3: Rebuild the App

```bash
# Local build
./build-local.sh production ios

# Or build and submit
./build-and-submit.sh ios production
```

## Icon Best Practices

### Design Guidelines

1. **Size:** Always use 1024x1024 pixels
2. **Format:** PNG with transparency (RGBA)
3. **Content:** Keep important content in the center 80% of the icon
4. **Background:** Use a solid color or simple gradient
5. **Simplicity:** Icons should be recognizable at small sizes

### iOS Specific

- iOS automatically adds rounded corners
- Icon will be displayed at various sizes (20px to 1024px)
- No transparency on home screen (will show black)
- Safe area: Keep content within center 80%

### Android Specific

- Adaptive icons have foreground and background layers
- Background color is specified in `app.json`
- Android may apply different shapes (circle, squircle, etc.)
- Safe area: Keep content within center 66%

## Troubleshooting

### Icon not showing in build

1. **Sync the icon:**
   ```bash
   ./sync-icons.sh
   ```

2. **Clean and rebuild:**
   ```bash
   # Clean iOS build
   rm -rf ios/build
   
   # Rebuild
   ./build-local.sh production ios
   ```

3. **Verify icon file:**
   ```bash
   file assets/icon.png
   # Should show: PNG image data, 1024 x 1024
   ```

### Icon looks pixelated

- Ensure source icon is exactly 1024x1024 pixels
- Use high-quality PNG export from your design tool
- Avoid upscaling smaller images

### Icon has wrong colors

- Check if icon uses RGBA color mode
- Ensure no ICC color profiles are embedded
- Use sRGB color space

### Icons out of sync

If iOS and Android show different icons:

```bash
# Re-sync everything
./sync-icons.sh

# Rebuild both platforms
./build-local.sh production ios
./build-local.sh production android
```

## Icon Validation Checklist

Before building:

- [ ] Icon is 1024x1024 pixels
- [ ] Icon is PNG format
- [ ] Icon looks good at small sizes
- [ ] Run `./sync-icons.sh` to sync
- [ ] Build and test on device

## Technical Details

### Why Two Icon Locations?

- **`/assets/icon.png`**: Source file, used by Expo during development
- **`/ios/.../AppIcon.appiconset/`**: Native iOS build uses this during compilation

Both must be in sync for consistency.

### Build Process

During EAS Build:

1. Expo reads `app.json` for icon paths
2. iOS uses the icon from the asset catalog
3. Android generates all icon sizes from `app.json` config
4. Both platforms bundle the icons into the final app

### Icon Caching

App icons are cached by iOS/Android:

- May need to delete app and reinstall to see icon changes
- TestFlight builds always show new icons
- Simulator may cache icons (restart simulator to refresh)

## Related Files

- `/assets/icon.png` - Main icon source file
- `/app.json` - Icon configuration
- `/ios/BuildTrack/Images.xcassets/AppIcon.appiconset/` - iOS icon assets
- `/sync-icons.sh` - Icon sync script

## Additional Resources

- [Expo Icon Guide](https://docs.expo.dev/develop/user-interface/app-icons/)
- [iOS App Icon Guidelines](https://developer.apple.com/design/human-interface-guidelines/app-icons)
- [Android Adaptive Icons](https://developer.android.com/develop/ui/views/launch/icon_design_adaptive)

