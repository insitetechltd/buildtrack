# Gate A — shared evaluation brief (identical to every model)

**Date:** 2026-08-29  
**Objective:** GO / NO-GO / CONDITIONAL for the Photos index slice plan **before Builder writes code**.

## Context

Expo SDK 54, RN, `newArchEnabled: false`. Hybrid library picker is production SoT. TF 213: native PhotoKit thumbs, first 12 ~69–240ms, `path native`. User bar: Instagram-continuous — whole-library scrollbar, no spinner, tens of thousands of photos. Prefetch-18 was **NO-GO** (page wall at 30; viewability-bind flashes skeletons).

Idle-parallel. Must not jump App Store / Stripe (`M-OPS-ENV-01` Phase D).

## Inputs (read these)

- `docs/superpowers/plans/2026-08-29-photos-index-slice.md`
- `docs/superpowers/analysis/2026-08-29-instagram-class-picker-e2e.md` (Layer C + recommended sequence)
- `modules/photokit-thumbs/ios/PhotokitThumbsModule.swift`
- `modules/photokit-thumbs/ios/PhotokitThumbView.swift`
- `src/modules/mediaLibrary/LibraryPhotoGrid.tsx`
- `src/modules/mediaLibrary/useLibraryGridAssets.ts`
- `src/modules/captureSession/HybridLibraryPickerScreen.tsx` (press + Accept)

## Proposed slice (summary)

iOS + PhotokitThumbs in binary: native `PHFetchResult`; JS gets `count`; FlatList length = count (index array, not 50k Assets); `getItemLayout`; native view `index` → `object(at:)`; `startCachingRange` never includes 0–11; press via `idAt` → `ph://`; Android/Jest stay paged.

Not this slice: UICollectionView, iCloud network, annotate, retire InAppLibraryPicker, Android MediaStore.

## Out of scope for evaluators

Do not recommend PHPicker as the picker UI, FlashList v2, New Arch, PAGE_SIZE experiments, prefetch-18, loading 50k Asset objects into JS, or jumping ENV-01.

## Output format

1. **Verdict:** GO / NO-GO / CONDITIONAL
2. **Findings table:** severity (Critical / High / Medium / Low), failure mode, why it bites at runtime
3. **Top 3 must-fix before Builder** (empty if none)
4. **Validation gaps:** what Jest cannot prove; what headed/TF must prove
5. **No code** unless a 5-line sketch is required to make a finding concrete

## Rules

Be adversarial. Assume the plan is wrong. Solo-dev / scale-aware (tens of thousands of photos, jobsites). Sections: (A) runtime risks Jest will miss; (B) is the test/headed plan enough.
