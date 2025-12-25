# Current Data Structures Comparison

## Overview

Currently, task updates and status changes are tracked in **three separate data structures**:

1. **`task_updates`** table → `TaskUpdate` interface
2. **`task_status_history`** table → `TaskStatusChange` interface
3. **`task_edit_history`** table → `TaskEditHistory` interface

---

## Structure 1: Task Updates (`task_updates`)

### Database Schema
```sql
CREATE TABLE task_updates (
  id UUID PRIMARY KEY,
  task_id UUID REFERENCES tasks(id),
  user_id UUID REFERENCES users(id),
  description TEXT,
  photos TEXT[],
  completion_percentage INTEGER,
  status TEXT,
  timestamp TIMESTAMP
);
```

### TypeScript Interface
```typescript
export interface TaskUpdate {
  id: string;
  description: string;              // Update notes/description
  photos: string[];                  // Photo URLs
  completionPercentage: number;        // 0-100
  status: TaskStatus;                 // Current status
  timestamp: string;                   // When created
  userId: string;                     // Who created it
}
```

### What It Tracks
- ✅ Progress updates with photos
- ✅ Status changes (create, assign, accept, decline, cancel)
- ✅ Completion percentage changes
- ✅ User-submitted updates

### Where It's Used
- `task.updates: TaskUpdate[]` - Array on Task object
- TaskDetailScreen progress section
- Created via `addTaskUpdate()`
- All status change methods now create entries here

### Example Entry
```json
{
  "id": "abc-123",
  "taskId": "task-456",
  "userId": "user-789",
  "description": "Task accepted by John Doe",
  "photos": [],
  "completionPercentage": 0,
  "status": "in_progress",
  "timestamp": "2025-12-24T10:00:00Z"
}
```

---

## Structure 2: Task Status History (`task_status_history`)

### Database Schema
```sql
CREATE TABLE task_status_history (
  id UUID PRIMARY KEY,
  task_id UUID REFERENCES tasks(id),
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  changed_by UUID REFERENCES users(id),
  changed_at TIMESTAMP,
  reason TEXT,
  notes TEXT,
  created_at TIMESTAMP
);
```

### TypeScript Interface
```typescript
export interface TaskStatusChange {
  id: string;
  taskId: string;
  fromStatus: TaskStatus;             // Previous status
  toStatus: TaskStatus;                // New status
  changedBy: string;                   // User ID who changed it
  changedAt: string;                   // When changed
  reason?: string;                     // Optional reason
  notes?: string;                      // Optional notes
}
```

### What It Tracks
- ✅ All status transitions (from → to)
- ✅ Complete audit trail of status changes
- ✅ Who changed the status and when
- ✅ Reasons for status changes

### Where It's Used
- `task.statusHistory?: TaskStatusChange[]` - Optional array on Task object
- Created via database triggers or application code
- Referenced in status history UI (if implemented)
- Complete audit trail (kept forever)

### Example Entry
```json
{
  "id": "ghi-789",
  "taskId": "task-456",
  "fromStatus": "not_started",
  "toStatus": "in_progress",
  "changedBy": "user-789",
  "changedAt": "2025-12-24T10:00:00Z",
  "reason": "Task accepted",
  "notes": null
}
```

---

## Structure 3: Task Edit History (`task_edit_history`)

### Database Schema
```sql
CREATE TABLE task_edit_history (
  id UUID PRIMARY KEY,
  task_id UUID REFERENCES tasks(id),
  edited_by UUID REFERENCES users(id),
  edited_at TIMESTAMP,
  changes JSONB,                      -- Field-by-field changes
  edit_reason TEXT,
  notifications_sent BOOLEAN,
  notified_at TIMESTAMP,
  created_at TIMESTAMP
);
```

### TypeScript Interface
```typescript
export interface TaskEditHistory {
  id: string;
  taskId: string;
  editedBy: string;                   // User who made the edit
  editedAt: string;                    // When edited
  changes: Record<string, {            // What changed
    old: any;
    new: any;
  }>;
  editReason?: string;                 // Why edited
  notificationsSent: boolean;          // Were assignees notified?
  notifiedAt?: string;                 // When notified
  createdAt: string;
}
```

### What It Tracks
- ✅ Metadata changes (title, description, due date, priority)
- ✅ Field-by-field change tracking
- ✅ Edit reasons for accountability
- ✅ Notification status

### Where It's Used
- Loaded separately via `fetchTaskEditHistory()`
- TaskDetailScreen edit history section
- Created via `trackTaskEdit()`
- Only tracks edits after task acceptance

### Example Entry
```json
{
  "id": "def-456",
  "taskId": "task-456",
  "editedBy": "user-789",
  "editedAt": "2025-12-24T11:00:00Z",
  "changes": {
    "title": {
      "old": "Fix roof leak",
      "new": "Fix roof leak and gutter"
    },
    "dueDate": {
      "old": "2024-12-31",
      "new": "2025-01-15"
    }
  },
  "editReason": "Added gutter repair to scope",
  "notificationsSent": true,
  "notifiedAt": "2025-12-24T11:05:00Z",
  "createdAt": "2025-12-24T11:00:00Z"
}
```

---

## Side-by-Side Comparison

| Feature | `task_updates` | `task_status_history` | `task_edit_history` |
|---------|---------------|---------------------|-------------------|
| **Purpose** | Progress & status updates | Status transitions | Metadata edits |
| **Table Name** | `task_updates` | `task_status_history` | `task_edit_history` |
| **Interface** | `TaskUpdate` | `TaskStatusChange` | `TaskEditHistory` |
| **Stored In** | `task.updates[]` | `task.statusHistory[]` | Loaded separately |
| **Tracks** | Status changes, progress, photos | Status transitions (from→to) | Field changes, edit reasons |
| **Created By** | `addTaskUpdate()` | Database triggers/app code | `trackTaskEdit()` |
| **Displayed In** | Progress section | Status history (if shown) | Edit history section |
| **Has Photos** | ✅ Yes | ❌ No | ❌ No |
| **Has Status** | ✅ Yes (current) | ✅ Yes (from→to) | ❌ No |
| **Has Description** | ✅ Yes | ❌ No | ❌ No |
| **Has Changes** | ❌ No | ❌ No | ✅ Yes |
| **Has Notifications** | ❌ No | ❌ No | ✅ Yes |
| **Timeline** | All activities | All status changes | Only edits after acceptance |
| **Duplication** | Status changes logged here | Status changes ALSO logged here | No duplication |

---

## Current Problems

### 1. **Triple Duplication**
- Status changes logged in `task_updates` (with description)
- Status changes ALSO logged in `task_status_history` (with from/to)
- Metadata changes logged in `task_edit_history`
- **Same status change event exists in TWO places!**

### 2. **Incomplete Timeline**
- Can't see status changes alongside metadata edits
- Three separate data sources
- Hard to get complete chronological view
- Status changes split between two tables

### 3. **Inconsistent Structure**
- Different field names (`userId` vs `changedBy` vs `editedBy`)
- Different timestamp fields (`timestamp` vs `changedAt` vs `editedAt`)
- Different data structures
- Status info in different formats

### 4. **Complex Queries**
- Need to query three tables
- Need to merge results
- Need to sort chronologically
- Need to deduplicate status changes

### 5. **Maintenance Overhead**
- Three systems to maintain
- Three sets of code to update
- Three UI sections to keep in sync
- Duplicate status change logic

### 6. **Data Redundancy**
- Status changes stored in both `task_updates` and `task_status_history`
- Risk of data inconsistency
- Wasted storage space

---

## Example: What Gets Logged Where

### Scenario: Task Lifecycle

1. **Task Created** → `task_updates` + `task_status_history`
   - `task_updates`: `{ "description": "Task created by John", "status": "not_started" }`
   - `task_status_history`: `{ "fromStatus": null, "toStatus": "not_started" }`
   - **DUPLICATE!** Same event in two places

2. **Task Assigned** → `task_updates`
   - `task_updates`: `{ "description": "Task assigned to Sam by John", "status": "not_started" }`
   - No entry in `task_status_history` (assignment doesn't change status)

3. **Task Accepted** → `task_updates` + `task_status_history`
   - `task_updates`: `{ "description": "Task accepted by Sam", "status": "in_progress" }`
   - `task_status_history`: `{ "fromStatus": "not_started", "toStatus": "in_progress" }`
   - **DUPLICATE!** Same event in two places

4. **Task Edited (Title Changed)** → `task_edit_history`
   - `task_edit_history`: `{ "changes": { "title": { "old": "Fix roof", "new": "Fix roof and gutter" } } }`
   - No entry in other tables

5. **Progress Update** → `task_updates`
   - `task_updates`: `{ "description": "Made good progress", "photos": ["photo1.jpg"], "status": "in_progress", "completionPercentage": 50 }`
   - No entry in `task_status_history` (status didn't change)

**Problems:**
- Steps 1 & 3 are duplicated in two tables
- Steps 1-3 and 5 are in `task_updates`, step 4 is in `task_edit_history`
- No unified timeline across all three sources
- Status changes split between `task_updates` (with description) and `task_status_history` (with from/to)

---

## Summary: All Three Structures

### What Each Structure Tracks

| Structure | Tracks | Example Events |
|-----------|--------|----------------|
| `task_updates` | Progress updates, status changes (with description), photos | "Task created", "Task accepted", "Progress: 50%", "Added photos" |
| `task_status_history` | Status transitions (from→to), audit trail | `not_started` → `in_progress`, `in_progress` → `completed` |
| `task_edit_history` | Metadata field changes | Title changed, due date changed, priority changed |

### Overlap and Duplication

**Status Changes are DUPLICATED:**
- When a task status changes, it's logged in BOTH:
  1. `task_updates` - with description, photos, completion %
  2. `task_status_history` - with from/to status, reason

**Example of Duplication:**
```
Task Accepted Event:
├─ task_updates: { description: "Task accepted by Sam", status: "in_progress" }
└─ task_status_history: { fromStatus: "not_started", toStatus: "in_progress" }
```

**No Overlap:**
- `task_edit_history` tracks different things (metadata edits)
- But creates a third separate timeline

### Current Data Flow

```
Task Created
├─→ task_updates (description + status)
└─→ task_status_history (from→to status)

Task Assigned
└─→ task_updates (description only, no status change)

Task Accepted
├─→ task_updates (description + status)
└─→ task_status_history (from→to status)  ← DUPLICATE

Task Edited
└─→ task_edit_history (field changes)

Progress Update
└─→ task_updates (description + photos + completion %)
```

**Result:** Fragmented timeline across 3 tables, with duplication!

---

## Solution: See `PROGRESS_LOG_UNIFICATION_PLAN.md`

The plan proposes unifying all three structures into:
- ✅ Single `task_activities` table
- ✅ Unified `TaskActivity` interface
- ✅ All activities in chronological order
- ✅ Single UI section
- ✅ Type-safe activity types
- ✅ Flexible JSONB structure
- ✅ Eliminates duplication (status changes in one place)
- ✅ Combines status change data (from/to + description)

### Unified Data Flow (After Migration)

```
Task Created
└─→ task_activities (type: 'creation', data: { title, assignedTo, ... })

Task Assigned
└─→ task_activities (type: 'assignment', data: { assignedTo, assignedBy })

Task Accepted
└─→ task_activities (type: 'status_change', data: { fromStatus, toStatus, description })

Task Edited
└─→ task_activities (type: 'metadata_edit', data: { changes, editReason })

Progress Update
└─→ task_activities (type: 'progress_update', data: { description, photos, completionPercentage })
```

**Result:** Single unified timeline, no duplication, complete context!

