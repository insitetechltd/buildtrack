# Library newest-first research — PhotoKit first paint without stale IDs or oldest-first pages

**Date:** 2026-10-04
**Milestone:** `WS-PERF / M-PERF-03`
**Role:** Research that locked the TF 292 walk. How the shipped picker works: `documentation/PICKER_PROGRESS.md` § How the default library opens.
**Headed:** 2026-10-04 TF 292 dogfood — picker, album selection, and filters looked stable.
**Prior art:** `docs/superpowers/analysis/2026-08-30-photokit-first-paint-journey.md` (HUD legend + TF211–237 journey)

---

## Question

How can the picker show the iOS Photos library, **newest photo first**, on **every** open, within ~3s when the Photos daemon is warm (warm target ~100ms), **without** painting a stale saved-ID list and **without** painting oldest-first fallback pages while a sort runs? If PhotoKit + the existing native module cannot do this, name the smallest framework exit that still meets timing and accuracy.

## Requirements (locked)

1. Default album index 0 = newest photo in the library **right now**, then older.
2. A photo taken after the last open must appear. A saved list of asset IDs must not be the grid.
3. No oldest-first fallback pages (MediaLibrary `getAssetsAsync` pagination, warm page, fetchLimit window) while waiting.
4. First tile ≤ 3s after open when the daemon is warm (~100ms target, TF 235 precedent). Cold daemon may take longer but must never show wrong order.
5. Second open must not be a 20–30s sort and must not skip a live query.
6. Stay in the current stack (Expo RN + `modules/photokit-thumbs/ios/PhotokitThumbsModule.swift` + `src/utils/libraryIndexPrefetch.ts`). PHPicker only if the in-app grid (selection order, This-session camera strip, crop/draw) cannot be met any other way.

## Sources

### Apple primary — live documentation (fetched 2026-10-04)

| Claim | Source |
|---|---|
| `fetchLimit`: "The maximum number of objects to include in the fetch result." Discussion: "to fetch only the most recently captured asset, call `fetchAssets(with:)`, using `sortDescriptors` to sort in descending date order, and setting a fetch limit of one." | https://developer.apple.com/documentation/photos/phfetchoptions/fetchlimit |
| `sortDescriptors`: "A list of sort descriptors, specifying an order for the fetched objects." | https://developer.apple.com/documentation/photos/phfetchoptions/sortdescriptors |
| PHFetchOptions supported predicate/sort keys for `PHAsset`: `SELF, localIdentifier, creationDate, modificationDate, mediaType, mediaSubtypes, duration, pixelWidth, pixelHeight, isFavorite, isHidden, burstIdentifier` — **`addedDate` is not a supported key** | https://developer.apple.com/documentation/photos/phfetchoptions (supported-keys table) |
| `PHFetchResult` = "An ordered list of assets or collections"; "dynamically loads its contents from the Photos library as needed"; "After a fetch, the fetch result's `count` value is constant, and all objects keep the same `localIdentifier` value. (To get updated content for a fetch, register a change observer…)"; "caches its contents, keeping a batch of objects around the most recently accessed index" | https://developer.apple.com/documentation/photos/phfetchresult |
| `smartAlbumUserLibrary`: "A Smart Album that groups all assets that originate in the user's own library (as opposed to assets from iCloud Shared Albums)." **Not deprecated.** No ordering statement. | https://developer.apple.com/documentation/photos/phassetcollectionsubtype/smartalbumuserlibrary |
| `fetchAssets(in:options:)`: "By default, the returned [PHFetchResult] object contains all assets in the specified collection." No ordering statement. | https://developer.apple.com/documentation/photos/phasset/fetchassets(in:options:) |
| `addedDate` (iOS 26+): "The date and time this asset was added to the photo library (from the device that was used to add this asset)" | https://developer.apple.com/documentation/photos/phasset/addeddate |
| Change observing: after any fetch, "Photos automatically registers your interest in observing changes to those items… you'll get notified when changes add items, remove items, or reorder the list of items in the fetch result" via `PHFetchResultChangeDetails` | https://developer.apple.com/documentation/photokit/observing-changes-in-the-photo-library |
| `fetchPersistentChanges(since:)`: "Retrieves the Photos library changes since the token you specify"; error if token unavailable | https://developer.apple.com/documentation/photos/phphotolibrary/fetchpersistentchanges(since:) |
| `PHPersistentChangeToken`: "An opaque object that tracks the state of the Photos library between runs, and that you can copy and serialize for future use." | https://developer.apple.com/documentation/photos/phpersistentchangetoken |
| `PHPickerViewController`: "As a system-rendered UI, you can't subclass PHPickerViewController. Its view hierarchy belongs to the system"; disables interaction if opacity altered; out-of-process | https://developer.apple.com/documentation/photosui/phpickerviewcontroller |
| PHPicker ordered selection + preselection: `configuration.selection = .ordered` (numbered checkmarks, iOS 15+), `preselectedAssetIdentifiers` (requires photoLibrary + selectionLimit ≠ 1); preselected results return empty item providers | https://developer.apple.com/videos/play/wwdc2021/10046/ · https://developer.apple.com/forums/thread/705493 |

### Apple primary — local SDK headers (iPhoneOS 26.5 SDK, Xcode at `/Applications/Xcode.app`)

Base path: `/Applications/Xcode.app/Contents/Developer/Platforms/iPhoneOS.platform/Developer/SDKs/iPhoneOS.sdk/System/Library/Frameworks/Photos.framework/Headers/`

| Claim | File:line |
|---|---|
| `PHAssetCollectionSubtypeSmartAlbumUserLibrary = 209` — **no `API_DEPRECATED`** | `PhotosTypes.h:95` |
| `PHAssetCollectionSubtypeSmartAlbumRecentlyAdded = 206` — separate album, also not deprecated | `PhotosTypes.h:93` |
| `fetchLimit`: "Limits the maximum number of objects returned in the fetch result, a value of 0 means no limit." — **no statement about interaction with sort** | `PHFetchOptions.h:34` |
| `sortDescriptors`: "Some predicates / sorts may be suboptimal and we will log" | `PHFetchOptions.h:19-21` |
| `PHFetchResult` "fetches objects from the backing store in chunks on demand rather than all at once" | `PHFetchResult.h:16-17` |
| `creationDate`: "The date and time of this asset's creation **(can be updated by the user)**" | `PHAsset.h:41-42` |
| `addedDate` `API_AVAILABLE(ios(26.0))` | `PHAsset.h:47-48` |
| `PHFetchResultChangeDetails`: `fetchResultAfterChanges`, `hasIncrementalChanges`, `insertedIndexes`/`removedIndexes`/`changedIndexes`, `enumerateMovesWithBlock`; "NO indicates that the scope of changes were too large and UI clients should do a full reload" | `PHChange.h:50-86` |
| `registerChangeObserver` / `unregisterChangeObserver`; callback "invoked on an arbitrary serial queue" | `PHPhotoLibrary.h:38-39, 109-110` |
| `fetchPersistentChangesSinceToken:` + `currentChangeToken` (iOS 16+) | `PHPhotoLibrary.h:114-115` |
| `PHPersistentObjectChangeDetails`: `insertedLocalIdentifiers` / `updatedLocalIdentifiers` / `deletedLocalIdentifiers` | `PHPersistentObjectChangeDetails.h:20-22` |
| **Zero occurrences of any ordering guarantee** in the entire Photos Headers directory (only hit for "order" is `PHCollectionEditOperationRearrangeContent` — user rearranging album members) | `rg -i "order|sorted|newest|oldest|chronolog" Headers/` |

### Repo

| Claim | Source |
|---|---|
| TF 291 shipped default open = `PHAsset.fetchAssets(with: .image)` + `creationDate` desc + `fetchLimit` 90 (`newestLibrary`) | `git show 6099ec8:modules/photokit-thumbs/ios/PhotokitThumbsModule.swift` |
| Working tree = uncommitted reverse-walk: `newestFromUserLibrary` walks `smartAlbumUserLibrary` unsorted from `count-1`, filters images while walking, cap 90 / visitCap 720 | `modules/photokit-thumbs/ios/PhotokitThumbsModule.swift:342-373` (working tree) |
| Working tree deleted the persisted-ID grid (`libraryPreviewIds.ts` deleted; `openPhotokitLibraryWithIds`/`persistPreviewFromSession` calls removed; finished walks not reused — "Join an in-flight walk only. A finished walk is not the next open's grid.") | `git diff HEAD -- src/utils/libraryIndexPrefetch.ts src/utils/libraryCapturePrefetch.ts`; `src/utils/libraryIndexPrefetch.ts:60-62` |
| TF 287 "unpredictable Recents sort" was **misattributed**: the actual flake was the persisted warm-ID path rebuilding assets in stale old→new AsyncStorage order on first open; fix sorted the ID path and skipped it under active filters | commit `0bf4858` message ("warm-id path sort consistency (TF 287 first-open flake)") |
| TF 291 fallback paints that still exist at HEAD: warm MediaLibrary page paint in the native2b branch, `previewPhotokitNewestIds` stub paint, `loadPage` `getAssetsAsync` paging | `git show 6099ec8:src/modules/mediaLibrary/useLibraryGridAssets.ts`; working tree `useLibraryGridAssets.ts:269-347` (warm bridge), `:140-186` (`loadPage`) |
| Measured: `creationDate` sort + fetchLimit ≈ 7–14s (to 20–30s) before correct newest-first (TF 220/234, TF 291 phone); parallel MediaLibrary warm + native open ≈ 20s (TF 213–232); unsorted reverse walk warm reopen ≈ 100ms, cold daemon 8–14s once (TF 235); persisted IDs ≈ 70ms but stale | `docs/superpowers/analysis/2026-08-30-photokit-first-paint-journey.md` §3–4 + task known-facts |
| `expandLibraryFull` still runs a sorted full-library fetch (background, post-paint) | `PhotokitThumbsModule.swift:495-516` |
| In-app grid features PHPicker cannot host: "This session" strip + crop/draw annotation (`AssetAnnotation` → `updatePhotoUri`) | `src/modules/captureSession/HybridLibraryPickerScreen.tsx:327, 72, 251-265` |

### Empirical only (labeled — not proof)

- Unsorted collection fetches follow the collection's Photos-app display order; for the user-library smart album that is oldest-first (ascending by addition): multi-year Stack Overflow consensus (e.g. https://stackoverflow.com/questions/51329822 "without the sort descriptor, assets will be returned oldest ones first"), consistent with this repo's TF 235 measurement (reverse walk displayed newest-first, ~100ms warm).
- iOS 13 changed `smartAlbumUserLibrary` behavior for some users (https://stackoverflow.com/questions/52314469) — evidence that Apple can and does change undocumented smart-album behavior between releases.
- Sorting disables PhotoKit's internal index use (https://stackoverflow.com/questions/51329822) — consistent with the repo's measured 7–30s sorted-fetch cost, but not an Apple statement.

---

## Findings

### F1 — There is no documented O(small) "true newest N" PhotoKit call

Every candidate, checked against primary sources:

| Candidate | Verdict |
|---|---|
| `fetchLimit` + `creationDate` desc sort | **Correct but slow.** Apple documents the *semantics* (sort desc + limit 1 ⇒ most recent asset — fetchLimit doc Discussion). Measured 7–14s, sometimes 20–30s, for limit 90 (TF 220/234/291). The limit does not bound the sort. |
| Unsorted `smartAlbumUserLibrary` fetch + reverse `object(at:)` walk | **Fast but order undocumented.** `PHFetchResult` is lazy/chunked (header + class doc), so fetch + `count` + 90 tail reads is O(90); measured ~100ms warm, 8–14s cold-daemon once (TF 235). No Apple source states the physical order (F3). |
| `smartAlbumRecentlyAdded` (206) | **Rejected.** Undocumented membership window (it is a *recent* subset, not all photos); ordering also undocumented; can hold fewer than the 90-tile batch. Fails requirement 1 (grid must be the whole library, newest first). |
| Sort on `addedDate` (iOS 26) | **Unsupported.** `addedDate` exists as a property (iOS 26.0+, `PHAsset.h:47`) but is **not** in the documented `PHFetchOptions` supported-keys table for `PHAsset`. Undocumented sort keys are exactly the "suboptimal and we will log" class. |
| `PHPersistentChangeToken` / `fetchPersistentChanges(since:)` | Change-tracking, not a fetch. Cannot produce a newest-N list by itself. |

### F2 — `fetchLimit` applies to the sorted result; the cost of that sort is undocumented and measured O(library)

- **Semantics (documented):** Apple's own `fetchLimit` Discussion — "to fetch only the most recently captured asset… sort in descending date order, and setting a fetch limit of one" — only makes sense if the limit is applied **after** sorting. So: sort first, then limit.
- **Cost (undocumented):** nothing in the headers or docs says the sort is indexed, avoided, or bounded. The header warns "Some predicates / sorts may be suboptimal and we will log" (`PHFetchOptions.h:19`). Measured on device: 7–14s (to 20–30s) for a 90-limit sorted fetch (TF 220/234/291). Treat sorted-fetch-first-paint as **O(library)** and banned for first paint regardless of `fetchLimit`.

### F3 — `smartAlbumUserLibrary` is the right collection; its physical order is **not guaranteed by any Apple primary source**

- The collection is alive and supported: `= 209`, no deprecation in the iPhoneOS 26.5 SDK header (`PhotosTypes.h:95`); documented as "all assets that originate in the user's own library". The Photos app dropping the "Recents" *label* in iOS 18 did not remove the API album.
- The physical order of an unsorted fetch is **documented nowhere** — not in the headers (zero ordering statements in the entire Photos framework headers), not in the `PHFetchResult`/`PHAsset`/`PHAssetCollection` docs. `PHFetchResult` is "an ordered list", but the order is defined only when `sortDescriptors` are supplied.
- The TF 287 comment in the shipped module ("Recents smart album had unpredictable sort behavior") **misattributes the flake**. Commit `0bf4858` shows the actual TF 287 bug: the persisted warm-ID path rebuilt the grid in stale old→new AsyncStorage order on first open. That is a self-inflicted stale-ID bug, not evidence about smart-album physical order.
- Empirical evidence (oldest-at-start, ascending by addition) is consistent across iOS 8–26 reports and this repo's TF 235/237 headed runs — but it is empirical. Apple has changed undocumented smart-album behavior before (iOS 13).
- **Conclusion: physical order is UNKNOWN from primary sources. The headed gate in the recommendation is a STOP, not a guess.**

Note the semantic upside: physical/addition order is arguably a *better* match for requirement 1 ("newest photo in the library RIGHT NOW") than `creationDate` sort, because `creationDate` "can be updated by the user" (`PHAsset.h:41`) and an old photo newly synced via iCloud is newest-by-addition but ancient-by-creationDate. The walk shows it at index 0; the sort buries it.

### F4 — Invalidation: re-walk per open is already correct; the change observer is the documented cheap upgrade for while-open inserts

- A `PHFetchResult` is a snapshot: "After a fetch, the fetch result's `count` value is constant… (To get updated content for a fetch, register a change observer)" (class doc). So a completed walk never self-updates.
- **Across opens (required):** every open runs a fresh live walk. The working tree already enforces this — cached-session reuse was deleted; prefetch joins an in-flight walk only. A photo taken after the last open appears because the next open queries the daemon. Warm cost ~100ms (TF 235). Requirement 2 and 5 satisfied with zero persisted state.
- **While the picker is open (not required by the locked requirements, cheap to add):** `PHPhotoLibrary.registerChangeObserver` + `changeDetails(for: fetchResult)`. Apple: after a fetch, "Photos automatically registers your interest… you'll get notified when changes add items, remove items, or reorder the list" (Observing Changes article). Push-based, no polling; diff application is O(changes). Keep the walk's fetch result alive in the session; on change: `hasIncrementalChanges` → inserts land at the physical tail = display head, so **prepend-only** updates (no mid-list index races — the concern that deferred the observer in the 2026-08-29 plan); `hasIncrementalChanges == false` → re-walk (90 assets, ~100ms warm). This is the "cheap and required" escape hatch the requirement allows; it is optional for v1.
- `PHPersistentChangeToken` (serializable, survives launches) could make even a persisted snapshot provably fresh — but a live walk is already ~100ms warm, so the token adds nothing for first paint. **Rejected for this purpose** (and a persisted ID grid is banned outright).

### F5 — Delete list: every path that can paint oldest-first or stale content

Already deleted in the working tree (keep deleted): `libraryPreviewIds.ts`, the `openPhotokitLibraryWithIds` prefetch branch, `persistPreviewFromSession`, cached-session reuse across opens, the warm-page paint inside the native2b branch, and the fall-through from a failed limited open to a sorted full-library open on the default path.

Still present and able to paint wrong content — must be removed or fenced:

1. **Native `openLibraryWithIds`** (`PhotokitThumbsModule.swift:453-492` + `Function("openLibraryWithIds")` at `:827`) — dead since the JS caller was deleted; remove so no future caller can resurrect the stale-ID grid.
2. **Native `previewNewestIds`** (`:611-623` + export at `:870`) — runs a **full sorted** `fetchLibrary()` to hand JS 60 stub IDs: an O(library) scan whose product is a stub-asset paint. Remove both the native function and the JS paint block (`useLibraryGridAssets.ts:326-338`).
3. **Warm MediaLibrary bridge paints** (`useLibraryGridAssets.ts:269-347`: `peekWarmLibraryPage` / `consumeWarmLibraryPageAsync` / `awaitWarmLibraryPage`) — paints a `getAssetsAsync` page before the live native query returns, and the parallel Photos job is the measured ~20s contention multiplier (TF 213–232). Remove for the default album; the whole `warm` A/B path (`libraryPickerPerf.ts` `LibraryPickerPath = "warm"`) should be retired, not just unused.
4. **`warmLibraryFirstPage`** (`src/utils/libraryWarmPrefetch.ts`) and its call in `libraryCapturePrefetch.ts:29` — the warm path's MediaLibrary page. The camera-button thumb (`peekWarmLibraryThumbUri`) should come from the native session's display index 0, not a second Photos job.
5. **`loadPage` / `getAssetsAsync` paging for the default album** (`useLibraryGridAssets.ts:140-186`, `:403-412`) — the oldest-first-capable fallback. Default all-photos must be native-walk-only: if the native module is missing, show the empty/error state, never a MediaLibrary page. Keep `loadPage` only if named albums stay on MediaLibrary (named-album sets are small; ideally they also go through the native sorted path that already exists).
6. **Sorted `expandLibraryFull` on the default path** (`PhotokitThumbsModule.swift:495-516`) — a 7–14s background sorted scan that starves thumbs and Accept (TF 234/235), and it re-sorts by `creationDate`, creating an order seam against the addition-ordered first batch at item 91. Replace with **continued reverse walk** on the same live fetch result (append the next batch from `lastVisited - 1`): O(batch), no sort, no seam, videos filtered by the same walk rule.
7. **`newestLibrary` (fetchLimit + sort)** must never serve the default first paint — keep it only for explicit user-chosen sort/date filters and named albums, where the user picked a non-default view and the set is bounded.

### F6 — If the reverse walk's order fails the headed gate

Ranked by smallest exit that still meets timing + accuracy:

1. **F6-a — Date-windowed sorted paging (stay in PhotoKit).** Predicate `creationDate >= windowStart` + `creationDate` desc sort + `fetchLimit` 90; start window at ~30 days, widen until ≥90 assets or library exhausted; older photos via continuation windows (`creationDate < last`) on scroll. Accuracy is **guaranteed** (documented sort semantics; a photo taken now always has `creationDate ≈ now`, so requirement 2 holds). Timing is **unproven** — whether the date predicate uses an index is undocumented; it must be measured headed before adoption. Degrades gracefully (window sort is O(window), not O(library)) but a 5,000-photo week re-inflates the sort.
2. **F6-b — PHPicker (framework exit).** Always newest-first, always fast, zero PhotoKit cost in-process. What it drops, verified against Apple docs and this repo:
   - **Embeddable in-app grid** — `PHPickerViewController` is modal, system-rendered, out-of-process; "you can't subclass PHPickerViewController. Its view hierarchy belongs to the system"; it even disables interaction if the app alters opacity. No custom cells, badges, or chrome.
   - **"This session" camera strip** (`HybridLibraryPickerScreen.tsx:327`) — no way to inject a session row into the system grid.
   - **Crop/draw annotation flow** (`AssetAnnotation` → `updatePhotoUri`, `:72, 251-265`) — annotation must move post-pick, inside the app, after dismissal.
   - **The Accept/upload pipeline integration** (PhotoKit pause/resume, exclusive gate, HUD budgets) — the picker owns its own session; none of the native2b machinery applies.
   - What PHPicker *does* cover: ordered selection (`configuration.selection = .ordered`, numbered checkmarks), preselection (`preselectedAssetIdentifiers`), deselect/reorder APIs, filters, and it needs no photo-library permission prompt. Selection **order** is preserved; the grid UX is not yours.
3. **F6-c — Skeleton-only wait (stance, combines with F6-a).** Never paint anything but placeholders until a provably newest-first result exists. This is already the working-tree behavior for the walk ("Gray tiles until it returns"); it is the correctness floor for any fallback.

---

## Options compared

| Option | Warm first tile | Cold daemon | Accuracy (index 0 = newest now) | Second open | What it breaks / risks |
|---|---|---|---|---|---|
| **A. Reverse walk on `smartAlbumUserLibrary` (working tree, + F5 deletions)** | ~100ms measured (TF 235) | 8–14s once, skeleton only, correct order when it lands | Correct **iff** physical order = oldest-at-start (undocumented — F3) | Fresh live walk, ~100ms | Undocumented order could change in a future iOS (iOS 13 precedent); mitigated by headed gate + per-open live query |
| B. Sorted fetch + `fetchLimit` (TF 291 shipped) | 7–14s, to 20–30s | worse | Guaranteed by documented sort | 20–30s again | Fails the 3s budget by up to 10×; measured |
| C. Persisted newest-90 IDs (TF 237) | ~70ms | ~70ms | **Stale by construction** — banned | Fast but stale | Banned by requirement 2; TF 287 flake was this path |
| D. Warm MediaLibrary page / `getAssetsAsync` paging as first paint | seconds, and ~20s when parallel with native | worse | Can paint wrong order; replaced later (visible reshuffle) | Same cost again | Banned by requirement 3; measured contention |
| E. `smartAlbumRecentlyAdded` first paint | likely fast | unknown | Undocumented membership window + order; can hold < 90 | same | Not the whole library; undocumented |
| F6-a. Date-windowed sorted paging | unproven (measure) | unproven | Guaranteed (documented sort) | bounded re-query | Window edge cases; sort cost if huge recent week |
| F6-b. PHPicker | fast (system) | fast | Guaranteed | fast | Loses in-app grid, This-session strip, crop/draw-in-picker, Accept pipeline (F6-b list) |

## Recommended solution

**Adopt Option A — the working-tree reverse walk as the only first-paint source — behind a headed physical-order gate that is a STOP, not a guess.** Physical order is undocumented (F3); if the gate fails, fall to F6-a (measured headed before adoption), then F6-b.

### Implementable steps (files named; for the builder, not done here)

1. **Headed gate (STOP).** On the dogfood phone (large real library, iCloud Photos on), after a native rebuild:
   - Mutation proof: an iOS Camera photo, then reopen the picker, is tile 0. If an older photo can be newly added (AirDrop or another device), that add is also tile 0.
   - `creationDate` along the tail is a diagnostic only. A break there does not switch the grid to the slow sort and is not the stop.
   - Cold and force-quit runs stay gray until the live walk returns. HUD `meta` / `1st` ≤ 3s when Photos is warm, `path native2b`, no `loadPage` line. A walk that finished before the tap is not the timing proof. **Mutation failure = STOP; do not ship the walk; measure F6-a, then F6-b.**
2. **One backing, no expand fetch.** `modules/photokit-thumbs/ios/PhotokitThumbsModule.swift`: keep the unsorted user-library `PHFetchResult` alive in the session; first batch walks until 90 images or the start of the album; "expand" continues that walk. Sorted `expandLibraryFull` stays only for filtered and named-album sessions.
3. **Delete the fallback paints in this change.** Native: `openLibraryWithIds`, `previewNewestIds` (+ exports). Default album on native2b: no warm page, no stub-ID paint, no `getAssetsAsync` paging, no camera-tab walk used as the grid. The `warm` flag remains the non-shipping path. The camera button does not call `getAssetsAsync` on native2b.
4. **Every open starts its own live query.** A walk that started before this open, including a camera-tab prefetch, is not the grid. If one is still running, wait for it to finish so two Photos jobs do not overlap, discard it, then walk again. Join a walk only when it was started for this same open. No persisted IDs.
5. **Index 0 is the newest image**, not the newest asset of any type. The walk keeps going until it has 90 images or it reaches the start of the album. It does not stop after a fixed number of videos. An empty native result stays empty. It does not fall through to `getAssetsAsync`.
6. **Phone gate (stop, not a date sampler).** A new iOS Camera photo, then reopen, must be tile 0. If an older photo can be added into the library, that add must also be tile 0. Sampling `creationDate` along the tail is a diagnostic only. A person can edit that date, so a break there must not switch the grid to the slow sort. Cold and force-quit runs stay gray until the live walk returns. Do not treat a prefetch that finished before the tap as the timing proof.
7. **Deleting the old paints is part of this change, not a follow-up.** Default album: no warm page, no `getAssetsAsync` paging, no `previewNewestIds`, no `openLibraryWithIds`, no sorted `expandLibraryFull`. Scroll grows the same unsorted fetch.
8. **Optional later:** `PHPhotoLibraryChangeObserver` while the picker stays open. Not required for this slice.
9. **Keep sorted paths only where the user asked for them:** explicit ascending/date filters and named albums keep `fetchLimit` + `creationDate` sort.

### Validation fold (2026-10-04)

[Grok](c3053c08-ee2d-4651-ba1f-315d7f1943aa), [GLM](bb88c42c-8a8b-4e7e-a124-d1cd06a472e1), and [Composer](1f7dd26f-358b-44e5-a16a-c0cca5256dc6) all returned REVISE and would still build this walk after measuring the documented sort. Folded above: same-change deletion of the TF 291 paints, no grid from a walk that started before this open, image-only walk until 90 or the start of the album, mutation gate over a creation-date assertion, and the fetch result kept for scroll. A runtime switch to the slow sort on a date-order miss was not adopted.

### Explicit non-goals

- No persisted or cached ID list as the grid, in any form (including token-validated reuse).
- No sorted `fetchLimit` window as first paint.
- No MediaLibrary `getAssetsAsync` page on the default album path.
- No PHPicker unless the headed gate fails **and** F6-a measures red.
- No change to named-album or explicit-filter behavior beyond keeping them off the first-paint path.
- No schema, persistence, or permission changes.
- Live insert **while the picker is open** is not required for this slice.

### Confidence declaration

- Primary-source coverage: Apple live docs (10 pages) + iPhoneOS 26.5 SDK headers (8 files) + repo commits/diffs. Each claim in Sources carries a URL or file:line.
- **Unknown admitted:** `smartAlbumUserLibrary` physical order is not documented by Apple. This recommendation is conditioned on the headed gate, which is a stop condition, not a formality.
- Empirical claims (oldest-first behavior, iOS 13 change, sort-disables-index) are labeled empirical and are not load-bearing for correctness — only for choosing which option to gate-test first.
