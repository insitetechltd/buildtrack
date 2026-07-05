# Task Detail Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign Task Detail into a lighter visual work-thread surface that preserves workflow controls, camera-update continuity, delegation clarity, photo evidence visibility, and subtask drill-in behavior.

**Architecture:** Keep the existing task-detail route structure and Supabase-backed actions, but refactor the task-detail view adapter so it exposes explicit hero, delegation, evidence, activity, and subtask models instead of relying mostly on generic detail sections. Recompose the screen around those explicit models, upgrade the activity timeline for clearer event labeling, and preserve all current navigation and action wiring.

**Tech Stack:** Expo 54, React Native 0.81, React Navigation, TypeScript, Zustand, Jest, React Native Testing Library

---

## File Structure

### Core files to modify

- `src/ui/contracts/viewAdapters.ts`
  Add explicit task-detail section contracts for hero, delegation summary, evidence summary, activity thread rows, and subtask summary.

- `src/ui/viewAdapters/useTaskDetailViewAdapter.ts`
  Normalize task-detail output into the new contracts and generate clearer activity/event labels from task/activity data.

- `src/screens/TaskDetailScreen.tsx`
  Recompose the screen into the approved visual work-thread surface and preserve current action routing behavior.

- `src/components/taskDetail/TaskActivityTimeline.tsx`
  Upgrade timeline readability and media/event presentation for the new activity row model.

### Likely new components

- `src/components/taskDetail/TaskDetailHero.tsx`
  Render the task header/status/owner/next-step summary.

- `src/components/taskDetail/TaskDetailDelegationCard.tsx`
  Render primary owner, assigner, assignees, and delegation summary.

- `src/components/taskDetail/TaskDetailEvidenceStrip.tsx`
  Render latest task/update photos or empty-state evidence summary.

- `src/components/taskDetail/TaskDetailSubtasksSection.tsx`
  Render subtasks in the redesigned visual grouping while preserving drill-in.

### Tests to add or modify

- `src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts`
- `src/__tests__/integration/TaskDetailScreen.header.test.tsx`
- `src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx`
- `src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx`

### Docs to update after implementation

- `documentation/ROADMAP.md`
- `docs/INSITE_UI_UX_SOURCE_OF_TRUTH.md`
- `docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md`

## Task 1: Define explicit task-detail redesign contracts

**Files:**
- Modify: `src/ui/contracts/viewAdapters.ts`
- Modify: `src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts`

- [ ] **Step 1: Write the failing adapter contract tests**

```ts
it("returns explicit task-detail redesign groups for the visual work-thread surface", () => {
  const result = renderHook(() =>
    useTaskDetailViewAdapter({ taskId: "task-1" }),
  );

  expect(result.current.output.taskHero).toBeDefined();
  expect(result.current.output.delegationSummary).toBeDefined();
  expect(result.current.output.evidenceSummary).toBeDefined();
  expect(Array.isArray(result.current.output.activityThread)).toBe(true);
  expect(result.current.output.subtaskSummary).toBeDefined();
});
```

```ts
it("keeps legacy actionItems while exposing redesigned task-detail groups", () => {
  const result = renderHook(() =>
    useTaskDetailViewAdapter({ taskId: "task-1" }),
  );

  expect(Array.isArray(result.current.output.actionItems)).toBe(true);
  expect(result.current.output.taskHero.title).toBeTruthy();
});
```

- [ ] **Step 2: Run the focused adapter contract test and verify it fails**

Run: `npx jest src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts --runInBand`

Expected: FAIL because `TaskDetailScreenViewAdapterOutput` does not yet expose `taskHero`, `delegationSummary`, `evidenceSummary`, `activityThread`, or `subtaskSummary`.

- [ ] **Step 3: Add the redesign output contracts**

```ts
export interface TaskDetailHeroModel extends PrimitiveReadyItemBase {
  title: string;
  statusLabel: string;
  projectLabel: string;
  completionLabel: string;
  dueDateLabel?: string;
  nextStepLabel?: string;
}

export interface TaskDetailDelegationSummaryModel extends PrimitiveReadyItemBase {
  assignedByLabel: string;
  assignedToLabel: string;
  primaryOwnerLabel?: string;
  teamSummaryLabel?: string;
}

export interface TaskDetailEvidenceSummaryModel extends PrimitiveReadyItemBase {
  latestPhotoUrls: string[];
  totalPhotoCount: number;
  emptyLabel: string;
}

export interface TaskDetailActivityThreadRow extends PrimitiveReadyItemBase {
  id: string;
  actorLabel: string;
  eventLabel: string;
  timestampLabel: string;
  detailLabel?: string;
  photoUrls: string[];
  statusLabel?: string;
}

export interface TaskDetailSubtaskSummaryModel extends PrimitiveReadyItemBase {
  title: string;
  totalCount: number;
}
```

```ts
export interface TaskDetailScreenViewAdapterOutput {
  ...
  taskHero: TaskDetailHeroModel;
  delegationSummary: TaskDetailDelegationSummaryModel;
  evidenceSummary: TaskDetailEvidenceSummaryModel;
  activityThread: TaskDetailActivityThreadRow[];
  subtaskSummary: TaskDetailSubtaskSummaryModel;
}
```

- [ ] **Step 4: Re-run the focused adapter contract test**

Run: `npx jest src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts --runInBand`

Expected: PASS

## Task 2: Normalize task detail data into readable hero, delegation, evidence, and activity models

**Files:**
- Modify: `src/ui/viewAdapters/useTaskDetailViewAdapter.ts`
- Modify: `src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts`

- [ ] **Step 1: Write the failing data-normalization tests**

```ts
it("maps task activities into readable work-thread events", () => {
  const result = renderHook(() =>
    useTaskDetailViewAdapter({ taskId: "task-1" }),
  );

  expect(result.current.output.activityThread[0]).toEqual(
    expect.objectContaining({
      actorLabel: expect.any(String),
      eventLabel: expect.any(String),
      timestampLabel: expect.any(String),
    }),
  );
});
```

```ts
it("surfaces latest photo evidence in the redesigned evidence summary", () => {
  const result = renderHook(() =>
    useTaskDetailViewAdapter({ taskId: "task-1" }),
  );

  expect(result.current.output.evidenceSummary.totalPhotoCount).toBeGreaterThanOrEqual(0);
  expect(Array.isArray(result.current.output.evidenceSummary.latestPhotoUrls)).toBe(true);
});
```

- [ ] **Step 2: Run the focused adapter test and verify it fails**

Run: `npx jest src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts --runInBand`

Expected: FAIL because the adapter still exposes raw/weak activity descriptions and does not yet build the explicit redesign models.

- [ ] **Step 3: Add normalized model builders to the adapter**

```ts
const activityThread: TaskDetailActivityThreadRow[] = (task.activities || []).map((activity) => ({
  id: activity.id,
  density: "standard",
  structuralState: "ready",
  actorLabel: getUserById(activity.userId)?.name || "Unknown User",
  eventLabel: buildTaskDetailEventLabel(activity),
  timestampLabel: dateFormatter.formatDateTimeShort(activity.timestamp),
  detailLabel: buildTaskDetailEventDetail(activity),
  photoUrls: activity.data?.photos || [],
  statusLabel: activity.status ? getStatusLabel(activity.status) : undefined,
}));
```

```ts
const evidenceSummary: TaskDetailEvidenceSummaryModel = {
  id: "evidence-summary",
  density: "standard",
  structuralState: "ready",
  latestPhotoUrls: collectLatestTaskPhotoUrls(task, activityThread),
  totalPhotoCount: collectTotalTaskPhotoCount(task, activityThread),
  emptyLabel: "No photo evidence yet.",
};
```

```ts
const taskHero: TaskDetailHeroModel = {
  id: "task-hero",
  density: "standard",
  structuralState: "ready",
  title: task.title,
  statusLabel: getStatusLabel(task.status),
  projectLabel: task.projectId,
  completionLabel: `${task.completionPercentage ?? 0}% complete`,
  dueDateLabel: task.dueDate ? dateFormatter.formatDateShort(task.dueDate) : undefined,
  nextStepLabel: buildNextStepLabel(task, isAssignedToMe, isTaskCreator),
};
```

- [ ] **Step 4: Re-run the focused adapter test**

Run: `npx jest src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts --runInBand`

Expected: PASS

## Task 3: Recompose Task Detail into the visual work-thread surface

**Files:**
- Create: `src/components/taskDetail/TaskDetailHero.tsx`
- Create: `src/components/taskDetail/TaskDetailDelegationCard.tsx`
- Create: `src/components/taskDetail/TaskDetailEvidenceStrip.tsx`
- Create: `src/components/taskDetail/TaskDetailSubtasksSection.tsx`
- Modify: `src/screens/TaskDetailScreen.tsx`
- Modify: `src/__tests__/integration/TaskDetailScreen.header.test.tsx`
- Create: `src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx`

- [ ] **Step 1: Write the failing screen redesign tests**

```tsx
it("renders task detail as a work-thread surface with hero, delegation, evidence, activity, and subtasks", () => {
  const screen = render(
    <TaskDetailScreen taskId="task-1" onNavigateBack={jest.fn()} />,
  );

  expect(screen.getByTestId("task-detail__hero")).toBeTruthy();
  expect(screen.getByTestId("task-detail__delegation_summary")).toBeTruthy();
  expect(screen.getByTestId("task-detail__evidence_summary")).toBeTruthy();
  expect(screen.getByTestId("task-detail__activity_thread")).toBeTruthy();
});
```

```tsx
it("keeps the in-task camera shortcut and primary action visible in the redesigned layout", () => {
  const screen = render(
    <TaskDetailScreen taskId="task-1" onNavigateBack={jest.fn()} />,
  );

  expect(screen.getByTestId("task-detail__camera_shortcut")).toBeTruthy();
  expect(screen.getByTestId("task-detail__primary_action_bar")).toBeTruthy();
});
```

- [ ] **Step 2: Run the focused task-detail screen tests and verify they fail**

Run: `npx jest src/__tests__/integration/TaskDetailScreen.header.test.tsx src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx --runInBand`

Expected: FAIL because the screen still renders generic detail sections/people blocks instead of the explicit redesign structure.

- [ ] **Step 3: Create the hero, delegation, evidence, and subtasks components**

```tsx
export default function TaskDetailHero({ model }: { model: TaskDetailHeroModel }) {
  return (
    <View testID="task-detail__hero" className="mx-4 rounded-3xl bg-white p-5">
      <Text className="text-3xl font-semibold text-slate-900">{model.title}</Text>
      <Text className="mt-2 text-base text-slate-500">{model.statusLabel}</Text>
      <Text className="mt-1 text-sm text-slate-400">{model.completionLabel}</Text>
    </View>
  );
}
```

- [ ] **Step 4: Replace the generic section stack in `TaskDetailScreen`**

```tsx
<TaskDetailHero model={output.taskHero} />
<TaskDetailDelegationCard model={output.delegationSummary} />
<TaskDetailEvidenceStrip model={output.evidenceSummary} />
<TaskActivityTimeline
  testID="task-detail__activity_thread"
  activities={output.activityThread}
/>
<TaskDetailSubtasksSection
  model={output.subtaskSummary}
  childTasks={output.childTasks}
  onNavigateToTaskDetail={props.onNavigateToTaskDetail}
/>
```

- [ ] **Step 5: Re-run the focused task-detail screen tests**

Run: `npx jest src/__tests__/integration/TaskDetailScreen.header.test.tsx src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx --runInBand`

Expected: PASS

## Task 4: Upgrade the activity timeline into a clearer work-thread

**Files:**
- Modify: `src/components/taskDetail/TaskActivityTimeline.tsx`
- Create: `src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx`

- [ ] **Step 1: Write the failing timeline tests**

```tsx
it("renders event labels, actor labels, timestamps, and photo evidence clearly", () => {
  const screen = render(
    <TaskActivityTimeline
      activities={[
        {
          id: "activity-1",
          actorLabel: "Tristan",
          eventLabel: "Submitted task for review",
          timestampLabel: "Jul 5, 09:30",
          detailLabel: "Marked 100% complete",
          photoUrls: ["https://example.com/photo-1.jpg"],
          density: "standard",
          structuralState: "ready",
        },
      ]}
    />,
  );

  expect(screen.getByText("Submitted task for review")).toBeTruthy();
  expect(screen.getByText("Tristan")).toBeTruthy();
  expect(screen.getByText("Jul 5, 09:30")).toBeTruthy();
});
```

- [ ] **Step 2: Run the focused timeline test and verify it fails**

Run: `npx jest src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx --runInBand`

Expected: FAIL because the timeline still assumes the older activity shape or does not emphasize the redesign labels clearly.

- [ ] **Step 3: Rebuild the timeline row presentation**

```tsx
<View className="mb-4 flex-row">
  <View className="mr-3 mt-1 h-2.5 w-2.5 rounded-full bg-blue-500" />
  <View className="flex-1">
    <Text className="text-sm font-semibold uppercase tracking-wide text-slate-400">{activity.timestampLabel}</Text>
    <Text className="mt-1 text-lg font-semibold text-slate-900">{activity.eventLabel}</Text>
    <Text className="mt-1 text-base text-slate-600">{activity.actorLabel}</Text>
    {activity.detailLabel ? <Text className="mt-1 text-base text-slate-500">{activity.detailLabel}</Text> : null}
  </View>
</View>
```

- [ ] **Step 4: Re-run the focused timeline test**

Run: `npx jest src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx --runInBand`

Expected: PASS

## Task 5: Validate, relaunch, document, and close the slice

**Files:**
- Modify: `documentation/ROADMAP.md`
- Modify: `docs/INSITE_UI_UX_SOURCE_OF_TRUTH.md`
- Modify: `docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md`

- [ ] **Step 1: Run the focused validation suite**

Run: `npx jest src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts src/__tests__/integration/TaskDetailScreen.header.test.tsx src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx --runInBand && npx tsc --noEmit`

Expected: PASS

- [ ] **Step 2: Update docs and roadmap for the task-detail redesign slice**

```md
| WS-UX / M-UX-01 / S-UX-01G | Task detail redesign | Closed | S-UX-01F | 14.8 | ../docs/superpowers/plans/2026-07-05-task-detail-redesign-implementation.md |
```

```md
- task detail now renders as a visual work-thread surface
- delegation summary, evidence summary, and readable activity rows are promoted
- same-task camera update behavior remains preserved
```

- [ ] **Step 3: Assess whether relaunch is required**

Run: `ps -ax | grep -E "expo start --dev-client|metro" | grep -v grep`

Expected: existing server/process state is visible so relaunch need can be assessed explicitly.

- [ ] **Step 4: Relaunch the app because this slice changes a user-visible navigation destination**

Run: `pkill -f "expo start --dev-client" || true && npx expo start --dev-client --clear`
Expected: Metro restarts and reports `Waiting on http://localhost:8081`

Run: `xcrun simctl launch booted com.buildtrack.app.local`
Expected: simulator launch returns a running process id

- [ ] **Step 5: Verify relaunch succeeded before marking the slice closed**

Run: `xcrun simctl list devices booted`
Expected: at least one simulator remains booted

Run: `xcrun simctl io booted screenshot /tmp/task-detail-redesign-check.png`
Expected: screenshot capture succeeds for visual acceptance

- [ ] **Step 6: Create the checkpoint commit**

```bash
git add src/ui/contracts/viewAdapters.ts src/ui/viewAdapters/useTaskDetailViewAdapter.ts src/screens/TaskDetailScreen.tsx src/components/taskDetail/TaskActivityTimeline.tsx src/components/taskDetail/TaskDetailHero.tsx src/components/taskDetail/TaskDetailDelegationCard.tsx src/components/taskDetail/TaskDetailEvidenceStrip.tsx src/components/taskDetail/TaskDetailSubtasksSection.tsx src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts src/__tests__/integration/TaskDetailScreen.header.test.tsx src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx documentation/ROADMAP.md docs/INSITE_UI_UX_SOURCE_OF_TRUTH.md docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md docs/superpowers/plans/2026-07-05-task-detail-redesign-implementation.md
git commit -m "feat(ux): redesign task detail surface"
```

## Spec Coverage Check

- visual work-thread surface: covered by Tasks 1 to 4
- delegation summary clarity: covered by Tasks 1 to 3
- activity log clarity: covered by Tasks 2 and 4
- photo evidence emphasis: covered by Tasks 2 and 3
- subtask context: covered by Task 3
- preserved workflow logic and in-task camera update path: covered by Task 3 and validated in Task 5
- relaunch assessment and verification before close: covered by Task 5

## Placeholder Scan

- No `TBD` / `TODO`
- No unnamed files
- No “implement later” placeholders inside tasks
- Each task includes concrete files, commands, and expected outcomes

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-05-task-detail-redesign-implementation.md`.

Default execution mode: **Subagent-Driven**.

- I dispatch a fresh subagent per task
- I review between tasks
- inline execution should be used only if the user explicitly requests it
