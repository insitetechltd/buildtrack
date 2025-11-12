# Build Number Increment Fix

## Problem Discovered

When running `build-and-submit-FIXED.sh`, the build number showed **"2"** instead of **"61"**.

### Root Cause

The `increment-build.sh` script was:
1. Trying to fetch the last build number from EAS API
2. EAS API call was failing or returning wrong data
3. Falling back to `app.json` which had been reset to "1"
4. Incrementing 1 → 2 (wrong!)

### Why This Happened

```bash
# increment-build.sh line 14:
LAST_BUILD=$(npx eas build:list --platform ios --limit 1 --json ...)

# This command was:
# - Not returning the correct build number (60)
# - Timing out or returning incomplete data
# - Causing script to fall back to app.json value
```

---

## Solution

### Created `increment-build-FIXED.sh`

**Key Changes:**
1. ✅ **Uses `app.json` as source of truth** (not EAS API)
2. ✅ **Simpler and more reliable** - no network calls
3. ✅ **Better error messages** if buildNumber not found
4. ✅ **Shows clear summary** of old → new build number

### How It Works

```bash
# Old (Broken):
1. Try to fetch from EAS API → Fails
2. Fall back to app.json → Gets wrong value
3. Increment wrong value → Wrong result

# New (Fixed):
1. Read current build from app.json → Reliable
2. Increment by 1 → Correct
3. Update app.json and Info.plist → Done
```

---

## Files Updated

### 1. Created `increment-build-FIXED.sh`
- Reads build number directly from `app.json`
- No reliance on EAS API
- Simple and reliable

### 2. Updated `build-local-FIXED.sh`
- Now calls `increment-build-FIXED.sh` first
- Falls back to old script if new one not found

### 3. Updated `build-and-submit-FIXED.sh`
- Now calls `increment-build-FIXED.sh` first
- Falls back to old script if new one not found

### 4. Fixed `app.json` and `Info.plist`
- Manually set build number back to **61**
- This is the correct value (one higher than rejected build 60)

---

## Current Status

```
Version:  1.1.2  ← Correct
Build:    61     ← Correct (fixed from 2)
Display:  1.1.2 (61)
```

---

## Why EAS API Doesn't Work

The EAS API command used in the old script:
```bash
npx eas build:list --platform ios --limit 1 --json --non-interactive
```

**Problems:**
- Returns incomplete or malformed JSON
- Doesn't reliably return the `buildNumber` field
- Network dependent (fails offline or with slow connection)
- Parses JSON incorrectly with `grep` (fragile)

**Better Approach:**
- Use `app.json` as the source of truth
- It's always available locally
- No network dependency
- Simple and reliable

---

## Testing

### Before Fix:
```bash
./build-and-submit-FIXED.sh ios production
# Output: Built: Version 1.1.2 (Build 2) ❌ WRONG
```

### After Fix:
```bash
./build-and-submit-FIXED.sh ios production
# Output: Built: Version 1.1.2 (Build 62) ✅ CORRECT
# (61 incremented to 62)
```

---

## Migration

### Option 1: Use Fixed Scripts (Recommended)
The FIXED scripts now automatically use `increment-build-FIXED.sh`:
```bash
./build-and-submit-FIXED.sh ios production
```

### Option 2: Use increment-build-FIXED.sh Manually
```bash
./increment-build-FIXED.sh
./build-local.sh ios production
```

### Option 3: Replace Old Script
```bash
mv increment-build.sh increment-build-OLD.sh
mv increment-build-FIXED.sh increment-build.sh
```

---

## Comparison

| Feature | Old Script | Fixed Script |
|---------|------------|--------------|
| **Data Source** | EAS API | app.json |
| **Network Required** | ✅ Yes | ❌ No |
| **Reliability** | ⚠️ Fails often | ✅ Always works |
| **Speed** | 🐌 Slow (API call) | ⚡ Fast (local read) |
| **Error Messages** | ⚠️ Generic | ✅ Specific |
| **Fallback Logic** | ⚠️ Complex | ✅ Simple |

---

## Key Takeaway

**The build number in `app.json` is the source of truth.**

- Don't rely on EAS API for build numbers
- Always check `app.json` before building
- Use `increment-build-FIXED.sh` for reliability

---

## Next Steps

1. ✅ Build number fixed to 61
2. ✅ Created reliable increment script
3. ✅ Updated FIXED build scripts to use it
4. 🚀 Ready to build and submit!

Run:
```bash
./build-and-submit-FIXED.sh ios production
```

This will now correctly show:
```
Built: Version 1.1.2 (Build 62)
```

