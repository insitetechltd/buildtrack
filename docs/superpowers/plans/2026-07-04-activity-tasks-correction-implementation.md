# Activity + Tasks Correction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Correct the `Activity` and `Tasks` experience to match the approved design: active-project summary + dense queue grid on `Activity`, bucket-first ownership queues on `Tasks`, compact two-line rows, photo-centric task expansion, and task-derived critical dates.

**Architecture:** Keep the existing screen routes (`DashboardScreen` and `TasksScreen`) but replace the current surface contracts with a clearer role split. `Activity` becomes a project-scoped triage surface with an explicit summary card and queue-launch dashboard grid; `Tasks` becomes an ownership-first execution surface with queue/bucket state, a global search mode, and photo-centric row expansion. Critical dates are modeled as a task-level flag using the existing task/tag domain instead of a new object type.

**Tech Stack:** Expo 54, React Native 0.81, TypeScript, Zustand, React Navigation, Jest, React Native Testing Library

---

## File Structure

### Core files to modify

- `src/ui/contracts/viewAdapters.ts`
  Extend the screen contracts for `DashboardScreen` and `TasksScreen` to support the summary card, dense queue grid, ownership queues, task row expansion state, and search-mode output.

- `src/ui/viewAdapters/useDashboardViewAdapter.ts`
  Rework `Activity` data composition into active-project summary data, weekly critical dates, six-cell queue metrics, launch presets for `Tasks`, and recency-first activity blocks.

- `src/screens/DashboardScreen.tsx`
  Recompose the `Activity` screen around the active-project summary card, dense queue grid, and recent activity feed.

- `src/state/projectFilterStore.ts`
  Add durable queue/bucket launch state for routing from `Activity` into `Tasks`, while preserving existing project bootstrap behavior.

- `src/navigation/navigationTypes.ts`
  Add typed route params for launching `Tasks` into a queue/bucket preset.

- `src/screens/TasksScreen.tsx`
  Replace the current compact-section container model with the approved ownership-first queue layout, global search/filter mode, and inline task expansion.

- `src/ui/viewAdapters/useTasksViewAdapter.ts`
  Build `My Queue` / `Team Queue`, bucket pills, single-open-bucket behavior, global all-task search results, compact row summaries, and expanded photo-centric cards.

- `src/ui/mappers/tasksMappers.ts`
  Support a denser collapsed row mode plus an expanded photo-centric card rendering path for tasks.

- `src/ui/viewAdapters/useTaskDetailViewAdapter.ts`
  Expose a task-level `critical this week` action for the expanded task card path.

- `src/screens/TaskDetailScreen.tsx`
  Add the one-tap critical-date flag entry to the expanded task experience.

- `src/ui/viewAdapters/useCreateTaskViewAdapter.ts`
  Support the same critical-date flag inside task create/edit without introducing a separate screen.

- `src/screens/CreateTaskScreen.tsx`
  Surface the create/edit toggle in the task form.

### Tests to add or modify

- `src/ui/viewAdapters/__tests__/useDashboardViewAdapter.test.ts`
- `src/__tests__/integration/activity-home.integration.test.tsx`
- `src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts`
- `src/screens/__tests__/TasksScreen.test.tsx`
- `src/__tests__/integration/TasksScreenInteraction.test.tsx`
- `src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts`
- `src/__tests__/integration/CreateTaskScreen.test.tsx`
- `src/navigation/__tests__/createTaskRouteParams.test.ts`

### Docs to update after implementation

- `documentation/ROADMAP.md`
- `docs/INSITE_UI_UX_SOURCE_OF_TRUTH.md`
- `docs/superpowers/specs/2026-07-04-tasks-queue-dashboard-correction-design.md`
- `docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md`

## Task 1: Add routing + state contracts for Activity-to-Tasks queue launching

**Files:**
- Modify: `src/state/projectFilterStore.ts`
- Modify: `src/navigation/navigationTypes.ts`
- Modify: `src/__tests__/integration/TasksScreenInteraction.test.tsx`
- Modify: `src/navigation/__tests__/createTaskRouteParams.test.ts`

- [ ] **Step 1: Write the failing navigation/state tests for queue launch presets**

```ts
it("stores a tasks launch preset for queue and bucket", async () => {
  const state = useProjectFilterStore.getState();

  state.setTasksLaunchPreset({
    queue: "my_queue",
    bucket: "new",
    source: "activity_dashboard",
  });

  expect(useProjectFilterStore.getState().tasksLaunchPreset).toEqual({
    queue: "my_queue",
    bucket: "new",
    source: "activity_dashboard",
  });
});
```

```ts
it("accepts queue launch params on the Tasks stack route", () => {
  const params: TasksStackParamList["TasksList"] = {
    launchQueue: "team_queue",
    launchBucket: "review",
    launchSource: "activity_dashboard",
  };

  expect(params.launchQueue).toBe("team_queue");
  expect(params.launchBucket).toBe("review");
});
```

- [ ] **Step 2: Run the focused tests to verify they fail**

Run: `npx jest src/navigation/__tests__/createTaskRouteParams.test.ts src/__tests__/integration/TasksScreenInteraction.test.tsx --runInBand`

Expected: FAIL because `projectFilterStore` has no tasks-launch preset and `TasksStackParamList["TasksList"]` is still `undefined`.

- [ ] **Step 3: Add durable queue launch state to the project filter store**

```ts
export type TasksLaunchQueue = "my_queue" | "team_queue";
export type TasksLaunchBucket = "new" | "wip" | "review";

export interface TasksLaunchPreset {
  queue: TasksLaunchQueue;
  bucket: TasksLaunchBucket;
  source: "activity_dashboard" | "tasks";
}
```

```ts
tasksLaunchPreset: null,
setTasksLaunchPreset: (preset) => set({ tasksLaunchPreset: preset }),
clearTasksLaunchPreset: () => set({ tasksLaunchPreset: null }),
```

- [ ] **Step 4: Add typed route params for launching `Tasks`**

```ts
export type TasksStackParamList = {
  TasksList:
    | {
        launchQueue?: "my_queue" | "team_queue";
        launchBucket?: "new" | "wip" | "review";
        launchSource?: "activity_dashboard" | "tasks";
      }
    | undefined;
  TaskDetail: TaskDetailParams;
  ...
};
```

- [ ] **Step 5: Re-run the focused state/navigation tests**

Run: `npx jest src/navigation/__tests__/createTaskRouteParams.test.ts src/__tests__/integration/TasksScreenInteraction.test.tsx --runInBand`

Expected: PASS

## Task 2: Rebuild `Activity` as summary card + dense queue dashboard

**Files:**
- Modify: `src/ui/contracts/viewAdapters.ts`
- Modify: `src/ui/viewAdapters/useDashboardViewAdapter.ts`
- Modify: `src/screens/DashboardScreen.tsx`
- Modify: `src/ui/viewAdapters/__tests__/useDashboardViewAdapter.test.ts`
- Modify: `src/__tests__/integration/activity-home.integration.test.tsx`

- [ ] **Step 1: Write the failing Activity adapter/screen tests**

```ts
it("exposes an active-project summary card and six queue dashboard cells", () => {
  const { result } = renderHook(() => useDashboardViewAdapter());

  expect(result.current.output.projectSummaryCard?.title).toBe("North Tower");
  expect(result.current.output.queueDashboard.groups).toHaveLength(2);
  expect(result.current.output.queueDashboard.groups[0].title).toBe("My Queue");
  expect(result.current.output.queueDashboard.groups[1].title).toBe("Team Queue");
});
```

```tsx
it("navigates to Tasks with a queue preset when a dashboard cell is tapped", () => {
  const onNavigateToTasks = jest.fn();
  const screen = render(
    <DashboardScreen
      onNavigateToTasks={onNavigateToTasks}
      onNavigateToCreateTask={jest.fn()}
      onNavigateToProfile={jest.fn()}
      onNavigateToTaskDetail={jest.fn()}
      onNavigateToProjectPicker={jest.fn()}
    />,
  );

  fireEvent.press(screen.getByTestId("dashboard-screen__queue_cell_my_queue_new"));
  expect(onNavigateToTasks).toHaveBeenCalledWith({
    launchQueue: "my_queue",
    launchBucket: "new",
    launchSource: "activity_dashboard",
  });
});
```

- [ ] **Step 2: Run the focused Activity tests to verify they fail**

Run: `npx jest src/ui/viewAdapters/__tests__/useDashboardViewAdapter.test.ts src/__tests__/integration/activity-home.integration.test.tsx --runInBand`

Expected: FAIL because the dashboard output still centers on summary pills / drafts / task shortcut instead of the approved summary card + queue grid.

- [ ] **Step 3: Extend the dashboard contract with summary-card and queue-grid models**

```ts
export interface DashboardProjectSummaryCard {
  title: string;
  todayLabel: string;
  elapsedDayLabel: string;
  weatherLabel: string;
  weatherTemperatureLabel: string;
  criticalDates: Array<{ id: string; dateLabel: string; title: string; subtitle: string }>;
}

export interface DashboardQueueDashboardCell {
  id: string;
  queue: "my_queue" | "team_queue";
  bucket: "new" | "wip" | "review";
  title: string;
  countLabel: string;
}
```

- [ ] **Step 4: Build the active-project summary card and dense queue grid in the adapter**

```ts
const queueDashboard = {
  groups: [
    {
      id: "my-queue",
      title: "My Queue",
      cells: [
        { id: "my-queue-new", queue: "my_queue", bucket: "new", title: "New", countLabel: String(inboxNewCount + selfAssignedNewCount) },
        { id: "my-queue-wip", queue: "my_queue", bucket: "wip", title: "Doing", countLabel: String(inboxWipCount + selfAssignedWipCount) },
        { id: "my-queue-review", queue: "my_queue", bucket: "review", title: "Review", countLabel: String(inboxReviewingCount + selfAssignedReviewCount) },
      ],
    },
    {
      id: "team-queue",
      title: "Team Queue",
      cells: [
        { id: "team-queue-new", queue: "team_queue", bucket: "new", title: "New", countLabel: String(outboxNewCount) },
        { id: "team-queue-wip", queue: "team_queue", bucket: "wip", title: "Doing", countLabel: String(outboxWipCount) },
        { id: "team-queue-review", queue: "team_queue", bucket: "review", title: "Review", countLabel: String(outboxReviewingCount) },
      ],
    },
  ],
};
```

- [ ] **Step 5: Recompose `DashboardScreen` around the approved order**

```tsx
<View className="rounded-3xl bg-white p-4">
  <Text className="text-xs uppercase tracking-wide text-slate-500">Active Project</Text>
  <Text className="mt-1 text-3xl font-semibold text-slate-950">{output.projectSummaryCard.title}</Text>
  <Text className="mt-1 text-sm text-slate-500">
    {output.projectSummaryCard.todayLabel} · {output.projectSummaryCard.elapsedDayLabel}
  </Text>
  <View className="mt-4 rounded-2xl bg-sky-50 p-3">
    <Text className="text-sm text-slate-600">{output.projectSummaryCard.weatherLabel}</Text>
    <Text className="text-2xl font-semibold text-slate-950">{output.projectSummaryCard.weatherTemperatureLabel}</Text>
  </View>
</View>
```

```tsx
{output.queueDashboard.groups.map((group) => (
  <View key={group.id} className="mt-4">
    <Text className="mb-2 text-xs uppercase tracking-wide text-slate-500">{group.title}</Text>
    <View className="flex-row gap-2">
      {group.cells.map((cell) => (
        <Pressable
          key={cell.id}
          testID={`dashboard-screen__queue_cell_${cell.queue}_${cell.bucket}`}
          onPress={() =>
            props.onNavigateToTasks?.({
              launchQueue: cell.queue,
              launchBucket: cell.bucket,
              launchSource: "activity_dashboard",
            })
          }
          className="flex-1 rounded-2xl bg-white p-3"
        >
          <Text className="text-xs text-slate-500">{cell.title}</Text>
          <Text className="mt-1 text-2xl font-semibold text-slate-950">{cell.countLabel}</Text>
        </Pressable>
      ))}
    </View>
  </View>
))}
```

- [ ] **Step 6: Re-run the focused Activity tests**

Run: `npx jest src/ui/viewAdapters/__tests__/useDashboardViewAdapter.test.ts src/__tests__/integration/activity-home.integration.test.tsx --runInBand`

Expected: PASS

## Task 3: Rebuild `Tasks` into ownership queues + global search mode

**Files:**
- Modify: `src/ui/contracts/viewAdapters.ts`
- Modify: `src/ui/viewAdapters/useTasksViewAdapter.ts`
- Modify: `src/screens/TasksScreen.tsx`
- Modify: `src/ui/mappers/tasksMappers.ts`
- Modify: `src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts`
- Modify: `src/screens/__tests__/TasksScreen.test.tsx`
- Modify: `src/__tests__/integration/TasksScreenInteraction.test.tsx`

- [ ] **Step 1: Write the failing Tasks adapter/screen tests**

```ts
it("builds My Queue and Team Queue with one open bucket at a time", () => {
  const { result } = renderHook(() => useTasksViewAdapter());

  expect(result.current.output.queuePanels[0].title).toBe("My Queue");
  expect(result.current.output.queuePanels[1].title).toBe("Team Queue");
  expect(result.current.output.queuePanels[1].presentation).toBe("preview");
  expect(result.current.output.queuePanels[0].buckets).toHaveLength(3);
});
```

```tsx
it("switches into all-task search mode when the search bar is populated", () => {
  const screen = render(
    <TasksScreen
      onNavigateToTaskDetail={jest.fn()}
      onNavigateToCreateTask={jest.fn()}
    />,
  );

  fireEvent.changeText(screen.getByPlaceholderText("Search tasks"), "tower");
  expect(screen.getByTestId("tasks-screen__search_results")).toBeTruthy();
  expect(screen.queryByText("My Queue")).toBeNull();
});
```

- [ ] **Step 2: Run the focused Tasks tests to verify they fail**

Run: `npx jest src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts src/screens/__tests__/TasksScreen.test.tsx src/__tests__/integration/TasksScreenInteraction.test.tsx --runInBand`

Expected: FAIL because the current `Tasks` output is still container-section based, not ownership/bucket based.

- [ ] **Step 3: Replace compact sections with queue panels, buckets, search results, and expanded task ids**

```ts
export interface TasksQueueBucket {
  id: string;
  title: string;
  countLabel: string;
  bucket: "new" | "wip" | "review";
  isOpen: boolean;
  rows: TasksScreenRowItem[];
}

export interface TasksQueuePanel {
  id: string;
  title: "My Queue" | "Team Queue";
  totalCountLabel: string;
  presentation: "primary" | "preview";
  isExpanded: boolean;
  buckets: TasksQueueBucket[];
}
```

- [ ] **Step 4: Build queue/bucket state and a unified search mode in the adapter**

```ts
const [activeQueue, setActiveQueue] = useState<"my_queue" | "team_queue">("my_queue");
const [openBucketsByQueue, setOpenBucketsByQueue] = useState({
  my_queue: "new" as "new" | "wip" | "review",
  team_queue: null as "new" | "wip" | "review" | null,
});
const [expandedTaskIds, setExpandedTaskIds] = useState<string[]>([]);
```

```ts
const isSearchMode = normalizedSearchQuery.length > 0;
const searchResults = isSearchMode
  ? searchedTasks
      .sort((left, right) => getLatestTaskTimestamp(right).localeCompare(getLatestTaskTimestamp(left)))
      .map((task) => mapTaskToQueueRow(task))
  : [];
```

- [ ] **Step 5: Recompose `TasksScreen` into top search controls, stacked queues, and search mode**

```tsx
{output.isSearchMode ? (
  <SectionList
    testID="tasks-screen__search_results"
    sections={[{ title: "All Task Results", data: output.searchResults }]}
    renderItem={({ item }) => (
      <TaskCard contract={mapTaskRowToContainerCardProps(item)} />
    )}
  />
) : (
  <ScrollView testID="tasks-screen__queues">
    {output.queuePanels.map((panel) => (
      <View key={panel.id} className="mb-4 rounded-3xl bg-white p-4">
        <Pressable onPress={() => actions.toggleQueue(panel.id)}>
          <Text className="text-lg font-semibold text-slate-950">{panel.title}</Text>
          <Text className="text-sm text-slate-500">{panel.totalCountLabel}</Text>
        </Pressable>
      </View>
    ))}
  </ScrollView>
)}
```

- [ ] **Step 6: Re-run the focused Tasks tests**

Run: `npx jest src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts src/screens/__tests__/TasksScreen.test.tsx src/__tests__/integration/TasksScreenInteraction.test.tsx --runInBand`

Expected: PASS

## Task 4: Add photo-centric task expansion and critical-date flag entry

**Files:**
- Modify: `src/ui/contracts/viewAdapters.ts`
- Modify: `src/ui/mappers/tasksMappers.ts`
- Modify: `src/ui/viewAdapters/useTaskDetailViewAdapter.ts`
- Modify: `src/screens/TaskDetailScreen.tsx`
- Modify: `src/ui/viewAdapters/useCreateTaskViewAdapter.ts`
- Modify: `src/screens/CreateTaskScreen.tsx`
- Modify: `src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts`
- Modify: `src/__tests__/integration/CreateTaskScreen.test.tsx`

- [ ] **Step 1: Write the failing detail/create-task tests for the critical-date flag**

```ts
it("exposes a mark-critical action for the expanded task card", () => {
  const { result } = renderHook(() => useTaskDetailViewAdapter({ taskId: "task-1" }));

  expect(result.current.output.actionItems.map((item) => item.actionId)).toContain("toggle_critical_this_week");
});
```

```tsx
it("renders a critical-date toggle in create/edit task", () => {
  const screen = render(<CreateTaskScreen onNavigateBack={jest.fn()} />);

  expect(screen.getByText("Show in This Week’s Critical Dates")).toBeTruthy();
});
```

- [ ] **Step 2: Run the focused detail/create-task tests to verify they fail**

Run: `npx jest src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts src/__tests__/integration/CreateTaskScreen.test.tsx --runInBand`

Expected: FAIL because no critical-date action or form toggle exists yet.

- [ ] **Step 3: Model the critical-date flag as a task tag**

```ts
const CRITICAL_THIS_WEEK_TAG = "critical_this_week";

function hasCriticalThisWeekTag(task: Task): boolean {
  return Array.isArray(task.tags) && task.tags.includes(CRITICAL_THIS_WEEK_TAG);
}
```

```ts
const toggleCriticalThisWeek = async () => {
  const nextTags = hasCriticalThisWeekTag(task)
    ? (task.tags ?? []).filter((tag) => tag !== CRITICAL_THIS_WEEK_TAG)
    : [...(task.tags ?? []), CRITICAL_THIS_WEEK_TAG];

  await updateTask(task.id, { tags: nextTags });
};
```

- [ ] **Step 4: Surface the one-tap action in `TaskDetailScreen` and the form toggle in `CreateTaskScreen`**

```tsx
<Pressable
  testID="task-detail__toggle_critical_this_week"
  onPress={() => handleActionPress("toggle_critical_this_week")}
  className="rounded-full bg-amber-50 px-3 py-2"
>
  <Text className="text-sm font-medium text-amber-900">Mark critical</Text>
</Pressable>
```

```tsx
<Pressable
  testID="create-task__toggle_critical_this_week"
  onPress={() => updateField("criticalThisWeek", !formData.criticalThisWeek)}
  className="flex-row items-center justify-between rounded-2xl bg-white px-4 py-3"
>
  <Text className="text-base font-medium text-slate-900">Show in This Week’s Critical Dates</Text>
  <Ionicons name={formData.criticalThisWeek ? "checkmark-circle" : "ellipse-outline"} size={22} color="#0f172a" />
</Pressable>
```

- [ ] **Step 5: Re-run the focused detail/create-task tests**

Run: `npx jest src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts src/__tests__/integration/CreateTaskScreen.test.tsx --runInBand`

Expected: PASS

## Task 5: Validate, update docs, and checkpoint the correction

**Files:**
- Modify: `documentation/ROADMAP.md`
- Modify: `docs/INSITE_UI_UX_SOURCE_OF_TRUTH.md`
- Modify: `docs/superpowers/specs/2026-07-04-tasks-queue-dashboard-correction-design.md`
- Modify: `docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md`

- [ ] **Step 1: Run focused validation for the correction**

Run: `npx jest src/ui/viewAdapters/__tests__/useDashboardViewAdapter.test.ts src/__tests__/integration/activity-home.integration.test.tsx src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts src/screens/__tests__/TasksScreen.test.tsx src/__tests__/integration/TasksScreenInteraction.test.tsx src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts src/__tests__/integration/CreateTaskScreen.test.tsx src/navigation/__tests__/createTaskRouteParams.test.ts --runInBand && npx tsc --noEmit`

Expected: PASS

- [ ] **Step 2: Update the canonical docs after the correction lands**

```md
| WS-UX / M-UX-01 / S-UX-01E2 | Activity/tasks correction | Closed | S-UX-01E | 14.6 | ../docs/superpowers/plans/2026-07-04-activity-tasks-correction-implementation.md |
```

```md
- `Activity` now uses the active-project summary card and dense six-cell queue dashboard.
- `Tasks` now uses ownership-first queues with bucket-first interaction, compact rows, and photo-centric expansion.
- Weekly critical dates are derived from task flags rather than a separate interface.
```

- [ ] **Step 3: Create the checkpoint commit**

```bash
git add src/state/projectFilterStore.ts src/navigation/navigationTypes.ts src/ui/contracts/viewAdapters.ts src/ui/viewAdapters/useDashboardViewAdapter.ts src/screens/DashboardScreen.tsx src/ui/viewAdapters/useTasksViewAdapter.ts src/screens/TasksScreen.tsx src/ui/mappers/tasksMappers.ts src/ui/viewAdapters/useTaskDetailViewAdapter.ts src/screens/TaskDetailScreen.tsx src/ui/viewAdapters/useCreateTaskViewAdapter.ts src/screens/CreateTaskScreen.tsx src/ui/viewAdapters/__tests__/useDashboardViewAdapter.test.ts src/__tests__/integration/activity-home.integration.test.tsx src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts src/screens/__tests__/TasksScreen.test.tsx src/__tests__/integration/TasksScreenInteraction.test.tsx src/ui/viewAdapters/__tests__/useTaskDetailViewAdapter.test.ts src/__tests__/integration/CreateTaskScreen.test.tsx src/navigation/__tests__/createTaskRouteParams.test.ts documentation/ROADMAP.md docs/INSITE_UI_UX_SOURCE_OF_TRUTH.md docs/superpowers/specs/2026-07-04-tasks-queue-dashboard-correction-design.md docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md docs/superpowers/plans/2026-07-04-activity-tasks-correction-implementation.md
git commit -m "feat(ux): correct activity and tasks surfaces"
```

## Spec Coverage Check

- Activity summary card above the dense grid: covered by Task 2
- Dense six-category queue dashboard on Activity: covered by Task 2
- Queue-launch routing into Tasks: covered by Task 1 and Task 2
- `My Queue` / `Team Queue` and bucket-first task execution: covered by Task 3
- Global all-task search/filter mode: covered by Task 3
- Compact two-line rows + photo-centric expansion: covered by Task 3 and Task 4
- Task-derived critical dates and lightweight flag entry: covered by Task 4
- Canonical documentation alignment and closure evidence: covered by Task 5

## Placeholder Scan

- No `TBD` / `TODO`
- No unnamed files
- No “implement later” hand-waves inside tasks
- Each task includes concrete files, test targets, code examples, and commands

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-04-activity-tasks-correction-implementation.md`.

Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
