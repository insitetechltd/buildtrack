# Task Detail Shared Update Composer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `Add Photos` and `Add Comment` from Task Detail converge into the same task update composer, with `Add Photos` entering photo-first and `Add Comment` entering comment-first.

**Architecture:** Keep the existing two-button Task Detail action bar and the current task/subtask update persistence path. Reuse the existing task action screen inside `CreateTaskScreen`, but unify the `photos` and `comment` entry modes so both land in one shared update composer that always includes the comment area and can attach photos to the same task update.

**Tech Stack:** Expo 54, React Native, TypeScript, Jest, React Native Testing Library

---

## File Structure

### Core files to modify

- `src/screens/CreateTaskScreen.tsx`
  Unify the `photos` and `comment` task-action modes into one shared update composer while preserving photo-first vs comment-first entry behavior.

- `src/screens/TaskDetailScreen.tsx`
  Keep the current `Add Photos` / `Add Comment` button routing, but ensure both actions target the shared composer behavior consistently.

- `src/ui/viewAdapters/useTaskDetailViewAdapter.ts`
  Keep the existing two-button state model intact while preserving labels and action ids for the shared-composer behavior.

### Tests to modify

- `src/__tests__/integration/CreateTaskScreen.test.tsx`
- `src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx`
- `src/components/taskDetail/__tests__/TaskDetailQuickActions.test.tsx`

### Docs to update after implementation

- `docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md`
- `docs/superpowers/plans/2026-07-07-task-detail-shared-update-composer.md`

## Task 1: Make `photos` mode return to the shared update composer with comment visible

**Files:**
- Modify: `src/screens/CreateTaskScreen.tsx`
- Modify: `src/__tests__/integration/CreateTaskScreen.test.tsx`

- [x] **Step 1: Write the failing tests**

```tsx
it("keeps the comment composer visible after entering from Add Photos", async () => {
  const screen = render(
    <NavigationContainer>
      <CreateTaskScreen
        onNavigateBack={jest.fn()}
        editTaskId="task-1"
        actionType="photos"
      />
    </NavigationContainer>,
  );

  await waitFor(() => {
    expect(mockShowPhotoSelectionDialog).toHaveBeenCalled();
  });

  expect(screen.getByText("Update Description")).toBeTruthy();
  expect(screen.getByPlaceholderText("Describe progress")).toBeTruthy();
});
```

```tsx
it("merges returned photos into the same update composer when entering from Add Photos", async () => {
  const screen = render(
    <NavigationContainer>
      <CreateTaskScreen
        onNavigateBack={jest.fn()}
        editTaskId="task-1"
        actionType="photos"
        selectedPhotos={[
          { uri: "file:///photo-1.jpg", fileName: "photo-1.jpg", isAnnotated: false },
        ]}
      />
    </NavigationContainer>,
  );

  await waitFor(() => {
    expect(screen.getByText("Photos and Files")).toBeTruthy();
  });
});
```

- [x] **Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/integration/CreateTaskScreen.test.tsx --runInBand`

Expected: FAIL because `photos` mode is still treated as a camera-first variant, but the shared-composer behavior is not yet explicitly verified and may not preserve the comment area after photo-first entry.

- [x] **Step 3: Write minimal implementation**

```ts
// src/screens/CreateTaskScreen.tsx
const isSharedUpdateComposerMode = actionType === "update" || actionType === "photos" || actionType === "comment";
const isPhotoFirstEntry = actionType === "photos";
const isCommentFirstEntry = actionType === "comment";
```

```ts
useEffect(() => {
  if (!isPhotoFirstEntry) return;
  if (!user || !task || !targetTask) return;
  if (hasAutoOpenedPhotoSelectionRef.current) return;
  if (initialIncomingPhotos.length > 0 || draftSelectedPhotos.length > 0 || updateForm.photos.length > 0) return;

  hasAutoOpenedPhotoSelectionRef.current = true;
  handleAddPhotos();
}, [isPhotoFirstEntry, draftSelectedPhotos.length, initialIncomingPhotos.length, updateForm.photos.length]);
```

```ts
if (selectedPhotoUris.length > 0 || (uploadedPhotoUrls && uploadedPhotoUrls.length > 0)) {
  setUpdateForm((prev) => ({
    ...prev,
    photos: Array.from(new Set([...prev.photos, ...incomingPhotos])),
  }));
}
```

- [x] **Step 4: Run test to verify it passes**

Run: `npx jest src/__tests__/integration/CreateTaskScreen.test.tsx --runInBand`

Expected: PASS

- [x] **Step 5: Commit**

```bash
git add src/screens/CreateTaskScreen.tsx src/__tests__/integration/CreateTaskScreen.test.tsx
git commit -m "feat(task-detail): keep comment area in photo-first composer"
```

## Task 2: Keep `Add Comment` comment-first while still allowing photo add-on inside the same composer

**Files:**
- Modify: `src/screens/CreateTaskScreen.tsx`
- Modify: `src/__tests__/integration/CreateTaskScreen.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
it("opens Add Comment in comment-first mode without auto-opening photo selection", () => {
  render(
    <NavigationContainer>
      <CreateTaskScreen
        onNavigateBack={jest.fn()}
        editTaskId="task-1"
        actionType="comment"
      />
    </NavigationContainer>,
  );

  expect(mockShowPhotoSelectionDialog).not.toHaveBeenCalled();
});
```

```tsx
it("still allows Add Comment mode to add photos afterward", async () => {
  const screen = render(
    <NavigationContainer>
      <CreateTaskScreen
        onNavigateBack={jest.fn()}
        editTaskId="task-1"
        actionType="comment"
      />
    </NavigationContainer>,
  );

  fireEvent.press(screen.getByText("Tap to add files"));

  await waitFor(() => {
    expect(mockShowPhotoSelectionDialog).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/integration/CreateTaskScreen.test.tsx --runInBand`

Expected: FAIL because the shared-composer logic is not yet explicitly guaranteed for comment-first behavior.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/screens/CreateTaskScreen.tsx
const isPhotoFirstEntry = actionType === "photos";
const isCommentFirstEntry = actionType === "comment";

// Only auto-open photo selection for photo-first entry.
if (!isPhotoFirstEntry) {
  return;
}
```

```ts
// Keep the same handleAddPhotos() entry point available in comment-first mode
<Pressable
  onPress={handleAddPhotos}
  className="flex-row items-center justify-between border-2 border-dashed border-gray-300 rounded-lg px-4 py-3 bg-gray-50"
>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/__tests__/integration/CreateTaskScreen.test.tsx --runInBand`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/screens/CreateTaskScreen.tsx src/__tests__/integration/CreateTaskScreen.test.tsx
git commit -m "feat(task-detail): keep comment-first entry in shared composer"
```

## Task 3: Preserve Task Detail action-bar intent while documenting the shared composer behavior

**Files:**
- Modify: `src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx`
- Modify: `src/components/taskDetail/__tests__/TaskDetailQuickActions.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
it("routes Add Photos through the photo-first shared composer entry", () => {
  const onNavigateToCreateTask = jest.fn();

  const screen = render(
    <TaskDetailScreen
      taskId="task-1"
      onNavigateBack={jest.fn()}
      onNavigateToTaskDetail={jest.fn()}
      onNavigateToCreateTask={onNavigateToCreateTask}
    />,
  );

  fireEvent.press(screen.getByTestId("task-detail__quick-action-update_progress"));

  expect(onNavigateToCreateTask).toHaveBeenCalledWith(
    undefined,
    undefined,
    "task-1",
    "photos",
    undefined,
  );
});
```

```tsx
it("keeps Add Comment routed to comment-first shared composer entry", () => {
  const onNavigateToCreateTask = jest.fn();

  const screen = render(
    <TaskDetailScreen
      taskId="task-1"
      onNavigateBack={jest.fn()}
      onNavigateToTaskDetail={jest.fn()}
      onNavigateToCreateTask={onNavigateToCreateTask}
    />,
  );

  fireEvent.press(screen.getByTestId("task-detail__quick-action-add_comment"));

  expect(onNavigateToCreateTask).toHaveBeenCalledWith(
    undefined,
    undefined,
    "task-1",
    "comment",
    undefined,
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx src/components/taskDetail/__tests__/TaskDetailQuickActions.test.tsx --runInBand`

Expected: FAIL if current Task Detail acceptance tests do not yet pin the distinct shared-composer entry modes.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/screens/TaskDetailScreen.tsx
case "update_progress":
  props.onNavigateToCreateTask?.(
    undefined,
    undefined,
    props.taskId,
    "photos",
    props.subTaskId,
  );
  break;

case "add_comment":
  props.onNavigateToCreateTask?.(
    undefined,
    undefined,
    props.taskId,
    "comment",
    props.subTaskId,
  );
  break;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx src/components/taskDetail/__tests__/TaskDetailQuickActions.test.tsx --runInBand`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/screens/TaskDetailScreen.tsx src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx src/components/taskDetail/__tests__/TaskDetailQuickActions.test.tsx
git commit -m "test(task-detail): pin shared composer entry modes"
```

## Task 4: Validate and record the shared-composer refinement

**Files:**
- Modify: `docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md`
- Modify: `docs/superpowers/plans/2026-07-07-task-detail-shared-update-composer.md`

- [x] **Step 1: Run the focused validation suite**

Run: `npx jest src/__tests__/integration/CreateTaskScreen.test.tsx src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx src/components/taskDetail/__tests__/TaskDetailQuickActions.test.tsx --runInBand && npx tsc --noEmit`

Expected: PASS

- [x] **Step 2: Update the execution ledger**

```md
- unified `Add Photos` and `Add Comment` into one shared task update composer
- made `Add Photos` photo-first while preserving the comment area after photo selection
- kept `Add Comment` comment-first while still allowing photos to be attached afterward
```

- [x] **Step 3: Commit**

```bash
git add docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md docs/superpowers/plans/2026-07-07-task-detail-shared-update-composer.md
git commit -m "docs(task-detail): record shared composer refinement"
```

## Spec Coverage Check

- both Task Detail actions converge into one shared update composer: Task 1 and Task 2
- `Add Photos` is photo-first but returns to the same composer with comment area visible: Task 1
- `Add Comment` is comment-first but can still add photos afterward: Task 2
- Task Detail bottom bar still differs by entry mode, not destination: Task 3

## Placeholder Scan

- No `TBD` / `TODO`
- No “similar to Task N” shortcuts
- All file paths are explicit
- Each code-changing step includes concrete code
- Each verification step includes exact commands and expected outcomes

## Type Consistency Check

- `actionType: "photos"` remains the photo-first entry mode
- `actionType: "comment"` remains the comment-first entry mode
- both modes now converge into the same update composer behavior inside `CreateTaskScreen`
