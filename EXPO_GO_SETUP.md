# Expo Go Development Setup

## Overview
This guide explains how to run the Taskr app in Expo Go for quick development and testing.

## What is Expo Go?
Expo Go is a free mobile app that allows you to run your React Native app without building native code. It's perfect for:
- Quick development and testing
- Sharing with team members
- Testing on real devices instantly
- No need for Xcode or Android Studio

## Prerequisites

1. **Install Expo Go on your device**
   - iOS: [Download from App Store](https://apps.apple.com/app/expo-go/id982107779)
   - Android: [Download from Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. **Install Expo CLI** (if not already installed)
   ```bash
   npm install -g expo-cli
   ```

## Quick Start

### Method 1: Start Development Server (Recommended)

```bash
# Navigate to project directory
cd "/Volumes/KooDrive/Insite App"

# Start the development server
npx expo start
```

This will:
1. Start the Metro bundler
2. Show a QR code in your terminal
3. Open a web interface at http://localhost:8081

**To run on your device:**
- **iOS**: Open Camera app, scan the QR code
- **Android**: Open Expo Go app, tap "Scan QR code"

### Method 2: Build with EAS for Expo Go

```bash
# Build for iOS simulator with Expo Go
eas build --profile expo-go --platform ios

# Or for Android
eas build --profile expo-go --platform android
```

## Current Configuration

### app.json
```json
{
  "expo": {
    "name": "Taskr",
    "slug": "buildtrack",
    "version": "1.1.2",
    "sdkVersion": "54.0.0"
  }
}
```

### eas.json - expo-go profile
```json
{
  "expo-go": {
    "distribution": "internal",
    "ios": {
      "simulator": true,
      "buildConfiguration": "Debug",
      "credentialsSource": "local"
    }
  }
}
```

## Important Notes

### ⚠️ Limitations of Expo Go

Expo Go has some limitations compared to development builds:

1. **No custom native modules** - Can only use modules included in Expo Go
2. **No custom native code** - Cannot add custom Swift/Kotlin code
3. **Limited to Expo SDK modules** - Must use Expo-compatible packages

### ✅ What Works in Expo Go

Your app should work in Expo Go because it uses:
- ✅ React Navigation
- ✅ Expo modules (Camera, File System, etc.)
- ✅ Supabase (JavaScript client)
- ✅ NativeWind/Tailwind CSS
- ✅ Zustand for state management
- ✅ React Native core components

### ❌ What Might NOT Work

Check if you're using any of these (they require custom builds):
- Custom native modules
- Specific native configurations
- Some third-party libraries with native code

## Development Workflow

### 1. Start Development Server
```bash
npx expo start
```

### 2. Choose Your Platform
Press in terminal:
- `i` - Open iOS simulator
- `a` - Open Android emulator  
- `w` - Open in web browser
- `r` - Reload app
- `m` - Toggle menu
- `j` - Open debugger

### 3. Scan QR Code on Physical Device
- Open Expo Go app
- Tap "Scan QR code"
- Point camera at QR code in terminal

### 4. Make Changes
- Edit your code
- Save the file
- App automatically reloads (Fast Refresh)

## Troubleshooting

### Issue: "Unable to resolve module"
```bash
# Clear cache and restart
npx expo start --clear
```

### Issue: "Network response timed out"
```bash
# Make sure your device and computer are on the same WiFi network
# Try using tunnel mode:
npx expo start --tunnel
```

### Issue: "Incompatible Expo SDK version"
```bash
# Check Expo Go app version matches SDK version
# Update Expo Go app from App Store/Play Store
```

### Issue: App crashes on startup
```bash
# Check for native module incompatibilities
# View logs:
npx expo start --dev-client
```

## Sharing with Team

### Option 1: QR Code
Share the QR code from terminal with team members

### Option 2: Link
Share the exp:// link that appears in terminal

### Option 3: Expo Dashboard
```bash
# Publish to Expo
npx expo publish

# Share the published URL
https://expo.dev/@insitetech/buildtrack
```

## Environment Variables

For Expo Go, environment variables work differently:

```javascript
// Use expo-constants
import Constants from 'expo-constants';

const apiUrl = Constants.expoConfig?.extra?.apiUrl;
```

Make sure your `app.json` has:
```json
{
  "expo": {
    "extra": {
      "apiUrl": "your-api-url",
      "supabaseUrl": "your-supabase-url"
    }
  }
}
```

## Testing Features

### Test on Real Device
1. Install Expo Go
2. Scan QR code
3. Test all features:
   - ✅ Login/Registration
   - ✅ Project creation
   - ✅ Task management
   - ✅ Camera/Photos
   - ✅ Offline functionality
   - ✅ Push notifications (if enabled)

### Test on Simulator
```bash
# iOS Simulator
npx expo start
# Press 'i' in terminal

# Android Emulator  
npx expo start
# Press 'a' in terminal
```

## Performance Tips

1. **Enable Fast Refresh**
   - Automatically enabled in Expo Go
   - Preserves component state during edits

2. **Use Production Mode for Testing**
   ```bash
   npx expo start --no-dev --minify
   ```

3. **Profile Performance**
   ```bash
   npx expo start --dev-client
   # Open React DevTools
   ```

## Switching Between Expo Go and Custom Builds

### Use Expo Go for:
- Quick UI changes
- Testing business logic
- Rapid prototyping
- Sharing with non-technical team members

### Use Custom Builds for:
- Testing native features
- Final QA before release
- Performance testing
- Testing with custom native modules

## Common Commands

```bash
# Start development server
npx expo start

# Start with clear cache
npx expo start --clear

# Start in tunnel mode (for remote testing)
npx expo start --tunnel

# Start in LAN mode (default)
npx expo start --lan

# Start in localhost mode
npx expo start --localhost

# Publish to Expo
npx expo publish

# Check for updates
npx expo-cli upgrade

# Doctor (check for issues)
npx expo-doctor
```

## Next Steps

1. **Start the dev server**: `npx expo start`
2. **Scan QR code** with Expo Go app
3. **Test your changes** in real-time
4. **Share with team** using QR code or link

## Support

- [Expo Documentation](https://docs.expo.dev/)
- [Expo Go Documentation](https://docs.expo.dev/get-started/expo-go/)
- [Expo Forums](https://forums.expo.dev/)
- [Expo Discord](https://chat.expo.dev/)

---

**Happy coding! 🚀**

