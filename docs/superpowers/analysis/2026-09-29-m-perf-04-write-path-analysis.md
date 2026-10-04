# M-PERF-04: Field Write-Path Performance Analysis
**Date**: 2026-09-29  
**Phase**: Phase 1 closed 2026-10-04 — B1 (all submit paths) + B2. Phase 2 (B3/B4/B5) deferred for stability. Milestone stays Pipeline, not Closed. No phone retest and no PROD prove in this slice.

## Status (2026-10-04)

- **B1 done** on every submit path that uploads chosen photos: Create Task (`normalizeAttachmentsForSubmission`, already in TF 293), Update Progress (`uploadPhotoObjects`), Task Detail reply/progress dock (`uploadReplyPhotos`), and Photo Selection (`handleUploadPhotos`). Each photo's compress + upload runs under `Promise.all`. Result order follows input order.
- Fail-closed paths still abort the submit when any chosen photo is missing or fails (Create rolls back via `deleteTaskById`; Update and the detail dock alert and keep the draft). Photo Selection stays best-effort: a partial success still continues, with successful URLs in input order.
- **B2 done.** `uploadFile` returns after the Storage upload and the `task_files` insert. Signed URL minting runs in the background and a mint failure does not fail the upload. `public_url` on new uploads is the storage object path. Display resolves it through `getFileUrl` / `attachmentPreviewUri` (lists already did; the file-upload preview tile subscribes to the signed-URL cache).
- **B3, B4, B5 stay deferred.** No JPEG quality/resize change, no base64→binary upload body change, no optimistic create / navigate-away-before-upload.

## Executive Summary

Added lightweight DEV-gated performance instrumentation to the write path and identified **5 ranked bottlenecks** causing intolerable latency in Create Task, Update Progress, and evidence photo uploads in field dogfood.

**Highest-impact fix**: Parallelize photo uploads (currently serial) — Expected ~60–80% latency reduction for multi-photo submissions.

## Write Path Map

### Create Task Flow
```
User fills form → Validate → Create task record → Upload photos (serial loop) → Update task with attachments → UI unblock
```

Detailed stages:
1. **Form validation** (~10–50ms)
2. **Ensure location** (if present, ~100–300ms Supabase write)
3. **Create task record** (~200–500ms Supabase INSERT)
4. **Photo normalization loop** (PER PHOTO, serial):
   - `ensureCappedLocalPhoto` → compression (~500–2000ms per photo)
   - `uploadFileWithVerification` → upload (~1000–5000ms per photo)
5. **Update task attachments** (~200–400ms Supabase UPDATE)
6. **Signed URL generation** (blocks completion, ~100–300ms per file)

### Update Progress Flow
Similar pattern with status update instead of INSERT.

### Photo Upload Flow (via `uploadFile`)
```
Read file as base64 → Get file info → Upload to Storage → Generate signed URL → Insert task_files metadata
```

Stages:
1. **Read as base64**: ~200–800ms (depends on file size post-compression)
2. **Get file info**: ~10–50ms
3. **Storage upload** (decode + POST): ~1000–5000ms (network-bound)
4. **Signed URL generation**: ~100–300ms (blocking)
5. **task_files insert**: ~100–200ms (non-critical dual-path)

## Bottleneck Analysis (Ranked)

### B1: Serial Photo Upload Loop ⚠️ **P0 — Highest Impact**
**Location**: `src/ui/viewAdapters/useCreateTaskViewAdapter.ts:1030–1052`

**Problem**:
```typescript
for (const photo of localPhotos) {
  const uri = await ensureCappedLocalPhoto(photo);
  const result = await uploadFileWithVerification({...});
  uploadedAttachments.push(result.file.public_url);
}
```

Each photo waits for the previous one to complete **compression + upload + signed URL**. With 3 photos:
- Serial: `(compress_1 + upload_1) + (compress_2 + upload_2) + (compress_3 + upload_3)` = ~9–21 seconds
- Parallel: `max(compress_1 + upload_1, compress_2 + upload_2, compress_3 + upload_3)` = ~3–7 seconds

**Fix Impact**: **60–80% latency reduction** for multi-photo submissions.

**Safe to parallelize**: Each photo upload is independent; no shared state. Storage paths are unique per timestamp + file.

---

### B2: Blocking Signed URL Generation After Upload ⚠️ **P1 — High Impact**
**Location**: `src/api/fileUploadService.ts:420–424`

**Problem**:
```typescript
const signedUrl = await createSignedFileUrl(storagePath, SIGNED_URL_EXPIRY_SECONDS);
if (!signedUrl) {
  throw new Error('Failed to create signed URL');
}
```

Signed URL is blocking the upload completion, but it's **not needed immediately**:
- User doesn't see the image in the form until they navigate away (already submitted)
- Signed URLs can be generated lazily when displaying the task

**Fix Impact**: **~200–600ms saved per photo** (blocking → background).

**Proposed fix**: Generate signed URL **asynchronously after** returning the attachment, or defer to display-time via `getFileUrl`.

---

### B3: Compression Adaptive Quality Loop 🔶 **P2 — Medium Impact**
**Location**: `src/api/imageCompressionService.ts:130–157`

**Problem**:
Iterative quality reduction with full re-compression each attempt:
```typescript
while (compressedSize > targetSizeBytes && quality > MIN_QUALITY && attempts < maxAttempts) {
  await FileSystem.deleteAsync(compressed.uri, { idempotent: true });
  compressed = await ImageManipulator.manipulateAsync(...); // Full re-compress
  compressedSize = await getFileSize(compressed.uri);
}
```

With large photos, this can take **2–3 iterations × 500–1000ms per iteration = 1–3 seconds**.

**Fix Impact**: **~500–1500ms saved per oversized photo** (reduced iterations).

**Proposed fix**: Smarter initial quality estimation based on `originalSize / targetSize` ratio to reduce iterations.

**Note**: Already has MAX_IMAGE_WIDTH resize (1920px) which helps significantly. This is diminishing returns after resize.

---

### B4: Base64 Encoding/Decoding Overhead 🔶 **P3 — Lower Priority**
**Location**: `src/api/fileUploadService.ts:386–408`

**Problem**:
```typescript
const base64 = await FileSystem.readAsStringAsync(file.uri, { encoding: Base64 });
// ...
await supabase.storage.upload(storagePath, decode(base64), {...});
```

Photos are read as base64, then decoded back to binary for upload. This adds:
- **~200–500ms** for large files (read + decode overhead)
- **Temporary memory pressure** (base64 string in memory)

**Fix Impact**: **~200–500ms saved per photo**.

**Proposed fix**: Use `FileSystem.uploadAsync` or read as `'utf8'` / binary directly if Supabase client supports it. (Requires checking Supabase Storage upload API capabilities.)

**Risk**: Breaking change if binary upload not supported. Needs testing.

---

### B5: Task Create + Photo Upload + Update Pattern 🔵 **P4 — Architectural**
**Location**: `src/ui/viewAdapters/useCreateTaskViewAdapter.ts:1214–1238`

**Problem**:
```typescript
createdEntityId = await createTask({...attachments: existingAttachmentUrls});
// Photos upload here (normalizeAttachmentsForSubmission)
if (uploadedAttachments.length > 0) {
  await updateTask(createdEntityId, {attachments: [...]});
}
```

Creates task, uploads photos, then **updates task again** with photo URLs. This is:
- **Extra DB round-trip** (~200–400ms)
- **Prevents optimistic UI** (can't show "Creating…" then immediately navigate away)

**Fix Impact**: **~200–400ms saved** + enables optimistic create.

**Proposed fix**: Optimistic task creation — create task with status `'pending'`, show immediately, upload photos in background, update when complete.

**Risk**: Higher complexity; needs failure rollback (already has `deleteTaskById` on photo failure). Defer to Phase 2.

---

## Phase 1 Implementation Plan

### Immediate Fixes (Phase 1)
1. ✅ **Add instrumentation** (completed)
2. ✅ **B1: Parallelize photo uploads** on Create, Update Progress, Task Detail reply/dock, and Photo Selection (2026-10-04)
3. ✅ **B2: Make signed URL generation non-blocking** (2026-10-04). New `public_url` is the storage path; display signs lazily.

### Test Evidence
- Jest: concurrent uploads, input order, fail-closed single-photo failure, signed URL not required for `uploadFile` success. Create parallel behavior still covered.
- Phone retest and PROD prove were not part of this slice.

### Deferred to Phase 2 (stability — do not ship with the current binary)
- **B3**: Smarter compression quality (needs real device profiling)
- **B4**: Binary upload (needs Supabase API research + compatibility check)
- **B5**: Optimistic create (needs broader UX + error handling design)

## Instrumentation Usage

Run in `__DEV__` mode. Console logs show:
```
⏱️ [PERF] Starting: create-task-submit-1727654321000
  ⏱️ [PERF] create-task-submit-1727654321000 → validation-complete: 15ms
  ⏱️ [PERF] create-task-submit-1727654321000 → metadata-prepared: 5ms
  ⏱️ [PERF] create-task-submit-1727654321000 → start-create-task: 8ms
  ⏱️ [PERF] create-task-submit-1727654321000 → complete-create-task: 342ms
  ⏱️ [PERF] create-task-submit-1727654321000 → start-photo-normalization: 2ms
    [per-photo compression & upload logs here]
  ⏱️ [PERF] create-task-submit-1727654321000 → complete-photo-normalization: 8543ms
  ⏱️ [PERF] create-task-submit-1727654321000 → start-update-attachments: 3ms
  ⏱️ [PERF] create-task-submit-1727654321000 → complete-update-attachments: 287ms
✅ [PERF] Complete: create-task-submit-1727654321000 (9182ms)
```

Export measurements: `perf.exportJson()`

## Notes

- All fixes preserve fail-closed behavior (photos not uploaded → task creation fails)
- No PROD impact (instrumentation gated behind `__DEV__`)
- No migrations, no DDL
- Compatible with existing dual-path task_files insert
