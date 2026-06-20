# How to Delete or Archive Tasks

This guide shows you how to use the delete and archive functions for tasks in the Insite App.

## Overview

The app provides three ways to remove tasks from active view:

1. **Archive** - For completed and approved tasks (both assigner and assignee can archive)
2. **Delete** - Soft delete that maintains audit trail (only assigner can delete)
3. **Cancel** - For task creators to cancel tasks before completion

---

## 1. Archive Task

### When to Use
- Task is completed and approved (`status === 'approved'`)
- You want to hide it from active views but keep it for records
- Both assigner and assignee can archive approved tasks

### How to Use in Code

```typescript
import { useTaskStore } from '../state/taskStore.supabase';
import { useAuthStore } from '../state/authStore';

// In your component
const archiveTask = useTaskStore(state => state.archiveTask);
const { user } = useAuthStore();

// Archive a task
try {
  await archiveTask(taskId, user.id);
  console.log('Task archived successfully');
} catch (error) {
  console.error('Failed to archive:', error.message);
}
```

### Implementation Details

**Location:** `src/state/taskStore.supabase.ts` (lines 1285-1378)

**What it does:**
- Sets `archived_at` timestamp in database
- Sets `archived_by` to the user ID
- Creates an activity log entry
- Updates local state
- Refreshes task list

**Requirements:**
- Task status must be `'approved'`
- User must be either the assigner or assignee
- Task must not already be archived

### UI Access
- **Swipe Right** on TaskDetailScreen (for approved tasks only)
- Currently accessible via gesture only

---

## 2. Delete Task (Soft Delete)

### When to Use
- You're the task assigner/creator
- You want to permanently hide the task from both you and assignee
- Task remains in database for audit purposes

### How to Use in Code

```typescript
import { useTaskStore } from '../state/taskStore.supabase';
import { useAuthStore } from '../state/authStore';

// In your component
const deleteTaskById = useTaskStore(state => state.deleteTaskById);
const { user } = useAuthStore();

// Delete a task
try {
  await deleteTaskById(taskId, user.id);
  console.log('Task deleted successfully');
} catch (error) {
  console.error('Failed to delete:', error.message);
}
```

### Implementation Details

**Location:** `src/state/taskStore.supabase.ts` (lines 1112-1195)

**What it does:**
- Sets `deleted_at` timestamp in database
- Sets `deleted_by` to the user ID
- Creates an activity log entry
- Updates local state
- Refreshes task list

**Requirements:**
- User must be the task assigner/creator (`task.assignedBy === userId`)
- Task must not already be deleted

### UI Access
- **Swipe Left** on TaskDetailScreen (for assigners only)
- Currently accessible via gesture only

---

## 3. Cancel Task

### When to Use
- You're the task creator
- Task hasn't been completed yet
- You want to cancel it before it's done

### How to Use in Code

```typescript
import { useTaskStore } from '../state/taskStore.supabase';
import { useAuthStore } from '../state/authStore';

// In your component
const cancelTask = useTaskStore(state => state.cancelTask);
const { user } = useAuthStore();

// Cancel a task
try {
  await cancelTask(taskId, user.id);
  console.log('Task cancelled successfully');
} catch (error) {
  console.error('Failed to cancel:', error.message);
}
```

### Implementation Details

**Location:** `src/state/taskStore.supabase.ts` (lines 1197-1283)

**What it does:**
- Sets `cancelled_at` timestamp in database
- Sets `cancelled_by` to the user ID
- Creates a cancellation activity log entry
- Removes task from active list

**Requirements:**
- User must be the task creator (`task.assignedBy === userId`)
- Task must not already be cancelled

### UI Access
- **FAB Button** in TaskDetailScreen (TaskDetailUtilityFAB component)
- Visible only to task creators

---

## Example: Complete Usage in a Component

```typescript
import React, { useCallback } from 'react';
import { Alert } from 'react-native';
import { useTaskStore } from '../state/taskStore.supabase';
import { useAuthStore } from '../state/authStore';

export default function MyTaskComponent({ taskId }: { taskId: string }) {
  const { user } = useAuthStore();
  const archiveTask = useTaskStore(state => state.archiveTask);
  const deleteTaskById = useTaskStore(state => state.deleteTaskById);
  const cancelTask = useTaskStore(state => state.cancelTask);
  const task = useTaskStore(state => state.tasks.find(t => t.id === taskId));

  // Archive handler
  const handleArchive = useCallback(async () => {
    if (!task || !user) return;
    
    if (task.status !== 'approved') {
      Alert.alert('Cannot Archive', 'Task must be approved first.');
      return;
    }

    Alert.alert(
      'Archive Task',
      'Are you sure you want to archive this task?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: async () => {
            try {
              await archiveTask(taskId, user.id);
              Alert.alert('Success', 'Task archived successfully.');
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  }, [task, user, taskId, archiveTask]);

  // Delete handler
  const handleDelete = useCallback(async () => {
    if (!task || !user) return;
    
    if (task.assignedBy !== user.id) {
      Alert.alert('Permission Denied', 'Only the task assigner can delete.');
      return;
    }

    Alert.alert(
      'Delete Task',
      'Are you sure? This will hide the task from everyone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTaskById(taskId, user.id);
              Alert.alert('Success', 'Task deleted successfully.');
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  }, [task, user, taskId, deleteTaskById]);

  // Cancel handler
  const handleCancel = useCallback(async () => {
    if (!task || !user) return;
    
    if (task.assignedBy !== user.id) {
      Alert.alert('Permission Denied', 'Only the task creator can cancel.');
      return;
    }

    Alert.alert(
      'Cancel Task',
      `Are you sure you want to cancel "${task.title}"?`,
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelTask(taskId, user.id);
              Alert.alert('Success', 'Task cancelled successfully.');
            } catch (error: any) {
              Alert.alert('Error', error.message);
            }
          },
        },
      ]
    );
  }, [task, user, taskId, cancelTask]);

  return (
    // Your component UI here
    // Add buttons that call handleArchive, handleDelete, or handleCancel
  );
}
```

---

## Database Schema

The following columns are added to the `tasks` table:

```sql
-- Archive columns
archived_at TIMESTAMPTZ  -- When task was archived (NULL if not archived)
archived_by UUID         -- User ID who archived the task

-- Delete columns
deleted_at TIMESTAMPTZ   -- When task was deleted (NULL if not deleted)
deleted_by UUID          -- User ID who deleted the task

-- Cancel columns (if not already present)
cancelled_at TIMESTAMPTZ -- When task was cancelled (NULL if not cancelled)
cancelled_by UUID        -- User ID who cancelled the task
```

See `ADD_TASK_ARCHIVE_MIGRATION.sql` for the full migration.

---

## Current UI Implementation

### TaskDetailScreen

**Archive:**
- Swipe right gesture (lines 438-460)
- Only works for approved tasks
- Available to both assigner and assignee

**Delete:**
- Swipe left gesture (lines 463-481)
- Only works for task assigner/creator

**Cancel:**
- FAB button via `TaskDetailUtilityFAB` component
- Only visible to task creator

---

## Filtering Archived/Deleted Tasks

When fetching tasks, you should filter out archived and deleted tasks:

```typescript
// In your task fetching logic
const activeTasks = tasks.filter(task => 
  !task.archivedAt && 
  !task.deletedAt && 
  !task.cancelledAt
);
```

The task store's `fetchTasks` method should handle this filtering automatically, but you may need to add explicit filters in your queries:

```typescript
// Example Supabase query
const { data } = await supabase
  .from('tasks')
  .select('*')
  .is('archived_at', null)  // Exclude archived
  .is('deleted_at', null)    // Exclude deleted
  .is('cancelled_at', null) // Exclude cancelled
  .eq('project_id', projectId);
```

---

## Summary

| Action | Who Can Do It | When | UI Access |
|--------|---------------|------|-----------|
| **Archive** | Assigner or Assignee | Task is approved | Swipe right |
| **Delete** | Assigner only | Anytime | Swipe left |
| **Cancel** | Creator only | Before completion | FAB button |

All three actions:
- Maintain audit trail in database
- Create activity log entries
- Update local state
- Refresh task list automatically




