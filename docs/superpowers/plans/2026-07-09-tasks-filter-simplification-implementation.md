# Tasks Filter Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplify the Tasks screen filters by removing visible titles and counters, removing `All` from Queue and Bucket cycles, shortening sort labels, and keeping the overdue red-dot task-card treatment.

**Architecture:** Move the cycle and visible-label changes into `useTasksViewAdapter.ts` so the screen receives the correct button values and default states from one place. Keep `TasksScreen.tsx` focused on presentation by hiding the text-button titles and rendering only the selected values while preserving the current compact layout, hidden search label, and overdue-dot card wiring.

**Tech Stack:** TypeScript, React Native, Expo, NativeWind, Jest, React Testing Library.

---

## File Map

**Modify**
- `src/ui/viewAdapters/useTasksViewAdapter.ts`
- `src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts`
- `src/screens/TasksScreen.tsx`
- `src/screens/__tests__/TasksScreen.test.tsx`
- `src/__tests__/integration/TasksScreenInteraction.test.tsx`

**Inspect Only**
- `docs/superpowers/specs/2026-07-09-tasks-compact-filter-row-and-card-density-design.md`
- `src/components/cards/ActivityStyleRowCard.tsx`

---

### Task 1: Simplify Adapter Cycles, Defaults, And Visible Filter Labels

**Files:**
- Modify: `src/ui/viewAdapters/useTasksViewAdapter.ts`
- Modify: `src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts`

- [ ] **Step 1: Write the failing adapter tests**

Add focused coverage for the simplified queue/bucket cycles, default selections, and shortened sort labels in `src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts`:

```ts
it("removes All from queue and bucket cycles and defaults to my queue plus new", () => {
  const { useTaskStore } = require("@/state/taskStore.supabase");

  setupBaseMocks();

  useTaskStore.mockReturnValue({
    tasks: [
      makeTask({
        id: "task-my-new",
        title: "My new task",
        status: "new",
        assignedTo: ["user-1"],
        assignedBy: "user-2",
      }),
      makeTask({
        id: "task-team-review",
        title: "Team review task",
        status: "submitted_for_review",
        assignedTo: ["user-2"],
        assignedBy: "user-1",
      }),
    ],
    isLoading: false,
    buildTaskTree: (tasks: any[]) => tasks,
  });

  const { result } = renderHook(() => useTasksViewAdapter());

  expect(result.current.output.filterControls.queue.selectedValue).toBe("my_queue");
  expect(result.current.output.filterControls.bucket.selectedValue).toBe("new");
  expect(result.current.output.filterControls.queue.options.map((option) => option.value)).toEqual([
    "my_queue",
    "team_queue",
  ]);
  expect(result.current.output.filterControls.bucket.options.map((option) => option.value)).toEqual([
    "new",
    "wip",
    "review",
  ]);

  act(() => {
    result.current.actions.cycleQueue();
    result.current.actions.cycleBucket();
  });

  expect(result.current.output.filterControls.queue.selectedValue).toBe("team_queue");
  expect(result.current.output.filterControls.bucket.selectedValue).toBe("wip");
});

it("shortens visible sort labels for modified and created", () => {
  const { useTaskStore } = require("@/state/taskStore.supabase");

  setupBaseMocks();

  useTaskStore.mockReturnValue({
    tasks: [
      makeTask({
        id: "task-sort-labels",
        title: "Sort labels task",
        status: "new",
        assignedTo: ["user-1"],
        assignedBy: "user-2",
      }),
    ],
    isLoading: false,
    buildTaskTree: (tasks: any[]) => tasks,
  });

  const { result } = renderHook(() => useTasksViewAdapter());

  expect(result.current.output.filterControls.sort.options.map((option) => option.label)).toEqual([
    "Due date",
    "Mod. date",
    "Created on",
  ]);
});

it("normalizes legacy All launch presets into the simplified queue and bucket defaults", () => {
  const { useTaskStore } = require("@/state/taskStore.supabase");
  const useEffectSpy = jest.spyOn(React, "useEffect").mockImplementation(() => undefined);

  setupBaseMocks({
    tasksLaunchPreset: {
      queue: "all",
      bucket: "all",
      source: "activity_dashboard",
    },
  });

  useTaskStore.mockReturnValue({
    tasks: [
      makeTask({
        id: "task-my-default",
        title: "My default task",
        status: "new",
        assignedTo: ["user-1"],
        assignedBy: "user-2",
      }),
    ],
    isLoading: false,
    buildTaskTree: (tasks: any[]) => tasks,
  });

  const { result } = renderHook(() => useTasksViewAdapter());

  expect(result.current.output.filterControls.queue.selectedValue).toBe("my_queue");
  expect(result.current.output.filterControls.bucket.selectedValue).toBe("new");

  useEffectSpy.mockRestore();
});
```

- [ ] **Step 2: Run the adapter tests to verify they fail**

Run:

```bash
npx jest src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts --runInBand
```

Expected: FAIL because the adapter still exposes `all` in both cycles, still defaults to `all/all`, and still returns `Modified date` plus `Creation date`.

- [ ] **Step 3: Implement the simplified adapter behavior**

Update the cycle constants and legacy-normalization helpers near the top of `src/ui/viewAdapters/useTasksViewAdapter.ts`:

```ts
const QUEUE_CYCLE: TasksQueueId[] = ["my_queue", "team_queue"];
const BUCKET_CYCLE: Array<"new" | "wip" | "review"> = ["new", "wip", "review"];
const SORT_FIELD_CYCLE: TasksSortField[] = ["due_date", "modified_at", "created_at"];

function normalizeSimplifiedQueue(queue: "all" | TasksQueueId): TasksQueueId {
  return queue === "all" ? "my_queue" : queue;
}

function normalizeSimplifiedBucket(
  bucket: "all" | "new" | "wip" | "review" | "overdue",
): "new" | "wip" | "review" {
  if (bucket === "wip") {
    return "wip";
  }

  if (bucket === "review") {
    return "review";
  }

  return "new";
}
```

Replace the initial-selection/default state wiring:

```ts
const initialFilterSelection = useMemo(() => {
  if (projectFilterStore.tasksLaunchPreset) {
    return {
      queue: normalizeSimplifiedQueue(projectFilterStore.tasksLaunchPreset.queue),
      bucket: normalizeSimplifiedBucket(projectFilterStore.tasksLaunchPreset.bucket),
    };
  }

  return {
    queue: "my_queue" as const,
    bucket: "new" as const,
  };
}, [projectFilterStore.tasksLaunchPreset]);
```

```ts
const [selectedQueue, setSelectedQueue] = useState<TasksQueueId>(initialFilterSelection.queue);
const [selectedBucket, setSelectedBucket] = useState<"new" | "wip" | "review">(initialFilterSelection.bucket);
```

Update the launch-preset effect and reset path:

```ts
useEffect(() => {
  if (!tasksLaunchPreset) {
    return;
  }

  setSelectedQueue(normalizeSimplifiedQueue(tasksLaunchPreset.queue));
  setSelectedBucket(normalizeSimplifiedBucket(tasksLaunchPreset.bucket));
  clearTasksLaunchPreset?.();
}, [clearTasksLaunchPreset, tasksLaunchPreset]);
```

```ts
const resetFilters = () => {
  setSearchQuery("");
  setSelectedQueue("my_queue");
  setSelectedBucket("new");
  setExpandedTaskIds([]);
  projectFilterStore.resetFilters();
};
```

Narrow the queue/bucket filtering branches and options:

```ts
const queueScopedTasks = candidateTasks.filter(
  (task) => resolveQueueForTask(task, currentUserId) === selectedQueue,
);

const bucketScopedTasks = queueScopedTasks.filter(
  (task) => resolveBucketForTask(task) === selectedBucket,
);
```

```ts
queue: {
  id: "queue" as const,
  label: "Queue",
  selectedValue: selectedQueue,
  options: [
    {
      id: "queue:my_queue",
      value: "my_queue" as const,
      label: "My Queue",
      count: myQueueTasks.length,
      isSelected: selectedQueue === "my_queue",
    },
    {
      id: "queue:team_queue",
      value: "team_queue" as const,
      label: "Team Queue",
      count: teamQueueTasks.length,
      isSelected: selectedQueue === "team_queue",
    },
  ],
},
bucket: {
  id: "bucket" as const,
  label: "Bucket",
  selectedValue: selectedBucket,
  options: [
    {
      id: "bucket:new",
      value: "new" as const,
      label: "New",
      count: bucketCounts.new,
      isSelected: selectedBucket === "new",
    },
    {
      id: "bucket:wip",
      value: "wip" as const,
      label: "Doing",
      count: bucketCounts.wip,
      isSelected: selectedBucket === "wip",
    },
    {
      id: "bucket:review",
      value: "review" as const,
      label: "Review",
      count: bucketCounts.review,
      isSelected: selectedBucket === "review",
    },
  ],
},
```

Shorten the visible sort labels:

```ts
sort: {
  id: "sort",
  label: "Sort by",
  selectedValue: selectedSortField,
  options: [
    {
      id: "sort:due_date",
      value: "due_date" as const,
      label: "Due date",
      count: sortedVisibleTasks.length,
      isSelected: selectedSortField === "due_date",
    },
    {
      id: "sort:modified_at",
      value: "modified_at" as const,
      label: "Mod. date",
      count: sortedVisibleTasks.length,
      isSelected: selectedSortField === "modified_at",
    },
    {
      id: "sort:created_at",
      value: "created_at" as const,
      label: "Created on",
      count: sortedVisibleTasks.length,
      isSelected: selectedSortField === "created_at",
    },
  ],
},
```

Keep the existing action names, but narrow their accepted values to the simplified sets:

```ts
selectQueue: (queue: TasksQueueId) => void;
selectBucket: (bucket: "new" | "wip" | "review") => void;
```

Update the remaining simplified-state semantics so they no longer reference removed `all` values:

```ts
scalarMetrics: {
  totalVisibleTaskCount: taskRowItems.length,
  overdueVisibleTaskCount,
  selectedProjectTaskCount: candidateTasks.length,
  hasActiveFilters: Boolean(
    selectedProjectId || selectedQueue !== "my_queue" || selectedBucket !== "new",
  ),
},
```

```ts
const selectQueue = (queue: TasksQueueId) => {
  setSelectedQueue(queue);
};

const selectBucket = (bucket: "new" | "wip" | "review") => {
  setSelectedBucket(bucket);
};
```

- [ ] **Step 4: Run the adapter tests to verify they pass**

Run:

```bash
npx jest src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts --runInBand
```

Expected: PASS, with simplified queue/bucket defaults, no `All` in either cycle, and shortened sort labels available to the screen.

- [ ] **Step 5: Commit**

```bash
git add src/ui/viewAdapters/useTasksViewAdapter.ts src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts
git commit -m "feat(tasks): simplify filter adapter cycles"
```

---

### Task 2: Remove Visible Filter Titles And Render The Simplified Button Values

**Files:**
- Modify: `src/screens/TasksScreen.tsx`
- Modify: `src/screens/__tests__/TasksScreen.test.tsx`

- [ ] **Step 1: Write the failing Tasks screen tests**

Update `src/screens/__tests__/TasksScreen.test.tsx` so it asserts the simplified visible button content:

```ts
it("removes visible filter titles and shows simplified selected values only", () => {
  const screen = render(
    <TasksScreen
      onNavigateToTaskDetail={jest.fn()}
      onNavigateToCreateTask={jest.fn()}
    />,
  );

  expect(screen.queryByText("Queue")).toBeNull();
  expect(screen.queryByText("Bucket")).toBeNull();
  expect(screen.queryByText("Sort by")).toBeNull();
  expect(within(screen.getByTestId("tasks-screen__filter_queue")).getByText("My Queue")).toBeTruthy();
  expect(within(screen.getByTestId("tasks-screen__filter_bucket")).getByText("New")).toBeTruthy();
  expect(within(screen.getByTestId("tasks-screen__filter_sort")).getByText("Mod. date")).toBeTruthy();
  expect(screen.queryByText("All")).toBeNull();
});

it("keeps simplified filter buttons within the compact layout and flips through the new cycles", () => {
  const screen = render(
    <TasksScreen
      onNavigateToTaskDetail={jest.fn()}
      onNavigateToCreateTask={jest.fn()}
    />,
  );

  expect(screen.getByTestId("tasks-screen__filter_row").props.className).toContain("flex-wrap");
  expect(within(screen.getByTestId("tasks-screen__filter_queue")).getByText("My Queue").props.numberOfLines).toBe(2);
  expect(within(screen.getByTestId("tasks-screen__filter_bucket")).getByText("New").props.numberOfLines).toBe(2);
  expect(within(screen.getByTestId("tasks-screen__filter_sort")).getByText("Mod. date").props.numberOfLines).toBe(2);

  fireEvent.press(screen.getByTestId("tasks-screen__filter_queue"));
  expect(within(screen.getByTestId("tasks-screen__filter_queue")).getByText("Team Queue")).toBeTruthy();

  fireEvent.press(screen.getByTestId("tasks-screen__filter_bucket"));
  expect(within(screen.getByTestId("tasks-screen__filter_bucket")).getByText("Doing")).toBeTruthy();

  fireEvent.press(screen.getByTestId("tasks-screen__filter_sort"));
  expect(within(screen.getByTestId("tasks-screen__filter_sort")).getByText("Created on")).toBeTruthy();
});
```

- [ ] **Step 2: Run the Tasks screen tests to verify they fail**

Run:

```bash
npx jest --runInBand --runTestsByPath /Volumes/KooDrive/InsiteApp/src/screens/__tests__/TasksScreen.test.tsx
```

Expected: FAIL because the screen still renders visible titles above the selected values and still uses the older adapter-provided defaults/labels.

- [ ] **Step 3: Implement the minimal Tasks screen presentation change**

In `src/screens/TasksScreen.tsx`, remove the now-obsolete counter-stripping helper and render only the selected values returned by the adapter:

```ts
const selectedQueueLabel =
  output.filterControls?.queue?.options.find((option) => option.isSelected)?.label ?? "My Queue";
const selectedBucketLabel =
  output.filterControls?.bucket?.options.find((option) => option.isSelected)?.label ?? "New";
const selectedSortLabel =
  output.filterControls?.sort?.options.find((option) => option.isSelected)?.label ?? "Mod. date";
```

Replace the text-based filter button bodies with value-only content:

```tsx
<Pressable
  testID="tasks-screen__filter_queue"
  onPress={actions.cycleQueue}
  className="min-w-0 flex-1 rounded-2xl bg-white px-3 py-3"
>
  <Text className="text-base font-medium text-slate-900" numberOfLines={2}>
    {selectedQueueLabel}
  </Text>
</Pressable>

<Pressable
  testID="tasks-screen__filter_bucket"
  onPress={actions.cycleBucket}
  className="min-w-0 flex-1 rounded-2xl bg-white px-3 py-3"
>
  <View className="flex-row items-start justify-between gap-2">
    <Text className="min-w-0 flex-1 text-base font-medium text-slate-900" numberOfLines={2}>
      {selectedBucketLabel}
    </Text>
    {overdueVisibleTaskCount > 0 ? (
      <View
        testID="tasks-screen__filter_bucket_badge"
        className="min-w-[20px] rounded-full bg-red-500 px-1.5 py-0.5"
      >
        <Text className="text-center text-xs font-semibold text-white">{overdueVisibleTaskCount}</Text>
      </View>
    ) : null}
  </View>
</Pressable>

<Pressable
  testID="tasks-screen__filter_sort"
  onPress={actions.cycleSortField}
  className="min-w-0 flex-1 rounded-2xl bg-white px-3 py-3"
>
  <Text className="text-base font-medium text-slate-900" numberOfLines={2}>
    {selectedSortLabel}
  </Text>
</Pressable>
```

Leave the hidden `Search` label, order button, and overdue-dot card styling intact.

- [ ] **Step 4: Run the Tasks screen tests to verify they pass**

Run:

```bash
npx jest --runInBand --runTestsByPath /Volumes/KooDrive/InsiteApp/src/screens/__tests__/TasksScreen.test.tsx
```

Expected: PASS, with no visible filter titles, no `All` text, and value-only Queue/Bucket/Sort buttons using the simplified adapter labels.

- [ ] **Step 5: Commit**

```bash
git add src/screens/TasksScreen.tsx src/screens/__tests__/TasksScreen.test.tsx
git commit -m "feat(tasks): simplify visible filter buttons"
```

---

### Task 3: Realign Integration Coverage And Run Focused Regression

**Files:**
- Modify: `src/__tests__/integration/TasksScreenInteraction.test.tsx`
- Modify: `src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts`
- Modify: `src/screens/__tests__/TasksScreen.test.tsx`

- [ ] **Step 1: Write the failing integration assertions**

Update `src/__tests__/integration/TasksScreenInteraction.test.tsx` so the mocked adapter data matches the simplified visible contract:

```ts
queue: {
  id: "queue",
  label: "Queue",
  selectedValue: "my_queue",
  options: [
    { id: "queue:my_queue", value: "my_queue", label: "My Queue", count: 1, isSelected: true },
    { id: "queue:team_queue", value: "team_queue", label: "Team Queue", count: 1, isSelected: false },
  ],
},
bucket: {
  id: "bucket",
  label: "Bucket",
  selectedValue: "new",
  options: [
    { id: "bucket:new", value: "new", label: "New", count: 1, isSelected: true },
    { id: "bucket:wip", value: "wip", label: "Doing", count: 0, isSelected: false },
    { id: "bucket:review", value: "review", label: "Review", count: 1, isSelected: false },
  ],
},
sort: {
  id: "sort",
  label: "Sort by",
  selectedValue: "modified_at",
  options: [
    { id: "sort:due_date", value: "due_date", label: "Due date", count: 1, isSelected: false },
    { id: "sort:modified_at", value: "modified_at", label: "Mod. date", count: 1, isSelected: true },
    { id: "sort:created_at", value: "created_at", label: "Created on", count: 1, isSelected: false },
  ],
},
```

Tighten the assertions:

```ts
expect(queryByText("Queue")).toBeNull();
expect(queryByText("Bucket")).toBeNull();
expect(queryByText("Sort by")).toBeNull();
expect(within(getByTestId("tasks-screen__filter_queue")).getByText("My Queue")).toBeTruthy();
expect(within(getByTestId("tasks-screen__filter_bucket")).getByText("New")).toBeTruthy();
expect(within(getByTestId("tasks-screen__filter_sort")).getByText("Mod. date")).toBeTruthy();
expect(queryByText("All")).toBeNull();
```

- [ ] **Step 2: Run the integration test to verify it fails**

Run:

```bash
npx jest --runInBand --runTestsByPath /Volumes/KooDrive/InsiteApp/src/__tests__/integration/TasksScreenInteraction.test.tsx
```

Expected: FAIL until the mock fixture and assertions align with the new value-only filter button presentation.

- [ ] **Step 3: Implement the minimal integration alignment**

Keep the existing cycle-handler assertions and update the mock fixture plus visible-text assertions only:

```ts
expect(mockCycleQueue).toHaveBeenCalledTimes(1);
expect(mockCycleBucket).toHaveBeenCalledTimes(1);
expect(mockCycleSortField).toHaveBeenCalledTimes(1);
expect(mockToggleSortDirection).toHaveBeenCalledTimes(1);
```

Do not reintroduce `All`, visible titles, or old sort labels in the integration fixture.

- [ ] **Step 4: Run the focused regression suite**

Run:

```bash
npx jest --runInBand --runTestsByPath /Volumes/KooDrive/InsiteApp/src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts /Volumes/KooDrive/InsiteApp/src/screens/__tests__/TasksScreen.test.tsx /Volumes/KooDrive/InsiteApp/src/__tests__/integration/TasksScreenInteraction.test.tsx
```

Expected: PASS for all three suites, covering the simplified adapter cycles, title-free filter buttons, shortened sort labels, hidden search label, and overdue-dot card continuity.

- [ ] **Step 5: Run diagnostics and manual QA**

Check the edited files for newly introduced diagnostics and then verify this exact simulator flow:

```text
1. Open the Tasks screen on the iPhone simulator.
2. Confirm the visible Search label is gone.
3. Confirm Queue, Bucket, and Sort buttons show only selected values with no visible titles.
4. Confirm Queue cycles My Queue -> Team Queue only.
5. Confirm Bucket cycles New -> Doing -> Review only.
6. Confirm Sort cycles Due date -> Mod. date -> Created on.
7. Confirm the order button remains icon-only and uses Latest up / Earliest down.
8. Confirm overdue tasks still show the small red dot in the upper-left card corner.
```

Expected: The simplified filter strip remains within the compact layout, and the task-card overdue indicator remains unchanged.

---

## Scope Check

- Covered: hidden search label, no inline counters, no visible text-button titles, no `All` in Queue/Bucket cycles, shortened sort labels, and preserved overdue-dot task cards.
- Intentionally unchanged: sort-aware task date labels, overall filter-row width strategy, order-button icon-only treatment, bucket overdue-count badge logic, and shared-card layout hooks already implemented in the current workspace.
