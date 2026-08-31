# PhotoKit first paint — HUD legend, gaps, TF237 journey

**Date:** 2026-08-30  
**Milestone:** `WS-PERF / M-PERF-03`  
**Skills:** `~/.cursor/skills/native-photos-first-paint/SKILL.md` (portable) · `.cursor/skills/photokit-picker-perf/SKILL.md` (Insite)

Clock source: `src/utils/libraryPickerTiming.ts`  
HUD: `src/modules/mediaLibrary/LibraryPickerTimingHud.tsx`  
t=0: `beginLibraryPickerSession()` in `CaptureSessionModule.goToHybridLibrary` (library overlay tap).

---

## 1. HUD legend

All **`+Nms`** values are `timestamp - origin`. A dash (`—`) means that mark never fired this overlay.

| HUD line | Field | Origin | What fired it | Product meaning |
|---|---|---|---|---|
| **L1 timing** | header | — | — | Dev/TF overlay, not a product control |
| **meta** | `metadataAt` | overlay tap | `markLibraryPickerMetadata(count)` when index session or asset list exists | Time until JS has a **count/session** to bind. Not “Photos finished scanning the phone” if the session was prefetched or opened by ID |
| **1st** | `firstTileAt` | overlay tap | first `onPainted` / Image `onLoad` | **Product budget** (`LIBRARY_FIRST_PHOTO_BUDGET_MS` = 3000). First tile callback, `PHImageRequestOptions.deliveryMode = .fastFormat` |
| **row** | `firstRowAt` | overlay tap | N unique paints, N = `min(3, count)` | First grid row |
| **12** | `firstScreenAt` | overlay tap | N unique paints, N = `min(12, count)` (`LIBRARY_FILL_UNTIL_COUNT`) | First screen. If the library has 8 photos, this fires at 8 |
| **p2** | `secondWaveAt` | **`12` / first screen**, not overlay | first screen + 6 more paints (`LIBRARY_SECOND_WAVE_ITEMS`) | Extra 2 rows **after** first screen. `p2 +75` with `12 +173` ⇒ overlay→p2 ≈ 248ms |
| **up** | `scrollUpRowAt` | **scroll-up start** | user left first screen then scrolled back; 3 recycled tiles painted | Scroll-up recycle. **Not upload** |
| **1st 12** | `prevScreenMs` | **previous** overlay | copied at the **next** `beginLibraryPickerSession`: previous `(firstScreenAt - overlayOpenAt)` | **Not this open.** Absent on the first overlay of a JS process |
| **loadPage** | `loadPageReason` | — | `getAssetsAsync` paged path (`fallback` / `pagination` / `album`) | Dash on `native2b` is expected |
| **path** | not a timer | — | `native` if `PhotokitThumbs` exists, then `/warm` or `/native2b` | Which fill path. Always `native/native2b` on TF237 `dev` |

### How to read a good vs bad frame

- **`meta +54` / `1st +69`:** session existed (persisted IDs or in-process cache or already-warm limited walk). **No Recents scan on this open.**
- **`meta +9500` / `1st +9518`:** first paint waited on the same job as metadata — Recents `PHAsset.fetch` (or equivalent) on the exclusive gate.
- **`meta +100` / `1st +6000`:** session was ready; decode/thumbs starved (expand, cache flush, `requestImage` flood).
- **`p2 +70` with huge `12`:** decode of page-2 is fine; the wait was **before** first screen.

---

## 2. Measurement gaps

These are HUD/process gaps, not “the numbers are random.”

1. **Prefetch is off-clock.** Camera mount runs `startLibraryCapturePrefetch()` (hydrate IDs + `openLibraryWithIds` / limited Recents) **before** overlay tap. HUD t=0 is the tap. A 8s Recents walk on the camera tab can finish, then picker HUD shows `meta +54`. “Tap → first tile” is honest; “app launch → first tile” is **not on the HUD**.
2. **No fetch-kind tag.** HUD cannot say `ids` vs `limited Recents` vs `full open` vs `cache hit`. Infer from `meta`: tens of ms ⇒ not a library scan; seconds ⇒ scan.
3. **No session `count`.** Cannot see 12 persisted IDs vs 30 limited vs 50k expanded.
4. **`1st 12` name.** Reads like this open’s first-12. It is the **previous** overlay. First overlay of a process has no line.
5. **`p2` origin is first screen.** Easy to compare to `1st` as if both were overlay-relative.
6. **`up` vs upload.** Name collision with the Accept spinner / pin path. Accept has **no HUD**.
7. **`1st` is opportunistic thumb.** `fastFormat`, `resizeMode.fast`, no iCloud (`isNetworkAccessAllowed = false`). Not full-resolution, not HQ.
8. **Paint id uniqueness.** Duplicate `assetId` / `__idx_N` placeholders can under-count unique paints.
9. **True daemon-cold is unlabeled.** Force-quit, TF update, delete-app, and reboot are different classes. HUD has no `coldClass`.
10. **Ghost glyphs on screenshots.** RN `Text` is not keyed by `sessionId`; a PNG can show faded previous digits behind the new string. Trust the **sharp** numbers.
11. **Plan-vs-device.** Jest never exercises Photos-daemon cold. Headed TF is the only first-paint proof.

---

## 3. What actually got fast (TF237 headed)

Repeatable HUD (`1st +69ms`, `meta +54ms`) is **not** “we made Recents fetch 100× faster.”

**Primary cause:** after one successful limited open, newest local IDs are persisted (`@insite/photokit-recents-preview-ids`, max 30). The next process start hydrates them on the camera tab and calls `PHAsset.fetchAssets(withLocalIdentifiers:)` — **O(ids)**, sync, **not** on `workQueue`, not behind expand. That is the 50–70ms band.

**Amplifiers (without these, ID open still loses):**

| Change | TF | If missing |
|---|---|---|
| Do not `clearPhotokitLibraryIndexPrefetch` on CaptureSession unmount | 236 | Next overlay in-process pays Recents again (TF235 9.5s after a 284ms open) |
| `openLibraryWithIds` off `workQueue` | 236 | ID open waits behind in-flight expand |
| No auto-expand on first paint; expand on scroll near end | **237** | Expand’s Recents fetch starves thumbs (`1st` 6s after `meta`) **and** Accept `getAssetInfoAsync` (checkmark spinner) |
| Unfiltered Recents walk for **first-ever** limited open | 236 | Image predicate + `creationDate` sort still 7–13s (TF220/234) even with `fetchLimit` |

**Not the win:** thumb decode. `p2 +70ms` was already true on TF235 while `12` was 9–19s.

**The one ~8s TF237 launch:** Photos **daemon-cold** (or first persist miss) Recents walk while camera prefetch / first picker open ran. After that, daemon stays warm **and** IDs are on disk — force-quit and TF-over-install stay in the 70ms band. A full app delete or reboot can still pay the one-shot tax.

---

## 4. Engineering journey (what we missed)

| TF | What we believed | What the device did | Miss |
|---|---|---|---|
| 213–232 | Warm MediaLibrary page ∥ native open = faster | Parallel Photos jobs → 20s+ | Exclusive gate too late; “overlap to hide latency” inverts on one daemon |
| Plan Gate A (2026-08-29) | **High:** Recents fetch **images only** + `creationDate` descending | That **is** the 7–13s scan | Product newest-first ≠ fetch sort. Recents is physically oldest-first; reverse the **index** |
| 220 / 234 | `fetchLimit: 48` + sort = cheap newest-N | Sort still materializes/scans Recents | `fetchLimit` does not make a sorted Recents fetch O(48) |
| 233 | Full `openLibrary` then bind | `meta` ~11s | First paint cannot beat metadata if metadata **is** the scan |
| 234 | Warm bridge then limited | Warm 13s then thumbs starved 6s more (`1st` 19s) | Expand/cache-ahead during first screen |
| 235 | Unsorted `object(at:)` newest-N | Reopen ~100ms; **cold still 9.5–13.8s**; Accept hang | Image predicate still scans; expand after first paint; **unmount cleared JS cache**; Accept vs expand not serialized |
| 236 | Persist IDs + unfiltered walk + keep cache | ID path exists; TF not headed for Accept | Correct fetch **kind** for repeat visits |
| 237 | Pause Accept; expand only on scroll | Repeatable `1st +69ms`; one-shot ~8s | Daemon-cold still unlabeled on HUD |

**Root miss:** we optimized **how** we opened Recents (sort, limit, warm, expand timing) instead of **whether** first paint needs Recents at all. Instagram-class first screen is **identity-indexed** (last N ids) or a **capped reverse walk**, then expand when the user asks for older photos.

**Second miss:** exclusive Photos I/O. Background fill and foreground Accept are the same daemon. Expand-on-paint made the checkmark spinner look like “upload stuck.”

**Third miss:** HUD literacy. `1st 12` as previous overlay, `up` as not-upload, prefetch off-clock — agents and humans mis-attributed seconds.

---

## 5. Agent checklist (copy into a picker perf loop)

```
- [ ] Name cold class (process / disk IDs / daemon warm / daemon cold)
- [ ] Read HUD with origin table (especially `1st 12`, `p2`, `up`)
- [ ] If meta is seconds: stop touching decode; change fetch kind
- [ ] If meta is fast and 1st is slow: look for expand / cache / exclusive gate
- [ ] First screen: IDs or capped reverse walk — no sort, no Recents image predicate
- [ ] Expand only after user scroll near end of limited set
- [ ] Accept: pause thumbs → gate idle → originals
- [ ] Do not clear in-process session on overlay unmount
- [ ] Prove on headed TF; Jest cannot see Photos daemon
```
