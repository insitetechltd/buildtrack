# Local Build Quick Start Guide

## TL;DR - Run Non-Interactive Local Builds

```bash
# iOS build (no prompts, fully automated)
./build-local.sh

# Android build
./build-local.sh production-local android
```

That's it! The script will:
- ✅ Automatically load EXPO_TOKEN from .env
- ✅ Fetch iOS credentials from EAS
- ✅ Build locally without any prompts
- ✅ Output: `build-[timestamp].ipa`

## What Changed?

### Before (Interactive)
```bash
./build-local.sh
# ❌ Prompts for Apple account
# ❌ Prompts for team selection
# ❌ Prompts for certificate selection
# ❌ Manual intervention required
```

### After (Non-Interactive)
```bash
./build-local.sh
# ✅ Reads EXPO_TOKEN from .env
# ✅ Fetches credentials from EAS automatically
# ✅ Builds without any prompts
# ✅ Fully automated
```

## Requirements

1. **EXPO_TOKEN in .env** ✅ (Already configured)
2. **EAS credentials set up** ✅ (Already configured)
3. **Xcode installed** (for iOS builds)

## Build Profiles

| Command | Profile | Output |
|---------|---------|--------|
| `./build-local.sh` | production-local | IPA for internal testing |
| `./build-local.sh preview ios` | preview | Preview IPA |
| `./build-local.sh production-local android` | production-local | APK/AAB |

## Output Location

```bash
# Build output
build-[timestamp].ipa  # iOS builds
build-[timestamp].apk  # Android builds (if configured)
```

## Troubleshooting

### "EXPO_TOKEN not found"
```bash
# Check .env file
cat .env | grep EXPO_TOKEN

# If missing, add it:
echo "EXPO_TOKEN=your_token_here" >> .env
```

### "Build failed"
```bash
# Check EAS credentials
npx eas credentials --platform ios

# Verify you're logged in
npx eas whoami
```

## Advanced Usage

### Custom Profile
```bash
# Use a different profile
./build-local.sh preview ios
```

### Override Token
```bash
# Use a different token temporarily
EXPO_TOKEN=other_token ./build-local.sh
```

### Verbose Output
```bash
# Add EAS_DEBUG for detailed logs
EAS_DEBUG=1 ./build-local.sh
```

## Next Steps

After building:

### 1. Test Locally
```bash
# Install on connected iOS device
npx eas device:create

# Or test in simulator
./build-local.sh simulator ios
```

### 2. Submit to TestFlight
```bash
# Build with cloud (required for TestFlight)
npx eas build --platform ios --profile production

# Then submit
npx eas submit --platform ios --latest
```

### 3. Distribute Internally
```bash
# Share the IPA file directly
# Or upload to EAS for internal distribution
```

## Documentation

For detailed information, see:
- [NON_INTERACTIVE_LOCAL_BUILDS.md](./NON_INTERACTIVE_LOCAL_BUILDS.md) - Complete guide
- [LOCAL_BUILD_GUIDE.md](./LOCAL_BUILD_GUIDE.md) - Original local build guide
- [BUILD_SCRIPTS.md](./BUILD_SCRIPTS.md) - All build scripts explained

---

**Status**: ✅ Ready to use
**Last Updated**: November 12, 2025

