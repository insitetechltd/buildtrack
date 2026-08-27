# Capture Session module — production wiring

**Status (2026-08-27):** **Closed — production.**  
**Close report:** [`../reports/2026-08-27-capture-session-close.md`](../reports/2026-08-27-capture-session-close.md)

Hybrid `CaptureSessionModule` is the SoT for Camera tab **and** Create/Update **Add Photos**.

**AB key:** `captureSession.hybrid.v1` (historical flag name; cutover complete)

**Decision locked:** hybrid step 5 — session drafts stay in `pinDraftMedia`; never auto-write to device Photos.

## Production flows

### Camera tab (capture-first)

1. Tap center Camera → `CaptureSession` opens immediately (no Take/Library alert).
2. Multi-shutter and/or library → Accept ✓.
3. **Select Photos** (annotate / edit).
4. Checkmark → Create new task vs Update existing.

### Create Task / Update Progress — Add Photos

1. Tap Add Photos → same `CaptureSession` (`entry: "addPhotos"`).
2. Accept → **Select Photos** with `returnScreen` CreateTask or UpdateProgress (`captureFirstFlow: false`).
3. Checkmark returns photos to the form / update composer.

Dev Settings → **Open Capture Session (A/B smoke)** remains for isolated smoke (alert instead of Select Photos).

## What shipped

| Piece | Path |
|-------|------|
| Public root | `CaptureSessionModule` |
| Camera | `CaptureSessionCameraScreen.tsx` |
| Hybrid picker | `HybridLibraryPickerScreen.tsx` |
| Production host | `CaptureSessionFlowScreen` + stacks: Camera / Activity / Tasks |
| Add Photos helper | `navigateToAddPhotosCaptureSession` in `captureFirstCameraFlow.ts` |
| Dev host | `CaptureSessionSmokeScreen` |
| Session state | `sessionDraftStore.ts` |

## Explicit non-goals (still)

- No Maestro flows yet
- No Select Photos collapse
- Daily-report destination = `M-DAILY-01` Phase 0 (parked)
