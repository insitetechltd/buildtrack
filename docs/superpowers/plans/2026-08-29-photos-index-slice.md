# Photos index slice — plan (2026-08-29)

**Milestone:** `WS-PERF / M-PERF-03`  
**Does not jump:** `M-OPS-ENV-01` Phase D  
**Bar:** Instagram-continuous — whole-library scrollbar, no page spinner, first 12 stays TF-213-fast.

## Gate A fold (before Builder)

[GPT](4e2d72b9-ca2d-4474-9eef-26c65c000412) **CONDITIONAL**. [Gemini](d2b35359-f8bf-4fac-933c-2fedce49dc96) **CONDITIONAL**. [Grok](a786b5d6-8021-4721-b782-036b9c415ffb) **CONDITIONAL**. All Critical/High below are **in-plan**.

| Sev | Contract |
|---|---|
| C | `object(at:)` is **fatal** if out of range (`NSRangeException`). Guard `index >= 0 && index < count` and `token` match **before** every access. |
| C | FlatList `key={token}` (or equivalent remount) on album switch so a 10k→5 list cannot keep recycled cells at old indexes. |
| C | **First-12 isolation at full `count`.** `windowSize=5` can mount ~60 cells; do not `requestImage` for index ≥ 12 until the user has left the first screen. After that, bind mounted cells (no per-cell viewability wait). |
| H | Feature-detect **this** API (`openLibrary` + `idAt` + `startCachingRange`), not merely `PhotokitThumbs` / `startCaching` (TF 213 binaries lack index). Else paged fallback. |
| H | Fetch: **images only**, `creationDate` descending (match `LIBRARY_ASSET_SORT`). |
| H | Selection identity is **asset local id**, never index. Press: `idAt(token, index)` → `ph://{id}`. Badge: `selectedIds.has(id)` after resolving id for that row (visible rows only). Hybrid must not require `assetsByIdRef`. |
| H | Native request key = `token:index:pixelSize`. Do not request until `index` is explicitly set. Cancel + clear image on any change. |
| H | One **sliding** cache window per token; `stopCaching` previous range on move / album / unmount. Never cache visible 0–11 on first screen. Lookahead stays 1–2 screens. |
| H | `getItemLayout`: row-based `offset = floor(index / 3) * rowHeight`. **Do not** add session-header height (RN `ListHeaderComponent` is extra). Gemini sketch that inlines `headerHeight` would double-count. Index mode: no `contentContainerStyle.gap` (tile `marginBottom` is the row gap). |
| H | Index mode: `loadingPage=false`, no footer spinner, skip warm page + `getAssetsAsync`. Same path for Hybrid and InAppLibraryPicker. `removeClippedSubviews={false}` on the index list. |
| M | No `PHPhotoLibraryChangeObserver` this slice (live mutate reintroduces index races). Snapshot until album switch or remount. |
| M | `openLibrary` off the JS thread if the fetch can stall first paint (Expo Function async). |
| M | Album open fail → empty count + keep paged fallback, not a silent blank forever. |
| M | Filename on press: `library_{id}.jpg` until Accept. Failed `idAt` → no-op press. Compact `number[]` of length = count (not 50k `{asset}` wrappers). |

## Slice (this session)

Replace paged `getAssetsAsync` (12 then 18) on **iOS when the index API is present** with a native `PHFetchResult` snapshot:

- Compact index list cached by `{ token, count }` (not 50k `Asset` objects; do not rebuild every render).
- `PhotokitThumbView` **`index` + `token`** → `object(at:)` on that session’s result.
- Android + Jest + old binary: today’s paged `useLibraryGridAssets`.
- Select Photos Accept: keep `loadAssetsByIds` for ids not in the paged map.

**Not this slice:** UICollectionView, iCloud network thumbs, annotate, retire `InAppLibraryPicker`, Android MediaStore, library change observer.

## Files

- `modules/photokit-thumbs/ios/PhotokitThumbsModule.swift` — session token + `openLibrary` / `idAt` / `startCachingRange`
- `modules/photokit-thumbs/ios/PhotokitThumbView.swift` — `index` + `token` props
- `src/modules/mediaLibrary/PhotokitThumbView.ts` — JS API + capability gate
- `src/modules/mediaLibrary/useLibraryGridAssets.ts` — index path vs paged fallback
- `src/modules/mediaLibrary/LibraryPhotoGrid.tsx` — virtual count + `getItemLayout`; no viewability-only bind
- `src/modules/captureSession/HybridLibraryPickerScreen.tsx` — metadata = count; press via `idAt`
- Jest: token stale-reject helpers, capability fallback, hook skips `getAssetsAsync` when index mocked on

## Locks

- `newArchEnabled: false`; no FlashList / PHPicker
- Do not put 50k MediaLibrary assets in JS
- Do not bind thumbs only after JS `onViewableItemsChanged`
- Do not treat HUD `p2` as decode proof
- HUD: `meta` = open→count; keep `12` / `up`
- Session header stays `ListHeaderComponent`

## Validation

- Jest `test:photo-flow` + index-contract tests
- `npx tsc --noEmit` on touched TS
- Headed / TF (must, not Jest): large library; scrollbar / fling / no footer spinner; `12` in TF 213 band; tap a distant distinctive photo, scroll away/back, Accept = same photo; rapid album switch then tap; old-binary fallback if testable
- If still rubber-bands after TF: UICollectionView (slice 2)

## Assumptions

- Expo-media-library album `id` matches `PHAssetCollection.localIdentifier`
- `ph://{localIdentifier}` is enough for Accept `resolveLibraryLocalUri`
- Compact `number[]` of length = count is acceptable memory
