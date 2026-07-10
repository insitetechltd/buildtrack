# Tasks Search Filters Bottom Sheet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Tasks screen four-button filter strip with a `Search + Filters` row, a bottom-sheet filter picker, immediate-removal active chips, and real `Inbox / Outbox / Archived` filter behavior.

**Architecture:** Keep filter logic in `useTasksViewAdapter.ts`, but split it into staged sheet selections and applied screen filters so the sheet can dismiss without applying. Reuse the existing `react-native-modal` + `ModalHandle` pattern for the bottom sheet, and add a dedicated archived-task data path in `taskStore.supabase.ts` because the current store excludes archived tasks before the adapter can filter them.

**Tech Stack:** TypeScript, React Native, Expo, Zustand, Supabase, react-native-modal, NativeWind, Jest, React Testing Library.

---

## File Map

**Create**
- `src/components/tasks/TasksFiltersBottomSheet.tsx`
- `src/components/tasks/__tests__/TasksFiltersBottomSheet.test.tsx`

**Modify**
- `src/state/taskStore.supabase.ts`
- `src/state/__tests__/taskStore.supabase.unit.test.ts`
- `src/ui/contracts/viewAdapters.ts`
- `src/ui/viewAdapters/useTasksViewAdapter.ts`
- `src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts`
- `src/screens/TasksScreen.tsx`
- `src/screens/__tests__/TasksScreen.test.tsx`
- `src/__tests__/integration/TasksScreenInteraction.test.tsx`

**Inspect Only**
- `src/components/ModalHandle.tsx`
- `src/components/primitives/input/TextField.tsx`
- `src/components/cards/ActivityStyleRowCard.tsx`
- `docs/superpowers/specs/2026-07-10-tasks-search-filters-bottom-sheet-design.md`

---

### Task 1: Add Archived Task Data Support For The Tasks Filter Sheet

**Files:**
- Modify: `src/state/taskStore.supabase.ts`
- Modify: `src/state/__tests__/taskStore.supabase.unit.test.ts`

- [ ] **Step 1: Write the failing task-store test for archived task support**

Add a focused unit test in `src/state/__tests__/taskStore.supabase.unit.test.ts` that proves the store can hold archived tasks separately without polluting the default active-task list:

```ts
it("loads archived tasks into archivedTasks while keeping active tasks unchanged", async () => {
  const archivedRow = {
    ...makeSupabaseTaskRow({
      id: "task-archived-1",
      status: "approved",
      archived_at: "2026-07-10T09:00:00.000Z",
      archived_by: "user-1",
    }),
  };

  const activeRow = makeSupabaseTaskRow({
    id: "task-active-1",
    status: "new",
    archived_at: null,
  });

  mockSupabase
    .from.mockImplementationOnce(() => makeTasksQueryBuilder([activeRow]))
    .mockImplementationOnce(() => makeActivitiesQueryBuilder([]))
    .mockImplementationOnce(() => makeTasksQueryBuilder([archivedRow]))
    .mockImplementationOnce(() => makeActivitiesQueryBuilder([]));

  await act(async () => {
    await useTaskStore.getState().fetchTasks(true);
    await useTaskStore.getState().fetchArchivedTasks(true);
  });

  expect(useTaskStore.getState().tasks.map((task) => task.id)).toEqual(["task-active-1"]);
  expect(useTaskStore.getState().archivedTasks.map((task) => task.id)).toEqual(["task-archived-1"]);
  expect(useTaskStore.getState().archivedTasks[0].archivedAt).toBe("2026-07-10T09:00:00.000Z");
});
```

- [ ] **Step 2: Run the store test to verify it fails**

Run:

```bash
npx jest --runInBand --runTestsByPath /Volumes/KooDrive/InsiteApp/src/state/__tests__/taskStore.supabase.unit.test.ts
```

Expected: FAIL because the store does not yet expose `archivedTasks` or `fetchArchivedTasks()`.

- [ ] **Step 3: Add archived task state and fetch support**

In `src/state/taskStore.supabase.ts`, add archived task state to the store interface and create a dedicated fetch that reuses the existing task normalization path:

```ts
interface TaskStoreState {
  tasks: Task[];
  archivedTasks: Task[];
  fetchTasks: (forceRefresh?: boolean) => Promise<void>;
  fetchArchivedTasks: (forceRefresh?: boolean) => Promise<void>;
}
```

Add the archived query alongside the existing active-task query:

```ts
fetchArchivedTasks: async (forceRefresh = false) => {
  const supabaseClient = supabase;

  const { data: archivedTasksData, error: tasksError } = await supabaseClient
    .from("tasks")
    .select("*")
    .is("cancelled_at", null)
    .not("archived_at", "is", null)
    .is("deleted_at", null)
    .order("archived_at", { ascending: false });

  if (tasksError) throw tasksError;

  const { data: taskActivitiesData, error: taskActivitiesError } = await supabaseClient
    .from("task_activities")
    .select("*")
    .order("timestamp", { ascending: true });

  if (taskActivitiesError) throw taskActivitiesError;

  const transformedArchivedTasks = (archivedTasksData || []).map((task) =>
    normalizeTaskActivityCompatibility({
      id: task.id,
      projectId: task.project_id,
      title: task.title,
      status: task.status,
      archivedAt: task.archived_at || undefined,
      archivedBy: task.archived_by || undefined,
      assignedTo: Array.isArray(task.assigned_to) ? task.assigned_to.map(String) : [],
      assignedBy: task.assigned_by ? String(task.assigned_by) : "",
      activities: activitiesByTaskId[task.id] || [],
      // keep the existing normalized fields identical to fetchTasks()
    }),
  );

  set({ archivedTasks: transformedArchivedTasks });
};
```

Initialize the new store field:

```ts
archivedTasks: [],
```

- [ ] **Step 4: Run the store test to verify it passes**

Run:

```bash
npx jest --runInBand --runTestsByPath /Volumes/KooDrive/InsiteApp/src/state/__tests__/taskStore.supabase.unit.test.ts
```

Expected: PASS with archived tasks loaded separately from the active list.

- [ ] **Step 5: Commit**

```bash
git add src/state/taskStore.supabase.ts src/state/__tests__/taskStore.supabase.unit.test.ts
git commit -m "feat(tasks): add archived task data for filters"
```

---

### Task 2: Replace The Adapter Contract With Search + Filters Bottom Sheet State

**Files:**
- Modify: `src/ui/contracts/viewAdapters.ts`
- Modify: `src/ui/viewAdapters/useTasksViewAdapter.ts`
- Modify: `src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts`

- [ ] **Step 1: Write the failing adapter tests for staged filters, badge count, and chip removal**

Add focused coverage in `src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts`:

```ts
it("keeps staged sheet selections separate until apply and excludes search from badge count", () => {
  setupBaseMocks();

  const { useTaskStore } = require("@/state/taskStore.supabase");
  useTaskStore.mockReturnValue({
    tasks: [
      makeTask({ id: "task-inbox-new", status: "new", assignedTo: ["user-1"], assignedBy: "user-2" }),
      makeTask({ id: "task-outbox-review", status: "submitted_for_review", assignedTo: ["user-2"], assignedBy: "user-1" }),
    ],
    archivedTasks: [
      makeTask({
        id: "task-archived",
        status: "approved",
        assignedTo: ["user-1"],
        assignedBy: "user-2",
        archivedAt: "2026-07-10T09:00:00.000Z",
      }),
    ],
    isLoading: false,
    fetchArchivedTasks: jest.fn(),
    buildTaskTree: (tasks: any[]) => tasks,
  });

  const { result } = renderHook(() => useTasksViewAdapter());

  act(() => {
    result.current.actions.openFiltersSheet();
    result.current.actions.stageQueueFilter("outbox");
    result.current.actions.stageStatusFilter("review");
    result.current.setSearchQuery("review");
  });

  expect(result.current.output.filterSheet.isOpen).toBe(true);
  expect(result.current.output.filterButton.activeCount).toBe(0);
  expect(result.current.output.taskRowItems.map((row) => row.taskId)).toEqual([
    "task-outbox-review",
  ]);

  act(() => {
    result.current.actions.applyStagedFilters();
  });

  expect(result.current.output.filterButton.activeCount).toBe(2);
  expect(result.current.output.activeFilterChips.map((chip) => chip.label)).toEqual([
    "Queue: Outbox",
    "Status: Review",
  ]);
});

it("removes an applied chip immediately and updates visible rows", () => {
  setupBaseMocks();

  const { result } = renderHook(() => useTasksViewAdapter());

  act(() => {
    result.current.actions.openFiltersSheet();
    result.current.actions.stageQueueFilter("archived");
    result.current.actions.applyStagedFilters();
  });

  expect(result.current.output.taskRowItems.map((row) => row.taskId)).toEqual(["task-archived"]);

  act(() => {
    result.current.actions.removeAppliedFilterChip("queue");
  });

  expect(result.current.output.filterButton.activeCount).toBe(0);
  expect(result.current.output.activeFilterChips).toEqual([]);
  expect(result.current.output.taskRowItems.map((row) => row.taskId)).toContain("task-inbox-new");
});
```

- [ ] **Step 2: Run the adapter tests to verify they fail**

Run:

```bash
npx jest --runInBand --runTestsByPath /Volumes/KooDrive/InsiteApp/src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts
```

Expected: FAIL because the adapter still exposes the four-button model and has no staged filter sheet state.

- [ ] **Step 3: Replace the Tasks view contract with explicit bottom-sheet models**

Update `src/ui/contracts/viewAdapters.ts` with a focused contract for the new UI:

```ts
export type TasksQueueFilterValue = "all_queues" | "inbox" | "outbox" | "archived";
export type TasksStatusFilterValue = "any_status" | "new" | "doing" | "review" | "overdue";
export type TasksOverdueWindowValue = "show_all" | "three_active" | "one_week" | "one_month";

export interface TasksActiveFilterChipModel {
  id: "queue" | "status" | "overdueWindow";
  label: string;
}

export interface TasksFilterButtonModel {
  label: "Filters";
  isActive: boolean;
  activeCount: number;
}

export interface TasksFiltersSheetModel {
  isOpen: boolean;
  stagedQueue: TasksQueueFilterValue;
  stagedStatus: TasksStatusFilterValue;
  stagedOverdueWindow: TasksOverdueWindowValue;
}

export interface TasksScreenViewAdapterOutput {
  screenId: "TasksScreen";
  readiness: NavigationScreenReadiness;
  continuity: ScreenContinuityContract;
  filterSummary: TasksFilterSummary;
  filterButton: TasksFilterButtonModel;
  filterSheet: TasksFiltersSheetModel;
  activeFilterChips: TasksActiveFilterChipModel[];
  resultSummaryLabel?: string;
  isSearchMode: boolean;
  queuePanels: TasksQueuePanel[];
  draftsSection?: TasksDraftsSection | null;
  searchResults: TasksScreenRowItem[];
  expandedTaskIds: string[];
  taskRowItems: TasksScreenRowItem[];
  scalarMetrics: TasksScalarMetrics;
}
```

- [ ] **Step 4: Rewrite the adapter state model around staged vs applied filters**

In `src/ui/viewAdapters/useTasksViewAdapter.ts`, replace the current `mode / queue / status` control state with staged and applied filters:

```ts
type AppliedTasksFilters = {
  queue: TasksQueueFilterValue;
  status: TasksStatusFilterValue;
  overdueWindow: TasksOverdueWindowValue;
};

const DEFAULT_FILTERS: AppliedTasksFilters = {
  queue: "all_queues",
  status: "any_status",
  overdueWindow: "show_all",
};

const [isFiltersSheetOpen, setIsFiltersSheetOpen] = useState(false);
const [appliedFilters, setAppliedFilters] = useState<AppliedTasksFilters>(DEFAULT_FILTERS);
const [stagedFilters, setStagedFilters] = useState<AppliedTasksFilters>(DEFAULT_FILTERS);
```

Use both active and archived tasks in the filtering pipeline:

```ts
const activeTasks = (taskStore.tasks ?? []).filter((task) => !task.archivedAt);
const archivedTasks = taskStore.archivedTasks ?? [];
const candidateTasks = [...activeTasks, ...archivedTasks].filter((task) => {
  if (selectedProjectId && task.projectId !== selectedProjectId) {
    return false;
  }

  return Boolean(resolveQueueForTask(task, currentUserId) || task.archivedAt);
});
```

Apply the new queue/status/window semantics:

```ts
const queueScopedTasks = candidateTasks.filter((task) => {
  switch (appliedFilters.queue) {
    case "all_queues":
      return !task.archivedAt;
    case "inbox":
      return !task.archivedAt && resolveQueueForTask(task, currentUserId) === "my_queue";
    case "outbox":
      return !task.archivedAt && resolveQueueForTask(task, currentUserId) === "team_queue";
    case "archived":
      return Boolean(task.archivedAt);
  }
});

const statusScopedTasks = queueScopedTasks.filter((task) => {
  switch (appliedFilters.status) {
    case "any_status":
      return true;
    case "new":
      return matchesNewStatusFilter(task.status);
    case "doing":
      return matchesWipStatusFilter(task.status);
    case "review":
      return matchesReviewingStatusFilter(task.status);
    case "overdue":
      return isTaskOverdue(task);
  }
});
```

Expose the new output models and actions:

```ts
const activeFilterChips = buildActiveFilterChips(appliedFilters);
const activeBottomSheetFilterCount = activeFilterChips.length;

actions: {
  resetFilters,
  openFiltersSheet: () => {
    setStagedFilters(appliedFilters);
    setIsFiltersSheetOpen(true);
  },
  closeFiltersSheet: () => setIsFiltersSheetOpen(false),
  stageQueueFilter: (value) => setStagedFilters((current) => ({ ...current, queue: value })),
  stageStatusFilter: (value) => setStagedFilters((current) => ({ ...current, status: value })),
  stageOverdueWindowFilter: (value) =>
    setStagedFilters((current) => ({ ...current, overdueWindow: value })),
  applyStagedFilters: () => {
    setAppliedFilters(stagedFilters);
    setIsFiltersSheetOpen(false);
  },
  resetStagedFilters: () => setStagedFilters(DEFAULT_FILTERS),
  removeAppliedFilterChip: (chipId) =>
    setAppliedFilters((current) => ({
      ...current,
      [chipId]: chipId === "overdueWindow" ? "show_all" : chipId === "status" ? "any_status" : "all_queues",
    })),
  toggleTaskExpansion,
}
```

- [ ] **Step 5: Run the adapter tests to verify they pass**

Run:

```bash
npx jest --runInBand --runTestsByPath /Volumes/KooDrive/InsiteApp/src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts
```

Expected: PASS with staged/apply behavior, chip-removal behavior, and badge count excluding search.

- [ ] **Step 6: Commit**

```bash
git add src/ui/contracts/viewAdapters.ts src/ui/viewAdapters/useTasksViewAdapter.ts src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts
git commit -m "feat(tasks): add bottom sheet filter state model"
```

---

### Task 3: Build The Filters Bottom Sheet And Recompose TasksScreen

**Files:**
- Create: `src/components/tasks/TasksFiltersBottomSheet.tsx`
- Create: `src/components/tasks/__tests__/TasksFiltersBottomSheet.test.tsx`
- Modify: `src/screens/TasksScreen.tsx`
- Modify: `src/screens/__tests__/TasksScreen.test.tsx`

- [ ] **Step 1: Write the failing bottom-sheet and screen tests**

Add a component-level test for the sheet in `src/components/tasks/__tests__/TasksFiltersBottomSheet.test.tsx`:

```ts
it("renders queue, status, and overdue window sections with reset and apply actions", () => {
  const screen = render(
    <TasksFiltersBottomSheet
      visible={true}
      stagedQueue="inbox"
      stagedStatus="overdue"
      stagedOverdueWindow="one_week"
      onClose={jest.fn()}
      onResetAll={jest.fn()}
      onApply={jest.fn()}
      onStageQueue={jest.fn()}
      onStageStatus={jest.fn()}
      onStageOverdueWindow={jest.fn()}
    />,
  );

  expect(screen.getByText("Filters")).toBeTruthy();
  expect(screen.getByText("QUEUE")).toBeTruthy();
  expect(screen.getByText("Inbox")).toBeTruthy();
  expect(screen.getByText("STATUS")).toBeTruthy();
  expect(screen.getByText("Overdue")).toBeTruthy();
  expect(screen.getByText("OVERDUE WINDOW")).toBeTruthy();
  expect(screen.getByText("Apply Filters")).toBeTruthy();
});
```

Update `src/screens/__tests__/TasksScreen.test.tsx` to assert the new search/filter row:

```ts
it("renders the Search + Filters row on the off-white body and hides chips by default", () => {
  const screen = render(
    <TasksScreen onNavigateToTaskDetail={jest.fn()} onNavigateToCreateTask={jest.fn()} />,
  );

  expect(screen.getByTestId("tasks-screen__search_section").props.className).toContain("bg-slate-50");
  expect(screen.getByTestId("tasks-screen__filters_button")).toBeTruthy();
  expect(screen.queryByTestId("tasks-screen__filter_all")).toBeNull();
  expect(screen.queryByTestId("tasks-screen__active_filter_chips")).toBeNull();
});

it("shows chips after apply and removes a chip immediately", () => {
  const screen = render(
    <TasksScreen onNavigateToTaskDetail={jest.fn()} onNavigateToCreateTask={jest.fn()} />,
  );

  fireEvent.press(screen.getByTestId("tasks-screen__filters_button"));
  fireEvent.press(screen.getByTestId("tasks-filters-sheet__queue_outbox"));
  fireEvent.press(screen.getByTestId("tasks-filters-sheet__status_review"));
  fireEvent.press(screen.getByTestId("tasks-filters-sheet__apply"));

  expect(screen.getByTestId("tasks-screen__active_filter_chips")).toBeTruthy();
  fireEvent.press(screen.getByTestId("tasks-screen__chip_remove_queue"));
  expect(screen.queryByText("Queue: Outbox")).toBeNull();
});
```

- [ ] **Step 2: Run the screen and sheet tests to verify they fail**

Run:

```bash
npx jest --runInBand --runTestsByPath /Volumes/KooDrive/InsiteApp/src/components/tasks/__tests__/TasksFiltersBottomSheet.test.tsx /Volumes/KooDrive/InsiteApp/src/screens/__tests__/TasksScreen.test.tsx
```

Expected: FAIL because neither the bottom sheet component nor the new screen layout exists.

- [ ] **Step 3: Build the reusable Tasks bottom sheet component**

Create `src/components/tasks/TasksFiltersBottomSheet.tsx` using the repo’s existing modal pattern:

```tsx
import React from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import Modal from "react-native-modal";
import { SafeAreaView } from "react-native-safe-area-context";
import ModalHandle from "@/components/ModalHandle";

export default function TasksFiltersBottomSheet(props: TasksFiltersBottomSheetProps) {
  return (
    <Modal
      isVisible={props.visible}
      onBackdropPress={props.onClose}
      style={{ margin: 0, justifyContent: "flex-end" }}
      backdropOpacity={0.56}
    >
      <SafeAreaView edges={["bottom"]} className="rounded-t-3xl bg-white px-4 pt-2">
        <ModalHandle />
        <View className="mb-4 flex-row items-center justify-between">
          <Text className="text-[20px] font-bold text-[#07111E]">Filters</Text>
          <Pressable testID="tasks-filters-sheet__reset" onPress={props.onResetAll}>
            <Text className="font-semibold text-[#0D6E87]">Reset all</Text>
          </Pressable>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          {renderQueueSection(props)}
          {renderStatusSection(props)}
          {renderOverdueWindowSection(props)}
        </ScrollView>
        <Pressable
          testID="tasks-filters-sheet__apply"
          onPress={props.onApply}
          className="mb-2 mt-4 rounded-2xl bg-[#07111E] px-4 py-4"
        >
          <Text className="text-center text-base font-bold text-white">Apply Filters</Text>
        </Pressable>
      </SafeAreaView>
    </Modal>
  );
}
```

- [ ] **Step 4: Replace the old filter row in TasksScreen with Search + Filters + chips**

In `src/screens/TasksScreen.tsx`, remove the four-button strip and render the new row:

```tsx
<View testID="tasks-screen__search_section" className="bg-slate-50 px-4 pt-4">
  <View className="flex-row items-center gap-3">
    <View testID="tasks-screen__search_wrapper" className="flex-1">
      <TextField
        contract={searchContract}
        onChangeText={setSearchQuery}
        rightSlot={
          <Text
            testID="tasks-screen__search_count"
            className="font-mono text-sm font-semibold text-slate-600"
          >
            {String(visibleTaskCount).padStart(3, "0")}
          </Text>
        }
      />
    </View>

    <Pressable
      testID="tasks-screen__filters_button"
      onPress={actions.openFiltersSheet}
      className={cn(
        "relative flex-row items-center gap-2 rounded-full border px-4 py-3",
        output.filterButton.isActive
          ? "border-[#0D6E87] bg-[#0D6E87]"
          : "border-slate-300 bg-white",
      )}
    >
      <Ionicons
        name="options-outline"
        size={18}
        color={output.filterButton.isActive ? "#F8FCFF" : "#07111E"}
      />
      <Text className={cn("font-semibold", output.filterButton.isActive ? "text-white" : "text-[#07111E]")}>
        Filters
      </Text>
      {output.filterButton.activeCount > 0 ? (
        <View testID="tasks-screen__filters_badge" className="absolute -right-1 -top-1 rounded-full bg-[#07111E] px-1.5 py-0.5">
          <Text className="text-[11px] font-bold text-white">{output.filterButton.activeCount}</Text>
        </View>
      ) : null}
    </Pressable>
  </View>

  {output.activeFilterChips.length > 0 ? (
    <View testID="tasks-screen__active_filter_chips" className="mt-[10px] flex-row flex-wrap gap-2">
      {output.activeFilterChips.map((chip) => (
        <Pressable
          key={chip.id}
          testID={`tasks-screen__chip_remove_${chip.id}`}
          onPress={() => actions.removeAppliedFilterChip(chip.id)}
          className="flex-row items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5"
        >
          <Text className="text-[11.5px] font-semibold text-slate-700">{chip.label}</Text>
          <Text className="text-[11px] font-semibold text-slate-500">✕</Text>
        </Pressable>
      ))}
    </View>
  ) : null}
</View>

<TasksFiltersBottomSheet
  visible={output.filterSheet.isOpen}
  stagedQueue={output.filterSheet.stagedQueue}
  stagedStatus={output.filterSheet.stagedStatus}
  stagedOverdueWindow={output.filterSheet.stagedOverdueWindow}
  onClose={actions.closeFiltersSheet}
  onResetAll={actions.resetStagedFilters}
  onApply={actions.applyStagedFilters}
  onStageQueue={actions.stageQueueFilter}
  onStageStatus={actions.stageStatusFilter}
  onStageOverdueWindow={actions.stageOverdueWindowFilter}
/>
```

- [ ] **Step 5: Run the screen and sheet tests to verify they pass**

Run:

```bash
npx jest --runInBand --runTestsByPath /Volumes/KooDrive/InsiteApp/src/components/tasks/__tests__/TasksFiltersBottomSheet.test.tsx /Volumes/KooDrive/InsiteApp/src/screens/__tests__/TasksScreen.test.tsx
```

Expected: PASS with the new row, chips, and bottom sheet.

- [ ] **Step 6: Commit**

```bash
git add src/components/tasks/TasksFiltersBottomSheet.tsx src/components/tasks/__tests__/TasksFiltersBottomSheet.test.tsx src/screens/TasksScreen.tsx src/screens/__tests__/TasksScreen.test.tsx
git commit -m "feat(tasks): add filters bottom sheet ui"
```

---

### Task 4: Realign Integration Coverage And Run Focused Regression

**Files:**
- Modify: `src/__tests__/integration/TasksScreenInteraction.test.tsx`
- Modify: `src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts`
- Modify: `src/screens/__tests__/TasksScreen.test.tsx`
- Modify: `src/components/tasks/__tests__/TasksFiltersBottomSheet.test.tsx`

- [ ] **Step 1: Update the integration fixture to the new adapter contract**

Replace the old fixture in `src/__tests__/integration/TasksScreenInteraction.test.tsx` with the new output and action shape:

```ts
mockUseTasksViewAdapter.mockReturnValue({
  output: {
    screenId: "TasksScreen",
    readiness: { hasInitialFrame: true, hasUsableData: true, isBackgroundRefreshing: false, isNavigationTransitionActive: false },
    continuity: { isInitialLoading: false, isBackgroundRefreshing: false, hasCachedFrame: true, shouldRenderSkeletonShell: false, shouldRenderEmptyState: false, freshnessLabel: "Ready" },
    filterSummary: { selectedProjectId: null, sectionFilterLabel: "Search-first list", statusFilterLabel: "All projects", sortLabel: "Due date · Earliest first" },
    filterButton: { label: "Filters", isActive: true, activeCount: 2 },
    filterSheet: { isOpen: false, stagedQueue: "outbox", stagedStatus: "review", stagedOverdueWindow: "show_all" },
    activeFilterChips: [
      { id: "queue", label: "Queue: Outbox" },
      { id: "status", label: "Status: Review" },
    ],
    isSearchMode: false,
    queuePanels: [],
    searchResults: [],
    expandedTaskIds: [],
    taskRowItems: [makeRow({ taskId: "task-1" })],
    scalarMetrics: { totalVisibleTaskCount: 1, overdueVisibleTaskCount: 0, selectedProjectTaskCount: 1, hasActiveFilters: true },
  },
  searchInput: { id: "tasks-search", label: "Search", value: "", placeholder: "Search tasks", density: "standard", structuralState: "stale" },
  setSearchQuery: jest.fn(),
  visibility: { showCreateTaskFab: false, showProfileShortcut: true, showProjectPickerShortcut: true, showDeveloperSettingsShortcut: false, showResetFiltersShortcut: true },
  actions: {
    resetFilters: mockResetFilters,
    openFiltersSheet: mockOpenFiltersSheet,
    closeFiltersSheet: mockCloseFiltersSheet,
    stageQueueFilter: mockStageQueueFilter,
    stageStatusFilter: mockStageStatusFilter,
    stageOverdueWindowFilter: mockStageOverdueWindowFilter,
    applyStagedFilters: mockApplyStagedFilters,
    resetStagedFilters: mockResetStagedFilters,
    removeAppliedFilterChip: mockRemoveAppliedFilterChip,
    toggleTaskExpansion: jest.fn(),
  },
});
```

- [ ] **Step 2: Verify wiring for the new interactions**

Keep the interaction assertions focused on the new UI:

```ts
fireEvent.press(getByTestId("tasks-screen__filters_button"));
fireEvent.press(getByTestId("tasks-screen__chip_remove_queue"));

expect(mockOpenFiltersSheet).toHaveBeenCalledTimes(1);
expect(mockRemoveAppliedFilterChip).toHaveBeenCalledWith("queue");
expect(queryByTestId("tasks-screen__filter_all")).toBeNull();
expect(queryByTestId("tasks-screen__filter_overdue")).toBeNull();
```

- [ ] **Step 3: Run the integration test to verify it passes**

Run:

```bash
npx jest --runInBand --runTestsByPath /Volumes/KooDrive/InsiteApp/src/__tests__/integration/TasksScreenInteraction.test.tsx
```

Expected: PASS with the new filter button and chip-removal wiring.

- [ ] **Step 4: Run the focused regression suite**

Run:

```bash
npx jest --runInBand --runTestsByPath /Volumes/KooDrive/InsiteApp/src/state/__tests__/taskStore.supabase.unit.test.ts /Volumes/KooDrive/InsiteApp/src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts /Volumes/KooDrive/InsiteApp/src/components/tasks/__tests__/TasksFiltersBottomSheet.test.tsx /Volumes/KooDrive/InsiteApp/src/screens/__tests__/TasksScreen.test.tsx /Volumes/KooDrive/InsiteApp/src/__tests__/integration/TasksScreenInteraction.test.tsx
```

Expected: PASS across store, adapter, sheet, screen, and integration coverage.

- [ ] **Step 5: Run diagnostics and manual QA**

Check edited files for diagnostics, then verify this flow in the simulator:

```text
1. Open the Tasks screen.
2. Confirm the old four-button filter row is gone.
3. Confirm Search and Filters sit directly on the off-white body background.
4. Confirm the Filters button shows no badge by default.
5. Open the bottom sheet and select Outbox + Review.
6. Dismiss via scrim and confirm the list does not change.
7. Reopen the sheet, select Outbox + Review, tap Apply Filters, and confirm chips appear.
8. Confirm the Filters badge count matches the number of applied bottom-sheet filters.
9. Type into search and confirm the badge count does not change.
10. Remove one chip and confirm the list updates immediately.
11. Apply the Archived queue option and confirm archived tasks appear.
12. Tap Reset all in the sheet and confirm defaults are restored without closing.
```

Expected: The new Tasks filter experience matches the approved bottom-sheet design and chip behavior end to end.

---

## Scope Check

- Covered: `Search + Filters` row, bottom-sheet staging/apply behavior, immediate chip removal, off-white body treatment, `Inbox / Outbox / Archived`, badge-count rules, and focused regression coverage.
- Intentionally unchanged: task-card density/layout from the previous slice, shared header component structure, and any global reusable filter framework outside the Tasks screen.
