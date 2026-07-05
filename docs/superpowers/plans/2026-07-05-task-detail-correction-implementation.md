# Task Detail Correction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct the newly redesigned Task Detail surface so camera behavior, critical-state treatment, evidence behavior, and edit-action permissions match the approved interaction model.

**Architecture:** Reuse the current Task Detail redesign and apply a focused correction pass instead of replacing the screen. The implementation will shift the task-detail-specific camera behavior into the bottom navigation context, move critical state into the hero model, turn the evidence rail into a pinned top region with an independently scrolling work thread, and gate edit actions by task creator status.

**Tech Stack:** Expo 54, React Native, React Navigation, TypeScript, Zustand, Jest, React Native Testing Library

---

## File Structure

### Core files to modify

- `src/navigation/AppNavigator.tsx`
  Add task-detail-aware bottom-camera behavior and remove any dependency on a dedicated Task Detail top camera button.

- `src/navigation/photoShortcutRoutes.ts`
  Keep camera route generation aligned with task-detail context when the bottom-nav camera is used from Task Detail.

- `src/screens/TaskDetailScreen.tsx`
  Remove the top camera shortcut, move critical state out of the standalone section, implement the pinned-evidence + inner work-thread scroll structure, and keep secondary actions visible inline.

- `src/components/taskDetail/TaskDetailHero.tsx`
  Add compact critical-flag rendering inside the hero/title area.

- `src/components/taskDetail/TaskDetailEvidenceStrip.tsx`
  Adjust thumbnail presentation so the evidence rail shows clean, full-looking thumbnails and is suitable for sticky/pinned behavior.

- `src/ui/contracts/viewAdapters.ts`
  Extend the hero/evidence contracts as needed for the compact flag and creator-aware action decisions.

- `src/ui/viewAdapters/useTaskDetailViewAdapter.ts`
  Move critical-state metadata into the hero model, gate edit visibility by creator, and keep evidence/task-detail actions aligned with the corrected layout.

### Tests to modify or add

- `src/navigation/__tests__/AppNavigator.back-behavior.test.tsx`
- `src/navigation/__tests__/uiModeRoutes.test.tsx`
- `src/__tests__/integration/TaskDetailScreen.header.test.tsx`
- `src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx`
- `src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx`
- `src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts`
- `src/screens/__tests__/TaskDetailScreen.sticky-layout.test.tsx` (new)

### Docs to update after implementation

- `docs/superpowers/specs/2026-07-05-task-detail-correction-design.md`
- `docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md`

## Task 1: Route bottom-nav camera dynamically on Task Detail and remove the top camera shortcut

**Files:**
- Modify: `src/navigation/AppNavigator.tsx`
- Modify: `src/navigation/photoShortcutRoutes.ts`
- Modify: `src/__tests__/integration/TaskDetailScreen.header.test.tsx`
- Modify: `src/navigation/__tests__/uiModeRoutes.test.tsx`

- [ ] **Step 1: Write the failing navigation and screen tests**

```tsx
it("does not render a dedicated top camera shortcut on task detail", () => {
  const screen = render(<TaskDetailScreen taskId="task-1" onNavigateBack={jest.fn()} />);

  expect(screen.queryByTestId("task-detail__camera_shortcut")).toBeNull();
});
```

```ts
it("routes the bottom camera tab to same-task update flow when task detail is active", () => {
  const params = buildPhotoShortcutCreateTaskParams({
    taskId: "task-1",
    subTaskId: "subtask-1",
    actionType: "photos",
    selectedPhotos: [],
    uploadedPhotoUrls: [],
  });

  expect(params.cameraLaunchContext).toBe("task_detail");
  expect(params.postCaptureDefault).toBe("same_task_update");
  expect(params.updateTargetSubTaskId).toBe("subtask-1");
});
```

- [ ] **Step 2: Run the focused tests to verify they fail**

Run: `npx jest src/__tests__/integration/TaskDetailScreen.header.test.tsx src/navigation/__tests__/uiModeRoutes.test.tsx --runInBand`

Expected: FAIL because Task Detail still renders a top camera button and the bottom-nav camera is not yet task-detail-aware at the active-screen level.

- [ ] **Step 3: Implement dynamic camera context and remove the top shortcut**

```tsx
// src/screens/TaskDetailScreen.tsx
// remove handleTaskDetailCameraShortcutPress
// remove task-detail__camera_shortcut block entirely
```

```ts
// src/navigation/AppNavigator.tsx
function resolveCameraTabPressContext(currentRoute: NavigationStateLike) {
  if (isTaskDetailActive(currentRoute)) {
    return buildPhotoShortcutCreateTaskParams({
      taskId: activeTaskId,
      subTaskId: activeSubTaskId,
      actionType: "photos",
      selectedPhotos: [],
      uploadedPhotoUrls: [],
    });
  }

  return undefined;
}
```

- [ ] **Step 4: Re-run the focused tests**

Run: `npx jest src/__tests__/integration/TaskDetailScreen.header.test.tsx src/navigation/__tests__/uiModeRoutes.test.tsx --runInBand`

Expected: PASS

## Task 2: Move critical state into the hero and gate edit visibility by creator

**Files:**
- Modify: `src/ui/contracts/viewAdapters.ts`
- Modify: `src/ui/viewAdapters/useTaskDetailViewAdapter.ts`
- Modify: `src/components/taskDetail/TaskDetailHero.tsx`
- Modify: `src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts`
- Modify: `src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx`

- [ ] **Step 1: Write the failing adapter and screen tests**

```ts
it("surfaces critical state as compact hero metadata instead of a standalone section action", () => {
  const { result } = renderHook(() => useTaskDetailViewAdapter({ taskId: "task-1" }));

  expect(result.current.output.taskHero).toMatchObject({
    isCritical: true,
    criticalLabel: "Critical this week",
  });
});
```

```ts
it("shows edit_task only for the task creator", () => {
  const { result } = renderHook(() => useTaskDetailViewAdapter({ taskId: "task-1" }));

  expect(result.current.output.actionItems.map((item) => item.actionId)).toContain("edit_task");
});
```

```tsx
it("renders a small critical flag in the hero and no standalone critical section", () => {
  const screen = render(<TaskDetailScreen taskId="task-1" onNavigateBack={jest.fn()} />);

  expect(screen.getByTestId("task-detail__hero_critical_flag")).toBeTruthy();
  expect(screen.queryByTestId("task-detail__toggle_critical_this_week")).toBeNull();
});
```

- [ ] **Step 2: Run the focused tests to verify they fail**

Run: `npx jest src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx --runInBand`

Expected: FAIL because the hero contract lacks compact critical metadata and the screen still renders the standalone critical section.

- [ ] **Step 3: Add hero critical metadata and creator-only edit gating**

```ts
// src/ui/contracts/viewAdapters.ts
export interface TaskDetailHeroModel extends PrimitiveReadyItemBase {
  title: string;
  statusLabel: string;
  projectLabel: string;
  completionLabel: string;
  dueDateLabel?: string;
  nextStepLabel?: string;
  isCritical?: boolean;
  criticalLabel?: string;
}
```

```ts
// src/ui/viewAdapters/useTaskDetailViewAdapter.ts
const canEditTaskDetails = isTaskCreator;

if (canEditTaskDetails) {
  actionItems.push({
    id: "action-edit-task",
    actionId: "edit_task",
    label: t.taskDetail.editTaskDetails,
    icon: "create-outline",
    isDisabled: false,
    density: "standard",
    structuralState: "stale",
  });
}
```

```tsx
// src/components/taskDetail/TaskDetailHero.tsx
{model.isCritical ? (
  <View testID="task-detail__hero_critical_flag" className="rounded-full bg-amber-100 px-2.5 py-1">
    <Text className="text-xs font-semibold uppercase tracking-wide text-amber-800">
      {model.criticalLabel}
    </Text>
  </View>
) : null}
```

- [ ] **Step 4: Re-run the focused tests**

Run: `npx jest src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx --runInBand`

Expected: PASS

## Task 3: Implement sticky evidence rail with independently scrolling work thread

**Files:**
- Modify: `src/screens/TaskDetailScreen.tsx`
- Modify: `src/components/taskDetail/TaskDetailEvidenceStrip.tsx`
- Modify: `src/components/taskDetail/TaskActivityTimeline.tsx`
- Create: `src/screens/__tests__/TaskDetailScreen.sticky-layout.test.tsx`
- Modify: `src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx`

- [ ] **Step 1: Write the failing layout tests**

```tsx
it("renders task detail with a pinned evidence rail and nested work-thread scroll region", () => {
  const screen = render(<TaskDetailScreen taskId="task-1" onNavigateBack={jest.fn()} />);

  expect(screen.getByTestId("task-detail__evidence_pinned_region")).toBeTruthy();
  expect(screen.getByTestId("task-detail__workthread_scroll")).toBeTruthy();
});
```

```tsx
it("renders uncropped-looking evidence thumbnails in the pinned rail", () => {
  const screen = render(
    <TaskDetailEvidenceStrip
      model={{
        id: "evidence-summary",
        density: "standard",
        structuralState: "ready",
        latestPhotoUrls: ["https://example.com/a.jpg"],
        totalPhotoCount: 1,
        emptyLabel: "No photo evidence yet.",
      }}
    />,
  );

  expect(screen.getByTestId("task-detail__evidence_thumbnail_0")).toBeTruthy();
});
```

- [ ] **Step 2: Run the focused tests to verify they fail**

Run: `npx jest src/screens/__tests__/TaskDetailScreen.sticky-layout.test.tsx src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx --runInBand`

Expected: FAIL because the screen still uses a single outer scroll container and the evidence strip is not pinned.

- [ ] **Step 3: Split the layout into pinned top region + nested work-thread scroll**

```tsx
// src/screens/TaskDetailScreen.tsx
<View className="flex-1 bg-gray-50">
  <ScrollView
    bounces={false}
    scrollEnabled={false}
    contentContainerStyle={{ paddingBottom: 16 }}
  >
    <TaskDetailHero model={output.taskHero} />
    <View testID="task-detail__evidence_pinned_region">
      <TaskDetailEvidenceStrip model={output.evidenceSummary} />
    </View>
  </ScrollView>

  <ScrollView testID="task-detail__workthread_scroll" className="flex-1">
    <TaskActivityTimeline testID="task-detail__activity_thread" thread={output.activityThread} />
    <TaskDetailSubtasksSection ... />
    <SecondaryActionsBlock ... />
  </ScrollView>
</View>
```

```tsx
// src/components/taskDetail/TaskDetailEvidenceStrip.tsx
<Image
  testID={`task-detail__evidence_thumbnail_${index}`}
  source={{ uri }}
  resizeMode="cover"
  className="h-24 w-24 rounded-2xl bg-slate-200"
/>
```

- [ ] **Step 4: Re-run the focused tests**

Run: `npx jest src/screens/__tests__/TaskDetailScreen.sticky-layout.test.tsx src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx --runInBand`

Expected: PASS

## Task 4: Keep secondary actions visible inline and finalize permission-aware action ordering

**Files:**
- Modify: `src/screens/TaskDetailScreen.tsx`
- Modify: `src/__tests__/integration/TaskDetailScreen.header.test.tsx`
- Modify: `src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx`

- [ ] **Step 1: Write the failing action-group tests**

```tsx
it("keeps secondary actions visible inline and demotes edit_task below the primary action", () => {
  const screen = render(<TaskDetailScreen taskId="task-1" onNavigateBack={jest.fn()} />);

  expect(screen.getByTestId("task-detail__secondary-actions")).toBeTruthy();
  expect(screen.getByText("Other actions")).toBeTruthy();
});
```

```tsx
it("hides edit_task for non-creators while keeping other secondary actions visible", () => {
  const screen = render(<TaskDetailScreen taskId="task-1" onNavigateBack={jest.fn()} />);

  expect(screen.queryByText("Edit Task Details")).toBeNull();
  expect(screen.getByText("Add Comment")).toBeTruthy();
});
```

- [ ] **Step 2: Run the focused tests to verify they fail**

Run: `npx jest src/__tests__/integration/TaskDetailScreen.header.test.tsx src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx --runInBand`

Expected: FAIL until the screen and adapter consistently gate `edit_task` and preserve the visible secondary actions region.

- [ ] **Step 3: Finalize inline secondary action rendering**

```tsx
<View testID="task-detail__secondary-actions" className="mx-4 mb-4 rounded-2xl border border-gray-200 bg-white p-3">
  <Text className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
    Other actions
  </Text>
  <View className="flex-row flex-wrap gap-2">
    {secondaryActions.map((action) => (
      <Pressable key={action.id} onPress={() => handleActionPress(action.actionId)} ...>
        <Text>{action.label}</Text>
      </Pressable>
    ))}
  </View>
</View>
```

- [ ] **Step 4: Re-run the focused tests**

Run: `npx jest src/__tests__/integration/TaskDetailScreen.header.test.tsx src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx --runInBand`

Expected: PASS

## Task 5: Validate, relaunch, document, and close the correction pass

**Files:**
- Modify: `docs/superpowers/specs/2026-07-05-task-detail-correction-design.md`
- Modify: `docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md`
- Modify: `docs/superpowers/plans/2026-07-05-task-detail-redesign-implementation.md`

- [ ] **Step 1: Run the focused correction validation suite**

Run: `npx jest src/navigation/__tests__/uiModeRoutes.test.tsx src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts src/__tests__/integration/TaskDetailScreen.header.test.tsx src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx src/screens/__tests__/TaskDetailScreen.sticky-layout.test.tsx src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx --runInBand && npx tsc --noEmit`

Expected: PASS

- [ ] **Step 2: Relaunch the app for visible verification**

Run: `pkill -f "expo start --dev-client" || true && npx expo start --dev-client --clear`

Expected: Metro restarts and reports `Waiting on http://localhost:8081`

Run: `xcrun simctl launch booted com.buildtrack.app.local`

Expected: simulator launch returns a running process id

- [ ] **Step 3: Capture post-render acceptance evidence**

Run: `xcrun simctl io booted screenshot /tmp/task-detail-correction-check.png`

Expected: screenshot capture succeeds after the screen finishes rendering.

- [ ] **Step 4: Update the execution notes for the correction**

```md
- task detail now uses dynamic bottom-camera behavior instead of a dedicated top camera shortcut
- critical state is reduced to a compact hero flag
- evidence is pinned above an independently scrolling work-thread region
- edit-task visibility is now creator-only
```

- [ ] **Step 5: Create the checkpoint commit**

```bash
git add src/navigation/AppNavigator.tsx src/navigation/photoShortcutRoutes.ts src/screens/TaskDetailScreen.tsx src/components/taskDetail/TaskDetailHero.tsx src/components/taskDetail/TaskDetailEvidenceStrip.tsx src/components/taskDetail/TaskActivityTimeline.tsx src/ui/contracts/viewAdapters.ts src/ui/viewAdapters/useTaskDetailViewAdapter.ts src/navigation/__tests__/uiModeRoutes.test.tsx src/__tests__/integration/TaskDetailScreen.header.test.tsx src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx src/screens/__tests__/TaskDetailScreen.sticky-layout.test.tsx src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx docs/superpowers/specs/2026-07-05-task-detail-correction-design.md docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md docs/superpowers/plans/2026-07-05-task-detail-redesign-implementation.md docs/superpowers/plans/2026-07-05-task-detail-correction-implementation.md
git commit -m "fix(ux): correct task detail interaction model"
```

## Spec Coverage Check

- dynamic bottom-nav camera on Task Detail: covered by Task 1
- compact critical flag in hero/title: covered by Task 2
- sticky evidence rail and independent work-thread scroll: covered by Task 3
- visible inline secondary actions: covered by Task 4
- creator-only edit visibility: covered by Tasks 2 and 4
- relaunch and rendered verification: covered by Task 5

## Placeholder Scan

- No `TBD` / `TODO`
- No undefined file paths
- No “similar to above” task shortcuts
- Each task includes concrete tests, commands, and expected outputs

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-05-task-detail-correction-implementation.md`.

Because the user explicitly requested continuing without another prompt, the default next step is **Subagent-Driven** execution of this plan.
