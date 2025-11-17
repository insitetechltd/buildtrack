# Expo Go - Quick Start Guide

## 🚀 Start in 3 Steps

### Step 1: Install Expo Go on Your Phone
- **iOS**: [Download from App Store](https://apps.apple.com/app/expo-go/id982107779)
- **Android**: [Download from Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

### Step 2: Start the Development Server

**Option A: Use the script (easiest)**
```bash
./start-expo-go.sh
```

**Option B: Use npm/npx directly**
```bash
npx expo start
```

**Option C: Clear cache and start**
```bash
./start-expo-go.sh --clear
# or
npx expo start --clear
```

### Step 3: Scan QR Code

**On iOS:**
1. Open the Camera app
2. Point at the QR code in your terminal
3. Tap the notification that appears

**On Android:**
1. Open the Expo Go app
2. Tap "Scan QR code"
3. Point at the QR code in your terminal

## ⚡ Quick Commands

```bash
# Start development server
npx expo start

# Start with clear cache
npx expo start --clear

# Start in tunnel mode (for remote devices)
npx expo start --tunnel

# Open iOS simulator
npx expo start
# Then press 'i' in terminal

# Open Android emulator
npx expo start
# Then press 'a' in terminal
```

## 🎯 What You Can Do

✅ **Test all features** on a real device
✅ **Hot reload** - changes appear instantly
✅ **Debug** with React DevTools
✅ **Share** with team members via QR code
✅ **Test offline** functionality
✅ **Test camera** and photo features
✅ **Test notifications** (if enabled)

## 🔧 Keyboard Shortcuts (in terminal)

- `r` - Reload app
- `m` - Toggle menu
- `j` - Open debugger
- `i` - Open iOS simulator
- `a` - Open Android emulator
- `w` - Open in web browser
- `c` - Clear cache
- `d` - Open developer menu on device

## 🐛 Troubleshooting

### Can't connect to server?
```bash
# Make sure phone and computer are on same WiFi
# Try tunnel mode:
npx expo start --tunnel
```

### App crashes on startup?
```bash
# Clear cache and restart:
npx expo start --clear
```

### "Unable to resolve module"?
```bash
# Reinstall dependencies:
rm -rf node_modules
npm install
npx expo start --clear
```

### QR code not scanning?
- Make sure Expo Go app is updated
- Try typing the URL manually in Expo Go
- Use tunnel mode: `npx expo start --tunnel`

## 📱 Device Requirements

- **iOS**: iOS 13.4 or later
- **Android**: Android 5.0 (API 21) or later
- **Expo Go app** must be installed
- **Same WiFi network** as your computer (or use tunnel mode)

## 🌐 Remote Testing (Tunnel Mode)

If your device is on a different network:

```bash
npx expo start --tunnel
```

This creates a public URL that works from anywhere!

## 👥 Share with Team

1. Start the dev server: `npx expo start`
2. Share the QR code or URL with team members
3. They scan with Expo Go app
4. They see your latest changes in real-time!

## 🔄 Update Workflow

1. Make code changes
2. Save the file
3. App automatically reloads (Fast Refresh)
4. See changes instantly on device

## 📊 Performance

Expo Go is great for development but:
- ⚠️ Slightly slower than production builds
- ⚠️ Limited to Expo SDK modules
- ✅ Perfect for rapid development
- ✅ Great for UI/UX testing

## 🎓 Learn More

- [Expo Go Documentation](https://docs.expo.dev/get-started/expo-go/)
- [Expo CLI Documentation](https://docs.expo.dev/more/expo-cli/)
- [Debugging Guide](https://docs.expo.dev/debugging/runtime-issues/)

---

**Ready to start? Run:** `./start-expo-go.sh` 🚀

