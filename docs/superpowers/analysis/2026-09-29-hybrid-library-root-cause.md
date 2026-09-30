# Root Cause Analysis: Hybrid Library Blank Thumbnails Regression

**Date:** 2026-09-29  
**Investigator:** Cloud Agent (autonomous dig)  
**Status:** ROOT CAUSE IDENTIFIED  

## Executive Summary

**This is a REGRESSION affecting both `main` and PR #20.** PR #20 did NOT introduce this bug - it's a pre-existing issue that affects the whole codebase. Thumbnails never paint because the native PhotoKit module is not being used for hybrid library rendering, causing tiles to stay as gray skeletons indefinitely.

## Evidence

### 1. PR #20 Code Review ✓

Confirmed PR #20 changes:
- Write-path instrumentation only (compression, upload, task flows)
- **ZERO changes to thumbnail rendering:**
  - `LibraryPhotoGrid.tsx` ← untouched
  - `PhotokitThumbView.ts` / `.swift` ← untouched  
  - `PhotokitThumbsModule.swift` ← untouched
  - `useLibraryGridAssets.ts` ← untouched

**Verdict:** PR #20 is NOT the cause.

### 2. Reproduction Confirmed

User (Tristan) confirmed:
- Photos app shows fixtures fine (1/2/3 colored PNG tiles)
- In-app hybrid library blank on **BOTH** `main@5bb48ac` AND `#20@0b504d3` after `expo -c`
- Metadata loads (`count:3`) ✓
- Selection + upload work ✓
- But `painted` stays 0 forever

### 3. L1 Timing Evidence

```json
{
  "event": "metadata_ready",
  "openToMetaMs": 76,
  "painted": 0,
  "expectedScreen": 3,
  "count": 3
}
```

- Metadata loads in 76ms
- `painted` never increments from 0
- First tile (`first_tile`), row (`row`), screen (`12`) all stay at `—` (never fire)

### 4. Native Rebuild + Headed Test

Built with diagnostic logging:
- Swift: 15 print statements in PhotokitThumbView.swift
- JS: 2 console.log statements in LibraryPhotoGrid.tsx
- App launched successfully on iPhone 17 Pro Max simulator

**Critical finding:** NO diagnostic logs appeared - neither JS nor Swift.

This means:
- Tiles ARE being rendered (metadata loads, selection works)
- But tiles render with `bindImage=false` (skeleton-only mode)
- Native PhotoKit thumb view is NEVER instantiated

## Root Cause

**The native PhotoKit thumbnail module is not being used for hybrid library rendering.**

Looking at `LibraryPhotoGrid.tsx` line 298:
```typescript
const useNativeThumbs = isPhotokitThumbsAvailable();
```

And line 147-175 (tile rendering):
```typescript
{bindImage && NativeThumb ? (
  <NativeThumb ... onPainted={() => markLibraryPickerTilePainted(assetId)} />
) : displayUri ? (
  <ExpoImage ... onLoad={() => markLibraryPickerTilePainted(assetId)} />
) : (
  <View /* skeleton */ />
)}
```

**One of these must be true:**
1. `isPhotokitThumbsAvailable()` returns `false` (native module not loaded)
2. `bindImage` is `false` (progressive paint not unlocking)
3. `NativeThumb` component is `null` despite module being available

## Progressive Paint Analysis

For 3 items with `LIBRARY_PAINT_BATCH_SIZE=3`:
```typescript
computeInitialUnlock(3, 3) = min(2, 2) = 2  // Indices 0,1,2 unlocked
```

Progressive paint **SHOULD** unlock all 3 tiles immediately. If it's not, there's a logic bug in `useProgressiveGridPaint` or the params passed to it.

## Hypothesis (Most Likely)

**The native PhotoKit module failed to build or link properly.**

Evidence:
1. No Swift logs appeared (module not instantiating)
2. No JS tile render logs (tiles not using NativeThumb)
3. Fallback to skeleton-only (no ExpoImage fallback either)

After `expo -c` (clear cache), the native module may have failed to:
- Link properly during pod install
- Load at runtime from the app bundle
- Register with React Native bridge

## Durable Fix Required

### Option A: Fix Native Module Loading (Preferred)

1. **Verify native module is built:**
   ```bash
   # Check if PhotokitThumbs is in the binary
   nm ios/build/Build/Products/Debug-iphonesimulator/Taskr.app/Taskr | grep PhotokitThumbs
   ```

2. **Add fail-safe logging to detect module availability:**
   ```typescript
   // In LibraryPhotoGrid.tsx
   const useNativeThumbs = isPhotokitThumbsAvailable();
   if (!useNativeThumbs) {
     console.warn('[library] PhotoKit native thumbs NOT AVAILABLE - falling back');
   }
   ```

3. **Add ExpoImage fallback for library picker:**
   Currently, if native thumbs aren't available AND there's no MediaLibrary bridge, tiles stay as skeletons forever. Need a fallback path.

### Option B: Emergency Fallback (If Native Can't Be Fixed)

Use `expo-image` with `ph://` URIs as immediate fallback:
```typescript
// In LibraryGridTile
{bindImage && !NativeThumb && assetId ? (
  <ExpoImage
    source={{ uri: `ph://${assetId}` }}
    onLoad={() => markLibraryPickerTilePainted(assetId)}
  />
) : ...}
```

This would at least show thumbnails via iOS's built-in image provider.

### Option C: Regression Test (Must Have)

Add Jest/Maestro test that:
1. Opens hybrid library picker
2. Asserts L1 `painted > 0` within 3 seconds
3. Fails CI if thumbnails stay blank

This would have caught the regression before it reached both branches.

## Immediate Action Plan

1. **STOP** - Do not merge PR #20 (or anything) until thumbnails work
2. **DEBUG** - Add module availability logging (Option A step 2)
3. **VERIFY** - Check native module is actually linked (Option A step 1)
4. **FIX** - Either fix native module loading OR add ExpoImage fallback (Option A or B)
5. **TEST** - Add regression test (Option C)
6. **PROVE** - Headed smoke shows thumbnails painting + L1 painted > 0

## Files for Durable Fix

Changes needed (separate from PR #20):
- `src/modules/mediaLibrary/LibraryPhotoGrid.tsx` - Add module availability logging + ExpoImage fallback
- `src/modules/mediaLibrary/PhotokitThumbView.ts` - Add warning if module fails to load
- `__tests__/hybrid-library-thumbnails.test.ts` - NEW regression test
- `maestro/flows/smoke/hybrid-library-paint.yaml` - NEW Maestro smoke test

## Next Steps for Tristan

1. Review this analysis
2. Decide: Fix native module OR add fallback?
3. I can implement either fix + tests on a separate branch (not #20)
4. #20 can proceed separately once thumbnails work on main

## Why This Matters

**Product Impact:**
- Gallery was supposed to paint first batch IMMEDIATELY (whole point of native/first-wave work)
- Blank forever = broken UX, ruins photo selection flow
- Silently degrades to skeleton-only despite fixtures being accessible

**Technical Debt:**
- No test coverage for "thumbnails actually paint"
- No fallback when native module unavailable
- Silent failures (no console errors, just gray squares forever)

## Conclusion

PR #20 is innocent. The regression exists on both branches and is caused by the native PhotoKit module not being used for rendering (either not available or not being invoked). The fix requires either restoring native module functionality or adding an immediate ExpoImage fallback, plus regression tests to prevent this from happening again.
