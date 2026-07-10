# Tasks Compact Filter Row And Card Density Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Tasks screen dropdown filters with a compact single-row cycling control set, tighten card density, and make the card date label follow the active sort field.

**Architecture:** Keep list-derivation logic inside `useTasksViewAdapter.ts`, where queue/bucket/sort cycles, visible overdue counts, and sort-aware date labels already belong. Keep `TasksScreen.tsx` presentational by removing local dropdown state, rendering the compact row, and passing smaller typography classes into the shared row-card shell without adding Tasks-specific logic to `ActivityStyleRowCard.tsx`.

**Tech Stack:** TypeScript, React Native, Expo, Zustand, NativeWind, Jest, React Testing Library.

---

## File Map

**Modify**
- `src/ui/viewAdapters/useTasksViewAdapter.ts`
- `src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts`
- `src/screens/TasksScreen.tsx`
- `src/screens/__tests__/TasksScreen.test.tsx`

**Inspect Only**
- `src/components/cards/ActivityStyleRowCard.tsx`
- `src/ui/contracts/viewAdapters.ts`

---

### Task 1: Move Filter Cycling And Date Labels Into The Tasks Adapter

**Files:**
- Modify: `src/ui/viewAdapters/useTasksViewAdapter.ts`
- Modify: `src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts`

- [ ] **Step 1: Write the failing adapter tests**

Add adapter coverage for the new sort-option order, cycling-friendly defaults, visible overdue count, and sort-aware date labels in `src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts`:

```ts
it("orders sort options as due, modified, then created", () => {
  const { useTaskStore } = require("@/state/taskStore.supabase");

  setupBaseMocks();

  useTaskStore.mockReturnValue({
    tasks: [
      makeTask({
        id: "task-sort-order",
        title: "Sort order task",
        dueDate: "2026-07-10T00:00:00.000Z",
        createdAt: "2026-07-01T10:00:00.000Z",
        updatedAt: "2026-07-04T10:00:00.000Z",
        assignedTo: ["user-1"],
        assignedBy: "user-2",
      }),
    ],
    isLoading: false,
    buildTaskTree: (tasks: any[]) => tasks,
  });

  const { result } = renderHook(() => useTasksViewAdapter());

  expect(result.current.output.filterControls?.sort.options.map((option) => option.label)).toEqual([
    "Due date",
    "Modified date",
    "Creation date",
  ]);
  expect(result.current.output.filterControls?.sort.selectedValue).toBe("modified_at");
  expect(result.current.output.filterControls?.sortDirection.selectedValue).toBe("desc");
});

it("derives overdue count from the currently visible filtered list", () => {
  const { useTaskStore } = require("@/state/taskStore.supabase");

  setupBaseMocks();

  useTaskStore.mockReturnValue({
    tasks: [
      makeTask({
        id: "task-overdue-visible",
        title: "Visible overdue task",
        status: "new",
        dueDate: "2026-07-01T00:00:00.000Z",
        assignedTo: ["user-1"],
        assignedBy: "user-2",
      }),
      makeTask({
        id: "task-not-overdue",
        title: "Visible current task",
        status: "new",
        dueDate: "2099-07-10T00:00:00.000Z",
        assignedTo: ["user-1"],
        assignedBy: "user-2",
      }),
      makeTask({
        id: "task-team-overdue",
        title: "Hidden overdue team task",
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
    result.current.actions.selectQueue("my_queue");
    result.current.actions.selectBucket("new");
  });

  expect(result.current.output.scalarMetrics.overdueVisibleTaskCount).toBe(1);
});

it("switches row date labels with deterministic fallback based on the active sort field", () => {
  const { useTaskStore } = require("@/state/taskStore.supabase");

  setupBaseMocks();

  useTaskStore.mockReturnValue({
    tasks: [
      makeTask({
        id: "task-date-label",
        title: "Date label task",
        dueDate: undefined,
        createdAt: "2026-07-02T10:00:00.000Z",
        updatedAt: "2026-07-05T10:00:00.000Z",
        assignedTo: ["user-1"],
        assignedBy: "user-2",
      }),
    ],
    isLoading: false,
    buildTaskTree: (tasks: any[]) => tasks,
  });

  const { result } = renderHook(() => useTasksViewAdapter());

  act(() => {
    result.current.actions.selectSortField("due_date");
  });

  expect(result.current.output.taskRowItems[0]?.latestUpdateLabel).toBe("Modified: 2026-07-05");

  act(() => {
    result.current.actions.selectSortField("created_at");
  });

  expect(result.current.output.taskRowItems[0]?.latestUpdateLabel).toBe("Created on: 2026-07-02");
});
```

- [ ] **Step 2: Run the adapter tests to verify they fail**

Run:

```bash
npx jest src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts --runInBand
```

Expected: FAIL because sort options are currently ordered `Creation -> Due -> Modified`, there is no explicit sort-aware date-label fallback, and the adapter does not yet expose purpose-built cycling helpers for the compact controls.

- [ ] **Step 3: Implement fixed cycles, overdue counting, and sort-aware date labels**

In `src/ui/viewAdapters/useTasksViewAdapter.ts`, add explicit cycle order constants and deterministic date-label helpers near the existing sort helpers:

```ts
const QUEUE_CYCLE: Array<"all" | TasksQueueId> = ["all", "my_queue", "team_queue"];
const BUCKET_CYCLE: Array<"all" | "new" | "wip" | "review"> = ["all", "new", "wip", "review"];
const SORT_FIELD_CYCLE: TasksSortField[] = ["due_date", "modified_at", "created_at"];

function getNextCycleValue<TValue extends string>(cycle: TValue[], current: TValue): TValue {
  const currentIndex = cycle.indexOf(current);

  if (currentIndex === -1) {
    return cycle[0];
  }

  return cycle[(currentIndex + 1) % cycle.length];
}

function formatTaskDateLabel(prefix: string, timestamp?: string): string | undefined {
  if (!timestamp) {
    return undefined;
  }

  return `${prefix}: ${timestamp.slice(0, 10)}`;
}

function buildSortAwareDateLabel(task: Task, field: TasksSortField): string | undefined {
  const modifiedAt = getLatestMeaningfulTimestamp(task) || undefined;
  const createdAt = task.createdAt || undefined;
  const dueDate = task.dueDate || undefined;

  if (field === "due_date") {
    return (
      formatTaskDateLabel("Due", dueDate) ??
      formatTaskDateLabel("Modified", modifiedAt) ??
      formatTaskDateLabel("Created on", createdAt)
    );
  }

  if (field === "modified_at") {
    return (
      formatTaskDateLabel("Modified", modifiedAt) ??
      formatTaskDateLabel("Created on", createdAt) ??
      formatTaskDateLabel("Due", dueDate)
    );
  }

  return (
    formatTaskDateLabel("Created on", createdAt) ??
    formatTaskDateLabel("Modified", modifiedAt) ??
    formatTaskDateLabel("Due", dueDate)
  );
}
```

Update row mapping and sort-option ordering in the same file:

```ts
const taskRowItems = sortedVisibleTasks.map<TasksScreenRowItem>((task) => {
  const level = getIndentationLevel(task);
  const queue = resolveQueueForTask(task, currentUserId) ?? "my_queue";
  const bucket = resolveBucketForTask(task) ?? "new";
  const project = projectStore.getProjectById(task.projectId);
  const projectName = project?.name ?? "Project";
  const latestUpdateLabel = buildSortAwareDateLabel(task, selectedSortField);
  const photoUris = collectTaskPhotoUris(task);
  const searchProvenanceLine = `${getQueueTitle(queue)} · ${getBucketTitle(bucket)} · ${projectName}`;
  const contextLine =
    normalizedSearchQuery.length > 0 ? searchProvenanceLine : buildContextLine(task) ?? projectName;

  return {
    id: `tasks-row:${queue}:${bucket}:${task.id}`,
    taskId: task.id,
    title: task.title,
    onPress: props?.onNavigateToTaskDetail ? () => props.onNavigateToTaskDetail?.(task.id) : undefined,
    cardPresentation: "thumbnail",
    statusToken: mapTaskStatusToToken(task.status),
    statusLabel: formatTaskStatusLabel(task.status),
    responsibilityToken: getResponsibilityToken(task, currentUserId),
    priorityLabel: formatPriority(task.priority),
    dueDateLabel: task.dueDate ? task.dueDate.slice(0, 10) : undefined,
    assigneeSummary: buildAssigneeSummary(task),
    projectName,
    isOverdue: isTaskOverdue(task),
    primaryPhotoUri: photoUris[0],
    attachmentUris: photoUris.slice(1),
    indentationLevel: level > 0 ? level : undefined,
    queue,
    queueLabel: getQueueTitle(queue),
    bucket,
    bucketLabel: getBucketTitle(bucket),
    contextLabel: normalizedSearchQuery.length > 0 ? searchProvenanceLine : projectName,
    contextLine,
    latestUpdateAt: getLatestMeaningfulTimestamp(task),
    latestUpdateLabel,
    isExpanded: expandedTaskIds.includes(task.id),
    density: "compact",
    structuralState,
  };
});

const overdueVisibleTaskCount = taskRowItems.filter((row) => row.isOverdue).length;
```

Reorder the sort control options and add explicit compact-control actions:

```ts
export interface TasksViewAdapterHookResult {
  output: TasksScreenViewAdapterOutput;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  searchInput: TasksSearchInputData;
  visibility: {
    showCreateTaskFab: boolean;
    showProfileShortcut: boolean;
    showProjectPickerShortcut: boolean;
    showDeveloperSettingsShortcut: boolean;
    showResetFiltersShortcut: boolean;
  };
  actions: {
    resetFilters: () => void;
    selectQueue: (queue: "all" | TasksQueueId) => void;
    selectBucket: (bucket: "all" | "new" | "wip" | "review" | "overdue") => void;
    selectSortField: (field: TasksSortField) => void;
    selectSortDirection: (direction: TasksSortDirection) => void;
    cycleQueue: () => void;
    cycleBucket: () => void;
    cycleSortField: () => void;
    toggleSortDirection: () => void;
    toggleTaskExpansion: (taskId: string) => void;
  };
}
```

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
      label: "Modified date",
      count: sortedVisibleTasks.length,
      isSelected: selectedSortField === "modified_at",
    },
    {
      id: "sort:created_at",
      value: "created_at" as const,
      label: "Creation date",
      count: sortedVisibleTasks.length,
      isSelected: selectedSortField === "created_at",
    },
  ],
},
```

```ts
const cycleQueue = () => {
  const nextQueue = getNextCycleValue(QUEUE_CYCLE, selectedQueue);
  setSelectedQueue(nextQueue);
  setSelectedBucket("all");
};

const cycleBucket = () => {
  setSelectedBucket((current) => getNextCycleValue(BUCKET_CYCLE, current));
};

const cycleSortField = () => {
  setSelectedSortField((current) => getNextCycleValue(SORT_FIELD_CYCLE, current));
};

const toggleSortDirection = () => {
  setSelectedSortDirection((current) => (current === "desc" ? "asc" : "desc"));
};
```

Return the new actions from the hook:

```ts
actions: {
  resetFilters,
  selectQueue,
  selectBucket,
  selectSortField,
  selectSortDirection,
  cycleQueue,
  cycleBucket,
  cycleSortField,
  toggleSortDirection,
  toggleTaskExpansion,
},
```

- [ ] **Step 4: Run the adapter tests to verify they pass**

Run:

```bash
npx jest src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts --runInBand
```

Expected: PASS, with sort options ordered `Due -> Modified -> Created`, overdue counts derived from the visible filtered rows, and row meta labels switching cleanly with deterministic fallback.

- [ ] **Step 5: Commit**

```bash
git add src/ui/viewAdapters/useTasksViewAdapter.ts src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts
git commit -m "feat(tasks): add compact filter adapter cycles"
```

---

### Task 2: Replace Dropdown Panels With A Compact Single-Row Filter UI

**Files:**
- Modify: `src/screens/TasksScreen.tsx`
- Modify: `src/screens/__tests__/TasksScreen.test.tsx`

- [ ] **Step 1: Write the failing screen tests**

Replace the dropdown-oriented assertions in `src/screens/__tests__/TasksScreen.test.tsx` with compact-row behavior tests:

```ts
const cycleQueue = jest.fn();
const cycleBucket = jest.fn();
const cycleSortField = jest.fn();
const toggleSortDirection = jest.fn();

beforeEach(() => {
  cycleQueue.mockClear();
  cycleBucket.mockClear();
  cycleSortField.mockClear();
  toggleSortDirection.mockClear();
});

it("renders compact filter controls on a single row with an icon-only order button", () => {
  const screen = render(
    <TasksScreen
      onNavigateToTaskDetail={jest.fn()}
      onNavigateToCreateTask={jest.fn()}
    />,
  );

  expect(screen.getByTestId("tasks-screen__filters_row")).toBeTruthy();
  expect(screen.getByTestId("tasks-screen__filter_queue")).toBeTruthy();
  expect(screen.getByTestId("tasks-screen__filter_bucket")).toBeTruthy();
  expect(screen.getByTestId("tasks-screen__filter_sort")).toBeTruthy();
  expect(screen.getByTestId("tasks-screen__filter_sort_direction")).toBeTruthy();
  expect(screen.getByTestId("tasks-screen__filter_sort_direction_icon")).toBeTruthy();
  expect(screen.queryByText("Latest first")).toBeNull();
  expect(screen.queryByText("Earliest first")).toBeNull();
});

it("cycles queue, bucket, sort, and sort direction without rendering dropdown panels", () => {
  const screen = render(
    <TasksScreen
      onNavigateToTaskDetail={jest.fn()}
      onNavigateToCreateTask={jest.fn()}
    />,
  );

  fireEvent.press(screen.getByTestId("tasks-screen__filter_queue"));
  expect(screen.getByText("My Queue 2")).toBeTruthy();

  fireEvent.press(screen.getByTestId("tasks-screen__filter_bucket"));
  expect(screen.getByText("New 1")).toBeTruthy();

  fireEvent.press(screen.getByTestId("tasks-screen__filter_sort"));
  expect(screen.getByText("Due date")).toBeTruthy();

  fireEvent.press(screen.getByTestId("tasks-screen__filter_sort_direction"));
  expect(screen.queryByText("Creation date")).toBeNull();
  expect(screen.queryByText("Team Queue 1")).toBeNull();
});

it("shows the overdue badge on Bucket and passes denser typography classes to the row card", () => {
  const mockedModule = require("@/ui/viewAdapters/useTasksViewAdapter");

  mockedModule.__setTasksScreenOverride({
    scalarMetrics: {
      totalVisibleTaskCount: 3,
      overdueVisibleTaskCount: 2,
      selectedProjectTaskCount: 3,
      hasActiveFilters: false,
    },
  });

  const screen = render(
    <TasksScreen
      onNavigateToTaskDetail={jest.fn()}
      onNavigateToCreateTask={jest.fn()}
    />,
  );

  expect(screen.getByTestId("tasks-screen__filter_bucket_badge")).toBeTruthy();
  expect(screen.getByText("2")).toBeTruthy();
  expect(screen.getByText("Install guardrails").props.className).toContain("text-lg");
});
```

Update the mocked hook actions in the same test file so they match the planned screen implementation:

```ts
actions: {
  resetFilters: () => {
    setSearchQuery("");
    setSelectedQueue("all");
    setSelectedBucket("all");
  },
  selectQueue: (queue: "all" | "my_queue" | "team_queue") => {
    setSelectedQueue(queue);
    setSelectedBucket("all");
  },
  selectBucket: (bucket: "all" | "new" | "wip" | "review") => {
    setSelectedBucket(bucket);
  },
  selectSortField: (field: "created_at" | "due_date" | "modified_at") => {
    setSelectedSortField(field);
  },
  selectSortDirection: (direction: "asc" | "desc") => {
    setSelectedSortDirection(direction);
  },
  cycleQueue: () => {
    cycleQueue();
    setSelectedQueue((current: "all" | "my_queue" | "team_queue") =>
      current === "all" ? "my_queue" : current === "my_queue" ? "team_queue" : "all",
    );
    setSelectedBucket("all");
  },
  cycleBucket: () => {
    cycleBucket();
    setSelectedBucket((current: "all" | "new" | "wip" | "review") =>
      current === "all" ? "new" : current === "new" ? "wip" : current === "wip" ? "review" : "all",
    );
  },
  cycleSortField: () => {
    cycleSortField();
    setSelectedSortField((current: "created_at" | "due_date" | "modified_at") =>
      current === "due_date" ? "modified_at" : current === "modified_at" ? "created_at" : "due_date",
    );
  },
  toggleSortDirection: () => {
    toggleSortDirection();
    setSelectedSortDirection((current: "asc" | "desc") => (current === "desc" ? "asc" : "desc"));
  },
  toggleTaskExpansion: jest.fn(),
},
```

- [ ] **Step 2: Run the screen tests to verify they fail**

Run:

```bash
npx jest src/screens/__tests__/TasksScreen.test.tsx --runInBand
```

Expected: FAIL because the screen still keeps `openFilterMenu` state, renders dropdown option panels, shows text-based sort direction, and passes the older larger card typography classes.

- [ ] **Step 3: Implement the compact controls, bucket badge, and denser card classes**

In `src/screens/TasksScreen.tsx`, remove the local dropdown state and derive the selected labels directly from `output.filterControls`:

```tsx
const selectedQueueLabel =
  output.filterControls?.queue?.options.find((option) => option.isSelected)?.label ?? "All 0";
const selectedBucketLabel =
  output.filterControls?.bucket?.options.find((option) => option.isSelected)?.label ?? "All 0";
const selectedSortLabel =
  output.filterControls?.sort?.options.find((option) => option.isSelected)?.label ?? "Modified date";
const selectedSortDirection =
  output.filterControls?.sortDirection?.options.find((option) => option.isSelected)?.value ?? "desc";
const visibleOverdueCount = output.scalarMetrics.overdueVisibleTaskCount;
```

Render the tighter one-row control strip below the search field:

```tsx
<View testID="tasks-screen__search_wrapper" className="mb-0.5">
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

<View testID="tasks-screen__filters_row" className="mb-2 flex-row items-stretch gap-1.5">
  <Pressable
    testID="tasks-screen__filter_queue"
    onPress={actions.cycleQueue}
    className="flex-1 rounded-2xl bg-white px-3 py-2.5"
  >
    <Text className="text-xs font-semibold uppercase tracking-wide text-slate-500">Queue</Text>
    <Text className="mt-0.5 text-sm font-medium text-slate-900" numberOfLines={1}>
      {selectedQueueLabel}
    </Text>
  </Pressable>

  <Pressable
    testID="tasks-screen__filter_bucket"
    onPress={actions.cycleBucket}
    className="relative flex-1 rounded-2xl bg-white px-3 py-2.5"
  >
    <Text className="text-xs font-semibold uppercase tracking-wide text-slate-500">Bucket</Text>
    <Text className="mt-0.5 text-sm font-medium text-slate-900" numberOfLines={1}>
      {selectedBucketLabel}
    </Text>
    {visibleOverdueCount > 0 ? (
      <View
        testID="tasks-screen__filter_bucket_badge"
        className="absolute -right-1 -top-1 min-w-[20px] rounded-full bg-red-500 px-1.5 py-0.5"
      >
        <Text className="text-center text-xs font-semibold text-white">{visibleOverdueCount}</Text>
      </View>
    ) : null}
  </Pressable>

  <Pressable
    testID="tasks-screen__filter_sort"
    onPress={actions.cycleSortField}
    className="flex-1 rounded-2xl bg-white px-3 py-2.5"
  >
    <Text className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sort by</Text>
    <Text className="mt-0.5 text-sm font-medium text-slate-900" numberOfLines={1}>
      {selectedSortLabel}
    </Text>
  </Pressable>

  <Pressable
    testID="tasks-screen__filter_sort_direction"
    onPress={actions.toggleSortDirection}
    className="w-12 items-center justify-center rounded-2xl bg-white"
    accessibilityLabel={selectedSortDirection === "desc" ? "Latest first" : "Earliest first"}
  >
    <Ionicons
      testID="tasks-screen__filter_sort_direction_icon"
      name={selectedSortDirection === "desc" ? "arrow-down" : "arrow-up"}
      size={18}
      color="#0f172a"
    />
  </Pressable>
</View>
```

Pass the reduced typography classes into `ActivityStyleRowCard` and keep truncation via the existing shared component:

```tsx
<ActivityStyleRowCard
  testID={`tasks-screen__row_${row.taskId}`}
  title={row.title}
  subtitle={row.contextLine ?? row.projectName}
  metaLabel={row.latestUpdateLabel ?? "Task activity"}
  badgeLabel={row.statusLabel}
  imageUri={row.primaryPhotoUri}
  titleClassName="text-lg font-semibold text-slate-900"
  subtitleClassName="mt-1 text-base text-slate-500"
  metaClassName="mt-2 text-sm font-medium text-slate-400"
  badgeClassName="max-w-[96px] text-right text-sm font-medium uppercase tracking-wide text-slate-400"
  onPress={() => props.onNavigateToTaskDetail(row.taskId)}
/>
```

Delete the four dropdown panel blocks entirely so the screen no longer renders queue/bucket/sort/sortDirection menus.

- [ ] **Step 4: Run the screen tests to verify they pass**

Run:

```bash
npx jest src/screens/__tests__/TasksScreen.test.tsx --runInBand
```

Expected: PASS, with compact controls rendered on one row, the Order button icon-only, no dropdown menu panels present, and smaller typography classes flowing into the shared row card.

- [ ] **Step 5: Commit**

```bash
git add src/screens/TasksScreen.tsx src/screens/__tests__/TasksScreen.test.tsx
git commit -m "feat(tasks): compact tasks filter row"
```

---

### Task 3: Run Focused Regression Checks And Manual Tasks-Flow QA

**Files:**
- Modify: `src/ui/viewAdapters/useTasksViewAdapter.ts`
- Modify: `src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts`
- Modify: `src/screens/TasksScreen.tsx`
- Modify: `src/screens/__tests__/TasksScreen.test.tsx`

- [ ] **Step 1: Run the focused regression suite**

Run:

```bash
npx jest src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts --runInBand
npx jest src/screens/__tests__/TasksScreen.test.tsx --runInBand
```

Expected: PASS for both suites, covering compact controls, cycle behavior, overdue badge visibility, sort-aware date labels, and denser row typography.

- [ ] **Step 2: Perform manual simulator verification**

Verify this exact flow in the active Expo/iOS simulator session:

```text
1. Open the Tasks screen with a seeded account that has My Queue and Team Queue items.
2. Confirm Queue, Bucket, Sort by, and Order all fit on one row below Search.
3. Tap Queue three times and confirm the cycle is All -> My Queue -> Team Queue -> All.
4. Tap Bucket four times and confirm the cycle is All -> New -> Doing -> Review -> All.
5. Tap Sort by three times and confirm the cycle is Due -> Modified -> Created -> Due.
6. Tap Order and confirm the icon flips between down and up while the visible row order changes.
7. Confirm the Bucket badge count changes with queue/bucket/search filters and never shows totals from hidden rows.
8. Confirm task cards render smaller text and the meta line reads Due, Modified, or Created on according to the active sort.
```

Expected: All controls stay on one line, no dropdown surfaces appear, overdue counts follow the visible list, and the meta label tracks the chosen sort field with readable fallback dates.

- [ ] **Step 3: Run diagnostics on the edited files**

Run the repository’s normal static checks for the touched files after the Jest suites above. If the project does not expose a narrower lint entry point, use the smallest available lint or typecheck command that includes:

```text
- src/ui/viewAdapters/useTasksViewAdapter.ts
- src/screens/TasksScreen.tsx
```

Expected: No newly introduced type, lint, or diagnostics errors in the edited Tasks adapter or screen files.

---

## Scope Check

- Covered: compact single-row controls, tap-to-cycle behavior, narrow icon-only order button, visible overdue badge, tighter search/filter spacing, smaller card typography, and sort-aware date labels with deterministic fallback.
- Intentionally unchanged: `ActivityStyleRowCard.tsx` business logic, task-store persistence, Activity screen controls, new filter types, and persistent user preference storage.
