# Insite Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the current Taskr mobile app into the approved Insite redesign by keeping the existing business logic and workflow engine while introducing a project-scoped activity-first shell, compact task views, improved delegation surfaces, and batch-first photo capture.

**Architecture:** Keep the current Expo + React Native + Zustand + Supabase workflow engine intact, then refactor the app surface around a sticky active-project workspace. Deliver the redesign in vertical slices: data-model extensions first, then navigation and project scope, then the Activity, Tasks, Task Detail, and Capture surfaces, with migration-safe tests after each slice.

**Tech Stack:** Expo 54, React Native 0.81, TypeScript, React Navigation, Zustand, Supabase, Jest, React Native Testing Library

---

## File Structure

### Core files to modify

- `src/navigation/AppNavigator.tsx`
  Rework the primary tab shell around `Activity`, `Tasks`, `Camera`, and `Profile/More`.

- `src/navigation/navigationTypes.ts`
  Add/rename route types for the new screen model and project-scoped navigation paths.

- `src/state/projectFilterStore.ts`
  Keep and harden sticky active-project persistence as the single source of truth.

- `src/state/taskStore.supabase.ts`
  Extend task data handling for project activity aggregation, delegation semantics, container/tag support, and batch-photo related activity entries.

- `src/types/buildtrack.ts`
  Add explicit primary owner / delegated users / container / tag / project-activity / batch-photo related types.

- `src/screens/DashboardScreen.tsx`
  Replace or repurpose into the new `Activity` home.

- `src/screens/TasksScreen.tsx`
  Rebuild around compact task rows, collapsible container groups, and cleaner filters.

- `src/screens/TaskDetailScreen.tsx`
  Preserve workflow logic but redesign the surface around lighter task context, activity log, delegation state, and photo timeline.

- `src/screens/PhotoSelectionScreen.tsx`
  Evolve from attachment review into a batch capture review experience that still supports existing upload behavior.

- `src/screens/CreateTaskScreen.tsx`
  Preserve creation/edit logic, but update it to align with the new project/container/tag/delegation model where needed.

- `src/ui/viewAdapters/useDashboardViewAdapter.ts`
  Convert from metrics dashboard aggregation to project activity feed aggregation.

- `src/ui/viewAdapters/useTasksViewAdapter.ts`
  Add container grouping, compact/collapsible task presentation data, delegation summary fields, and project-only behavior.

- `src/ui/viewAdapters/useTaskDetailViewAdapter.ts`
  Expose new task detail sections cleanly without changing the underlying workflow behavior.

- `src/ui/viewAdapters/usePhotoSelectionViewAdapter.ts`
  Support project-first save, optional task attachment, shared note, and batch activity logging.

- `src/utils/usePhotoSelection.ts`
  Preserve current media tooling while supporting explicit multi-photo batch capture behavior.

### Tests to add or modify

- `src/state/__tests__/taskStore.supabase.unit.test.ts`
- `src/state/__tests__/taskStore.supabase.workflow.test.ts`
- `src/state/__tests__/projectStore.workflow.test.ts`
- `src/components/__tests__/` new component tests for compact task groups, activity cards, and delegation summaries
- `src/__tests__/integration/` new integration coverage for project restore, activity-to-task navigation, and batch capture review

## Task 1: Lock the data model for project-scoped redesign

**Files:**
- Modify: `src/types/buildtrack.ts`
- Modify: `src/state/taskStore.supabase.ts`
- Test: `src/state/__tests__/taskStore.supabase.unit.test.ts`

- [ ] **Step 1: Write the failing unit tests for the new task shape**

```ts
describe('task redesign model', () => {
  it('maps a task to primary owner plus delegated users', () => {
    const task = normalizeTask({
      assignedTo: ['u-primary', 'u-helper'],
      assignedBy: 'u-manager',
      delegationHistory: [],
    } as any);

    expect(task.primaryAssigneeId).toBe('u-primary');
    expect(task.delegatedUserIds).toEqual(['u-helper']);
  });

  it('preserves project/container/tag metadata on normalization', () => {
    const task = normalizeTask({
      projectId: 'project-1',
      containerId: 'north-elevation',
      tags: ['Safety', 'Urgent'],
    } as any);

    expect(task.projectId).toBe('project-1');
    expect(task.containerId).toBe('north-elevation');
    expect(task.tags).toEqual(['Safety', 'Urgent']);
  });
});
```

- [ ] **Step 2: Run the unit test to verify it fails**

Run: `npm run test:tasks -- --runInBand src/state/__tests__/taskStore.supabase.unit.test.ts`

Expected: FAIL with missing `primaryAssigneeId`, `delegatedUserIds`, `containerId`, or `tags` fields / normalization behavior.

- [ ] **Step 3: Update the task types and normalization code**

```ts
export interface Task {
  id: string;
  projectId?: string;
  containerId?: string;
  subContainerId?: string;
  tags?: string[];
  assignedTo: string[];
  primaryAssigneeId?: string;
  delegatedUserIds?: string[];
  delegationHistory?: DelegationEvent[];
}

const normalizeTask = (task: Task): Task => {
  const assigned = Array.isArray(task.assignedTo) ? task.assignedTo : [];
  return {
    ...task,
    primaryAssigneeId: task.primaryAssigneeId ?? assigned[0],
    delegatedUserIds: task.delegatedUserIds ?? assigned.slice(1),
    tags: task.tags ?? [],
  };
};
```

- [ ] **Step 4: Add task activity semantics for redesign events**

```ts
type TaskActivityType =
  | 'progress_update'
  | 'status_change'
  | 'metadata_edit'
  | 'assignment'
  | 'delegation_added'
  | 'delegation_removed'
  | 'photo_batch_attached'
  | 'draft_completed';
```

- [ ] **Step 5: Run tests again**

Run: `npm run test:tasks -- --runInBand src/state/__tests__/taskStore.supabase.unit.test.ts`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/types/buildtrack.ts src/state/taskStore.supabase.ts src/state/__tests__/taskStore.supabase.unit.test.ts
git commit -m "feat: add redesign task data model"
```

## Task 2: Make active project context the default workspace behavior

**Files:**
- Modify: `src/state/projectFilterStore.ts`
- Modify: `src/navigation/AppNavigator.tsx`
- Modify: `src/navigation/navigationTypes.ts`
- Test: `src/state/__tests__/projectStore.workflow.test.ts`

- [ ] **Step 1: Write the failing workflow test for project restore**

```ts
it('restores the last selected project into the workspace shell', async () => {
  await setSelectedProject('project-west');
  const projectId = await getLastSelectedProject('user-1');
  expect(projectId).toBe('project-west');
});
```

- [ ] **Step 2: Run the workflow test to verify current behavior gaps**

Run: `npm run test:projects -- --runInBand src/state/__tests__/projectStore.workflow.test.ts`

Expected: FAIL or partial-pass without navigation-level guarantee.

- [ ] **Step 3: Make project restore explicit in the store API**

```ts
type ProjectWorkspaceState = {
  selectedProjectId: string | null;
  workspaceReady: boolean;
  initializeWorkspaceProject: (userId: string) => Promise<void>;
};
```

- [ ] **Step 4: Refactor the tab shell to the new top-level IA**

```tsx
<Tab.Screen name="Activity" component={DashboardScreen} />
<Tab.Screen name="Tasks" component={TasksScreen} />
<Tab.Screen name="Camera" component={PhotoSelectionScreen} />
<Tab.Screen name="Profile" component={ProfileScreen} />
```

- [ ] **Step 5: Ensure route names and params match the new shell**

```ts
export type RootTabParamList = {
  Activity: undefined;
  Tasks: undefined;
  Camera: { taskId?: string; projectId?: string } | undefined;
  Profile: undefined;
};
```

- [ ] **Step 6: Run the project and navigation tests**

Run: `npm run test:projects -- --runInBand src/state/__tests__/projectStore.workflow.test.ts`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/state/projectFilterStore.ts src/navigation/AppNavigator.tsx src/navigation/navigationTypes.ts src/state/__tests__/projectStore.workflow.test.ts
git commit -m "feat: make active project the default workspace"
```

## Task 3: Replace the dashboard with the new Activity home

**Files:**
- Modify: `src/screens/DashboardScreen.tsx`
- Modify: `src/ui/viewAdapters/useDashboardViewAdapter.ts`
- Test: `src/__tests__/integration/activity-home.integration.test.tsx`

- [ ] **Step 1: Write the failing integration test for the Activity home**

```tsx
it('shows only activity for the active project', async () => {
  render(<DashboardScreen />);
  expect(await screen.findByText('Recent Activity')).toBeTruthy();
  expect(screen.queryByText('Other Project Activity')).toBeNull();
});
```

- [ ] **Step 2: Run the integration test to verify the current dashboard mismatch**

Run: `npx jest src/__tests__/integration/activity-home.integration.test.tsx --runInBand`

Expected: FAIL because the current screen renders metrics instead of project activity.

- [ ] **Step 3: Change the dashboard adapter output from scalar metrics to activity feed sections**

```ts
return {
  activeProject,
  summaryPills,
  draftItems,
  recentActivityItems,
  taskShortcut,
};
```

- [ ] **Step 4: Rebuild the screen as the new activity-first surface**

```tsx
<Screen>
  <ProjectHeader project={activeProject} />
  <SummaryPills items={summaryPills} />
  <TaskShortcut onPress={openTasks} />
  <DraftSection items={draftItems} />
  <RecentActivityList items={recentActivityItems} />
  <CaptureFab onPress={openCamera} />
</Screen>
```

- [ ] **Step 5: Run the integration test again**

Run: `npx jest src/__tests__/integration/activity-home.integration.test.tsx --runInBand`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/screens/DashboardScreen.tsx src/ui/viewAdapters/useDashboardViewAdapter.ts src/__tests__/integration/activity-home.integration.test.tsx
git commit -m "feat: redesign dashboard as project activity home"
```

## Task 4: Redesign Tasks into compact, collapsible project groups

**Files:**
- Modify: `src/screens/TasksScreen.tsx`
- Modify: `src/ui/viewAdapters/useTasksViewAdapter.ts`
- Create: `src/components/tasks/CompactTaskGroup.tsx`
- Create: `src/components/tasks/CompactTaskRow.tsx`
- Test: `src/components/__tests__/CompactTaskGroup.test.tsx`

- [ ] **Step 1: Write the failing component test for collapsible groups**

```tsx
it('renders a compact task group with collapsible rows', () => {
  render(<CompactTaskGroup title="North Elevation" tasks={[taskA, taskB]} defaultExpanded />);
  expect(screen.getByText('North Elevation')).toBeTruthy();
  expect(screen.getByText(taskA.title)).toBeTruthy();
});
```

- [ ] **Step 2: Run the component test to confirm the new UI is missing**

Run: `npm run test:components -- CompactTaskGroup.test.tsx`

Expected: FAIL with missing component/module.

- [ ] **Step 3: Update the tasks adapter to group by container and summarize delegation**

```ts
const groupedTasks = groupBy(filteredTasks, task => task.containerId ?? 'ungrouped');
return {
  activeProject,
  activeFilters,
  taskGroups: Object.entries(groupedTasks).map(([containerId, tasks]) => ({
    containerId,
    title: containerLabelMap[containerId] ?? 'Unsorted',
    count: tasks.length,
    tasks: tasks.map(toCompactTaskRowModel),
  })),
};
```

- [ ] **Step 4: Build the compact collapsible components**

```tsx
export const CompactTaskGroup = ({ title, count, tasks, defaultExpanded }: Props) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  return (
    <View>
      <Pressable onPress={() => setExpanded(v => !v)}>
        <Text>{title}</Text>
        <Text>{count} tasks</Text>
      </Pressable>
      {expanded ? tasks.map(task => <CompactTaskRow key={task.id} task={task} />) : null}
    </View>
  );
};
```

- [ ] **Step 5: Replace large task cards in `TasksScreen`**

```tsx
{taskGroups.map((group, index) => (
  <CompactTaskGroup
    key={group.containerId}
    title={group.title}
    count={group.count}
    tasks={group.tasks}
    defaultExpanded={index === 0}
  />
))}
```

- [ ] **Step 6: Run tests**

Run: `npm run test:components -- CompactTaskGroup.test.tsx`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/screens/TasksScreen.tsx src/ui/viewAdapters/useTasksViewAdapter.ts src/components/tasks/CompactTaskGroup.tsx src/components/tasks/CompactTaskRow.tsx src/components/__tests__/CompactTaskGroup.test.tsx
git commit -m "feat: add compact collapsible task groups"
```

## Task 5: Redesign Task Detail around lighter context, delegation, and activity

**Files:**
- Modify: `src/screens/TaskDetailScreen.tsx`
- Modify: `src/ui/viewAdapters/useTaskDetailViewAdapter.ts`
- Modify: `src/components/taskDetail/TaskActivityTimeline.tsx`
- Test: `src/__tests__/integration/task-detail-redesign.integration.test.tsx`

- [ ] **Step 1: Write the failing integration test for delegation visibility**

```tsx
it('shows primary owner, delegated users, and activity log together', async () => {
  render(<TaskDetailScreen route={route} navigation={navigation} />);
  expect(await screen.findByText('Primary owner')).toBeTruthy();
  expect(screen.getByText('Delegated users')).toBeTruthy();
  expect(screen.getByText('Activity log')).toBeTruthy();
});
```

- [ ] **Step 2: Run the integration test**

Run: `npx jest src/__tests__/integration/task-detail-redesign.integration.test.tsx --runInBand`

Expected: FAIL because the current layout does not expose the redesign structure.

- [ ] **Step 3: Extend the view adapter**

```ts
return {
  taskHeader,
  workflowState,
  delegationSummary,
  subtaskSummary,
  photoTimeline,
  activityItems,
  reviewActions,
  quickActions,
};
```

- [ ] **Step 4: Recompose the screen**

```tsx
<ScrollView>
  <TaskHero header={taskHeader} workflowState={workflowState} />
  <DelegationCard summary={delegationSummary} />
  <PhotoTimeline items={photoTimeline} />
  <SubtaskSection items={subtaskSummary} />
  <ReviewActions actions={reviewActions} />
  <TaskActivityTimeline items={activityItems} />
</ScrollView>
```

- [ ] **Step 5: Add new activity labels for delegation and batch-photo events**

```ts
const labelMap: Record<TaskActivityType, string> = {
  delegation_added: 'Delegated',
  delegation_removed: 'Delegation removed',
  photo_batch_attached: 'Photo batch attached',
  draft_completed: 'Draft completed',
};
```

- [ ] **Step 6: Run the integration test again**

Run: `npx jest src/__tests__/integration/task-detail-redesign.integration.test.tsx --runInBand`

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/screens/TaskDetailScreen.tsx src/ui/viewAdapters/useTaskDetailViewAdapter.ts src/components/taskDetail/TaskActivityTimeline.tsx src/__tests__/integration/task-detail-redesign.integration.test.tsx
git commit -m "feat: redesign task detail workflow surface"
```

## Task 6: Convert photo review into batch-first capture review

**Files:**
- Modify: `src/screens/PhotoSelectionScreen.tsx`
- Modify: `src/ui/viewAdapters/usePhotoSelectionViewAdapter.ts`
- Modify: `src/utils/usePhotoSelection.ts`
- Test: `src/__tests__/integration/batch-capture-review.integration.test.tsx`

- [ ] **Step 1: Write the failing integration test for project-first batch review**

```tsx
it('shows batch capture review with project-first save and optional task attachment', async () => {
  render(<PhotoSelectionScreen route={route} navigation={navigation} />);
  expect(await screen.findByText('Save to project')).toBeTruthy();
  expect(screen.getByText('Attach to task')).toBeTruthy();
  expect(screen.getByText('Save as draft')).toBeTruthy();
});
```

- [ ] **Step 2: Run the integration test**

Run: `npx jest src/__tests__/integration/batch-capture-review.integration.test.tsx --runInBand`

Expected: FAIL because the current screen is still attachment-flow oriented.

- [ ] **Step 3: Update the photo-selection hook to preserve explicit batch state**

```ts
type BatchCaptureState = {
  selectedAssets: SelectedPhoto[];
  sharedNote: string;
  projectId: string | null;
  taskId?: string;
};
```

- [ ] **Step 4: Update the view adapter for the redesign actions**

```ts
return {
  projectLabel,
  selectedPhotos,
  sharedNote,
  saveToProject,
  attachToTask,
  saveAsDraft,
  addMorePhotos,
};
```

- [ ] **Step 5: Rebuild the screen layout**

```tsx
<Screen>
  <ProjectContextBanner projectLabel={projectLabel} />
  <PhotoBatchGrid photos={selectedPhotos} />
  <SharedNoteInput value={sharedNote} onChangeText={setSharedNote} />
  <PrimaryButton label="Save to project" onPress={saveToProject} />
  <SecondaryButton label="Attach to task" onPress={attachToTask} />
  <SecondaryButton label="Save as draft" onPress={saveAsDraft} />
</Screen>
```

- [ ] **Step 6: Ensure saving a batch creates activity events**

```ts
await addTaskActivity({
  taskId,
  type: 'photo_batch_attached',
  message: `Attached ${selectedPhotos.length} photos`,
});
```

- [ ] **Step 7: Run tests**

Run: `npx jest src/__tests__/integration/batch-capture-review.integration.test.tsx --runInBand`

Expected: PASS

- [ ] **Step 8: Commit**

```bash
git add src/screens/PhotoSelectionScreen.tsx src/ui/viewAdapters/usePhotoSelectionViewAdapter.ts src/utils/usePhotoSelection.ts src/__tests__/integration/batch-capture-review.integration.test.tsx
git commit -m "feat: redesign photo flow as batch capture review"
```

## Task 7: Migration pass, regression tests, and rollout guardrails

**Files:**
- Modify: `src/state/taskStore.supabase.ts`
- Modify: `src/screens/CreateTaskScreen.tsx`
- Modify: `src/ui/viewAdapters/useCreateTaskViewAdapter.ts`
- Test: `src/state/__tests__/taskStore.supabase.workflow.test.ts`
- Test: `src/__tests__/integration/`

- [ ] **Step 1: Write the failing workflow test for reassignment + delegation migration**

```ts
it('maps legacy assignedTo arrays to primary and delegated users without losing workflow history', async () => {
  const task = await migrateLegacyTask({
    assignedTo: ['u-primary', 'u-helper'],
    status: 'submitted_for_review',
  } as any);

  expect(task.primaryAssigneeId).toBe('u-primary');
  expect(task.delegatedUserIds).toEqual(['u-helper']);
  expect(task.status).toBe('submitted_for_review');
});
```

- [ ] **Step 2: Run the workflow suite**

Run: `npm run test:tasks -- --runInBand src/state/__tests__/taskStore.supabase.workflow.test.ts`

Expected: FAIL until migration behavior is implemented.

- [ ] **Step 3: Add explicit migration helpers**

```ts
export const migrateLegacyTask = (task: Task): Task => ({
  ...normalizeTask(task),
  containerId: task.containerId ?? 'ungrouped',
  tags: task.tags ?? [],
});
```

- [ ] **Step 4: Update create/edit flows to honor the redesign model**

```ts
updateField('projectId', selectedProjectId);
updateField('containerId', formData.containerId ?? 'ungrouped');
updateField('tags', formData.tags ?? []);
```

- [ ] **Step 5: Run the regression suite**

Run: `npm run test:regression`

Expected: PASS

- [ ] **Step 6: Smoke-test the app manually**

Run: `npm run expo-go`

Expected:
- app opens into the last active project
- Activity shows only project-scoped events
- Tasks use collapsible compact groups
- Task Detail preserves workflow actions
- Batch Capture Review supports multi-photo save / draft / attach flows

- [ ] **Step 7: Commit**

```bash
git add src/state/taskStore.supabase.ts src/screens/CreateTaskScreen.tsx src/ui/viewAdapters/useCreateTaskViewAdapter.ts src/state/__tests__/taskStore.supabase.workflow.test.ts src/__tests__/integration
git commit -m "feat: finalize redesign migration and regression coverage"
```

## Spec Coverage Check

- Sticky active project: covered by Task 2
- Activity-first home: covered by Task 3
- Full project task view: covered by Task 4
- Collapsible compact task groups: covered by Task 4
- Task detail redesign: covered by Task 5
- Multi-user delegation: covered by Tasks 1, 5, and 7
- Task and project activity logging: covered by Tasks 1, 3, 5, and 6
- Batch photo capture review: covered by Task 6
- Container/tag support: covered by Tasks 1 and 4
- Migration safety with old logic preserved: covered by Task 7

## Placeholder Scan

- No `TBD` / `TODO`
- No undefined “write tests later” steps
- All code-touching tasks include concrete code direction
- All tasks include explicit files and commands

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-03-insite-redesign-implementation.md`.

Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
