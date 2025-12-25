# Code Migration Status: Task Activities Unification

## ❌ Current Status: OLD TABLES STILL IN USE

The codebase **still uses the old tables**. The migration SQL has been created, but the application code has **NOT been updated** to use `task_activities` yet.

## Old Tables Still Being Used

### 1. `task_updates` - **13 references in code**

**Files using `task_updates`:**
- `src/state/taskStore.supabase.ts` - 6 references
  - Line 112: `fetchTasks()` - Reading all task updates
  - Line 305: `fetchTaskById()` - Reading updates for a task
  - Line 397: `fetchTasksByProject()` - Reading updates
  - Line 527: `fetchTasksByUser()` - Reading updates
  - Line 1419: `addSubTaskUpdate()` - Inserting subtask updates
  - Line 1579: `addSubTaskUpdate()` - Inserting subtask updates
- `src/state/taskStore.ts` - 2 references
  - Line 510: `addTaskUpdate()` - Inserting updates
  - Line 558: `addSubTaskUpdate()` - Inserting subtask updates
- `src/utils/databaseUtils.ts` - 1 reference
  - Line 128: Cleanup utility

**Methods that write to `task_updates`:**
- `addTaskUpdate()` - Creates progress updates
- `addSubTaskUpdate()` - Creates subtask updates
- All status change methods (create, assign, accept, decline, cancel, etc.) call `addTaskUpdate()`

**Methods that read from `task_updates`:**
- `fetchTasks()` - Loads all tasks with their updates
- `fetchTaskById()` - Loads a single task with updates
- `fetchTasksByProject()` - Loads tasks for a project with updates
- `fetchTasksByUser()` - Loads tasks for a user with updates

---

### 2. `task_edit_history` - **4 references in code**

**Files using `task_edit_history`:**
- `src/state/taskStore.supabase.ts` - 4 references
  - Line 2285: `trackTaskEdit()` - Inserting edit history
  - Line 2314: `fetchTaskEditHistory()` - Reading edit history
  - Line 2366: `fetchTaskEditHistory()` - Reading edit history
  - Line 2375: `fetchTaskEditHistory()` - Reading edit history

**Methods that write to `task_edit_history`:**
- `trackTaskEdit()` - Tracks metadata changes after task acceptance

**Methods that read from `task_edit_history`:**
- `fetchTaskEditHistory()` - Loads edit history for a task

---

### 3. `task_status_history` - **0 references in code**

**Status:** Not directly used in application code. Only referenced in:
- Migration SQL files
- Documentation
- Database triggers (if any)

---

## New Table: `task_activities` - **0 references in code**

**Status:** The table exists (after running migration SQL), but:
- ❌ No code reads from it
- ❌ No code writes to it
- ✅ TypeScript types exist (`TaskActivity` interface)
- ✅ Migration SQL created

---

## What Needs to Be Updated

### Phase 1: Update Write Operations ✅ (Partially Done - Types Created)

**Still need to update:**
1. `addTaskUpdate()` - Change from `task_updates` to `task_activities`
2. `addSubTaskUpdate()` - Change from `task_updates` to `task_activities`
3. `trackTaskEdit()` - Change from `task_edit_history` to `task_activities`
4. All status change methods - Already call `addTaskUpdate()`, but need to update the underlying implementation

### Phase 2: Update Read Operations ❌ (Not Done)

**Need to update:**
1. `fetchTasks()` - Read from `task_activities` instead of `task_updates`
2. `fetchTaskById()` - Read from `task_activities` instead of `task_updates`
3. `fetchTasksByProject()` - Read from `task_activities` instead of `task_updates`
4. `fetchTasksByUser()` - Read from `task_activities` instead of `task_updates`
5. `fetchTaskEditHistory()` - Read from `task_activities` instead of `task_edit_history`

### Phase 3: Update UI ❌ (Not Done)

**Need to update:**
1. `TaskDetailScreen.tsx` - Display `task.activities` instead of `task.updates`
2. Remove `editHistory` state and use `activities` instead
3. Filter activities by type for different UI sections

### Phase 4: Update Types ❌ (Partially Done)

**Need to update:**
1. Task interface - Use `activities: TaskActivity[]` instead of `updates: TaskUpdate[]`
2. Remove or deprecate `statusHistory` and `editHistory` fields
3. Update all code that references `task.updates` to use `task.activities`

---

## Summary

| Component | Status | Notes |
|-----------|--------|-------|
| Migration SQL | ✅ Done | Table created, data migration ready |
| TypeScript Types | ✅ Done | `TaskActivity` interface created |
| Write Operations | ❌ Not Done | Still writing to old tables |
| Read Operations | ❌ Not Done | Still reading from old tables |
| UI Updates | ❌ Not Done | Still displaying old data structures |
| Type Updates | ⚠️ Partial | Types exist but not integrated |

---

## Action Required

**The code still uses the old tables!** You need to:

1. ✅ Run the migration SQL (creates `task_activities` table and migrates data)
2. ❌ Update all write operations to use `task_activities`
3. ❌ Update all read operations to use `task_activities`
4. ❌ Update UI to display `task.activities`
5. ❌ Update Task interface to use `activities` instead of `updates`

**Current state:** Migration SQL is ready, but application code still uses old tables.



