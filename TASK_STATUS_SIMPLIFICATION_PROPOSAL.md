# Task Status Simplification Proposal

## Current System Analysis

### Current Status Fields
The current system uses multiple fields to track task state:
- `currentStatus`: `"not_started" | "in_progress" | "rejected" | "completed"`
- `accepted`: boolean (whether assignee accepted the task)
- `readyForReview`: boolean (whether task is ready for review at 100%)
- `reviewAccepted`: boolean (whether reviewer approved the completion)
- `declineReason`: string (reason for declining)
- `acceptedBy`: string (user ID who accepted)
- `acceptedAt`: string (timestamp)
- `reviewedBy`: string (user ID who reviewed)
- `reviewedAt`: string (timestamp)

### Current Issues
1. **Multiple fields** need to be checked to determine actual task state
2. **Status changes** are not systematically logged in the progress section
3. **Ambiguous states** - e.g., what does "rejected" mean? Declined by assignee or rejected by reviewer?
4. **Complex filtering logic** - dashboard needs to check multiple fields to categorize tasks

## Proposed Unified Status System

### New Status Type
Replace the multiple fields with a single `status` field that captures the entire workflow:

```typescript
export type TaskStatus = 
  | "new"                    // 1. Created by assigner, waiting for assignee response
  | "declined"               // 2a. Declined by assignee (goes back to assigner)
  | "accepted"               // 2b. Accepted by assignee (ready to start work)
  | "in_progress"            // 3. Work has started (after acceptance)
  | "submitted_for_review"    // 4. Completed and submitted for review (100% + readyForReview)
  | "approved"                // 5a. Review approved by assigner
  | "rejected"                // 5b. Review rejected by assigner (needs rework)
  | "cancelled";              // Optional: Task cancelled by creator
```

### Status Flow Diagram

```
1. NEW (created)
   ↓
2. ACCEPTED or DECLINED (by assignee)
   ↓
   ├─→ DECLINED → Back to assigner (can modify/reassign) → NEW
   │
   └─→ ACCEPTED → IN_PROGRESS (work starts)
                ↓
                4. SUBMITTED_FOR_REVIEW (100% complete)
                ↓
                5. APPROVED or REJECTED (by assigner/reviewer)
                   ↓
                   ├─→ APPROVED (done, work accepted)
                   └─→ REJECTED → Back to IN_PROGRESS (needs rework)
```

### Status Transition Rules

| From Status | To Status | Trigger | Who Can Do It |
|------------|-----------|---------|---------------|
| `new` | `accepted` | Assignee accepts task | Assignee |
| `new` | `declined` | Assignee declines task | Assignee (affects only that assignee) |
| `new` | `in_progress` | Self-assigned task auto-transitions | System (for self-assigned tasks only) |
| `declined` | `new` | Assigner modifies/reassigns | Assigner (creator) |
| `accepted` | `in_progress` | Assignee starts work | Assignee |
| `in_progress` | `submitted_for_review` | Assignee completes (100%) | Assignee |
| `submitted_for_review` | `approved` | Assigner approves completion | Assigner (creator) |
| `submitted_for_review` | `rejected` | Assigner rejects completion | Assigner (creator) |
| `rejected` | `in_progress` | Assignee starts rework | Assignee |
| Any | `cancelled` | Creator cancels task | Creator only |

**Special Rules:**
- **Self-assigned tasks**: Automatically transition from `new` → `in_progress` (skips `accepted` state)
- **Multiple assignees**: If one assignee declines, only that assignee's relationship is marked as `declined`. Other assignees can still accept. The task status remains `new` until at least one assignee accepts.
- **Status history**: All status changes are kept forever in `task_status_history` table for complete audit trail

### New Task Interface Fields

```typescript
export interface Task {
  // ... other fields ...
  
  // UNIFIED STATUS (replaces currentStatus, accepted, readyForReview, reviewAccepted)
  status: TaskStatus;
  completionPercentage: number; // 0-100
  
  // STATUS METADATA (for logging and history)
  statusHistory?: TaskStatusChange[]; // Array of all status changes
  declinedReason?: string; // Reason when status = "declined"
  rejectedReason?: string; // Reason when status = "rejected"
  
  // REMOVED FIELDS:
  // ❌ currentStatus: TaskStatus
  // ❌ accepted?: boolean
  // ❌ readyForReview?: boolean
  // ❌ reviewAccepted?: boolean
  // ❌ declineReason?: string (renamed to declinedReason)
  
  // KEPT FIELDS (for audit trail):
  // ✅ acceptedBy?: string (when status changes to "accepted")
  // ✅ acceptedAt?: string (when status changes to "accepted")
  // ✅ reviewedBy?: string (when status changes to "approved"/"rejected")
  // ✅ reviewedAt?: string (when status changes to "approved"/"rejected")
}
```

### Status Change Logging

```typescript
export interface TaskStatusChange {
  id: string;
  taskId: string;
  fromStatus: TaskStatus;
  toStatus: TaskStatus;
  changedBy: string; // User ID
  changedAt: string; // Timestamp
  reason?: string; // Optional reason (for declined/rejected)
  notes?: string; // Optional additional notes
}

// This would be stored in a separate table: task_status_history
// And also displayed in the TaskDetailScreen progress section
```

## Implementation Plan

### Phase 1: Type Definitions
1. Update `TaskStatus` type in `src/types/buildtrack.ts`
2. Add `TaskStatusChange` interface
3. Update `Task` interface to use new status field
4. Add migration helper functions to convert old status to new status

### Phase 2: Status Transition Logic
1. Create status transition validation functions
2. Update `acceptTask`, `declineTask`, `submitTaskForReview`, `acceptTaskCompletion`, `rejectTaskCompletion` methods
3. Ensure status changes are logged to `task_status_history` table

### Phase 3: UI Updates
1. Update TaskDetailScreen to show status history in progress section
2. Update status badges/indicators throughout the app
3. Update filtering logic in DashboardScreen, TasksScreen
4. Update status labels in translations

### Phase 4: Database Migration
1. Create migration script to convert existing tasks:
   - Map old status combinations to new unified status
   - Create `task_status_history` table
   - Populate initial status history from existing data

### Phase 5: Cleanup
1. Remove old status-related fields from database
2. Remove old status-related code
3. Update all references throughout codebase

## Status Mapping (Old → New)

### Mapping Logic
```typescript
function mapOldStatusToNew(task: OldTask): TaskStatus {
  // If cancelled
  if (task.cancelledAt) return "cancelled";
  
  // If review was rejected
  if (task.currentStatus === "rejected" && task.reviewAccepted === false) {
    return "rejected"; // Review rejected
  }
  
  // If review was accepted
  if (task.reviewAccepted === true && task.completionPercentage === 100) {
    return "approved";
  }
  
  // If submitted for review
  if (task.readyForReview === true && task.completionPercentage === 100) {
    return "submitted_for_review";
  }
  
  // If in progress
  if (task.currentStatus === "in_progress" || 
      (task.accepted === true && task.completionPercentage > 0 && task.completionPercentage < 100)) {
    return "in_progress";
  }
  
  // If accepted but not started
  if (task.accepted === true && task.completionPercentage === 0) {
    return "accepted";
  }
  
  // If declined
  if (task.declineReason || (task.currentStatus === "rejected" && !task.reviewAccepted)) {
    return "declined";
  }
  
  // Default: new task
  return "new";
}
```

## Benefits

1. **Single Source of Truth**: One field tells you exactly where the task is in the workflow
2. **Clearer Logic**: No need to check multiple boolean fields
3. **Better Logging**: All status changes can be tracked and displayed
4. **Easier Filtering**: Dashboard filtering becomes simpler
5. **Better UX**: Users see clear status progression in the progress section
6. **Audit Trail**: Complete history of status changes

## Terminology Clarification

- **Assignee Actions** (on new tasks):
  - ✅ **Accepted** - Assignee accepts the task
  - ❌ **Declined** - Assignee declines the task

- **Reviewer Actions** (on completed tasks):
  - ✅ **Approved** - Reviewer approves the completed work
  - ❌ **Rejected** - Reviewer rejects the completed work (needs rework)

## Decisions Made

1. **Self-assigned tasks**: ✅ Auto-transition from `new` → `in_progress` (skips `accepted` state)
2. **Multiple assignees**: ✅ Decline affects only the specific assignee (not all assignees)
3. **Status history retention**: ✅ Keep history forever (complete audit trail)
4. **Backward compatibility**: ❌ No need to support old status format - purge all old tasks during migration

## Migration Strategy

Since we're not maintaining backward compatibility, the migration will:
1. **Delete all existing tasks** from the database
2. Create new `task_status_history` table
3. Update all code to use the new unified status system
4. Users will start fresh with the new system

This is a clean break approach that ensures no legacy code or data remains.

