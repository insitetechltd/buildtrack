# Task Detail Correction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine Task Detail into a compact, newest-first, photo-centric active-entry experience with correct camera/back behavior, clear text-only and PDF entry modes, and creator-only edit visibility.

**Architecture:** Reuse the existing Task Detail redesign and correct it in place. The implementation will (1) finish the task-detail-aware bottom-camera and back flow, (2) compact the hero and remove low-value metadata, (3) replace the old evidence strip with a pinned active-entry stage driven by the top-most thread entry, and (4) support three stage modes: photo, neutral no-photo, and PDF preview.

**Tech Stack:** Expo 54, React Native, React Navigation, TypeScript, Zustand, Jest, React Native Testing Library

---

## File Structure

### Core files to modify

- `src/navigation/AppNavigator.tsx`
  Ensure the task-detail camera path returns back to Task Detail correctly and keeps task/subtask context intact.

- `src/navigation/photoShortcutRoutes.ts`
  Keep task-detail launch params and return behavior aligned with same-task photo updates.

- `src/screens/TaskDetailScreen.tsx`
  Compact the hero, remove the top project label and visible progress-update action, host the pinned active-entry stage, and keep the newest-first thread and visible inline secondary actions.

- `src/components/taskDetail/TaskDetailHero.tsx`
  Remove the top project string, keep the title dominant, and retain compact critical/status metadata.

- `src/components/taskDetail/TaskDetailEvidenceStrip.tsx`
  Convert this component into a pinned active-entry stage that supports photo, no-photo, and PDF modes.

- `src/components/taskDetail/TaskActivityTimeline.tsx`
  Expose stable entry surfaces so the active-entry stage can be driven by the top-most entry without ambiguity.

- `src/ui/contracts/viewAdapters.ts`
  Extend task-detail contracts with active-entry-stage models, PDF attachment representation, and thread-entry summary fields.

- `src/ui/viewAdapters/useTaskDetailViewAdapter.ts`
  Produce compact hero data, remove the visible progress-update action, keep creator-only edit visibility, and map each thread entry into one of the active-entry-stage modes.

### New focused helper/tests

- `src/components/taskDetail/taskDetailActiveStage.ts` (new)
  Pure helper for resolving which thread entry owns the pinned stage and how it should render.

- `src/components/taskDetail/__tests__/taskDetailActiveStage.test.ts` (new)
- `src/screens/__tests__/TaskDetailScreen.sticky-layout.test.tsx`
- `src/__tests__/integration/TaskDetailScreen.header.test.tsx`
- `src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx`
- `src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts`
- `src/navigation/__tests__/uiModeRoutes.test.tsx`

### Docs to update after implementation

- `docs/superpowers/specs/2026-07-05-task-detail-correction-design.md`
- `docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md`

## Task 1: Finish the task-detail camera/back flow and remove the visible progress-update action

**Files:**
- Modify: `src/navigation/AppNavigator.tsx`
- Modify: `src/navigation/photoShortcutRoutes.ts`
- Modify: `src/ui/viewAdapters/useTaskDetailViewAdapter.ts`
- Modify: `src/navigation/__tests__/uiModeRoutes.test.tsx`
- Modify: `src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
it("routes task-detail camera launches back to task detail instead of dashboard", () => {
  const params = buildPhotoShortcutCreateTaskParams({
    taskId: "task-1",
    subTaskId: "subtask-1",
    actionType: "photos",
  });

  expect(params.sourceScreen).toBe("TaskDetail");
  expect(params.sourceTaskId).toBe("task-1");
  expect(params.sourceSubTaskId).toBe("subtask-1");
});
```

```ts
it("removes the visible update_progress action from task detail", () => {
  const { result } = renderHook(() =>
    useTaskDetailViewAdapter({ taskId: "task-parent" }),
  );

  expect(result.current.output.actionItems.map((item) => item.actionId)).not.toContain(
    "update_progress",
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/navigation/__tests__/uiModeRoutes.test.tsx src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts --runInBand`
Expected: FAIL because task-detail return metadata is incomplete and the visible progress action still exists.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/navigation/photoShortcutRoutes.ts
return {
  editTaskId: taskId,
  actionType,
  cameraLaunchContext: "task_detail",
  postCaptureDefault: "same_task_update",
  updateTargetSubTaskId: subTaskId,
  sourceScreen: "TaskDetail",
  sourceTaskId: taskId,
  sourceSubTaskId: subTaskId,
};
```

```ts
// src/ui/viewAdapters/useTaskDetailViewAdapter.ts
// remove visible update_progress action push
// keep camera-driven upload path plus comment path
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/navigation/__tests__/uiModeRoutes.test.tsx src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts --runInBand`
Expected: PASS

## Task 2: Compact the hero and make next-step guidance contextual

**Files:**
- Modify: `src/components/taskDetail/TaskDetailHero.tsx`
- Modify: `src/ui/viewAdapters/useTaskDetailViewAdapter.ts`
- Modify: `src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx`
- Modify: `src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts`

- [ ] **Step 1: Write the failing tests**

```tsx
it("does not render the top project-label string in the compact hero", () => {
  const screen = render(<TaskDetailScreen taskId="task-1" onNavigateBack={jest.fn()} />);

  expect(screen.queryByText("Project Alpha")).toBeNull();
});
```

```ts
it("uses contextual next-step guidance instead of a fixed update-progress phrase", () => {
  const { result } = renderHook(() =>
    useTaskDetailViewAdapter({ taskId: "task-parent" }),
  );

  expect(result.current.output.taskHero.nextStepLabel).not.toBe(
    "Update progress and add photo evidence.",
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts --runInBand`
Expected: FAIL because the hero still renders wasted project-label space and the guidance is too generic.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/taskDetail/TaskDetailHero.tsx
// remove projectLabel visual row
<Text className="text-3xl font-semibold text-white">{model.title}</Text>
```

```ts
// src/ui/viewAdapters/useTaskDetailViewAdapter.ts
if (isAssignedToMe && task.status === "in_progress") {
  return "Capture progress photos or add a work note.";
}
if (isTaskCreator) {
  return "Review the latest update and support the assignee.";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts --runInBand`
Expected: PASS

## Task 3: Add a pure active-entry-stage resolver for newest-first ownership

**Files:**
- Create: `src/components/taskDetail/taskDetailActiveStage.ts`
- Create: `src/components/taskDetail/__tests__/taskDetailActiveStage.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
it("treats the top-most newest-first entry as the active stage owner", () => {
  const result = resolveActiveStageEntry({
    entries: [
      { id: "entry-1", top: 12 },
      { id: "entry-2", top: 164 },
    ],
    topEdge: 0,
  });

  expect(result?.id).toBe("entry-1");
});
```

```ts
it("returns a neutral no-photo mode for text-only entries", () => {
  expect(
    buildActiveStageModel({
      id: "entry-2",
      mode: "text",
      title: "Added status note",
      summary: "Waiting on supplier confirmation.",
    }),
  ).toMatchObject({
    stageMode: "no_photo",
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/components/taskDetail/__tests__/taskDetailActiveStage.test.ts --runInBand`
Expected: FAIL because the helper does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```ts
export function resolveActiveStageEntry({
  entries,
  topEdge,
}: {
  entries: Array<{ id: string; top: number }>;
  topEdge: number;
}) {
  return [...entries]
    .filter((entry) => entry.top >= topEdge)
    .sort((left, right) => left.top - right.top)[0];
}
```

```ts
export function buildActiveStageModel(entry: ThreadStageSource) {
  if (entry.mode === "pdf") return { stageMode: "pdf_preview", ...entry };
  if (entry.mode === "text") return { stageMode: "no_photo", ...entry };
  return { stageMode: "photo", ...entry };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/components/taskDetail/__tests__/taskDetailActiveStage.test.ts --runInBand`
Expected: PASS

## Task 4: Replace the old evidence strip with a pinned active-entry stage

**Files:**
- Modify: `src/ui/contracts/viewAdapters.ts`
- Modify: `src/ui/viewAdapters/useTaskDetailViewAdapter.ts`
- Modify: `src/components/taskDetail/TaskDetailEvidenceStrip.tsx`
- Modify: `src/screens/TaskDetailScreen.tsx`
- Modify: `src/screens/__tests__/TaskDetailScreen.sticky-layout.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
it("renders a neutral no-photo stage when the active entry has no photos", () => {
  const screen = render(<TaskDetailEvidenceStrip model={noPhotoModel} />);

  expect(screen.getByText("No photos for this update")).toBeTruthy();
});
```

```tsx
it("renders a document preview stage for PDF-bearing entries", () => {
  const screen = render(<TaskDetailEvidenceStrip model={pdfModel} />);

  expect(screen.getByText("Document attached")).toBeTruthy();
  expect(screen.getByText("site-report.pdf")).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/screens/__tests__/TaskDetailScreen.sticky-layout.test.tsx src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx --runInBand`
Expected: FAIL because the stage still assumes a simple evidence strip.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/ui/contracts/viewAdapters.ts
export interface TaskDetailActiveStageModel extends PrimitiveReadyItemBase {
  stageMode: "photo" | "no_photo" | "pdf_preview";
  title: string;
  summary: string;
  actorLabel: string;
  timestampLabel: string;
  photos: string[];
  activePhotoIndex?: number;
  documentName?: string;
}
```

```tsx
// src/components/taskDetail/TaskDetailEvidenceStrip.tsx
if (model.stageMode === "no_photo") return <Text>No photos for this update</Text>;
if (model.stageMode === "pdf_preview") return <Text>Document attached</Text>;
// otherwise render swipeable photo stage
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/screens/__tests__/TaskDetailScreen.sticky-layout.test.tsx src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx --runInBand`
Expected: PASS

## Task 5: Wire the newest-first thread to the active-entry stage and preserve inline actions

**Files:**
- Modify: `src/components/taskDetail/TaskActivityTimeline.tsx`
- Modify: `src/screens/TaskDetailScreen.tsx`
- Modify: `src/__tests__/integration/TaskDetailScreen.header.test.tsx`
- Modify: `src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
it("keeps the thread newest-first while the pinned stage reflects the active top-most entry", () => {
  const screen = render(<TaskDetailScreen taskId="task-1" onNavigateBack={jest.fn()} />);

  expect(screen.getByTestId("task-detail__active_entry_stage")).toBeTruthy();
  expect(screen.getByTestId("task-detail__workthread_scroll")).toBeTruthy();
});
```

```tsx
it("keeps secondary actions visible inline while hiding edit for non-creators", () => {
  const screen = render(<TaskDetailScreen taskId="task-1" onNavigateBack={jest.fn()} />);

  expect(screen.getByTestId("task-detail__secondary-actions")).toBeTruthy();
  expect(screen.queryByText("Edit Task Details")).toBeNull();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/integration/TaskDetailScreen.header.test.tsx src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx --runInBand`
Expected: FAIL until the stage/thread coupling is updated.

- [ ] **Step 3: Write minimal implementation**

```tsx
<TaskDetailEvidenceStrip
  testID="task-detail__active_entry_stage"
  model={activeStageModel}
/>

<TaskActivityTimeline
  testID="task-detail__activity_thread"
  thread={output.activityThread}
  onVisibleEntryChange={setActiveEntryId}
/>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/__tests__/integration/TaskDetailScreen.header.test.tsx src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx --runInBand`
Expected: PASS

## Task 6: Validate, relaunch, document, and close the refined correction pass

**Files:**
- Modify: `docs/superpowers/specs/2026-07-05-task-detail-correction-design.md`
- Modify: `docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md`
- Modify: `docs/superpowers/plans/2026-07-05-task-detail-correction-implementation.md`

- [ ] **Step 1: Run the focused validation suite**

Run: `npx jest src/navigation/__tests__/uiModeRoutes.test.tsx src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts src/components/taskDetail/__tests__/taskDetailActiveStage.test.ts src/__tests__/integration/TaskDetailScreen.header.test.tsx src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx src/screens/__tests__/TaskDetailScreen.sticky-layout.test.tsx src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx --runInBand && npx tsc --noEmit`
Expected: PASS

- [ ] **Step 2: Relaunch the app for visible verification**

Run: `pkill -f "expo start --dev-client" || true && npx expo start --dev-client --clear`
Expected: Metro restarts and reports `Waiting on http://localhost:8081`

Run: `xcrun simctl launch booted com.buildtrack.app.local`
Expected: simulator launch returns a running process id

- [ ] **Step 3: Capture post-render acceptance evidence**

Run: `xcrun simctl io booted screenshot /tmp/task-detail-active-stage-check.png`
Expected: screenshot capture succeeds after the screen finishes rendering.

- [ ] **Step 4: Update the execution notes**

```md
- hero is now compact and no longer wastes space on project-label text
- the pinned top unit is now an active-entry stage rather than a simple evidence strip
- text-only entries render a neutral no-photo state
- PDF-bearing entries render a document-preview state
- newest-first thread + top-edge activation now drive the stage
```

- [ ] **Step 5: Create the checkpoint commit**

```bash
git add src/navigation/AppNavigator.tsx src/navigation/photoShortcutRoutes.ts src/screens/TaskDetailScreen.tsx src/components/taskDetail/TaskDetailHero.tsx src/components/taskDetail/TaskDetailEvidenceStrip.tsx src/components/taskDetail/TaskActivityTimeline.tsx src/components/taskDetail/taskDetailActiveStage.ts src/ui/contracts/viewAdapters.ts src/ui/viewAdapters/useTaskDetailViewAdapter.ts src/navigation/__tests__/uiModeRoutes.test.tsx src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts src/components/taskDetail/__tests__/taskDetailActiveStage.test.ts src/__tests__/integration/TaskDetailScreen.header.test.tsx src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx src/screens/__tests__/TaskDetailScreen.sticky-layout.test.tsx src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx docs/superpowers/specs/2026-07-05-task-detail-correction-design.md docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md docs/superpowers/plans/2026-07-05-task-detail-correction-implementation.md
git commit -m "fix(ux): refine task detail active-entry stage"
```

## Spec Coverage Check

- dynamic camera + correct back behavior: Task 1
- compact hero + better next-step guidance: Task 2
- newest-first top-edge entry ownership: Task 3
- photo / no-photo / PDF stage modes: Task 4
- inline action visibility + creator-only edit: Task 5
- relaunch + rendered verification: Task 6

## Placeholder Scan

- No `TBD` / `TODO`
- No undefined file paths
- No “similar to above” shortcuts
- Each task includes concrete commands, tests, and expected outputs

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-05-task-detail-correction-implementation.md`.

Because the user explicitly asked to commit and implement, the default next step is immediate execution of this updated plan.
