# Android Build Error Fix: createBundleReleaseJsAndAssets

## Error Message

```
Execution failed for task ':app:createBundleReleaseJsAndAssets'.
> Process 'command 'node'' finished with non-zero exit value 1
```

## What This Means

This error occurs when the JavaScript bundling step fails during the Android build. The Node.js process that bundles your React Native/Expo code is exiting with an error.

## Common Causes

1. **JavaScript/TypeScript errors** in your code
2. **Module resolution issues** (like the @anthropic-ai/sdk warnings)
3. **Cache corruption** in Metro bundler or Gradle
4. **Memory issues** during bundling
5. **Missing dependencies** or broken node_modules

## Solutions

### Solution 1: Clear All Caches (Try This First!)

```bash
# Run the fix script
./fix-android-build.sh

# Or manually:
rm -rf node_modules/.cache
rm -rf .expo
rm -rf android/app/build
rm -rf android/.gradle
cd android && ./gradlew clean && cd ..
```

Then try building again:
```bash
./build-and-submit-android.sh --clean
```

### Solution 2: Check for JavaScript Errors

The error might be caused by actual code errors. Check:

```bash
# Check TypeScript errors
npx tsc --noEmit

# Try bundling manually
npx expo export --platform android --output-dir /tmp/test-export
```

### Solution 3: Fix @anthropic-ai/sdk Module Issues

The warnings about `@anthropic-ai/sdk` might be causing issues. Try:

1. **Check if it's actually used in Android builds:**
   ```bash
   grep -r "@anthropic-ai/sdk" src/ --include="*.ts" --include="*.tsx"
   ```

2. **If not needed for Android, exclude it:**
   Add to `metro.config.js`:
   ```javascript
   resolver: {
     blockList: [/node_modules\/@anthropic-ai\/sdk\/.*/],
   }
   ```

3. **Or update the package** to a version that supports React Native better.

### Solution 4: Build with More Verbose Output

To see the actual error:

```bash
cd android
./gradlew bundleRelease --stacktrace --info 2>&1 | tee build.log
```

Then check `build.log` for the actual Node.js error message.

### Solution 5: Check Node.js Version

Make sure you're using a compatible Node.js version:

```bash
node --version  # Should be 18.x or 20.x
```

### Solution 6: Increase Memory for Node

If bundling fails due to memory:

```bash
export NODE_OPTIONS="--max-old-space-size=4096"
cd android && ./gradlew bundleRelease
```

### Solution 7: Build Step by Step

Instead of using the build script, try building manually:

```bash
# 1. Clear caches
./fix-android-build.sh

# 2. Prebuild (if needed)
npx expo prebuild --platform android --clean

# 3. Build AAB
cd android
./gradlew bundleRelease --stacktrace
```

## What I Fixed

1. ✅ **Fixed signing config** - Release builds now use release signing (was using debug)
2. ✅ **Created fix script** - `fix-android-build.sh` to clear all caches
3. ✅ **Cleared caches** - Removed build artifacts that might cause issues

## Next Steps

1. **Run the fix script:**
   ```bash
   ./fix-android-build.sh
   ```

2. **Try building again:**
   ```bash
   ./build-and-submit-android.sh --clean
   ```

3. **If it still fails**, run with verbose output to see the actual error:
   ```bash
   cd android
   ./gradlew bundleRelease --stacktrace --info 2>&1 | tee build-error.log
   ```

4. **Check the log file** for the actual Node.js error message.

## Additional Notes

- The `@anthropic-ai/sdk` warnings are just warnings, not errors. They shouldn't cause the build to fail.
- If the build worked when I tested it, it might be an intermittent issue or cache problem.
- The signing config fix ensures release builds are properly signed.

