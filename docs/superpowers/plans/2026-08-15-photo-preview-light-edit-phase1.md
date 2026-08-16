# Photo Preview Light Edit — Phase 1 Plan

> **Status (2026-08-15):** **Phase 1 + Phase 2 Draw closed.**  
> Phase 1 rotate/crop/reset + Select Photos grid UX landed. Phase 2 pen draw (Skia offscreen bake → `annotatedUri`) shipped. **S-UX-01Q2:** IMGLY package + dead `PhotoAnnotation` path removed (2026-08-15). Phase 3 caption remains deferred.

> **For agentic workers:** Implement task-by-task. Checkboxes track progress. Do **not** start Phase 2 draw until the spike checklist passes. Caption is **Phase 3 optional** — do not ship in Phase 1.

**Milestone:** `WS-UX / M-UX-01 / S-UX-01Q` (upload / selection UX hygiene; idle-parallel OK vs 04b)

**Goal:** Replace IMGLY annotate on the library selection preview with a **light in-preview toolbar** for **rotate and crop** — baked via `expo-image-manipulator` — without leaving preview or changing Supabase upload.

**Architecture:** Path **E → A**
- **Phase 1:** rotate + crop (+ reset)
- **Phase 2:** pen (Skia bake) after viability spike
- **Phase 3 (optional):** per-photo caption — only if product still wants it after UX review vs task-update description

Keep `expo-image-picker` multi-select; keep `fileUploadService` + `imageCompressionService`.

**Tech stack:** Expo SDK 54, RN, TypeScript, `expo-image-manipulator`, existing gesture-handler / reanimated, Jest.

**Out of scope (Phase 1):** Pen/draw, per-photo caption UI, upscale/downscale presets, PencilKit, Mantis, Skia, IMGLY uninstall repo-wide, storage/upload rewrite, `allowsEditing: true`.

---

## Decisions (locked)

| Decision | Choice |
|----------|--------|
| Edit surface | Existing `photo-selection__preview` on `PhotoSelectionScreen` |
| Bake engine | `expo-image-manipulator` → `pinDraftMedia` → `annotatedUri` |
| Phase 1 tools | **Rotate** (90° CW), **Crop** (rect overlay), **Reset** |
| “Resize” | **Means crop only** — no separate scale UI. Background compression stays as today. |
| Caption | **Not Phase 1.** Move to **Phase 3 optional**. Rationale: per-photo caption + task-update description is easy to confuse. Prefer a single narrative field on the form (update/create description) for now. |
| Caption UI in Phase 1 | Hide/remove preview caption field and grid per-tile captions from the selection UX (leave adapter `handleSetCaption` / data fields intact if unused — no upload-contract break required). |
| IMGLY | Remove from this selection/preview path only. Keep package until annotation routes cleaned later. |
| Confirm UX | Preview check → selection grid; header check → finish batch |

---

## File structure

**Likely new**
- `src/components/photoEdit/PreviewEditToolbar.tsx` — rotate / crop / reset
- `src/components/photoEdit/CropOverlay.tsx` — crop rect over contained image
- `src/utils/photoPreviewEdit.ts` — contain layout → source-pixel crop rect
- Tests under `src/components/photoEdit/__tests__/` and/or adapter tests

**Modify**
- `src/screens/PhotoSelectionScreen.tsx` — toolbar; remove Annotate; hide caption inputs; crop mode; gesture isolation
- `src/ui/viewAdapters/usePhotoSelectionViewAdapter.ts` — `handleRotate` / `handleApplyCrop` / `handleResetEdits`; drop IMGLY from this path
- `src/utils/usePhotoSelection.ts` — keep `uri` as original for Reset if needed
- `src/__tests__/integration/PhotoSelectionScreen.batch-review.test.tsx`
- Maestro only if `photo-selection__annotate` / caption selectors removal breaks flows

**Do not modify (Phase 1)**
- `fileUploadService` contract, Supabase storage, `app.json` / Skia deps
- Form-level task/update **description** fields (those remain the narrative SoT)

---

## UX acceptance (Phase 1)

1. Library multi-select → open preview.
2. Preview: thumbs, toolbar (**Rotate**, **Crop**, **Reset**), blue check back to selection — **no caption field**.
3. Rotate updates that photo’s `annotatedUri`.
4. Crop: adjust rect → Apply bakes crop; Cancel leaves prior image.
5. Reset restores from original `uri`.
6. No IMGLY; no picker `allowsEditing`; header confirm does not re-open library.
7. Users add narrative on the Create / Update / Comment / Reject form description (existing), not per photo.

---

## Task checklist

### Task 1: Adapter without IMGLY (TDD)

- [x] Tests: rotate → `annotatedUri`; apply crop; reset to original.
- [x] Implement manipulator handlers + `pinDraftMedia`.
- [x] Remove IMGLY / `handleAnnotatePhoto` from this adapter.
- [x] `uri` immutable; edits only on `annotatedUri`.

### Task 2: Crop geometry helpers

- [x] Map on-screen crop rect + `contain` layout → `{ originX, originY, width, height }` in source pixels.
- [x] Clamp / reject empty rects.

### Task 3: Preview toolbar + crop overlay

- [x] testIDs: `photo-selection__tool_rotate`, `photo-selection__tool_crop`, `photo-selection__tool_reset`.
- [x] Crop mode: disable conflicting ScrollView pan; Apply/Cancel.
- [x] Remove `photo-selection__annotate` UI.
- [x] Hide/remove preview + grid caption inputs from this screen.

### Task 4: Integration + typecheck

- [x] Update batch-review integration tests (no Annotate; no caption assertions required for Phase 1).
- [x] `npx tsc --noEmit` rc=0.

### Task 5: Reviewer gate

- [x] Gesture conflicts, crop mapping, Reset, no upload drift (self-review; residual: device crop QA).
- [x] Commit only if user requests.

---

## Validation

| Layer | Proof |
|-------|--------|
| L1 | Adapter + crop helper + batch-review tests |
| Type | `npx tsc --noEmit` |
| QA | Library → preview rotate/crop → header confirm → form; narrative via form description; no IMGLY; no re-pick |

---

## Phase 2 spike (draw only — not Phase 1)

- [x] Skia (or chosen bake) boots on Expo 54 iOS + Android. — `@shopify/react-native-skia@2.2.12`; native rebuild unblocked via `ios.buildReactNativeFromSource=true` (keeps `useFrameworks: static` for IMGLY). `RNSkiaModule.mm` compiled; Build Succeeded 2026-08-15.
- [x] Strokes on large JPEG; undo; export at **source** resolution (not screen shot). — `bakeStrokesOntoPhoto` offscreen surface + SVG live overlay.
- [x] Export → existing compression → upload/draft pin. — bake → `writeClipboardImageToDraft` / `pinDraftMedia` → `annotatedUri`.
- [x] No gesture deadlocks with thumbs. — thumbs hidden while drawMode; pan on overlay only.
- [x] Spike fail → contingency; do **not** return IMGLY to this path. — N/A (spike passed; view-shot contingency not needed). Human smoke: Draw works; setState-in-render redbox fixed.

**Phase 2 scope:** 1 pen, few colors, undo; no stickers/filters/text-on-image.

---

## Phase 3 (optional) — per-photo caption

**Only if** product confirms captions add value without clashing with task/update description.

- [ ] UX copy/placement review (when caption vs when description).
- [ ] Re-enable preview caption field (and optionally grid).
- [ ] Confirm upload still maps caption → `description` on file attachment without double-prompting users.
- [ ] Jest + light QA.

**Default if unsure:** leave captions off; keep form description as the single text field.

---

## Reject list

- Per-photo caption UI in Phase 1 / Phase 2
- Separate upscale/downscale resize UI
- `allowsEditing: true`
- IMGLY / second editor after confirm
- Native PHPicker+PencilKit+S3 rewrite
- SVG+view-shot as Phase 2 default without spike
- Repo-wide IMGLY uninstall in Phase 1

---

## Assumptions

1. Phase 1 tools = rotate + crop (+ reset).
2. Form-level description is the narrative SoT until Phase 3 is explicitly approved.
3. Existing `imageCompressionService` may still downscale on upload; that is not a preview tool.
4. `PhotoAnnotation` route may stay unused until a cleanup chore.
5. Adapter may keep unused `caption` fields for API compatibility; UI must not surface them in Phase 1.

---

## Builder kickoff (after GO)

1. Adapter TDD (drop IMGLY from selection path)  
2. Crop helpers  
3. Toolbar UI + hide captions  
4. Tests + tsc  
5. Reviewer → commit if requested → QA  
