# Expo Hot Reload / Fast Refresh Guide

## Automatic Reloading (No Restart Needed)

Expo uses **Fast Refresh** (formerly Hot Reloading) which automatically updates your app when you save code changes. This works for:

✅ **Component changes** - React components update instantly
✅ **Style changes** - CSS/Tailwind classes update immediately  
✅ **Logic changes** - Function updates, state management changes
✅ **TypeScript changes** - Type updates and code modifications
✅ **Store updates** - Zustand store changes (with some limitations)

## When You Need to Restart

You'll need to manually restart in these cases:

### 1. Native Code Changes
- Changes to native modules
- Native dependency updates
- Platform-specific native code

### 2. Configuration Changes
- `app.json` or `app.config.js` changes
- Expo plugin configurations
- Build settings

### 3. Environment Variables
- Changes to `.env` files
- New environment variables
- Updated API keys or URLs

### 4. New Dependencies
- After running `npm install` or `yarn add`
- New native modules
- Updated packages with native code

### 5. Cache Issues
- If Fast Refresh stops working
- Stale bundle cache
- Metro bundler issues

### 6. App Entry Point Changes
- Changes to `index.ts` or main entry file
- Navigation structure changes (sometimes)

## How to Restart

### Quick Restart (Keep Server Running)
In the Expo terminal, press:
- `r` - Reload the app (soft restart)
- `shift + r` - Reload and clear cache

### Full Restart (Stop and Start Server)
1. **Stop the server:**
   - Press `Ctrl + C` in the terminal where Expo is running
   - Or: `killall node` (kills all Node processes)

2. **Start again:**
   ```bash
   npx expo start
   ```

3. **Or with cache clear:**
   ```bash
   npx expo start --clear
   ```

### Restart Commands from package.json
```bash
# Normal start
npm start

# Start with cleared cache
npm run start:clear

# Start with tunnel (for testing on physical devices)
npm run start:tunnel
```

## Troubleshooting Fast Refresh

### If Changes Don't Appear:

1. **Check the terminal** - Look for errors or warnings
2. **Try manual reload:**
   - Shake device/simulator → "Reload"
   - Or press `r` in Expo terminal
3. **Clear cache:**
   ```bash
   npx expo start --clear
   ```
4. **Check for syntax errors** - Fast Refresh stops on errors
5. **Restart Metro bundler:**
   - Stop server (`Ctrl + C`)
   - Start again (`npx expo start`)

### Common Issues:

**"Fast Refresh: preserving local component state"**
- This is normal - state is preserved during updates
- If you need fresh state, do a full reload (`r` in terminal)

**Changes not reflecting:**
- Make sure you saved the file
- Check for TypeScript/JavaScript errors
- Try `shift + r` to reload with cache clear

**App crashes after code change:**
- Check terminal for error messages
- Look for syntax errors in your code
- Try full restart with `--clear` flag

## Best Practices

1. **Save files frequently** - Fast Refresh triggers on save
2. **Watch the terminal** - Errors will show there
3. **Use TypeScript** - Catches errors before they break Fast Refresh
4. **Keep terminal visible** - See reload status and errors
5. **Test on both simulator and device** - Sometimes one needs restart

## Current Setup

Your project has these scripts available:
- `npm start` - Start Expo dev server
- `npm run start:clear` - Start with cleared cache
- `npm run start:tunnel` - Start with tunnel for remote access

## Summary

**Most of the time:** Just save your file and the app updates automatically! 🎉

**When to restart:** Only when you change config, env vars, install packages, or Fast Refresh stops working.

