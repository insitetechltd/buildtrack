# Tasks Filter And Card Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the Tasks screen filters and task cards by removing visible search-label/counter clutter, tightening filter-button typography and wrapping, flipping the order-arrow mapping, and reformatting task cards with a smaller title, line-3 status pill, and upper-left overdue dot.

**Architecture:** Keep Tasks-specific formatting decisions in `TasksScreen.tsx`, where filter button text, search contract overrides, and row-card class overrides already live. Extend `ActivityStyleRowCard.tsx` with a small number of generic layout hooks for a top-left marker and a split bottom metadata row so the new status-pill and overdue-dot presentation does not hardcode Tasks-specific business logic into the shared card.

**Tech Stack:** TypeScript, React Native, Expo, NativeWind, Jest, React Testing Library.

---

## File Map

**Modify**
- `src/components/cards/ActivityStyleRowCard.tsx`
- `src/components/cards/__tests__/ActivityStyleRowCard.test.tsx`
- `src/screens/TasksScreen.tsx`
- `src/screens/__tests__/TasksScreen.test.tsx`
- `src/__tests__/integration/TasksScreenInteraction.test.tsx`

**Inspect Only**
- `src/components/primitives/input/TextField.tsx`
- `src/ui/mappers/tasksMappers.ts`
- `docs/superpowers/specs/2026-07-09-tasks-compact-filter-row-and-card-density-design.md`

---

### Task 1: Add Generic Shared-Card Support For The Overdue Dot And Line-3 Status Row

**Files:**
- Modify: `src/components/cards/ActivityStyleRowCard.tsx`
- Modify: `src/components/cards/__tests__/ActivityStyleRowCard.test.tsx`

- [ ] **Step 1: Write the failing shared-card tests**

Add coverage for the new top-left marker and the split line-3 metadata row in `src/components/cards/__tests__/ActivityStyleRowCard.test.tsx`:

```ts
it("renders an optional upper-left overdue dot and a split line-3 row", () => {
  const screen = render(
    <ActivityStyleRowCard
      testID="shared-card:task-3"
      title="Test critical date"
      subtitle="Test description"
      metaLabel="Due: 2026-07-14"
      badgeLabel="In Progress"
      imageUri={undefined}
      topLeftMarker={
        <View
          testID="shared-card:task-3:overdue-dot"
          className="h-2.5 w-2.5 rounded-full bg-red-500"
        />
      }
      badgeVariant="pill"
      onPress={jest.fn()}
    />,
  );

  expect(screen.getByTestId("shared-card:task-3:overdue-dot")).toBeTruthy();
  expect(screen.getByTestId("shared-card:task-3:bottom-row")).toBeTruthy();
  expect(screen.getByTestId("shared-card:task-3:badge-pill")).toBeTruthy();
  expect(screen.getByText("Due: 2026-07-14")).toBeTruthy();
  expect(screen.getByText("In Progress")).toBeTruthy();
});

it("does not render the top-left marker when none is provided", () => {
  const screen = render(
    <ActivityStyleRowCard
      testID="shared-card:task-4"
      title="Concrete inspection"
      subtitle="North Tower"
      metaLabel="Modified: 2026-07-12"
      badgeLabel="Review"
      imageUri={undefined}
      onPress={jest.fn()}
    />,
  );

  expect(screen.queryByTestId("shared-card:task-4:overdue-dot")).toBeNull();
});
```

- [ ] **Step 2: Run the shared-card tests to verify they fail**

Run:

```bash
npx jest --runInBand --runTestsByPath /Volumes/KooDrive/InsiteApp/src/components/cards/__tests__/ActivityStyleRowCard.test.tsx
```

Expected: FAIL because `ActivityStyleRowCard` does not yet accept a top-left marker prop, does not render a dedicated bottom metadata row container, and does not style the status badge as a pill.

- [ ] **Step 3: Implement the minimal shared-card layout hooks**

Extend `ActivityStyleRowCard.tsx` with optional props for a top-left marker and a pill-style badge variant:

```ts
interface ActivityStyleRowCardProps {
  testID: string;
  title: string;
  subtitle: string;
  metaLabel: string;
  badgeLabel: string;
  imageUri?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  metaClassName?: string;
  badgeClassName?: string;
  topLeftMarker?: React.ReactNode;
  badgeVariant?: "plain" | "pill";
  onPress?: () => void;
}
```

Render the card chrome with the new generic slots:

```tsx
<Pressable
  testID={testID}
  onPress={onPress}
  className="overflow-hidden rounded-2xl bg-white"
>
  {topLeftMarker ? (
    <View testID={`${testID}:top-left-marker`} className="absolute left-3 top-3 z-10">
      {topLeftMarker}
    </View>
  ) : null}

  <View className="h-24 flex-row">
    <View
      testID={`${testID}:thumbnail`}
      className="h-24 w-24 items-center justify-center overflow-hidden bg-slate-100"
    >
      {/* existing image / placeholder logic */}
    </View>

    <View className="min-w-0 flex-1 justify-center p-4">
      <View className="min-w-0">
        <Text
          className={titleClassName ?? "text-base font-semibold text-slate-900"}
          numberOfLines={2}
        >
          {title}
        </Text>
        <Text
          className={subtitleClassName ?? "mt-1 text-sm text-slate-500"}
          numberOfLines={2}
        >
          {subtitle}
        </Text>
      </View>

      <View
        testID={`${testID}:bottom-row`}
        className="mt-3 flex-row items-center justify-between gap-3"
      >
        <Text
          className={metaClassName ?? "text-xs font-medium text-slate-400"}
          numberOfLines={1}
        >
          {metaLabel}
        </Text>

        <View
          testID={`${testID}:${badgeVariant === "pill" ? "badge-pill" : "badge-plain"}`}
          className={badgeVariant === "pill" ? "rounded-full bg-slate-100 px-2.5 py-1" : ""}
        >
          <Text
            className={
              badgeClassName ??
              "max-w-[96px] text-right text-xs font-medium uppercase tracking-wide text-slate-400"
            }
            numberOfLines={1}
          >
            {badgeLabel}
          </Text>
        </View>
      </View>
    </View>
  </View>
</Pressable>
```

Default the new prop in the function signature:

```ts
export default function ActivityStyleRowCard({
  testID,
  title,
  subtitle,
  metaLabel,
  badgeLabel,
  imageUri,
  titleClassName,
  subtitleClassName,
  metaClassName,
  badgeClassName,
  topLeftMarker,
  badgeVariant = "plain",
  onPress,
}: ActivityStyleRowCardProps) {
```

- [ ] **Step 4: Run the shared-card tests to verify they pass**

Run:

```bash
npx jest --runInBand --runTestsByPath /Volumes/KooDrive/InsiteApp/src/components/cards/__tests__/ActivityStyleRowCard.test.tsx
```

Expected: PASS, with the optional overdue dot and the shared bottom-row badge slot rendered correctly while existing thumbnail/placeholder behavior remains intact.

- [ ] **Step 5: Commit**

```bash
git add src/components/cards/ActivityStyleRowCard.tsx src/components/cards/__tests__/ActivityStyleRowCard.test.tsx
git commit -m "feat(tasks): extend shared row card layout hooks"
```

---

### Task 2: Update TasksScreen Filter Buttons And Card Styling To Match The Revised Spec

**Files:**
- Modify: `src/screens/TasksScreen.tsx`
- Modify: `src/screens/__tests__/TasksScreen.test.tsx`

- [ ] **Step 1: Write the failing Tasks screen tests**

Update `src/screens/__tests__/TasksScreen.test.tsx` to cover the revised filter text and card layout contract:

```ts
it("removes the visible Search label and hides inline counters from text-based filter buttons", () => {
  const screen = render(
    <TasksScreen
      onNavigateToTaskDetail={jest.fn()}
      onNavigateToCreateTask={jest.fn()}
    />,
  );

  expect(screen.queryByText("Search")).toBeNull();
  expect(within(screen.getByTestId("tasks-screen__filter_queue")).getByText("All")).toBeTruthy();
  expect(within(screen.getByTestId("tasks-screen__filter_bucket")).getByText("Doing")).toBeTruthy();
  expect(within(screen.getByTestId("tasks-screen__filter_sort")).getByText("Modified date")).toBeTruthy();
  expect(screen.queryByText("All 3")).toBeNull();
  expect(screen.queryByText("Doing 1")).toBeNull();
});

it("uses smaller filter typography, a two-line cap, and the flipped order-arrow mapping", () => {
  const screen = render(
    <TasksScreen
      onNavigateToTaskDetail={jest.fn()}
      onNavigateToCreateTask={jest.fn()}
    />,
  );

  expect(screen.getByTestId("tasks-screen__filter_row").props.className).toContain("flex-wrap");
  expect(within(screen.getByTestId("tasks-screen__filter_queue")).getByText("Queue").props.className).toContain(
    "text-sm",
  );
  expect(within(screen.getByTestId("tasks-screen__filter_queue")).getByText("All").props.className).toContain(
    "text-base",
  );
  expect(screen.getByTestId("tasks-screen__filter_sort_direction_icon").props.children).toBe("arrow-up");
});

it("renders the smaller task title, line-3 status pill, and overdue dot marker", () => {
  const screen = render(
    <TasksScreen
      onNavigateToTaskDetail={jest.fn()}
      onNavigateToCreateTask={jest.fn()}
    />,
  );

  expect(screen.getByText("Install guardrails").props.className).toContain("text-base");
  expect(screen.getByText("Level 12, Grid B–C").props.className).toContain("text-sm");
  expect(screen.getByText("In Progress").props.className).toContain("text-sm");
  expect(screen.getByTestId("tasks-screen__row_task-2:badge-pill")).toBeTruthy();
  expect(screen.getByTestId("tasks-screen__row_task-2:overdue-dot")).toBeTruthy();
  expect(screen.queryByTestId("tasks-screen__row_task-1:overdue-dot")).toBeNull();
});
```

- [ ] **Step 2: Run the Tasks screen tests to verify they fail**

Run:

```bash
npx jest --runInBand --runTestsByPath /Volumes/KooDrive/InsiteApp/src/screens/__tests__/TasksScreen.test.tsx
```

Expected: FAIL because the screen still renders the search label via the input contract, still shows count-bearing labels like `All 3`, still uses larger filter text and the old arrow mapping, and still passes the old title/badge styling into the shared card.

- [ ] **Step 3: Implement the revised Tasks screen presentation**

Add local helpers in `TasksScreen.tsx` to strip counters from visible button text and remove the search label from the field contract without changing accessibility labeling:

```ts
function stripVisibleCounter(label: string): string {
  return label.replace(/\s+\d+$/, "");
}
```

```ts
const searchContract = useMemo(() => {
  const contract = mapTaskInputToTextFieldProps(searchInput);

  return {
    ...contract,
    label: "",
  };
}, [searchInput]);

const selectedQueueLabel = stripVisibleCounter(
  output.filterControls?.queue?.options.find((option) => option.isSelected)?.label ?? "All 0",
);
const selectedBucketLabel = stripVisibleCounter(
  output.filterControls?.bucket?.options.find((option) => option.isSelected)?.label ?? "All 0",
);
const selectedSortLabel = stripVisibleCounter(
  output.filterControls?.sort?.options.find((option) => option.isSelected)?.label ?? "Modified date",
);
```

Update the flipped order-arrow mapping and the filter row classes:

```ts
const sortDirectionIconName =
  output.filterControls?.sortDirection?.selectedValue === "asc" ? "arrow-down" : "arrow-up";
```

```tsx
<View testID="tasks-screen__filter_row" className="mb-2 flex-row flex-wrap items-stretch gap-2">
  <Pressable
    testID="tasks-screen__filter_queue"
    onPress={actions.cycleQueue}
    className="min-w-0 flex-1 rounded-2xl bg-white px-3 py-2.5"
  >
    <Text className="text-sm font-semibold uppercase tracking-wide text-slate-500">Queue</Text>
    <Text className="mt-0.5 text-base font-medium text-slate-900" numberOfLines={2}>
      {selectedQueueLabel}
    </Text>
  </Pressable>

  <Pressable
    testID="tasks-screen__filter_bucket"
    onPress={actions.cycleBucket}
    className="min-w-0 flex-1 rounded-2xl bg-white px-3 py-2.5"
  >
    <View className="flex-row items-start justify-between gap-2">
      <Text className="text-sm font-semibold uppercase tracking-wide text-slate-500">Bucket</Text>
      {overdueVisibleTaskCount > 0 ? (
        <View
          testID="tasks-screen__filter_bucket_badge"
          className="min-w-[20px] rounded-full bg-red-500 px-1.5 py-0.5"
        >
          <Text className="text-center text-xs font-semibold text-white">{overdueVisibleTaskCount}</Text>
        </View>
      ) : null}
    </View>
    <Text className="mt-0.5 text-base font-medium text-slate-900" numberOfLines={2}>
      {selectedBucketLabel}
    </Text>
  </Pressable>

  <Pressable
    testID="tasks-screen__filter_sort"
    onPress={actions.cycleSortField}
    className="min-w-0 flex-1 rounded-2xl bg-white px-3 py-2.5"
  >
    <Text className="text-sm font-semibold uppercase tracking-wide text-slate-500">Sort by</Text>
    <Text className="mt-0.5 text-base font-medium text-slate-900" numberOfLines={2}>
      {selectedSortLabel}
    </Text>
  </Pressable>

  <Pressable
    testID="tasks-screen__filter_sort_direction"
    onPress={actions.toggleSortDirection}
    accessibilityLabel={selectedSortDirectionLabel}
    className="w-14 items-center justify-center rounded-2xl bg-white px-3 py-2.5"
  >
    <Ionicons
      testID="tasks-screen__filter_sort_direction_icon"
      name={sortDirectionIconName}
      size={18}
      color="#0f172a"
    />
  </Pressable>
</View>
```

Pass the revised task-card styling and overdue-dot marker into the shared card:

```tsx
<ActivityStyleRowCard
  testID={`tasks-screen__row_${row.taskId}`}
  title={row.title}
  subtitle={row.contextLine ?? row.projectName}
  metaLabel={row.latestUpdateLabel ?? "Task activity"}
  badgeLabel={row.statusLabel}
  imageUri={row.primaryPhotoUri}
  titleClassName="text-base font-semibold text-slate-900"
  subtitleClassName="mt-1 text-sm text-slate-500"
  metaClassName="text-sm font-medium text-slate-400"
  badgeClassName="text-sm font-medium uppercase tracking-wide text-slate-600"
  badgeVariant="pill"
  topLeftMarker={
    row.isOverdue ? (
      <View
        testID={`tasks-screen__row_${row.taskId}:overdue-dot`}
        className="h-2.5 w-2.5 rounded-full bg-red-500"
      />
    ) : undefined
  }
  onPress={() => props.onNavigateToTaskDetail(row.taskId)}
/>
```

- [ ] **Step 4: Run the Tasks screen tests to verify they pass**

Run:

```bash
npx jest --runInBand --runTestsByPath /Volumes/KooDrive/InsiteApp/src/screens/__tests__/TasksScreen.test.tsx
```

Expected: PASS, with no visible `Search` label, no inline counters, smaller filter typography, flipped arrow mapping, and the overdue-dot/status-pill task-card format rendered through the Tasks screen.

- [ ] **Step 5: Commit**

```bash
git add src/screens/TasksScreen.tsx src/screens/__tests__/TasksScreen.test.tsx
git commit -m "feat(tasks): polish filter buttons and card layout"
```

---

### Task 3: Restore Integration Coverage For The Revised Compact Controls

**Files:**
- Modify: `src/__tests__/integration/TasksScreenInteraction.test.tsx`

- [ ] **Step 1: Write the failing integration test updates**

Tighten `src/__tests__/integration/TasksScreenInteraction.test.tsx` so it asserts the revised compact-control contract instead of only wiring basic button presses:

```ts
it("wires compact filter presses through the revised Tasks controls", () => {
  const { getByTestId, queryByText } = render(
    <TasksScreen
      onNavigateToTaskDetail={jest.fn()}
      onNavigateToCreateTask={jest.fn()}
    />,
  );

  fireEvent.press(getByTestId("tasks-screen__filter_queue"));
  fireEvent.press(getByTestId("tasks-screen__filter_bucket"));
  fireEvent.press(getByTestId("tasks-screen__filter_sort"));
  fireEvent.press(getByTestId("tasks-screen__filter_sort_direction"));
  fireEvent.press(getByTestId("tasks-screen__header_reset_filters"));

  expect(getByTestId("tasks-screen__task_list")).toBeTruthy();
  expect(mockCycleQueue).toHaveBeenCalledTimes(1);
  expect(mockCycleBucket).toHaveBeenCalledTimes(1);
  expect(mockCycleSortField).toHaveBeenCalledTimes(1);
  expect(mockToggleSortDirection).toHaveBeenCalledTimes(1);
  expect(queryByText("Search")).toBeNull();
});
```

Make the mocked filter labels match the new no-counter visible-text path:

```ts
queue: {
  id: "queue",
  label: "Queue",
  selectedValue: "all",
  options: [
    { id: "queue:all", value: "all", label: "All", count: 2, isSelected: true },
    { id: "queue:my_queue", value: "my_queue", label: "My Queue", count: 1, isSelected: false },
    { id: "queue:team_queue", value: "team_queue", label: "Team Queue", count: 1, isSelected: false },
  ],
},
bucket: {
  id: "bucket",
  label: "Bucket",
  selectedValue: "all",
  options: [
    { id: "bucket:all", value: "all", label: "All", count: 2, isSelected: true },
    { id: "bucket:new", value: "new", label: "New", count: 1, isSelected: false },
    { id: "bucket:wip", value: "wip", label: "Doing", count: 0, isSelected: false },
    { id: "bucket:review", value: "review", label: "Review", count: 1, isSelected: false },
  ],
},
```

- [ ] **Step 2: Run the integration test to verify it fails**

Run:

```bash
npx jest --runInBand --runTestsByPath /Volumes/KooDrive/InsiteApp/src/__tests__/integration/TasksScreenInteraction.test.tsx
```

Expected: FAIL until the mocked data and revised screen contract align on the hidden search label and the updated compact-control presentation.

- [ ] **Step 3: Implement the minimal integration alignment**

Update the mocked `searchInput` contract so the test setup reflects the revised screen expectations:

```ts
searchInput: {
  id: "tasks-search",
  label: "Search",
  value: "",
  placeholder: "Search tasks",
  density: "standard",
  structuralState: "stale",
},
```

Keep the assertions on the new cycle handlers:

```ts
expect(mockCycleQueue).toHaveBeenCalledTimes(1);
expect(mockCycleBucket).toHaveBeenCalledTimes(1);
expect(mockCycleSortField).toHaveBeenCalledTimes(1);
expect(mockToggleSortDirection).toHaveBeenCalledTimes(1);
```

- [ ] **Step 4: Run the integration test to verify it passes**

Run:

```bash
npx jest --runInBand --runTestsByPath /Volumes/KooDrive/InsiteApp/src/__tests__/integration/TasksScreenInteraction.test.tsx
```

Expected: PASS, with the revised compact-control handlers still wired through the screen after the no-counter/no-search-label changes.

- [ ] **Step 5: Commit**

```bash
git add src/__tests__/integration/TasksScreenInteraction.test.tsx
git commit -m "test(tasks): cover revised compact control wiring"
```

---

### Task 4: Run The Focused Regression Suite And Manual QA Checklist

**Files:**
- Modify: `src/components/cards/ActivityStyleRowCard.tsx`
- Modify: `src/components/cards/__tests__/ActivityStyleRowCard.test.tsx`
- Modify: `src/screens/TasksScreen.tsx`
- Modify: `src/screens/__tests__/TasksScreen.test.tsx`
- Modify: `src/__tests__/integration/TasksScreenInteraction.test.tsx`

- [ ] **Step 1: Run the focused regression suite**

Run:

```bash
npx jest --runInBand --runTestsByPath /Volumes/KooDrive/InsiteApp/src/components/cards/__tests__/ActivityStyleRowCard.test.tsx /Volumes/KooDrive/InsiteApp/src/screens/__tests__/TasksScreen.test.tsx /Volumes/KooDrive/InsiteApp/src/__tests__/integration/TasksScreenInteraction.test.tsx
```

Expected: PASS for all three suites, covering the shared-card overdue dot, the revised line-3 badge layout, the hidden search label, the no-counter filter buttons, and the compact-control wiring.

- [ ] **Step 2: Run diagnostics on the edited files**

Check the edited files for newly introduced diagnostics after the Jest suite:

```text
- src/components/cards/ActivityStyleRowCard.tsx
- src/screens/TasksScreen.tsx
```

Expected: No new diagnostics errors in the shared card or Tasks screen files.

- [ ] **Step 3: Perform manual simulator verification**

Use the active iOS simulator session and verify this exact flow:

```text
1. Open the Tasks screen on a standard-width phone simulator.
2. Confirm the visible Search label above the search input is gone.
3. Confirm Queue, Bucket, and Sort By show no inline counters and use smaller text.
4. Confirm each text-based filter button stays within two internal text lines and the overall filter area never exceeds two rows.
5. Confirm Latest shows the up arrow and Earliest shows the down arrow.
6. Open a list containing overdue and non-overdue tasks.
7. Confirm overdue tasks show a small solid red dot in the upper-left corner of the card.
8. Confirm the task title is one size smaller, the line-2 subtitle and line-3 date/status text share the same size, and the status renders as a right-aligned pill on line 3.
```

Expected: The revised compact filter area stays visually controlled, the search field is cleaner, and task cards match the new status-pill plus overdue-dot design without clipping or misalignment.

---

## Scope Check

- Covered: hidden search label, no inline filter counters, smaller filter typography, two-line-per-button maximum for text-based controls, flipped order-arrow mapping, smaller task title, shared line-2/line-3 text sizing, line-3 status pill, and upper-left overdue dot.
- Intentionally unchanged: filter sequencing logic, overdue visible-count logic, project/task store persistence, Activity screen controls, and any new filter concepts beyond the current Queue/Bucket/Sort/Order model.
