# M-PERF-04 C2 — shot-to-shot shutter latency

**Milestone:** `WS-PERF / M-PERF-04`  
**Status:** Implemented locally (2026-08-28) — headed sim proof PASS (5 shutter + C1 overlay ×3)  
**Prereq:** C1 camera persist overlay shipped  
**Primary path:** `CaptureSessionCameraScreen` only (not InAppLibraryPicker)

---

## Objective

Reduce time from shutter tap to next shutter tap on the production CaptureSession camera. TF finding: `handleShutter` awaits `takePictureAsync` **and** `pinDraftMedia` before `isCapturing` clears, so the next tap is blocked on a filesystem copy.

**Product goal:** Rapid Take on a jobsite (5 taps in a few seconds) without dropping photos or handing Select Photos a URI that evaporates.

## Current code

`src/modules/captureSession/CaptureSessionCameraScreen.tsx` `handleShutter`:

1. Guard `isCapturing` + `photos.length >= selectionLimit`
2. `takePictureAsync({ quality: 0.8, skipProcessing: false })`
3. **await `pinDraftMedia(shot.uri, fileName)`** (copy into `draft-media/`)
4. `addCameraPhoto({ uri: pinnedUri })`
5. `isCapturing = false`

`HybridLibraryPickerScreen` Accept already re-pins via `materializeSelectedCapturePhotos` (camera `file://` goes through `pinDraftMedia` again; already-in-draft-dir is a no-op copy skip).

## Proposed default (smallest)

**Defer pin off the shutter critical path. Do not change JPEG quality or `skipProcessing` in C2 unless async pin is still too slow on device.**

### Semantics (must-fix from C1 Gate A)

| Rule | Behavior |
|------|----------|
| Order | Store insert order = shutter order. Pin completion must **patch URI in place**, not re-append. |
| Limit | `photos.length` + in-flight captures count toward `selectionLimit`. Insert the row as soon as `takePictureAsync` returns. |
| Next tap | `isCapturing` covers **only** `takePictureAsync` (use a ref to avoid stale closure). Pin runs in background. |
| Preview | Session strip may show expo cache `file://` until pin finishes, then swap to `draft-media/` URI. |
| Pin failure | Remove that row (or mark failed) and Alert. Do not leave a dead strip thumb that cannot Accept. |
| Flush | Before **Done** (`goToHybridLibrary`) and before **Accept** (`materializeSelectedCapturePhotos` / `onComplete`): `await` all in-flight pins. Cancel/unmount: best-effort await or abandon with reset (module already `resetCaptureSession` on unmount). |
| Cache lifetime | Expo camera temp files can disappear. Pin must **start immediately** after capture; strip URI is opportunistic. |

### Store

Add a narrow `updatePhotoUri(id, uri)` (or equivalent) on `sessionDraftStore` — no new persistence layer.

### Capture options (documented tradeoff, not default)

| Option | Speed | Risk |
|--------|--------|------|
| Keep `quality: 0.8`, `skipProcessing: false` | Baseline | Orientation/mirror correct |
| `skipProcessing: true` | Faster encode | Possible wrong rotation on some devices — **only after** async pin if TF still rates shots slow |
| Lower quality | Smaller JPEG | Jobsite evidence quality — product GO if we go below 0.8 |

## Out of scope

- New Arch / FlashList / `CameraView` `active` pause
- First-open camera permission spinner
- Library first-paint / keep-alive grid
- Annotate (A1)
- Schema, app.json, bundle id

## Files

| File | Change |
|------|--------|
| `CaptureSessionCameraScreen.tsx` | Shutter: capture → insert → pin async; flush pins on Done |
| `sessionDraftStore.ts` | `updatePhotoUri` |
| `HybridLibraryPickerScreen.tsx` | Await pending camera pins before Accept **or** expose flush from a tiny `cameraPinQueue` helper used by both |
| Tests | Shutter does not await pin before next tap; Done waits; pin fail removes row; limit counts in-flight |

Prefer a small `cameraDraftPinQueue.ts` helper if Done and Accept both need flush without coupling screens.

## Gate A fold (2026-08-28) — must-fix before Builder

Reviewers: GPT, Gemini, Grok. Consensus **GO-WITH-MUST-FIX**.

1. **`cameraDraftPinQueue`:** `enqueue` **starts** `pinDraftMedia` immediately (do not serialize copies). Track Promises for `flush()`. Session **generation token**: late pin after `resetCaptureSession` is a no-op (no `updatePhotoUri`, no Alert).
2. **`isCapturingRef`:** Guard `takePictureAsync` synchronously. React state is shutter chrome only. Clear capturing after row insert + pin **registration**, not after pin completes.
3. **Order / limit:** `takePictureAsync` → `addCameraPhoto(cache file://)` → register pin → clear capturing. Limit = `photos.length` only (no extra in-flight counter). Do not start a take if already at limit.
4. **Peek / Done during take:** Disable library peek and Done while a take is in progress (or await capture registration before leaving). Flushing pins is not enough if `takePictureAsync` has not inserted a row yet.
5. **Accept:** `await flush()` (`allSettled`) → **re-read** store photos → `materializeSelectedCapturePhotos` → `onComplete`. Never `onComplete` with vanished cache URIs. Pin fail: `removePhoto(id)` if still present; one aggregated Alert; do not hand dead URIs.

**Split (Done flush):** Accept flush is mandatory. Done/peek: do **not** block the overlay on pin I/O (C1 camera stays mounted so pins can finish under the library). Disable Done/peek only for the native take, not for background pins.

Keep `quality: 0.8` / `skipProcessing: false` until TF still rates shots slow after this.

## Validation

- Jest: shutter + pin queue (fake timers / mocked `pinDraftMedia` delay)
- `npx tsc --noEmit`
- Headed: 5 rapid shutter taps → strip shows 5 → Done → hybrid session strip → Accept still works
- Do not claim C2 done on `test:photo-flow` alone

## Residual

C2 does not fix library first paint or annotate. Camera remains hot under C1 overlay.
