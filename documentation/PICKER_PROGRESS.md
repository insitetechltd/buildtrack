# Picker progress (monitor this file)

**Refresh this file from the iOS Cursor app.** Path: `documentation/PICKER_PROGRESS.md`  
**Milestone:** `WS-PERF / M-PERF-03` — Photos index. Idle-parallel.

**Last updated:** 2026-10-04 09:50 +08

**How it works now:** [How the default library opens](#how-the-default-library-opens-tf-292). Investigation: `docs/superpowers/analysis/2026-10-04-library-newest-first-research.md`.

---

## How the default library opens (TF 292)

Headed dogfood on TF **292** (2026-10-04): the photo picker, album selection, and Newest/Oldest plus date filters looked stable.

The default album is the iOS user library (`PHAssetCollectionSubtype.smartAlbumUserLibrary`). Index 0 is the newest **image**, then older images. Videos are skipped while walking. Named albums, Oldest First, and date filters do not use this walk. They keep a `creationDate` sort.

### What failed for so long

An unsorted fetch that starts at the front of the album, or a saved list of IDs replayed in storage order, does not open on “now.” On a large library that slice sits in the middle of years of photos and looks random. That is why the date sort was added. The sort was the correct response to that evidence.

Apple’s documented way to get the newest photo is to sort by `creationDate` descending and set `fetchLimit`. The limit is applied **after** the sort, so “give me 90” still sorts the whole library. On a large library that was 7–30 seconds, and the second open was the same sort again.

Saving the last 90 asset IDs made the next open fast (~70ms) and wrong. Those IDs are whoever was newest at the last successful open. A photo taken after that is missing, and the grid can open on an old set.

While that sort ran, the first launch also painted a MediaLibrary page. That page follows library order and was appended oldest-first, so the earliest photos appeared immediately and newer ones showed up underneath minutes later. The second open skipped that page (it had already been consumed) and waited on the sort alone, which is why it was slow and finally correct.

`smartAlbumRecentlyAdded` is a smaller smart album, not the whole library. `addedDate` exists on iOS 26 and is not a sort key. `creationDate` can be edited by the user, so a date check cannot decide to fall back to the slow sort.

### What works

Each time the library overlay opens, native code fetches the user library **with no sort and no media-type filter**. That fetch is cheap because PhotoKit does not reorder the album. The album’s own order has the newest assets at the end. The walk starts at the last index and steps backward, keeping images, until it has 90 images or it reaches the start of the album. Those 90 are the first screen. The fetch result stays attached to the session. Scrolling near the end continues the same walk for the next 90 images. It does not start a second sorted fetch of the whole library.

The grid stays gray until that walk returns. An empty walk stays empty. There is no saved-ID list, no warm MediaLibrary page, and no `getAssetsAsync` paging on this path. A walk that started on the camera tab, or before this open, is not the grid. If one is still running, it is allowed to finish so two Photos jobs do not overlap, then it is discarded and this open walks again.

The in-app shutter does not write to Photos. A photo that must appear as the newest library image has to be taken in the iOS Camera app, or otherwise added to the library.

Oldest First, a date window, and a named album still use the sorted `fetchLimit` path. Those sets are what the user asked to see, and they are the slow path on purpose. They must not write a preview ID list.

Apple does not document that the unsorted user-library order is newest-at-the-end. TF 292 dogfood is the evidence that it is, on this phone. A photo added after the last open has to land on tile 0. If that ever fails, stop using the walk. The next candidates are a measured date-windowed sorted page, then the system picker, which would drop the in-app grid.

---

## Goal (orchestrator)

1. **First photo ≤ 3s** (`1st` HUD / `LIBRARY_FIRST_PHOTO_BUDGET_MS`)
2. **Continuous fill** until full library (limited → same-token expand on **scroll near end**, not first paint)
3. **Accept / checkmark** must land Select Photos without exporting originals (export at Draw/upload, 1920 cap)
4. **≤10 code/TF iterations** then stop if unmet

## Status

**NOW:** TF **292** default album is a live user-library walk, newest image first. No saved IDs. No MediaLibrary page on that path. Scroll continues the same walk. Oldest First, date filters, and named albums stay on the sorted fetch. Warm MediaLibrary paging and `EXPO_PUBLIC_LIBRARY_PICKER_PATH` are removed; there is no path flag. Android still pages with `getAssetsAsync` when PhotoKit is absent. HQ thumbs + zoom + tile grip still parked.

HUD `1st 12` is the **previous overlay** in the same JS process, not the current open. **`up` is not upload.** Full legend: `docs/superpowers/analysis/2026-08-30-photokit-first-paint-journey.md`.

**Daily TF:** `./build-and-submit.sh ios` (profile `dev`)

---

## Iteration log

| # | Change | Proof |
|---|---|---|
| 0 | TF233 native2b | meta ~11s |
| 1 | warm bridge + fetchLimit limited | TF234 HUD miss: meta 13.2s / 1st 19.3s |
| 2 | unsorted Recents newest-N; no warm wait; defer expand | TF235: reopen 107ms; cold first 9.5–13.8s; Accept hang |
| 3 | unfiltered Recents walk; persist newest ids | Jest; TF236 |
| 4 | pause thumbs on Accept; expand only after user scroll near end | TF237 headed: `1st +69ms` (repeatable); one-shot ~8s |
| 5 | saved 90 IDs + creationDate sort + MediaLibrary pages | TF 291: first open oldest-then-newer-below; second open 20–30s and correct |
| 6 | live user-library walk, new query every open, scroll continues it | TF 292 headed: picker, albums, and filters stable |

---

## TF237 headed (2026-08-30)

| HUD | Meaning |
|---|---|
| `meta +54` / `1st +69` / `row +70` / `12 +173` | This open. First tile well under 3s |
| `p2 +75` | Second wave from first screen, not overlay |
| `1st 12 +140` | **Previous** overlay’s first-12 (also fast) |
| `up —` | No scroll-up sample this open (not upload) |
| One ~8s first launch | Photos Recents enumeration once; OS stays warm after that |

---

## Thumb 2× experiment (pending TF)

TF237 delivered **256px** (JS asked ~tile×3, Swift `maxThumbPixel` clamped). This experiment requests **512px** (`LIBRARY_PHOTOKIT_THUMB_LINEAR_SCALE = 2`). HUD line: `thumb 512px`.

**Compare only when:** Photos-warm, Recents, `meta` tens of ms (ID-open, not a Recents scan), same device. Area is **4×** so `1st`/`12`/`p2` will likely grow; first-paint budget is still 3s.

**Not the same as:** changing `LIBRARY_THUMB_MAX_PIXELS` (320) — that is the JS Image fallback, not native Photokit tiles.

---

## Invariant

Photos-heavy work stays on `runExclusivePhotokitJob`, one job at a time. Accept originals run **after** thumbs are paused and the gate is idle. The default album does not persist asset IDs and does not sort `creationDate` for first paint.
