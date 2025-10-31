# Task Store Migration Changes

## Summary of Changes for Unified Tasks Table

After running the database migration, the `taskStore.supabase.ts` file needs these updates:

### 1. Import Changes
```typescript
// BEFORE
import { Task, SubTask, TaskUpdate, ... } from "../types/buildtrack";

// AFTER  
import { Task, TaskUpdate, ... } from "../types/buildtrack";
// SubTask is now just an alias for Task, no separate import needed
```

### 2. Remove Sub-Tasks Table Queries

**BEFORE:**
```typescript
// Fetch all subtasks
const { data: subTasksData, error: subTasksError } = await supabase
  .from('sub_tasks')  // ❌ This table no longer exists!
  .select('*');
```

**AFTER:**
```typescript
// All tasks are in the unified 'tasks' table now
const { data: tasksData, error: tasksError } = await supabase
  .from('tasks')
  .select('*')
  .order('created_at', { ascending: false});
```

### 3. Update createSubTask Method

**BEFORE:**
```typescript
createSubTask: async (taskId, subTask) => {
  const { data, error } = await supabase
    .from('sub_tasks')  // ❌ Old table
    .insert({
      ...subTask,
      parent_task_id: taskId,
      // ...
    });
}
```

**AFTER:**
```typescript
createSubTask: async (taskId, subTask) => {
  // Get parent task to calculate nesting level
  const parentTask = get().tasks.find(t => t.id === taskId);
  const nestingLevel = (parentTask?.nestingLevel || 0) + 1;
  const rootTaskId = parentTask?.rootTaskId || parentTask?.id || taskId;
  
  const { data, error } = await supabase
    .from('tasks')  // ✅ Unified table
    .insert({
      ...subTask,
      parent_task_id: taskId,
      nesting_level: nestingLevel,
      root_task_id: rootTaskId,
      current_status: 'not_started',
      completion_percentage: 0,
    })
    .select()
    .single();
    
  if (error) throw error;
  
  // Add to local state
  set(state => ({
    tasks: [...state.tasks, convertToTask(data)]
  }));
  
  return data.id;
}
```

### 4. Update createNestedSubTask Method

**BEFORE:**
```typescript
createNestedSubTask: async (taskId, parentSubTaskId, subTask) => {
  const { data, error } = await supabase
    .from('sub_tasks')  // ❌ Old table
    .insert({
      ...subTask,
      parent_sub_task_id: parentSubTaskId,  // ❌ This column no longer exists
      // ...
    });
}
```

**AFTER:**
```typescript
createNestedSubTask: async (taskId, parentSubTaskId, subTask) => {
  // Get parent subtask to calculate nesting level
  const parentSubTask = get().tasks.find(t => t.id === parentSubTaskId);
  if (!parentSubTask) throw new Error('Parent subtask not found');
  
  const nestingLevel = (parentSubTask.nestingLevel || 0) + 1;
  const rootTaskId = parentSubTask.rootTaskId || parentSubTask.id;
  
  const { data, error } = await supabase
    .from('tasks')  // ✅ Unified table
    .insert({
      ...subTask,
      parent_task_id: parentSubTaskId,  // ✅ Now references tasks table
      nesting_level: nestingLevel,
      root_task_id: rootTaskId,
      current_status: 'not_started',
      completion_percentage: 0,
    })
    .select()
    .single();
    
  if (error) throw error;
  
  // Add to local state
  set(state => ({
    tasks: [...state.tasks, convertToTask(data)]
  }));
  
  return data.id;
}
```

### 5. Update SubTask Methods to Use Tasks Table

All methods that previously queried `sub_tasks` table now query `tasks` table:

```typescript
// Update subtask
updateSubTask: async (taskId, subTaskId, updates) => {
  const { error } = await supabase
    .from('tasks')  // ✅ Changed from 'sub_tasks'
    .update(convertTaskToDb(updates))
    .eq('id', subTaskId);
    
  // Update local state
  set(state => ({
    tasks: state.tasks.map(t => 
      t.id === subTaskId ? { ...t, ...updates } : t
    )
  }));
}

// Delete subtask
deleteSubTask: async (taskId, subTaskId) => {
  const { error } = await supabase
    .from('tasks')  // ✅ Changed from 'sub_tasks'
    .delete()
    .eq('id', subTaskId);
    
  // Update local state
  set(state => ({
    tasks: state.tasks.filter(t => t.id !== subTaskId)
  }));
}
```

### 6. Update Task Updates

**BEFORE:**
```typescript
addSubTaskUpdate: async (taskId, subTaskId, update) => {
  const { data, error } = await supabase
    .from('task_updates')
    .insert({
      task_id: taskId,      // ❌ Wrong
      sub_task_id: subTaskId,  // ❌ This column was dropped
      // ...
    });
}
```

**AFTER:**
```typescript
addSubTaskUpdate: async (taskId, subTaskId, update) => {
  const { data, error } = await supabase
    .from('task_updates')
    .insert({
      task_id: subTaskId,  // ✅ Just use the task_id (subtasks are tasks now)
      user_id: update.userId,
      description: update.description,
      photos: update.photos || [],
      completion_percentage: update.completionPercentage,
      status: update.status,
    })
    .select()
    .single();
}
```

### 7. Add Helper Functions

Add these helper functions to build task trees and filter tasks:

```typescript
// Get top-level tasks
getTopLevelTasks: (projectId?: string) => {
  const tasks = get().tasks;
  return tasks.filter(t => 
    !t.parentTaskId && 
    (projectId ? t.projectId === projectId : true)
  );
}

// Get children of a task
getChildTasks: (parentTaskId: string) => {
  return get().tasks.filter(t => t.parentTaskId === parentTaskId);
}

// Build task tree (hierarchical structure)
buildTaskTree: (tasks: Task[]): Task[] => {
  const taskMap = new Map<string, Task & { children: Task[] }>();
  
  // Create map with all tasks
  tasks.forEach(task => {
    taskMap.set(task.id, { ...task, children: [] });
  });
  
  const rootTasks: Task[] = [];
  
  // Build hierarchy
  tasks.forEach(task => {
    const taskWithChildren = taskMap.get(task.id)!;
    
    if (!task.parentTaskId) {
      // Top-level task
      rootTasks.push(taskWithChildren);
    } else {
      // Child task - add to parent's children
      const parent = taskMap.get(task.parentTaskId);
      if (parent) {
        parent.children.push(taskWithChildren);
      } else {
        // Orphaned task - add to root
        rootTasks.push(taskWithChildren);
      }
    }
  });
  
  return rootTasks;
}

// Get all descendants of a task
getTaskDescendants: (taskId: string): Task[] => {
  const descendants: Task[] = [];
  const allTasks = get().tasks;
  
  function collectChildren(parentId: string) {
    const children = allTasks.filter(t => t.parentTaskId === parentId);
    children.forEach(child => {
      descendants.push(child);
      collectChildren(child.id); // Recurse
    });
  }
  
  collectChildren(taskId);
  return descendants;
}

// Get task path (breadcrumb)
getTaskPath: (taskId: string): Task[] => {
  const allTasks = get().tasks;
  const path: Task[] = [];
  let currentTask = allTasks.find(t => t.id === taskId);
  
  while (currentTask) {
    path.unshift(currentTask);
    if (!currentTask.parentTaskId) break;
    currentTask = allTasks.find(t => t.id === currentTask!.parentTaskId!);
  }
  
  return path;
}
```

### 8. Update Database Field Mapping

```typescript
// Helper to convert DB format to Task format
function convertToTask(dbTask: any): Task {
  return {
    id: dbTask.id,
    projectId: dbTask.project_id,
    parentTaskId: dbTask.parent_task_id,  // ✅ NEW
    nestingLevel: dbTask.nesting_level,   // ✅ NEW
    rootTaskId: dbTask.root_task_id,      // ✅ NEW
    title: dbTask.title,
    description: dbTask.description,
    priority: dbTask.priority,
    category: dbTask.category,
    dueDate: dbTask.due_date,
    currentStatus: dbTask.current_status,
    completionPercentage: dbTask.completion_percentage,
    assignedTo: dbTask.assigned_to || [],
    assignedBy: dbTask.assigned_by,
    location: dbTask.location,
    attachments: dbTask.attachments || [],
    accepted: dbTask.accepted || false,
    declineReason: dbTask.decline_reason,
    readyForReview: dbTask.ready_for_review,
    reviewAccepted: dbTask.review_accepted,
    reviewedBy: dbTask.reviewed_by,
    reviewedAt: dbTask.reviewed_at,
    starredByUsers: dbTask.starred_by_users || [],
    createdAt: dbTask.created_at,
    updates: [], // Loaded separately
  };
}

// Helper to convert Task to DB format
function convertTaskToDb(task: Partial<Task>): any {
  return {
    ...(task.projectId && { project_id: task.projectId }),
    ...(task.parentTaskId !== undefined && { parent_task_id: task.parentTaskId }),  // ✅ NEW
    ...(task.nestingLevel !== undefined && { nesting_level: task.nestingLevel }),   // ✅ NEW
    ...(task.rootTaskId !== undefined && { root_task_id: task.rootTaskId }),        // ✅ NEW
    ...(task.title && { title: task.title }),
    ...(task.description && { description: task.description }),
    ...(task.priority && { priority: task.priority }),
    ...(task.category && { category: task.category }),
    ...(task.dueDate && { due_date: task.dueDate }),
    ...(task.currentStatus && { current_status: task.currentStatus }),
    ...(task.completionPercentage !== undefined && { completion_percentage: task.completionPercentage }),
    ...(task.assignedTo && { assigned_to: task.assignedTo }),
    ...(task.assignedBy && { assigned_by: task.assignedBy }),
    ...(task.location && { location: task.location }),
    ...(task.attachments && { attachments: task.attachments }),
    ...(task.accepted !== undefined && { accepted: task.accepted }),
    ...(task.declineReason && { decline_reason: task.declineReason }),
    ...(task.readyForReview !== undefined && { ready_for_review: task.readyForReview }),
    ...(task.reviewAccepted !== undefined && { review_accepted: task.reviewAccepted }),
    ...(task.reviewedBy && { reviewed_by: task.reviewedBy }),
    ...(task.reviewedAt && { reviewed_at: task.reviewedAt }),
    ...(task.starredByUsers && { starred_by_users: task.starredByUsers }),
  };
}
```

## Testing Checklist

After making these changes, test:

- [ ] Create top-level task
- [ ] Create nested task (1 level)
- [ ] Create deeply nested task (3+ levels)
- [ ] View task tree
- [ ] Update nested task
- [ ] Delete nested task
- [ ] Task updates work
- [ ] Dashboard calculations
- [ ] Filtering works

## Files to Update

1. ✅ `src/types/buildtrack.ts` - DONE
2. ⏳ `src/state/taskStore.supabase.ts` - IN PROGRESS
3. ⏳ `src/screens/DashboardScreen.tsx` - Update subtask collection logic
4. ⏳ `src/screens/TaskDetailScreen.tsx` - Load children from tasks table
5. ⏳ `src/screens/TasksScreen.tsx` - Update filtering
6. ⏳ Any components that render subtasks

Would you like me to create the complete updated `taskStore.supabase.ts` file for you?

