# Showing QR Code for Expo Dev Server

## Quick Method

The QR code is automatically displayed when you start the Expo dev server. To see it:

```bash
cd "/Volumes/KooDrive/Insite App"
npx expo start
```

The QR code will appear in the terminal output. You can scan it with:
- **Expo Go app** on your physical iPhone
- **Camera app** on iOS (which will open Expo Go)

## Alternative: Access via Web Interface

1. **Start the dev server:**
   ```bash
   npx expo start
   ```

2. **Open in browser:**
   - The terminal will show a URL like `http://localhost:8081`
   - Or press `w` to open in web browser
   - The web interface will show the QR code

3. **Or access directly:**
   - Open `http://localhost:8081` in your browser
   - The QR code should be visible on the page

## For Simulator (No QR Code Needed)

If you're using the iPhone 17 Pro simulator, you don't need the QR code. Instead:

1. **Make sure Expo Go is installed** on the simulator (see INSTALL_EXPO_GO.md)

2. **Start the dev server:**
   ```bash
   npx expo start
   ```

3. **Press `i` in the terminal** to open in iOS simulator, or:
   ```bash
   npx expo start --ios
   ```

## Current Server Status

Based on the system check:
- ✅ Expo dev server is running on port 8081
- ✅ Metro bundler is active
- ✅ Server status: `packager-status:running`

## Troubleshooting

### If QR code doesn't appear:
1. Make sure the terminal window is wide enough (QR codes need space)
2. Try: `npx expo start --clear` to restart fresh
3. Check terminal output for any errors

### If you need to see the connection URL:
The terminal output will show something like:
```
› Metro waiting on exp://192.168.1.xxx:8081
```

You can manually generate a QR code from this URL using:
- Online QR code generators
- Or use the Expo web interface at `http://localhost:8081`

### For Physical Device:
1. Make sure your phone and computer are on the same WiFi network
2. Scan the QR code with Expo Go app
3. Or manually enter the connection URL in Expo Go

