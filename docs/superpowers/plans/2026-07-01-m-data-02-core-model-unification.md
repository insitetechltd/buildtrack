# M-DATA-02 Core Model Unification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove runtime dependency on legacy task timeline tables and make `task_activities` the single in-app source of truth for task activity/timeline behavior without dropping old database tables in this milestone.

**Architecture:** Keep the database retention policy conservative: legacy tables may remain on disk, but no active runtime path should read from or write to them. The app model should treat `Task.activities` as canonical, keep `updates` compatibility-only, and stop maintaining dual in-memory timelines in the Supabase task store. The old `taskStore.ts` should be clearly isolated as legacy so compiled/runtime code paths no longer depend on `task_updates`.

**Tech Stack:** Expo-managed React Native, TypeScript, Zustand, Supabase, Jest.

---

## File Structure

**Primary implementation files**
- Modify: `src/types/buildtrack.ts`
- Modify: `src/state/taskStore.supabase.ts`
- Modify: `src/state/taskStore.ts`

**Primary test files**
- Modify: `src/state/__tests__/taskStore.supabase.unit.test.ts`
- Modify: `src/state/__tests__/taskStore.supabase.workflow.test.ts`
- Modify: `src/__tests__/integration/taskWorkflows.supabase.test.ts`

**Verification / documentation files**
- Modify: `docs/superpowers/plans/2026-07-01-m-data-02-core-model-unification.md`
- Inspect only: `PROGRESS_LOG_UNIFICATION_PLAN.md`
- Inspect only: `TASK_ACTIVITIES_UNIFICATION_MIGRATION.sql`

## Task 1: Freeze The Runtime-Dependency Gaps

**Files:**
- Modify: `src/state/__tests__/taskStore.supabase.unit.test.ts`
- Modify: `src/state/__tests__/taskStore.supabase.workflow.test.ts`
- Modify: `src/__tests__/integration/taskWorkflows.supabase.test.ts`

- [ ] **Step 1: Add a failing unit test that proves `addTaskUpdate()` no longer needs to append to `task.updates` to keep runtime behavior correct**

Add a focused test near the existing progress-update tests:

```ts
it('stores progress updates in activities while leaving legacy updates compatibility-only', async () => {
  const refreshTaskMock = jest.fn().mockResolvedValue(null);
  const taskActivityInsert = jest.fn().mockResolvedValue({ error: null });
  const updateEq = jest.fn().mockResolvedValue({ error: null });

  useTaskStore.setState({
    tasks: [
      createTaskState({
        activities: [],
        updates: [],
      }),
    ],
    fetchTaskById: refreshTaskMock as any,
  });

  mockFrom.mockImplementation((table: string) => {
    if (table === 'task_activities') {
      return {
        insert: taskActivityInsert,
      };
    }

    if (table === 'tasks') {
      return {
        update: jest.fn().mockReturnValue({
          eq: updateEq,
        }),
      };
    }

    throw new Error(`Unexpected table: ${table}`);
  });

  const { result } = renderHook(() => useTaskStore());

  await act(async () => {
    await result.current.addTaskUpdate('task-123', {
      description: 'Installed ducting and updated brackets',
      photos: ['https://example.com/progress.jpg'],
      completionPercentage: 50,
      status: 'in_progress',
      userId: workerId,
    });
  });

  const updatedTask = result.current.tasks.find((task) => task.id === 'task-123');
  expect(updatedTask?.activities).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        activityType: 'progress_update',
        description: 'Installed ducting and updated brackets',
      }),
    ])
  );
  expect(updatedTask?.updates).toEqual([]);
});
```

- [ ] **Step 2: Add a failing workflow test that treats `activities` as canonical after progress updates**

Update the existing workflow test to assert against `activities` instead of `updates`:

```ts
expect(result.current.tasks[0].activities).toEqual(
  expect.arrayContaining([
    expect.objectContaining({
      activityType: 'progress_update',
      completionPercentage: 50,
      status: 'in_progress',
    }),
  ])
);
expect(result.current.tasks[0].updates).toEqual([]);
```

- [ ] **Step 3: Add a failing repo-scan test or assertion target for the legacy store path**

Add a unit-level safety assertion in `taskStore.supabase.unit.test.ts` that the Supabase-backed store never calls `task_updates`:

```ts
expect(mockFrom).not.toHaveBeenCalledWith('task_updates');
```

- [ ] **Step 4: Run the targeted red suites**

Run:

```bash
PATH=/opt/homebrew/bin:$PATH npx jest src/state/__tests__/taskStore.supabase.unit.test.ts --runInBand
PATH=/opt/homebrew/bin:$PATH npx jest src/state/__tests__/taskStore.supabase.workflow.test.ts --runInBand
PATH=/opt/homebrew/bin:$PATH npx jest src/__tests__/integration/taskWorkflows.supabase.test.ts --runInBand
```

Expected:

```text
FAIL because the current store still appends progress updates into both `updates` and `activities`.
```

- [ ] **Step 5: Commit the regression-freeze checkpoint if isolated**

```bash
git add src/state/__tests__/taskStore.supabase.unit.test.ts src/state/__tests__/taskStore.supabase.workflow.test.ts src/__tests__/integration/taskWorkflows.supabase.test.ts
git commit -m "test(data): freeze m-data-02 activity canonicalization"
```

## Task 2: Make `Task.activities` The Canonical Runtime Timeline

**Files:**
- Modify: `src/types/buildtrack.ts`
- Modify: `src/state/taskStore.supabase.ts`

- [ ] **Step 1: Update the `Task` contract so `activities` is required and legacy timeline fields are compatibility-only**

In `src/types/buildtrack.ts`, keep these shapes available but demote them:

```ts
export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  priority: Priority;
  category: TaskCategory;
  assignedTo: string[];
  assignedBy: string;
  createdAt: string;
  status: TaskStatus;
  completionPercentage: number;
  activities: TaskActivity[];
  updates?: TaskUpdate[]; // compatibility-only, do not maintain as canonical runtime state
  statusHistory?: TaskStatusChange[]; // compatibility-only
  editHistory?: TaskEditHistory[]; // compatibility-only
}
```

- [ ] **Step 2: Stop appending progress updates into `task.updates` in the Supabase store**

In both local fallback and optimistic update branches of `addTaskUpdate()` and `addSubTaskUpdate()`, change the state writes from:

```ts
updates: [...task.updates, newUpdate],
activities: [...(task.activities || []), newActivity],
```

To:

```ts
activities: [...(task.activities || []), newActivity],
```

And preserve:

```ts
completionPercentage: update.completionPercentage,
status: update.status,
updatedAt: new Date().toISOString(),
```

- [ ] **Step 3: Keep fetch normalization compatibility-only**

Where fetch paths currently derive `updates` from activities, keep the derivation only at hydration boundaries, for example:

```ts
const derivedLegacyUpdates = taskActivities
  .filter((activity) => activity.activityType === 'progress_update' || activity.activityType === 'status_change')
  .map(mapActivityToTaskUpdate);
```

But do not append to `updates` during runtime mutations after the task is already in state.

- [ ] **Step 4: Run the focused green suites**

Run:

```bash
PATH=/opt/homebrew/bin:$PATH npx jest src/state/__tests__/taskStore.supabase.unit.test.ts --runInBand
PATH=/opt/homebrew/bin:$PATH npx jest src/state/__tests__/taskStore.supabase.workflow.test.ts --runInBand
PATH=/opt/homebrew/bin:$PATH npx jest src/__tests__/integration/taskWorkflows.supabase.test.ts --runInBand
```

Expected:

```text
PASS for the updated activity-canonical assertions.
```

- [ ] **Step 5: Commit the canonical runtime timeline checkpoint**

```bash
git add src/types/buildtrack.ts src/state/taskStore.supabase.ts src/state/__tests__/taskStore.supabase.unit.test.ts src/state/__tests__/taskStore.supabase.workflow.test.ts src/__tests__/integration/taskWorkflows.supabase.test.ts
git commit -m "refactor(data): make task activities canonical at runtime"
```

## Task 3: Remove Runtime Dependency On Legacy `task_updates` Paths

**Files:**
- Modify: `src/state/taskStore.ts`

- [ ] **Step 1: Mark the legacy store as explicitly non-runtime for task timeline writes**

At the top of `src/state/taskStore.ts`, add a brief file-level note:

```ts
// Legacy task store retained for reference only during M-DATA-02.
// Runtime task timeline reads/writes must go through taskStore.supabase.ts and task_activities.
```

- [ ] **Step 2: Replace direct legacy table writes with hard failure guards**

Change the legacy `task_updates` write path from:

```ts
const { error } = await supabase
  .from('task_updates')
  .insert({
    task_id: taskId,
    user_id: update.userId,
    description: update.description,
    photos: update.photos,
    completion_percentage: update.completionPercentage,
    status: update.status,
  });
```

To:

```ts
throw new Error(
  'Legacy taskStore.ts addTaskUpdate is no longer supported. Use taskStore.supabase.ts task_activities-backed flows.'
);
```

And do the same for `addSubTaskUpdate()`.

- [ ] **Step 3: Verify no runtime source file still writes legacy task timeline tables**

Run:

```bash
rg -n "from\\('task_updates'\\)|from\\(\"task_updates\"\\)|task_edit_history|task_status_history" src
```

Expected:

```text
Matches are limited to explicit legacy guards, test fixtures, or utilities that are not runtime task timeline paths.
```

- [ ] **Step 4: Commit the legacy runtime dependency removal checkpoint**

```bash
git add src/state/taskStore.ts
git commit -m "refactor(data): block legacy task update table writes"
```

## Task 4: Verification, Review, And Milestone Closure

**Files:**
- Verify: `src/types/buildtrack.ts`
- Verify: `src/state/taskStore.supabase.ts`
- Verify: `src/state/taskStore.ts`
- Verify: `src/state/__tests__/taskStore.supabase.unit.test.ts`
- Verify: `src/state/__tests__/taskStore.supabase.workflow.test.ts`
- Verify: `src/__tests__/integration/taskWorkflows.supabase.test.ts`

- [ ] **Step 1: Run the M-DATA-02 focused gate**

Run:

```bash
PATH=/opt/homebrew/bin:$PATH npx jest src/state/__tests__/taskStore.supabase.unit.test.ts --runInBand
PATH=/opt/homebrew/bin:$PATH npx jest src/state/__tests__/taskStore.supabase.workflow.test.ts --runInBand
PATH=/opt/homebrew/bin:$PATH npx jest src/__tests__/integration/taskWorkflows.supabase.test.ts --runInBand
PATH=/opt/homebrew/bin:$PATH npx tsc --noEmit
```

Expected:

```text
PASS
```

- [ ] **Step 2: Run diagnostics on touched files and clear any easy issues**

Diagnostics target list:

```text
src/types/buildtrack.ts
src/state/taskStore.supabase.ts
src/state/taskStore.ts
src/state/__tests__/taskStore.supabase.unit.test.ts
src/state/__tests__/taskStore.supabase.workflow.test.ts
src/__tests__/integration/taskWorkflows.supabase.test.ts
```

- [ ] **Step 3: Run a reviewer pass**

Reviewer focus:

```text
- accidental UI/runtime reliance on `updates`
- compatibility-only fields still being maintained as canonical state
- any remaining live `task_updates` writes
- fetch-time compatibility derivation regressions
```

- [ ] **Step 4: Verify closure criteria**

Run:

```bash
rg -n "from\\('task_updates'\\)|from\\(\"task_updates\"\\)|task_edit_history|task_status_history" src
git status --short
```

Expected:

```text
No active runtime dependency remains on legacy task timeline tables.
Worktree is clean after commit.
```

- [ ] **Step 5: Record milestone closure**

```text
M-DATA-02 closed:
- `task_activities` is the single runtime task timeline source of truth
- `Task.activities` is canonical in-app state
- legacy tables are not dropped, but runtime code no longer depends on them
```

## Self-Review

**Spec coverage**
- removes runtime dependency on legacy tables without dropping them
- makes `activities` canonical while preserving compatibility-only legacy fields
- adds tests and scans that enforce the new runtime boundary

**Placeholder scan**
- no `TODO`, `TBD`, or unresolved “implement later” steps remain
- every task includes exact files, commands, or concrete code targets

**Type consistency**
- `Task.activities` remains required across the plan
- `updates`, `statusHistory`, and `editHistory` remain compatibility-only
- `taskStore.supabase.ts` remains the only supported runtime task timeline write path
