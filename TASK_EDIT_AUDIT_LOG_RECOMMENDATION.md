# Task Edit Audit Log System - Recommendation

## Overview
Allow task creators to edit tasks after acceptance, with complete audit logging to ensure fairness and transparency for all parties.

## Current State
- ✅ Task updates (progress, photos) are logged via `TaskUpdate`
- ❌ Task metadata changes (title, description, due date, etc.) are NOT logged
- ❌ Editing blocked after task acceptance
- ❌ No change history visible to assignees

## Recommended Solution

### 1. Database Schema Changes

Create a new table `task_edit_history` to track metadata changes:

```sql
CREATE TABLE task_edit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  edited_by UUID NOT NULL REFERENCES users(id),
  edited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Changed fields (JSONB for flexibility)
  changes JSONB NOT NULL,
  -- Example structure:
  -- {
  --   "title": { "old": "Fix roof leak", "new": "Fix roof leak and gutter" },
  --   "dueDate": { "old": "2024-12-31", "new": "2025-01-15" },
  --   "priority": { "old": "medium", "new": "high" },
  --   "description": { "old": "...", "new": "..." }
  -- }
  
  -- Reason for edit (optional, but recommended for accountability)
  edit_reason TEXT,
  
  -- Notification status
  notifications_sent BOOLEAN DEFAULT FALSE,
  notified_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_task_edit_history_task_id ON task_edit_history(task_id);
CREATE INDEX idx_task_edit_history_edited_at ON task_edit_history(edited_at DESC);
```

### 2. TypeScript Interface

Add to `src/types/buildtrack.ts`:

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

// Add to Task interface
export interface Task {
  // ... existing fields ...
  editHistory?: TaskEditHistory[]; // Loaded separately or on-demand
}
```

### 3. Implementation Approach

#### A. Remove Editing Restriction

**File**: `src/screens/CreateTaskScreen.tsx`

Remove or modify the acceptance check:
```typescript
// REMOVE or COMMENT OUT:
// if (editTask.accepted === true) {
//   Alert.alert(...);
//   return;
// }

// KEEP rejection check (probably don't allow editing rejected tasks)
if (editTask.declineReason || editTask.currentStatus === "rejected") {
  // Still block editing rejected tasks
}
```

#### B. Create Change Tracking Function

**File**: `src/state/taskStore.supabase.ts`

Add new method to track changes:

```typescript
// In TaskStore interface
trackTaskEdit: (
  taskId: string, 
  userId: string, 
  oldTask: Task, 
  newTask: Partial<Task>,
  editReason?: string
) => Promise<void>;
```

Implementation:
```typescript
trackTaskEdit: async (taskId, userId, oldTask, newTask, editReason) => {
  if (!supabase) return;
  
  const changes: Record<string, { old: any; new: any }> = {};
  
  // Compare and track changes
  const fieldsToTrack = [
    'title', 'description', 'dueDate', 'priority', 
    'category', 'billingStatus', 'assignedTo', 'taskReference'
  ];
  
  fieldsToTrack.forEach(field => {
    const oldValue = (oldTask as any)[field];
    const newValue = (newTask as any)[field];
    
    // Handle arrays (assignedTo)
    if (Array.isArray(oldValue) && Array.isArray(newValue)) {
      const oldSorted = [...oldValue].sort().join(',');
      const newSorted = [...newValue].sort().join(',');
      if (oldSorted !== newSorted) {
        changes[field] = { old: oldValue, new: newValue };
      }
    } else if (oldValue !== newValue && newValue !== undefined) {
      changes[field] = { old: oldValue, new: newValue };
    }
  });
  
  // Only log if there are actual changes
  if (Object.keys(changes).length === 0) return;
  
  // Insert into database
  const { error } = await supabase
    .from('task_edit_history')
    .insert({
      task_id: taskId,
      edited_by: userId,
      changes: changes,
      edit_reason: editReason || null,
      notifications_sent: false,
    });
  
  if (error) {
    console.error('Error tracking task edit:', error);
    // Don't throw - edit should still succeed even if logging fails
  }
},
```

#### C. Modify updateTask to Track Changes

**File**: `src/state/taskStore.supabase.ts`

Modify `updateTask` method:
```typescript
updateTask: async (id, updates) => {
  // ... existing code ...
  
  // Get current task state BEFORE update
  const currentTask = get().tasks.find(t => t.id === id);
  if (!currentTask) {
    throw new Error('Task not found');
  }
  
  // Determine if this is an edit (not initial creation)
  const isEdit = currentTask.createdAt && currentTask.accepted;
  const editedBy = user?.id; // Get from auth store
  
  // Perform the update (existing logic)
  // ... update code ...
  
  // Track changes if this is an edit after acceptance
  if (isEdit && editedBy) {
    try {
      await get().trackTaskEdit(id, editedBy, currentTask, updates);
      
      // Send notifications to assignees
      await get().notifyTaskEdit(id, editedBy, updates);
    } catch (error) {
      console.error('Error tracking task edit:', error);
      // Continue - don't fail the update
    }
  }
  
  // ... rest of update logic ...
}
```

### 4. Notification System (For Fairness)

#### A. Create Notification Function

```typescript
// In TaskStore interface
notifyTaskEdit: (taskId: string, editedBy: string, changes: Partial<Task>) => Promise<void>;

// Implementation
notifyTaskEdit: async (taskId, editedBy, changes) => {
  if (!supabase) return;
  
  const task = get().tasks.find(t => t.id === taskId);
  if (!task) return;
  
  // Get assignees who should be notified
  const assignees = task.assignedTo.filter(id => id !== editedBy);
  
  if (assignees.length === 0) return;
  
  // Mark notification as sent in edit history
  // (You'd need to get the latest edit history entry)
  
  // Create notifications for each assignee
  // This could be:
  // 1. In-app notifications (separate notifications table)
  // 2. Push notifications
  // 3. Email notifications
  // 4. Mark task as "has unread changes" flag
  
  // For now, we can add a flag to task
  await get().updateTask(taskId, {
    hasUnreadChanges: true,
    lastEditedAt: new Date().toISOString(),
  });
},
```

#### B. Add Notification Fields to Task

```typescript
export interface Task {
  // ... existing fields ...
  hasUnreadChanges?: boolean; // Flag for assignees
  lastEditedAt?: string; // When was it last edited
}
```

### 5. UI/UX Implementation

#### A. Edit History View in TaskDetailScreen

**File**: `src/screens/TaskDetailScreen.tsx`

Add a section to show edit history:

```typescript
// Fetch edit history
const [editHistory, setEditHistory] = useState<TaskEditHistory[]>([]);
const [showEditHistory, setShowEditHistory] = useState(false);

useEffect(() => {
  if (task?.id) {
    fetchTaskEditHistory(task.id).then(setEditHistory);
  }
}, [task?.id]);

// Display component
{showEditHistory && (
  <View className="mt-4 bg-white rounded-lg p-4 border border-gray-200">
    <Text className="text-lg font-semibold mb-3">Edit History</Text>
    {editHistory.map((edit) => (
      <View key={edit.id} className="mb-4 pb-4 border-b border-gray-100">
        <View className="flex-row justify-between mb-2">
          <Text className="font-medium">
            Edited by {getUserById(edit.editedBy)?.name || 'Unknown'}
          </Text>
          <Text className="text-gray-500 text-sm">
            {formatDateTime(edit.editedAt)}
          </Text>
        </View>
        {edit.editReason && (
          <Text className="text-gray-600 mb-2">Reason: {edit.editReason}</Text>
        )}
        {Object.entries(edit.changes).map(([field, change]) => (
          <View key={field} className="mb-2">
            <Text className="font-medium capitalize">{field}:</Text>
            <Text className="text-red-600 line-through">
              {formatChangeValue(field, change.old)}
            </Text>
            <Text className="text-green-600">
              → {formatChangeValue(field, change.new)}
            </Text>
          </View>
        ))}
      </View>
    ))}
  </View>
)}
```

#### B. Edit Reason Prompt (Optional but Recommended)

When editing an accepted task, prompt for reason:

```typescript
const handleEditAcceptedTask = async () => {
  // If task is accepted, prompt for edit reason
  if (task.accepted) {
    Alert.prompt(
      t.taskDetail.editReasonTitle,
      t.taskDetail.editReasonPrompt,
      [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.common.continue,
          onPress: async (reason) => {
            await handleSubmit(reason);
          }
        }
      ],
      'plain-text'
    );
  } else {
    await handleSubmit();
  }
};
```

#### C. Visual Indicators

1. **Badge on Task Card**: Show indicator if task has been edited since assignee last viewed
2. **Change Highlight**: Highlight changed fields in edit history
3. **Recent Changes Banner**: Show banner if task was edited recently (e.g., last 24 hours)

### 6. Translation Keys

Add to `src/locales/en.ts` and `zh-TW.ts`:

```typescript
taskDetail: {
  // ... existing ...
  editHistory: "Edit History",
  editedBy: "Edited by",
  editReasonTitle: "Reason for Edit",
  editReasonPrompt: "Please provide a reason for editing this accepted task (optional)",
  recentChanges: "Recent Changes",
  taskWasEdited: "This task was edited by {editor} on {date}",
  viewEditHistory: "View Edit History",
  noEditHistory: "No edit history available",
  changesDetected: "Changes Detected",
}
```

### 7. Implementation Priority

**Phase 1: Core Functionality** (Minimum Viable)
1. ✅ Remove editing restriction for accepted tasks
2. ✅ Create `task_edit_history` table
3. ✅ Implement `trackTaskEdit` function
4. ✅ Integrate with `updateTask`
5. ✅ Basic edit history display in TaskDetailScreen

**Phase 2: User Experience**
1. ✅ Add edit reason prompt (optional but recommended)
2. ✅ Visual indicators for changed tasks
3. ✅ Better formatting of change history

**Phase 3: Advanced Features**
1. ✅ Notification system (in-app or push)
2. ✅ Email notifications for significant changes
3. ✅ Change comparison view (side-by-side)
4. ✅ Export edit history as report

### 8. Fairness Considerations

1. **Transparency**: All changes visible to assignees
2. **Accountability**: Track who made what changes and when
3. **Notification**: Assignees notified of changes (optional but recommended)
4. **Audit Trail**: Complete history stored permanently
5. **Reason Tracking**: Optional but encourages thoughtful edits

### 9. Edge Cases to Handle

1. **Bulk Edits**: If editing multiple fields at once, log as single entry
2. **Array Changes**: Properly compare arrays (assignedTo changes)
3. **Date Formatting**: Ensure consistent date format in history
4. **Deleted Fields**: Handle gracefully if field is removed
5. **Permission Changes**: Still only allow creator to edit (no change)

### 10. Testing Considerations

1. Test editing accepted tasks
2. Test change tracking accuracy
3. Test edit history display
4. Test notification delivery
5. Test concurrent edits (if applicable)
6. Test with multiple assignees

## Alternative: Simpler Approach (If full audit log is too complex)

If the full audit log system is too complex, a simpler alternative:

1. **Remove editing restriction** (allow editing accepted tasks)
2. **Add simple change flag**: `lastEditedAt` timestamp
3. **Add simple change log**: Single text field `lastEditSummary` (e.g., "Updated due date and priority on Dec 15")
4. **Display banner**: Show when task was last edited

This provides basic transparency but less detailed audit trail.

## Recommendation

**I recommend the full audit log approach** because:
- ✅ Complete transparency for all parties
- ✅ Legal/compliance requirements (if needed)
- ✅ Better accountability
- ✅ Historical record for disputes
- ✅ Professional standard for task management

The additional complexity is worth it for fairness and transparency in a multi-party workflow.




