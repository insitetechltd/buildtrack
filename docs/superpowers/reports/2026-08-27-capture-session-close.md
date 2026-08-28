# Capture Session module — close

**Closed:** 2026-08-27  
**Slice:** Hybrid camera + library (`captureSession.hybrid.v1`) production cutover  
**Guide:** `docs/superpowers/plans/2026-08-27-capture-session-module-ab.md`  
**Feasibility:** `docs/superpowers/analysis/2026-08-27-camera-photo-module-feasibility.md`

---

## Delivered

- **Camera tab:** opens `CaptureSession` immediately (no Take/Library alert) → Select Photos → Create / Update destination.
- **Create Task / Update Progress Add Photos:** same module via `navigateToAddPhotosCaptureSession` (`entry: "addPhotos"`).
- Stacks: Camera, Activity, Tasks host `CaptureSession`.
- Update Progress shows **task title** under banner.
- `SET_PARAMS` draft clear uses `CommonActions.setParams` + `route.key` (no orphan navigator warning).

## Validation

- Manual headed smoke (owner): **Create new task PASS**, **Update existing task PASS** (2026-08-27).
- Jest: `captureFirstCameraFlow` Add Photos helper; UpdateProgress header (task title); CreateTask attachment CTA → CaptureSession.

## Out of scope (remain parked)

- Maestro flows for capture session
- Select Photos collapse
- Daily-report destination (`M-DAILY-01` Phase 0)
- Dev Settings smoke host may remain for isolated checks

## Follow-up (2026-08-28) — library picker lag

JS-only: pin library `ph://` on **Accept** (not first tap); grid uses RN `Image` with explicit tile size (`expo-image` 2.2 still requests `PHImageManagerMaximumSize` for `ph://`). Camera `file://` thumbs stay on `expo-image`. Headed smoke on iPhone 17 Pro: grid tiles populated, tap → `1 selected` badge, Accept → Select Photos (1). Evidence: `.dbg/picker-lag-smoke/evidence/picker-lag-0{2,3,5}-*.png`.

**Residual:** iCloud-only assets / limited-library not headed; FlashList and expo-image target-size parked (SDK lock). **2026-08-28:** further library perf/UX tracked as **M-PERF-03** (discussion, no design lock) — `docs/superpowers/analysis/2026-08-28-device-photo-library-picker-perf-discussion.md`.

## Residual

- Seat CA→worker already live on DEV. Project `on_hold` drop migration dormant (reserved slot — do not apply).
