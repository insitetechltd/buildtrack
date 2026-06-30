# M-DATA-01 Cache Authority & Sync Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the remaining cache-authority and sync-invalidation gaps so live request envelopes remain the only freshness authority and task invalidation behaves consistently across realtime, manual, foreground, and reconnect paths.

**Architecture:** Keep `requestCacheRegistry` in `src/api/supabase.ts` as the sole freshness authority, keep persisted `taskQueryMeta` advisory only, and strengthen the task sync orchestration by making delete/update invalidation fan out across the same resource families used by fetches. Freeze the missing behavior with targeted tests first, then implement the smallest production changes in `RealtimeSyncManager`, `taskStore.supabase`, and refresh managers needed to satisfy the roadmap gate.

**Tech Stack:** Expo-managed React Native, TypeScript, Zustand, Supabase, React Navigation, Jest.

---

## File Structure

**Primary files**
- Modify: `src/__tests__/integration/syncManagers.test.tsx`
  - add missing regression coverage for manual invalidation, reconnect/foreground refresh semantics, and realtime delete breadth
- Modify: `src/api/__tests__/supabase.requestCoordinator.test.ts`
  - add direct coordinator coverage for invalidation behavior where useful
- Modify: `src/state/__tests__/taskStore.supabase.unit.test.ts`
  - extend authority tests only if needed for request-envelope and persisted-meta boundaries
- Modify: `src/utils/RealtimeSyncManager.tsx`
  - ensure delete and soft-delete invalidation reaches the same resource-key families as live fetch paths
- Modify: `src/state/taskStore.supabase.ts`
  - expose any minimal helper or fallback key derivation needed for consistent invalidation when the local task is absent
- Modify: `src/utils/DataRefreshManager.tsx`
  - tighten foreground/reconnect/manual refresh behavior only if tests prove current flow leaves stale authority ambiguity
- Modify: `src/utils/NetworkSyncManager.tsx`
  - keep reconnect behavior aligned with `DataRefreshManager` if refresh-entry changes are required

**Verification targets**
- `src/__tests__/integration/syncManagers.test.tsx`
- `src/state/__tests__/taskStore.supabase.unit.test.ts`
- `src/api/__tests__/supabase.requestCoordinator.test.ts`

## Task 1: Freeze Missing Sync And Invalidation Gaps

**Files:**
- Modify: `src/__tests__/integration/syncManagers.test.tsx`
- Modify: `src/api/__tests__/supabase.requestCoordinator.test.ts`

- [ ] **Step 1: Add a failing realtime-delete test that requires full task key-family invalidation even when the local task is missing**

```tsx
it("invalidates all supported task resource key families for realtime deletes without relying on a cached task", async () => {
  let tasksChangeHandler:
    | ((payload: {
        eventType: string;
        old?: { id?: string; project_id?: string | null; assigned_to?: Array<string | number> | null; assigned_by?: string | number | null } | null;
        new?: { id?: string } | null;
      }) => Promise<void>)
    | undefined;

  const invalidateResourceKeys = jest.fn();
  const evictTaskFromCache = jest.fn();

  const taskStoreState = {
    tasks: [],
    fetchTaskById: jest.fn(),
    evictTaskFromCache,
  };

  jest.doMock('../../state/taskStore.supabase', () => {
    const useTaskStore = jest.fn(() => taskStoreState);
    useTaskStore.getState = () => taskStoreState;
    useTaskStore.setState = jest.fn();
    return { useTaskStore };
  });

  jest.doMock('../../api/supabase', () => ({
    buildResourceKey: (...segments: Array<string | number | null | undefined | false>) =>
      segments
        .filter((segment): segment is string | number => segment !== null && segment !== undefined && segment !== false)
        .map((segment) => String(segment).trim())
        .filter((segment) => segment.length > 0)
        .join(':'),
    invalidateResourceKeys,
    supabase: {
      channel: jest.fn(() => ({
        on: jest.fn((_event, filter, callback) => {
          if (filter.table === 'tasks') {
            tasksChangeHandler = callback;
          }
          return {
            on: jest.fn(),
            subscribe: jest.fn((statusCallback?: (status: string) => void) => {
              statusCallback?.('SUBSCRIBED');
              return {};
            }),
          };
        }),
        subscribe: jest.fn(),
      })),
      removeChannel: jest.fn(),
    },
  }));

  const React = require('react');
  const { render } = require('@testing-library/react-native');
  const { RealtimeSyncManager } = require('../../utils/RealtimeSyncManager');

  render(React.createElement(RealtimeSyncManager));

  await tasksChangeHandler?.({
    eventType: 'DELETE',
    old: {
      id: 'task-rt-delete',
      project_id: 'project-42',
      assigned_to: ['worker-1'],
      assigned_by: 'manager-7',
    },
    new: null,
  });

  expect(invalidateResourceKeys).toHaveBeenCalledWith(
    expect.arrayContaining([
      'tasks:all',
      'task:task-rt-delete',
      'tasks:project:project-42',
      'tasks:user:worker-1',
      'tasks:assignedBy:manager-7',
    ])
  );
  expect(evictTaskFromCache).toHaveBeenCalledWith('task-rt-delete');
});
```

- [ ] **Step 2: Add a failing foreground/reconnect test that proves refresh entry does not rely on persisted taskQueryMeta freshness**

```tsx
it('forces a network-backed task refresh on reconnect even when persisted taskQueryMeta looks fresh', async () => {
  const fetchTasks = jest.fn().mockResolvedValue(undefined);
  const fetchProjects = jest.fn().mockResolvedValue(undefined);
  const fetchUserProjectAssignments = jest.fn().mockResolvedValue(undefined);
  const fetchUsers = jest.fn().mockResolvedValue(undefined);

  const taskStoreState = {
    tasks: [{ id: 'task-1' }],
    taskQueryMeta: {
      'tasks:all': {
        key: 'tasks:all',
        hasHydratedData: true,
        hasFetchedOnce: true,
        lastFetchedAt: 1_000,
        lastSuccessfulFetchAt: 1_000,
        staleAt: Date.now() + 60_000,
        expiresAt: Date.now() + 120_000,
      },
    },
    fetchTasks,
  };

  // preserve the existing mock scaffolding in this file for project/user/auth stores
  // then mount NetworkSyncManager and trigger its reconnect callback

  expect(fetchTasks).toHaveBeenCalledWith(true);
});
```

- [ ] **Step 3: Add a direct invalidation test for the request coordinator**

```ts
import {
  buildResourceKey,
  clearRequestCoordinator,
  getRequestCacheEnvelope,
  invalidateResourceKeys,
  runSingleFlightRequest,
} from "../supabase";

it("marks matching task resource envelopes stale and expired on manual invalidation", async () => {
  await runSingleFlightRequest(buildResourceKey("tasks", "all"), async () => ["task-1"], {
    staleMs: 15_000,
    ttlMs: 60_000,
  });

  invalidateResourceKeys([buildResourceKey("tasks", "all")]);

  const envelope = getRequestCacheEnvelope<string[]>(buildResourceKey("tasks", "all"));
  expect(envelope?.staleAt).toBe(0);
  expect(envelope?.expiresAt).toBe(0);
});
```

- [ ] **Step 4: Run the targeted red suites**

Run:

```bash
PATH=/opt/homebrew/bin:$PATH npx jest src/__tests__/integration/syncManagers.test.tsx --runInBand
PATH=/opt/homebrew/bin:$PATH npx jest src/api/__tests__/supabase.requestCoordinator.test.ts --runInBand
```

Expected:

```text
FAIL
- missing delete-key invalidation breadth and/or missing reconnect test harness behavior
- coordinator invalidation test may fail if invalidateResourceKeys is not exported in the current test import
```

- [ ] **Step 5: Commit the regression-freeze checkpoint if isolated**

```bash
git add src/__tests__/integration/syncManagers.test.tsx src/api/__tests__/supabase.requestCoordinator.test.ts
git commit -m "test(data): freeze cache authority sync gaps"
```

## Task 2: Implement Consistent Task Key-Family Invalidation

**Files:**
- Modify: `src/utils/RealtimeSyncManager.tsx`
- Modify: `src/state/taskStore.supabase.ts`
- Test: `src/__tests__/integration/syncManagers.test.tsx`

- [ ] **Step 1: Add a shared fallback helper for task invalidation context**

```ts
function getTaskInvalidationKeys(task: {
  id: string;
  projectId?: string | null;
  assignedTo?: Array<string | number> | null;
  assignedBy?: string | number | null;
}) {
  const keys = new Set<string>([
    buildResourceKey('tasks', 'all'),
    buildResourceKey('task', task.id),
  ]);

  if (task.projectId) {
    keys.add(buildResourceKey('tasks', 'project', task.projectId));
  }

  for (const assignee of task.assignedTo ?? []) {
    keys.add(buildResourceKey('tasks', 'user', assignee));
  }

  if (task.assignedBy) {
    keys.add(buildResourceKey('tasks', 'assignedBy', task.assignedBy));
  }

  return Array.from(keys);
}
```

- [ ] **Step 2: Use the helper in realtime delete and soft-delete paths even when the cached task lookup misses**

```ts
const cachedTask = tasks.find((task) => task.id === taskId);
const payloadTask = {
  id: taskId,
  projectId: cachedTask?.projectId ?? payload.old?.project_id ?? payload.new?.project_id ?? null,
  assignedTo: cachedTask?.assignedTo ?? payload.old?.assigned_to ?? payload.new?.assigned_to ?? [],
  assignedBy: cachedTask?.assignedBy ?? payload.old?.assigned_by ?? payload.new?.assigned_by ?? null,
};

invalidateResourceKeys(getTaskInvalidationKeys(payloadTask));
evictTaskFromCache(taskId);
```

- [ ] **Step 3: Keep the update/insert path aligned with the same helper to prevent drift**

```ts
const taskKeys = getTaskInvalidationKeys({
  id: taskId,
  projectId: payload.new?.project_id ?? cachedTask?.projectId ?? null,
  assignedTo: payload.new?.assigned_to ?? cachedTask?.assignedTo ?? [],
  assignedBy: payload.new?.assigned_by ?? cachedTask?.assignedBy ?? null,
});

invalidateResourceKeys(taskKeys);
await fetchTaskById(taskId, true);
```

- [ ] **Step 4: Run the sync manager suite to green**

Run:

```bash
PATH=/opt/homebrew/bin:$PATH npx jest src/__tests__/integration/syncManagers.test.tsx --runInBand
```

Expected:

```text
PASS src/__tests__/integration/syncManagers.test.tsx
```

- [ ] **Step 5: Commit the invalidation-alignment checkpoint**

```bash
git add src/utils/RealtimeSyncManager.tsx src/state/taskStore.supabase.ts src/__tests__/integration/syncManagers.test.tsx
git commit -m "fix(data): align realtime task invalidation keys"
```

## Task 3: Verify Refresh Entry And Manual Invalidation Authority

**Files:**
- Modify: `src/utils/DataRefreshManager.tsx`
- Modify: `src/utils/NetworkSyncManager.tsx`
- Modify: `src/api/__tests__/supabase.requestCoordinator.test.ts`
- Modify: `src/state/__tests__/taskStore.supabase.unit.test.ts`

- [ ] **Step 1: Add or update the smallest production code needed so refresh entry always forces task refresh on reconnect/foreground**

```ts
await Promise.allSettled([
  fetchProjects(true),
  authStore.user?.id ? fetchUserProjectAssignments(authStore.user.id, true) : Promise.resolve(),
  fetchTasks(true),
  fetchUsers(true),
]);
```

```ts
if (state.isConnected && !previousState.current) {
  triggerRefresh().catch((error) => {
    console.error('NetworkSyncManager reconnect refresh failed:', error);
  });
}
```

- [ ] **Step 2: Extend the task store authority test only if the reconnect/foreground changes require it**

```ts
it('keeps persisted taskQueryMeta advisory after manual invalidation clears the live envelope', () => {
  const resourceKey = buildResourceKey('tasks', 'all');

  useTaskStore.setState({
    taskQueryMeta: {
      [resourceKey]: createQueryMeta(resourceKey, {
        hasHydratedData: true,
        hasFetchedOnce: true,
        lastFetchedAt: 1_000,
        lastSuccessfulFetchAt: 1_000,
        staleAt: 61_000,
        expiresAt: 121_000,
      }),
    },
  });

  clearRequestCoordinator();
  invalidateResourceKeys([resourceKey]);

  expect(useTaskStore.getState().shouldRefreshTasksInBackground(resourceKey, ['task-123'])).toBe(false);
});
```

- [ ] **Step 3: Run the targeted authority suites**

Run:

```bash
PATH=/opt/homebrew/bin:$PATH npx jest src/api/__tests__/supabase.requestCoordinator.test.ts --runInBand
PATH=/opt/homebrew/bin:$PATH npx jest src/state/__tests__/taskStore.supabase.unit.test.ts --runInBand
```

Expected:

```text
PASS src/api/__tests__/supabase.requestCoordinator.test.ts
PASS src/state/__tests__/taskStore.supabase.unit.test.ts
```

- [ ] **Step 4: Run the M-DATA-01 focused gate**

Run:

```bash
PATH=/opt/homebrew/bin:$PATH npx jest src/__tests__/integration/syncManagers.test.tsx --runInBand
PATH=/opt/homebrew/bin:$PATH npx jest src/state/__tests__/taskStore.supabase.unit.test.ts --runInBand
PATH=/opt/homebrew/bin:$PATH npx jest src/api/__tests__/supabase.requestCoordinator.test.ts --runInBand
PATH=/opt/homebrew/bin:$PATH npx tsc --noEmit
```

Expected:

```text
PASS src/__tests__/integration/syncManagers.test.tsx
PASS src/state/__tests__/taskStore.supabase.unit.test.ts
PASS src/api/__tests__/supabase.requestCoordinator.test.ts
tsc exits with code 0
```

- [ ] **Step 5: Commit the milestone checkpoint**

```bash
git add src/utils/DataRefreshManager.tsx src/utils/NetworkSyncManager.tsx src/api/__tests__/supabase.requestCoordinator.test.ts src/state/__tests__/taskStore.supabase.unit.test.ts src/__tests__/integration/syncManagers.test.tsx src/utils/RealtimeSyncManager.tsx src/state/taskStore.supabase.ts
git commit -m "fix(data): close m-data-01 cache authority gaps"
```

## Task 4: Review, Diagnostics, And Handoff

**Files:**
- Verify: `src/utils/RealtimeSyncManager.tsx`
- Verify: `src/state/taskStore.supabase.ts`
- Verify: `src/utils/DataRefreshManager.tsx`
- Verify: `src/utils/NetworkSyncManager.tsx`
- Verify: `src/__tests__/integration/syncManagers.test.tsx`
- Verify: `src/state/__tests__/taskStore.supabase.unit.test.ts`
- Verify: `src/api/__tests__/supabase.requestCoordinator.test.ts`

- [ ] **Step 1: Run diagnostics on touched files and clear any easy issues**

Run diagnostics for:

```text
src/utils/RealtimeSyncManager.tsx
src/state/taskStore.supabase.ts
src/utils/DataRefreshManager.tsx
src/utils/NetworkSyncManager.tsx
src/__tests__/integration/syncManagers.test.tsx
src/state/__tests__/taskStore.supabase.unit.test.ts
src/api/__tests__/supabase.requestCoordinator.test.ts
```

Expected:

```text
No newly introduced diagnostics remain in touched files.
```

- [ ] **Step 2: Run a reviewer pass before advancing to the next milestone**

```text
Reviewer focus:
- stale persisted freshness leakage
- missed task key families on delete/update
- reconnect/foreground refresh regression risk
- request coordinator drift
```

- [ ] **Step 3: Inspect the worktree before closure**

Run:

```bash
git status --short
git diff -- src/utils/RealtimeSyncManager.tsx src/state/taskStore.supabase.ts src/utils/DataRefreshManager.tsx src/utils/NetworkSyncManager.tsx src/__tests__/integration/syncManagers.test.tsx src/state/__tests__/taskStore.supabase.unit.test.ts src/api/__tests__/supabase.requestCoordinator.test.ts docs/superpowers/plans/2026-06-30-m-data-01-cache-authority-sync-hardening.md
```

Expected:

```text
Only the approved M-DATA-01 files are changed.
```

- [ ] **Step 4: Record the closure summary**

```text
M-DATA-01 closed:
- live request envelopes remain the only freshness authority
- realtime delete/update invalidation reaches the same task key families as manual fetches
- reconnect/foreground/manual refresh behavior is locked by targeted regression tests
```

- [ ] **Step 5: Continue only if the repo is green and the next milestone is still unblocked**

```text
Next recommended milestone: WS-SEC / M-SEC-01
```

## Self-Review

**Spec coverage**
- cold-start authority and advisory `taskQueryMeta` protection are covered by Tasks 1 and 3
- invalidation family alignment is covered by Tasks 1 and 2
- foreground/reconnect/manual refresh behavior is covered by Tasks 1 and 3
- reviewer and verification gates are covered by Task 4

**Placeholder scan**
- no `TODO`, `TBD`, or unresolved “implement later” instructions remain
- every task includes exact files, commands, or concrete code targets

**Type consistency**
- the same task key families are used consistently across tests and implementation:
  - `tasks:all`
  - `task:<id>`
  - `tasks:project:<id>`
  - `tasks:user:<id>`
  - `tasks:assignedBy:<id>`
