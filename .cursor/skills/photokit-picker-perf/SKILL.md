---
name: photokit-picker-perf
description: >-
  Insite hybrid library picker (M-PERF-03): native2b path, L1 timing HUD
  legend, Recents limited vs persisted IDs, Accept PhotoKit pause. Use when
  editing PhotokitThumbs, libraryIndexPrefetch, HybridLibraryPickerScreen,
  HUD `1st`/`meta`/`1st 12`, or picker first-paint / checkmark spinner.
---

# Insite PhotoKit picker perf

Read the portable rules first: `~/.cursor/skills/native-photos-first-paint/SKILL.md`.

Journey + HUD legend (this repo):
`docs/superpowers/analysis/2026-08-30-photokit-first-paint-journey.md`

Live status: `documentation/PICKER_PROGRESS.md`

## Path (TF237)

`EXPO_PUBLIC_LIBRARY_PICKER_PATH=native2b` (`eas.json` `dev.env`).

1. Camera tab: `startLibraryCapturePrefetch` → hydrate `@insite/photokit-recents-preview-ids` → `openLibraryWithIds` if present, else `openLibraryLimited` (unsorted Recents walk).
2. Overlay tap: `beginLibraryPickerSession()` — HUD t=0.
3. Expand **only** after the user scrolls near the end of the limited set — not on first paint.
4. Checkmark: `withPhotokitReleasedForOriginals` → pause thumbs → wait exclusive gate → `getAssetInfoAsync`.

## HUD cheat (do not misread)

| Line | Clock origin | This open? |
|---|---|---|
| `meta` `1st` `row` `12` | overlay tap | yes |
| `p2` | **first screen**, not overlay | yes |
| `up` | scroll-up start (not upload) | yes |
| `1st 12` | **previous** overlay’s `12` | **no** |
| `loadPage` | paged MediaLibrary only | dash on native2b is normal |
| `thumb Npx` | PhotoKit targetSize this layout | TF237 = 256; 2× experiment = 512 |
| `path native/native2b` | thumbs + flag | not a timing |

Product budget: `1st` ≤ 3000ms (`LIBRARY_FIRST_PHOTO_BUDGET_MS`).

`meta` ~50ms + `1st` ~70ms ⇒ session was already IDs or in-process cache — **not** a Recents scan.

## Invariants

- Recents scans / expand: `runExclusivePhotokitJob`
- ID open: **not** on `workQueue`, not behind expand
- Do not `clearPhotokitLibraryIndexPrefetch` on CaptureSession unmount
- Do not `creationDate` sort or image-predicate Recents for first paint

## Proof

`npm run test:picker-timing` then headed TF HUD. Jest cannot prove Photos-daemon cold.
