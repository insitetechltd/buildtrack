# Progress Log Unification Plan

## Current State: Three Separate Data Structures

### 1. Task Updates (`task_updates` table / `TaskUpdate` interface)
**Purpose:** Tracks progress updates, photos, and status changes from user actions

**Database Table: `task_updates`**
```sql
- id: UUID (primary key)
- task_id: UUID (foreign key to tasks)
- user_id: UUID (foreign key to users)
- description: TEXT (update description/notes)
- photos: TEXT[] (array of photo URLs)
- completion_percentage: INTEGER (0-100)
- status: TEXT (current status at time of update)
- timestamp: TIMESTAMP (auto-generated)
```

**TypeScript Interface: `TaskUpdate`**
```typescript
export interface TaskUpdate {
  id: string;
  description: string;
  photos: string[];
  completionPercentage: number;
  status: TaskStatus;
  timestamp: string;
  userId: string;
}
```

**Used For:**
- Progress updates with photos
- Status change logging (create, assign, accept, decline, cancel, etc.)
- Display in progress log UI
- Completion percentage tracking

**Current Usage:**
- Stored in `task.updates: TaskUpdate[]`
- Displayed in TaskDetailScreen progress section
- Created via `addTaskUpdate()` method
- All status changes now create entries here

---

### 2. Task Status History (`task_status_history` table / `TaskStatusChange` interface)
**Purpose:** Tracks all status transitions for complete audit trail

**Database Table: `task_status_history`**
```sql
- id: UUID (primary key)
- task_id: UUID (foreign key to tasks)
- from_status: TEXT (previous status)
- to_status: TEXT (new status)
- changed_by: UUID (foreign key to users)
- changed_at: TIMESTAMP (when changed)
- reason: TEXT (optional reason for status change)
- notes: TEXT (optional additional notes)
- created_at: TIMESTAMP
```

**TypeScript Interface: `TaskStatusChange`**
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
```

**Used For:**
- Complete audit trail of all status transitions
- Tracking status change history
- Display in status history UI
- Compliance and accountability

**Current Usage:**
- Stored separately, loaded on-demand via `fetchTaskStatusHistory()` (if implemented)
- Referenced in `task.statusHistory?: TaskStatusChange[]`
- Created via database triggers or application code
- Tracks all status changes (kept forever)

---

### 3. Task Edit History (`task_edit_history` table / `TaskEditHistory` interface)
**Purpose:** Tracks metadata changes (title, description, due date, etc.) for audit trail

**Database Table: `task_edit_history`**
```sql
- id: UUID (primary key)
- task_id: UUID (foreign key to tasks)
- edited_by: UUID (foreign key to users)
- edited_at: TIMESTAMP
- changes: JSONB (field-by-field changes)
  Example: {
    "title": { "old": "Fix roof", "new": "Fix roof and gutter" },
    "dueDate": { "old": "2024-12-31", "new": "2025-01-15" }
  }
- edit_reason: TEXT (optional reason for edit)
- notifications_sent: BOOLEAN
- notified_at: TIMESTAMP
- created_at: TIMESTAMP
```

**TypeScript Interface: `TaskEditHistory`**
```typescript
export interface TaskEditHistory {
  id: string;
  taskId: string;
  editedBy: string;
  editedAt: string;
  changes: Record<string, { old: any; new: any }>;
  editReason?: string;
  notificationsSent: boolean;
  notifiedAt?: string;
  createdAt: string;
}
```

**Used For:**
- Tracking task metadata edits (title, description, due date, priority, etc.)
- Audit trail for accountability
- Notifying assignees of changes
- Display in edit history UI

**Current Usage:**
- Stored separately, loaded on-demand via `fetchTaskEditHistory()`
- Displayed in TaskDetailScreen edit history section
- Created via `trackTaskEdit()` method
- Only tracks edits after task acceptance

---

## Problems with Current Approach

1. **Triple Duplication:** 
   - Status changes logged in `task_updates` (with description)
   - Status changes ALSO logged in `task_status_history` (with from/to status)
   - Metadata changes logged in `task_edit_history`
   - Same event can be in multiple places!

2. **Inconsistent Display:** Three separate data sources showing different aspects of history
3. **Missing Context:** 
   - Status changes in `task_updates` don't show from/to status clearly
   - Status changes in `task_status_history` don't show description/photos
   - Edit history doesn't show status at time of edit
4. **Complex Queries:** Need to query three tables and merge results for complete timeline
5. **Maintenance Overhead:** Three separate systems to maintain and sync
6. **Data Redundancy:** Status changes stored in both `task_updates` and `task_status_history`

---

## Proposed Solution: Unified Activity Log

### New Unified Structure: `TaskActivity` / `task_activities` table

**Single table to track ALL task changes:**
- Progress updates (photos, completion %)
- Status changes (create, assign, accept, decline, etc.) - unified from both `task_updates` and `task_status_history`
- Metadata edits (title, description, due date, etc.)
- All with consistent structure and display

**Database Table: `task_activities`**
```sql
CREATE TABLE task_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  activity_type TEXT NOT NULL, -- 'progress_update', 'status_change', 'metadata_edit', 'assignment', etc.
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Activity-specific data (flexible JSONB)
  data JSONB NOT NULL,
  -- Structure varies by activity_type:
  -- 
  -- progress_update: {
  --   "description": "...",
  --   "photos": ["url1", "url2"],
  --   "completionPercentage": 75,
  --   "status": "in_progress"
  -- }
  --
  -- status_change: {
  --   "fromStatus": "not_started",
  --   "toStatus": "in_progress",
  --   "reason": "Task accepted by user",
  --   "description": "Task accepted by John Doe" (optional human-readable)
  -- }
  --
  -- metadata_edit: {
  --   "changes": {
  --     "title": { "old": "...", "new": "..." },
  --     "dueDate": { "old": "...", "new": "..." }
  --   },
  --   "editReason": "..."
  -- }
  --
  -- assignment: {
  --   "assignedTo": ["user1", "user2"],
  --   "assignedBy": "user3"
  -- }
  
  -- Common fields for all activities
  description TEXT, -- Human-readable description (for display)
  completion_percentage INTEGER, -- Snapshot at time of activity
  status TEXT, -- Snapshot at time of activity
  
  -- Notification tracking (for metadata edits)
  notifications_sent BOOLEAN DEFAULT FALSE,
  notified_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_task_activities_task_id ON task_activities(task_id);
CREATE INDEX idx_task_activities_timestamp ON task_activities(timestamp DESC);
CREATE INDEX idx_task_activities_type ON task_activities(activity_type);
CREATE INDEX idx_task_activities_user_id ON task_activities(user_id);
```

**TypeScript Interface: `TaskActivity`**
```typescript
export type ActivityType = 
  | 'progress_update'
  | 'status_change'
  | 'metadata_edit'
  | 'assignment'
  | 'creation'
  | 'cancellation'
  | 'review_submission'
  | 'review_acceptance'
  | 'review_rejection';

export interface TaskActivity {
  id: string;
  taskId: string;
  userId: string;
  activityType: ActivityType;
  timestamp: string;
  
  // Activity-specific data (type-safe based on activityType)
  data: 
    | ProgressUpdateData
    | StatusChangeData
    | MetadataEditData
    | AssignmentData
    | CreationData
    | CancellationData
    | ReviewSubmissionData
    | ReviewAcceptanceData
    | ReviewRejectionData;
  
  // Common fields
  description: string; // Human-readable description
  completionPercentage?: number; // Snapshot at time of activity
  status?: TaskStatus; // Snapshot at time of activity
  
  // Notification tracking
  notificationsSent?: boolean;
  notifiedAt?: string;
  
  createdAt: string;
}

// Type-specific data structures
interface ProgressUpdateData {
  description: string;
  photos: string[];
  completionPercentage: number;
  status: TaskStatus;
}

interface StatusChangeData {
  fromStatus: TaskStatus;
  toStatus: TaskStatus;
  reason?: string;
}

interface MetadataEditData {
  changes: Record<string, { old: any; new: any }>;
  editReason?: string;
}

interface AssignmentData {
  assignedTo: string[];
  assignedBy: string;
}

interface CreationData {
  title: string;
  assignedTo: string[];
  assignedBy: string;
}

interface CancellationData {
  reason?: string;
}

interface ReviewSubmissionData {
  completionPercentage: number;
}

interface ReviewAcceptanceData {
  reviewedBy: string;
}

interface ReviewRejectionData {
  reviewedBy: string;
  reason: string;
}
```

---

## Migration Plan

### Phase 1: Create New Unified Table (Non-Breaking)
1. ✅ Create `task_activities` table with schema above
2. ✅ Add indexes for performance
3. ✅ Set up RLS policies
4. ✅ Create TypeScript types/interfaces

### Phase 2: Dual-Write (Backward Compatible)
1. ✅ Update `addTaskUpdate()` to write to both `task_updates` AND `task_activities`
2. ✅ Update `trackTaskEdit()` to write to both `task_edit_history` AND `task_activities`
3. ✅ Update all status change methods to write to `task_activities`
4. ✅ Keep existing UI reading from old tables (no breaking changes)

### Phase 3: Data Migration
1. ✅ Migrate existing `task_updates` records to `task_activities`
   - Progress updates → `activity_type: 'progress_update'`
   - Status changes → `activity_type: 'status_change'` (extract from status field)

2. ✅ Migrate existing `task_status_history` records to `task_activities`
   ```sql
   INSERT INTO task_activities (task_id, user_id, activity_type, timestamp, data, description, status)
   SELECT 
     task_id,
     changed_by as user_id,
     'status_change' as activity_type,
     changed_at as timestamp,
     jsonb_build_object(
       'fromStatus', from_status,
       'toStatus', to_status,
       'reason', reason,
       'notes', notes
     ) as data,
     COALESCE(
       reason,
       'Status changed from ' || from_status || ' to ' || to_status
     ) as description,
     to_status as status
   FROM task_status_history;
   ```

3. ✅ Migrate existing `task_edit_history` records to `task_activities`
   ```sql
   INSERT INTO task_activities (task_id, user_id, activity_type, timestamp, data, description, completion_percentage, status)
   SELECT 
     task_id,
     user_id,
     'progress_update' as activity_type,
     timestamp,
     jsonb_build_object(
       'description', description,
       'photos', photos,
       'completionPercentage', completion_percentage,
       'status', status
     ) as data,
     description,
     completion_percentage,
     status
   FROM task_updates;
   ```

4. ✅ Deduplicate status changes
   - Some status changes may exist in both `task_updates` and `task_status_history`
   - Use timestamp and task_id to identify duplicates
   - Keep the most complete record (prefer one with description if available)
   ```sql
   INSERT INTO task_activities (task_id, user_id, activity_type, timestamp, data, description, notifications_sent, notified_at)
   SELECT 
     task_id,
     edited_by as user_id,
     'metadata_edit' as activity_type,
     edited_at as timestamp,
     jsonb_build_object(
       'changes', changes,
       'editReason', edit_reason
     ) as data,
     'Task metadata edited' as description,
     notifications_sent,
     notified_at
   FROM task_edit_history;
   ```

### Phase 4: Update Application Code
1. ✅ Create new `fetchTaskActivities()` method
2. ✅ Update TaskDetailScreen to use unified activity log
3. ✅ Update all status change methods to use `task_activities` only
4. ✅ Update `addTaskUpdate()` to use `task_activities` only
5. ✅ Update `trackTaskEdit()` to use `task_activities` only

### Phase 5: Remove Old Tables (After Verification)
1. ✅ Verify all data migrated correctly
2. ✅ Verify UI displays correctly
3. ✅ Remove dual-write code
4. ✅ Drop `task_updates` table (or keep for backup)
5. ✅ Drop `task_status_history` table (or keep for backup)
6. ✅ Drop `task_edit_history` table (or keep for backup)
7. ✅ Update Task interface to use `activities: TaskActivity[]` instead of `updates: TaskUpdate[]` and remove `statusHistory`

---

## Benefits of Unified Approach

1. **Single Source of Truth:** All task activity in one place
2. **Unified Timeline:** Chronological view of all changes
3. **Simpler Queries:** One table to query instead of two
4. **Better Context:** See status changes alongside metadata edits
5. **Easier Maintenance:** One system instead of two
6. **Type Safety:** TypeScript types ensure data consistency
7. **Flexible:** JSONB allows adding new activity types without schema changes
8. **Better UX:** Single, comprehensive activity log in UI

---

## UI Changes

### Current: Three Separate Data Sources
- **Progress Updates Section:** Shows `task.updates` (progress, photos, status)
- **Status History:** Shows `task.statusHistory` (status transitions) - if loaded
- **Edit History Section:** Shows `task.editHistory` (metadata changes)

### Proposed: Single Unified Activity Log
- **Activity Timeline Section:** Shows all activities chronologically
- Each activity shows:
  - Icon based on `activityType`
  - User name and timestamp
  - Activity-specific details
  - Expandable for full details

### Activity Type Icons
- `creation` → 🆕 "Task created"
- `assignment` → 👤 "Task assigned"
- `status_change` → 🔄 "Status changed"
- `progress_update` → 📊 "Progress updated"
- `metadata_edit` → ✏️ "Task edited"
- `review_submission` → 📤 "Submitted for review"
- `review_acceptance` → ✅ "Review accepted"
- `review_rejection` → ❌ "Review rejected"
- `cancellation` → 🚫 "Task cancelled"

---

## Implementation Checklist

- [ ] Phase 1: Create `task_activities` table
- [ ] Phase 2: Implement dual-write for all activity types
- [ ] Phase 3: Migrate existing data from all three tables
- [ ] Phase 3a: Migrate `task_updates`
- [ ] Phase 3b: Migrate `task_status_history`
- [ ] Phase 3c: Migrate `task_edit_history`
- [ ] Phase 3d: Deduplicate status changes
- [ ] Phase 4: Update application code to use unified table
- [ ] Phase 5: Update UI to show unified activity log
- [ ] Phase 6: Remove old tables (after verification period)
- [ ] Phase 7: Update documentation

---

## Rollback Plan

If issues arise:
1. Keep old tables intact during migration
2. Dual-write ensures no data loss
3. Can revert UI to read from old tables
4. Can drop new table if needed
5. No breaking changes until Phase 5

---

## Estimated Timeline

- **Phase 1:** 1-2 hours (table creation, types)
- **Phase 2:** 2-3 hours (dual-write implementation)
- **Phase 3:** 2-3 hours (data migration from 3 tables + deduplication)
- **Phase 4:** 3-4 hours (code updates)
- **Phase 5:** 2-3 hours (UI updates)
- **Phase 6:** 1 hour (cleanup, after verification)
- **Total:** ~11-16 hours

---

## Notes

- Keep old tables for at least 1-2 weeks after migration for verification
- Consider keeping old tables as read-only backup
- **Important:** `task_status_history` may have more complete status change data than `task_updates` - prioritize it during migration
- Add monitoring to track activity creation rates
- Consider adding activity filtering/search in UI
- May want to add pagination for tasks with many activities

