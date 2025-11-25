# Installing Expo Go on iPhone 17 Pro Simulator

## Method 1: App Store (Recommended - Easiest)

1. **Open Simulator:**
   ```bash
   open -a Simulator
   ```

2. **Open App Store in Simulator:**
   - In the simulator, tap the "App Store" app icon
   - If you don't see it, search for it in Spotlight (⌘+Space, type "App Store")

3. **Search for Expo Go:**
   - In App Store, search for "Expo Go"
   - Look for the app by Expo (icon with "EXPO" text)

4. **Install:**
   - Tap "Get" or "Install"
   - Wait for installation to complete

## Method 2: Direct Installation via Command Line

If you have the Expo Go .app bundle:

```bash
# Find your booted simulator
xcrun simctl list devices | grep Booted

# Install the .app bundle
xcrun simctl install "iPhone 17 Pro Network" /path/to/Expo\ Go.app

# Or install via device UDID
xcrun simctl install 344AB872-A036-4836-929C-18713B027D9B /path/to/Expo\ Go.app
```

## Method 3: Using expo-cli

If you have expo-cli installed globally:

```bash
# Install Expo Go on connected simulator
npx expo install:ios
```

## Verify Installation

After installation, verify Expo Go is installed:

```bash
# Check if Expo Go is installed
xcrun simctl listapps "iPhone 17 Pro Network" | grep -i expo

# Or check bundle identifier
xcrun simctl get_app_container "iPhone 17 Pro Network" com.expo.client
```

## Current Simulator Status

Based on the system check:
- **iPhone 17 Pro Network** (Booted) - UDID: `344AB872-A036-4836-929C-18713B027D9B`
- **iPhone 17 Pro** (Shutdown) - UDID: `0ABBE52A-C4ED-44B6-A31D-953C80BAE454`

## Troubleshooting

### If App Store doesn't open:
1. Make sure the simulator is booted
2. Try resetting the simulator:
   ```bash
   xcrun simctl shutdown "iPhone 17 Pro Network"
   xcrun simctl boot "iPhone 17 Pro Network"
   ```

### If installation fails:
1. Check simulator logs:
   ```bash
   xcrun simctl spawn booted log stream --predicate 'processImagePath contains "Expo"'
   ```

2. Make sure you're signed into the App Store in the simulator (Settings > App Store)

### Manual Download:
If App Store isn't working, you can manually download the .ipa file and install it:
1. Download Expo Go .ipa from Expo's website or GitHub releases
2. Extract the .app bundle from the .ipa
3. Use `xcrun simctl install` command above

