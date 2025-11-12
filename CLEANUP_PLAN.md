# Build Scripts Cleanup Plan

## Scripts to Keep (Active/Recommended)

### ✅ Keep These:
1. **`build-local-FIXED.sh`** - Working local build script
2. **`build-and-submit-REFACTORED.sh`** - Refactored version (calls build-local)
3. **`increment-build-FIXED.sh`** - Working build number increment
4. **`sync-icons.sh`** - Icon sync utility (unrelated to versioning)

---

## Scripts to Remove (Obsolete/Broken)

### ❌ Remove These:

1. **`build-local.sh`** - Old version with broken EAS auto-increment
   - Replaced by: `build-local-FIXED.sh`
   - Issues: Doesn't increment build number properly

2. **`build-and-submit.sh`** - Old version with broken EAS auto-increment
   - Replaced by: `build-and-submit-REFACTORED.sh`
   - Issues: Doesn't increment build number, duplicates code

3. **`build-and-submit-FIXED.sh`** - Intermediate version with code duplication
   - Replaced by: `build-and-submit-REFACTORED.sh`
   - Issues: Duplicates build logic instead of calling build-local

4. **`increment-build.sh`** - Old version using broken EAS API
   - Replaced by: `increment-build-FIXED.sh`
   - Issues: Relies on broken EAS API, gives wrong build numbers

---

## Old IPA Files to Remove

All these old build files (taking up space):
```
build-1762583270066.ipa
build-1762583759428.ipa
build-1762599362948.ipa
build-1762600075136.ipa
build-1762601799586.ipa
build-1762602981217.ipa
build-1762613670823.ipa
build-1762616602772.ipa
build-1762618823806.ipa
build-1762907741342.ipa
build-1762933302249.ipa
build-1762936815744.ipa
build-1762940875588.ipa
build-1762948126396.ipa
build-1762955112457.ipa
build-1762956628169.ipa
```

**Reason**: These are old builds that are already submitted to App Store Connect. They're just taking up disk space (~1-2GB).

---

## Recommended File Structure After Cleanup

### Build Scripts (Final):
```
build-local-FIXED.sh              ← Local build (with increment)
build-and-submit-REFACTORED.sh    ← Build + submit (calls build-local)
increment-build-FIXED.sh          ← Build number increment utility
sync-icons.sh                     ← Icon sync utility
```

### Documentation (Keep All):
```
BUILD_SCRIPTS_ANALYSIS.md         ← Analysis of issues
BUILD_SCRIPTS_FIX_SUMMARY.md      ← Summary of fixes
BUILD_SCRIPTS_USAGE.md            ← Usage guide
BUILD_NUMBER_FIX.md               ← Build number fix
BUILD_NUMBER_INCREMENT_FIX.md     ← Increment fix
SCRIPT_REFACTORING.md             ← Refactoring explanation
VERSION_NUMBERING_EXPLAINED.md    ← Version vs build guide
VERSION_VS_BUILD_MANAGEMENT.md    ← Management guide
```

---

## Cleanup Commands

### Safe Cleanup (Move to Archive):
```bash
# Create archive directory
mkdir -p archive/old-scripts
mkdir -p archive/old-builds

# Move old scripts
mv build-local.sh archive/old-scripts/
mv build-and-submit.sh archive/old-scripts/
mv build-and-submit-FIXED.sh archive/old-scripts/
mv increment-build.sh archive/old-scripts/

# Move old IPA files
mv build-*.ipa archive/old-builds/

# Add archive to .gitignore
echo "archive/" >> .gitignore
```

### Aggressive Cleanup (Delete):
```bash
# Remove old scripts
rm build-local.sh
rm build-and-submit.sh
rm build-and-submit-FIXED.sh
rm increment-build.sh

# Remove old IPA files
rm build-*.ipa
```

---

## Rename to Standard Names

After cleanup, rename the FIXED/REFACTORED versions to standard names:

```bash
# Rename to standard names (remove -FIXED/-REFACTORED suffix)
mv build-local-FIXED.sh build-local.sh
mv build-and-submit-REFACTORED.sh build-and-submit.sh
mv increment-build-FIXED.sh increment-build.sh
```

**Final result:**
```
build-local.sh          ← Clean, working version
build-and-submit.sh     ← Clean, working version (calls build-local)
increment-build.sh      ← Clean, working version
sync-icons.sh           ← Unchanged
```

---

## Migration Steps

### Step 1: Archive Old Scripts (Safe)
```bash
mkdir -p archive/old-scripts
mv build-local.sh archive/old-scripts/build-local-OLD.sh
mv build-and-submit.sh archive/old-scripts/build-and-submit-OLD.sh
mv build-and-submit-FIXED.sh archive/old-scripts/build-and-submit-FIXED-OLD.sh
mv increment-build.sh archive/old-scripts/increment-build-OLD.sh
echo "archive/" >> .gitignore
git add .gitignore
git commit -m "Archive old build scripts"
```

### Step 2: Rename Working Scripts
```bash
mv build-local-FIXED.sh build-local.sh
mv build-and-submit-REFACTORED.sh build-and-submit.sh
mv increment-build-FIXED.sh increment-build.sh
git add build-local.sh build-and-submit.sh increment-build.sh
git commit -m "Rename working scripts to standard names"
```

### Step 3: Clean Up Old Builds
```bash
mkdir -p archive/old-builds
mv build-*.ipa archive/old-builds/
git status  # Should show nothing (IPAs not in git)
```

### Step 4: Update Documentation
Update any docs that reference the old script names:
- `BUILD_SCRIPTS_USAGE.md`
- `SCRIPT_REFACTORING.md`
- etc.

---

## Space Savings

### Old IPA files:
- 16 files × ~100-150MB each = **~1.5-2GB freed**

### Old scripts:
- Minimal space but reduces confusion
- Cleaner repository structure

---

## Benefits After Cleanup

1. ✅ **Clearer structure** - Only working scripts remain
2. ✅ **No confusion** - No multiple versions of same script
3. ✅ **Standard names** - No -FIXED or -REFACTORED suffixes
4. ✅ **Disk space** - ~2GB freed from old IPA files
5. ✅ **Easier maintenance** - Fewer files to manage
6. ✅ **Better onboarding** - New developers see only current scripts

---

## Rollback Plan

If something goes wrong:

### If using archive approach:
```bash
# Restore from archive
cp archive/old-scripts/build-local-OLD.sh build-local.sh
cp archive/old-scripts/build-and-submit-OLD.sh build-and-submit.sh
```

### If using git:
```bash
# Revert the cleanup commit
git revert HEAD
```

---

## Summary

**Remove:**
- 4 obsolete scripts
- 16 old IPA files (~2GB)

**Keep:**
- 4 working scripts
- All documentation

**Rename:**
- Remove -FIXED/-REFACTORED suffixes
- Use standard names

**Result:**
- Clean, maintainable structure
- No confusion about which scripts to use
- ~2GB disk space freed

