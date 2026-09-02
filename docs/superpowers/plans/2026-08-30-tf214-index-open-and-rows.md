# TF 214 headed — first-12 freeze + jumpy scroll (2026-08-30)

**Milestone:** `WS-PERF / M-PERF-03` Photos index  
**Evidence:** device HUD `meta/row/12 +11404–11423ms`, `path native`; then continuous fill; jumpy while scrolling.

## Delta (TF 213 → 214)

Sync native `openLibrary` (`PHAsset.fetchAssets` + `creationDate` sort) on the JS thread. HUD timestamps for meta, first row, and first 12 are the same instant → chrome was frozen until fetch returned, then thumbs painted in ~20ms.

Jumpy scroll: index FlatList used `numColumns={3}` + per-item `getItemLayout`. Each batch remounts a row whose estimated size disagrees with the column wrapper.

## Fix (this slice)

1. `AsyncFunction("openLibrary")` on a background queue. JS `await`s; placeholders stay up until count exists.
2. All-photos: Recents (`smartAlbumUserLibrary`) **without** an extra sort (collection is already newest-first). Named albums keep `creationDate` desc.
3. Index list is **one row per FlatList item** (`numColumns={1}`, `getItemLayout` = `row * rowHeight`). Integer tile sizes.

## TF 215 headed (2026-08-30)

Scroll is smooth (row list). Recents without sort is **oldest-first**. First 12 still ~7.5s (`meta +7490`) because JS waits for the full fetch before binding thumbs.

## TF 216

- Always `creationDate` descending (newest first).
- `openLibrary` returns the newest **48** (`fetchLimit`). First 12 can paint.
- `expandLibrary` replaces the fetch with the full album, **same token**, so the list grows without remounting the first screen.


## Validation

- Jest: hook does not call `getAssetsAsync` while open is pending; first 12 tiles still bind; row layout offsets.
- Headed TF: `12` back in the TF 213 band; continuous scroll without batch jumps.

Not this slice: UICollectionView (only if 215 still rubber-bands).
