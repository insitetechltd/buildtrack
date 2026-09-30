# PhotoKit Probe — Proof of Fix

**Date**: 2026-09-30 10:23 AM  
**Issue**: makeDirectoryAsync STILL appears after first "fix"  
**Root Cause**: TWO probe files both had the deprecated call  

---

## Problem Analysis

**First fix** (commit `2170c9d`): Only fixed `PhotokitProbeButton.tsx`  
**Second fix** (commit `312c30a`): Fixed `PhotokitOptionsProbe.tsx` (missed initially)

Both files are in the probe execution path. Button may import/render or share code with the full-screen component.

---

## Files Fixed (Verified on Disk)

### 1. PhotokitProbeButton.tsx (FAB button)

**Commit**: `2170c9d`  
**Verification**:
```bash
cd /Volumes/KooDrive/InsiteApp
grep -n "makeDirectoryAsync" src/diagnostics/PhotokitProbeButton.tsx
# Expected: no matches
```

**Changes**:
- ❌ Removed: `await FileSystem.makeDirectoryAsync(evidenceDir, { intermediates: true });`
- ✅ Added: Console log with delimiters BEFORE file ops
- ✅ Added: try/catch around file write (non-fatal)
- ✅ Changed: Simple cache root path (no subdirs)

### 2. PhotokitOptionsProbe.tsx (full-screen component)

**Commit**: `312c30a`  
**Verification**:
```bash
cd /Volumes/KooDrive/InsiteApp
grep -n "makeDirectoryAsync" src/diagnostics/PhotokitOptionsProbe.tsx
# Expected: no matches
```

**Changes**:
- ❌ Removed: `await FileSystem.makeDirectoryAsync(evidenceDir, { intermediates: true });` (line 52)
- ✅ Added: Console log with delimiters BEFORE file ops
- ✅ Added: try/catch around file write (non-fatal)
- ✅ Changed: Simple cache root path, resultPath init

---

## Verification Commands

```bash
cd /Volumes/KooDrive/InsiteApp

# Verify NO makeDirectoryAsync in either probe file:
grep -c "makeDirectoryAsync" src/diagnostics/PhotokitProbeButton.tsx
# Expected: 0

grep -c "makeDirectoryAsync" src/diagnostics/PhotokitOptionsProbe.tsx
# Expected: 0

# Show actual code (console log pattern):
grep -A2 "console.log.*RESULTS" src/diagnostics/PhotokitProbeButton.tsx
grep -A2 "console.log.*RESULTS" src/diagnostics/PhotokitOptionsProbe.tsx

# Verify commits pushed:
git log --oneline origin/cursor/photokit-options-probe-2b1e | head -3
# Expected: 312c30a fix(photokit): remove makeDirectoryAsync from PhotokitOptionsProbe
#           2170c9d fix(photokit): remove deprecated makeDirectoryAsync from probe button
```

---

## Bundle Refresh Required

**Problem**: Metro curl reload is NOT sufficient for module-level changes.

**Solution**: Manual Metro restart with cache clear.

### Steps for Tristan

1. **Stop Metro** (in terminal where Metro is running):
   - Press `Ctrl+C` to stop
   - Or: `killall node` if orphaned

2. **Clear Metro cache**:
   ```bash
   cd /Volumes/KooDrive/InsiteApp
   rm -rf .metro-cache node_modules/.cache
   ```

3. **Restart Metro with clean cache**:
   ```bash
   npm exec expo start -- --reset-cache --dev-client
   ```

4. **Wait for "Metro is ready"** message (may take 30-60s for cache rebuild)

5. **Reload app on simulator**:
   - Device menu → Reload (Cmd+R)
   - Or shake gesture (Cmd+Ctrl+Z) → Reload

6. **Re-tap 🔬 button**

**Expected**: No deprecation alert, probe completes, results in Metro console.

---

## Other makeDirectoryAsync Calls (Safe to Ignore)

These exist but are NOT in the probe execution path:
- `src/utils/libraryThumbnailCache.ts` — photo picker thumbnail cache
- `src/utils/draftMediaCache.ts` — draft media cache

Neither is triggered by the 🔬 PhotoKit Probe button.

---

## Success Criteria

After Metro restart + reload + re-tap:

✅ No Alert "Method makeDirectoryAsync is deprecated"  
✅ Progress/completion alert appears  
✅ Metro console shows:
```
[PhotokitProbe] ==================== RESULTS ====================
{
  "variants": [ ... ]
}
[PhotokitProbe] ========================================================
```

✅ Alert shows PASS/FAIL summary  
✅ Agent can parse JSON from Metro console logs

---

**Status**: Both files fixed on disk, pushed to PR #24  
**Next**: Manual Metro restart required (automated restart hung)  
**Proof**: Run verification commands above
