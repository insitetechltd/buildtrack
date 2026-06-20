# Task Delegation Strategy

## Overview

The task delegation feature was designed to track when tasks are passed from one user to another, maintaining a complete audit trail of delegation history. However, the implementation is **partially complete** - the data structure and UI are in place, but the actual delegation tracking logic when reassigning tasks is not yet implemented.

---

## 1. Data Structure

### Task Interface (`src/types/buildtrack.ts`)

```typescript
export interface Task {
  // ... other fields ...
  
  assignedBy: string;                    // Current assigner
  originalAssignedBy?: string;          // Original creator before any delegation
  assignedTo: string[];                 // Current assignees
  
  delegationHistory?: Array<{
    fromUserId: string;                  // User who delegated the task
    toUserId: string;                    // User who received the task
    reason?: string;                     // Optional reason for delegation
    timestamp: string;                    // When delegation occurred
  }>;
}
```

### Key Fields:
- **`originalAssignedBy`**: Preserves the original task creator, even after multiple delegations
- **`delegationHistory`**: Array of all delegation events in chronological order
- **`assignedBy`**: Current assigner (may change with delegation)
- **`assignedTo`**: Current assignees (may change with delegation)

---

## 2. UI Implementation

### TaskCard Component (`src/components/TaskCard.tsx`)

The `TaskCard` component displays a delegation banner when a task has delegation history:

```typescript
// Check if task is delegated
const isDelegated = task.delegationHistory && task.delegationHistory.length > 0;
const lastDelegation = isDelegated && task.delegationHistory 
  ? task.delegationHistory[task.delegationHistory.length - 1] 
  : null;
const delegatedFromUser = lastDelegation 
  ? getUserById(lastDelegation.fromUserId) 
  : null;
```

**Visual Display:**
- **Amber/Orange header banner** at the top of the task card
- Shows: "Delegated from [User Name]"
- Optionally displays the delegation reason if provided
- Only shown on top-level tasks (not sub-tasks)

**Code Location:** `src/components/TaskCard.tsx` (lines 327-351)

---

## 3. Current Implementation Status

### ✅ Implemented:

1. **Data Structure**: `delegationHistory` field exists in Task interface
2. **UI Display**: TaskCard shows delegation banner when history exists
3. **Initialization**: `delegationHistory` is initialized as empty array `[]` when tasks are created
4. **Original Creator Tracking**: `originalAssignedBy` field exists to preserve original creator

### ❌ Missing Implementation:

1. **Delegation Tracking on Reassignment**: When `handleReassignTask` is called in `TaskDetailScreen.tsx`, it does NOT:
   - Create a delegation history entry
   - Track who delegated to whom
   - Store the delegation reason
   - Update `originalAssignedBy` if this is the first delegation

2. **Database Integration**: No code exists to:
   - Read `delegation_history` from database (if it exists as a column)
   - Write `delegation_history` to database when delegating
   - Transform database `delegation_history` to `delegationHistory` in Task objects

3. **Delegation UI**: No UI exists to:
   - Prompt for delegation reason when reassigning
   - Show full delegation history (only shows last delegation)
   - Display delegation chain

---

## 4. Current Reassignment Flow

### `handleReassignTask` in `TaskDetailScreen.tsx` (lines 441-475)

```typescript
const handleReassignTask = async (selectedUserIds: string[]) => {
  // ... validation ...
  
  await updateTask(task.id, {
    assignedTo: selectedUserIds,        // Updates assignees
    status: "new" as TaskStatus,         // Resets status
    declinedReason: undefined,
    accepted: false,
    acceptedBy: null,
    acceptedAt: null,
  });
  
  // ❌ MISSING: No delegation history tracking
  // ❌ MISSING: No reason capture
  // ❌ MISSING: No originalAssignedBy update
}
```

**What happens:**
- Task assignees are updated
- Task status is reset to "new"
- Task appears as new for new assignees
- **BUT**: No delegation history is recorded

---

## 5. Intended Delegation Strategy (Based on Design)

### When a task is reassigned, the system should:

1. **Capture Delegation Event**:
   ```typescript
   const delegationEntry = {
     fromUserId: currentUser.id,           // User doing the reassignment
     toUserId: newAssigneeId,              // New assignee
     reason: delegationReason,             // Optional reason from UI
     timestamp: new Date().toISOString(),  // When it happened
   };
   ```

2. **Update Delegation History**:
   ```typescript
   const updatedHistory = [
     ...(task.delegationHistory || []),   // Preserve existing history
     delegationEntry                       // Add new delegation
   ];
   ```

3. **Preserve Original Creator**:
   ```typescript
   // On first delegation, set originalAssignedBy if not already set
   if (!task.originalAssignedBy) {
     task.originalAssignedBy = task.assignedBy;
   }
   ```

4. **Update Task**:
   ```typescript
   await updateTask(task.id, {
     assignedTo: selectedUserIds,
     assignedBy: currentUser.id,          // Update current assigner
     originalAssignedBy: task.originalAssignedBy || task.assignedBy,
     delegationHistory: updatedHistory,
     status: "new" as TaskStatus,
     // ... other fields ...
   });
   ```

---

## 6. Database Schema (Assumed)

Based on the code structure, the database likely has:

```sql
-- tasks table
CREATE TABLE tasks (
  id UUID PRIMARY KEY,
  assigned_by UUID REFERENCES users(id),
  original_assigned_by UUID REFERENCES users(id),  -- May or may not exist
  assigned_to UUID[],                               -- Array of user IDs
  delegation_history JSONB,                         -- Array of delegation objects
  -- ... other fields ...
);
```

**Note**: The actual database schema may differ. The `delegation_history` column may not exist yet, or it may be stored differently.

---

## 7. Files Involved

### Current Implementation:
- `src/types/buildtrack.ts` - Task interface with `delegationHistory`
- `src/components/TaskCard.tsx` - UI display of delegation banner
- `src/screens/TaskDetailScreen.tsx` - Reassignment handler (missing delegation logic)
- `src/state/taskStore.supabase.ts` - Task store (initializes empty `delegationHistory`)

### Documentation:
- `TASKCARD_VARIATIONS.md` - Documents the delegation banner UI

---

## 8. Recommended Implementation Steps

To complete the delegation feature:

1. **Add Delegation Reason UI**:
   - Modify `handleReassignTask` to prompt for optional delegation reason
   - Add text input or alert dialog for reason

2. **Implement Delegation Tracking**:
   - In `handleReassignTask`, create delegation history entry
   - Update `originalAssignedBy` on first delegation
   - Append to `delegationHistory` array

3. **Database Integration**:
   - Ensure `delegation_history` column exists in `tasks` table
   - Update `updateTask` in `taskStore.supabase.ts` to save `delegation_history`
   - Update task transformation to read `delegation_history` from database

4. **Enhanced UI**:
   - Show full delegation chain in task detail screen
   - Display delegation timeline/history
   - Show delegation reason in detail view

5. **Activity Logging**:
   - Consider adding delegation events to `task_activities` table
   - This would provide a unified audit trail alongside other activities

---

## 9. Example Delegation Flow

### Scenario: Manager → Worker → Another Worker

1. **Initial Creation**:
   - Manager creates task
   - `assignedBy`: Manager ID
   - `originalAssignedBy`: Manager ID
   - `assignedTo`: [Worker1 ID]
   - `delegationHistory`: []

2. **First Delegation (Manager → Worker1)**:
   - Manager reassigns to Worker1
   - `assignedBy`: Manager ID (unchanged)
   - `originalAssignedBy`: Manager ID (preserved)
   - `assignedTo`: [Worker1 ID]
   - `delegationHistory`: [
       { fromUserId: Manager ID, toUserId: Worker1 ID, reason: "...", timestamp: "..." }
     ]

3. **Second Delegation (Worker1 → Worker2)**:
   - Worker1 reassigns to Worker2
   - `assignedBy`: Worker1 ID (updated)
   - `originalAssignedBy`: Manager ID (preserved)
   - `assignedTo`: [Worker2 ID]
   - `delegationHistory`: [
       { fromUserId: Manager ID, toUserId: Worker1 ID, ... },
       { fromUserId: Worker1 ID, toUserId: Worker2 ID, ... }
     ]

---

## Summary

The delegation strategy was **designed but not fully implemented**. The infrastructure exists (data structure, UI display), but the actual delegation tracking logic when reassigning tasks is missing. To complete the feature, implement delegation history tracking in `handleReassignTask` and ensure database persistence.

