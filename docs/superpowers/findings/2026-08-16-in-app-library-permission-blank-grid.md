# Release blocker — In-app library blank after photo permission

**Status:** Fix landed in product (`InAppLibraryPickerScreen` permission gate). Maestro cancel/reopen remount removed.  
**Milestone:** `WS-UX / S-UX-01Q` upload UX  
**Date:** 2026-08-16  
**Severity:** Release blocker for any build that ships Create Task → Choose from Library

## Symptom

1. First open of in-app Library shows the iOS Photos permission sheet (expected on first grant).
2. After tapping **Allow Full Access**, the Library header appears but the grid stays **blank**.
3. Leaving the picker and opening Library again shows photos.

Maestro temporarily papered over (2)–(3) by cancel + re-enter after permission. That is **not** acceptable for release.

## Root cause

`expo-image-multiple-picker` with `noAlbums={true}` mounts `ImagePickerCarousel` immediately and runs `getAssetsAsync` in `componentDidMount` **without waiting** for `MediaLibrary` permission. Permission is requested in a sibling `useEffect`. After the user grants access, the carousel does **not** re-fetch — empty `data` sticks until remount.

Evidence: `node_modules/expo-image-multiple-picker/lib/index.js` (`noAlbums` branch + `ImagePickerCarousel.componentDidMount` / `fillStartImages`).

## Product fix

`src/screens/InAppLibraryPickerScreen.tsx`:

- `ensureMediaLibraryAccess()` — `getPermissionsAsync` then `requestPermissionsAsync` if needed.
- Mount `ImagePicker` **only** after `granted`.
- Loading testID `in-app-library__loading` while checking / restoring preselection.
- Denied UI: `in-app-library__permission_denied` + Open Settings / Cancel.

## Validation

- Jest script: `npm run test:photo-flow` (permission gate, cancel dismiss, pin/`mediaLibraryAssetId` save, Select Photos edit/draw, attachment dedupe)
- Jest file: `src/screens/__tests__/InAppLibraryPickerScreen.permission.test.tsx`
- Maestro: `_open-library.yaml` no longer remounts; grant sheet still handled when `clearState` resets permission.
- Manual / Maestro smoke: first grant → photos visible on **same** open (no exit/re-enter).

## Residual

- Maestro `clearState` still forces a permission prompt every flow (expected for automation).
- Limited Photos access (iOS) still needs device smoke; Option B gallery remains deferred.
