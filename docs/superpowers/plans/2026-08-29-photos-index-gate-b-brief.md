# Gate B — shared evaluation brief (identical to every model)

**Date:** 2026-08-29  
**Objective:** Assume the author is wrong. What user-visible failure modes remain unproven for the Photos index slice? Verdict GO / NO-GO / CONDITIONAL on claiming the slice ready for a native TestFlight rebuild.

## Context

Expo SDK 54, RN, `newArchEnabled: false`. Hybrid library picker is production SoT. TF 213: native PhotoKit thumbs, first 12 ~69–240ms, `path native`. Bar: Instagram-continuous — whole-library scrollbar, no footer spinner, tens of thousands of photos.

Idle-parallel. Must not jump App Store / Stripe (`M-OPS-ENV-01` Phase D).

Gate A (plan) was 3/3 CONDITIONAL; contracts were folded, then Builder implemented.

## Change summary (what shipped in this working tree)

- Native `PhotokitThumbs`: session `{token, count}`, `openLibrary` / `idAt` / `startCachingRange`. Bounds-check before every `object(at:)`. Sliding cache window. Request key `t{token}:i{index}:px`. Do not `requestImage` until `index` is explicitly set.
- JS capability gate: `openLibrary` + `idAt` + `startCachingRange` (TF 213 binaries fall back to paged).
- `useLibraryGridAssets`: if index API present, skip `getAssetsAsync` and warm page; return `indexSession`; `onEndReached` no-op.
- `LibraryPhotoGrid` index mode: compact `number[]` of length = count; `getItemLayout` row-based **without** header height; `key={token}`; first-12 bind only until user leaves first screen; then bind mounted cells (not per-cell viewability); lookahead cache never includes 0–11; no footer spinner; `removeClippedSubviews={false}`.
- Hybrid press: `idAt` id + `ph://{id}` + `library_{id}.jpg` even when `assetsByIdRef` is empty. InApp Accept already `getAssetInfoAsync` backfill.
- Same index path for Hybrid and InAppLibraryPicker.

## Acceptance criteria (from plan)

- Virtual list length = native count (not 12/30 pages)
- No footer spinner / `getAssetsAsync` in index mode
- First 12 stays TF-213-fast (isolation at 50k length)
- Selection identity = asset local id; failed `idAt` = no-op press
- Album switch remounts (token); 10k→5 must not crash
- Android/Jest/old binary: paged fallback

## Commands run

- `npm run test:photo-flow` — 22/23 suites passed on first run; index hook suite mock hoist bug then fixed. Index-focused re-run: 4 suites / 15 tests PASS (`LibraryPhotoGrid.index`, `useLibraryGridAssets.index`, `libraryPhotokitPrefetch`, `PhotokitThumbView`).
- `npx tsc --noEmit` — repo has pre-existing errors in AppNavigator / CreateTask / etc. **None** in the Photos index files touched this slice.

## Inputs (read these)

- `docs/superpowers/plans/2026-08-29-photos-index-slice.md`
- `modules/photokit-thumbs/ios/PhotokitThumbsModule.swift`
- `modules/photokit-thumbs/ios/PhotokitThumbView.swift`
- `src/modules/mediaLibrary/PhotokitThumbView.ts`
- `src/modules/mediaLibrary/useLibraryGridAssets.ts`
- `src/modules/mediaLibrary/LibraryPhotoGrid.tsx`
- `src/utils/libraryPhotokitPrefetch.ts`
- `src/modules/captureSession/HybridLibraryPickerScreen.tsx`
- `src/screens/InAppLibraryPickerScreen.tsx`
- `src/modules/mediaLibrary/__tests__/LibraryPhotoGrid.index.test.tsx`
- `src/modules/mediaLibrary/__tests__/useLibraryGridAssets.index.test.ts`

## Out of scope for evaluators

Do not recommend PHPicker as the picker UI, FlashList v2, New Arch, PAGE_SIZE experiments, prefetch-18, loading 50k Asset objects into JS, or jumping ENV-01. Do not write or edit code.

## Output format

1. **Verdict:** GO / NO-GO / CONDITIONAL (for TF rebuild — not “Instagram bar proven”)
2. **Findings table:** severity (Critical / High / Medium / Low), failure mode, why it bites at runtime, whether Jest already covers it
3. **Top 3 must-fix before TF** (empty if none)
4. **Unproven interactions** that headed/TF must still prove
5. **No code** unless a 5-line sketch is required to make a finding concrete

## Rules

Adversarial. Solo-dev / scale-aware. Jest cannot prove PhotoKit crash, scrollbar physics, or first-12 HUD on a 50k library.
