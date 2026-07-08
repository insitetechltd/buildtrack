# Activity + Tasks Search-First Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair the `Activity` and `Tasks` screen regressions by restoring the `Activity` hierarchy and converting `Tasks` into a search-first list with dropdown filters, dynamic counts, and full-list ordering.

**Architecture:** Keep `DashboardScreen` responsible for `Activity` layout and `useDashboardViewAdapter()` responsible for project summary and activity row data, adding only the minimum data needed for conditional thumbnails. On `Tasks`, evolve the adapter contract from queue-panel-first output to dropdown filter metadata plus one visible ordered list, then update `TasksScreen` to render that new contract without changing navigation or task-card plumbing.

**Tech Stack:** React Native, TypeScript, Expo, NativeWind className styling, Jest, Testing Library

---

## File Map

- Modify: `src/ui/contracts/viewAdapters.ts`
  Add the dropdown filter model for `Tasks` so the adapter and screen share one explicit contract.
- Modify: `src/ui/viewAdapters/useDashboardViewAdapter.ts`
  Continue producing `Activity` rows, but ensure preview-photo usage stays aligned with conditional thumbnail rendering.
- Modify: `src/screens/DashboardScreen.tsx`
  Restore header/section hierarchy and render `Recent Activity` cards with conditional left thumbnails.
- Modify: `src/ui/viewAdapters/useTasksViewAdapter.ts`
  Replace queue-panel-first output with dropdown filters, dynamic counts, `All` states, and ordered `taskRowItems`.
- Modify: `src/screens/TasksScreen.tsx`
  Replace the queue panel layout with search + dropdown controls + one continuous list.
- Modify: `src/screens/__tests__/DashboardScreen.test.tsx`
  Cover the new `Activity` hierarchy and conditional thumbnail behavior.
- Modify: `src/screens/__tests__/TasksScreen.test.tsx`
  Cover the new dropdown controls and search-first list rendering.
- Modify: `src/ui/viewAdapters/__tests__/useDashboardViewAdapter.test.ts`
  Verify adapter output for activity preview-photo behavior if needed.
- Modify: `src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts`
  Verify dynamic dropdown counts, `All` state behavior, and list ordering.

## Task 1: Lock The New Activity Hierarchy And Conditional Thumbnail Behavior

**Files:**
- Modify: `src/screens/__tests__/DashboardScreen.test.tsx`
- Modify: `src/ui/viewAdapters/__tests__/useDashboardViewAdapter.test.ts`

- [ ] **Step 1: Add a failing screen test for the flattened `Active Project` hierarchy and conditional activity thumbnails**

```tsx
it("renders Active Project as a peer section and shows conditional activity thumbnails", () => {
  const { useDashboardViewAdapter } = require("@/ui/viewAdapters/useDashboardViewAdapter");

  useDashboardViewAdapter.mockReturnValue({
    output: {
      ...adapterOutput,
      projectSummaryCard: {
        ...adapterOutput.projectSummaryCard,
        criticalDates: [
          {
            id: "critical-date-1",
            dateLabel: "Jul 7",
            title: "Concrete inspection",
            subtitle: "Submitted For Review · Critical",
          },
        ],
      },
      activityItems: [
        {
          id: "activity-1",
          taskId: "task-1",
          title: "Photo-backed activity",
          subtitle: "Has a preview image",
          timestampLabel: "Jul 7 at 6:48 PM",
          statusLabel: "in progress",
          previewPhotoUri: "https://example.com/activity-photo.jpg",
          density: "standard",
          structuralState: "stale",
        },
        {
          id: "activity-2",
          taskId: "task-2",
          title: "Text-only activity",
          subtitle: "No preview image",
          timestampLabel: "Task activity",
          statusLabel: "new",
          density: "standard",
          structuralState: "stale",
        },
      ],
    },
    visibility: {
      showCreateTaskFab: true,
      showProfileShortcut: true,
      showProjectPickerShortcut: true,
      showDeveloperSettingsShortcut: true,
    },
  });

  const screen = render(
    <DashboardScreen
      onNavigateToTasks={jest.fn()}
      onNavigateToCreateTask={jest.fn()}
      onNavigateToProfile={jest.fn()}
      onNavigateToTaskDetail={jest.fn()}
    />,
  );

  expect(screen.getByText("Active Project")).toBeTruthy();
  expect(screen.getByText("This Week's Critical Dates")).toBeTruthy();
  expect(screen.getByTestId("dashboard-screen__activity_activity-1:thumbnail")).toBeTruthy();
  expect(screen.queryByTestId("dashboard-screen__activity_activity-2:thumbnail")).toBeNull();
});
```

- [ ] **Step 2: Add a focused adapter assertion for preview-photo passthrough**

```ts
expect(result.current.output.activityItems[0]).toMatchObject({
  title: "Concrete pour",
  previewPhotoUri: "https://example.com/photo-1.jpg",
});
```

- [ ] **Step 3: Run the focused tests to verify the hierarchy/thumbnail test fails for the expected reason**

Run: `npx jest src/screens/__tests__/DashboardScreen.test.tsx src/ui/viewAdapters/__tests__/useDashboardViewAdapter.test.ts --runInBand`

Expected: `DashboardScreen.test.tsx` fails because `DashboardScreen` still wraps `Active Project` inside one outer card and does not render thumbnail test IDs for activity rows; adapter test stays green or requires only a small assertion update.

## Task 2: Implement The Activity Layout Repair

**Files:**
- Modify: `src/screens/DashboardScreen.tsx`
- Modify: `src/ui/viewAdapters/useDashboardViewAdapter.ts`

- [ ] **Step 1: Flatten the `Active Project` hierarchy so the section label and project summary sit outside the inner card**

```tsx
{output.projectSummaryCard ? (
  <View className="mb-5" testID="dashboard-screen__project_summary_section">
    <Text className="text-sm font-semibold uppercase tracking-wider text-slate-500">
      Active Project
    </Text>
    <Text className="mt-2 text-3xl font-semibold text-slate-900">
      {output.projectSummaryCard.title}
    </Text>
    <Text className="mt-1 text-sm text-slate-500">
      {[
        output.projectSummaryCard.todayLabel,
        output.projectSummaryCard.elapsedDayLabel,
        `${output.projectSummaryCard.weatherIconLabel} ${output.projectSummaryCard.weatherTemperatureLabel}`,
      ].join(" · ")}
    </Text>

    <View className="mt-4 rounded-3xl bg-white p-4">
      <Text className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        This Week&apos;s Critical Dates
      </Text>
      {/* existing critical date rows */}
    </View>
  </View>
) : null}
```

- [ ] **Step 2: Tighten the top rhythm around the screen header**

```tsx
<AppScreenHeader
  title="Recent Activity"
  showProfileTrigger={visibility.showProfileShortcut}
  onProfilePress={props.onNavigateToProfile}
  className="border-b-0 bg-slate-50 pb-1"
  rightSlot={...}
/>
```

- [ ] **Step 3: Render conditional left thumbnails for activity rows**

```tsx
<Pressable
  key={item.id}
  testID={`dashboard-screen__activity_${item.id}`}
  onPress={() => props.onNavigateToTaskDetail?.(item.taskId)}
  className="overflow-hidden rounded-2xl bg-white"
>
  {item.previewPhotoUri ? (
    <View className="flex-row">
      <View
        testID={`dashboard-screen__activity_${item.id}:thumbnail`}
        className="w-24 bg-slate-100"
      >
        <Image
          source={{ uri: item.previewPhotoUri }}
          className="h-full w-full"
          resizeMode="cover"
        />
      </View>
      <View className="min-w-0 flex-1 p-4">
        {/* existing text content */}
      </View>
    </View>
  ) : (
    <View className="p-4">
      {/* existing text-only content */}
    </View>
  )}
</Pressable>
```

- [ ] **Step 4: Re-run the Activity-focused tests**

Run: `npx jest src/screens/__tests__/DashboardScreen.test.tsx src/ui/viewAdapters/__tests__/useDashboardViewAdapter.test.ts --runInBand`

Expected: PASS

## Task 3: Lock The Search-First Tasks Contract In Tests

**Files:**
- Modify: `src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts`
- Modify: `src/screens/__tests__/TasksScreen.test.tsx`

- [ ] **Step 1: Replace the queue-panel assertions with a failing adapter test for dropdown counts and full-list ordering**

```ts
it("builds dropdown filters with All states, dynamic counts, and ordered visible rows", () => {
  useTaskStore.mockReturnValue({
    tasks: [
      makeTask({
        id: "task-critical-review",
        title: "Critical review item",
        priority: "critical",
        status: "submitted_for_review",
        assignedTo: ["user-2"],
        assignedBy: "user-1",
        updatedAt: "2026-07-03T12:00:00.000Z",
      }),
      makeTask({
        id: "task-high-new",
        title: "High priority new item",
        priority: "high",
        status: "new",
        assignedTo: ["user-1"],
        assignedBy: "user-2",
        updatedAt: "2026-07-04T12:00:00.000Z",
      }),
      makeTask({
        id: "task-high-wip",
        title: "High priority doing item",
        priority: "high",
        status: "in_progress",
        assignedTo: ["user-1"],
        assignedBy: "user-2",
        updatedAt: "2026-07-04T11:00:00.000Z",
      }),
    ],
    isLoading: false,
    buildTaskTree: (tasks: any[]) => tasks,
  });

  const { result } = renderHook(() => useTasksViewAdapter());

  expect(result.current.output.filterControls.queue.options.map((option) => option.label)).toEqual([
    "All 3",
    "My Queue 2",
    "Team Queue 1",
  ]);
  expect(result.current.output.filterControls.bucket.options.map((option) => option.label)).toEqual([
    "All 3",
    "New 1",
    "Doing 1",
    "Review 1",
  ]);
  expect(result.current.output.taskRowItems.map((row) => row.taskId)).toEqual([
    "task-critical-review",
    "task-high-new",
    "task-high-wip",
  ]);
});
```

- [ ] **Step 2: Add a failing screen test for dropdown-driven rendering instead of queue wrappers**

```tsx
it("renders dropdown filters and one continuous task list", () => {
  const screen = render(
    <TasksScreen
      onNavigateToTaskDetail={jest.fn()}
      onNavigateToCreateTask={jest.fn()}
    />,
  );

  expect(screen.getByTestId("tasks-screen__filter_queue")).toBeTruthy();
  expect(screen.getByTestId("tasks-screen__filter_bucket")).toBeTruthy();
  expect(screen.getByTestId("tasks-screen__task_list")).toBeTruthy();
  expect(screen.queryByTestId("tasks-screen__queues")).toBeNull();
});
```

- [ ] **Step 3: Run the focused Tasks tests to verify they fail for the expected reason**

Run: `npx jest src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts src/screens/__tests__/TasksScreen.test.tsx --runInBand`

Expected: failures because the current adapter still returns `queuePanels` and the current screen still renders the queue-wrapper layout.

## Task 4: Implement The Search-First Tasks Adapter Contract

**Files:**
- Modify: `src/ui/contracts/viewAdapters.ts`
- Modify: `src/ui/viewAdapters/useTasksViewAdapter.ts`

- [ ] **Step 1: Add explicit dropdown filter types to the Tasks contract**

```ts
export interface TasksFilterOption {
  id: string;
  value: "all" | TasksQueueId | "new" | "wip" | "review";
  label: string;
  count: number;
  isSelected: boolean;
}

export interface TasksFilterControl {
  id: "queue" | "bucket";
  label: string;
  selectedValue: string;
  options: TasksFilterOption[];
}
```

```ts
export interface TasksScreenViewAdapterOutput {
  screenId: "TasksScreen";
  readiness: NavigationScreenReadiness;
  continuity: ScreenContinuityContract;
  filterSummary: TasksFilterSummary;
  filterControls: {
    queue: TasksFilterControl;
    bucket: TasksFilterControl;
  };
  taskRowItems: TasksScreenRowItem[];
  scalarMetrics: TasksScalarMetrics;
}
```

- [ ] **Step 2: Add queue/bucket selection state with `All` defaults**

```ts
const [selectedQueue, setSelectedQueue] = useState<"all" | TasksQueueId>("all");
const [selectedBucket, setSelectedBucket] = useState<"all" | "new" | "wip" | "review">("all");
```

- [ ] **Step 3: Add stable helpers for priority and status-flow ordering**

```ts
function getPriorityRank(priority: Priority): number {
  switch (priority) {
    case "critical":
      return 0;
    case "high":
      return 1;
    case "medium":
      return 2;
    case "low":
      return 3;
    default:
      return 4;
  }
}

function getStatusFlowRank(status: TaskStatus): number {
  if (matchesNewStatusFilter(status)) return 0;
  if (matchesWipStatusFilter(status)) return 1;
  if (matchesReviewingStatusFilter(status)) return 2;
  return 3;
}
```

```ts
function compareTasksForSearchFirstList(left: Task, right: Task): number {
  const priorityDelta = getPriorityRank(left.priority) - getPriorityRank(right.priority);
  if (priorityDelta !== 0) return priorityDelta;

  const recencyDelta = getLatestMeaningfulTimestamp(right).localeCompare(getLatestMeaningfulTimestamp(left));
  if (recencyDelta !== 0) return recencyDelta;

  return getStatusFlowRank(left.status) - getStatusFlowRank(right.status);
}
```

- [ ] **Step 4: Build the filter option counts from the current project scope, with bucket counts derived from the selected queue**

```ts
const queueFilteredTasks = selectedQueue === "all"
  ? candidateTasks
  : candidateTasks.filter((task) => resolveQueueForTask(task, currentUserId) === selectedQueue);

const queueOptions = [
  { id: "queue:all", value: "all", label: `All ${candidateTasks.length}`, count: candidateTasks.length, isSelected: selectedQueue === "all" },
  { id: "queue:my_queue", value: "my_queue", label: `My Queue ${myQueueTasks.length}`, count: myQueueTasks.length, isSelected: selectedQueue === "my_queue" },
  { id: "queue:team_queue", value: "team_queue", label: `Team Queue ${teamQueueTasks.length}`, count: teamQueueTasks.length, isSelected: selectedQueue === "team_queue" },
];

const bucketOptions = [
  { id: "bucket:all", value: "all", label: `All ${queueFilteredTasks.length}`, count: queueFilteredTasks.length, isSelected: selectedBucket === "all" },
  { id: "bucket:new", value: "new", label: `New ${newBucketCount}`, count: newBucketCount, isSelected: selectedBucket === "new" },
  { id: "bucket:wip", value: "wip", label: `Doing ${wipBucketCount}`, count: wipBucketCount, isSelected: selectedBucket === "wip" },
  { id: "bucket:review", value: "review", label: `Review ${reviewBucketCount}`, count: reviewBucketCount, isSelected: selectedBucket === "review" },
];
```

- [ ] **Step 5: Build one continuous visible list, then apply search on top of the selected queue/bucket slice**

```ts
const filteredTasks = queueFilteredTasks
  .filter((task) => {
    if (selectedBucket === "all") return true;
    return resolveBucketForTask(task) === selectedBucket;
  })
  .filter((task) => {
    const projectName = projectStore.getProjectById(task.projectId)?.name ?? "Project";
    return matchesSearchQuery(task, projectName, normalizedSearchQuery);
  })
  .sort(compareTasksForSearchFirstList);
```

- [ ] **Step 6: Re-run the adapter and screen-focused Tasks tests**

Run: `npx jest src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts src/screens/__tests__/TasksScreen.test.tsx --runInBand`

Expected: either green or failing only on `TasksScreen` because the screen has not been updated yet.

## Task 5: Implement The Search-First Tasks Screen

**Files:**
- Modify: `src/screens/TasksScreen.tsx`

- [ ] **Step 1: Replace the summary pill row with dropdown-style controls**

```tsx
<View className="mb-3 flex-row gap-2">
  <Pressable
    testID="tasks-screen__filter_queue"
    className="flex-1 rounded-2xl bg-white px-4 py-3"
  >
    <Text className="text-xs font-semibold uppercase tracking-wide text-slate-500">Queue</Text>
    <Text className="mt-1 text-sm font-medium text-slate-900">
      {output.filterControls.queue.options.find((option) => option.isSelected)?.label}
    </Text>
  </Pressable>
  <Pressable
    testID="tasks-screen__filter_bucket"
    className="flex-1 rounded-2xl bg-white px-4 py-3"
  >
    <Text className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bucket</Text>
    <Text className="mt-1 text-sm font-medium text-slate-900">
      {output.filterControls.bucket.options.find((option) => option.isSelected)?.label}
    </Text>
  </Pressable>
</View>
```

- [ ] **Step 2: Render one continuous list instead of queue panels**

```tsx
<ScrollView testID="tasks-screen__task_list" className="flex-1 px-4" showsVerticalScrollIndicator={false}>
  {output.taskRowItems.length > 0 ? (
    output.taskRowItems.map((row) => (
      <View key={row.taskId} className="mb-3">
        <ContainerCard contract={mapTaskRowToContainerCardProps(row)} />
      </View>
    ))
  ) : (
    <View testID="tasks-screen__empty_state" className="rounded-3xl bg-white px-4 py-5">
      <Text className="text-base font-semibold text-slate-900">No matching tasks</Text>
      <Text className="mt-1 text-sm text-slate-500">
        Try a different queue, bucket, project, or search term.
      </Text>
    </View>
  )}
  <View className="h-24" />
</ScrollView>
```

- [ ] **Step 3: Keep the search field and existing top-right shortcuts intact**

```tsx
<View className="mb-3">
  <TextField contract={searchContract} onChangeText={setSearchQuery} />
</View>
```

- [ ] **Step 4: Re-run the focused Tasks tests**

Run: `npx jest src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts src/screens/__tests__/TasksScreen.test.tsx --runInBand`

Expected: PASS

## Task 6: Full Validation And Checkpoint

**Files:**
- Modify: none

- [ ] **Step 1: Run the full focused validation set**

Run: `npx jest src/screens/__tests__/DashboardScreen.test.tsx src/screens/__tests__/TasksScreen.test.tsx src/ui/viewAdapters/__tests__/useDashboardViewAdapter.test.ts src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts --runInBand`

Expected: PASS

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`

Expected: PASS with no output

- [ ] **Step 3: Create the checkpoint commit**

```bash
git add src/ui/contracts/viewAdapters.ts src/ui/viewAdapters/useDashboardViewAdapter.ts src/screens/DashboardScreen.tsx src/ui/viewAdapters/useTasksViewAdapter.ts src/screens/TasksScreen.tsx src/screens/__tests__/DashboardScreen.test.tsx src/screens/__tests__/TasksScreen.test.tsx src/ui/viewAdapters/__tests__/useDashboardViewAdapter.test.ts src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts docs/superpowers/specs/2026-07-07-activity-tasks-search-first-fix-design.md docs/superpowers/plans/2026-07-07-activity-tasks-search-first-fix-implementation.md
git commit -m "feat(tasks): switch to search-first list"
```

- [ ] **Step 4: Validate in the running app**

Check:
- `Activity` no longer has the large top gap
- `Active Project` is at section level
- activity rows with photos show a left thumbnail
- activity rows without photos stay text-only
- `Tasks` shows one visible list with no queue wrapper cards
- the queue and bucket dropdown labels include inline counts
- changing the queue selection changes the bucket counts
- `All` + `All` shows the full list ordered by priority, latest update, then status flow

- [ ] **Step 5: Push after verification**

Run: `git push`

Expected: branch updates successfully
