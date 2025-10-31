# Sub-task Standalone Card Fix

## Problem
When an assigner created sub-tasks and assigned them to a new assignee (different from the parent task assignee), the system was showing the original parent task card with the "Sub-task" banner for the new assignee, but NOT showing the sub-task's own standalone task card.

## Root Cause
The issue was in the `groupedTasks` logic in `TasksScreen.tsx` (lines 795-843). The logic was grouping all sub-tasks under their parent tasks if the parent existed in the filtered task list, **regardless of whether the sub-task had different assignees**.

### Previous Logic:
```typescript
if (isSubTask && task.parentTaskId) {
  const parentExists = allTasks.some(t => t.id === task.parentTaskId);
  
  if (parentExists) {
    // Always group under parent if parent exists
    taskMap.get(task.parentTaskId)!.subtasks.push(task);
  } else {
    // Show standalone only if parent doesn't exist
    standaloneSubtasks.push(task);
  }
}
```

This meant that even if a sub-task was assigned to a different user, it would still be grouped under the parent task instead of appearing as a standalone card for that user.

## Solution
Updated the grouping logic to check if the sub-task has the **same assignees** as the parent task. If the assignees are different, the sub-task is shown as a standalone card.

### New Logic:
```typescript
if (isSubTask && task.parentTaskId) {
  const parentTask = allTasks.find(t => t.id === task.parentTaskId);
  const parentExists = !!parentTask;
  
  // Check if subtask has the SAME assignees as parent
  const hasSameAssignees = parentTask && 
    JSON.stringify(task.assignedTo.sort()) === JSON.stringify(parentTask.assignedTo.sort());
  
  if (parentExists && hasSameAssignees) {
    // Group under parent only if they have the same assignees
    taskMap.get(task.parentTaskId)!.subtasks.push(task);
  } else {
    // Show standalone if: parent not in list OR different assignees
    standaloneSubtasks.push(task);
  }
}
```

## Expected Behavior After Fix

### Scenario 1: Sub-task with same assignees as parent
- Sub-task is grouped under parent task
- Displayed as indented item under parent

### Scenario 2: Sub-task with different assignees than parent
- Sub-task appears as a standalone card for the new assignee
- Shows the "Sub-task" banner at the top of the card
- When clicked, opens the parent task detail view with the sub-task focused

### Scenario 3: Sub-task where parent is not in filtered list
- Sub-task appears as a standalone card
- Shows the "Sub-task" banner at the top of the card

## Files Modified
- `src/screens/TasksScreen.tsx` (lines 795-843)

## Testing Recommendations
1. Create a parent task assigned to User A
2. Create a sub-task under that parent and assign it to User B
3. Log in as User B
4. Verify the sub-task appears as a standalone card in User B's inbox/task list
5. Click the sub-task card and verify it opens the parent task detail with the sub-task focused
6. Log in as User A
7. Verify User A sees the parent task (may or may not see the sub-task depending on their filter)

## Accept/Reject Buttons for Sub-tasks

The accept/reject functionality for sub-tasks is **already fully implemented** and works correctly:

### How It Works:
1. When a sub-task is created (line 624 in `taskStore.ts`), the `accepted` field is set to `false`
2. When the assignee clicks the sub-task card, it navigates to the parent task detail screen with the sub-task focused
3. The `TaskDetailScreen` checks if the current user is assigned to the sub-task (line 169)
4. If `isAssignedToMe && task.accepted === false`, the accept/reject banner is displayed (line 575)
5. The buttons handle both regular tasks and sub-tasks:
   - **Accept button** (lines 593-595): Calls `acceptSubTask()` for sub-tasks
   - **Decline button** (lines 607-614): Calls `declineSubTask()` for sub-tasks

### What the Assignee Sees:
1. Sub-task appears as a standalone card in their task list (after the fix)
2. Card shows "Sub-task" banner at the top
3. When they click the card, TaskDetailScreen opens
4. At the top of the detail screen, they see the "Action Required" banner
5. Two buttons are displayed:
   - Green **"Accept"** button
   - Red **"Decline"** button
6. After accepting, they can update progress and add updates
7. After declining, the task status changes to "rejected" and the task creator is notified

### Implementation Details:
- Accept/reject logic is in `TaskDetailScreen.tsx` (lines 574-630)
- The accept handler is at lines 182-197
- The decline handler is at lines 199-220
- Sub-task accept/decline methods are in `taskStore.ts` (lines 781-796)

## Additional Notes
- The fix includes detailed console logging to help debug the grouping logic
- The logic uses `JSON.stringify` with `sort()` to compare assignee arrays
- This ensures that `[userId1, userId2]` is treated the same as `[userId2, userId1]`
- Accept/reject buttons are automatically shown when viewing a sub-task that hasn't been accepted yet

