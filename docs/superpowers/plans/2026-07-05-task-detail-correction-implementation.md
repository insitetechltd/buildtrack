# Task Detail Sticky-Hero Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework Task Detail so only the hero stays sticky, description/delegation/details collapse into one scrolling info card, and subtask progress is folded into the main chronological work thread.

**Architecture:** Keep the current Task Detail camera routing and thread styling direction, but rebalance the page structure. The implementation will introduce a dedicated merged info-card model/component, remove the separate subtasks section, extend thread rows with lightweight subtask context, and build one newest-first chronological activity feed that combines parent-task and child-task updates.

**Tech Stack:** Expo 54, React Native, React Navigation, TypeScript, Zustand, Jest, React Native Testing Library

---

## File Structure

### Core files to modify

- `src/ui/contracts/viewAdapters.ts`
  Add a dedicated merged info-card model and extend thread rows with optional subtask context fields.

- `src/ui/viewAdapters/useTaskDetailViewAdapter.ts`
  Build the merged info-card data, fold child-task activities into the main activity thread, and stop producing screen output that depends on the separate subtasks card.

- `src/components/taskDetail/TaskDetailHero.tsx`
  Keep the hero visually compact so it works as the only sticky element.

- `src/components/taskDetail/TaskDetailInfoCard.tsx`
  New component for the single scrolling merged card that contains description, delegation, and compact details.

- `src/components/taskDetail/TaskActivityTimeline.tsx`
  Render lightweight subtask context inside chronological thread entries without creating a separate section, preserve full-image visibility for lead photos, and open a full-photo viewer when a thread photo is tapped.

- `src/screens/TaskDetailScreen.tsx`
  Make the hero the only sticky element, render the merged info card below it in scroll content, remove the separate subtasks card, and keep the unified thread as the page body.

### Tests to modify or add

- `src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts`
- `src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx`
- `src/screens/__tests__/TaskDetailScreen.sticky-layout.test.tsx`
- `src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx`
- `src/__tests__/integration/TaskDetailScreen.header.test.tsx`

### Docs to update after implementation

- `docs/superpowers/specs/2026-07-05-task-detail-correction-design.md`
- `docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md`

## Task 1: Add merged info-card and subtask thread context to the adapter contract

**Files:**
- Modify: `src/ui/contracts/viewAdapters.ts`
- Modify: `src/ui/viewAdapters/useTaskDetailViewAdapter.ts`
- Modify: `src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
it("builds one merged info card that combines description, delegation, and compact details", () => {
  const { result } = renderHook(() => useTaskDetailViewAdapter({ taskId: "task-parent" }));

  expect(result.current.output.infoCard).toMatchObject({
    descriptionLabel: "Confirm supplier lead times before final delivery.",
    assignedByLabel: "User user-1",
    assignedToLabel: "User user-2, User user-3",
    detailRows: expect.arrayContaining([
      expect.objectContaining({ label: "Due", value: "Oct 12, 2026" }),
    ]),
  });
});
```

```ts
it("marks child-task activity rows with lightweight subtask context inside the main activity thread", () => {
  const { result } = renderHook(() => useTaskDetailViewAdapter({ taskId: "task-parent" }));

  expect(result.current.output.activityThread).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        subtaskTitleLabel: "Install ceiling grid",
        subtaskBadgeLabel: "Subtask",
      }),
    ]),
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts --runInBand`

Expected: FAIL because the adapter does not yet expose a merged info-card model or subtask thread context.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/ui/contracts/viewAdapters.ts
export interface TaskDetailInfoCardRow {
  id: string;
  label: string;
  value: string;
}

export interface TaskDetailInfoCardModel extends PrimitiveReadyItemBase {
  descriptionLabel?: string;
  assignedByLabel?: string;
  assignedToLabel?: string;
  primaryOwnerLabel?: string;
  detailRows: TaskDetailInfoCardRow[];
}

export interface TaskDetailActivityThreadRow extends PrimitiveReadyItemBase {
  id: string;
  actorLabel: string;
  eventLabel: string;
  timestampLabel: string;
  progressLabel: string;
  detailLabel?: string;
  photoUrls: string[];
  statusLabel?: string;
  subtaskBadgeLabel?: string;
  subtaskTitleLabel?: string;
}
```

```ts
// src/ui/viewAdapters/useTaskDetailViewAdapter.ts
const infoCard: TaskDetailInfoCardModel = {
  id: "task-info-card",
  density: "standard",
  structuralState: "stale",
  descriptionLabel: task.description || "",
  assignedByLabel: delegationSummary.assignedByLabel,
  assignedToLabel: delegationSummary.assignedToLabel,
  primaryOwnerLabel: delegationSummary.primaryOwnerLabel,
  detailRows: [
    { id: "row-due", label: t.taskDetail.due, value: dateFormatter.formatDateShort(task.dueDate) },
    { id: "row-category", label: "Category", value: task.category || "General" },
  ],
};
```

```ts
// src/ui/viewAdapters/useTaskDetailViewAdapter.ts
const childTaskActivities = childTasksData.flatMap((childTask) =>
  (childTask.activities || []).map((activity) => ({
    activity,
    childTask,
  })),
);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts --runInBand`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ui/contracts/viewAdapters.ts src/ui/viewAdapters/useTaskDetailViewAdapter.ts src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts
git commit -m "fix(ux): add task detail info card and subtask thread context"
```

## Task 2: Build the scrolling merged info card component

**Files:**
- Create: `src/components/taskDetail/TaskDetailInfoCard.tsx`
- Modify: `src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
it("renders one scrolling info card containing description, delegation, and compact details", () => {
  const screen = render(<TaskDetailScreen taskId="task-1" onNavigateBack={jest.fn()} />);

  expect(screen.getByTestId("task-detail__info_card")).toBeTruthy();
  expect(screen.getByText("Description")).toBeTruthy();
  expect(screen.getByText("Delegation")).toBeTruthy();
  expect(screen.getByText("Details")).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx --runInBand`

Expected: FAIL because no merged info-card component exists yet.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/components/taskDetail/TaskDetailInfoCard.tsx
interface TaskDetailInfoCardProps {
  model: TaskDetailInfoCardModel;
}

export default function TaskDetailInfoCard({ model }: TaskDetailInfoCardProps) {
  return (
    <View testID="task-detail__info_card" className="mx-4 mt-4 rounded-3xl border border-slate-200 bg-white p-4">
      {model.descriptionLabel ? (
        <View>
          <Text className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Description</Text>
          <Text className="mt-2 text-sm leading-5 text-slate-700">{model.descriptionLabel}</Text>
        </View>
      ) : null}

      <View className="mt-4">
        <Text className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Delegation</Text>
        <Text className="mt-2 text-sm text-slate-700">{model.assignedByLabel} → {model.assignedToLabel}</Text>
      </View>

      <View className="mt-4">
        <Text className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Details</Text>
        {model.detailRows.map((row) => (
          <View key={row.id} className="mt-2 flex-row items-center justify-between">
            <Text className="text-sm text-slate-500">{row.label}</Text>
            <Text className="text-sm font-medium text-slate-800">{row.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx --runInBand`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/taskDetail/TaskDetailInfoCard.tsx src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx
git commit -m "fix(ux): add scrolling task detail info card"
```

## Task 3: Make the hero the only sticky surface and remove separate subtasks/details cards

**Files:**
- Modify: `src/screens/TaskDetailScreen.tsx`
- Modify: `src/screens/__tests__/TaskDetailScreen.sticky-layout.test.tsx`
- Modify: `src/__tests__/integration/TaskDetailScreen.header.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
it("keeps only the hero sticky while the info card scrolls with the page", () => {
  const screen = render(<TaskDetailScreen taskId="task-1" onNavigateBack={jest.fn()} />);
  const scrollView = screen.getByTestId("task-detail__workthread_scroll");

  expect(scrollView.props.stickyHeaderIndices).toEqual([0]);
  expect(screen.getByTestId("task-detail__hero")).toBeTruthy();
  expect(screen.getByTestId("task-detail__info_card")).toBeTruthy();
});
```

```tsx
it("does not render separate subtasks or detail-section cards once info is merged into the new layout", () => {
  const screen = render(<TaskDetailScreen taskId="task-1" onNavigateBack={jest.fn()} />);

  expect(screen.queryByTestId("task-detail__subtasks")).toBeNull();
  expect(screen.queryByText("Subtasks")).toBeNull();
  expect(screen.queryByText("Description")).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/screens/__tests__/TaskDetailScreen.sticky-layout.test.tsx src/__tests__/integration/TaskDetailScreen.header.test.tsx --runInBand`

Expected: FAIL because the screen currently renders the thread before separate detail sections and does not keep only the hero sticky.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/screens/TaskDetailScreen.tsx
<ScrollView
  testID="task-detail__workthread_scroll"
  stickyHeaderIndices={[0]}
  className="flex-1"
  contentContainerStyle={{ paddingBottom: 32 }}
  showsVerticalScrollIndicator={false}
>
  <View>
    <TaskDetailHero model={output.taskHero} />
  </View>

  <TaskDetailInfoCard model={output.infoCard} />

  <TaskActivityTimeline
    testID="task-detail__activity_thread"
    thread={output.activityThread}
  />

  <View testID="task-detail__secondary-actions">{/* existing actions */}</View>
</ScrollView>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/screens/__tests__/TaskDetailScreen.sticky-layout.test.tsx src/__tests__/integration/TaskDetailScreen.header.test.tsx --runInBand`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/screens/TaskDetailScreen.tsx src/screens/__tests__/TaskDetailScreen.sticky-layout.test.tsx src/__tests__/integration/TaskDetailScreen.header.test.tsx
git commit -m "fix(ux): make task detail hero the only sticky section"
```

## Task 4: Fold subtask progress into the main chronological thread

**Files:**
- Modify: `src/ui/viewAdapters/useTaskDetailViewAdapter.ts`
- Modify: `src/components/taskDetail/TaskActivityTimeline.tsx`
- Modify: `src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx`
- Modify: `src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx`

- [ ] **Step 1: Write the failing tests**

```tsx
it("renders subtask updates as normal thread entries with lightweight subtask context", () => {
  const screen = render(
    <TaskActivityTimeline
      thread={[
        {
          id: "activity-2",
          actorLabel: "Tristan",
          timestampLabel: "Jul 5, 09:30",
          progressLabel: "40%",
          detailLabel: "Ceiling grid installed.",
          photoUrls: [],
          subtaskBadgeLabel: "Subtask",
          subtaskTitleLabel: "Install ceiling grid",
          density: "standard",
          structuralState: "ready",
          eventLabel: "Marked 40% complete",
        },
      ]}
    />,
  );

  expect(screen.getByText("Subtask")).toBeTruthy();
  expect(screen.getByText("Install ceiling grid")).toBeTruthy();
});
```

```ts
it("merges parent-task and child-task activities into one newest-first activity thread", () => {
  const { result } = renderHook(() => useTaskDetailViewAdapter({ taskId: "task-parent" }));

  expect(result.current.output.activityThread[0].timestampLabel).toBe("Oct 10, 2026, 4:15 PM");
  expect(result.current.output.activityThread).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ subtaskTitleLabel: "Install ceiling grid" }),
    ]),
  );
});
```

```tsx
it("shows the full lead photo preview and opens a full-photo viewer when the image is tapped", () => {
  const screen = render(
    <TaskActivityTimeline
      thread={[
        {
          id: "activity-2",
          actorLabel: "Tristan",
          timestampLabel: "Jul 5, 09:30",
          progressLabel: "40%",
          detailLabel: "Ceiling grid installed.",
          photoUrls: ["https://example.com/photo-1.jpg", "https://example.com/photo-2.jpg"],
          subtaskBadgeLabel: "Subtask",
          subtaskTitleLabel: "Install ceiling grid",
          density: "standard",
          structuralState: "ready",
          eventLabel: "Marked 40% complete",
        },
      ]}
    />,
  );

  fireEvent.press(screen.getByTestId("task-activity-timeline__lead-photo-pressable-activity-2"));

  expect(screen.getByTestId("task-activity-timeline__photo_viewer")).toBeTruthy();
  expect(screen.getByTestId("task-activity-timeline__photo_viewer_image").props.source).toEqual({
    uri: "https://example.com/photo-1.jpg",
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts --runInBand`

Expected: FAIL because child-task activities are still excluded from the main thread, the timeline does not render subtask context, and thread photos do not yet open a full-photo viewer.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/ui/viewAdapters/useTaskDetailViewAdapter.ts
const combinedActivities = [
  ...(task.activities || []).map((activity) => ({ activity, childTask: undefined })),
  ...childTasksData.flatMap((childTask) =>
    (childTask.activities || []).map((activity) => ({ activity, childTask })),
  ),
].sort(
  (left, right) =>
    new Date(right.activity.timestamp).getTime() - new Date(left.activity.timestamp).getTime(),
);
```

```ts
// src/ui/viewAdapters/useTaskDetailViewAdapter.ts
const activityThread: TaskDetailActivityThreadRow[] = combinedActivities.map(({ activity, childTask }) => ({
  id: activity.id,
  density: "standard",
  structuralState: "stale",
  actorLabel: getUserById(activity.userId)?.name || "Unknown User",
  eventLabel: buildTaskDetailEventLabel(activity),
  timestampLabel: buildTaskDetailTimestampLabel(activity, dateFormatter),
  progressLabel:
    activity.completionPercentage !== undefined
      ? `${activity.completionPercentage}%`
      : `${childTask?.completionPercentage ?? task.completionPercentage}%`,
  detailLabel: buildTaskDetailEventDetail(activity),
  photoUrls: collectActivityPhotoUrls(activity),
  statusLabel: activity.status ? getStatusLabel(activity.status) : undefined,
  subtaskBadgeLabel: childTask ? "Subtask" : undefined,
  subtaskTitleLabel: childTask?.title,
}));
```

```tsx
// src/components/taskDetail/TaskActivityTimeline.tsx
{activity.subtaskBadgeLabel || activity.subtaskTitleLabel ? (
  <View className="mb-2 flex-row items-center gap-2">
    {activity.subtaskBadgeLabel ? (
      <View className="rounded-full bg-blue-50 px-2 py-1">
        <Text className="text-[11px] font-semibold uppercase tracking-[0.12em] text-blue-700">
          {activity.subtaskBadgeLabel}
        </Text>
      </View>
    ) : null}
    {activity.subtaskTitleLabel ? (
      <Text className="text-sm font-medium text-slate-700">{activity.subtaskTitleLabel}</Text>
    ) : null}
  </View>
) : null}
```

```tsx
// src/components/taskDetail/TaskActivityTimeline.tsx
const [selectedPhotoUri, setSelectedPhotoUri] = React.useState<string | undefined>();
```

```tsx
// src/components/taskDetail/TaskActivityTimeline.tsx
<Pressable
  testID={`task-activity-timeline__lead-photo-pressable-${activity.id}`}
  onPress={() => setSelectedPhotoUri(activity.photoUrls[0])}
>
  <Image
    testID={`task-activity-timeline__lead-photo-${activity.id}`}
    source={{ uri: activity.photoUrls[0] }}
    resizeMode="contain"
    className="h-56 w-full rounded-3xl bg-slate-100"
  />
</Pressable>
```

```tsx
// src/components/taskDetail/TaskActivityTimeline.tsx
{activity.photoUrls.slice(1).map((photoUri, photoIndex) => (
  <Pressable
    key={`${activity.id}-thumb-${photoIndex + 1}`}
    testID={`task-activity-timeline__thumb-photo-pressable-${activity.id}-${photoIndex + 1}`}
    onPress={() => setSelectedPhotoUri(photoUri)}
  >
    <Image
      testID={`task-activity-timeline__thumb-photo-${activity.id}-${photoIndex + 1}`}
      source={{ uri: photoUri }}
      resizeMode="cover"
      className="h-14 w-14 rounded-2xl bg-slate-200"
    />
  </Pressable>
))}
```

```tsx
// src/components/taskDetail/TaskActivityTimeline.tsx
<Modal
  visible={Boolean(selectedPhotoUri)}
  transparent
  animationType="fade"
  onRequestClose={() => setSelectedPhotoUri(undefined)}
>
  <Pressable
    testID="task-activity-timeline__photo_viewer"
    className="flex-1 items-center justify-center bg-black/90 px-4"
    onPress={() => setSelectedPhotoUri(undefined)}
  >
    {selectedPhotoUri ? (
      <Image
        testID="task-activity-timeline__photo_viewer_image"
        source={{ uri: selectedPhotoUri }}
        resizeMode="contain"
        className="h-full w-full"
      />
    ) : null}
  </Pressable>
</Modal>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts --runInBand`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ui/viewAdapters/useTaskDetailViewAdapter.ts src/components/taskDetail/TaskActivityTimeline.tsx src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx
git commit -m "fix(ux): merge subtask progress into task detail thread"
```

## Task 5: Validate, relaunch, and update execution notes

**Files:**
- Modify: `docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md`
- Modify: `docs/superpowers/plans/2026-07-05-task-detail-correction-implementation.md`

- [ ] **Step 1: Run the focused validation suite**

Run: `npx jest src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx src/screens/__tests__/TaskDetailScreen.sticky-layout.test.tsx src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx src/__tests__/integration/TaskDetailScreen.header.test.tsx --runInBand && npx tsc --noEmit`

Expected: PASS

- [ ] **Step 2: Relaunch the app for visual verification**

Run: `pkill -f "expo start --dev-client" || true && env -u CI npx expo start --dev-client --clear`

Expected: Metro restarts on a fresh bundle.

Run: `xcrun simctl terminate booted com.buildtrack.app.local || true && xcrun simctl launch booted com.buildtrack.app.local`

Expected: app relaunch succeeds on the booted simulator.

- [ ] **Step 3: Update the execution ledger**

```md
- made the hero the only sticky element at the top of Task Detail
- added one scrolling merged info card for description, delegation, and compact details
- removed the separate subtasks card
- merged subtask activity into the same newest-first work thread as parent-task updates
- kept the simplified photo-forward thread layout and no-primary-footer-CTA action model
```

- [ ] **Step 4: Create the checkpoint commit**

```bash
git add src/ui/contracts/viewAdapters.ts src/ui/viewAdapters/useTaskDetailViewAdapter.ts src/components/taskDetail/TaskDetailHero.tsx src/components/taskDetail/TaskDetailInfoCard.tsx src/components/taskDetail/TaskActivityTimeline.tsx src/screens/TaskDetailScreen.tsx src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts src/components/taskDetail/__tests__/TaskActivityTimeline.test.tsx src/screens/__tests__/TaskDetailScreen.sticky-layout.test.tsx src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx src/__tests__/integration/TaskDetailScreen.header.test.tsx docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md docs/superpowers/plans/2026-07-05-task-detail-correction-implementation.md docs/superpowers/specs/2026-07-05-task-detail-correction-design.md
git commit -m "fix(ux): simplify task detail sticky hero layout"
```

## Spec Coverage Check

- sticky hero only: Task 3
- one scrolling merged info card: Tasks 1, 2, and 3
- merge description / delegation / compact details: Tasks 1 and 2
- remove lower delegation card: Task 3 regression coverage
- remove separate subtasks card: Task 3
- fold subtask progress into the main thread: Task 4
- keep chronological newest-first thread: Task 4
- keep rail metadata order Date, user, %: Task 4 regression coverage through existing timeline contract
- keep lead photos fully visible and open a full-photo viewer on tap: Task 4
- preserve camera routing and inline actions: Task 3 regression coverage and Task 5 validation
- keep photo-update form reset behavior: preserved by existing implementation, protected in Task 5 validation

## Placeholder Scan

- No `TBD` / `TODO`
- No “similar to Task N” shortcuts
- All file paths are explicit
- Each code-changing step includes concrete code
- Each verification step includes exact commands and expected outcomes

## Type Consistency Check

- `TaskDetailInfoCardModel` is defined in Task 1 and consumed by `TaskDetailInfoCard` in Task 2
- `subtaskBadgeLabel` and `subtaskTitleLabel` are defined in Task 1 and rendered by `TaskActivityTimeline` in Task 4
- `infoCard` is added at the adapter layer in Task 1 and rendered by `TaskDetailScreen` in Task 3
- `selectedPhotoUri` is local to `TaskActivityTimeline` in Task 4 and does not change the adapter contract
