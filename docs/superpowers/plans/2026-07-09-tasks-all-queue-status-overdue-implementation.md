# Tasks All Queue Status Overdue Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current Tasks filter strip with the approved `All / Queue / Status / Overdue` model, remove visible sort controls, default the list to due-date ascending order, and upgrade overdue task cards to a floating `Overdue` badge.

**Architecture:** Move the new filter state model into `useTasksViewAdapter.ts` so reset behavior, queue/status cycles, overdue-only filtering, and fixed due-date ascending ordering stay in one place. Keep `TasksScreen.tsx` presentational by rendering the four approved buttons, applying the `20 pt` search-block spacing, and passing a labeled top-left marker into the existing generic `ActivityStyleRowCard` slot.

**Tech Stack:** TypeScript, React Native, Expo, NativeWind, Jest, React Testing Library.

---

## File Map

**Modify**
- `src/ui/viewAdapters/useTasksViewAdapter.ts`
- `src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts`
- `src/screens/TasksScreen.tsx`
- `src/screens/__tests__/TasksScreen.test.tsx`
- `src/__tests__/integration/TasksScreenInteraction.test.tsx`
- `src/components/cards/__tests__/ActivityStyleRowCard.test.tsx`

**Inspect Only**
- `src/components/cards/ActivityStyleRowCard.tsx`
- `docs/superpowers/specs/2026-07-09-tasks-compact-filter-row-and-card-density-design.md`

---

### Task 1: Replace The Adapter Filter Model With All / Queue / Status / Overdue

**Files:**
- Modify: `src/ui/viewAdapters/useTasksViewAdapter.ts`
- Modify: `src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts`

- [ ] **Step 1: Write the failing adapter tests**

Add focused coverage for the new mode/filter model in `src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts`:

```ts
it("defaults to all mode with due-date ascending ordering and no visible sort controls", () => {
  const { useTaskStore } = require("@/state/taskStore.supabase");

  setupBaseMocks();

  useTaskStore.mockReturnValue({
    tasks: [
      makeTask({
        id: "task-future",
        title: "Future task",
        status: "new",
        dueDate: "2026-07-20T00:00:00.000Z",
        assignedTo: ["user-1"],
        assignedBy: "user-2",
      }),
      makeTask({
        id: "task-overdue",
        title: "Overdue task",
        status: "submitted_for_review",
        dueDate: "2026-07-01T00:00:00.000Z",
        assignedTo: ["user-2"],
        assignedBy: "user-1",
      }),
    ],
    isLoading: false,
    buildTaskTree: (tasks: any[]) => tasks,
  });

  const { result } = renderHook(() => useTasksViewAdapter());

  expect(result.current.output.filterControls.mode.selectedValue).toBe("all");
  expect(result.current.output.filterControls.queue.selectedValue).toBe("my_queue");
  expect(result.current.output.filterControls.status.selectedValue).toBe("new");
  expect(result.current.output.filterControls.sort).toBeUndefined();
  expect(result.current.output.filterControls.sortDirection).toBeUndefined();
  expect(result.current.output.taskRowItems.map((row) => row.taskId)).toEqual([
    "task-overdue",
    "task-future",
  ]);
});

it("cycles queue mine to team, status new to doing to review, and filters overdue-only mode", () => {
  const { useTaskStore } = require("@/state/taskStore.supabase");

  setupBaseMocks();

  useTaskStore.mockReturnValue({
    tasks: [
      makeTask({
        id: "task-my-new",
        title: "My new task",
        status: "new",
        dueDate: "2026-07-09T00:00:00.000Z",
        assignedTo: ["user-1"],
        assignedBy: "user-2",
      }),
      makeTask({
        id: "task-team-review-overdue",
        title: "Team overdue review",
        status: "submitted_for_review",
        dueDate: "2026-07-01T00:00:00.000Z",
        assignedTo: ["user-2"],
        assignedBy: "user-1",
      }),
    ],
    isLoading: false,
    buildTaskTree: (tasks: any[]) => tasks,
  });

  const { result } = renderHook(() => useTasksViewAdapter());

  act(() => {
    result.current.actions.cycleQueue();
    result.current.actions.cycleStatus();
  });

  expect(result.current.output.filterControls.queue.selectedValue).toBe("team_queue");
  expect(result.current.output.filterControls.status.selectedValue).toBe("wip");

  act(() => {
    result.current.actions.selectOverdueOnly();
  });

  expect(result.current.output.filterControls.mode.selectedValue).toBe("overdue");
  expect(result.current.output.taskRowItems.map((row) => row.taskId)).toEqual([
    "task-team-review-overdue",
  ]);
});

it("resets back to the full task list when all mode is selected", () => {
  const { useTaskStore } = require("@/state/taskStore.supabase");

  setupBaseMocks();

  useTaskStore.mockReturnValue({
    tasks: [
      makeTask({
        id: "task-my-new",
        title: "My new task",
        status: "new",
        dueDate: "2026-07-09T00:00:00.000Z",
        assignedTo: ["user-1"],
        assignedBy: "user-2",
      }),
      makeTask({
        id: "task-team-overdue",
        title: "Team overdue task",
        status: "submitted_for_review",
        dueDate: "2026-07-01T00:00:00.000Z",
        assignedTo: ["user-2"],
        assignedBy: "user-1",
      }),
    ],
    isLoading: false,
    buildTaskTree: (tasks: any[]) => tasks,
  });

  const { result } = renderHook(() => useTasksViewAdapter());

  act(() => {
    result.current.actions.selectOverdueOnly();
    result.current.actions.selectAllMode();
  });

  expect(result.current.output.filterControls.mode.selectedValue).toBe("all");
  expect(result.current.output.taskRowItems.map((row) => row.taskId)).toEqual([
    "task-team-overdue",
    "task-my-new",
  ]);
});
```

- [ ] **Step 2: Run the adapter tests to verify they fail**

Run:

```bash
npx jest --runInBand --runTestsByPath /Volumes/KooDrive/InsiteApp/src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts
```

Expected: FAIL because the adapter still exposes `bucket`, `sort`, and `sortDirection`, still defaults to the previous simplified queue/bucket model, and does not support `All` mode or `Overdue` mode.

- [ ] **Step 3: Implement the new adapter model**

In `src/ui/viewAdapters/useTasksViewAdapter.ts`, replace the current queue/bucket/sort state with the approved mode/queue/status model:

```ts
type TasksFilterMode = "all" | "overdue";
type TasksQueueCycleValue = "my_queue" | "team_queue";
type TasksStatusCycleValue = "new" | "wip" | "review";

const QUEUE_CYCLE: TasksQueueCycleValue[] = ["my_queue", "team_queue"];
const STATUS_CYCLE: TasksStatusCycleValue[] = ["new", "wip", "review"];
```

Add default state and reset behavior:

```ts
const [selectedMode, setSelectedMode] = useState<TasksFilterMode>("all");
const [selectedQueue, setSelectedQueue] = useState<TasksQueueCycleValue>("my_queue");
const [selectedStatus, setSelectedStatus] = useState<TasksStatusCycleValue>("new");

const resetFilters = () => {
  setSearchQuery("");
  setSelectedMode("all");
  setSelectedQueue("my_queue");
  setSelectedStatus("new");
  setExpandedTaskIds([]);
  projectFilterStore.resetFilters();
};
```

Replace the visible-task filtering pipeline:

```ts
const baseTasks = candidateTasks.filter((task) => {
  if (selectedMode === "overdue") {
    return isTaskOverdue(task);
  }

  return true;
});

const queueScopedTasks =
  selectedMode === "all"
    ? baseTasks
    : baseTasks.filter((task) => resolveQueueForTask(task, currentUserId) === selectedQueue);

const statusScopedTasks =
  selectedMode === "all"
    ? queueScopedTasks
    : queueScopedTasks.filter((task) => resolveBucketForTask(task) === selectedStatus);

const searchScopedTasks =
  normalizedSearchQuery.length > 0
    ? statusScopedTasks.filter((task) => matchesTaskSearch(task, normalizedSearchQuery))
    : statusScopedTasks;

const sortedVisibleTasks = [...searchScopedTasks].sort((left, right) => {
  const leftDue = left.dueDate ?? "9999-12-31T00:00:00.000Z";
  const rightDue = right.dueDate ?? "9999-12-31T00:00:00.000Z";
  return leftDue.localeCompare(rightDue);
});
```

Replace `filterControls` with the new shape and remove `sort` / `sortDirection` entirely:

```ts
filterControls: {
  mode: {
    id: "mode",
    label: "Mode",
    selectedValue: selectedMode,
    options: [
      { id: "mode:all", value: "all", label: "All", count: candidateTasks.length, isSelected: selectedMode === "all" },
      {
        id: "mode:overdue",
        value: "overdue",
        label: "Overdue",
        count: candidateTasks.filter((task) => isTaskOverdue(task)).length,
        isSelected: selectedMode === "overdue",
      },
    ],
  },
  queue: {
    id: "queue",
    label: "Queue",
    selectedValue: selectedQueue,
    options: [
      { id: "queue:my_queue", value: "my_queue", label: "Mine", count: myQueueTasks.length, isSelected: selectedQueue === "my_queue" },
      { id: "queue:team_queue", value: "team_queue", label: "Team", count: teamQueueTasks.length, isSelected: selectedQueue === "team_queue" },
    ],
  },
  status: {
    id: "status",
    label: "Status",
    selectedValue: selectedStatus,
    options: [
      { id: "status:new", value: "new", label: "New", count: bucketCounts.new, isSelected: selectedStatus === "new" },
      { id: "status:wip", value: "wip", label: "Doing", count: bucketCounts.wip, isSelected: selectedStatus === "wip" },
      { id: "status:review", value: "review", label: "Review", count: bucketCounts.review, isSelected: selectedStatus === "review" },
    ],
  },
},
```

Add the new actions:

```ts
const cycleQueue = () => {
  setSelectedQueue((current) => getNextCycleValue(QUEUE_CYCLE, current));
};

const cycleStatus = () => {
  setSelectedStatus((current) => getNextCycleValue(STATUS_CYCLE, current));
};

const selectAllMode = () => {
  setSelectedMode("all");
};

const selectOverdueOnly = () => {
  setSelectedMode("overdue");
};
```

Return them from the hook and remove the old sort actions from the Tasks screen-facing contract.

- [ ] **Step 4: Run the adapter tests to verify they pass**

Run:

```bash
npx jest --runInBand --runTestsByPath /Volumes/KooDrive/InsiteApp/src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts
```

Expected: PASS, with the new `All / Queue / Status / Overdue` behavior and fixed due-date ascending ordering.

- [ ] **Step 5: Commit**

```bash
git add src/ui/viewAdapters/useTasksViewAdapter.ts src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts
git commit -m "feat(tasks): replace filter model with all queue status overdue"
```

---

### Task 2: Rebuild TasksScreen Around The New Four-Button Strip

**Files:**
- Modify: `src/screens/TasksScreen.tsx`
- Modify: `src/screens/__tests__/TasksScreen.test.tsx`
- Modify: `src/components/cards/__tests__/ActivityStyleRowCard.test.tsx`

- [ ] **Step 1: Write the failing screen and badge tests**

Update `src/screens/__tests__/TasksScreen.test.tsx` to assert the new button strip and search spacing:

```ts
it("renders All, Queue, Status, and Overdue buttons with visible titles and no sort button", () => {
  const screen = render(
    <TasksScreen
      onNavigateToTaskDetail={jest.fn()}
      onNavigateToCreateTask={jest.fn()}
    />,
  );

  expect(within(screen.getByTestId("tasks-screen__filter_all")).getByText("All")).toBeTruthy();
  expect(within(screen.getByTestId("tasks-screen__filter_queue")).getByText("Queue")).toBeTruthy();
  expect(within(screen.getByTestId("tasks-screen__filter_status")).getByText("Status")).toBeTruthy();
  expect(within(screen.getByTestId("tasks-screen__filter_overdue")).getByText("Overdue")).toBeTruthy();
  expect(screen.queryByTestId("tasks-screen__filter_sort")).toBeNull();
  expect(screen.queryByTestId("tasks-screen__filter_sort_direction")).toBeNull();
});

it("applies 20pt outer spacing around the search bar block", () => {
  const screen = render(
    <TasksScreen
      onNavigateToTaskDetail={jest.fn()}
      onNavigateToCreateTask={jest.fn()}
    />,
  );

  expect(screen.getByTestId("tasks-screen__search_section").props.className).toContain("pt-5");
  expect(screen.getByTestId("tasks-screen__search_wrapper").props.className).toContain("mb-5");
});

it("renders the floating Overdue badge instead of the old dot marker on overdue task cards", () => {
  const screen = render(
    <TasksScreen
      onNavigateToTaskDetail={jest.fn()}
      onNavigateToCreateTask={jest.fn()}
    />,
  );

  expect(screen.getByTestId("tasks-screen__row_task-2:overdue-badge")).toBeTruthy();
  expect(screen.getByText("Overdue")).toBeTruthy();
  expect(screen.queryByTestId("tasks-screen__row_task-2:overdue-dot")).toBeNull();
});
```

Add a focused shared-card badge test in `src/components/cards/__tests__/ActivityStyleRowCard.test.tsx`:

```ts
it("renders a labeled floating top-left badge when provided", () => {
  const screen = render(
    <ActivityStyleRowCard
      testID="shared-card:task-overdue"
      title="Overdue inspection"
      subtitle="North Tower"
      metaLabel="Due: 2026-07-01"
      badgeLabel="Review"
      badgeVariant="pill"
      topLeftMarker={
        <View
          testID="shared-card:task-overdue:overdue-badge"
          className="rounded-full bg-red-500 px-2.5 py-1"
        >
          <Text className="text-xs font-semibold text-white">Overdue</Text>
        </View>
      }
    />
  );

  expect(screen.getByTestId("shared-card:task-overdue:overdue-badge")).toBeTruthy();
  expect(screen.getByText("Overdue")).toBeTruthy();
});
```

- [ ] **Step 2: Run the focused tests to verify they fail**

Run:

```bash
npx jest --runInBand --runTestsByPath /Volumes/KooDrive/InsiteApp/src/screens/__tests__/TasksScreen.test.tsx /Volumes/KooDrive/InsiteApp/src/components/cards/__tests__/ActivityStyleRowCard.test.tsx
```

Expected: FAIL because the screen still renders the old queue/bucket/sort/order controls, still uses the smaller red dot marker, and does not apply the `20 pt` search-block spacing.

- [ ] **Step 3: Implement the minimal screen and badge changes**

In `src/screens/TasksScreen.tsx`, replace the current selected-label reads with the new filter-control sources:

```ts
const isAllMode = output.filterControls?.mode?.selectedValue === "all";
const isOverdueMode = output.filterControls?.mode?.selectedValue === "overdue";
const selectedQueueLabel =
  output.filterControls?.queue?.options.find((option) => option.isSelected)?.label ?? "Mine";
const selectedStatusLabel =
  output.filterControls?.status?.options.find((option) => option.isSelected)?.label ?? "New";
```

Apply the search-block spacing and render the new four-button strip:

```tsx
<View testID="tasks-screen__search_section" className="px-4 pt-5">
  <View testID="tasks-screen__search_wrapper" className="mb-5">
    <TextField
      contract={searchContract}
      onChangeText={setSearchQuery}
      rightSlot={
        <View testID="tasks-screen__search_count" className="rounded-full bg-slate-100 px-3 py-1">
          <Text className="text-base font-medium text-slate-700">{visibleTaskCount}</Text>
        </View>
      }
    />
  </View>
  <View testID="tasks-screen__filter_row" className="mb-2 flex-row flex-wrap items-stretch gap-2">
    <Pressable
      testID="tasks-screen__filter_all"
      onPress={actions.selectAllMode}
      className="min-w-0 flex-1 rounded-2xl bg-white px-3 py-2.5"
    >
      <Text className="text-sm font-semibold uppercase tracking-wide text-slate-500">All</Text>
      <Text className="mt-0.5 text-base font-medium text-slate-900" numberOfLines={1}>
        {isAllMode ? "Active" : "Show all"}
      </Text>
    </Pressable>

    <Pressable
      testID="tasks-screen__filter_queue"
      onPress={actions.cycleQueue}
      className="min-w-0 flex-1 rounded-2xl bg-white px-3 py-2.5"
    >
      <Text className="text-sm font-semibold uppercase tracking-wide text-slate-500">Queue</Text>
      <Text className="mt-0.5 text-base font-medium text-slate-900" numberOfLines={1}>
        {selectedQueueLabel}
      </Text>
    </Pressable>

    <Pressable
      testID="tasks-screen__filter_status"
      onPress={actions.cycleStatus}
      className="min-w-0 flex-1 rounded-2xl bg-white px-3 py-2.5"
    >
      <Text className="text-sm font-semibold uppercase tracking-wide text-slate-500">Status</Text>
      <Text className="mt-0.5 text-base font-medium text-slate-900" numberOfLines={1}>
        {selectedStatusLabel}
      </Text>
    </Pressable>

    <Pressable
      testID="tasks-screen__filter_overdue"
      onPress={actions.selectOverdueOnly}
      className="min-w-0 flex-1 rounded-2xl bg-white px-3 py-2.5"
    >
      <Text className="text-sm font-semibold uppercase tracking-wide text-slate-500">Overdue</Text>
      <Text className="mt-0.5 text-base font-medium text-slate-900" numberOfLines={1}>
        {isOverdueMode ? "Active" : "Show overdue"}
      </Text>
    </Pressable>
  </View>
</View>
```

Replace the old dot marker with the labeled floating badge:

```tsx
topLeftMarker={
  row.isOverdue ? (
    <View
      testID={`tasks-screen__row_${row.taskId}:overdue-badge`}
      className="rounded-full bg-red-500 px-2.5 py-1"
    >
      <Text className="text-xs font-semibold text-white">Overdue</Text>
    </View>
  ) : undefined
}
```

- [ ] **Step 4: Run the focused tests to verify they pass**

Run:

```bash
npx jest --runInBand --runTestsByPath /Volumes/KooDrive/InsiteApp/src/screens/__tests__/TasksScreen.test.tsx /Volumes/KooDrive/InsiteApp/src/components/cards/__tests__/ActivityStyleRowCard.test.tsx
```

Expected: PASS, with the new four-button strip, `20 pt` search-block spacing, and labeled floating `Overdue` badge rendered correctly.

- [ ] **Step 5: Commit**

```bash
git add src/screens/TasksScreen.tsx src/screens/__tests__/TasksScreen.test.tsx src/components/cards/__tests__/ActivityStyleRowCard.test.tsx
git commit -m "feat(tasks): rebuild tasks filter strip and overdue badge"
```

---

### Task 3: Realign Integration Coverage And Run Focused Regression

**Files:**
- Modify: `src/__tests__/integration/TasksScreenInteraction.test.tsx`
- Modify: `src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts`
- Modify: `src/screens/__tests__/TasksScreen.test.tsx`

- [ ] **Step 1: Write the failing integration updates**

Replace the old mocked filter-controls fixture in `src/__tests__/integration/TasksScreenInteraction.test.tsx` with the new shape:

```ts
filterControls: {
  mode: {
    id: "mode",
    label: "Mode",
    selectedValue: "all",
    options: [
      { id: "mode:all", value: "all", label: "All", count: 2, isSelected: true },
      { id: "mode:overdue", value: "overdue", label: "Overdue", count: 1, isSelected: false },
    ],
  },
  queue: {
    id: "queue",
    label: "Queue",
    selectedValue: "my_queue",
    options: [
      { id: "queue:my_queue", value: "my_queue", label: "Mine", count: 1, isSelected: true },
      { id: "queue:team_queue", value: "team_queue", label: "Team", count: 1, isSelected: false },
    ],
  },
  status: {
    id: "status",
    label: "Status",
    selectedValue: "new",
    options: [
      { id: "status:new", value: "new", label: "New", count: 1, isSelected: true },
      { id: "status:wip", value: "wip", label: "Doing", count: 0, isSelected: false },
      { id: "status:review", value: "review", label: "Review", count: 1, isSelected: false },
    ],
  },
},
```

Update the mock actions and visible assertions:

```ts
actions: {
  resetFilters: mockResetFilters,
  selectAllMode: mockSelectAllMode,
  selectOverdueOnly: mockSelectOverdueOnly,
  cycleQueue: mockCycleQueue,
  cycleStatus: mockCycleStatus,
  toggleTaskExpansion: jest.fn(),
},
```

```ts
expect(within(getByTestId("tasks-screen__filter_all")).getByText("All")).toBeTruthy();
expect(within(getByTestId("tasks-screen__filter_queue")).getByText("Queue")).toBeTruthy();
expect(within(getByTestId("tasks-screen__filter_status")).getByText("Status")).toBeTruthy();
expect(within(getByTestId("tasks-screen__filter_overdue")).getByText("Overdue")).toBeTruthy();
expect(queryByTestId("tasks-screen__filter_sort")).toBeNull();
```

- [ ] **Step 2: Run the integration test to verify it fails**

Run:

```bash
npx jest --runInBand --runTestsByPath /Volumes/KooDrive/InsiteApp/src/__tests__/integration/TasksScreenInteraction.test.tsx
```

Expected: FAIL until the mock fixture and assertions are aligned with the new mode/queue/status/overdue model.

- [ ] **Step 3: Implement the minimal integration alignment**

Keep the assertions focused on the new controls and handler wiring:

```ts
fireEvent.press(getByTestId("tasks-screen__filter_all"));
fireEvent.press(getByTestId("tasks-screen__filter_queue"));
fireEvent.press(getByTestId("tasks-screen__filter_status"));
fireEvent.press(getByTestId("tasks-screen__filter_overdue"));

expect(mockSelectAllMode).toHaveBeenCalledTimes(1);
expect(mockCycleQueue).toHaveBeenCalledTimes(1);
expect(mockCycleStatus).toHaveBeenCalledTimes(1);
expect(mockSelectOverdueOnly).toHaveBeenCalledTimes(1);
```

- [ ] **Step 4: Run the focused regression suite**

Run:

```bash
npx jest --runInBand --runTestsByPath /Volumes/KooDrive/InsiteApp/src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts /Volumes/KooDrive/InsiteApp/src/screens/__tests__/TasksScreen.test.tsx /Volumes/KooDrive/InsiteApp/src/__tests__/integration/TasksScreenInteraction.test.tsx /Volumes/KooDrive/InsiteApp/src/components/cards/__tests__/ActivityStyleRowCard.test.tsx
```

Expected: PASS for all four suites, covering the new adapter model, new button strip, search spacing, due-date ascending order, and floating `Overdue` badge.

- [ ] **Step 5: Run diagnostics and manual QA**

Check the edited files for new diagnostics, then verify this exact simulator flow:

```text
1. Open the Tasks screen on the iPhone simulator.
2. Confirm the search section has visibly larger spacing above and below the search bar.
3. Confirm the visible Search label is gone.
4. Confirm the button strip is All / Queue / Status / Overdue.
5. Confirm Queue cycles Mine -> Team.
6. Confirm Status cycles New -> Doing -> Review.
7. Confirm Overdue filters to overdue-only tasks.
8. Confirm there is no Sort button or sort-direction button.
9. Confirm task rows are ordered by earliest due date first, with the most overdue item on top.
10. Confirm overdue tasks show a floating red Overdue badge in the upper-left corner.
```

Expected: The rewritten Tasks filter model behaves exactly as specified and no legacy sort/bucket controls remain visible.

---

## Scope Check

- Covered: `All / Queue / Status / Overdue` controls, `20 pt` search spacing, no visible sort controls, due-date ascending ordering, and labeled floating overdue badge.
- Intentionally unchanged: shared-card generic API shape, Activity screen controls, task-store persistence, and any filter concepts outside the approved four-button model.
