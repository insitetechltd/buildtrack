# Task Editing Permissions by Workflow Stage

This document outlines who can edit tasks at different points in the workflow based on the current codebase implementation.

## Task Workflow Stages

### 1. **Task Creation**
- **Status**: `currentStatus: "not_started"`
- **Accepted**: 
  - `accepted: true` if creator assigns task to themselves (auto-accepted)
  - `accepted: false` if creator assigns task to others (pending acceptance)

### 2. **Pending Acceptance** (assignee hasn't responded)
- **Status**: `currentStatus: "not_started"`
- **Accepted**: `accepted: false` (or `undefined`)
- **DeclineReason**: `undefined` or `null`

### 3. **Task Accepted**
- **Status**: `currentStatus: "in_progress"` (typically)
- **Accepted**: `accepted: true`
- **AcceptedBy**: User ID of assignee who accepted
- **AcceptedAt**: Timestamp

### 4. **Task Rejected**
- **Status**: `currentStatus: "rejected"`
- **Accepted**: `accepted: false`
- **DeclineReason**: Reason string provided by assignee

### 5. **Task in Progress**
- **Status**: `currentStatus: "in_progress"`
- **Accepted**: `accepted: true`
- **CompletionPercentage**: 0-100

### 6. **Task Completed & Review**
- **Status**: `currentStatus: "completed"`
- **Accepted**: `accepted: true`
- **ReadyForReview**: `true`
- **ReviewedBy/ReviewedAt**: Reviewer information
- **ReviewAccepted**: `true` or `false`

## Editing Permissions by Stage

### **Task Creator (Assigner) - `assignedBy === user.id`**

#### ✅ CAN EDIT when:
1. **Pending Acceptance** (Stage 2)
   - Task hasn't been accepted (`accepted !== true`)
   - Task hasn't been rejected (`declineReason` is undefined/null AND `currentStatus !== "rejected"`)

#### ❌ CANNOT EDIT when:
1. **Task Auto-Accepted** (if creator assigned to themselves)
   - When task is created with creator in `assignedTo` array, it's auto-accepted
   - Editing is allowed but changes are logged

#### ✅ CAN EDIT (with special handling):
1. **Task Already Accepted** (Stages 3, 5, 6)
   - `accepted === true`
   - Editing is allowed and changes are logged in edit history
   - Assignees are notified of changes

2. **Task Already Rejected** (Stage 4)
   - `declineReason` exists OR `currentStatus === "rejected"`
   - Editing is allowed - creator can fix issues and reassign
   - When editing a rejected task, the rejection state is automatically reset:
     - `declineReason` is cleared
     - `currentStatus` is reset to `"not_started"`
     - `accepted` is reset to `false`
     - `acceptedBy` and `acceptedAt` are cleared
     - Review fields are reset (readyForReview, reviewAccepted, etc.)
     - Completion percentage is reset to 0
   - Task becomes a fresh task ready for new assignees to accept/reject

### **Task Assignee - `user.id` is in `assignedTo` array**

#### ❌ CANNOT EDIT Task Details (always)
- Assignees **never** have permission to edit task details (title, description, due date, priority, etc.)
- They can only:
  - Accept/Reject the task
  - Update progress (`completionPercentage`)
  - Add progress updates (`addTaskUpdate`)
  - Submit for review when complete

#### ✅ CAN UPDATE Progress when:
- They are assigned to the task (`isAssignedToMe === true`)
- Task has been accepted (`accepted === true`)
- Logic: `canUpdateProgress = (isTaskCreator || isAssignedToMe) && task.accepted === true`

### **Other Users**
#### ❌ CANNOT EDIT (always)
- Error: "Only the task creator can edit this task."

## Code References

### Permission Check Location
**File**: `src/screens/CreateTaskScreen.tsx` (lines 91-139)

```typescript
// Check if user is the creator
if (editTask.assignedBy !== user.id) {
  // ❌ Not creator - deny edit
}

// Check if task has been accepted
if (editTask.accepted === true) {
  // ❌ Already accepted - deny edit
}

// Check if task has been rejected
if (editTask.declineReason || editTask.currentStatus === "rejected") {
  // ❌ Already rejected - deny edit
}

// ✅ Otherwise - allow edit
```

### Task Detail Screen Logic
**File**: `src/screens/TaskDetailScreen.tsx` (line 241)

```typescript
const canEditTask = isTaskCreator; // Always true for creator (UI check only)
// Actual editing still goes through CreateTaskScreen permission checks
```

### Task Creation Auto-Accept Logic
**File**: `src/state/taskStore.supabase.ts` (lines 655-658)

```typescript
// Auto-accept if creator is assigned to the task
accepted: isCreatorAssigned ? true : false,
accepted_by: isCreatorAssigned ? taskData.assignedBy : null,
accepted_at: isCreatorAssigned ? new Date().toISOString() : null,
```

## Summary Table

| User Role | Stage 1 (Created) | Stage 2 (Pending) | Stage 3 (Accepted) | Stage 4 (Rejected) | Stage 5-6 (In Progress/Complete) |
|-----------|-------------------|-------------------|-------------------|-------------------|----------------------------------|
| **Creator** | ✅ (if not self-assigned)<br>✅ (if self-assigned, auto-accepted) | ✅ **CAN EDIT** | ✅ **CAN EDIT** (logged) | ✅ **CAN EDIT** (resets rejection state) | ✅ **CAN EDIT** (logged) |
| **Assignee** | ❌ Cannot edit | ❌ Cannot edit | ❌ Cannot edit | ❌ Cannot edit | ❌ Cannot edit |
| **Others** | ❌ Cannot edit | ❌ Cannot edit | ❌ Cannot edit | ❌ Cannot edit | ❌ Cannot edit |

## Important Notes

1. **Self-Assigned Tasks**: If a creator assigns a task to themselves, it's immediately auto-accepted, so they cannot edit it after creation.

2. **Progress Updates vs. Task Editing**: 
   - **Editing task details** (title, description, due date, etc.) = Only creator, before acceptance/rejection
   - **Updating progress** (completion percentage, progress updates) = Creator or assignee, after acceptance

3. **Edit Permission is Enforced**: The permission check happens in `CreateTaskScreen` using a `useEffect` hook that blocks access if conditions aren't met, showing appropriate error alerts.

4. **UI vs. Logic**: The `canEditTask` variable in `TaskDetailScreen` is only for UI display (showing/hiding edit button). The actual permission enforcement happens in `CreateTaskScreen` when attempting to edit.

