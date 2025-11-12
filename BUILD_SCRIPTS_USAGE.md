# Build Scripts Usage Guide

## All Build Scripts - Argument Reference

### Consistent Argument Order (FIXED)
All scripts now use the same argument order:
```
PLATFORM PROFILE [additional_args]
```

---

## 1. `build-local.sh` (Original)

### Syntax
```bash
./build-local.sh [PLATFORM] [PROFILE]
```

### Arguments
- **PLATFORM** (optional): `ios` or `android` (default: `ios`)
- **PROFILE** (optional): Build profile from eas.json (default: `production-local`)

### Examples
```bash
# Use all defaults (ios, production-local)
./build-local.sh

# Specify platform only (uses default profile: production-local)
./build-local.sh ios

# Specify both platform and profile
./build-local.sh ios production
./build-local.sh ios production-local
./build-local.sh android production
```

### What It Does
1. Loads credentials from .env
2. Verifies EAS authentication
3. Builds locally (claims EAS will auto-increment, but doesn't work)

### ⚠️ Issues
- Does NOT increment build number properly
- Relies on broken EAS auto-increment
- No version management

---

## 2. `build-local-FIXED.sh` (Recommended)

### Syntax
```bash
./build-local-FIXED.sh [PLATFORM] [PROFILE] [SKIP_INCREMENT]
```

### Arguments
- **PLATFORM** (optional): `ios` or `android` (default: `ios`)
- **PROFILE** (optional): Build profile from eas.json (default: `production-local`)
- **SKIP_INCREMENT** (optional): `true` to skip build increment (default: `false`)

### Examples
```bash
# Use all defaults (ios, production-local, auto-increment)
./build-local-FIXED.sh

# Specify platform only
./build-local-FIXED.sh ios

# Specify platform and profile
./build-local-FIXED.sh ios production
./build-local-FIXED.sh ios production-local
./build-local-FIXED.sh android production

# Skip build increment (if you already ran increment-build.sh)
./build-local-FIXED.sh ios production true
```

### What It Does
1. **Prompts** about version number (keep or change)
2. **Automatically calls** `increment-build.sh` to increment build number
3. Loads credentials from .env
4. Verifies EAS authentication
5. Builds locally with correct version/build numbers

### ✅ Advantages
- Properly increments build number
- Prompts for version management
- Clear step-by-step output
- Shows what's being built

---

## 3. `build-and-submit.sh` (Original)

### Syntax
```bash
./build-and-submit.sh [PLATFORM] [PROFILE]
```

### Arguments
- **PLATFORM** (optional): `ios` or `android` (default: `ios`)
- **PROFILE** (optional): Build profile from eas.json (default: `production`)

### Examples
```bash
# Use all defaults (ios, production)
./build-and-submit.sh

# Specify platform only (uses default profile: production)
./build-and-submit.sh ios

# Specify both platform and profile
./build-and-submit.sh ios production
./build-and-submit.sh android production
```

### What It Does
1. Builds locally (claims EAS will auto-increment, but doesn't work)
2. Submits to App Store Connect / Google Play

### ⚠️ Issues
- Does NOT increment build number properly
- Relies on broken EAS auto-increment
- No version management
- No confirmation before submitting

---

## 4. `build-and-submit-FIXED.sh` (Recommended)

### Syntax
```bash
./build-and-submit-FIXED.sh [PLATFORM] [PROFILE]
```

### Arguments
- **PLATFORM** (optional): `ios` or `android` (default: `ios`)
- **PROFILE** (optional): Build profile from eas.json (default: `production`)

### Examples
```bash
# Use all defaults (ios, production)
./build-and-submit-FIXED.sh

# Specify platform only
./build-and-submit-FIXED.sh ios

# Specify both platform and profile
./build-and-submit-FIXED.sh ios production
./build-and-submit-FIXED.sh android production
```

### What It Does
1. **Prompts** about version number (keep or change)
2. **Automatically calls** `increment-build.sh` to increment build number
3. Builds locally with correct version/build numbers
4. **Asks for confirmation** before submitting
5. Submits to App Store Connect / Google Play

### ✅ Advantages
- Properly increments build number
- Prompts for version management
- Confirmation before submitting
- Clear step-by-step output
- Shows exactly what's being submitted

---

## 5. `increment-build.sh` (Utility)

### Syntax
```bash
./increment-build.sh
```

### Arguments
None - fully automatic

### What It Does
1. Fetches last build number from EAS (or local files)
2. Increments build number by 1
3. Updates `app.json` and `ios/BuildTrack/Info.plist`

### When to Use
- Manually before building (if using old scripts)
- Automatically called by fixed scripts
- To check/fix build number

---

## 6. `sync-icons.sh` (Utility)

### Syntax
```bash
./sync-icons.sh
```

### Arguments
None

### What It Does
Syncs app icon from `assets/icon.png` to iOS native project

---

## Quick Reference Table

| Script | Platform Arg | Profile Arg | Auto-Increment | Version Prompt | Confirmation | Recommended |
|--------|--------------|-------------|----------------|----------------|--------------|-------------|
| `build-local.sh` | 1st (ios) | 2nd (production-local) | ❌ Broken | ❌ No | ❌ No | ❌ No |
| `build-local-FIXED.sh` | 1st (ios) | 2nd (production-local) | ✅ Yes | ✅ Yes | ❌ No | ✅ **Yes** |
| `build-and-submit.sh` | 1st (ios) | 2nd (production) | ❌ Broken | ❌ No | ❌ No | ❌ No |
| `build-and-submit-FIXED.sh` | 1st (ios) | 2nd (production) | ✅ Yes | ✅ Yes | ✅ Yes | ✅ **Yes** |
| `increment-build.sh` | N/A | N/A | ✅ Manual | ❌ No | ❌ No | ✅ Utility |
| `sync-icons.sh` | N/A | N/A | N/A | N/A | N/A | ✅ Utility |

---

## Common Usage Patterns

### For Local Testing (No Submission)
```bash
# Recommended: Use fixed version
./build-local-FIXED.sh ios production-local

# Or with defaults
./build-local-FIXED.sh
```

### For TestFlight Submission
```bash
# Recommended: Use fixed version
./build-and-submit-FIXED.sh ios production

# Or with defaults
./build-and-submit-FIXED.sh
```

### For Android
```bash
# Local build
./build-local-FIXED.sh android production-local

# Build and submit
./build-and-submit-FIXED.sh android production
```

### Manual Build Number Management
```bash
# Increment build number manually
./increment-build.sh

# Then build without auto-increment
./build-local-FIXED.sh ios production true
```

---

## Argument Order History

### Before Fix (Inconsistent)
```bash
build-local.sh PROFILE PLATFORM        # ❌ Backwards!
build-and-submit.sh PLATFORM PROFILE   # ✅ Correct
```

### After Fix (Consistent)
```bash
build-local.sh PLATFORM PROFILE           # ✅ Fixed
build-local-FIXED.sh PLATFORM PROFILE     # ✅ Consistent
build-and-submit.sh PLATFORM PROFILE      # ✅ Already correct
build-and-submit-FIXED.sh PLATFORM PROFILE # ✅ Consistent
```

---

## EAS Profiles Reference

From `eas.json`:

| Profile | Distribution | Auto-Increment | Use Case |
|---------|--------------|----------------|----------|
| `production` | store | ✅ (broken) | App Store submission |
| `production-local` | internal | ✅ (broken) | Local testing |
| `preview` | internal | ❌ No | Preview builds |
| `simulator` | internal | ❌ No | iOS Simulator |

---

## Tips

1. **Always use FIXED scripts** for reliable builds
2. **Platform first, profile second** - now consistent across all scripts
3. **Let scripts handle build numbers** - don't edit manually
4. **Version numbers** still need manual editing in `app.json`
5. **Test locally first** with `build-local-FIXED.sh` before submitting

---

## Current Configuration

```
Version:  1.1.2  ← Edit in app.json when needed
Build:    61     ← Auto-incremented by scripts
Display:  1.1.2 (61)
```

---

## Examples with Current Numbers

### Bug Fix Build (Keep Version)
```bash
./build-and-submit-FIXED.sh ios production
# Prompts: Keep version 1.1.2? Y
# Increments: Build 61 → 62
# Builds: 1.1.2 (62)
# Submits: To TestFlight
```

### New Feature Build (Change Version)
```bash
# First: Edit app.json, change "version": "1.1.2" → "1.1.3"
./build-and-submit-FIXED.sh ios production
# Prompts: Keep version 1.1.3? Y
# Increments: Build 62 → 63
# Builds: 1.1.3 (63)
# Submits: To TestFlight
```

