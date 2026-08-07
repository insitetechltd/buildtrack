# S-UX-01H Scope & Execution Plan
## Batch-first capture review — WS-UX/M-UX-01 redesign slice (Phase 1 of 4)

**Prepared by:** SOLO Planner specialist  
**Status:** Draft for Builder + Reviewer alignment  
**Hard constraints:** No code changes from Planner; no uncertain designs presented as fact; incremental over rewrite; existing Expo + React Navigation + Zustand + Supabase + AsyncStorage model respected.

---

## (1) Scope Definition

### 1.1 IN-SCOPE (from redesign execution doc, validated against repo)

| Slice item | Repo grounding | Notes |
|---|---|---|
| **(a) Multi-photo review: caption + reorder** | `PhotoSelectionScreen.tsx` grid (lines 188–212) currently shows 3-col thumbnails with no per-photo caption field or reorder controls; `usePhotoSelectionViewAdapter.ts` stores `selectedPhotos[]` as flat array; `SelectedPhoto` util type has no caption. | Arrow controls (↑/↓) acceptable — no drag-drop required. Captions are per-photo strings that pass through upload via `fileUploadService.FileUploadOptions.description` or stay in-memory for CreateTask draft attachments. |
| **(b) Enable "Add to Existing Task" routing choice + project-scoped task mini-picker inside PhotoSelection before save** | `CreateTaskScreen.tsx` lines 663–733 shows the postCaptureRoutingChoice shell with "Add to Existing Task" visually present but disabled by guard copy at line 730; submit at line 466 and line 1046 are blocked when `captureRoutingChoice === "existing_task"`; `PhotoSelectionScreen.tsx` + `AppNavigator.tsx` PhotoSelection wrapper has no task picker. | Mini-picker is scoped to the active `selectedProjectId` (from `useProjectFilterStore`); uses existing `useTaskStore.getTasksByProject()` plus `TaskPreview` already derived in taskStore. No new navigation stack screen — mini-picker is an inline sheet inside PhotoSelection before the save/upload action. |
| **(c) Save-first / organize-later: Save to project (unattached) intent parallel to task attach; entityType=project path** | `fileUploadService.ts` line 12 already declares `entityType: 'task' \| 'task-update' \| 'project' \| 'user'` (the `project` case exists but is unused); storage path on line 94 is `{companyId}/{entityType}s/{entityId}/{uniqueName}` — for entityType=project this resolves to `{companyId}/projects/{projectId}/{name}` which is well-formed. `uploadFailureStore.ts` line 14 also accepts entityType=project. | Adds a third routing-intent choice (or a save intent toggle inside PhotoSelection when `returnScreen` is not set) alongside existing task-attach flow. Unattached project upload does NOT touch `tasks` table — it only creates `FileAttachment` records with entity_type=project in storage bucket. |
| **(d) Capture-related activity logging: unattached project-photo batch → Dashboard Recent Activity row** | `useDashboardViewAdapter.ts` lines 403–453 currently builds `activityItems[]` ONLY from `activeProjectTasks.flatMap(task.updates)`. No other source feeds `activityItems`. `DashboardActivityItem` contract at `ui/contracts/viewAdapters.ts:52` requires `{id, taskId, title, subtitle, timestampLabel, statusLabel, previewPhotoUri?}`; id is the only key, taskId is required. | Need a parallel ephemeral (Zustand + AsyncStorage) batch record store: `unattachedPhotoBatches[]` (batchId, projectId, userId, count, firstPhotoUri, createdAt, optional captions preview). Dashboard adapter prepends these as synthetic `DashboardActivityItem` rows mapping `taskId` to `project:${projectId}` (semantic — NOT a real task FK). Pressing the row is a no-op for now (no organize-later UI in this slice) — the dashboard `onNavigateToTaskDetail` will just early-return if the id prefix is `project:`. This avoids widening the `DashboardActivityItem` contract in a breaking way. |

### 1.2 OUT-OF-SCOPE (explicit slice boundary)

- NO `testID` additions anywhere — S-UX-01I owns testID injection after wrappers stabilize.
- NO migration / legacy compat code — S-UX-01I.
- NO task detail / acceptance UI changes.
- NO new React Native / Expo dependencies — package.json + app.json inspected, all in-scope items use existing primitives (`Ionicons` for arrows, `TextInput` for captions, existing Pressable, existing Zustand stores, existing fileUploadService, existing ActivityStyleRowCard).
- NO batch-first organize-later UI beyond save-first — future slice.
- NO drag-drop reorder (explicitly allowed to skip; arrows OK).
- NO database schema migrations (`file_attachments` table write path was intentionally a stub in uploadFile; we extend the in-memory `FileAttachment` only; real write to a Supabase DB table for project attachments is deferred if it requires schema changes — for 01H we rely on storage bucket records returned and an in-app batch-log store).

---

## (2) Execution Plan (step order, exact file changes)

> **Dependency order rationale:** Contract/types widening → data/logic layer → view adapter → screen UI → navigation gluing → dashboard activity plumbing → tests.

### Step 1 — Widen data contracts + types (safe, additive only)

| File | Change | Lines (approx) |
|---|---|---|
| `src/utils/usePhotoSelection.ts:6-11` | Add optional `caption?: string` field to `SelectedPhoto` interface. | 6–11 |
| `src/navigation/navigationTypes.ts:9-14` | Add optional `caption?: string` to duplicate `SelectedPhoto` type there (same struct, kept for nav param typing). | 9–14 |
| `src/ui/contracts/viewAdapters.ts:505-513` | Add optional `caption?: string` to `SelectablePhotoModel`; keep rest unchanged. | 505–513 |
| `src/ui/contracts/viewAdapters.ts:52-60` | No struct change — keep `DashboardActivityItem` as-is; document that `taskId` is overloaded as `project:{id}` for unattached batch rows via runtime convention only. *(We don't widen to avoid breaking 50+ consumers.)* | 52–60 *(no edit — just convention)* |
| `src/ui/contracts/viewAdapters.ts:515-523` | Add new optional fields to `PhotoSelectionScreenViewAdapterOutput`: `showTaskMiniPicker: boolean`, `selectedTaskId: string \| null`, `availableTasksForPicker: TaskPreview[]`, `saveIntent: 'task_attach' \| 'project_unattached'`, `photoCaptionsByIndex: Record<number, string>`. (All optional so existing render paths are non-breaking.) | 515–523 |

### Step 2 — Create new unattached-photo-batch store (ephemeral + persisted)

| File | Change |
|---|---|
| **NEW:** `src/state/unattachedPhotoBatchStore.ts` | Zustand store with `persist` via AsyncStorage. Shape: `{batches: UnattachedPhotoBatch[], addBatch(batch: Omit<...>): string, dismissBatch(batchId): void, getBatchesForProject(projectId): UnattachedPhotoBatch[]}`. `UnattachedPhotoBatch = {batchId, projectId, userId, photoCount, firstPhotoUri: string, createdAt: ISO string, captionsPreview: string[]}`. Persist key = `buildtrack-unattached-photo-batches`. This is the single source of truth for slice (d) Dashboard rows. |

### Step 3 — Refactor PhotoSelection view adapter: caption state, reorder handlers, save intent, task picker

| File | Change | Lines (approx) |
|---|---|---|
| `src/ui/viewAdapters/usePhotoSelectionViewAdapter.ts:19-37` Props interface | Add: `projectId?: string`, `activeTaskPreviews?: TaskPreview[]`, `initialCaptions?: Record<number, string>`, `initialSaveIntent?: 'task_attach' \| 'project_unattached'`, `initialSelectedTaskId?: string \| null`, `onBatchSavedProjectUnattached?: (batch: {photoUrls: string[], batchId: string}) => void`, `onTaskPickedAndAttached?: (taskId: string, photoUrls: string[]) => void`. | 19–37 |
| `src/ui/viewAdapters/usePhotoSelectionViewAdapter.ts:39-60` Hook signature | Destructure new props; add state: `photoCaptions: Record<number, string>`, `saveIntent`, `selectedTaskId`. Default saveIntent based on presence of taskId (taskId → task_attach, else project_unattached when projectId exists). | 39–60 |
| `src/ui/viewAdapters/usePhotoSelectionViewAdapter.ts` Add new handlers | Add: `handleMovePhotoUp(index)`, `handleMovePhotoDown(index)`, `handleSetCaption(index, caption)`, `handleSetSaveIntent(intent)`, `handleSelectTaskForAttach(taskId)`. Reorder swaps array indices; caption keyed by index. | *After line 252 (handleRemovePhoto)* — insert new handlers |
| `src/ui/viewAdapters/usePhotoSelectionViewAdapter.ts:254-376` handleUploadPhotos refactor | Split into three code paths under `uploadImmediately=true`: (1) existing task-attach (current line 281 guard → stays), (2) newly-enabled existing_task picker path → picks selectedTaskId as entityId, calls `onTaskPickedAndAttached` if provided, (3) project_unattached path → uses entityType='project' + entityId=projectId, then writes a batch record to `useUnattachedPhotoBatchStore.addBatch()` and calls `onBatchSavedProjectUnattached`. Guard: for (2) and (3), validate required params separately (projectId/companyId/userId; or selectedTaskId/companyId/userId). The old single guard `!taskId || !companyId || !userId` at line 281 is now path-specific. | 254–376 |
| `src/ui/viewAdapters/usePhotoSelectionViewAdapter.ts:378-416` output mapping | Map new adapter state fields to expanded `PhotoSelectionScreenViewAdapterOutput`; caption goes into each `SelectablePhotoModel.caption`; expose saveIntent, selectedTaskId, availableTasksForPicker. | 378–416 |

### Step 4 — PhotoSelection screen UI: caption inputs, reorder arrows, mini-picker sheet, save-intent segmented control

| File | Change | Lines (approx) |
|---|---|---|
| `src/screens/PhotoSelectionScreen.tsx:22-35` Props interface | Mirror view adapter new props; add `activeProjectId?: string`, `onBatchSavedProjectUnattached?`, `onTaskPickedAndAttached?`. | 22–35 |
| `src/screens/PhotoSelectionScreen.tsx:41-56` Hook call destructure | Destructure new handlers from adapter return: `handleMovePhotoUp`, `handleMovePhotoDown`, `handleSetCaption`, `handleSetSaveIntent`, `handleSelectTaskForAttach`. | 41–56 |
| `src/screens/PhotoSelectionScreen.tsx:188-212` Photo grid rendering | Extend each tile: (a) below thumbnail render a `<TextInput>` row for caption (bounded height) if photos.length ≥ 1; (b) render ↑/↓ arrow Pressables only when photos.length > 1 (disable first/last bounds). | 188–212 |
| `src/screens/PhotoSelectionScreen.tsx:216-263` Bottom action bar | Add a 2-or-3 choice segmented Pressable row above the existing action buttons (or inline depending on save intent applicability) for saveIntent: **"Attach to Task"** vs **"Save to Project"**. When Attach to Task is chosen AND no taskId was passed in via params, the "Attach to Task" segmented button toggles `showTaskMiniPicker=true`. Also wire the existing Upload/Done button to call `handleUploadPhotos` (path already split in step 3). | 216–263 |
| `src/screens/PhotoSelectionScreen.tsx` *(new insertion after action bar)* | Add task mini-picker inline Modal/sheet (inline View, not new navigation screen) using `FlatList` over `output.availableTasksForPicker`. Each row renders title + status + leadingAttachment preview. Selected row highlighted. Confirm attaches and triggers `handleSelectTaskForAttach` → flow to upload path (2) above. | *After line 263 (above closing SafeAreaView)* |

### Step 5 — AppNavigator + CreateTask routing glue: wire "Add to Existing Task" + PhotoSelection unattached save flows

| File | Change | Lines (approx) |
|---|---|---|
| `src/navigation/navigationTypes.ts:53-75` PhotoSelectionParams | Add: `projectId?: string`, `initialSaveIntent?: 'task_attach' \| 'project_unattached'`, `initialSelectedTaskId?: string`, `onBatchSavedIntent?: 'return_to_camera'` (tag only; actual callback via wrapper), `availableTaskPreviewsQuery?: 'active_project'` (to signal the wrapper should hydrate tasks). | 53–75 |
| `src/navigation/AppNavigator.tsx:1065-1262` `PhotoSelectionScreenWrapper` function | (a) Pull `projectId` from route params OR fall back to `useProjectFilterStore.selectedProjectId`. (b) Pull companyId/userId from `useAuthStore.user?.companyId / user?.id` — these are missing today which is why the adapter line 281 guard blocks unattached; wrapper now supplies them if route params are blank. (c) If route.params.entityType !== 'task-update' or projectId exists AND no taskId → pre-populate saveIntent = project_unattached. (d) Hydrate tasks via `useTaskStore.getTasksByProject(projectId)` → derive `TaskPreview[]` from `taskStore.taskPreviewById` filtered by project → pass as `activeTaskPreviews`. (e) Add two new callback branches in wrapper: if `onBatchSavedProjectUnattached` fires → nav back to Camera stack's CreateTaskMain reset, or if no returnScreen → back to Camera root. If `onTaskPickedAndAttached(taskId, urls)` fires → go to `TasksList` in Tasks tab or `TaskDetail` depending on existing navigation conventions (existing `UpdateProgress` routing used as template lines 1104–1152). | 1065–1262 |
| `src/screens/CreateTaskScreen.tsx:663-733` postCaptureRoutingChoice shell | Replace guard copy at line 730 with real conditional copy: if `existing_task` chosen → describe "You'll pick a task in the next step". Remove `disabled=true` submit guard blocks at line 466 and line 1046 for `existing_task` path — instead, when `existing_task` + submit is pressed AND we have photos, navigate the user to `PhotoSelection` within the same CreateTaskStack (already registered at line 1483) with params `{returnScreen: 'CreateTask', actionType: 'photos', uploadImmediately: true, availableTaskPreviewsQuery: 'active_project', entityType: 'task-update'}` (the PhotoSelection screen then shows task mini-picker). This navigation call lives alongside existing attachment handling in CreateTask (CreateTask already calls PhotoSelection via CreateTaskAttachmentSection; we reuse that navigation but with new PhotoSelectionParams signaling "existing task mode"). | 663–733 (copy change), 466 and 1046 (guard removal), area around handleAddPhotos (call site for nav) |

### Step 6 — Dashboard activity logging for unattached batches (plumb through view adapter + screen onPress safe)

| File | Change | Lines (approx) |
|---|---|---|
| `src/ui/viewAdapters/useDashboardViewAdapter.ts:218-240` hook header | Consume `useUnattachedPhotoBatchStore` (getBatchesForProject filter by `selectedProjectId`). Filter batches within `RECENT_ACTIVITY_WINDOW_MS = 5 days` (matches existing line 206). | 218–240 |
| `src/ui/viewAdapters/useDashboardViewAdapter.ts:403-453` activityItems construction | After mapping task updates, concat prepend-batches before sort. For each batch create synthetic DashboardActivityItem: `id = "unattached-batch:${batchId}"`, `taskId = "project:${batch.projectId}"` (overload by convention — no real task FK), `title = "${batch.photoCount} photo${s} captured"`, `subtitle = batch.captionsPreview[0] ? batch.captionsPreview[0].slice(0,60) : "Unattached to any task — organize later"`, `timestampLabel = formatLocale(batch.createdAt)`, `statusLabel = "Saved to project"`, `previewPhotoUri = batch.firstPhotoUri`. Attach `sortTimestamp = batch.createdAt` via the same `& {sortTimestamp}` cast used today. Result is merged into final activityItems then stripped of sortTimestamp before return. | 403–453, specifically after line 440 inside the flatMap+filter chain or before the `.map` strip step |
| `src/screens/DashboardScreen.tsx:143-156` activityItems render onPress | Change `onPress={() => props.onNavigateToTaskDetail?.(item.taskId)}` to guard: if `item.taskId.startsWith('project:')` → no-op (no organize-later UI in 01H); else preserve existing behavior. This avoids bad navigation. | 143–156 inline onPress |

### Step 7 — Validation + test scaffolding (see §4 below)

| File | Change |
|---|---|
| `src/state/__tests__/unattachedPhotoBatchStore.test.ts` (NEW) | Unit: addBatch / dismissBatch / getBatchesForProject / persist round-trip. |
| `src/ui/viewAdapters/__tests__/usePhotoSelectionViewAdapter.test.ts` (existing — find path and edit) | Extend: caption set & pass-through to upload options, reorder Up/Down (index swap), saveIntent=project_unattached path calls entityType=project, selectedTaskId flow with upload. Locate existing file via `src/ui/viewAdapters/__tests__/` dir and add cases. |
| `src/ui/viewAdapters/__tests__/useDashboardViewAdapter.test.ts` lines ~400+ area (existing) | Add cases: batches are prepended into activityItems with correct mapping, `taskId` prefix `project:` present. |

---

## (3) Likely Files List (exact paths, lines if known)

> **Legend:** ★NEW = create new file; EDIT = modify existing; PASS = read-only.

| # | Exact path | Role | Lines known | Impact |
|---|---|---|---|---|
| 1 | `src/utils/usePhotoSelection.ts` | `SelectedPhoto` type + `caption?` field | 6–11 | EDIT |
| 2 | `src/navigation/navigationTypes.ts` | `SelectedPhoto` type + `PhotoSelectionParams` + save-intent / mini-picker params | 9–14, 53–75 | EDIT |
| 3 | `src/ui/contracts/viewAdapters.ts` | `SelectablePhotoModel` + `PhotoSelectionScreenViewAdapterOutput` widening | 505–523 | EDIT |
| 4 | ★NEW `src/state/unattachedPhotoBatchStore.ts` | Ephemeral + persisted batch log (AsyncStorage via zustand persist) | — | NEW |
| 5 | `src/ui/viewAdapters/usePhotoSelectionViewAdapter.ts` | Caption state, reorder handlers (up/down), saveIntent split (3 upload paths), task picker state, projectId/companyId/userId relaxed validation | 19–37, 39–60, new section after 252, 254–376, 378–416 | EDIT |
| 6 | `src/screens/PhotoSelectionScreen.tsx` | Caption TextInput per tile, reorder arrows UI, save-intent segmented control, task mini-picker inline sheet | 22–35, 41–56, 188–212, 216–263, +insert after 263 | EDIT |
| 7 | `src/navigation/AppNavigator.tsx` | `PhotoSelectionScreenWrapper` hydrate projectId / companyId / userId / task previews; new callback branches; `postCaptureDefault=save_project` support if needed | 1065–1262 | EDIT |
| 8 | `src/screens/CreateTaskScreen.tsx` | postCaptureRoutingChoice "Add to Existing Task" guard removal + wire nav to PhotoSelection in picker mode; submit guard unlock for existing_task | 221–227 (state), 465–468, 663–733, 1040–1053 | EDIT |
| 9 | `src/ui/viewAdapters/useDashboardViewAdapter.ts` | Concat unattached batch rows into activityItems map; synthetic taskId=project: prefix | 206, 218–240, 403–453 | EDIT |
| 10 | `src/screens/DashboardScreen.tsx` | Guard activity item onPress to no-op for `project:` taskId prefix | 143–156 | EDIT |
| 11 | `src/state/uploadFailureStore.ts` | PASS — already supports entityType=project at line 14 | 14 | (no change) |
| 12 | `src/api/fileUploadService.ts` | PASS — entityType='project' already accepted line 12, storage path line 94 produces `projects/{projectId}/...`; no-op for this slice | 12, 94 | (no change) |
| 13 | `package.json` | PASS — no new deps needed; Expo SDK 54 / RN stable; all UI uses existing primitives. | lines 70–170 inspected | (no change) |
| 14 | `app.json` | PASS — no config/plugin/bundle changes; all existing permissions (camera, photo lib) already cover batch capture. | lines 34–57 inspected | (no change) |
| 15 | ★NEW `src/state/__tests__/unattachedPhotoBatchStore.test.ts` | New Jest unit tests for batch store | — | NEW |
| 16 | `src/ui/viewAdapters/__tests__/usePhotoSelectionViewAdapter.test.ts` (create if missing, check path) | Extend adapter unit tests for caption / reorder / project-unattached upload / task-pick attach | — | EDIT |
| 17 | `src/ui/viewAdapters/__tests__/useDashboardViewAdapter.test.ts` | Extend: prepend-batch-rows integration | ~400+ | EDIT |

---

## (4) Validation Plan (L1/L2 Jest scripts; L3 Maestro)

### 4.1 L1 / L2 Jest scripts (exact names from package.json)

**Pre-flight compile sanity:**
- `npm run test` → full Jest run — must be green on main branch before 01H begins (no regressions). Run this before merging 01H.

**Targeted script run order for 01H (after all code edits):**

| # | package.json script name | What it covers + NEW tests to add inside the suites |
|---|---|---|
| L1-A | `npm run test:uploads` → `jest src/api/__tests__/fileUploadService` | Sanity that entityType='project' path already works (no code change there, but verify). Run unchanged to confirm no regression caused by any widened PhotoSelection caller paths. |
| L1-B | `jest src/state/__tests__/unattachedPhotoBatchStore.test.ts` (NEW test file) | 4 tests minimum: (i) `addBatch` produces an id + pushes item; (ii) `getBatchesForProject` filters correctly; (iii) `dismissBatch` removes; (iv) partial persist key write/read round-trip via mocked AsyncStorage. |
| L2-C | `jest src/ui/viewAdapters/__tests__/usePhotoSelectionViewAdapter.test.ts` | **Add 6 new test cases** into this suite (do not create a separate file unless the file doesn't exist — check `src/ui/viewAdapters/__tests__/`): (1) `handleSetCaption` updates per-photo caption and maps into output; (2) `handleMovePhotoUp(1)` swaps indices 0↔1 on a 3-photo array; (3) `handleMovePhotoDown(0)` is no-op on first; (4) saveIntent='project_unattached' → `handleUploadPhotos` calls uploadFileWithVerification with `entityType='project'` + `entityId=projectId` AND calls `addBatch` on the new store; (5) saveIntent='task_attach' with selectedTaskId → uploads entity='task-update' entityId=selectedTaskId AND calls `onTaskPickedAndAttached(taskId, urls)`; (6) captions pass through into `FileUploadOptions.description` per-file (or into batch.captionsPreview for project_unattached path — whichever the step-3 implementation writes; test one). |
| L2-D | `jest src/ui/viewAdapters/__tests__/useDashboardViewAdapter.test.ts` | **Add 2 new test cases** into existing suite: (1) with 1 unattached batch in store + selectedProjectId set → `output.activityItems[0]` has id `unattached-batch:...` + title includes photo count + `taskId` starts with `project:`; (2) batches older than 5 days are excluded from activityItems. |
| L2-E | `npm run test:components` → `jest src/components/__tests__` | Sanity: existing `ActivityStyleRowCard` still renders for synthetic rows (no component changes needed). |
| L2-F | `npm run test:integration` → `jest src/__tests__/integration` | Catch-all for navigation/store side effects. Run GREEN before merge. |
| FINAL | `npm run test:regression` → runs test:tasks + test:uploads + test:components + test:integration | **Gating script** — all GREEN required before slice 01H is done. |

### 4.2 L3 Maestro probe (no new flows; behavioral probe described; not writing new yaml file)

**Maestro manual probe script / existing flows check:**
- Existing flow base → reuse `maestro/flows/task-core-live-photo-upload.yaml` where applicable; the L3 probe for 01H is described below. Builder/QA executes it.

**L3 Probe steps (named: `01H-batch-unattached-recent-activity.probe`):**
1. Launch app, login to Sprint7 preset A (has 1 shared project). Navigate to Camera tab.
2. Capture **2 photos** via Camera tab → "Take Photo" route; add both to selection.
3. Inside PhotoSelection screen (appears after capture):
   a. Confirm 2 tiles render side-by-side in grid.
   b. Tap caption field on first photo, enter "crack on north wall".
   c. Tap second photo caption, enter "crack detail close-up".
   d. Use ↓ arrow on first tile — assert order flips (detail becomes index 0, north-wall index 1). Use ↑ arrow on last tile to flip back.
   e. Change segmented save-intent control from "Attach to Task" (default if context carries task) to **"Save to Project"**. (If no segmented control visible because nav params defaulted, then no picker intent is shown; in that case, ensure the Upload button performs project-unattached upload — use assert from next step.)
   f. Tap Upload / Save.
4. After save completes, navigate to Activity (Dashboard) tab.
5. **ASSERT:** Topmost "Recent Activity" `ActivityStyleRowCard` appears with title "2 photos captured" (or plural equivalent), subtitle includes "crack on north wall", status label "Saved to project".
6. Tap that row → **ASSERT:** no navigation crash / no TaskDetail open (since it's a `project:` prefixed id, onPress is no-op; it should be inert).
7. Bonus existing-task sanity (if builder wires it fully within 01H): go back to Camera, capture 1 photo → at CreateTask postCaptureRoutingChoice pick **"Add to Existing Task"** → submit button should no longer be disabled → it navigates to PhotoSelection with task picker → select a task → assert upload happens → navigate to Tasks → open that task → activity timeline should show the photo.

**Post-slice L3 Maestro note:** The user explicitly said no new Maestro flows. This probe is a behavioral assertion list for manual / QA-assisted verification. We do NOT create new yaml files for 01H.

---

## (5) Assumptions List (repo-aligned defaults; chose to avoid questions)

> Each assumption below is selected to match existing repo patterns. If product disagrees, Builder adjusts *before* code starts.

| # | Assumption | Rationale / grounding |
|---|---|---|
| A1 | **Caption shape:** Per-photo `caption?: string`, max 200 chars, no rich text, stored in-memory only during selection; on upload passes into `FileUploadOptions.description` (for task-attach paths) OR into `UnattachedPhotoBatch.captionsPreview[]` (project-unattached path, first 80 chars only). | Matches `fileUploadService.ts:16` existing `description?: string` field which is unused today — zero new API surface. |
| A2 | **Reorder UI:** Arrow Pressables (Ionicons `arrow-up` / `arrow-down`) placed in each tile's top-left/top-right area. First tile: Up disabled. Last tile: Down disabled. No drag-drop (explicitly allowed to skip). No long-press required. | Minimal UI footprint; no new gesture system; no new RN libs needed (Ionicons already dep). |
| A3 | **projectId resolution when PhotoSelection params lack it:** Fall back to `useProjectFilterStore.selectedProjectId` (already source of truth for Dashboard queue and Tasks queue). If still null → "Save to Project" intent is disabled with copy: "Select a project first". | Matches Dashboard line 220. |
| A4 | **companyId / userId resolution:** Pulled in `PhotoSelectionScreenWrapper` from `useAuthStore.getState().user?.companyId / ?.id` if route.params don't carry them. Today these are required params on view adapter line 281 guard; widening to wrapper-supplied avoids breaking every existing PhotoSelection call site. | Matches pattern used in `useCreateTaskViewAdapter.ts:139`, `useUpdateProgressViewAdapter.ts:145,174,209`. |
| A5 | **Entity type for "Attach to Existing Task" path:** Uses `entityType='task-update'` (same as today's UpdateProgress flow) NOT `entityType='task'`. The attach goes to the `task_updates`/activities stream, not the task-level attachments array. Reason: consistency with existing photo flow in `useUpdateProgressViewAdapter`. If product wants task-level `attachments[]` array update, Builder does it as a second step. | Matches line 1127–1152 UpdateProgress routing legacy. |
| A6 | **Dashboard synthetic rows for unattached batches:** Overload `DashboardActivityItem.taskId` with prefix `"project:{projectId}"` instead of widening the type contract. Reason: 50+ consumers (DashboardScreen, ActivityStyleRowCard tests) expect taskId to be a string; changing to optional + adding projectId would cascade and break the 01I-wrapper stabilization. | Task-detail press guard on `startsWith('project:')` is the only place this prefix leaks; see DashboardScreen.tsx step 6. |
| A7 | **Unattached-batch store lifetime:** Ephemeral + AsyncStorage persisted only. No write to Supabase `task_activities` table; no `projects` table schema change; no real FKs. This keeps 01H zero-schema per "NO migration" OOS rule. Batch store acts as app-local audit trail for Recent Activity only. | Fits save-first organize-later; future organize-later slice can reconcile these batches into tasks and then call `dismissBatch`. |
| A8 | **"Add to Existing Task" routing from CreateTaskScreen shell:** On submit (existing_task mode) it navigates to PhotoSelection (same stack) with `uploadImmediately=true` + mini-picker enabled, rather than building a separate picker modal in CreateTask. Why: task picker + caption + reorder all live together in PhotoSelection, so no need to duplicate task-picker UI in two places. | Minimizes duplicate UI; reuses the step 3/4 caption/reorder/upload code paths directly. |
| A9 | **Task mini-picker population:** Uses `TaskPreview[]` (already derived in taskStore line 234–273) scoped by `selectedProjectId` → filtered top-level + child tasks. No search input (for 01H); flat list 20 most recently created. Search is future slice. | Keeps 01H incremental; the redesign doc says "mini-picker inside PhotoSelection before save" without specifying search. |
| A10 | **No testIDs added anywhere:** Strictly per slice OOS rule for S-UX-01I. | Explicit instruction from user request. |
| A11 | **No new RN/Expo deps:** Captions use `<TextInput>`, arrows use `<Ionicons>`, segmented control is 2–3 `<Pressable>` cards, picker is `<FlatList>` — all already deps. app.json Expo SDK 54 and plugins unchanged. | Verified against package.json + app.json. |
| A12 | **PhotoSelectionParams `returnScreen` default behavior when absent:** When `returnScreen === undefined` and upload is project-unattached, after save → navigate to Camera tab's root (CreateTaskMain cleared) → user sees Camera again ready for next capture. This matches the "batch-first capture then continue capturing" mental model. | Matches typical camera-app UX; no design specified so default to capture loop. |
| A13 | **Drag-drop deferred:** Arrow-only reorder per approved redesign doc ("no drag-drop required; arrow controls OK"). | Explicit user text. |
| A14 | **ActivityStyleRowCard for unattached batch row:** Reuses existing component unchanged (`components/cards/ActivityStyleRowCard.tsx`). Its imageUri, title, subtitle, metaLabel, badgeLabel props exactly match the shape of the synthetic batch rows. | Verified DashboardScreen render lines 144–155. |
| A15 | **RECENT_ACTIVITY_WINDOW_MS = 5 days** (existing line 206) applies equally to unattached batches. No new window constant. Batch rows beyond 5 days are excluded from activityItems automatically. They remain in the batch store indefinitely (no eviction in 01H) but disappear from Dashboard after the window. | Aligns with existing stale-window logic. |
| A16 | **The "Add to Existing Task" CreateTask submit guard line 466 / 1046:** Replaced with a nav call (assumption A8) so submit no longer returns undefined; it navigates. If validation catches photos==0 empty state → show Alert "Select or capture photos first" before nav. | Current guard copy line 730 says the flow isn't part of the slice; we enable it for 01H. No product disambiguation needed because guard text itself tells us the intent is to route photos. |
