# Filter Logic Alignment - Complete ✅

## Summary
Aligned filtering logic between `DashboardScreen.tsx` and `TasksScreen.tsx` to ensure consistent task filtering and counting after the unified tasks schema migration.

## Changes Made

### 1. Added Helper Functions for Consistent Task Detection

**Both Screens Now Use:**
- `isTopLevelTask(task)` - Checks if task is top-level (handles null, undefined, empty string)
- `isNestedTask(task)` - Checks if task is nested (has a parent)

**DashboardScreen.tsx:**
```typescript
const isTopLevelTask = (task: Task) => {
  return !task.parentTaskId || task.parentTaskId === null || task.parentTaskId === '';
};

const isNestedTask = (task: Task) => {
  return !!task.parentTaskId && task.parentTaskId !== null && task.parentTaskId !== '';
};
```

**TasksScreen.tsx:**
- Added identical helper functions at the top of `getAllTasks()`
- Updated all filtering logic to use these helpers instead of direct `!task.parentTaskId` checks

### 2. Updated Nested Task Filtering

**DashboardScreen.tsx:**
- Updated `getNestedTasksAssignedBy()` to use `isNestedTask()` helper
- Updated `getNestedTasksAssignedTo()` to use `isNestedTask()` helper

**TasksScreen.tsx:**
- Updated all nested task filters to use `isNestedTask()` helper
- Ensures consistent detection of nested tasks

### 3. Fixed Reviewing Tasks Logic

**DashboardScreen.tsx:**
- Added comments clarifying that reviewing tasks include both top-level and nested tasks
- `inboxReviewingTasks` and `outboxReviewingTasks` now correctly filter from `projectFilteredTasks` (which includes all tasks)

**TasksScreen.tsx:**
- Already correctly handles reviewing tasks by returning all `projectTasks` for reviewing status
- No changes needed here

### 4. Consistent Status Filter Logic

All status filters now match between DashboardScreen counts and TasksScreen filters:

#### My Tasks Section
- ✅ **Rejected**: `task.currentStatus === "rejected"`
- ✅ **WIP**: `isAcceptedOrSelfAssigned && completionPercentage < 100 && !isOverdue && !rejected && !reviewAccepted`
- ✅ **Done**: `completionPercentage === 100 && reviewAccepted === true`
- ✅ **Overdue**: `completionPercentage < 100 && isOverdue && !rejected`

#### Inbox Section
- ✅ **Received**: `isNotAccepted(task) && !rejected` (explicit null/undefined/false check)
- ✅ **WIP**: `accepted && !isOverdue && !rejected && (<100% || (100% && !readyForReview)) && !reviewAccepted`
- ✅ **Done**: `completionPercentage === 100 && reviewAccepted === true`
- ✅ **Overdue**: `completionPercentage < 100 && isOverdue && !rejected`
- ✅ **Reviewing**: `assignedBy === user.id && 100% && readyForReview && !reviewAccepted`

#### Outbox Section
- ✅ **Assigned**: `isNotAccepted(task) && !rejected` (explicit null/undefined/false check)
- ✅ **WIP**: `accepted && !isOverdue && !rejected && (<100% || (100% && !readyForReview)) && !reviewAccepted`
- ✅ **Done**: `completionPercentage === 100 && reviewAccepted === true`
- ✅ **Overdue**: `completionPercentage < 100 && isOverdue && !rejected`
- ✅ **Reviewing**: `!createdByMe && assignedToMe && 100% && readyForReview && !reviewAccepted`

## Database Query Verification

### ✅ Unified Tasks Table
- All tasks (top-level and nested) are fetched from single `tasks` table
- `parent_task_id` column distinguishes nested tasks (NULL = top-level, UUID = nested)
- `taskStore.supabase.ts` correctly maps `parent_task_id` → `parentTaskId`
- Query: `from('tasks').select('*')` fetches ALL tasks including nested ones

### ✅ Schema Compatibility
- Top-level tasks: `parent_task_id IS NULL`
- Nested tasks: `parent_task_id IS NOT NULL`
- Both screens now correctly handle both types

## Impact

### Before
- DashboardScreen and TasksScreen used different logic for detecting top-level vs nested tasks
- Inconsistent handling of null/undefined/empty string values for `parentTaskId`
- Potential mismatches between dashboard counts and filtered task lists

### After
- ✅ Consistent helper functions ensure identical task detection logic
- ✅ Proper handling of edge cases (null, undefined, empty string)
- ✅ Dashboard counts now match TasksScreen filtered results
- ✅ All nested tasks are correctly included/excluded based on filter criteria

## Testing Recommendations

1. **Verify Dashboard Counts Match TasksScreen Lists:**
   - Click each dashboard button
   - Verify the count matches the number of tasks shown in TasksScreen

2. **Test Top-Level Tasks:**
   - Create a direct task assignment (no parent)
   - Verify it appears in correct inbox/outbox sections

3. **Test Nested Tasks:**
   - Create a subtask (with parentTaskId)
   - Verify it appears in correct sections alongside parent

4. **Test Edge Cases:**
   - Tasks with `parentTaskId: null`
   - Tasks with `parentTaskId: undefined`
   - Tasks with `parentTaskId: ""` (empty string)

## Files Modified

1. `src/screens/DashboardScreen.tsx`
   - Added `isNestedTask()` helper
   - Updated nested task filters to use helpers
   - Added clarifying comments for reviewing tasks

2. `src/screens/TasksScreen.tsx`
   - Added `isTopLevelTask()` and `isNestedTask()` helpers
   - Updated all filtering logic to use helpers
   - Ensured consistent logic with DashboardScreen

## Next Steps

- ✅ Filter logic alignment complete
- ✅ Helper functions implemented
- ✅ Status filters verified
- ✅ Database queries confirmed

All filtering logic is now consistent between DashboardScreen and TasksScreen! 🎉

