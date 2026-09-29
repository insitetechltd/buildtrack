# Hybrid Library Blank Thumbnails - Deep Diagnostic (2026-09-29)

## Context

User (Tristan) reports in-app hybrid library shows 3 gray blank tiles on this Mac workspace. Metadata OK (count: 3), selection + upload work, but L1 HUD shows `painted: 0` (first_tile/row/screen all stay at `—`).

**Already falsified:**
- Photos privacy grant ✗
- FORCE_PURGE reseed ✗  
- warm A/B toggle ✗
- cloud "environmental only" hypothesis ✗

**Constraint:** Another Mac executor may be mid main-vs-#20 A/B (Metro :8081, sim UDID B7B2640C-…). Coordinate; don't kill Metro mid-run.

## Investigation Approach

### Code Review Findings

**PR #20 (`cursor/perf-write-path-instrumentation-fe66`) changes:**
- Write-path instrumentation (compression, upload, create/update task flows)
- Parallel photo uploads fix  
- P03 Maestro harness adjustment
- Docs only (AGENTS, NOW, ROADMAP, analysis)

**Thumbnail code: UNTOUCHED**
- `LibraryPhotoGrid.tsx` — unchanged
- `PhotokitThumbView.ts` (React wrapper) — unchanged
- `PhotokitThumbView.swift` (native module) — unchanged
- `PhotokitThumbsModule.swift` — unchanged
- `useLibraryGridAssets.ts` — unchanged
- `HybridLibraryPickerScreen.tsx` — unchanged

**Conclusion:** PR #20 is NOT the cause. This is either:
1. A pre-existing issue on main that hybrid library happened to surface
2. An environmental/simulator state issue
3. A native module state issue that requires rebuild

### Native Thumbnail Paint Flow

Traced from React to Swift:

```
LibraryPhotoGrid.tsx (line 147-165)
  → NativeThumb component with onPainted callback
  → markLibraryPickerTilePainted(assetId)

PhotokitThumbView.swift
  → requestIfNeeded() (line 47-87)
    → resolve asset from token+index OR assetId
    → startFastRequest() (line 99-129)
      → PHCachingImageManager.requestImage()
        → callback with image
          → applyIfSharper(notifyPainted: true) (line 195-209)
            → imageView.image = image
            → onPainted() ← FIRES EVENT TO JS

libraryPickerTiming.ts (line 220-264)
  → markLibraryPickerTilePainted()
    → paintedIds.add(assetId)
    → emit("first_tile"), emit("first_row"), etc.
```

**Critical insight:** `onPainted()` only fires when:
1. Asset successfully resolves (not nil)
2. PHKit callback returns non-nil, non-cancelled image
3. `applyIfSharper` applies the image (incoming pixels > displayed pixels)

If `painted` stays at 0, one of these must be failing silently.

## Diagnostic Instrumentation

**Commit:** `16bd1b8` — "debug(perf): add thumbnail paint path instrumentation"

Added comprehensive logging at every stage:

### Swift (PhotokitThumbView.swift)

```swift
[thumb-debug] requestIfNeeded entry conditions
[thumb-debug] index mode: token=X index=Y asset=found/nil
[thumb-debug] asset mode: assetId=X asset=found/nil
[thumb-debug] starting request for key=X
[thumb-debug] startFastRequest key=X asset=<localIdentifier>
[thumb-debug] callback: received image for key=X size=(W,H)
[thumb-debug] calling applyIfSharper with notifyPainted=true
[thumb-debug] applyIfSharper: applying image incoming=N notifyPainted=true
[thumb-debug] applyIfSharper: FIRING onPainted() for key=X
```

Logging covers all early-return paths:
- paused for accept
- pixelSize < 1
- no asset id or index
- asset is nil after resolution
- callback self is nil
- callback cancelled
- callback image is nil (logs info dict)
- key mismatch after callback
- incoming pixels ≤ displayed pixels

### JavaScript (LibraryPhotoGrid.tsx)

```javascript
[thumb-debug-js] rendering tile: assetId=X indexMode=true/false token=N index=N realAssetId=true/false pixelSize=N
[thumb-debug-js] onPainted fired for assetId=X
```

## Next Steps (for Tristan or next executor)

### 1. Native Rebuild (required for Swift logging)

```bash
cd ios
rm -rf build Pods
pod install
cd ..
```

### 2. Launch with Metro + Headed Smoke

```bash
# Terminal 1: Metro with logging
npm start

# Terminal 2: Build + launch on simulator
npx expo run:ios --device

# After app launches:
# 1. Log in (DEV)
# 2. Camera tab → tap FAB → library picker opens
# 3. Watch both Metro console AND Xcode console for [thumb-debug] logs
```

### 3. Collect Evidence

**Expected log sequence (if working):**

```
[thumb-debug-js] rendering tile: assetId=<id> indexMode=true token=<T> index=0 pixelSize=512
[thumb-debug] index mode: token=<T> index=0 asset=found
[thumb-debug] starting request for key=t<T>:i0:512
[thumb-debug] startFastRequest key=... asset=<localIdentifier>
[thumb-debug] callback: received image for key=... size=(256, 256)
[thumb-debug] calling applyIfSharper with notifyPainted=true
[thumb-debug] applyIfSharper: applying image incoming=256 notifyPainted=true didNotify=false
[thumb-debug] applyIfSharper: FIRING onPainted() for key=...
[thumb-debug-js] onPainted fired for assetId=<id>
[library-picker-l1] {"event":"first_tile",...}
```

**If paint still fails, logs will reveal WHERE:**

| Log Pattern | Diagnosis |
|---|---|
| No `[thumb-debug]` at all | Native module not loaded / wrong build |
| `asset=nil` | PhotoKit can't resolve the asset (permission or fixture issue) |
| `callback: image is nil` + info dict | PHKit request failed (check info dict error) |
| Stops before `FIRING onPainted()` | Image applied but event not firing (RN event bridge issue) |
| `FIRING onPainted()` but no JS callback | Event bridge disconnect (RN → JS boundary) |

### 4. Repair Paths by Diagnosis

**If asset=nil:**
- Check Photos permission: `xcrun simctl privacy <UDID> status photos com.buildtrack.app.local`
- Grant if needed: `xcrun simctl privacy <UDID> grant photos com.buildtrack.app.local`
- Reboot sim, re-run smoke

**If callback image=nil:**
- Check info dict in logs for PHKit error details
- May need FORCE_PURGE + reseed (but user already tried this)
- Could be corrupted PhotoData cache → full sim reset

**If FIRING onPainted but no JS callback:**
- React Native event bridge issue
- Try full native rebuild + Metro cache clear: `npm start -- --reset-cache`

**If no [thumb-debug] logs at all:**
- Native module didn't rebuild with new logging
- Re-run pod install, confirm Xcode build includes latest Swift changes
- Check Xcode build logs for PhotokitThumbView.swift compile

## Root Cause Hypotheses (Ranked)

1. **Native Module State Issue (P0)** — Most likely given that env/permission already ruled out. Native rebuild will clear this.

2. **PhotoKit Asset Resolution Failure (P1)** — Assets visible to Photos app but PhotoKit can't fetch them. Would show as `asset=nil` in logs.

3. **PHCachingImageManager Request Failing (P2)** — Request starts but callback returns nil/error. Would show in callback logs with info dict.

4. **React Native Event Bridge Disconnect (P3)** — Least likely since selection works (other RN ↔ native calls succeed).

## Files Changed

**Commit 16bd1b8:**
- `modules/photokit-thumbs/ios/PhotokitThumbView.swift` — 15 print statements
- `src/modules/mediaLibrary/LibraryPhotoGrid.tsx` — 2 console.log statements

**No production logic changes** — logging only.

## Coordination Notes

- Another executor may be running Metro on :8081 against main or #20
- Check `documentation/NOW.md` for sim locks before claiming UDID B7B2640C-…
- If Metro already running, coordinate handoff or use different sim
- This diagnostic commit is on PR #20 branch; safe to rebuild+test there

## Success Criteria

After logging + rebuild + smoke:

1. ✅ Logs collected showing exactly where paint path stops
2. ✅ Root cause identified from log pattern
3. ✅ Repair path applied (permission / rebuild / sim reset)
4. ✅ Thumbnails paint (L1 HUD shows first_tile/row/screen ms values, not dashes)
5. ✅ Remove debug logging after fix confirmed

## Related Issues

- **TF 269 Select Photos blank after Accept** — Fixed via pins + ExpoImage fallback; NOT this issue
- **M-PERF-03 native thumbs** — TF 225 native preview + warm paths; related to same PhotoKit code but different screen

## References

- Analysis doc: `docs/superpowers/analysis/2026-09-29-library-picker-blank-thumbnails.md`
- Maestro preflight: `.cursor/rules/maestro-preflight.md` (Gate 0–8 before any Maestro run)
- Sim locks: `documentation/NOW.md` § Simulators
- Native rebuild guide: `documentation/MAESTRO_LOCAL_SETUP.md` § Native rebuild
