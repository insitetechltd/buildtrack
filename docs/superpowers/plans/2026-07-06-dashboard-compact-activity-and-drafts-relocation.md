# Dashboard Activity, Drafts, And Queue Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the dashboard `Recent Activity` feed compact and limited to the last 7 days, remove dashboard draft cards, relocate drafts into a collapsed section at the bottom of the `Tasks` screen, unify meaningful activity labels across shared summary surfaces, and add an `Overdue` bucket to both task queues.

**Architecture:** Keep the existing project summary and queue overview intact, but tighten the dashboard activity-item contract so each row only needs title, timestamp, and action text. Extend the `Tasks` screen contract with a dedicated drafts section model so drafts move to one explicit home without being mixed into the active queue panels. Centralize meaningful activity label generation so dashboard and other summary surfaces stop drifting, then rebalance queue buckets so `New`, `Doing`, and `Review` exclude overdue items while a dedicated `Overdue` bucket aggregates urgency per queue.

**Tech Stack:** Expo 54, React Native, TypeScript, Jest, React Native Testing Library

---

## File Structure

### Core files to modify

- `src/ui/contracts/viewAdapters.ts`
  Simplify the dashboard activity contract and add a tasks-screen drafts-section contract.

- `src/ui/viewAdapters/useDashboardViewAdapter.ts`
  Filter dashboard activity to the last 7 days, remove dashboard drafts, and produce compact action text instead of status-badge-oriented rows.

- `src/screens/DashboardScreen.tsx`
  Render compact two-line recent activity rows and remove the `Drafts In Progress` section.

- `src/ui/viewAdapters/useTasksViewAdapter.ts`
  Build the collapsed drafts section model from draft tasks, expose its default collapsed state plus expand/collapse action, and rebalance queue buckets to add an `Overdue` lane.

- `src/screens/TasksScreen.tsx`
  Render the collapsed drafts section at the bottom of the Tasks scroll, only when drafts exist, and surface the new four-bucket queue structure.

### Tests to modify

- `src/ui/viewAdapters/__tests__/useDashboardViewAdapter.test.ts`
- `src/screens/__tests__/DashboardScreen.test.tsx`
- `src/screens/__tests__/TasksScreen.test.tsx`
- `src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts`

### Docs to update after implementation

- `docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md`
- `docs/superpowers/plans/2026-07-06-dashboard-compact-activity-and-drafts-relocation.md`

## Task 1: Simplify and time-filter dashboard activity rows

**Files:**
- Modify: `src/ui/contracts/viewAdapters.ts`
- Modify: `src/ui/viewAdapters/useDashboardViewAdapter.ts`
- Modify: `src/ui/viewAdapters/__tests__/useDashboardViewAdapter.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
it("returns only last-7-day activity rows and excludes dashboard drafts", () => {
  const { result } = renderHook(() => useDashboardViewAdapter());

  expect(result.current.output.activityItems).toHaveLength(1);
  expect(result.current.output.activityItems[0]).toMatchObject({
    title: "Guardrail layout approved",
    subtitle: "5 minutes ago · Approved task completion",
  });
  expect(result.current.output.draftItems).toEqual([]);
});
```

```ts
it("drops activity older than 7 days from the dashboard feed", () => {
  const { result } = renderHook(() => useDashboardViewAdapter());

  expect(result.current.output.activityItems.some((item) => item.id === "activity-older-than-7-days")).toBe(false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/ui/viewAdapters/__tests__/useDashboardViewAdapter.test.ts --runInBand`

Expected: FAIL because the adapter still includes drafts in dashboard output and does not yet enforce the 7-day activity window.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/ui/contracts/viewAdapters.ts
export interface DashboardActivityItem extends PrimitiveReadyItemBase {
  id: string;
  taskId: string;
  title: string;
  subtitle: string; // now reserved for `timestamp · action`
  timestampLabel: string;
}
```

```ts
// src/ui/viewAdapters/useDashboardViewAdapter.ts
const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

function isWithinLastSevenDays(timestamp?: string): boolean {
  if (!timestamp) return false;
  const value = new Date(timestamp).getTime();
  return Number.isFinite(value) && value >= sevenDaysAgo;
}

const activityItems = recentProjectActivities
  .filter((activity) => isWithinLastSevenDays(activity.timestamp))
  .map((activity) => ({
    id: activity.id,
    taskId: activity.taskId,
    title: activity.taskTitle,
    subtitle: `${activity.timestampLabel} · ${activity.actionLabel}`,
    timestampLabel: activity.timestampLabel,
    density: "standard",
    structuralState,
  }));

const draftItems: DashboardActivityItem[] = [];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/ui/viewAdapters/__tests__/useDashboardViewAdapter.test.ts --runInBand`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ui/contracts/viewAdapters.ts src/ui/viewAdapters/useDashboardViewAdapter.ts src/ui/viewAdapters/__tests__/useDashboardViewAdapter.test.ts
git commit -m "fix(dashboard): compact recent activity feed data"
```

## Task 2: Render the compact dashboard feed and remove dashboard drafts

**Files:**
- Modify: `src/screens/DashboardScreen.tsx`
- Modify: `src/screens/__tests__/DashboardScreen.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
it("renders compact recent activity rows without status badges or drafts", () => {
  const screen = render(
    <DashboardScreen
      onNavigateToTasks={jest.fn()}
      onNavigateToCreateTask={jest.fn()}
      onNavigateToProfile={jest.fn()}
      onNavigateToTaskDetail={jest.fn()}
    />,
  );

  expect(screen.getByText("Guardrail layout approved")).toBeTruthy();
  expect(screen.getByText("5 minutes ago · Approved task completion")).toBeTruthy();
  expect(screen.queryByText("Approved")).toBeNull();
  expect(screen.queryByText("Drafts In Progress")).toBeNull();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/screens/__tests__/DashboardScreen.test.tsx --runInBand`

Expected: FAIL because the screen still renders status-badge-oriented rows and the dashboard drafts block.

- [ ] **Step 3: Write minimal implementation**

```tsx
// src/screens/DashboardScreen.tsx
<Pressable
  key={item.id}
  testID={`dashboard-screen__activity_${item.id}`}
  onPress={() => props.onNavigateToTaskDetail?.(item.taskId)}
  className="rounded-2xl bg-white px-4 py-3"
>
  <Text className="text-base font-semibold text-slate-900" numberOfLines={1}>
    {item.title}
  </Text>
  <Text className="mt-1 text-sm leading-5 text-slate-500" numberOfLines={1}>
    {item.subtitle}
  </Text>
</Pressable>
```

```tsx
// remove the entire Drafts In Progress section from DashboardScreen
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/screens/__tests__/DashboardScreen.test.tsx --runInBand`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/screens/DashboardScreen.tsx src/screens/__tests__/DashboardScreen.test.tsx
git commit -m "fix(dashboard): remove drafts and compact activity rows"
```

## Task 3: Add a collapsed drafts section to the bottom of Tasks

**Files:**
- Modify: `src/ui/contracts/viewAdapters.ts`
- Modify: `src/ui/viewAdapters/useTasksViewAdapter.ts`
- Modify: `src/screens/TasksScreen.tsx`
- Modify: `src/screens/__tests__/TasksScreen.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
it("renders a collapsed drafts section at the bottom of tasks when drafts exist", () => {
  const screen = render(
    <TasksScreen
      onNavigateToTaskDetail={jest.fn()}
      onNavigateToCreateTask={jest.fn()}
    />,
  );

  expect(screen.getByTestId("tasks-screen__drafts_section")).toBeTruthy();
  expect(screen.getByText("Drafts · 2")).toBeTruthy();
  expect(screen.queryByText("Prepare handover notes")).toBeNull();
});
```

```tsx
it("expands the drafts section in place when tapped", () => {
  const screen = render(
    <TasksScreen
      onNavigateToTaskDetail={jest.fn()}
      onNavigateToCreateTask={jest.fn()}
    />,
  );

  fireEvent.press(screen.getByTestId("tasks-screen__drafts_toggle"));

  expect(screen.getByText("Prepare handover notes")).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/screens/__tests__/TasksScreen.test.tsx --runInBand`

Expected: FAIL because no drafts section exists in the Tasks screen contract or renderer.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/ui/contracts/viewAdapters.ts
export interface TasksDraftsSection {
  title: string;
  countLabel: string;
  isExpanded: boolean;
  rows: TasksScreenRowItem[];
}

export interface TasksScreenViewAdapterOutput {
  // existing fields...
  draftsSection: TasksDraftsSection | null;
}
```

```ts
// src/ui/viewAdapters/useTasksViewAdapter.ts
const [isDraftsExpanded, setIsDraftsExpanded] = useState(false);

const draftRows = tasks
  .filter((task) => task.status === "draft")
  .sort(compareTasksByLatestMeaningfulUpdate)
  .map((task) => buildRow(task));

const draftsSection = draftRows.length > 0
  ? {
      title: "Drafts",
      countLabel: String(draftRows.length),
      isExpanded: isDraftsExpanded,
      rows: draftRows,
    }
  : null;
```

```tsx
// src/screens/TasksScreen.tsx
{output.draftsSection ? (
  <View testID="tasks-screen__drafts_section" className="mb-6 rounded-3xl bg-white px-4 py-4">
    <Pressable
      testID="tasks-screen__drafts_toggle"
      onPress={actions.toggleDraftsSection}
      className="flex-row items-center justify-between"
    >
      <Text className="text-lg font-semibold text-slate-900">
        {output.draftsSection.title} · {output.draftsSection.countLabel}
      </Text>
      <Ionicons
        name={output.draftsSection.isExpanded ? "chevron-up" : "chevron-down"}
        size={18}
        color="#475569"
      />
    </Pressable>

    {output.draftsSection.isExpanded ? (
      <View className="mt-4">
        {output.draftsSection.rows.map((row) => (
          <View key={row.taskId} className="mb-3">
            <ContainerCard contract={mapTaskRowToContainerCardProps({ ...row, density: "standard" })} />
          </View>
        ))}
      </View>
    ) : null}
  </View>
) : null}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/screens/__tests__/TasksScreen.test.tsx --runInBand`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ui/contracts/viewAdapters.ts src/ui/viewAdapters/useTasksViewAdapter.ts src/screens/TasksScreen.tsx src/screens/__tests__/TasksScreen.test.tsx
git commit -m "feat(tasks): move drafts into collapsed tasks section"
```

## Task 4: Validate and record the redesign update

**Files:**
- Modify: `docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md`
- Modify: `docs/superpowers/plans/2026-07-06-dashboard-compact-activity-and-drafts-relocation.md`

- [ ] **Step 1: Run the focused validation suite**

Run: `npx jest src/ui/viewAdapters/__tests__/useDashboardViewAdapter.test.ts src/screens/__tests__/DashboardScreen.test.tsx src/screens/__tests__/TasksScreen.test.tsx --runInBand && npx tsc --noEmit`

Expected: PASS

- [ ] **Step 2: Update the execution ledger**

```md
- compacted dashboard recent-activity rows to title plus `timestamp · action`
- limited dashboard activity to the last 7 days
- removed dashboard drafts entirely
- added a collapsed drafts section at the bottom of the Tasks screen
```

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md docs/superpowers/plans/2026-07-06-dashboard-compact-activity-and-drafts-relocation.md
git commit -m "docs(dashboard): record compact activity redesign"
```

## Spec Coverage Check

- compact dashboard activity rows with only title, timestamp, and action: Task 1 and Task 2
- remove dashboard status badge: Task 2
- restrict dashboard activity to the last 7 days: Task 1
- remove dashboard drafts: Task 1 and Task 2
- add collapsed drafts section at the bottom of Tasks: Task 3

## Placeholder Scan

- No `TBD` / `TODO`
- No “similar to Task N” shortcuts
- All file paths are explicit
- Each code-changing step includes concrete code
- Each verification step includes exact commands and expected outcomes

## Type Consistency Check

- `DashboardActivityItem.subtitle` becomes the compact `timestamp · action` line and is rendered consistently in `DashboardScreen`
- `draftItems` remains present in the dashboard contract only as an empty compatibility field during this pass
- `draftsSection` becomes the single dedicated UI model for draft visibility on `Tasks`

## Task 5: Unify meaningful activity labels across shared summary surfaces

**Files:**
- Modify: `src/ui/viewAdapters/useDashboardViewAdapter.ts`
- Modify: `src/ui/viewAdapters/__tests__/useDashboardViewAdapter.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
it("uses a photo-oriented label instead of unchanged progress wording for photo-only updates", () => {
  const { result } = renderHook(() => useDashboardViewAdapter());

  expect(result.current.output.activityItems.find((item) => item.id === "activity-photo-only")).toMatchObject({
    actionLabel: "Added photo update",
    subtitle: "2 hours ago · Added photo update",
  });
});
```

```ts
it("keeps progress wording only when the activity represents a meaningful progress change", () => {
  const { result } = renderHook(() => useDashboardViewAdapter());

  expect(result.current.output.activityItems.find((item) => item.id === "activity-progress-change")).toMatchObject({
    actionLabel: "Updated progress to 40%",
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/ui/viewAdapters/__tests__/useDashboardViewAdapter.test.ts --runInBand`

Expected: FAIL because summary activity labels still allow generic fallback wording like `Updated progress to 0%` when the more meaningful action was photo upload.

- [ ] **Step 3: Write minimal implementation**

```ts
function buildMeaningfulSummaryActionLabel(activityLike: TaskActivity | TaskUpdate): string {
  const photoCount = collectSummaryPhotoUrls(activityLike).length;
  const hasMeaningfulProgressChange = resolveMeaningfulProgressChange(activityLike);

  if (photoCount > 0 && !hasMeaningfulProgressChange) {
    return photoCount > 1 ? `Added ${photoCount} photos` : "Added photo update";
  }

  if (hasMeaningfulProgressChange) {
    return `Updated progress to ${resolveCompletionPercentage(activityLike)}%`;
  }

  return buildExistingActivityFallbackLabel(activityLike);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/ui/viewAdapters/__tests__/useDashboardViewAdapter.test.ts --runInBand`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ui/viewAdapters/useDashboardViewAdapter.ts src/ui/viewAdapters/__tests__/useDashboardViewAdapter.test.ts
git commit -m "fix(activity): unify meaningful summary labels"
```

## Task 6: Add an overdue bucket to both task queues

**Files:**
- Modify: `src/ui/contracts/viewAdapters.ts`
- Modify: `src/ui/viewAdapters/useTasksViewAdapter.ts`
- Modify: `src/screens/TasksScreen.tsx`
- Modify: `src/screens/__tests__/TasksScreen.test.tsx`
- Modify: `src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
it("splits overdue tasks out of New, Doing, and Review into a dedicated Overdue bucket", () => {
  const { result } = renderHook(() =>
    useTasksViewAdapter({
      onNavigateToTaskDetail: jest.fn(),
    }),
  );

  const myQueue = result.current.output.queuePanels.find((panel) => panel.queue === "my_queue");

  expect(myQueue?.buckets.map((bucket) => `${bucket.title}:${bucket.taskCountLabel}`)).toEqual([
    "New:1",
    "Doing:1",
    "Review:1",
    "Overdue:2",
  ]);
});
```

```tsx
it("renders an overdue bucket button for both queues even when the count is zero", () => {
  const screen = render(
    <TasksScreen
      onNavigateToTaskDetail={jest.fn()}
      onNavigateToCreateTask={jest.fn()}
    />,
  );

  expect(screen.getByTestId("tasks-screen__queue_bucket_my_queue_overdue")).toBeTruthy();
  expect(screen.getByTestId("tasks-screen__queue_bucket_team_queue_overdue")).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts src/screens/__tests__/TasksScreen.test.tsx --runInBand`

Expected: FAIL because queues still expose only `New`, `Doing`, and `Review`, with overdue items mixed into those buckets.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/ui/contracts/viewAdapters.ts
export type TasksQueueBucketId = "new" | "wip" | "review" | "overdue";
```

```ts
// src/ui/viewAdapters/useTasksViewAdapter.ts
function resolveBucketForTask(task: Task): TasksQueueBucketId | null {
  if (isTaskOverdue(task)) {
    return "overdue";
  }

  if (matchesNewStatusFilter(task.status)) return "new";
  if (matchesWipStatusFilter(task.status)) return "wip";
  if (matchesReviewingStatusFilter(task.status)) return "review";
  return null;
}

function getBucketTitle(bucket: TasksQueueBucketId): string {
  switch (bucket) {
    case "overdue":
      return "Overdue";
    // keep existing cases unchanged
  }
}
```

```tsx
// src/screens/TasksScreen.tsx
<Pressable
  key={bucket.id}
  testID={`tasks-screen__queue_bucket_${panel.queue}_${bucket.bucket}`}
  className={cn(
    "mr-2 rounded-full border px-4 py-2",
    bucket.bucket === "overdue" && bucket.isOpen && panel.isExpanded
      ? "border-rose-200 bg-rose-600"
      : bucket.bucket === "overdue"
        ? "border-rose-200 bg-rose-50"
        : bucket.isOpen && panel.isExpanded
          ? "border-slate-900 bg-slate-900"
          : "border-slate-200 bg-slate-50",
  )}
>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts src/screens/__tests__/TasksScreen.test.tsx --runInBand`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ui/contracts/viewAdapters.ts src/ui/viewAdapters/useTasksViewAdapter.ts src/screens/TasksScreen.tsx src/screens/__tests__/TasksScreen.test.tsx src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts
git commit -m "feat(tasks): add overdue queue bucket"
```

## Task 7: Validate and record the refinement update

**Files:**
- Modify: `docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md`
- Modify: `docs/superpowers/plans/2026-07-06-dashboard-compact-activity-and-drafts-relocation.md`

- [ ] **Step 1: Run the focused validation suite**

Run: `npx jest src/ui/viewAdapters/__tests__/useDashboardViewAdapter.test.ts src/screens/__tests__/DashboardScreen.test.tsx src/screens/__tests__/TasksScreen.test.tsx src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts --runInBand && npx tsc --noEmit`

Expected: PASS

- [ ] **Step 2: Update the execution ledger**

```md
- replaced generic dashboard activity fallback copy with shared meaningful action labels
- stopped photo-only summary entries from rendering unchanged progress wording such as `Updated progress to 0%`
- added an `Overdue` bucket to both queue groups
- removed overdue items from the `New`, `Doing`, and `Review` bucket counts and aggregated them into the dedicated urgency lane
```

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md docs/superpowers/plans/2026-07-06-dashboard-compact-activity-and-drafts-relocation.md
git commit -m "docs(dashboard): record activity and queue refinement"
```

## Additional Spec Coverage Check

- shared meaningful summary activity labels: Task 5
- prevent misleading `Updated progress to 0%` wording for photo-only updates: Task 5
- add `Overdue` bucket to both queue groups: Task 6
- keep overdue tasks out of `New`, `Doing`, and `Review` counts: Task 6

## Additional Type Consistency Check

- shared action-label resolution stays consistent with the recently corrected task-detail phrasing rules
- `TasksQueueBucketId` expands to include `overdue` and is handled by both adapter and screen rendering
- the four-bucket queue structure remains consistent between tests, adapter output, and screen `testID` generation

## Task 8: Apply the four-bucket model to Activity and make both queue rows fit on-screen

**Files:**
- Modify: `src/ui/contracts/viewAdapters.ts`
- Modify: `src/ui/viewAdapters/useDashboardViewAdapter.ts`
- Modify: `src/screens/DashboardScreen.tsx`
- Modify: `src/screens/TasksScreen.tsx`
- Modify: `src/screens/__tests__/DashboardScreen.test.tsx`
- Modify: `src/screens/__tests__/TasksScreen.test.tsx`
- Modify: `src/ui/viewAdapters/__tests__/useDashboardViewAdapter.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
it("builds four queue-overview cells per group on Activity, including Overdue", () => {
  const { result } = renderHook(() => useDashboardViewAdapter());

  expect(result.current.output.queueDashboard?.groups[0]?.cells.map((cell) => cell.title)).toEqual([
    "New",
    "Doing",
    "Review",
    "Overdue",
  ]);
});
```

```tsx
it("renders four equal-width queue cells on dashboard without horizontal overflow", () => {
  const screen = render(
    <DashboardScreen
      onNavigateToTasks={jest.fn()}
      onNavigateToCreateTask={jest.fn()}
      onNavigateToProfile={jest.fn()}
      onNavigateToTaskDetail={jest.fn()}
    />,
  );

  expect(screen.getByTestId("dashboard-screen__queue_cell_my_queue_overdue")).toBeTruthy();
});
```

```tsx
it("renders Tasks queue buckets in a non-scrolling four-up row", () => {
  const screen = render(
    <TasksScreen
      onNavigateToTaskDetail={jest.fn()}
      onNavigateToCreateTask={jest.fn()}
    />,
  );

  expect(screen.queryByTestId("tasks-screen__queue_bucket_scroll_my_queue")).toBeNull();
  expect(screen.getByTestId("tasks-screen__queue_bucket_my_queue_overdue")).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/ui/viewAdapters/__tests__/useDashboardViewAdapter.test.ts src/screens/__tests__/DashboardScreen.test.tsx src/screens/__tests__/TasksScreen.test.tsx --runInBand`

Expected: FAIL because Activity still uses the old three-bucket queue overview and Tasks still uses a horizontal scrolling bucket strip.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/ui/contracts/viewAdapters.ts
export interface DashboardQueueDashboardCell {
  id: string;
  queue: "my_queue" | "team_queue";
  bucket: "new" | "wip" | "review" | "overdue";
  title: string;
  countLabel: string;
}
```

```ts
// src/ui/viewAdapters/useDashboardViewAdapter.ts
// Build queue groups with four cells:
// new, wip, review use non-overdue counts only
// overdue aggregates all overdue tasks in that queue
```

```tsx
// src/screens/DashboardScreen.tsx
<View className="flex-row gap-2">
  {group.cells.map((cell) => (
    <Pressable
      key={cell.id}
      testID={`dashboard-screen__queue_cell_${cell.queue}_${cell.bucket}`}
      className={cn(
        "min-w-0 flex-1 rounded-2xl px-2 py-4",
        cell.bucket === "overdue" ? "bg-rose-50" : "bg-white",
      )}
    >
```

```tsx
// src/screens/TasksScreen.tsx
<View className="mt-4 flex-row gap-2">
  {panel.buckets.map((bucket) => (
    <Pressable
      key={bucket.id}
      testID={`tasks-screen__queue_bucket_${panel.queue}_${bucket.bucket}`}
      className="min-w-0 flex-1 rounded-2xl border px-2 py-3"
    >
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/ui/viewAdapters/__tests__/useDashboardViewAdapter.test.ts src/screens/__tests__/DashboardScreen.test.tsx src/screens/__tests__/TasksScreen.test.tsx --runInBand`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ui/contracts/viewAdapters.ts src/ui/viewAdapters/useDashboardViewAdapter.ts src/screens/DashboardScreen.tsx src/screens/TasksScreen.tsx src/screens/__tests__/DashboardScreen.test.tsx src/screens/__tests__/TasksScreen.test.tsx src/ui/viewAdapters/__tests__/useDashboardViewAdapter.test.ts
git commit -m "fix(queues): align activity and tasks bucket layout"
```

## Task 9: Validate and record the Activity queue alignment update

**Files:**
- Modify: `docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md`
- Modify: `docs/superpowers/plans/2026-07-06-dashboard-compact-activity-and-drafts-relocation.md`

- [ ] **Step 1: Run the focused validation suite**

Run: `npx jest src/ui/viewAdapters/__tests__/useDashboardViewAdapter.test.ts src/screens/__tests__/DashboardScreen.test.tsx src/screens/__tests__/TasksScreen.test.tsx src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts --runInBand && npx tsc --noEmit`

Expected: PASS

- [ ] **Step 2: Update the execution ledger**

```md
- aligned Activity queue overview to the same four-bucket model as Tasks
- ensured all four queue buckets fit within one visible row on both Activity and Tasks
- removed horizontal bucket scrolling from Tasks
```

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md docs/superpowers/plans/2026-07-06-dashboard-compact-activity-and-drafts-relocation.md
git commit -m "docs(queues): record activity queue alignment"
```

## Final Additional Spec Coverage Check

- Activity queue overview uses the same four-bucket model as Tasks: Task 8
- all four buckets fit within the visible screen width: Task 8
- no horizontal bucket scrolling on either surface: Task 8

## Task 10: Redesign the task card for the Tasks list

**Files:**
- Modify: `src/ui/contracts/viewAdapters.ts`
- Modify: `src/ui/viewAdapters/useTasksViewAdapter.ts`
- Modify: `src/ui/mappers/tasksMappers.ts`
- Modify: `src/components/primitives/container/ContainerCard.tsx`
- Modify: `src/screens/__tests__/TasksScreen.test.tsx`
- Modify: `src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts`
- Add or modify component tests under `src/components/primitives/container/__tests__/`

- [ ] **Step 1: Write the failing tests**

```ts
it("builds task rows with thumbnail-first card data and urgency-first supporting text", () => {
  const { result } = renderHook(() =>
    useTasksViewAdapter({
      onNavigateToTaskDetail: jest.fn(),
    }),
  );

  const firstRow = result.current.output.taskRowItems[0];

  expect(firstRow.primaryPhotoUri).toBe("https://example.com/task-photo.jpg");
  expect(firstRow.supportingLine).toBe("Overdue · Awaiting review");
  expect(firstRow.contextLine).toBe("2 assignees");
});
```

```tsx
it("renders task cards with a left thumbnail, strong title, supporting line, and lightweight context row", () => {
  const screen = render(
    <TasksScreen
      onNavigateToTaskDetail={jest.fn()}
      onNavigateToCreateTask={jest.fn()}
    />,
  );

  expect(screen.getByTestId("container-card:task-1:thumbnail")).toBeTruthy();
  expect(screen.getByText("Install guardrails")).toBeTruthy();
  expect(screen.getByText("Overdue · Awaiting review")).toBeTruthy();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts src/screens/__tests__/TasksScreen.test.tsx src/components/primitives/container/__tests__/ContainerCard.test.tsx --runInBand`

Expected: FAIL because task cards still rely on the metadata-list layout instead of the approved thumbnail-first design.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/ui/contracts/viewAdapters.ts
export interface TasksScreenRowItem extends PrimitiveReadyItemBase {
  // existing fields...
  supportingLine?: string;
  contextLine?: string;
  thumbnailMode?: "photo" | "placeholder";
}
```

```ts
// src/ui/viewAdapters/useTasksViewAdapter.ts
function buildSupportingLine(task: Task): string {
  if (isTaskOverdue(task)) {
    return task.status === "submitted_for_review"
      ? "Overdue · Awaiting review"
      : "Overdue · Needs attention";
  }

  return `${getBucketTitle(resolveBucketForTask(task) ?? "new")} · ${buildNextUsefulCue(task)}`;
}
```

```ts
// src/ui/mappers/tasksMappers.ts
// map task rows into a thumbnail-first container contract:
// - small left media slot
// - title
// - supporting line
// - context line
// - remove dense metadata stack from the main card presentation
```

```tsx
// src/components/primitives/container/ContainerCard.tsx
// render a horizontal card shell with:
// - fixed small left thumbnail / placeholder
// - title
// - supporting line
// - optional context line
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts src/screens/__tests__/TasksScreen.test.tsx src/components/primitives/container/__tests__/ContainerCard.test.tsx --runInBand`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ui/contracts/viewAdapters.ts src/ui/viewAdapters/useTasksViewAdapter.ts src/ui/mappers/tasksMappers.ts src/components/primitives/container/ContainerCard.tsx src/screens/__tests__/TasksScreen.test.tsx src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts src/components/primitives/container/__tests__/ContainerCard.test.tsx
git commit -m "feat(tasks): redesign task list card"
```

## Task 11: Validate and record the task-card redesign update

**Files:**
- Modify: `docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md`
- Modify: `docs/superpowers/plans/2026-07-06-dashboard-compact-activity-and-drafts-relocation.md`

- [ ] **Step 1: Run the focused validation suite**

Run: `npx jest src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts src/screens/__tests__/TasksScreen.test.tsx src/components/primitives/container/__tests__/ContainerCard.test.tsx src/ui/viewAdapters/__tests__/useDashboardViewAdapter.test.ts src/screens/__tests__/DashboardScreen.test.tsx --runInBand && npx tsc --noEmit`

Expected: PASS

- [ ] **Step 2: Update the execution ledger**

```md
- redesigned the Tasks list card into a stable left-thumbnail layout
- promoted the task title and urgency/supporting line over dense metadata rows
- kept card height stable with a placeholder surface when no photo exists
```

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md docs/superpowers/plans/2026-07-06-dashboard-compact-activity-and-drafts-relocation.md
git commit -m "docs(tasks): record task card redesign"
```

## Final Roadmap Coverage Check

- task list card uses a left thumbnail layout: Task 10
- task title remains the strongest visual element: Task 10
- urgency-first supporting line replaces dense metadata emphasis: Task 10
- card height remains stable even without a photo: Task 10
