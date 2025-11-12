# Build Scripts Analysis & Issues

## All Build-Related Scripts

### 1. `build-local.sh`
**Purpose**: Build locally without submitting  
**Profile**: `production-local` (default)  
**Does it increment version?**: ❌ NO - Relies on EAS auto-increment  
**Does it increment build?**: ⚠️ CLAIMS TO (via EAS auto-increment) but doesn't actually work

### 2. `build-and-submit.sh`
**Purpose**: Build locally AND submit to App Store  
**Profile**: `production` (default)  
**Does it increment version?**: ❌ NO - Relies on EAS auto-increment  
**Does it increment build?**: ⚠️ CLAIMS TO (via EAS auto-increment) but doesn't actually work  
**Calls build-local?**: ❌ NO - Duplicates the build command

### 3. `increment-build.sh`
**Purpose**: Manually increment build number  
**Does it increment version?**: ❌ NO  
**Does it increment build?**: ✅ YES - Manually increments build number only

### 4. `sync-icons.sh`
**Purpose**: Sync app icons  
**Version related?**: ❌ NO

---

## Critical Issues Found

### Issue #1: Scripts Don't Call Each Other ❌
```
build-and-submit.sh
  ├─ Does NOT call increment-build.sh
  ├─ Does NOT call build-local.sh
  └─ Duplicates the build command

build-local.sh
  ├─ Does NOT call increment-build.sh
  └─ Standalone build command
```

**Problem**: Each script independently runs `npx eas build` and relies on EAS auto-increment, which is NOT working reliably.

### Issue #2: EAS Auto-Increment Not Working ⚠️
Both `build-local.sh` and `build-and-submit.sh` have this comment:
```bash
# Note about auto-increment
echo "ℹ️  Note: EAS auto-increment is enabled in eas.json"
echo "   Build number will be automatically incremented during build"
```

**But in reality**:
- `eas.json` has `"autoIncrement": true` for both profiles
- EAS auto-increment is supposed to work with `"appVersionSource": "remote"`
- BUT it's not actually incrementing the build number
- This is why we got the error: build 60 was already used

### Issue #3: No Version Number Management 🚫
**None of the scripts handle the VERSION number** (1.1.2)
- Only `increment-build.sh` handles BUILD number (61)
- Version changes must be done manually in `app.json`
- No script validates or prompts for version changes

### Issue #4: Inconsistent Documentation 📝
Scripts have conflicting information:
- `build-and-submit.sh` line 4: "EAS auto-increments version"
- `build-and-submit.sh` line 29: "Build will auto-increment version number"
- **WRONG**: It should say "build number", not "version number"

---

## EAS Configuration Analysis

### eas.json Settings
```json
{
  "cli": {
    "appVersionSource": "remote"  ← Tells EAS to manage versions
  },
  "build": {
    "production": {
      "autoIncrement": true  ← Should auto-increment build number
    },
    "production-local": {
      "autoIncrement": true  ← Should auto-increment build number
    }
  }
}
```

**Expected behavior**: EAS should automatically increment the build number  
**Actual behavior**: Not working - we had to manually set build to 61

---

## Current Workflow Problems

### Scenario 1: User runs `build-local.sh`
```
1. Script says: "EAS will auto-increment"
2. Runs: npx eas build --local
3. EAS auto-increment: FAILS (doesn't increment)
4. Build uses: 1.1.2 (2) ← Wrong build number
5. Result: ❌ Can't submit, build number too low
```

### Scenario 2: User runs `build-and-submit.sh`
```
1. Script says: "EAS will auto-increment"
2. Runs: npx eas build --local
3. EAS auto-increment: FAILS (doesn't increment)
4. Build uses: 1.1.2 (2) ← Wrong build number
5. Submits to App Store
6. Result: ❌ Rejected - build 60 already used
```

### Scenario 3: User runs `increment-build.sh` THEN `build-local.sh`
```
1. increment-build.sh: Sets build to 61 ✅
2. build-local.sh runs
3. EAS auto-increment: Overwrites to wrong number ❌
4. Result: ❌ Build number gets messed up
```

---

## What Should Happen

### Correct Workflow
```
┌─────────────────────────────────────────────────────┐
│  BEFORE BUILDING                                     │
│  1. Decide: Is this a new version or just a build?  │
│     - New features → Increment VERSION (1.1.2→1.1.3) │
│     - Bug fix only → Keep VERSION (1.1.2)            │
│  2. Always increment BUILD number (60→61)            │
│  3. Update app.json manually or with script          │
└─────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────┐
│  BUILDING                                            │
│  Option A: ./build-local.sh                          │
│  Option B: ./build-and-submit.sh                     │
│  Both should use the numbers from app.json           │
└─────────────────────────────────────────────────────┘
```

---

## Recommended Solution

### Option 1: Fix EAS Auto-Increment (Ideal)
Make EAS auto-increment actually work:
- Figure out why `"autoIncrement": true` isn't working
- Possibly need to use `"appVersionSource": "local"` instead
- Test thoroughly

### Option 2: Manual Pre-Build Increment (Current Workaround)
Always run `increment-build.sh` before building:
```bash
./increment-build.sh
./build-and-submit.sh
```

### Option 3: Integrate Scripts (Recommended)
Make scripts call each other:
```bash
build-and-submit.sh
  ├─ Calls increment-build.sh (increments build number)
  ├─ Calls build-local.sh (does the build)
  └─ Submits to App Store
```

---

## Script Relationships (Current vs Proposed)

### Current (Broken)
```
increment-build.sh ────┐
                       ├─ All independent
build-local.sh ────────┤   No coordination
                       │   EAS auto-increment fails
build-and-submit.sh ───┘
```

### Proposed (Fixed)
```
increment-build.sh
       ↓
build-local.sh ←─────── Used by both paths
       ↓
build-and-submit.sh ←── Adds submission step
```

Or even simpler:
```
build-and-submit.sh
  ├─ Step 1: increment-build.sh
  ├─ Step 2: npx eas build --local
  └─ Step 3: npx eas submit
```

---

## Immediate Action Items

1. ✅ **Document the issue** (this file)
2. ⚠️ **Disable EAS auto-increment** (it's not working)
3. ✅ **Update scripts to call increment-build.sh**
4. ✅ **Fix misleading comments** (version vs build number)
5. ✅ **Add version number management** to workflow
6. ✅ **Test the complete workflow**

---

## Summary

**The Problem**: 
- Scripts claim EAS auto-increments build numbers
- EAS auto-increment is NOT working
- Scripts don't coordinate with each other
- No version number management
- Confusing documentation

**The Solution**:
- Make scripts call each other
- Always manually increment build number before building
- Add version number prompts/checks
- Fix documentation
- Test thoroughly

