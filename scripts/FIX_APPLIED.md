# PhotoKit Probe Fix Applied

**Date**: 2026-09-30 10:09 AM
**Issue**: FAB crash on Expo 54 `makeDirectoryAsync` deprecation
**Fix**: Removed mkdir, write to cache root, console log primary output

## Problem

User tapped 🔬 PhotoKit Probe button → Alert "Error" with message:
```
Method makeDirectoryAsync imported from "expo-file-system" is deprecated.
You can migrate to the new filesystem API using "File" and "Directory" 
classes or import the legacy API from "expo-file-system/legacy".
```

Snackbar: `[PhotokitProbe] Error: ... makeDirecto...`

## Root Cause

`PhotokitProbeButton.tsx` line 43-44:
```typescript
const evidenceDir = `${FileSystem.cacheDirectory}insite-perf20/...`;
await FileSystem.makeDirectoryAsync(evidenceDir, { intermediates: true });
```

`makeDirectoryAsync` is deprecated in Expo SDK 54.

## Fix Applied

**Commit**: `2170c9d` on `cursor/photokit-options-probe-2b1e`

### Changes

1. **Removed deprecated mkdir**:
   - No longer call `makeDirectoryAsync`
   - Write directly to `cacheDirectory` root without subdirs

2. **Console log is primary output**:
   ```typescript
   console.log("[PhotokitProbe] ==================== RESULTS ====================");
   console.log(JSON.stringify(result, null, 2));
   console.log("[PhotokitProbe] ========================================================");
   ```

3. **File write is best-effort**:
   - Wrapped in `try/catch` (non-fatal)
   - Probe completes even if file write fails
   - Simple path: `photokit-probe-result-{timestamp}.json`

4. **Alert summary unchanged**:
   - Still shows PASS/FAIL counts
   - "Check Metro console for details"

## Deployment

- **Pushed**: PR #24 (commit `2170c9d`)
- **Metro**: Running, JS hot reload active
- **Reload**: Triggered via `curl -X POST http://localhost:8081/reload`
- **Sim**: B7B2640C-4738-4F8A-AEEE-5DF3D21D2533 (no native rebuild needed)

## Next Action

**Ready for Tristan to re-tap 🔬 button.**

Expected outcome:
1. No deprecation alert
2. Probe executes all 5 variants
3. Full JSON logged to Metro console with delimiters
4. Alert shows PASS/FAIL summary
5. Optional: File written to cache (non-fatal if fails)

Results will be captured from Metro console `[PhotokitProbe]` logs.

---

**Status**: ✅ Fix deployed, waiting for manual re-tap
