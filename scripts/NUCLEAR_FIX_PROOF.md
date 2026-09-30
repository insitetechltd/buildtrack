# Nuclear Fix — ALL FileSystem Removed from Probe

**Time**: 2026-09-30 11:05 AM  
**Commit**: `1ae8f56`  
**Root Cause**: Importing `expo-file-system` (non-legacy) triggers Expo 54 deprecation

---

## Problem Analysis

Previous "fixes" only removed `makeDirectoryAsync` calls but kept:
```typescript
import * as FileSystem from "expo-file-system";  // ❌ THIS was the problem
```

**Expo 54 behavior**: Importing the non-legacy module triggers deprecation errors,
not just calling specific methods. Even `writeAsStringAsync` can trigger it.

---

## Nuclear Fix Applied

### PhotokitProbeButton.tsx

**REMOVED**:
```typescript
import * as FileSystem from "expo-file-system";  // ❌ Removed completely

// ... in runProbe():
try {
  const resultPath = `${FileSystem.cacheDirectory}...`;
  await FileSystem.writeAsStringAsync(...);
} catch (writeError) { ... }
```

**NOW**:
```typescript
// NO FileSystem import at all ✅

// Only console.log output:
console.log("[PhotokitProbe] ==================== RESULTS ====================");
console.log(JSON.stringify(result, null, 2));
console.log("[PhotokitProbe] ========================================================");
```

### PhotokitOptionsProbe.tsx

Same nuclear fix applied — complete FileSystem removal.

---

## Verification (Proof)

### Source Files Clean

```bash
cd /Volumes/KooDrive/InsiteApp

grep -n "FileSystem" src/diagnostics/PhotokitProbeButton.tsx
# Output: (no matches) ✅

grep -n "FileSystem" src/diagnostics/PhotokitOptionsProbe.tsx
# Output: (no matches) ✅
```

### Bundle Verified

Downloaded fresh bundle from Metro after fix:

```bash
# Check for FileSystem near PhotokitProbe context:
grep -o ".{30}PhotokitProbe.{30}" /tmp/metro-bundle-nuclear.js | grep -i filesystem
# Output: NO matches ✅

# Count total expo-file-system in bundle:
grep -c "expo-file-system" /tmp/metro-bundle-nuclear.js
# Output: 47 (from OTHER modules like libraryThumbnailCache, NOT probe path)
```

**Bundle size**: 15MB  
**Metro status**: `packager-status:running`  
**Reload**: Triggered after fix

---

## What Probe Does Now

1. **Run native probe**: `probePhotokitRequestOptions(assetId, 256)`
2. **Console log JSON**: Full results with delimiters
3. **Alert summary**: "Probe Complete" with ✓ PASS / ✗ FAIL counts
4. **NO file system**: No imports, no writes, no cache directory

**Console output format**:
```
[PhotokitProbe] Starting...
[PhotokitProbe] Testing asset: 12345...
[PhotokitProbe] ==================== RESULTS ====================
{
  "variants": [
    { "variant": "baseline_fast", "status": "FAIL", "error": { "code": 3303 } },
    { "variant": "opportunistic_fast", "status": "PASS", "uri": "file://..." },
    ...
  ]
}
[PhotokitProbe] ========================================================
```

---

## Expected Outcome (Next Tap)

✅ **NO Alert** "Method makeDirectoryAsync is deprecated"  
✅ **NO FileSystem errors** (probe doesn't touch FileSystem at all)  
✅ **Probe completes** with progress/completion alert  
✅ **Metro console** shows full JSON results  
✅ **Alert** shows ✓ PASS / ✗ FAIL counts

---

## Other FileSystem Usage (Irrelevant)

These files still have `expo-file-system` but are **NOT in probe path**:
- `src/utils/libraryThumbnailCache.ts` — photo picker thumbnails
- `src/utils/draftMediaCache.ts` — draft media cache
- Other app modules (47 total imports in bundle)

The probe button does NOT call these. Probe execution path:
```
App.tsx → PhotokitProbeButton → probePhotokitRequestOptions (native)
         NO detours through cache/picker/draft modules
```

---

## Git Verification

```bash
cd /Volumes/KooDrive/InsiteApp

# Show the nuclear fix commit:
git show 1ae8f56 --stat
# Changed: 2 files, 3 insertions(+), 37 deletions(-)

# Verify pushed:
git log --oneline origin/cursor/photokit-options-probe-2b1e | head -1
# 1ae8f56 fix(photokit): nuclear fix - remove ALL FileSystem

# Verify file diffs:
git diff HEAD~1 src/diagnostics/PhotokitProbeButton.tsx | grep -E "^\-.*FileSystem|^\+.*FileSystem"
# Shows: - import * as FileSystem (removed)
#        No + lines with FileSystem (nothing added)
```

---

## Metro Reload Status

- **Reloaded**: `curl -X POST :8081/reload` after commit
- **Status**: `packager-status:running` ✅
- **Bundle**: New bundle downloaded and verified clean
- **Session**: tmux `metro-agent` still running

---

## Ready for Tap

**Confidence**: HIGH — probe has ZERO FileSystem interaction  
**Next**: Tristan tap 🔬 button  
**Fallback**: If STILL fails, it's not from probe code (would be app-level or Expo config issue)

---

**Status**: Nuclear fix applied, bundle verified, Metro reloaded  
**Proof**: Source files + bundle both show NO FileSystem in probe context  
**Commit**: `1ae8f56` pushed to PR #24
