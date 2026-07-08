# Activity + Tasks Latest UI Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the approved latest UI refinement by adding extra `Activity` header-to-title spacing, limiting `Recent Activity` to the last 120 hours, fixing `Tasks` header top alignment, and tightening the static search-to-filter gap.

**Architecture:** Keep the changes local to the existing screen and adapter files. `useDashboardViewAdapter()` owns the rolling 120-hour feed rule, `DashboardScreen` owns the additional title offset, and `TasksScreen` owns the header safe-area parity and fixed control-stack spacing.

**Tech Stack:** TypeScript, React Native, Expo, Zustand-backed view adapters, Jest, React Testing Library.

---

## File Map

**Modify**
- `src/ui/viewAdapters/useDashboardViewAdapter.ts`
- `src/ui/viewAdapters/__tests__/useDashboardViewAdapter.test.ts`
- `src/screens/DashboardScreen.tsx`
- `src/screens/__tests__/DashboardScreen.test.tsx`
- `src/screens/TasksScreen.tsx`
- `src/screens/__tests__/TasksScreen.test.tsx`

---

### Task 1: Add a failing adapter test for the rolling 120-hour activity window

**Files:**
- Modify: `src/ui/viewAdapters/__tests__/useDashboardViewAdapter.test.ts`
- Modify: `src/ui/viewAdapters/useDashboardViewAdapter.ts`

- [ ] **Step 1: Write the failing test**

Add this test near the existing recent-activity coverage:

```ts
it("limits recent activity to the last 120 hours for the active project", () => {
  const { useTaskStore } = require("@/state/taskStore.supabase");

  setupBaseMocks([
    {
      id: "project-1",
      name: "North Tower",
      location: "Site A",
      status: "active",
    },
  ]);

  useTaskStore.mockReturnValue({
    tasks: [
      {
        id: "task-fresh-update",
        projectId: "project-1",
        title: "Fresh update task",
        description: "",
        priority: "high",
        dueDate: "2099-01-01T00:00:00.000Z",
        category: "general",
        attachments: [],
        assignedTo: ["user-1"],
        assignedBy: "user-2",
        createdAt: "2026-07-01T08:00:00.000Z",
        updates: [
          {
            id: "update-fresh",
            description: "Fresh update inside the window",
            photos: [],
            completionPercentage: 40,
            status: "in_progress",
            timestamp: "2026-07-04T08:00:00.000Z",
            userId: "user-1",
          },
        ],
        status: "in_progress",
        completionPercentage: 40,
      },
      {
        id: "task-stale-update",
        projectId: "project-1",
        title: "Stale update task",
        description: "",
        priority: "medium",
        dueDate: "2099-01-01T00:00:00.000Z",
        category: "general",
        attachments: [],
        assignedTo: ["user-1"],
        assignedBy: "user-2",
        createdAt: "2026-06-28T08:00:00.000Z",
        updates: [
          {
            id: "update-stale",
            description: "Stale update outside the window",
            photos: [],
            completionPercentage: 20,
            status: "in_progress",
            timestamp: "2026-06-29T08:59:59.000Z",
            userId: "user-1",
          },
        ],
        status: "in_progress",
        completionPercentage: 20,
      },
      {
        id: "task-fresh-fallback",
        projectId: "project-1",
        title: "Fresh fallback task",
        description: "Uses createdAt fallback",
        priority: "low",
        dueDate: "2099-01-01T00:00:00.000Z",
        category: "general",
        attachments: [],
        assignedTo: ["user-1"],
        assignedBy: "user-2",
        createdAt: "2026-07-02T12:00:00.000Z",
        updates: [],
        status: "new",
        completionPercentage: 0,
      },
    ],
  });

  const { result } = renderHook(() => useDashboardViewAdapter());

  expect(result.current.output.activityItems.map((item: any) => item.taskId)).toEqual([
    "task-fresh-update",
    "task-fresh-fallback",
  ]);
  expect(result.current.output.activityItems.map((item: any) => item.title)).toEqual([
    "Fresh update task",
    "Fresh fallback task",
  ]);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npx jest src/ui/viewAdapters/__tests__/useDashboardViewAdapter.test.ts --runInBand
```

Expected: FAIL because `task-stale-update` is still included in `activityItems`.

- [ ] **Step 3: Implement the minimal adapter filter**

Update `src/ui/viewAdapters/useDashboardViewAdapter.ts` by introducing a fixed rolling-window threshold and filtering activity items before the final sort:

```ts
const recentActivityThreshold = Date.now() - 1000 * 60 * 60 * 24 * 5;

const mappedActivityItems: DashboardActivityItem[] = activeProjectTasks
  .flatMap((task) => {
    const updates = Array.isArray(task.updates) ? task.updates : [];

    if (updates.length === 0) {
      return [
        {
          id: `activity-task:${task.id}`,
          taskId: task.id,
          title: task.title,
          subtitle: task.description || resolvedActiveProject?.name || "Active project task",
          timestampLabel: "Task activity",
          statusLabel: task.status.replace(/_/g, " "),
          previewPhotoUri: resolveImageUri(task.attachments?.[0]),
          density: "standard" as const,
          structuralState,
          sortTimestamp: task.createdAt,
        },
      ];
    }

    return updates.map((update) => ({
      id: update.id,
      taskId: task.id,
      title: task.title,
      subtitle: update.description,
      timestampLabel: new Date(update.timestamp).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
      statusLabel: update.status.replace(/_/g, " "),
      previewPhotoUri: resolveImageUri(update.photos?.[0] || task.attachments?.[0]),
      density: "standard" as const,
      structuralState,
      sortTimestamp: update.timestamp,
    }));
  })
  .filter((item) => {
    const timestamp = new Date((item as DashboardActivityItem & { sortTimestamp: string }).sortTimestamp).getTime();
    return Number.isFinite(timestamp) && timestamp >= recentActivityThreshold;
  })
  .sort(
    (left, right) =>
      new Date((right as DashboardActivityItem & { sortTimestamp: string }).sortTimestamp).getTime() -
      new Date((left as DashboardActivityItem & { sortTimestamp: string }).sortTimestamp).getTime(),
  )
  .map(({ sortTimestamp: _sortTimestamp, ...item }) => item as DashboardActivityItem);
```

- [ ] **Step 4: Run the adapter test to verify it passes**

Run:

```bash
npx jest src/ui/viewAdapters/__tests__/useDashboardViewAdapter.test.ts --runInBand
```

Expected: PASS, with the new 120-hour activity-window test green.

- [ ] **Step 5: Commit**

```bash
git add src/ui/viewAdapters/useDashboardViewAdapter.ts src/ui/viewAdapters/__tests__/useDashboardViewAdapter.test.ts
git commit -m "fix(activity): limit recent activity to last 120 hours"
```

---

### Task 2: Add a failing screen test and implement the extra `Activity` title spacing

**Files:**
- Modify: `src/screens/__tests__/DashboardScreen.test.tsx`
- Modify: `src/screens/DashboardScreen.tsx`

- [ ] **Step 1: Write the failing screen test**

Add this assertion block to the main `DashboardScreen` render test:

```ts
const { ScrollView } = require("react-native");

const scrollView = screen.UNSAFE_getByType(ScrollView);
expect(scrollView.props.contentContainerStyle).toMatchObject({ paddingTop: 15 });
```

- [ ] **Step 2: Run the dashboard screen test to verify it fails**

Run:

```bash
npx jest src/screens/__tests__/DashboardScreen.test.tsx --runInBand
```

Expected: FAIL because `paddingTop` is still `5`.

- [ ] **Step 3: Implement the 10pt spacing increase**

Update the `ScrollView` content container in `src/screens/DashboardScreen.tsx`:

```tsx
<ScrollView contentContainerStyle={{ paddingBottom: 120, paddingTop: 15 }} className="flex-1 px-4">
```

- [ ] **Step 4: Run the dashboard screen test to verify it passes**

Run:

```bash
npx jest src/screens/__tests__/DashboardScreen.test.tsx --runInBand
```

Expected: PASS, and the structural spacing assertion is green.

- [ ] **Step 5: Commit**

```bash
git add src/screens/DashboardScreen.tsx src/screens/__tests__/DashboardScreen.test.tsx
git commit -m "fix(activity): increase header-to-title spacing"
```

---

### Task 3: Add failing `Tasks` layout tests for header parity and static control spacing

**Files:**
- Modify: `src/screens/__tests__/TasksScreen.test.tsx`
- Modify: `src/screens/TasksScreen.tsx`

- [ ] **Step 1: Write the failing layout test**

Add this test to `src/screens/__tests__/TasksScreen.test.tsx`:

```ts
it("matches the Activity header safe-area treatment and keeps a tighter static control gap", () => {
  const { SafeAreaView } = require("react-native-safe-area-context");

  const screen = render(
    <TasksScreen
      onNavigateToTaskDetail={jest.fn()}
      onNavigateToCreateTask={jest.fn()}
    />,
  );

  const safeArea = screen.UNSAFE_getByType(SafeAreaView);

  expect(safeArea.props.edges).toEqual(["left", "right", "bottom"]);
  expect(screen.getByTestId("tasks-screen__search_wrapper").props.className).toContain("mb-1");
});
```

- [ ] **Step 2: Run the tasks screen test to verify it fails**

Run:

```bash
npx jest src/screens/__tests__/TasksScreen.test.tsx --runInBand
```

Expected: FAIL because the screen does not set `edges={["left", "right", "bottom"]}` and does not expose the tightened search wrapper spacing.

- [ ] **Step 3: Implement the `Tasks` header/top alignment fix and static gap reduction**

Update `src/screens/TasksScreen.tsx` like this:

```tsx
<SafeAreaView className="flex-1 bg-slate-50" edges={["left", "right", "bottom"]}>
  <View className="flex-1">
    <AppScreenHeader
      title="Tasks"
      titleNode={<BrandHeaderTitle subtitle="Tasks" />}
      showBackButton={Boolean(props.onNavigateBack)}
      onBackPress={props.onNavigateBack}
      showProfileTrigger={visibility.showProfileShortcut}
      onNavigateToProfile={props.onNavigateToProfile}
      onNavigateToProjectPicker={visibility.showProjectPickerShortcut ? props.onNavigateToProjectPicker : undefined}
      onNavigateToDeveloperSettings={
        visibility.showDeveloperSettingsShortcut ? props.onNavigateToDeveloperSettings : undefined
      }
      className="border-b-0 bg-[#08576E] pb-2"
      rightSlot={
        visibility.showResetFiltersShortcut ? (
          <Pressable
            testID="tasks-screen__header_reset_filters"
            onPress={actions.resetFilters}
            className="h-10 w-10 items-center justify-center rounded-full bg-[#0D6E87]"
          >
            <Ionicons name="refresh-outline" size={20} color="#F8FCFF" />
          </Pressable>
        ) : null
      }
    />
    <View className="px-4 pt-3">
      <View testID="tasks-screen__search_wrapper" className="mb-1">
        <TextField
          contract={searchContract}
          onChangeText={setSearchQuery}
          rightSlot={
            <View
              testID="tasks-screen__search_count"
              className="rounded-full bg-slate-100 px-3 py-1"
            >
              <Text className="text-sm font-medium text-slate-700">{visibleTaskCount}</Text>
            </View>
          }
        />
      </View>
```

- [ ] **Step 4: Run the tasks screen test to verify it passes**

Run:

```bash
npx jest src/screens/__tests__/TasksScreen.test.tsx --runInBand
```

Expected: PASS, with the safe-area parity and static gap assertions green.

- [ ] **Step 5: Commit**

```bash
git add src/screens/TasksScreen.tsx src/screens/__tests__/TasksScreen.test.tsx
git commit -m "fix(tasks): align header and tighten filter spacing"
```

---

### Task 4: Run the focused regression suite and verify both screens in the simulators

**Files:**
- Modify: none
- Test: `src/ui/viewAdapters/__tests__/useDashboardViewAdapter.test.ts`
- Test: `src/screens/__tests__/DashboardScreen.test.tsx`
- Test: `src/screens/__tests__/TasksScreen.test.tsx`

- [ ] **Step 1: Run the focused regression suite**

Run:

```bash
npx jest \
  src/ui/viewAdapters/__tests__/useDashboardViewAdapter.test.ts \
  src/screens/__tests__/DashboardScreen.test.tsx \
  src/screens/__tests__/TasksScreen.test.tsx \
  --runInBand
```

Expected: PASS, with no new failures in the changed adapter and screen coverage.

- [ ] **Step 2: Verify Metro is running and reload both booted simulators**

Run:

```bash
xcrun simctl launch 1BEE670D-D2EE-4ED8-8B95-E23476A20CAB com.buildtrack.app.local
xcrun simctl launch B5CF60DE-CEC7-4A09-814F-F40ED7E8638E com.buildtrack.app.local
```

Expected: both commands return a process id for `com.buildtrack.app.local`.

- [ ] **Step 3: Perform the manual acceptance check**

Check these points in the running app:

```text
Activity:
- header-to-title spacing is visibly 10pt larger than before
- Recent Activity shows only items from the last 120 hours

Tasks:
- teal header reaches the top bezel with no white strip
- search bar sits noticeably closer to Queue/Bucket
- the reduced search-to-filter gap stays fixed as dropdowns open/close
```

- [ ] **Step 4: Confirm the worktree is clean except for intended implementation changes**

Run:

```bash
git status --short
```

Expected: no unexpected files; only the planned code and test edits remain before the final push/checkpoint workflow.
