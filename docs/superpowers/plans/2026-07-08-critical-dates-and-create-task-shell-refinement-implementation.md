# Critical Dates + Create Task Shell Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make dashboard `Critical Dates` derive from due dates in the current calendar week and align `Create New Task` to the same shell, background, typography, and bottom-nav rhythm as `Activity` and `Tasks`.

**Architecture:** Keep the behavior change in `useDashboardViewAdapter()` and the create-task form/payload cleanup in `useCreateTaskViewAdapter()`. Keep the visible shell/body refinement in `CreateTaskScreen.tsx`, using existing header/navigation patterns instead of inventing a separate create-task chrome.

**Tech Stack:** TypeScript, React Native, Expo, Zustand-backed view adapters, React Navigation, Jest, React Testing Library.

---

## File Map

**Modify**
- `src/ui/viewAdapters/useDashboardViewAdapter.ts`
- `src/ui/viewAdapters/__tests__/useDashboardViewAdapter.test.ts`
- `src/ui/viewAdapters/useCreateTaskViewAdapter.ts`
- `src/ui/viewAdapters/__tests__/useCreateTaskViewAdapter.test.ts`
- `src/__tests__/integration/CreateTaskScreen.test.tsx`
- `src/screens/CreateTaskScreen.tsx`

---

### Task 1: Replace tag-based dashboard critical dates with due-this-week qualification

**Files:**
- Modify: `src/ui/viewAdapters/__tests__/useDashboardViewAdapter.test.ts`
- Modify: `src/ui/viewAdapters/useDashboardViewAdapter.ts`

- [ ] **Step 1: Write the failing adapter test**

Replace the current critical-dates expectation in `src/ui/viewAdapters/__tests__/useDashboardViewAdapter.test.ts` with a due-date-driven case like this:

```ts
it("builds critical dates from open tasks due in the current calendar week", () => {
  const { useTaskStore } = require("@/state/taskStore.supabase");

  setupBaseMocks([
    {
      id: "project-1",
      name: "North Tower",
      location: "Site A",
      status: "active",
      startDate: "2026-01-01T00:00:00.000Z",
    },
  ]);

  useTaskStore.mockReturnValue({
    tasks: [
      {
        id: "task-week-1",
        projectId: "project-1",
        title: "Approve facade mockup",
        description: "",
        priority: "critical",
        dueDate: "2026-07-08T00:00:00.000Z",
        category: "general",
        attachments: [],
        assignedTo: ["user-2"],
        assignedBy: "user-1",
        createdAt: "2026-07-01T00:00:00.000Z",
        updates: [],
        status: "submitted_for_review",
        completionPercentage: 100,
      },
      {
        id: "task-week-2",
        projectId: "project-1",
        title: "Install temporary barriers",
        description: "",
        priority: "high",
        dueDate: "2026-07-10T00:00:00.000Z",
        category: "general",
        attachments: [],
        assignedTo: ["user-1"],
        assignedBy: "user-2",
        createdAt: "2026-07-01T00:00:00.000Z",
        updates: [],
        status: "new",
        completionPercentage: 0,
      },
      {
        id: "task-next-week",
        projectId: "project-1",
        title: "Next week task",
        description: "",
        priority: "medium",
        dueDate: "2026-07-13T00:00:00.000Z",
        category: "general",
        attachments: [],
        assignedTo: ["user-1"],
        assignedBy: "user-2",
        createdAt: "2026-07-01T00:00:00.000Z",
        updates: [],
        status: "new",
        completionPercentage: 0,
      },
      {
        id: "task-no-date",
        projectId: "project-1",
        title: "Missing due date",
        description: "",
        priority: "medium",
        dueDate: undefined,
        category: "general",
        attachments: [],
        assignedTo: ["user-1"],
        assignedBy: "user-2",
        createdAt: "2026-07-01T00:00:00.000Z",
        updates: [],
        status: "new",
        completionPercentage: 0,
      },
    ],
  });

  const { result } = renderHook(() => useDashboardViewAdapter());

  expect(result.current.output.projectSummaryCard?.criticalDates).toEqual([
    {
      id: "critical-date:task-week-1",
      dateLabel: "Jul 8",
      title: "Approve facade mockup",
      subtitle: "Submitted For Review · Critical",
    },
    {
      id: "critical-date:task-week-2",
      dateLabel: "Jul 10",
      title: "Install temporary barriers",
      subtitle: "New · High",
    },
  ]);
});
```

- [ ] **Step 2: Run the adapter test to verify it fails**

Run:

```bash
npx jest src/ui/viewAdapters/__tests__/useDashboardViewAdapter.test.ts --runInBand
```

Expected: FAIL because the current adapter still requires the `critical_this_week` tag.

- [ ] **Step 3: Implement the due-this-week adapter logic**

Add small helpers to `src/ui/viewAdapters/useDashboardViewAdapter.ts` and switch the `criticalDates` builder to use current-week due dates:

```ts
function startOfLocalWeek(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  const day = normalized.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  normalized.setDate(normalized.getDate() + diffToMonday);
  return normalized;
}

function endOfLocalWeek(date: Date): Date {
  const start = startOfLocalWeek(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}
```

Then replace the current `criticalDates` block with:

```ts
const weekStart = startOfLocalWeek(today);
const weekEnd = endOfLocalWeek(today);

const criticalDates = [...activeProjectOpenTasks]
  .filter((task) => {
    if (!task.dueDate) {
      return false;
    }

    const parsedDueDate = new Date(task.dueDate);
    if (Number.isNaN(parsedDueDate.getTime())) {
      return false;
    }

    return parsedDueDate >= weekStart && parsedDueDate <= weekEnd;
  })
  .map((task) => {
    const parsedDueDate = new Date(task.dueDate!);
    return {
      task,
      dateLabel: formatCalendarLabel(parsedDueDate),
      sortTimestamp: parsedDueDate.getTime(),
    };
  })
  .sort((left, right) => left.sortTimestamp - right.sortTimestamp)
  .slice(0, 3)
  .map(({ task, dateLabel }) => ({
    id: `critical-date:${task.id}`,
    dateLabel,
    title: task.title,
    subtitle: buildCriticalDateSubtitle(task),
  }));
```

- [ ] **Step 4: Run the adapter test to verify it passes**

Run:

```bash
npx jest src/ui/viewAdapters/__tests__/useDashboardViewAdapter.test.ts --runInBand
```

Expected: PASS, with critical dates now driven by due dates inside the current local week.

- [ ] **Step 5: Commit**

```bash
git add src/ui/viewAdapters/useDashboardViewAdapter.ts src/ui/viewAdapters/__tests__/useDashboardViewAdapter.test.ts
git commit -m "fix(activity): derive critical dates from due week"
```

---

### Task 2: Remove the create-task critical-dates checkbox and payload field

**Files:**
- Modify: `src/ui/viewAdapters/__tests__/useCreateTaskViewAdapter.test.ts`
- Modify: `src/ui/viewAdapters/useCreateTaskViewAdapter.ts`
- Modify: `src/__tests__/integration/CreateTaskScreen.test.tsx`

- [ ] **Step 1: Write the failing tests**

Add an adapter expectation in `src/ui/viewAdapters/__tests__/useCreateTaskViewAdapter.test.ts`:

```ts
it("submits create mode without the legacy critical-this-week tag field", async () => {
  const { result } = renderHook(() => useCreateTaskViewAdapter({}));

  act(() => {
    result.current.actions.updateField("title", "Weekly inspection");
    result.current.actions.updateField("description", "Due this week");
    result.current.actions.updateField("projectId", "project-1");
    result.current.actions.updateField("assignedTo", ["user-2"]);
  });

  await act(async () => {
    await result.current.actions.submit();
  });

  expect(mockCreateTask).toHaveBeenCalledWith(
    expect.not.objectContaining({
      tags: ["critical_this_week"],
    }),
  );
});
```

Replace the current integration test in `src/__tests__/integration/CreateTaskScreen.test.tsx` with:

```ts
it("does not render the legacy critical-dates checkbox in create mode", () => {
  const screen = render(
    <NavigationContainer>
      <CreateTaskScreen onNavigateBack={jest.fn()} />
    </NavigationContainer>
  );

  expect(screen.queryByText("Show in This Week’s Critical Dates")).toBeNull();
  expect(screen.queryByTestId("create-task__toggle_critical_this_week")).toBeNull();
});
```

- [ ] **Step 2: Run the create-task tests to verify they fail**

Run:

```bash
npx jest src/ui/viewAdapters/__tests__/useCreateTaskViewAdapter.test.ts src/__tests__/integration/CreateTaskScreen.test.tsx --runInBand
```

Expected: FAIL because the legacy field is still hydrated/rendered/submitted.

- [ ] **Step 3: Remove the field from adapter state and screen rendering**

In `src/ui/viewAdapters/useCreateTaskViewAdapter.ts`, remove `criticalThisWeek` from defaults, edit hydration, and submit payload assembly. The default state should look like:

```ts
const createDefaultFormData = (selectedProjectId?: string | null) => ({
  title: "",
  description: "",
  taskReference: "",
  billingStatus: "non_billable" as const,
  priority: "medium" as const,
  category: "general" as const,
  dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  assignedTo: [] as string[],
  attachments: [] as string[],
  projectId: selectedProjectId ?? "",
});
```

And the create payload should stop adding the old tag:

```ts
await createTask({
  title: output.formData.title.trim(),
  description: output.formData.description.trim(),
  taskReference: output.formData.taskReference.trim(),
  billingStatus: output.formData.billingStatus,
  priority: output.formData.priority,
  category: output.formData.category,
  dueDate: output.formData.dueDate.toISOString(),
  assignedTo: output.formData.assignedTo,
  assignedBy: currentUser?.id ?? "",
  attachments: uploadedAttachmentUrls,
  projectId: output.formData.projectId,
});
```

In `src/__tests__/integration/CreateTaskScreen.test.tsx`, keep the replacement no-checkbox assertion. In `src/screens/CreateTaskScreen.tsx`, remove the rendered block for the `Show in This Week’s Critical Dates` toggle entirely.

- [ ] **Step 4: Run the create-task tests to verify they pass**

Run:

```bash
npx jest src/ui/viewAdapters/__tests__/useCreateTaskViewAdapter.test.ts src/__tests__/integration/CreateTaskScreen.test.tsx --runInBand
```

Expected: PASS, with no checkbox and no legacy critical-date tag submission.

- [ ] **Step 5: Commit**

```bash
git add src/ui/viewAdapters/useCreateTaskViewAdapter.ts src/ui/viewAdapters/__tests__/useCreateTaskViewAdapter.test.ts src/__tests__/integration/CreateTaskScreen.test.tsx src/screens/CreateTaskScreen.tsx
git commit -m "fix(create-task): remove critical date checkbox"
```

---

### Task 3: Align `Create New Task` shell, body, and bottom action spacing with Activity/Tasks

**Files:**
- Modify: `src/__tests__/integration/CreateTaskScreen.test.tsx`
- Modify: `src/screens/CreateTaskScreen.tsx`

- [ ] **Step 1: Write the failing integration assertions**

Add a screen-structure test in `src/__tests__/integration/CreateTaskScreen.test.tsx`:

```ts
it("matches the main shell styling for header, background, and bottom action spacing", () => {
  const screen = render(
    <NavigationContainer>
      <CreateTaskScreen onNavigateBack={jest.fn()} />
    </NavigationContainer>
  );

  expect(screen.getByTestId("create-task__root").props.className).toContain("bg-[#E7F4F8]");
  expect(screen.getByTestId("create-task__header").props.className).toContain("bg-[#08576E]");
  expect(screen.getByTestId("create-task__bottom_action_bar").props.className).toContain("pb-28");
});
```

- [ ] **Step 2: Run the integration test to verify it fails**

Run:

```bash
npx jest src/__tests__/integration/CreateTaskScreen.test.tsx --runInBand
```

Expected: FAIL because the root/header/bottom action classes do not yet match the updated shell structure.

- [ ] **Step 3: Implement the shell/body alignment**

In `src/screens/CreateTaskScreen.tsx`, apply the same shell family as `Activity` / `Tasks`:

```tsx
<SafeAreaView testID="create-task__root" className="flex-1 bg-[#E7F4F8]" edges={["left", "right", "bottom"]}>
```

Use the branded header wrapper:

```tsx
<AppScreenHeader
  title={headerTitle}
  titleNode={<BrandHeaderTitle subtitle={isEditMode ? "Task editor" : "Create task"} />}
  showBackButton
  onBackPress={props.onNavigateBack}
  showProfileTrigger={visibility.showProfileShortcut}
  onNavigateToProfile={props.onNavigateToProfile}
  onNavigateToProjectPicker={visibility.showProjectPickerShortcut ? props.onNavigateToProjectPicker : undefined}
  onNavigateToDeveloperSettings={visibility.showDeveloperSettingsShortcut ? props.onNavigateToDeveloperSettings : undefined}
  className="border-b-0 bg-[#08576E] pb-2"
  testID="create-task__header"
/>
```

Bring the body styling closer to `Activity` / `Tasks` by using the page surface and stronger section rhythm:

```tsx
<ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingTop: 12, paddingBottom: 180 }}>
```

Wrap the submit area so the button anchors above the tab bar:

```tsx
<View testID="create-task__bottom_action_bar" className="border-t border-[#C8E6EF] bg-[#E7F4F8] px-4 pb-28 pt-4">
  <Pressable
    testID="createTask-submit"
    onPress={handleSubmit}
    className="h-14 items-center justify-center rounded-2xl bg-[#2563EB]"
  >
    <Text className="text-lg font-semibold text-white">{submitLabel}</Text>
  </Pressable>
</View>
```

Also normalize visible section/body typography where the current screen is noticeably behind `Activity` / `Tasks`, for example:

```tsx
<Text className="text-[28px] leading-8 font-semibold text-[#0D2630]">Task Basics</Text>
<Text className="mt-1 text-base leading-6 text-[#577783]">Start with the essentials</Text>
```

Apply the same font-step philosophy to section titles, helper copy, and field group spacing without changing field order or workflow semantics.

- [ ] **Step 4: Run the integration test to verify it passes**

Run:

```bash
npx jest src/__tests__/integration/CreateTaskScreen.test.tsx --runInBand
```

Expected: PASS, with the create-task shell now matching the main screen family structurally.

- [ ] **Step 5: Commit**

```bash
git add src/screens/CreateTaskScreen.tsx src/__tests__/integration/CreateTaskScreen.test.tsx
git commit -m "fix(create-task): align shell and form styling"
```

---

### Task 4: Run the focused regression suite and verify the dashboard/create-task flow in the simulator

**Files:**
- Modify: none
- Test: `src/ui/viewAdapters/__tests__/useDashboardViewAdapter.test.ts`
- Test: `src/ui/viewAdapters/__tests__/useCreateTaskViewAdapter.test.ts`
- Test: `src/__tests__/integration/CreateTaskScreen.test.tsx`

- [ ] **Step 1: Run the focused regression suite**

Run:

```bash
npx jest \
  src/ui/viewAdapters/__tests__/useDashboardViewAdapter.test.ts \
  src/ui/viewAdapters/__tests__/useCreateTaskViewAdapter.test.ts \
  src/__tests__/integration/CreateTaskScreen.test.tsx \
  --runInBand
```

Expected: PASS, with due-this-week dashboard logic and create-task shell/checkbox changes all green.

- [ ] **Step 2: Relaunch the app against the active Metro session**

Run:

```bash
xcrun simctl launch 1BEE670D-D2EE-4ED8-8B95-E23476A20CAB com.buildtrack.app.local
xcrun simctl launch B5CF60DE-CEC7-4A09-814F-F40ED7E8638E com.buildtrack.app.local
```

Expected: both commands return a process id for `com.buildtrack.app.local`.

- [ ] **Step 3: Perform the manual acceptance check**

Check these points in the running app:

```text
Dashboard:
- tasks due this local calendar week appear in Critical Dates
- tasks outside the week do not appear
- tasks with no due date do not appear

Create New Task:
- the critical-dates checkbox is gone
- the branded header matches Activity/Tasks
- the light-blue page background matches the main screens
- the bottom side tab icons are visible again
- the Create Task button sits correctly above the nav bar
- section titles, helper text, and form rhythm feel aligned with Activity/Tasks
```

- [ ] **Step 4: Confirm no unexpected workspace drift**

Run:

```bash
git status --short
```

Expected: no unexpected files; only planned implementation changes remain before checkpoint/push.
