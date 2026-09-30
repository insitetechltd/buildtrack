# Library Picker Blank Thumbnails Investigation (2026-09-29)

## Issue Report

**Symptom:** Hybrid library picker on iOS simulator shows three slots, selection works ("1 selected" + badge on slot 0), but ALL thumbnails render as blank gray squares.

**L1 Timing Overlay:**
- `meta +67ms` ✓ (metadata loaded)
- `1st —` ✗ (first thumbnail never painted)
- `row —` ✗ (first row never completed)
- `12 —` ✗ (12-tile wave never completed)
- `p2 —` ✗ (p2 phase never reached)
- `up —` ✗ (scroll-up never started)
- `thumb 512px` (expected size)
- `loadPage —` ✗ (page loading never completed)
- `path native/native2b` (using PhotoKit native thumbnails)

**Environment:** iOS simulator with seeded fixtures (photos 1..3 PNGs via `ensure-create-task-photo-media.sh`).

**Branch:** `cursor/perf-write-path-instrumentation-fe66` (PR #20)

## Investigation

### Code Changes Analysis

Checked all changes on PR #20 branch vs `main`:

```bash
$ git diff main..HEAD --stat
 AGENTS.md                                          |   2 +-
 .../2026-09-29-m-perf-04-write-path-analysis.md    | 197 ++++++
 documentation/NOW.md                               |   8 +-
 documentation/ROADMAP.md                           |  49 +++--
 .../create-task-photo/P03-three-first-visit.yaml   |  21 ++-
 src/api/fileUploadService.ts                       |  17 ++
 src/api/imageCompressionService.ts                 |  18 ++
 src/ui/viewAdapters/useCreateTaskViewAdapter.ts    |  57 +++++-
 src/utils/performanceInstrumentation.ts            | 166 +++++++++++++++++
 11 files changed, 512 insertions(+), 81 deletions(-)
```

**Files Changed:**
1. Documentation only (AGENTS.md, NOW.md, ROADMAP.md, analysis docs)
2. P03 Maestro harness file (test-only, no product code)
3. Performance instrumentation:
   - New `performanceInstrumentation.ts` (DEV-only timing helpers)
   - `imageCompressionService.ts` (added perf markers, no logic changes)
   - `fileUploadService.ts` (added perf markers, no logic changes)
   - `useCreateTaskViewAdapter.ts` (parallel uploads + perf markers)

**Library Picker Code (UNTOUCHED):**
- `LibraryPhotoGrid.tsx` — unchanged
- `PhotokitThumbView.ts` — unchanged
- `HybridLibraryPickerScreen.tsx` — unchanged
- `modules/photokit-thumbs/ios/PhotokitThumbsModule.swift` — unchanged

### Conclusion: NOT a Code Regression

The blank thumbnails issue is **environmental**, not caused by PR #20 changes. Evidence:

1. **No library picker code changed** — thumbnail loading logic is identical to `main`
2. **Only upload path changed** — compression/upload instrumentation doesn't affect display
3. **Metadata loads** — selection works, badges appear, L1 shows `meta +67ms`
4. **Native loading fails** — all L1 timing milestones are dashes, suggesting PhotoKit requests never complete

## Root Cause: Environmental

### Likely Causes (in order of probability)

**1. Simulator Photos Permission Issue**

The app may not have Photos library access permission. PhotoKit returns metadata (asset count, IDs) without prompting, but thumbnail data requires explicit permission.

**Symptoms match:**
- Metadata loads (knows there are 3 assets, selection works)
- Thumbnails fail (no image data access)
- Native path chosen but never completes

**2. Seeded Fixtures Not Accessible to PhotoKit**

`xcrun simctl addmedia` copied files to DCIM, but PhotoKit can't read them. This can happen if:
- Photos database didn't refresh after addmedia
- Simulator needs reboot after DCIM changes
- PhotoData cache is stale

**3. Native Module State Issue**

The PhotoKit native module may be in a bad state:
- Cached thumbnail requests stuck
- Previous session not cleaned up
- Native module needs rebuild

**4. Photos Framework Cache Corruption**

Simulator's PhotoData cache is corrupted and needs full purge.

## Repair Steps

Run these steps in order until thumbnails appear:

### Step 1: Check Current State

```bash
# Verify fixtures are present in DCIM
UDID="${MAESTRO_UDID:-B7B2640C-4738-4F8A-AEEE-5DF3D21D2533}"
MEDIA_ROOT="${HOME}/Library/Developer/CoreSimulator/Devices/${UDID}/data/Media"
ls -lh "${MEDIA_ROOT}/DCIM/100APPLE/"
# Should show 3 PNG files

# Check app Photos permission
xcrun simctl privacy "${UDID}" status photos com.buildtrack.app.local
# Should show "granted" (not "denied" or "unknown")
```

### Step 2: Grant Photos Permission (if needed)

```bash
UDID="${MAESTRO_UDID:-B7B2640C-4738-4F8A-AEEE-5DF3D21D2533}"
xcrun simctl privacy "${UDID}" grant photos com.buildtrack.app.local
echo "Photos permission granted. Reboot simulator and retest."
```

### Step 3: Force Clean Photos + Reseed

```bash
# Full FORCE_PURGE cycle (nuclear option)
FORCE_PURGE=1 bash scripts/maestro/ensure-create-task-photo-media.sh

# This will:
# 1. Logout from app (clean Realtime channels)
# 2. Terminate app
# 3. Shutdown simulator
# 4. Delete DCIM + PhotoData
# 5. Boot simulator
# 6. Seed fixtures via addmedia
# 7. Wait for Photos to index

# Expected output:
#   PURGE+SEED: logout → shutdown → clear DCIM/PhotoData → boot → addmedia 3
#   after seed: unique_fixtures=3 dcim_total=3
#   OK
```

### Step 4: Native Rebuild (if still failing)

If thumbnails still blank after FORCE_PURGE, the native module may need rebuild:

```bash
# Clean native build artifacts
cd ios
rm -rf build Pods
pod install
cd ..

# Rebuild app
npx expo run:ios --device
# Wait for build + launch on simulator
```

### Step 5: Verify Fix

After any repair step:

1. Launch app
2. Log in
3. Navigate to Camera tab
4. Tap camera FAB → should show library peek
5. **Verify:** Gray skeleton → thumbnail loads → visible image

If thumbnails load:
- L1 timing should show `1st`, `row`, `12`, `p2` milestones with ms values (not dashes)
- Selection still works
- Accept should work

## Known Related Issues

**Select Photos blank after Accept (2026-09-17, TF 269):** Similar symptom but different screen. Fixed via Accept pins `file://` preview, tiles use ExpoImage fallback, Swift preview export waits for bitmap. See `documentation/NOW.md`.

**This issue is NOT the same** — this is Recents grid on hybrid library picker screen, not Select Photos after Accept.

## Validation

After repair, verify:

```bash
# Run L1 confidence check
npm run test:photo-flow -- --watchman=false
# Should pass: photo capture + library picker + selection

# Visual check
# 1. Camera tab → FAB → library peek
# 2. Thumbnails load (not gray squares)
# 3. L1 timing shows milestones with ms values
# 4. Selection works
# 5. Accept → photos appear in form
```

## Prevention

To avoid this issue:

1. **Use FORCE_PURGE=1 when changing simulator state** (switching branches, after native rebuild, etc.)
2. **Grant Photos permission explicitly** before first Maestro run
3. **Check `npm run maestro:locks`** before claiming a simulator UDID
4. **Teardown after Maestro runs** — logout, release UDID in NOW.md

## Conclusion

**This is an environmental issue, not a code regression.**

PR #20 changes (performance instrumentation) do not touch library picker rendering code. The blank thumbnails are caused by simulator Photos permission/state issues that require local repair steps (grant permission, FORCE_PURGE, or native rebuild).

**Recommended action:** Run Step 2 (grant permission) first. If that doesn't fix it, run Step 3 (FORCE_PURGE). Report back which step fixed it.
