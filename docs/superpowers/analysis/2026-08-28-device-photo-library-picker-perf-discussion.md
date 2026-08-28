# Device photo library picker — performance & UX discussion (2026-08-28)

**Status:** Discussion only — **no design lock**. Priority TBD on ROADMAP (`WS-PERF / M-PERF-03`).

**Scope:** On-device Photos access (PhotoKit / `expo-media-library`), **not** remote `buildtrack-files` evidence thumbs (`M-PERF-01`).

**Surfaces in scope:**

| Surface | Implementation | Notes |
|---------|----------------|-------|
| Capture hybrid library | `src/modules/captureSession/HybridLibraryPickerScreen.tsx` | Production SoT after `captureSession` close; TF200 lag fix landed 2026-08-28 |
| Select Photos library | `src/screens/InAppLibraryPickerScreen.tsx` | Third-party `expo-image-multiple-picker` — separate code path; may need same patterns later |

---

## What TF200 already improved (2026-08-28)

Per `docs/superpowers/reports/2026-08-27-capture-session-close.md` § Follow-up:

1. **Defer PhotoKit pin to Accept** — first tap stores `mediaLibraryAssetId` + `ph://` ref only; `materializeLibrarySelection` exports `file://` on Accept.
2. **Grid tiles use RN `Image` with explicit `width`/`height`** — avoids `expo-image` 2.2 requesting `PHImageManagerMaximumSize` for `ph://` URIs.
3. **Camera session strip** stays on `expo-image` (`file://` drafts).

**Residual (documented, not closed):** iCloud-only assets, limited-library edge cases, FlashList migration, true target-size thumbnails.

---

## Current hybrid picker knobs (baseline for experiments)

From `HybridLibraryPickerScreen.tsx`:

| Knob | Value | What it affects |
|------|-------|-----------------|
| `PAGE_SIZE` | 36 | `MediaLibrary.getAssetsAsync` metadata page (IDs + `ph://` refs) — cheap |
| `initialNumToRender` | 18 | First paint mounts **18 grid cells** (= 6 rows × 3 cols) |
| `maxToRenderPerBatch` | 12 | Additional cells mounted per FlatList batch while scrolling |
| `windowSize` | 5 | Off-screen render window multiplier |
| Tile decode | RN `Image` + `ph://` | PhotoKit still decodes bitmaps per mounted cell — **main cost** |

**Important distinction:** Fetching 36 asset records is fast. **Painting** 18 thumbnails triggers up to 18 concurrent PhotoKit decodes — that is what users feel as lag.

---

## Open question: progressive paint (3 at a time × ~10 batches)

**Product idea:** Instead of painting 18 tiles at once, paint **3 tiles**, then 3 more, repeating — grid fills continuously so the picker feels alive rather than frozen.

### Why this is plausible

- Spreads PhotoKit decode work across ~300–800 ms instead of one main-thread spike.
- User sees immediate motion (placeholders → thumbs) which improves **perceived** speed even if total time is similar.
- Aligns with iOS Photos app “waterfall” feel.

### Implementation options (not chosen — for study)

| Option | Mechanism | Pros | Risks |
|--------|-----------|------|-------|
| **A. FlatList batch tuning** | `initialNumToRender={3}`, `maxToRenderPerBatch={3}`, `updateCellsBatchingPeriod={50}` | Minimal code; native list behavior | Still mounts cells; may not cap concurrent PhotoKit decodes if RN Image schedules all at once |
| **B. Staggered URI binding** | Render cell chrome immediately; set `source={{ uri }}` only when tile index `< paintCursor` incremented on `requestAnimationFrame` / `setInterval(16–50ms)` | Hard cap on concurrent decodes; exact “3 per tick” control | Custom state; scroll-fast may show empty tiles briefly |
| **C. Skeleton grid + fill** | Pre-render N placeholder cells; swap to `Image` as thumbs arrive from a small queue (concurrency = 3) | Best perceived UX; decouples layout from decode | More code; need cancel on unmount / album switch |
| **D. Viewport-only decode** | `onViewableItemsChanged` → only bind URI for visible + 1-row lookahead | Best for scroll performance | First screen still needs A/B/C for initial paint |

**Recommendation for spike:** Combine **C + D** — skeleton grid, decode queue concurrency **3**, viewport gate for off-screen rows. Option A alone is a quick experiment but may not guarantee decode concurrency cap.

---

## Open question: even lower-resolution thumbnails

Today: RN `Image` at display size (`tileSize` ≈ 120–140 pt). iOS may still decode larger intermediates for `ph://` — we do **not** yet call PhotoKit with an explicit `targetSize` (pixel width × `PixelRatio`).

### Directions to evaluate (no lock)

1. **Native / thin-module thumbnail API** — wrap `PHImageManager.requestImage` with `targetSize = tileSize * scale`, `deliveryMode = opportunistic`, cache to temp `file://` keyed by `assetId`.
2. **In-memory LRU thumbnail cache** — first decode writes JPEG to cache dir; subsequent mounts hit `file://` (fast + stable for `expo-image` if we switch back for grid).
3. **Re-test `expo-image` when SDK allows target size** — close report parked this on SDK lock; re-evaluate on Expo SDK bump.
4. **FlashList** — better recycling; reduces duplicate decodes while scrolling (does not fix first paint alone).

**Acceptance probe for any approach:** headed sim on iPhone 17 Pro — time from library open → first 9 tiles visible; Instruments / signpost optional; compare TF200 baseline vs candidate.

---

## Other UX ideas (library access)

| Idea | Rationale |
|------|-----------|
| **Instant skeleton grid** | Zero blank screen — user knows picker loaded even before thumbs |
| **Default to Recents smart album** | Smaller working set vs “All photos”; faster first meaningful paint |
| **Warm metadata on camera screen** | Prefetch first page of `getAssetsAsync` while user is still on camera (before hybrid library mount) |
| **iCloud / limited-library affordances** | Badge cloud-only assets; avoid blocking grid on `shouldDownloadFromNetwork` during browse |
| **Accept progress** | Multi-select Accept already pins in batch — show determinate progress when many iCloud assets selected |
| **Unify Select Photos path** | `InAppLibraryPickerScreen` still uses `expo-image-multiple-picker`; hybrid improvements may need port or replace |

---

## Out of scope (explicit)

- Remote evidence photo thumbs / signed URLs → **`M-PERF-01`**
- Upload downscaling / storage conservation → **`M-PERF-02`**
- Schema, auth, or release changes

---

## Suggested validation when scheduled

1. Headed smoke: open hybrid library → first row populated &lt; 500 ms (device target TBD).
2. Scroll 100+ assets — no jank / OOM.
3. Select 5 + Accept → Select Photos with pinned `file://` (regression of TF200 fix).
4. Optional: limited library + one iCloud-only asset manual check.

---

## References

- Close + TF200 follow-up: `docs/superpowers/reports/2026-08-27-capture-session-close.md`
- Module guide: `docs/superpowers/plans/2026-08-27-capture-session-module-ab.md`
- Remote photo perf (separate track): `docs/superpowers/analysis/2026-08-19-photo-sync-resilience-investigation.md`

Updated: 2026-08-28
