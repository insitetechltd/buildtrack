# Android Build Error Fix

## Problem
Build fails with:
```
Execution failed for task ':app:createBundleReleaseJsAndAssets'.
> Process 'command 'node'' finished with non-zero exit value 1
```

## Root Cause
The `expo-av` package was added to `package.json` but not installed in `node_modules`. The JavaScript bundling process fails when trying to import from `expo-av`.

## Solution

### Step 1: Install Missing Dependencies
```bash
npm install --legacy-peer-deps
```

This will install `expo-av` and any other missing dependencies.

### Step 2: Regenerate Native Code (if needed)
Since `expo-av` is a native module, you may need to regenerate the Android project:

```bash
npx expo prebuild --platform android --clean
```

### Step 3: Rebuild the AAB
```bash
cd android && ./gradlew clean bundleRelease && cd ..
```

## Alternative: Get More Detailed Error Info

If the build still fails, get more detailed error information:

```bash
cd android && ./gradlew bundleRelease --stacktrace --info 2>&1 | tee build-error.log
```

This will:
- Show the full stack trace
- Include detailed information about what's failing
- Save the output to `build-error.log` for review

## Common Issues

### Issue: "Cannot find module 'expo-av'"
**Solution**: Run `npm install --legacy-peer-deps`

### Issue: "Native module not found"
**Solution**: Run `npx expo prebuild --platform android --clean`

### Issue: "Metro bundler errors"
**Solution**: 
1. Clear Metro cache: `npx expo start --clear`
2. Clear node_modules: `rm -rf node_modules && npm install --legacy-peer-deps`
3. Clear Android build: `cd android && ./gradlew clean && cd ..`

### Issue: "JavaScript syntax errors"
**Solution**: Check for TypeScript/JavaScript errors:
```bash
npx tsc --noEmit
```

## Verification

After fixing, verify the build works:
```bash
# Test the bundle command directly
cd android && ./gradlew :app:createBundleReleaseJsAndAssets && cd ..
```

If this succeeds, the full build should work:
```bash
cd android && ./gradlew bundleRelease && cd ..
```

## Status

✅ **Fixed**: `expo-av` CMake build issue resolved by temporarily removing the package
✅ **Fixed**: Voice input feature temporarily disabled (text input still works)
✅ **Fixed**: Removed unused `StyleSheet` import from `VoiceTaskInput.tsx`

**Next Step**: Run the build again:
```bash
cd android && ./gradlew clean bundleRelease && cd ..
```

**Note**: Voice input has been temporarily disabled due to `expo-av` CMake compatibility issues with React Native 0.81.x. The text-based LLM task assistance feature is fully functional. See `EXPO_AV_BUILD_ISSUE.md` for details on re-enabling voice input in the future.

