# Instagram / Threads–class library picker — E2E bar (2026-08-29)

**Status:** Product discussion (lock the *bar*; not a build GO).  
**Milestone:** `WS-PERF / M-PERF-03` (close the gap) + handover **L3**. Does **not** jump `M-OPS-ENV-01`.  
**Surfaces:** Hybrid CaptureSession library (`LibraryPhotoGrid`) — production SoT. Select Photos annotate is **after** the picker (A1).  
**Not this bar:** System **PHPicker** as the primary UI (rejected: we own Accept → Select Photos, camera session strip, Insite chrome).

Related: `2026-08-28-device-photo-library-picker-perf-discussion.md` (JS paint knobs). This note is the missing **end-to-end feel** discussion those knobs were serving.

---

## The bar (user language)

Threads / Instagram library: the grid is already *there*. Scroll is continuous. Tiles fill like paper, not like a download. The user never thinks “the app is processing.”

That is a **feel** bar, not a “first `getAssetsAsync` returned” bar. Spinners, 10s stalls, then a dump of 18–36 thumbs all fail it — even if metadata fetch was fast.

### Pass (picker session only)

| Moment | Pass | Fail |
|--------|------|------|
| Open hybrid library (from camera overlay) | First row of **placeholders** immediately; thumbs replace them in a stream | Full-screen spinner, blank white, or 1–2 thumbs then a long freeze |
| Stay still on first screen | Remaining first-screen tiles appear continuously (row-scale), no “thinking” chrome | Footer spinner as the main signal; then a wave of tiles |
| Scroll down | Next rows already decoded or appear as they enter the viewport | Hit the bottom → wait → spinner → batch dump |
| Scroll indicator | Thumb travels the **whole library** (tens of thousands). Drag-jump lands on that index. | Indicator only covers pages already fetched (12, then 30, …) |
| Scroll back up | Recycled tiles paint from cache, no re-decode hitch | Blank holes, re-decode flash |
| Leave picker (Accept) | Pin / iCloud export may take time **with** a determinate affordance | Freeze the grid itself to pin |

Camera shutter and C1 remount spinner are **adjacent** (Take), not this bar. Annotate lag is **A1**.

---

## Why Instagram feels free and we do not

Instagram / Threads (and iOS Photos) are not paging `expo-media-library` into RN `Image`.

They typically:

1. Native `UICollectionView` (or equivalent) — cell recycle on the UI thread, no JS per tile.
2. `PHCachingImageManager` / `requestImage` with **`targetSize` = tile pixels**, `deliveryMode` opportunistic (blurry Fast then sharp).
3. **Prefetch** ~1–2 screens of bitmaps *ahead of scroll*, already in memory.
4. Placeholders that are layout, not an `ActivityIndicator` owning the screen.

Our production path:

```
getAssetsAsync (IDs + ph://)  →  FlatList  →  RN Image { uri: ph:// }
```

- Metadata pages are cheap.
- Each mounted `Image` asks PhotoKit **through the RN image pipeline** with **no explicit target size** (we already avoided expo-image’s maximum-size bug; we still do not pass `PHImageManager` targetSize).
- JS schedules mounts (`initialNumToRender`, `windowSize`, page size). Too many at once → PhotoKit queue → user waits → then a **wave**. Too few without prefetch → user hits a spinner at the bottom.
- `LIBRARY_SCROLL_LOOKAHEAD_ITEMS` exists in `libraryPickerPerf.ts`. On iOS L3 it feeds `PHCachingImageManager.startCachingImages`; the RN `Image` + `ph://` fallback still does not decode-ahead.

So: C1 (camera stays mounted) and permission cache **reduce** “processing” chrome. They cannot make the grid feel native, because decode still happens one RN view at a time on the wrong API.

---

## What we already did vs the bar

| Work | Helps the bar? | Remaining hole |
|------|----------------|----------------|
| C1 camera overlay | Open library without remounting CameraView / permission spinner | Library grid still JS+PhotoKit |
| App-level camera / library permission cache | No permission spinner on re-entry | Not decode |
| `ph://` + RN `Image` sized tiles | Avoids full-res expo-image decode | Still unbounded PhotoKit work per cell |
| First page 12, scroll pages 18 | One wait fills a screen; scroll is not 6-at-a-time | Not Instagram-continuous; decode still RN `Image` |
| Warm metadata on camera | First IDs ready when overlay opens | Metadata ≠ decoded thumbs |
| ImageManipulator thumb cache (Phase B) | Unused on browse (by design after `ph://` cut) | Native FastFormat still missing |

**Honest split:** JS streaming can make the picker *honest* (no fake freeze). Tiny pages (TF 207: 3 then 6) made the same wait yield fewer tiles and felt **slower** — reverted to first screen **12**, scroll pages **18**. Only a **native thumbnail + prefetch** layer can make decode *invisible*.

---

## Three layers (do not collapse them)

### Layer A — Perceived JS (now / idle-parallel, no native)

Keep the grid in RN. Goal: never look blocked.

- Always-on **skeleton cells** for the first screen (L2).
- Footer spinner on first load and after the first screen (not a full-screen blocker).
- Prefetch the **next page of IDs** before end-reached (small pages).
- Wire **decode lookahead** only if we have a bounded decode API; otherwise lookahead just mounts more `Image`s and recreates the wave.

This is necessary. It is **not** the Instagram bar.

### Layer B — Native PhotoKit thumbs (L3 — the actual match)

Thin native module (or Expo module) used **only for grid browse**:

- `PHImageManager.requestImage` / `PHCachingImageManager.startCachingImages`
- `targetSize = tilePt * scale`
- Opportunistic: degraded then final
- Cache key `assetId + pixelSize`
- JS grid binds `file://` or a native image host, not raw `ph://` through RCTImageView

**Locks:** `newArchEnabled: false`; no FlashList v2 until human GO. Native thumbs do **not** require New Arch. Do **not** bring back PHPicker as the picker UI.

**Cost:** native rebuild / TF; iOS first (jobsite). Android: Glide/`content://` thumbnailer in a later slice.

### Layer C — The library itself (not another page size)

Instagram is not “faster paging.” It is **tapped into Photos**:

- `PHFetchResult` is a live index. `count` is known immediately (10k–100k). `object(at: i)` does not require loading 0…i.
- `UICollectionView` `contentSize` uses that count, so the **scrollbar is the whole library**.
- Cells call `requestImage` as they appear. There is no `getAssetsAsync` cursor, no footer spinner, no “second batch.”

Our path still **copies** a window of IDs into JS (`12` then `18`). FlatList can only scroll what we have copied. Prefetching one extra page hides one hitch. It cannot make a 50k-photo scrollbar.

**C1 (recommended next, idle-parallel):** keep RN FlatList + Insite chrome. Native module holds one `PHFetchResult`. JS gets `count` on open; list length = count; `getItemLayout`; native thumb view takes **index** (or id-at-index). No page spinner. Android stays paged `Image` until a MediaStore cursor slice.

**C1 locks from Gate B on prefetch-18 (NO-GO as the Instagram fix):**

- Do not claim a paged JS list is continuous. A wall at 30 is the same stall as a wall at 12.
- Do not bind thumbs only after JS `onViewableItemsChanged` — that flashes skeletons on fling and on scroll-back.
- Do not treat HUD `p2` as proof of decode; it includes time-to-scroll.
- Keep first-screen `requestImage` uncontested (TF 212: do not `startCaching` the visible 0–11).

**C2 (later, only if C1 scroll physics still fail):** native `UICollectionView` owns the scroll view too.

Do **not** load 50k asset objects into JS. Do **not** PHPicker. Do **not** New Arch / FlashList v2.

---

## Recommended sequence (idle-parallel vs ENV-01)

Does **not** jump `M-OPS-ENV-01` Phase D.

1. **Stop.** No more `PAGE_SIZE`, prefetch-18, or JS page walls.
2. **L1–L3 (done on TF 213):** HUD, skeletons, native tile thumbs. First screen is fast. List is still 12-then-18.
3. **Next (one slice) — Photos index:** native `PHFetchResult`; JS `count` + FlatList length = whole library; existing `PhotokitThumbView` takes **index**. No footer spinner. Android stays paged. Headed pass: scrollbar spans the library; fling hundreds of rows with no wait; first 12 stays in the TF 213 band.
4. **Only if 3 still feels like JS scrolling:** native `UICollectionView` owns the scroll view.
5. **After browse is continuous (order):** iCloud-only blank tiles (L4) → Select Photos annotate lag (A1) → retire duplicate `InAppLibraryPicker` (L7) → Android MediaStore index.
6. **Stay tabled:** `M-CAPTURE-01` zoom, `M-CAPTURE-02` tile resize, PHPicker as UI, New Arch / FlashList v2.

`M-CAPTURE-02` (user-resizable tiles) stays tabled — resizing fights cache keys until L3 `targetSize` exists.

---

## Out of scope

- Remote evidence thumbs → `M-PERF-01`
- PHPicker as primary library UI
- FlashList + New Arch (`P3`)
- Making Accept/pin “free” (that is I/O after the picker; show progress, don’t block browse)

---

## Multi-model fold (2026-08-29) — first-screen load

Shared brief sent identically to three evaluators. **Consensus, not one model as SoT.**

| Evaluator | Verdict |
|-----------|---------|
| [GPT 5.6](566d9f52-1425-4ad7-a2fc-2ed4e8d400ae) | **CONDITIONAL** |
| [Gemini 3.7](af82fd12-8cc8-46f3-8258-b07c7b2553b3) | **CONDITIONAL** |
| [Grok 4.5](787da1f1-06c0-49a6-b158-3df511333a93) | **CONDITIONAL** |

**Dominant bottleneck (3/3):** first screen mounts **12** RN `Image` + `ph://` with **no PhotoKit `targetSize`**. Permission and `getAssetsAsync` metadata are milliseconds. Camera peek explains the **one** fast tile. Overlay remount and one-shot warm are real but not the 1s–10s stall.

**JS cannot match Instagram.** More `PAGE_SIZE` is rejected (tiny pages already felt worse). ImageManipulator browse is rejected (likely slower). Skeletons / stagger URI bind = **honesty only**. Keep-library-mounted = cheaper remount, not decode.

**Orchestrator recommendation:** **Do not GO-NOW as pipeline #1.** **Do GO L3 as idle-parallel spike** (hybrid grid only, iOS `PHCachingImageManager` + tile `targetSize`). Same-session stopwatch (overlay open → first row → 12 visible) is enough L1 — user already reported long first batch; do not wait a week of metrics. Layer A skeletons can ship in JS beside L3. **`M-OPS-ENV-01` stays #1.**

**Disagreement:** Gemini listed keep-mounted + skeletons + start L3 in the same next-three. GPT/Grok wanted timed proof before native. Fold: start L3 spike **and** a 5-minute headed stopwatch; do not block the spike on a new metrics framework.

**User lock (2026-08-29, headed 213):** first screen is native-fast. Remaining miss is whole-library scroll. Recommended remaining sequence is the Photos-index slice, then UICollectionView only if that still fails.

Updated: 2026-08-29

