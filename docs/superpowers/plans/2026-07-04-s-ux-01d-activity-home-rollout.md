# S-UX-01D Activity-First Home Rollout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the legacy dashboard metrics surface with the approved project-scoped `Recent Activity` home while preserving the active-project workspace behavior and task/camera entry paths.

**Architecture:** Keep the existing `DashboardScreen` route in place for compatibility under the newly renamed `Activity` tab, but repurpose its adapter and screen composition around the active project, recent activity items, quick task access, and photo-first actions. Deliver this slice as an adapter-plus-screen rollout with focused integration coverage instead of trying to redesign downstream task or capture screens at the same time.

**Tech Stack:** Expo 54, React Native 0.81, TypeScript, React Navigation, Zustand, Supabase, Jest, React Native Testing Library

---

## File Structure

### Core files to modify

- `src/screens/DashboardScreen.tsx`
  Recompose the current dashboard route into the approved Activity home surface.

- `src/ui/viewAdapters/useDashboardViewAdapter.ts`
  Replace the current project-summary + metric-grid output with active-project context, activity feed sections, draft highlights, and task shortcut data.

- `src/ui/contracts/viewAdapters.ts`
  Extend the dashboard view contract so the new Activity home data is typed instead of passed through ad hoc fields.

- `src/state/taskStore.supabase.ts`
  Reuse existing task and activity data sources, and add any tiny selectors/helpers needed to derive project-scoped activity items safely.

- `src/state/projectFilterStore.ts`
  Read the active project context already established in `S-UX-01B`; do not redesign store behavior here.

### Tests to add or modify

- `src/__tests__/integration/activity-home.integration.test.tsx`
  New integration test covering active-project scoping and the new screen structure.

- `src/ui/viewAdapters/__tests__/useDashboardViewAdapter.test.ts`
  New focused adapter test to prove activity items and task shortcut data come only from the active project.

### Docs to update after implementation

- `documentation/ROADMAP.md`
  Mark `WS-UX / M-UX-01 / S-UX-01D` closed only after code, review, and validation pass.

- `docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md`
  Add closure evidence for `S-UX-01D`.

## Task 1: Lock the failing tests for the Activity home contract

**Files:**
- Create: `src/__tests__/integration/activity-home.integration.test.tsx`
- Create: `src/ui/viewAdapters/__tests__/useDashboardViewAdapter.test.ts`

- [ ] **Step 1: Write the failing integration test for the new Activity home shell**

```tsx
it("shows the approved Activity home for the active project", async () => {
  render(
    <DashboardScreen
      onNavigateToTasks={jest.fn()}
      onNavigateToCreateTask={jest.fn()}
      onNavigateToProfile={jest.fn()}
    />,
  );

  expect(await screen.findByText("Recent Activity")).toBeTruthy();
  expect(screen.getByText("All Tasks")).toBeTruthy();
  expect(screen.queryByText("Tasks For Me")).toBeNull();
  expect(screen.queryByText("Tasks From Me")).toBeNull();
});
```

- [ ] **Step 2: Write the failing adapter test for active-project-only activity**

```ts
it("returns only recent activity items for the active project", () => {
  const result = renderDashboardAdapter({
    selectedProjectId: "project-1",
    tasks: [
      buildTask({ id: "task-1", projectId: "project-1", title: "Concrete pour" }),
      buildTask({ id: "task-2", projectId: "project-2", title: "Other project item" }),
    ],
  });

  expect(result.output.activityItems.map(item => item.taskId)).toEqual(["task-1"]);
});
```

- [ ] **Step 3: Run the new tests to verify they fail against the legacy dashboard**

Run: `npx jest src/__tests__/integration/activity-home.integration.test.tsx src/ui/viewAdapters/__tests__/useDashboardViewAdapter.test.ts --runInBand`

Expected: FAIL because the current screen still renders project summary cards and metric grids instead of the approved Activity home structure.

## Task 2: Extend the dashboard adapter contract for Activity-home data

**Files:**
- Modify: `src/ui/contracts/viewAdapters.ts`
- Modify: `src/ui/viewAdapters/useDashboardViewAdapter.ts`

- [ ] **Step 1: Define typed Activity-home models in the dashboard contract**

```ts
export interface DashboardActivityItem {
  id: string;
  taskId: string;
  title: string;
  subtitle: string;
  timestampLabel: string;
  statusLabel: string;
  previewPhotoUri?: string;
}

export interface DashboardTaskShortcut {
  title: string;
  subtitle: string;
  countLabel: string;
}
```

- [ ] **Step 2: Replace the legacy dashboard output shape with Activity-home fields**

```ts
export interface DashboardScreenViewAdapterOutput extends ScreenViewAdapterOutputBase {
  activeProject: {
    id: string;
    title: string;
    subtitle?: string;
  } | null;
  summaryPills: Array<{ id: string; label: string; value: string }>;
  draftItems: DashboardActivityItem[];
  activityItems: DashboardActivityItem[];
  taskShortcut: DashboardTaskShortcut | null;
}
```

- [ ] **Step 3: Derive Activity-home output from the active project only**

```ts
const activeProject = projects.find((project) => project.id === selectedProjectId) ?? null;
const visibleTasks = tasks.filter((task) => task.projectId === activeProject?.id);

return {
  output: {
    screenId: "DashboardScreen",
    readiness,
    continuity,
    activeProject: activeProject
      ? {
          id: activeProject.id,
          title: activeProject.name,
          subtitle: activeProject.location,
        }
      : null,
    summaryPills,
    draftItems,
    activityItems,
    taskShortcut,
  },
  visibility,
};
```

- [ ] **Step 4: Re-run the adapter test**

Run: `npx jest src/ui/viewAdapters/__tests__/useDashboardViewAdapter.test.ts --runInBand`

Expected: PASS

## Task 3: Recompose `DashboardScreen` into the approved Activity home

**Files:**
- Modify: `src/screens/DashboardScreen.tsx`
- Test: `src/__tests__/integration/activity-home.integration.test.tsx`

- [ ] **Step 1: Replace the legacy dashboard title and metric sections with Activity-home structure**

```tsx
<SafeAreaView className="flex-1 bg-slate-50">
  <View className="flex-1 px-4 pt-3">
    <View className="mb-4 flex-row items-center justify-between">
      <Text className="text-xl font-semibold text-slate-900">Recent Activity</Text>
      <HeaderActions />
    </View>

    <ProjectHeroCard project={output.activeProject} />
    <SummaryPillRow items={output.summaryPills} />
    <TaskShortcutCard
      label="All Tasks"
      summary={output.taskShortcut}
      onPress={props.onNavigateToTasks}
    />
    <DraftActivitySection items={output.draftItems} />
    <RecentActivitySection
      items={output.activityItems}
      onPressItem={(taskId) => props.onNavigateToTaskDetail?.(taskId)}
    />
  </View>
</SafeAreaView>
```

- [ ] **Step 2: Preserve direct path to capture from the Activity home**

```tsx
{visibility.showCreateTaskFab ? (
  <Pressable
    testID="dashboard-screen__fab_open_camera"
    onPress={props.onNavigateToCreateTask}
    className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-slate-900 shadow-lg"
  >
    <Ionicons name="camera-outline" size={24} color="#ffffff" />
  </Pressable>
) : null}
```

- [ ] **Step 3: Preserve project switching from the Activity header**

```tsx
{visibility.showProjectPickerShortcut && props.onNavigateToProjectPicker ? (
  <Pressable
    testID="dashboard-screen__header_project_picker"
    onPress={() => props.onNavigateToProjectPicker?.(true)}
    className="ml-2 h-10 w-10 items-center justify-center rounded-full bg-white"
  >
    <Ionicons name="business-outline" size={20} color="#0f172a" />
  </Pressable>
) : null}
```

- [ ] **Step 4: Re-run the integration test**

Run: `npx jest src/__tests__/integration/activity-home.integration.test.tsx --runInBand`

Expected: PASS

## Task 4: Close the slice with focused validation and roadmap updates

**Files:**
- Modify: `documentation/ROADMAP.md`
- Modify: `docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md`

- [ ] **Step 1: Run the focused slice validation**

Run: `npx jest src/__tests__/integration/activity-home.integration.test.tsx src/ui/viewAdapters/__tests__/useDashboardViewAdapter.test.ts src/navigation/__tests__/WorkspaceBootstrapGate.test.tsx --runInBand && npx tsc --noEmit`

Expected: PASS

- [ ] **Step 2: Mark `S-UX-01D` closed in the canonical docs**

```md
| WS-UX / M-UX-01 / S-UX-01D | Activity-first home rollout | Closed | S-UX-01C | 14.4 | ../docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md |
```

```md
| WS-UX / M-UX-01 / S-UX-01D | Activity-first home rollout | Closed | Replaced the legacy dashboard with the approved project-scoped `Recent Activity` home and preserved task/camera entry paths. |
```

- [ ] **Step 3: Create the slice checkpoint commit**

```bash
git add src/screens/DashboardScreen.tsx src/ui/viewAdapters/useDashboardViewAdapter.ts src/ui/contracts/viewAdapters.ts src/__tests__/integration/activity-home.integration.test.tsx src/ui/viewAdapters/__tests__/useDashboardViewAdapter.test.ts documentation/ROADMAP.md docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md
git commit -m "feat(ux): roll out activity-first home"
```

## Spec Coverage Check

- Approved `Recent Activity` default home: covered by Tasks 1 through 3
- Active-project-only scope: covered by Tasks 1 and 2
- Preserve task and camera entry paths: covered by Task 3
- Roadmap-first closure evidence: covered by Task 4

## Placeholder Scan

- No `TBD` / `TODO`
- No undefined “wire later” steps
- Each code task includes concrete files and commands

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-04-s-ux-01d-activity-home-rollout.md`.

Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Minimal-interaction directive already established: continue inline unless blocked by a real execution issue or governance conflict.
