# M-PERF-03 Phase C — Select Photos port + FlashList

**Milestone:** `WS-PERF / M-PERF-03`  
**Status:** In progress (2026-08-28)  
**Prereq:** Phase B scroll continuity (thumb cache, prefetch) on hybrid path

---

## Objective

1. **Select Photos path:** Replace `expo-image-multiple-picker` in `InAppLibraryPickerScreen` with owned grid sharing M-PERF-03 perf stack.
2. **FlashList:** Migrate shared library grid from FlatList → `@shopify/flash-list` (both surfaces).

## Context

| Surface | Today | Target |
|---------|-------|--------|
| Camera hybrid | `HybridLibraryPickerScreen` + FlatList + thumb cache | Shared `LibraryPhotoGrid` + FlashList |
| Create/Update library | `InAppLibraryPickerScreen` + third-party picker | Same shared grid |

**Keep unchanged:** Photo Edit on Select Photos; nav wrappers; `ensureMediaLibraryAccess` export; permission gate tests (adapt mocks).

## Non-goals

- Remove `expo-image-multiple-picker` from package.json in this slice (orphan dep cleanup optional follow-up)
- Maestro tile testIDs (add `in-app-library__tile_${assetId}` — bonus if low cost)
- Native PhotoKit targetSize module

## Architecture

```
src/modules/mediaLibrary/
  libraryAlbumConstants.ts   # ALL_PHOTOS id, PAGE_SIZE, sort creationTime DESC
  useLibraryGridAssets.ts    # albums, pagination, warm consume, prefetch hooks
  LibraryPhotoGrid.tsx       # FlashList + LibraryGridTile + viewability prefetch
  materializeLibrarySave.ts  # pin selected on Save/Accept (shared)
```

### Sort fix (bundled)

- `sortBy: [[SortBy.creationTime, false]]` — matches Photos Recents mental model
- All photos count: omit inflated sum-of-albums; show title only or "All photos"

### Select Photos behavior

- Permission gate before grid mount (preserve blank-grid fix)
- Multi-select with order badges; `selectionLimit` enforced
- **Defer pin to Save** — store `mediaLibraryAssetId` + `ph://` until Save (match hybrid Accept)
- Restore `initiallySelectedPhotos` by asset id on mount
- Header testIDs preserved: `in-app-library__header`, `__cancel`, `__accept`, `__screen`

### FlashList

- `npx expo install @shopify/flash-list`
- `estimatedItemSize={tileSize + GAP}` with `numColumns={3}`
- Reuse `libraryPickerPerf.ts` tunables

## Files touched

| File | Change |
|------|--------|
| `package.json` | add `@shopify/flash-list` |
| `src/modules/mediaLibrary/*` | new shared module |
| `HybridLibraryPickerScreen.tsx` | consume shared grid |
| `InAppLibraryPickerScreen.tsx` | replace ImagePicker |
| `libraryWarmPrefetch.ts` | creationTime sort alignment |
| `InAppLibraryPickerScreen.permission.test.tsx` | mock grid not ImagePicker |
| Plan + ROADMAP + NOW | ledger |

## Validation

- [ ] Jest: `InAppLibraryPickerScreen.permission.test.tsx` PASS
- [ ] Jest: existing `libraryThumbnailCache` PASS
- [ ] `npx tsc --noEmit` (changed files clean)
- [ ] Manual: Create Task → Choose from Library → scroll → select → Save → Select Photos
- [ ] Manual: Camera → library hybrid still works

## Risks

| Risk | Mitigation |
|------|------------|
| FlashList + numColumns layout | Match tileSize math; test headed |
| Save pin regression | Reuse materialize pattern; keep Jest save test |
| Preselected restore | loadAssetsByIds on mount before grid |
| Native rebuild for FlashList | User runs pod install on Mac if needed |

Updated: 2026-08-28
