# L3 — iOS PhotoKit target-size thumbs (hybrid grid)

**Date:** 2026-08-29  
**Milestone:** `WS-PERF / M-PERF-03` Layer B  
**Does not jump:** `M-OPS-ENV-01`

## Spike

Replace RN `Image` + raw `ph://` on **iOS hybrid library tiles** with a local Expo view that calls `PHCachingImageManager.requestImage` at `targetSize = tilePt * scale`, `deliveryMode = opportunistic`. Same manager instance prefetches the first screen + scroll lookahead.

## Files

- `modules/photokit-thumbs/` — Expo module (iOS only)
- `src/modules/mediaLibrary/PhotokitThumbView.ts` — JS gate + cache helpers
- `src/modules/mediaLibrary/LibraryPhotoGrid.tsx` — native view when available
- `src/utils/libraryWarmPrefetch.ts` — startCaching first page while camera is up

## Locks

- `newArchEnabled: false`
- No FlashList / PHPicker
- Android: existing RN `Image` + `ph://`
- iCloud download during browse stays off (`isNetworkAccessAllowed = false`) — L4 later
- `PHCachingImageManager.allowsCachingHighQualityImages = false` + `deliveryMode = fastFormat`
- **TF 213 (device):** first screen pass — reopen `12 +69ms`, first open `+240ms`, `up +53ms`, `path native`.
- **Prefetch-18 (working tree, not TF):** Gate B **NO-GO** as Instagram-continuous. Do not ship as TF 214. Next is Layer **C1** (`PHFetchResult` count + index), not another page wall.

**Gotcha:** repo `.gitignore` must be `/ios/` (prebuild root only). A bare `ios/` rule drops `modules/photokit-thumbs/ios` from the EAS tarball and the pod never links.

- Jest: native gate + mocked native grid bind (no stagger)
- Device: `npx expo run:ios` or TF (native rebuild). L1 HUD `meta` vs `row` / `12` should collapse toward decode-at-tile-size.

## Not this slice

Layer C native collection view; Android Glide thumbs. Select Photos annotate (`InAppLibraryPicker`) uses the same `LibraryPhotoGrid`, so iOS browse thumbs apply there too — that is not L7 (L7 is retiring the duplicate picker chrome).
