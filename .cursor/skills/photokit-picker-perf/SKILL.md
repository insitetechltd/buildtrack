---
name: photokit-picker-perf
description: >-
  Insite hybrid library picker (M-PERF-03): native2b user-library walk,
  L1 timing HUD legend, Accept PhotoKit pause. Use when editing
  PhotokitThumbs, libraryIndexPrefetch, HybridLibraryPickerScreen,
  HUD `1st`/`meta`/`1st 12`, or picker first-paint / checkmark spinner.
---

# Insite PhotoKit picker perf

Read the portable rules first: `~/.cursor/skills/native-photos-first-paint/SKILL.md`.

Journey + HUD legend (this repo):
`docs/superpowers/analysis/2026-08-30-photokit-first-paint-journey.md`

Live status: `documentation/PICKER_PROGRESS.md`

## Path (TF 292)

The default album is the user-library walk. Warm MediaLibrary paging and the path flag are removed.

How and why: `documentation/PICKER_PROGRESS.md` § How the default library opens.

1. Camera tab does **not** open a grid session. A walk from before this overlay is not the grid.
2. Overlay tap: `markLibraryPickerOpen()` then `beginLibraryPickerSession()` — HUD t=0. This open fetches `smartAlbumUserLibrary` with no sort, walks from the end, keeps images until 90 or the start of the album.
3. Gray tiles until that walk returns. Empty stays empty. No saved IDs, no MediaLibrary page.
4. Scroll near the end continues the **same** fetch. Oldest First, date filters, and named albums use the sorted `creationDate` fetch instead.
5. Checkmark: `withPhotokitReleasedForOriginals` → pause thumbs → wait exclusive gate → `getAssetInfoAsync`.

## HUD cheat (do not misread)

| Line | Clock origin | This open? |
|---|---|---|
| `meta` `1st` `row` `12` | overlay tap | yes |
| `p2` | **first screen**, not overlay | yes |
| `up` | scroll-up start (not upload) | yes |
| `1st 12` | **previous** overlay’s `12` | **no** |
| `loadPage` | paged MediaLibrary only | dash on native2b is normal |
| `thumb Npx` | PhotoKit targetSize this layout | TF237 = 256; 2× experiment = 512 |
| `path native/native2b` | thumbs; path is always native2b | not a timing |

Product budget: `1st` ≤ 3000ms (`LIBRARY_FIRST_PHOTO_BUDGET_MS`).

`meta` ~50ms + `1st` ~70ms on a **finished walk from this same open** means the daemon was warm. A walk that finished before the tap is not this open’s proof.

## Invariants

- One Photos-heavy job at a time: `runExclusivePhotokitJob`
- Default album: no persisted IDs, no `creationDate` sort, no image-predicate fetch for first paint
- First batch is 90 images (`LIBRARY_PICKER_2B_FIRST_BATCH`). A finished walk is not the next open’s grid
- Do not `clearPhotokitLibraryIndexPrefetch` on CaptureSession unmount

## Proof

`npm run test:picker-timing` then headed TF HUD. Jest cannot prove Photos-daemon cold.
