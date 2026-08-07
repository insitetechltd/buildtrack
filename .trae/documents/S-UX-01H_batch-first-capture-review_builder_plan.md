# S-UX-01H Builder Implementation Plan — Batch-first Capture Review

**Status:** Draft for approval  
**Phase:** Phase 1 Builder — TDD Implementation  
**Hard constraints confirmed:** No testIDs, no new RN/Expo packages, no schema migrations, no task detail changes, additive-only types, preserve uploadImmediately=true flow.

---

## 0. Grounding & Pre-flight Checks (Confirmed)

| Check | Result |
|---|---|
| `SelectedPhoto` at `src/utils/usePhotoSelection.ts:6-11` — missing `caption?` | ✅ Confirmed |
| Duplicate `SelectedPhoto` at `src/navigation/navigationTypes.ts:9-14` — missing `caption?` | ✅ Confirmed |
| `SelectablePhotoModel` at `src/ui/contracts/viewAdapters.ts:507-513` — missing `caption?` | ✅ Confirmed |
| `PhotoSelectionScreenViewAdapterOutput` at `viewAdapters.ts:515-523` — missing saveIntent / task picker / captions fields | ✅ Confirmed |
| `PhotoSelectionViewAdapterProps` + `usePhotoSelectionViewAdapter` (417 lines) — single guard at line 281, no caption/reorder state | ✅ Confirmed |
| `PhotoSelectionScreen.tsx` (269 lines) — grid 188-212, action bar 216-263 — no caption TextInput, no reorder arrows, no save-intent segmented, no task picker sheet | ✅ Confirmed |
| `PhotoSelectionScreenWrapper` at `AppNavigator.tsx:1065-1262` — no projectId fallback, no task previews hydrate, no onBatchSaved/onTaskPicked branches | ✅ Confirmed |
| `CreateTaskScreen.tsx` guards at lines 466-468 and 1044-1047, placeholder text line 730 | ✅ Confirmed |
| `useDashboardViewAdapter.ts` activityItems lines 403-454 — only task update source, no batch concat | ✅ Confirmed |
| `DashboardScreen.tsx:153` onPress no `project:` prefix guard | ✅ Confirmed |
| Zustand store pattern: `uploadFailureStore.ts` uses `create + persist + createJSONStorage(AsyncStorage)` — adopted | ✅ Confirmed |
| Test pattern: `useDashboardViewAdapter.test.ts` uses `renderHook`, mocked stores, `useFakeTimers`/`setSystemTime` — adopted | ✅ Confirmed |
| `TaskPreview` exported from `taskStore.supabase.ts:19-35` with `{id, projectId, parentTaskId?, rootTaskId?, title, status, leadingAttachmentUri?, createdAt, updatedAt}` — re-used | ✅ Confirmed |
| No existing `usePhotoSelectionViewAdapter.test.ts` — will create (per Planner #16) | ✅ Confirmed |

---

## 1. Feature-by-Feature Execution with TDD Cycles (8 features, 17 file targets)

### Commit Group A: Types & Ephemeral Store (2 features, 5 files)

---

#### FEATURE 1 — Widened contracts (additive-only, no breakage)

**Files edited (3):**
1. `src/utils/usePhotoSelection.ts` — line 6-11, insert `caption?: string` into `SelectedPhoto`
2. `src/navigation/navigationTypes.ts` — line 9-14 insert `caption?: string` into `SelectedPhoto`; line 53-75 widen `PhotoSelectionParams` to add:
   - `projectId?: string`
   - `initialSaveIntent?: 'task_attach' | 'project_unattached'`
   - `initialSelectedTaskId?: string`
   - `onBatchSavedIntent?: 'return_to_camera'` (tag only)
   - `availableTaskPreviewsQuery?: 'active_project'`
3. `src/ui/contracts/viewAdapters.ts`:
   - Line 507-513 `SelectablePhotoModel` + `caption?: string`
   - Line 515-523 `PhotoSelectionScreenViewAdapterOutput` + optional:
     ```
     showTaskMiniPicker: boolean;
     selectedTaskId: string | null;
     availableTasksForPicker: TaskPreview[];
     saveIntent: 'task_attach' | 'project_unattached';
     photoCaptionsByIndex: Record<number, string>;
     ```
   - Add `TaskPreview` re-import from `@/state/taskStore.supabase` at top

**TDD requirement for Feature 1:** N/A (types-only widening; verified via `tsc --noEmit`). Behavior-change tests written for downstream consumers only.

**Risk control:**
- Do NOT rename or re-order any existing field. All new fields optional with `?`.
- Do NOT touch `DashboardActivityItem` structure.
- `tsc --noEmit` must pass immediately after this step (no downstream code required yet).

---

#### FEATURE 2 — New unattached-photo-batch store (NEW + tests)

**Files (2 new):**
4. `NEW src/state/unattachedPhotoBatchStore.ts`
5. `NEW src/state/__tests__/unattachedPhotoBatchStore.test.ts`

##### TDD Cycle 2a: Write failing test first

First test file created with 4 tests, all will FAIL before store implemented:

| # | Test | Expected fail reason (pre-implementation) |
|---|---|---|
| T2.1 | `addBatch produces id + returns batchId, pushes into state.batches` | Store module doesn't exist, import fails OR method undefined |
| T2.2 | `getBatchesForProject(projectId) filters only matching projectId` | Method undefined OR wrong return |
| T2.3 | `dismissBatch(batchId) removes only that batch` | Method undefined |
| T2.4 | persist round-trip via mocked AsyncStorage | After rehydrate, batches array matches what was persisted (mock `@react-native-async-storage/async-storage`) |

TDD step: `npx jest src/state/__tests__/unattachedPhotoBatchStore.test.ts --runInBand` → confirm RED (4 fails due to missing store).

##### Then write minimal store (YAGNI):

Shape:
```ts
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface UnattachedPhotoBatch {
  batchId: string;
  projectId: string;
  userId: string;
  photoCount: number;
  firstPhotoUri: string;
  createdAt: string; // ISO
  captionsPreview: string[]; // <= 80 chars each
}

interface UnattachedPhotoBatchState {
  batches: UnattachedPhotoBatch[];
  addBatch: (batch: Omit<UnattachedPhotoBatch, 'batchId' | 'createdAt'>) => string;
  dismissBatch: (batchId: string) => void;
  getBatchesForProject: (projectId: string) => UnattachedPhotoBatch[];
  _clearAll: () => void; // test helper
}

export const useUnattachedPhotoBatchStore = create<UnattachedPhotoBatchState>()(
  persist(
    (set, get) => ({
      batches: [],
      addBatch: (batch) => {
        const batchId = `ub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const created = new Date().toISOString();
        set(s => ({ batches: [...s.batches, { ...batch, batchId, createdAt: created }] }));
        return batchId;
      },
      dismissBatch: (id) => set(s => ({ batches: s.batches.filter(b => b.batchId !== id) })),
      getBatchesForProject: (pId) => get().batches.filter(b => b.projectId === pId),
      _clearAll: () => set({ batches: [] }),
    }),
    {
      name: "buildtrack-unattached-photo-batches",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

Store matches pattern of `uploadFailureStore.ts` for consistency. Re-run tests → all 4 GREEN.

---

### Commit Group B: Adapter + Screen (2 features, 2 files)

---

#### FEATURE 3 — usePhotoSelectionViewAdapter handlers & 3-path upload split

**File edited (1):**
6. `src/ui/viewAdapters/usePhotoSelectionViewAdapter.ts`

##### TDD Cycles 3.x: Write 6 new test cases into NEW test file `usePhotoSelectionViewAdapter.test.ts`

Since no existing test file, create:
`src/ui/viewAdapters/__tests__/usePhotoSelectionViewAdapter.test.ts`

Mock setup mirrors `useDashboardViewAdapter.test.ts` pattern + mocks for:
- `expo-image-picker`
- `@imgly/editor-react-native` (no-op)
- `expo-file-system/legacy`
- `../../api/fileUploadService` → `uploadFileWithVerification`
- `@/state/unattachedPhotoBatchStore` → mock store

Write ONE test → confirm RED → implement minimal → confirm GREEN. Repeat 6 times:

| Cycle | Test name (6 total) | Expected RED reason (pre-code) |
|---|---|---|
| 3.1 | `handleSetCaption(1, 'wall crack') → output.photoCaptionsByIndex[1] === 'wall crack' AND photos[1].caption in output` | handler undefined OR caption not mapped |
| 3.2 | `handleMovePhotoUp(1) swaps indices 0↔1 on 3-photo array (photos.length > 1)` | handler undefined OR order unchanged |
| 3.3 | `handleMovePhotoDown(0) is no-op on first item; handleMovePhotoDown(last-1) is no-op on last` | handler undefined OR moves when should not |
| 3.4 | `saveIntent='project_unattached' + projectId='p1' → handleUploadPhotos() calls uploadFileWithVerification with entityType='project', entityId='p1' AND calls useUnattachedPhotoBatchStore.addBatch() with correct shape AND calls onBatchSavedProjectUnattached({photoUrls, batchId})` | saveIntent undefined OR single guard at old line 281 blocks (taskId missing) |
| 3.5 | `saveIntent='task_attach' + selectedTaskId='t99' + no taskId prop → handleUploadPhotos calls uploadFile entityType='task-update' entityId='t99' AND calls onTaskPickedAndAttached('t99', urls)` | selectedTaskId path not implemented |
| 3.6 | captions per-photo pass-through into `FileUploadOptions.description` on task-attach paths (AND/OR into `captionsPreview[]` on project_unattached addBatch call — test whichever implementation chooses) | description/captionsPreview undefined |

Also must preserve legacy path: existing test that old props `{taskId, companyId, userId, uploadImmediately=true}` → entityType='task-update' entityId=taskId must still work. Write a regression sub-test within cycle 3.4 to guard against breaking UpdateProgress flow.

##### Then implement adapter changes (YAGNI per the 6 RED tests):

1. Widen `PhotoSelectionViewAdapterProps`:
   - Make `taskId?`, `companyId?`, `userId?` optional (relaxed from required)
   - Add: `projectId?: string`, `activeTaskPreviews?: TaskPreview[]`, `initialCaptions?: Record<number,string>`, `initialSaveIntent?: 'task_attach'|'project_unattached'`, `initialSelectedTaskId?: string|null`, `onBatchSavedProjectUnattached?: (r:{photoUrls:string[], batchId:string})=>void`, `onTaskPickedAndAttached?: (taskId:string, photoUrls:string[])=>void`
   - Import `TaskPreview` from `@/state/taskStore.supabase`
   - Import `useUnattachedPhotoBatchStore`

2. Add new state inside hook after line 64:
   - `photoCaptions` (Record<number, string>) initialized from initialCaptions then merged
   - `saveIntent` computed default: if `taskId prop` → `'task_attach'`; else if `projectId` → `'project_unattached'`; else `'task_attach'` (overridable via `initialSaveIntent`)
   - `selectedTaskId` state from `initialSelectedTaskId`
   - `showTaskMiniPicker` derived: saveIntent==='task_attach' && !taskId prop

3. New handlers inserted after handleRemovePhoto (line ~252):
   - `handleMovePhotoUp(i)`: if i>0 → swap i and i-1 in `selectedPhotos` AND `photoCaptions` (shift caption keys)
   - `handleMovePhotoDown(i)`: if i<len-1 → swap i and i+1 similarly
   - `handleSetCaption(i, caption)`: set key i
   - `handleSetSaveIntent(intent)`: set
   - `handleSelectTaskForAttach(taskId)`: set selectedTaskId + close picker (showTaskMiniPicker=false)

4. Refactor `handleUploadPhotos` (line 254-376) into 3-path branch:
   - PATH-A (legacy, PRESERVED): `taskId prop exists && saveIntent==='task_attach'` → use existing guard `companyId && userId && taskId`, existing entityType/taskId logic, existing onNavigateToUpdateProgress routing
   - PATH-B (new picker): `selectedTaskId && !taskId prop && saveIntent==='task_attach'` → guard `companyId && userId && selectedTaskId`, entityType='task-update', entityId=selectedTaskId, after all uploads fire `onTaskPickedAndAttached(selectedTaskId, uploadedUrls)` if provided else onPhotosUploaded/back
   - PATH-C (new unattached): `saveIntent==='project_unattached'` → guard `companyId && userId && projectId`, entityType='project', entityId=projectId, after all uploads call `useUnattachedPhotoBatchStore.getState().addBatch(...)` with:
     - projectId, userId
     - photoCount=uploadedUrls.length
     - firstPhotoUri=selectedPhotos[0].uri (or uploaded public if easier; pick whichever TDD test 3.6 asserted)
     - captionsPreview = selectedPhotos map (idx => photoCaptions[idx]?.slice(0,80) || '')
     - receive batchId
     - Then call `onBatchSavedProjectUnattached({photoUrls: uploadedUrls, batchId})` if provided else onNavigateBack

   - For all 3 paths: pass `description: photoCaptions[i]` into per-file `uploadFileWithVerification` call options if caption non-empty.

5. Output mapping (line ~378-416):
   - Each `SelectablePhotoModel` + `caption: photoCaptions[idx] || photo.caption` (from SelectedPhoto)
   - + `showTaskMiniPicker`, `selectedTaskId`, `availableTasksForPicker: activeTaskPreviews || []`, `saveIntent`, `photoCaptionsByIndex: photoCaptions`

6. Relax hook return type signature: add the 5 new handler functions to return object: `handleMovePhotoUp`, `handleMovePhotoDown`, `handleSetCaption`, `handleSetSaveIntent`, `handleSelectTaskForAttach`.

Re-run test: 6/6 new + 1 legacy regression = 7 GREEN.

---

#### FEATURE 4 — PhotoSelectionScreen.tsx UI updates

**File edited (1):**
7. `src/screens/PhotoSelectionScreen.tsx`

**TDD note:** No explicit Jest test for this file per Planner (UI is behavioral, covered by L3 Maestro probe S-UX-01H). Instead, manual UI assertions executed by QA; Builder visual spot-check in simulator.

**Exact edits (YAGNI, no new deps, no testIDs):**

1. Props interface (line 22-35):
   - Mirror widened props: `projectId?: string`, `activeProjectId?: string` (alias), `activeTaskPreviews?: TaskPreview[]` (import), `initialCaptions?`, `initialSaveIntent?`, `initialSelectedTaskId?`, `onBatchSavedProjectUnattached?`, `onTaskPickedAndAttached?`.
   - Existing props preserved as-is.

2. Hook call destructuring (line 41-56):
   - Pull new handlers: `handleMovePhotoUp`, `handleMovePhotoDown`, `handleSetCaption`, `handleSetSaveIntent`, `handleSelectTaskForAttach`
   - Pull new output fields: `saveIntent`, `showTaskMiniPicker`, `selectedTaskId`, `availableTasksForPicker`, `photoCaptionsByIndex`

3. Photo grid rendering (line 188-212):
   - Inside each tile `<Pressable>` (still relative), below thumbnail layer, overlay `<Pressable>` arrow pair row top-left when `photos.length > 1`:
     - `Ionicons name="arrow-up"` onPress `handleMovePhotoUp(index)` disabled `index===0`
     - `Ionicons name="arrow-down"` onPress `handleMovePhotoDown(index)` disabled `index===photos.length-1`
   - **Below each tile outer Pressable** (NOT inside thumbnail press area — avoids conflict): render a `<TextInput>` with `placeholder="Add caption..."` `multiline={false}` `maxLength={200}` `value={photoCaptionsByIndex[index] || ''}` `onChangeText={t => handleSetCaption(index, t)}`. Wrap inside a View so TextInput doesn't overlap thumbnail. Height 36, border, small font.
   - Enlarged photo view (line 84-162, header): add Up/Down Ionicons Pressables pair next to the counter display "1 / N" when photos.length>1. Same handler, same bounds-disabled logic. Caption TextInput below the enlarged photo in bottom actions (between Annotate button and annotated badge), large row.

4. Bottom action bar (line 216-263):
   - **Above** the existing 2-button `<View flex-row gap-3>`, insert a segmented control row (2 Pressables side-by-side, rounded border, active selected):
     - Button A: "Attach to Task" — selected `saveIntent==='task_attach'`, onPress `handleSetSaveIntent('task_attach')`
     - Button B: "Save to Project" — selected `saveIntent==='project_unattached'`, disabled if `!projectId || !companyId || !userId`, onPress `handleSetSaveIntent('project_unattached')`. If disabled, small text below row "Select a project first".
   - Existing Upload/Done Pressable label updates: if saveIntent='project_unattached' → show "Save to Project (N photo…)" icon "save-outline" Ionicons (if available, else keep cloud-upload — use @expo/vector-icons/Ionicons only).

5. **After line 263 (before SafeAreaView close)** — insert inline task mini-picker Modal/Sheet when `showTaskMiniPicker === true`:
   - Use `<View>` absolute-fill overlay (background black/40%, no new Modal component needed to avoid new deps). Top sheet slides up:
     - Header: "Select a Task" + Close Pressable.
     - Use `<FlatList>` with `data={availableTasksForPicker.slice(0, 20)}`, render each row: title, status, thumbnail (leadingAttachmentUri) via ExpoImage, Pressable row with highlighted background if `row.id === selectedTaskId`.
     - `onPress` row → `handleSelectTaskForAttach(row.id)`. Then Upload button (bottom of sheet or re-use main action bar submit) → same handleUploadPhotos (path B fires).

---

### Commit Group C: Navigation + Dashboard + CreateTask (3 features, 3 files)

---

#### FEATURE 5 — AppNavigator.tsx PhotoSelectionScreenWrapper hydration + callbacks

**File edited (1):**
8. `src/navigation/AppNavigator.tsx`

**Exact edits (line 1065-1262 region):**

1. Pull new imports:
   - `useAuthStore` from `@/state/authStore` (user.companyId/id)
   - `useProjectFilterStore` from `@/state/projectFilterStore` (selectedProjectId)
   - `useTaskStore` as `getRawTaskStore` from `@/state/taskStore.supabase` → use `.getState().taskPreviewById` and `.getState().taskIdsByProject` to build TaskPreview[] array (top 20 recents by updatedAt desc)

2. Inside `PhotoSelectionScreenWrapper` destructuring (line 1069):
   - Pull new params: `projectId, initialSaveIntent, initialSelectedTaskId, availableTaskPreviewsQuery`

3. Hydrate defaults after uploadedUrlsRef:
   - `const authUser = useAuthStore(s => s.user);`
   - `const selectedProjectId = useProjectFilterStore(s => s.selectedProjectId);`
   - `const effectiveProjectId = projectId || selectedProjectId || undefined;`
   - `const effectiveCompanyId = companyId || authUser?.companyId || undefined;`
   - `const effectiveUserId = userId || authUser?.id || undefined;`
   - Build task previews: if `availableTaskPreviewsQuery==='active_project'` AND `effectiveProjectId`, derive top 20 TaskPreviews via taskStore snapshot. Else `[]`.
   - Compute default save intent: if `initialSaveIntent` use it, else if `taskId` then `task_attach`, else if `effectiveProjectId` then `project_unattached`, else `task_attach`.

4. Widen call to `<PhotoSelectionScreen>` at line 1224-1261:
   - Pass relaxed props (no longer cast required if taskId undefined):
     - `taskId={taskId}` (may be undefined now that adapter accepts optional)
     - Add: `projectId={effectiveProjectId}`, `activeProjectId={effectiveProjectId}`, `activeTaskPreviews={hydratedTaskPreviews}`, `initialSaveIntent={computedSaveIntent}`, `initialSelectedTaskId={initialSelectedTaskId ?? null}`
     - `companyId={effectiveCompanyId as string}` (cast safe because guard still inside adapter per-path)
     - `userId={effectiveUserId as string}`
   - Add two new callback branches:
     - `onBatchSavedProjectUnattached={() => { if (returnScreen) nav goBack; else reset Camera stack to CreateTaskMain; }}` — exactly match UpdateProgress routing style (lines 1104-1152)
     - `onTaskPickedAndAttached={(taskId, urls) => { use existing navigateToCreateTaskRoute pattern that UpdateProgress uses (TaskDetail or TasksList) }}`

5. Preserve effectiveUploadImmediately logic (existing line 1074-1076 intact).

---

#### FEATURE 6 — CreateTaskScreen.tsx: swap guard + wire nav

**File edited (1):**
9. `src/screens/CreateTaskScreen.tsx`

**Exact edits (3 touch points):**

1. **Line 730** guard copy → replace with:
   ```
   "You'll pick a task in the next step. Photos will be attached to the task update stream."
   ```
   Keep conditional structure, only change the text value.

2. **Line 465-468** handleSubmit early return guard for `captureRoutingChoice==='existing_task'` → REMOVE `return;` → replace with:
   - Check if `formData.attachments.length === 0 && (selectedPhotosProp?.length ?? 0) === 0` → Alert.alert("Add Photos", "Select or capture photos first."); return;
   - Else: navigate the CreateTaskStack navigator to PhotoSelection with params:
     ```
     {
       returnScreen: 'CreateTask',
       actionType: 'photos',
       uploadImmediately: true,
       availableTaskPreviewsQuery: 'active_project',
       entityType: 'task-update',
       initialPhotos: merged attachments,
     }
     ```
     — re-use existing CreateTaskAttachmentSection navigation pattern (CreateTask already navigates PhotoSelection via CreateTaskStack at AppNavigator line 1482-1485).

3. **Line 1044-1047** inline submit disabled prop: remove `captureRoutingChoice==='existing_task'` clause. (Button becomes enabled when existing_task is chosen.)

---

#### FEATURE 7 — Dashboard: prepend unattached 5-day batches into Recent Activity + onPress guard

**Files edited (2):**
10. `src/ui/viewAdapters/useDashboardViewAdapter.ts`
11. `src/screens/DashboardScreen.tsx`

##### TDD Cycles 7.1-7.2: Extend `useDashboardViewAdapter.test.ts` with 2 cases BEFORE edit.

Edit `src/ui/viewAdapters/__tests__/useDashboardViewAdapter.test.ts` (EXISTING). Add a new `describe("unattached batch activity rows")` block:

| Cycle | Test | RED reason (pre-code) |
|---|---|---|
| 7.1 | mock store has 1 batch (created 1 day ago, projectId matches selected) + selectedProjectId set → `output.activityItems[0].id.startsWith('unattached-batch:')` + `title.includes('photo')` + `taskId.startsWith('project:')` + `statusLabel==='Saved to project'` | activityItems doesn't include batch rows (only source = task updates) |
| 7.2 | batch with `createdAt = 6 days ago` (outside RECENT_ACTIVITY_WINDOW_MS) → activityItems.length unchanged from baseline | (if implementation mistakenly skips window filter) — we'll test by constructing both 1-day and 6-day batches separately and asserting counts |

Mock `@/state/unattachedPhotoBatchStore` by adding jest.mock in this file's setup (following pattern of the 4 existing mocks at top). Use `jest.requireActual` to wrap so that `_clearAll` works.

##### Then implement:

10. `useDashboardViewAdapter.ts`:
   - Add import `useUnattachedPhotoBatchStore` (getter via `.getState()` or subscribe)
   - In hook body near line 218-240 area (after useTaskStore selector, before activityItems):
     - `const selectedProjectId = useProjectFilterStore(s => s.selectedProjectId);` (already present on line 220, re-use)
     - `const batchesForProject = selectedProjectId ? useUnattachedPhotoBatchStore.getState().getBatchesForProject(selectedProjectId) : [];`
     - Actually, subscribe via `useUnattachedPhotoBatchStore(s => s.batches)` + filter by selectedProjectId to re-render on batch change.
   - At activityItems construction (line ~403): before flatMap of tasks, build `mappedBatchItems` array:
     - Each batch → if `createdAt >= recentActivityThreshold` (reuse existing threshold):
       - id = `unattached-batch:${batch.batchId}`
       - taskId = `project:${batch.projectId}`
       - title = `${batch.photoCount} photo${batch.photoCount===1?'':'s'} captured`
       - subtitle = batch.captionsPreview[0] ? batch.captionsPreview[0].slice(0,60) : "Unattached to any task — organize later"
       - timestampLabel = format date via same toLocaleString format used for updates (line 430-434)
       - statusLabel = "Saved to project"
       - previewPhotoUri = batch.firstPhotoUri
       - density / structuralState same as existing rows
       - sortTimestamp = batch.createdAt
   - Concat: `const combinedWithBatches = [...mappedBatchItems, ...mappedActivityItems]` then apply the existing `.filter(...)` + `.sort(...)` + `.map(...)` strip pipeline (it will handle sortTimestamp generically). Final activityItems output unchanged contract, now includes prepended batch items sorted by time.

11. `DashboardScreen.tsx` line 153:
    - Change `onPress={() => props.onNavigateToTaskDetail?.(item.taskId)}` → `onPress={() => { if (!item.taskId.startsWith('project:')) { props.onNavigateToTaskDetail?.(item.taskId); } }}` (inert no-op for synthetic rows, preserves call for real).

Re-run 7.1 + 7.2 tests → GREEN.

---

#### FEATURE 8 — Extend existing tests (in suites): finalizer

**Files edited (already covered by 3 & 7 above):**
16. `src/ui/viewAdapters/__tests__/usePhotoSelectionViewAdapter.test.ts` — 6 new cases (Cycle 3.1-3.6 above)
17. `src/ui/viewAdapters/__tests__/useDashboardViewAdapter.test.ts` — 2 new cases (Cycle 7.1-7.2 above)

(Planner listed these as separate step; they're executed inline with their feature. Just re-run here to ensure no regressions from later edits to Adapter/Dashboard.)

Run:
- `npx jest src/ui/viewAdapters/__tests__/usePhotoSelectionViewAdapter.test.ts --runInBand` → 7 GREEN
- `npx jest src/ui/viewAdapters/__tests__/useDashboardViewAdapter.test.ts --runInBand` → N existing + 2 GREEN

---

## 2. Verification Pipeline (L1 + L2)

Builder runs these in ORDER after all Group A/B/C code written:

### L1 TypeScript
```
cd /Volumes/KooDrive/InsiteApp && npx tsc --noEmit
```
→ Must be GREEN (0 errors). Investigate any widening-induced downstream issues; if real issue found, narrow field to optional/add cast safe.

### L2 Regression Suites
```
cd /Volumes/KooDrive/InsiteApp && npm run test:regression
```
This runs: test:tasks + test:uploads + test:components + test:integration. Must exit 0.

Plus targeted runs:
```
npx jest src/state/__tests__/unattachedPhotoBatchStore.test.ts --runInBand    # 4/4
npx jest src/ui/viewAdapters/__tests__/usePhotoSelectionViewAdapter.test.ts --runInBand  # 7/7
npx jest src/ui/viewAdapters/__tests__/useDashboardViewAdapter.test.ts --runInBand  # all
```

### L3 Manual behavioral (Builder's self-check, NOT Maestro yaml file):
- Simulator check of PhotoSelection caption + reorder arrows (grid + enlarged)
- Segmented "Attach to Task / Save to Project" toggle and its projectId-disabled state
- CreateTask post-capture → "Add to Existing Task" → no disabled → navigates to PhotoSelection with picker
- After Save to Project → Dashboard Recent Activity top row with "Saved to project" + inert onPress
- Upload immediately=true UpdateProgress legacy flow: no regression (same uploadFileWithVerification args)

---

## 3. File Change Manifest (17 files, Planner §3 boundary)

| # | Path | Role | Δ (approx lines) |
|---|---|---|---|
| 1 | `src/utils/usePhotoSelection.ts` | SelectedPhoto +caption? | +1 |
| 2 | `src/navigation/navigationTypes.ts` | SelectedPhoto +caption?; PhotoSelectionParams widened 5 fields | +10 |
| 3 | `src/ui/contracts/viewAdapters.ts` | SelectablePhotoModel +caption?; PhotoSelection output +5 optional fields; TaskPreview import | +12 |
| 4★ | `src/state/unattachedPhotoBatchStore.ts` | NEW zustand persist AsyncStorage store | ~75 |
| 5 | `src/ui/viewAdapters/usePhotoSelectionViewAdapter.ts` | props widening, caption state, reorder×2, setCaption, setSaveIntent, selectTaskForAttach handlers; 3-path handleUploadPhotos rewrite; output fields extended; return type extended | ~260 |
| 6 | `src/screens/PhotoSelectionScreen.tsx` | props; adapter destructuring; grid tile caption+arrows; enlarged photo UI; segmented save-intent row; task mini-picker FlatList inline sheet | ~340 |
| 7 | `src/navigation/AppNavigator.tsx` | PhotoSelectionScreenWrapper: auth/project stores for hydrate, taskPreviews build, new 2 callbacks + prop pass-through | ~85 |
| 8 | `src/screens/CreateTaskScreen.tsx` | line 730 text swap; handleSubmit guard→nav (line 466-468); inline submit enable (1044-1047) | ~15 |
| 9 | `src/ui/viewAdapters/useDashboardViewAdapter.ts` | import store; subscribe batches; mappedBatchItems concat into activityItems | ~60 |
| 10 | `src/screens/DashboardScreen.tsx` | line 153 onPress guard for project: prefix | +2 |
| 11 | `src/state/uploadFailureStore.ts` | PASS — unchanged | 0 |
| 12 | `src/api/fileUploadService.ts` | PASS — unchanged | 0 |
| 13 | `package.json` | PASS — no new deps | 0 |
| 14 | `app.json` | PASS — no new plugins | 0 |
| 15★ | `src/state/__tests__/unattachedPhotoBatchStore.test.ts` | NEW 4 tests: add/get/filter/dismiss/persist round-trip | ~140 |
| 16★ | `src/ui/viewAdapters/__tests__/usePhotoSelectionViewAdapter.test.ts` | NEW file 6 tests + 1 regression: caption/reorder×2/project-unattached/task-pick/caption passthrough | ~450 |
| 17 | `src/ui/viewAdapters/__tests__/useDashboardViewAdapter.test.ts` | ADD 2 cases: batch row prepended mapping / >5days excluded | ~100 |

★ = new file.

---

## 4. Commit Message Candidates (3 commits, do NOT commit — gate after Reviewer)

Builder delivers 3 logical commits to Reviewer. Order matters for revert granularity.

```
feat(ux-01h): widen types + add unattachedPhotoBatch store (TDD 4 green)

- SelectedPhoto.caption? across usePhotoSelection / navigationTypes / SelectablePhotoModel
- PhotoSelectionParams.projectId + initialSaveIntent + initialSelectedTaskId + availableTaskPreviewsQuery + onBatchSavedIntent
- PhotoSelectionScreenViewAdapterOutput.showTaskMiniPicker / selectedTaskId / availableTasksForPicker / saveIntent / photoCaptionsByIndex
- NEW src/state/unattachedPhotoBatchStore.ts (zustand persist AsyncStorage) + unit tests: addBatch/getBatchesForProject/dismissBatch/persist (4/4 green)
```

```
feat(ux-01h): PhotoSelection adapter 3-path upload + screen UI

- usePhotoSelectionViewAdapter: relaxed taskId/companyId/userId, 5 new handlers, saveIntent state, selectedTaskId, captions record
- handleUploadPhotos split into legacy taskId path + selectedTaskId picker path + entityType=project unattached path (preserves UpdateProgress)
- PhotoSelectionScreen.tsx: per-tile caption TextInput, Up/Down Ionicons Pressable arrows (bounds-disabled), segmented save-intent row, inline FlatList task mini-picker
- NEW test suite usePhotoSelectionViewAdapter.test.ts: 6 cases + 1 legacy regression (7/7 green)
```

```
feat(ux-01h): navigator hydration, CreateTask routing, Dashboard Recent Activity batches

- AppNavigator PhotoSelection wrapper: hydrate companyId/userId from authStore, projectId from projectFilterStore, top-20 TaskPreviews from taskStore when query=active_project; onBatchSaved/onTaskPickedAndAttached callbacks
- CreateTaskScreen: "Add to Existing Task" guard text, submit enabled, routes to PhotoSelection in mini-picker mode
- Dashboard useDashboardViewAdapter: concat 5-day unattached batches into activityItems (taskId=project:{id}), 2 new test cases green
- DashboardScreen activity row onPress inert for project: prefix
- L1 tsc --noEmit green; L2 test:regression suites green
```

---

## 5. Known Risks + Technical Debt (Logged to S-UX-01I Next Slice)

Builder logs these at end of output; does NOT fix inside 01H per OOS rules:

| ID | Item | Owner slice |
|---|---|---|
| TD-01H-1 | **No testIDs** anywhere on new UI (caption TextInput, Up/Down arrows, segmented buttons, mini-picker rows, save buttons). Explicitly deferred to **S-UX-01I**. | S-UX-01I |
| TD-01H-2 | No migration of legacy PhotoSelection callers that pass taskId+companyId+userId manually (wrapper hydrates them, but some direct-screen callers might not); potential warning console noise. | S-UX-01I |
| TD-01H-3 | Drag-drop reorder NOT implemented (arrows only per Planner approved). Add gesture reorder later if product wants. | future |
| TD-01H-4 | Dashboard unattached batch rows have onPress no-op; no organize-later UI to actually assign to task. | future slice (S-UX-01J+) |
| TD-01H-5 | Task mini-picker inside PhotoSelection has no search bar; top-20 recents only. Planner says no search for 01H. | S-UX-01I or later |
| TD-01H-6 | No eviction/TTL for unattachedPhotoBatchStore AsyncStorage entries; batch log grows unbounded until user explicitly dismisses or future organize reconciles. | S-UX-01I cleanup |
| TD-01H-7 | CreateTask navigation to PhotoSelection from existing_task path does not yet carry returnScreen params annotationResult back; covered by existing CreateTaskAttachmentSection pattern in future if needed. | S-UX-01I |

---

## 6. Sequence Table for Builder Execution (TDD strict)

Run each step in order. Do not skip RED verification.

| Order | Action | Terminal Command | Pass / Fail Gate |
|---|---|---|---|
| 0 | Checkout clean branch, confirm baseline `test:regression` green (1-time) | `npm run test:regression` | Baseline green or stop |
| A1 | Types-only edit of 3 files (usePhotoSelection.ts, navigationTypes.ts, viewAdapters.ts) | `npx tsc --noEmit` | L1 green |
| A2.TDD | Write 4 failing tests in NEW unattachedPhotoBatchStore.test.ts | `npx jest src/state/__tests__/unattachedPhotoBatchStore.test.ts --runInBand` | 4 RED (missing store) |
| A2.CODE | Write unattachedPhotoBatchStore.ts minimal impl | same command | 4 GREEN |
| B3.TDD-1 | Write test 3.1 handleSetCaption into NEW usePhotoSelectionViewAdapter.test.ts | `npx jest ...usePhotoSelection... --runInBand -t 'handleSetCaption'` | RED |
| B3.CODE-1 | Adapter hook: state + handler + output caption | same | GREEN |
| B3.TDD-2 | Write test 3.2 handleMovePhotoUp | `-t 'handleMovePhotoUp'` | RED |
| B3.CODE-2 | Adapter handler + swap | same | GREEN |
| B3.TDD-3 | Write test 3.3 reorder bounds | `-t 'reorder bounds'` | RED |
| B3.CODE-3 | Bounds guards | same | GREEN |
| B3.TDD-4 | Write test 3.4 project_unattached path + regression | `-t 'project_unattached'` | RED (guard blocks) |
| B3.CODE-4 | 3-path handleUploadPhotos PATH-A/PATH-C + captions upload opts | same | GREEN (legacy regression also) |
| B3.TDD-5 | Write test 3.5 task_attach selectedTaskId picker path | `-t 'selectedTaskId'` | RED |
| B3.CODE-5 | PATH-B | same | GREEN |
| B3.TDD-6 | Write test 3.6 captions into FileUploadOptions OR captionsPreview | `-t 'caption passthrough'` | RED |
| B3.CODE-6 | Wire per-file description OR batch captionsPreview (whichever test chose) | same | GREEN |
| B4 | PhotoSelectionScreen.tsx UI edits (no Jest, visual self-check) | simulator | UI renders per §3 Maestro probe self-check |
| C5 | AppNavigator hydration + callbacks (no Jest, manual nav regression self-check) | simulator + L1 | navigation flows work, L1 tsc green |
| C6 | CreateTaskScreen 3 touch-point edits | simulator + L1 | Add to Existing Task no longer blocked, navs correctly |
| C7.TDD-1 | Extend useDashboardViewAdapter test case 7.1: batch row prepended correctly | `npx jest ...useDashboardViewAdapter... -t 'unattached batch row'` | RED |
| C7.CODE-1 | Dashboard adapter concat batches into activityItems | same | GREEN |
| C7.TDD-2 | Case 7.2: 6-day batch excluded | `-t '5-day window'` | RED |
| C7.CODE-2 | Guard in mappedBatchItems filter | same | GREEN |
| C7.CODE-3 | DashboardScreen line 153 onPress guard | simulator | no crash on press |
| FINAL-L1 | Type check | `npx tsc --noEmit` | GREEN |
| FINAL-L2 | Regression full run | `npm run