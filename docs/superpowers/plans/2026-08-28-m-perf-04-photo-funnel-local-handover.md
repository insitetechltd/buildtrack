# Photo funnel handover — local dev (M-PERF-03 → M-PERF-04)

**Created:** 2026-08-28  
**Audience:** Local Cursor chat continuing photo funnel performance work  
**Status:** M-PERF-03 shipped on master. **M-PERF-04 C1+C2 implemented** (`47e2e05` + local photo WIP). Handover below is the original kickoff; C1 overlay is in `CaptureSessionModule.tsx`.

---

## Mission

Continue **photo funnel performance** work locally. M-PERF-03 library work is shipped on branch `cursor/m-perf-03-library-picker-roadmap-514d` ([PR #6](https://github.com/insitetechltd/buildtrack/pull/6)). **Next priority: camera UX (C1 → C2 → L1)**, not more library path splitting.

**Product goal:** Lowest resistance on **Take → Pick → Annotate**. This is the app’s data funnel.

---

## Branch & milestone

| Item | Value |
|---|---|
| Branch | `cursor/m-perf-03-library-picker-roadmap-514d` |
| PR | https://github.com/insitetechltd/buildtrack/pull/6 |
| Milestone | `WS-PERF / M-PERF-03` — **open** (needs TF sign-off after C1/C2) |
| Next slice | **M-PERF-04** — C1 camera persist, C2 shutter latency |
| TF backend | **DEV** Supabase only (`M-OPS-ENV-01`) |
| Hard nos | New Arch flip, schema changes, casual `app.json`/bundle-id bumps |

### Recent commits (newest first)

```
49e176f perf(library): permission singleton, first-fetch-12, deferred albums, wake warm
cbd1939 perf(library): use system ph:// thumbs for grid browse
1feb143 fix(perf): address Gate A Critical blockers for M-PERF-03 Phase C
379348d feat(perf): M-PERF-03 Phase C Select Photos port and FlashList grid
d015ee3 perf(library): continuous scroll — viewport prefetch and priority decode
f90bdea feat(perf): M-PERF-03 Phase B library thumb cache and warm prefetch
```

---

## Architecture decisions

### Production photo path (optimize this)

```
Create/Update Add Photos  OR  Camera tab
  → CaptureSessionModule
      → CaptureSessionCameraScreen
      → HybridLibraryPickerScreen  (LibraryPhotoGrid)
  → Select Photos (annotate)
  → Create Task / Update
```

### Secondary path (defer / eventually retire)

```
Select Photos → Add Photos → "Choose from Library" → InAppLibraryPickerScreen
```

Long-term backlog **L7**: retire `InAppLibraryPicker`; CaptureSession library-only mode for “add more”.

### Shared library stack

```
useLibraryAlbumPicker → useLibraryGridAssets → LibraryPhotoGrid
```

| Behavior | Implementation |
|---|---|
| Grid thumbs | System `ph://` via RN `Image` (no ImageManipulator on browse) |
| Full-res | Accept only → `materializeLibrarySelections` / `resolveLibraryLocalUri` |
| First page | 12 photos (`LIBRARY_INITIAL_PAGE_SIZE`) |
| Scroll pages | 36 (`LIBRARY_PAGE_SIZE`) |
| Albums | Deferred until album picker modal opens |
| Permission | `src/utils/mediaLibraryPermission.ts` |
| Wake warm | `useMediaLibraryWakeWarm` in `App.tsx` |

### FlashList

- **Removed** — FlashList v2 requires New Arch; `app.json` has `newArchEnabled: false`
- Grid uses **FlatList**. Do not re-add without explicit Danger Gate approval.

### Why camera shows a spinner (TF finding)

`CaptureSessionModule` **unmounts** the camera when switching to hybrid library:

```tsx
{step === "camera" ? <CaptureSessionCameraScreen /> : <HybridLibraryPickerScreen />}
```

On every remount:

- `useCameraPermissions()` is `undefined` briefly → white `ActivityIndicator` (`CaptureSessionCameraScreen.tsx` L142–147)
- `CameraView` native re-init
- `warmLibraryFirstPage()` runs again on mount

**This is not Photos library permission** on the camera UI. Library permission uses `mediaLibraryPermission` in the grid hook.

### Slow between shutter shots (TF finding)

`handleShutter` in `CaptureSessionCameraScreen.tsx`:

- `takePictureAsync` (quality 0.8, `skipProcessing: false`)
- Sync **`pinDraftMedia`** before `isCapturing` clears → blocks next tap

---

## TF device test feedback (2026-08-28)

**Path tested:** Open camera → spinner → camera → slow between shots → hybrid library → back → spinner → camera

| Observation | Root cause |
|---|---|
| Spinner before camera | Camera permission hook loading + `CameraView` mount |
| Spinner after leaving library | Camera **remount** on step change (C1) |
| Slow between shutter taps | Capture + sync pin (C2) |
| Library: one photo then rest OK | First-fetch / warm / `ph://` paint race; OK after first batch |
| CaptureSession vs InAppLibraryPicker | No meaningful diff — expected (shared grid) |

User agreed: **fix camera first**, then measure library (L1) before bigger picker work.

---

## Backlog (prioritized)

### Do first (agreed)

| ID | Task | Target |
|---|---|---|
| **C1** | Keep camera mounted camera ↔ hybrid (no remount spinner) | **done** (`47e2e05`) |
| **C2** | Faster shot-to-shot (async/defer `pinDraftMedia`, tune capture) | **done** (`47e2e05`) |
| **L1** | Library timing: overlay open → metadata → first row (3) → first screen (12). Console `[library-picker-l1]` + on-device HUD (`LIBRARY_PICKER_TIMING_HUD`) | **done** (this TF) |
| **L2** | Instant skeleton grid; stagger URI bind (3 / 32ms); do not block chrome on permission/preselection restore | **done** (this TF) |

### After L1/L2 TF

| ID | Task |
|---|---|
| **L3** | Native PhotoKit thumbnails — `modules/photokit-thumbs` + `LibraryPhotoGrid` native view. **In progress (2026-08-29).** Needs native rebuild (`npx expo run:ios` or TF). Android stays RN `Image` + `ph://`. |
| L4 | iCloud blank tile `onError` fallback |
| L6 | Tune warm / first page if metrics need it |
| A1 | Select Photos annotation perf (rotate/crop/draw Done) |
| L7 | Retire InAppLibraryPicker → CaptureSession library-only |
| L8 | Remove `expo-image-multiple-picker` |
| L9 | Maestro library smoke |
| P1 | Gate B validation critique |
| P2 | Close M-PERF-03 in ROADMAP/NOW |

### Parked

| ID | Task |
|---|---|
| P3 | FlashList + New Arch — only with explicit human GO |

---

## Next ticket — C1

### M-PERF-04: Persist camera across hybrid library step — **done**

**Shipped approach:** Do **not** swap `{step === "camera" ? Camera : Library}`. Keep `CaptureSessionCameraScreen` mounted in a camera layer. When `step === "hybridLibrary"`, cover it with an opaque `#ffffff` overlay (`zIndex`/`elevation` 10, `pointerEvents="none"` + a11y hide on the camera layer). Android hardware back → `goToCamera()`. Hybrid library still unmounts when returning to camera (cheap); CameraView does not.

**Acceptance (code + overlay Jest ×3):**

- [x] Camera ↔ hybrid switch: no full-screen remount spinner from unmounting CameraView
- [x] `CameraView` stays alive under overlay
- [x] Back from library → live preview immediately (same mount)
- [x] No regression: shutter, library peek, Done → hybrid, Accept → Select Photos

**Then:** C2 (shutter latency) — also implemented locally. Next product proof is TF 207 row-paging / headed camera↔library ×3.

---

## Key files

| Path | Role |
|---|---|
| `src/modules/captureSession/CaptureSessionModule.tsx` | Step switch — **C1 target** |
| `src/modules/captureSession/CaptureSessionCameraScreen.tsx` | Camera, shutter — **C2 target** |
| `src/modules/captureSession/HybridLibraryPickerScreen.tsx` | Hybrid library + session strip |
| `src/modules/mediaLibrary/LibraryPhotoGrid.tsx` | Shared grid |
| `src/modules/mediaLibrary/useLibraryGridAssets.ts` | Pagination, permission, albums |
| `src/utils/mediaLibraryPermission.ts` | Permission singleton |
| `src/utils/libraryWarmPrefetch.ts` | Warm metadata (12) |
| `src/utils/useMediaLibraryWakeWarm.ts` | App launch/foreground warm |
| `src/screens/InAppLibraryPickerScreen.tsx` | Secondary library path |
| `src/screens/PhotoSelectionScreen.tsx` | Annotate (A1 later) |
| `App.tsx` | Wake warm hook |

Related plans: `docs/superpowers/plans/2026-08-28-m-perf-03-*.md`, `documentation/ROADMAP.md` (M-PERF-03)

---

## Agent workflow

1. Read `documentation/NOW.md`, `AGENTS.md` § Current Delivery Status, `documentation/ROADMAP.md`
2. Ensure latest `master` includes M-PERF-03 (merge PR #6 if needed)
3. Plan **C1** → implement → review → tests
4. **Autonomous** for C1/C2/L1 — ask only for capture quality vs speed tradeoffs or New Arch
5. TF build when user asks: `./build-and-submit-FIXED.sh ios production` (`BUILD_SCRIPTS_USAGE.md`)
6. Update `documentation/NOW.md` at teardown

---

## TF retest checklist (after C1/C2)

1. Cold start → camera → library → back — spinner gone?
2. Five rapid shutter taps — acceptable gap?
3. Hybrid first paint — still OK?
4. Select Photos annotate — note lag (future A1)

Report worst step: **A** spinner · **B** slow shots · **C** library first paint · **D** scroll · **E** annotate

---

## Session continuity

At teardown, update `documentation/NOW.md`:

- M-PERF-03: shipped, pending formal close after TF
- Active: M-PERF-04 C1 (+ C2/L1 as follow-ups)
- TF feedback: camera remount spinner + slow shutter (documented above)
