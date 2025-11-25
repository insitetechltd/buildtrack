# Task Rejection Workflow

## What Happens When Creator Rejects a Task

When a task creator rejects a task that has been submitted for review by the assignee, the following occurs:

### Database Changes

The `rejectTaskCompletion` function updates the task with:

1. **`readyForReview: false`** - Removes the task from "ready for review" status
2. **`reviewAccepted: false`** - Marks the review as rejected
3. **`currentStatus: "rejected"`** - Sets the task status to "rejected"
4. **`declineReason: reason`** - Stores the rejection reason provided by the creator
5. **`reviewedBy: userId`** - Records the creator's ID who rejected it
6. **`reviewedAt: timestamp`** - Records when the rejection occurred
7. **`completionPercentage: 100`** - **Stays at 100%** (comment: "Keep completion at 100% - they submitted it, just needs rework")

### UI Behavior

#### For the Creator (Task Assigner):
- **Shows in "My Tasks"** with status "rejected"
- **Rejection Banner** appears on the task detail screen with:
  - Red banner showing "Task Rejected"
  - The rejection reason
  - A "Reassign to Another User" button
- **Can reassign** the task to another user via the reassign modal

#### For the Assignee:
- **Task is filtered out** from most views because `currentStatus === "rejected"` is excluded from:
  - "Received" (new requests)
  - "WIP" (work in progress)
  - "Done" (completed tasks)
  - "Overdue" tasks
- **Task may not be visible** in normal task lists
- **No automatic notification** that the task was rejected

### UI Behavior (Updated)

#### For the Creator (Task Assigner):
- **Shows in "Team Proceeding" (Outbox WIP)** with rejection indicator
- **Rejection Banner** appears on the task detail screen with:
  - Red banner showing "Task Rejected"
  - The rejection reason
  - A "Reassign to Another User" button
- **Can reassign** the task to another user via the reassign modal
- **Rejected tasks appear at the top** of the "Team Proceeding" list

#### For the Assignee:
- **Shows in "Current Tasks" (WIP)** with rejection indicator
- **Rejection indicator** appears on the task card showing:
  - Red banner with "Rejected - Needs Rework"
  - The rejection reason (if provided)
- **Rejected tasks appear at the top** of the "Current Tasks" list
- **Task is visible** in normal task lists for rework

### Implementation Details

1. **Filtering Logic Updated:**
   - Outbox WIP filter now includes rejected tasks
   - Inbox/My Tasks WIP filter now includes rejected tasks
   - Rejected tasks are included in "Team Proceeding" and "Current Tasks" sections

2. **Sorting Logic Updated:**
   - Rejected tasks are sorted to the top of all task lists
   - After rejected tasks, sorting follows: priority (high to low) → due date (earliest first)

3. **Visual Indicators:**
   - TaskCard component shows a red rejection banner at the top
   - Banner displays "Rejected - Needs Rework" and the decline reason
   - Consistent styling across light and dark modes

### Code Location

- **Rejection function**: `src/state/taskStore.supabase.ts` - `rejectTaskCompletion` (line 1038)
- **UI handler**: `src/screens/TaskDetailScreen.tsx` - `handleRejectTask` (line 386)
- **Filtering logic**: `src/screens/TasksScreen.tsx` - Multiple filters exclude `currentStatus === "rejected"`

