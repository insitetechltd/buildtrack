# Activity Critical Tasks And Tab Spacing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the Activity critical-dates section to critical tasks, make each critical item open task detail, and tighten the bottom-tab spacing around the center camera button.

**Architecture:** Keep the existing Activity screen and dashboard adapter structure. Extend the dashboard summary-card contract with task identifiers for critical items, update the screen to render tappable cards, and refine the root tab button layout in `AppNavigator` without changing the camera button size or navigation flow.

**Tech Stack:** React Native, Expo, React Navigation bottom tabs, TypeScript, Jest, React Native Testing Library

---

### Task 1: Add critical-task navigation coverage

**Files:**
- Modify: `src/screens/__tests__/DashboardScreen.test.tsx`
- Modify: `src/ui/contracts/viewAdapters.ts`

- [ ] **Step 1: Write the failing test**

```tsx
expect(screen.getByText("This Week's Critical Tasks")).toBeTruthy();

fireEvent.press(screen.getByTestId("dashboard-screen__critical_task_critical-date-1"));

expect(onNavigateToTaskDetail).toHaveBeenCalledWith("task-critical-1");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest --runTestsByPath src/screens/__tests__/DashboardScreen.test.tsx --runInBand -t "critical"`
Expected: FAIL because the old label still says `This Week's Critical Dates` and the critical card is not pressable.

- [ ] **Step 3: Write minimal implementation**

```ts
criticalDates: Array<{
  id: string;
  taskId: string;
  dateLabel: string;
  title: string;
  subtitle: string;
}>;
```

```tsx
<Pressable
  testID={`dashboard-screen__critical_task_${item.id}`}
  onPress={() => props.onNavigateToTaskDetail?.(item.taskId)}
>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest --runTestsByPath src/screens/__tests__/DashboardScreen.test.tsx --runInBand -t "critical"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/screens/__tests__/DashboardScreen.test.tsx src/ui/contracts/viewAdapters.ts src/screens/DashboardScreen.tsx src/ui/viewAdapters/useDashboardViewAdapter.ts
git commit -m "feat(activity): open critical tasks from dashboard"
```

### Task 2: Wire dashboard critical-task data through the adapter

**Files:**
- Modify: `src/ui/viewAdapters/useDashboardViewAdapter.ts`
- Modify: `src/ui/viewAdapters/__tests__/useDashboardViewAdapter.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
expect(result.current.output.projectSummaryCard?.criticalDates).toEqual([
  expect.objectContaining({
    id: "critical-date:task-team-review",
    taskId: "task-team-review",
    title: "Approve facade mockup",
  }),
]);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest --runTestsByPath src/ui/viewAdapters/__tests__/useDashboardViewAdapter.test.ts --runInBand -t "critical dates"`
Expected: FAIL because `taskId` is not present in the mapped critical items.

- [ ] **Step 3: Write minimal implementation**

```ts
.map(({ task, dateLabel }) => ({
  id: `critical-date:${task.id}`,
  taskId: task.id,
  dateLabel,
  title: task.title,
  subtitle: buildCriticalDateSubtitle(task),
}));
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest --runTestsByPath src/ui/viewAdapters/__tests__/useDashboardViewAdapter.test.ts --runInBand -t "critical dates"`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/ui/viewAdapters/useDashboardViewAdapter.ts src/ui/viewAdapters/__tests__/useDashboardViewAdapter.test.ts
git commit -m "feat(activity): include critical task ids in dashboard summary"
```

### Task 3: Tighten bottom-tab spacing around camera

**Files:**
- Modify: `src/navigation/AppNavigator.tsx`
- Modify: `src/navigation/__tests__/AppNavigator.bottom-tabs.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
expect(screen.getByTestId("root-tab__activity")).toHaveStyle({ flexGrow: 0 });
expect(screen.getByTestId("root-tab__tasks")).toHaveStyle({ flexGrow: 0 });
expect(screen.getByTestId("root-tab__camera")).toHaveStyle({ flex: 1 });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest --runTestsByPath src/navigation/__tests__/AppNavigator.bottom-tabs.test.tsx --runInBand -t "spacing|slot sizing"`
Expected: FAIL because all three tabs currently use equal-width flexible slots.

- [ ] **Step 3: Write minimal implementation**

```ts
rootTabSideSlot: {
  alignItems: "center",
  flexGrow: 0,
  flexShrink: 1,
  justifyContent: "center",
  paddingHorizontal: 6,
}
```

```tsx
<View pointerEvents="box-none" style={styles.rootTabSideSlot} testID={testID}>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest --runTestsByPath src/navigation/__tests__/AppNavigator.bottom-tabs.test.tsx --runInBand`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/navigation/AppNavigator.tsx src/navigation/__tests__/AppNavigator.bottom-tabs.test.tsx
git commit -m "style(navigation): tighten tab spacing around camera"
```

### Task 4: Run focused verification

**Files:**
- Modify: `src/screens/DashboardScreen.tsx`
- Modify: `src/ui/viewAdapters/useDashboardViewAdapter.ts`
- Modify: `src/navigation/AppNavigator.tsx`

- [ ] **Step 1: Run the focused dashboard and navigation suites**

```bash
npx jest --runTestsByPath src/screens/__tests__/DashboardScreen.test.tsx src/ui/viewAdapters/__tests__/useDashboardViewAdapter.test.ts src/navigation/__tests__/AppNavigator.bottom-tabs.test.tsx --runInBand
```

- [ ] **Step 2: Check lint/diagnostics on edited files**

Use diagnostics for:
- `src/screens/DashboardScreen.tsx`
- `src/ui/viewAdapters/useDashboardViewAdapter.ts`
- `src/navigation/AppNavigator.tsx`

- [ ] **Step 3: Push when green**

```bash
git push
```
