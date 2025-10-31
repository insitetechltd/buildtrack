# App Migration Guide: Unified Tasks Table

## Overview

After running the database migration to unify `tasks` and `sub_tasks`, you'll need to update your React Native app code. This guide walks you through all necessary changes.

## 🎯 What Changed

### Database
- ✅ `sub_tasks` table merged into `tasks` table
- ✅ New column: `parent_task_id` (self-referential)
- ✅ New column: `nesting_level` (for easier queries)
- ✅ New column: `root_task_id` (for filtering)

### TypeScript Types
- ❌ Remove `SubTask` interface
- ✅ Update `Task` interface to include parent references

### State Management
- ❌ Remove `sub_tasks` from stores
- ✅ Update queries to use unified `tasks` table

### Components
- ✅ Update components to handle nested tasks
- ✅ Simplify subtask rendering logic

## 📋 Step-by-Step Migration

### Step 1: Update TypeScript Types

**File:** `src/types/buildtrack.ts`

**Before:**
```typescript
export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  // ... other fields
  subTasks?: SubTask[];  // ❌ Remove this
}

export interface SubTask {  // ❌ Remove this entire interface
  id: string;
  parentTaskId?: string;
  parentSubTaskId?: string;
  projectId: string;
  title: string;
  // ... duplicate fields
  subTasks?: SubTask[];
}
```

**After:**
```typescript
export interface Task {
  id: string;
  projectId: string;
  
  // ✅ NEW: Parent reference for nesting
  parentTaskId?: string | null;
  nestingLevel?: number;
  rootTaskId?: string | null;
  
  // Existing fields
  title: string;
  description: string;
  priority: Priority;
  category: Category;
  dueDate: string;
  currentStatus: TaskStatus;
  completionPercentage: number;
  assignedTo: string[];
  assignedBy: string;
  location?: Location;
  attachments: string[];
  accepted: boolean;
  declineReason?: string;
  readyForReview: boolean;
  reviewAccepted?: boolean;
  reviewedBy?: string;
  reviewedAt?: string;
  starredByUsers: string[];
  companyId: string;
  createdAt: string;
  updatedAt: string;
  
  // ✅ Children can be loaded dynamically
  children?: Task[];  // For UI rendering
}

// ✅ Remove SubTask interface entirely
```

### Step 2: Update Supabase Queries

**File:** `src/api/supabase.ts` or your API service

**Before:**
```typescript
// Two separate queries
const { data: tasks } = await supabase
  .from('tasks')
  .select('*')
  .eq('project_id', projectId);

const { data: subTasks } = await supabase
  .from('sub_tasks')
  .select('*')
  .eq('project_id', projectId);
```

**After:**
```typescript
// Single query gets everything
const { data: tasks } = await supabase
  .from('tasks')
  .select('*')
  .eq('project_id', projectId);

// If you only want top-level tasks:
const { data: topLevelTasks } = await supabase
  .from('tasks')
  .select('*')
  .eq('project_id', projectId)
  .is('parent_task_id', null);

// If you want children of a specific task:
const { data: childTasks } = await supabase
  .from('tasks')
  .select('*')
  .eq('parent_task_id', parentTaskId);

// If you want all tasks in a tree:
// Client-side: Build tree from flat list (see helper functions below)
```

### Step 3: Update Task Store

**File:** `src/state/taskStore.supabase.ts`

**Before:**
```typescript
interface TaskState {
  tasks: Task[];
  subTasks: SubTask[];  // ❌ Remove this
  // ...
}

// Two separate fetch functions
const fetchTasks = async () => {
  const { data: tasks } = await supabase.from('tasks').select('*');
  const { data: subTasks } = await supabase.from('sub_tasks').select('*');
  set({ tasks, subTasks });
};
```

**After:**
```typescript
interface TaskState {
  tasks: Task[];  // ✅ All tasks, including nested ones
  // ...
}

// Single fetch function
const fetchTasks = async () => {
  const { data: tasks } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });
    
  set({ tasks: tasks || [] });
};

// Helper to get top-level tasks
const getTopLevelTasks = (projectId: string) => {
  return get().tasks.filter(
    t => t.projectId === projectId && !t.parentTaskId
  );
};

// Helper to get children
const getChildTasks = (parentTaskId: string) => {
  return get().tasks.filter(
    t => t.parentTaskId === parentTaskId
  );
};

// Helper to build task tree
const getTaskTree = (projectId: string) => {
  const allTasks = get().tasks.filter(t => t.projectId === projectId);
  const taskMap = new Map(allTasks.map(t => [t.id, { ...t, children: [] }]));
  const rootTasks: Task[] = [];
  
  allTasks.forEach(task => {
    const taskWithChildren = taskMap.get(task.id)!;
    
    if (!task.parentTaskId) {
      // Top-level task
      rootTasks.push(taskWithChildren);
    } else {
      // Child task - add to parent's children
      const parent = taskMap.get(task.parentTaskId);
      if (parent) {
        parent.children = parent.children || [];
        parent.children.push(taskWithChildren);
      }
    }
  });
  
  return rootTasks;
};
```

### Step 4: Update Create Task Function

**File:** `src/state/taskStore.supabase.ts`

**Before:**
```typescript
const createSubTask = async (parentTaskId: string, taskData: Partial<SubTask>) => {
  const { data, error } = await supabase
    .from('sub_tasks')  // ❌ Old table
    .insert({
      ...taskData,
      parent_task_id: parentTaskId,
    })
    .select()
    .single();
};
```

**After:**
```typescript
const createTask = async (
  taskData: Partial<Task>, 
  parentTaskId?: string
) => {
  // Calculate nesting level
  let nestingLevel = 0;
  let rootTaskId = null;
  
  if (parentTaskId) {
    const parentTask = get().tasks.find(t => t.id === parentTaskId);
    nestingLevel = (parentTask?.nestingLevel || 0) + 1;
    rootTaskId = parentTask?.rootTaskId || parentTaskId;
  }
  
  const { data, error } = await supabase
    .from('tasks')  // ✅ Unified table
    .insert({
      ...taskData,
      parent_task_id: parentTaskId || null,
      nesting_level: nestingLevel,
      root_task_id: rootTaskId,
    })
    .select()
    .single();
    
  if (error) throw error;
  
  // Add to state
  set(state => ({
    tasks: [...state.tasks, data],
  }));
  
  return data;
};
```

### Step 5: Update UI Components

**File:** `src/components/TaskCard.tsx`

**Before:**
```typescript
interface TaskCardProps {
  task: Task | SubTask;  // ❌ Union type
  // ...
}
```

**After:**
```typescript
interface TaskCardProps {
  task: Task;  // ✅ Single type
  // ...
}

// If you want to show nesting visually:
export const TaskCard: React.FC<TaskCardProps> = ({ task }) => {
  const indentLevel = task.nestingLevel || 0;
  
  return (
    <View style={{ paddingLeft: indentLevel * 20 }}>
      <Text>{task.title}</Text>
      {/* ... */}
    </View>
  );
};
```

**File:** `src/screens/TaskDetailScreen.tsx`

**Before:**
```typescript
// Load subtasks separately
const [subTasks, setSubTasks] = useState<SubTask[]>([]);

useEffect(() => {
  const loadSubTasks = async () => {
    const { data } = await supabase
      .from('sub_tasks')
      .select('*')
      .eq('parent_task_id', taskId);
    setSubTasks(data || []);
  };
  loadSubTasks();
}, [taskId]);
```

**After:**
```typescript
// Children are just tasks with parent_task_id = this task
const childTasks = useTaskStore(state => 
  state.tasks.filter(t => t.parentTaskId === task.id)
);

// Or use the helper function:
const childTasks = useTaskStore(state => 
  state.getChildTasks(task.id)
);
```

### Step 6: Update Dashboard Calculations

**File:** `src/screens/DashboardScreen.tsx`

**Before:**
```typescript
// Collect subtasks separately
const collectSubTasksAssignedBy = (subTasks: SubTask[], userId: string) => {
  // ... complex logic
};

const collectSubTasksAssignedTo = (subTasks: SubTask[], userId: string) => {
  // ... complex logic
};
```

**After:**
```typescript
// Much simpler - all tasks are in one place
const tasksAssignedByMe = tasks.filter(t => 
  t.assignedBy === user.id
);

const tasksAssignedToMe = tasks.filter(t => 
  t.assignedTo.includes(user.id)
);

// Include nested tasks automatically (they're all in the same table!)
const allMyTasks = tasks.filter(t => 
  t.assignedTo.includes(user.id) && 
  t.projectId === selectedProjectId
);
```

### Step 7: Update Task Updates

**File:** Components that handle task updates

**Before:**
```typescript
const addTaskUpdate = async (
  taskId?: string,
  subTaskId?: string,  // ❌ Remove this parameter
  updateData: any
) => {
  const { data } = await supabase
    .from('task_updates')
    .insert({
      task_id: taskId,
      sub_task_id: subTaskId,  // ❌ Remove this
      ...updateData,
    });
};
```

**After:**
```typescript
const addTaskUpdate = async (
  taskId: string,  // ✅ Always just task_id now
  updateData: any
) => {
  const { data } = await supabase
    .from('task_updates')
    .insert({
      task_id: taskId,  // ✅ Simple!
      ...updateData,
    });
};
```

## 🔧 Helper Functions

Add these to your task store for easy tree operations:

```typescript
// Build hierarchical tree from flat list
export function buildTaskTree(tasks: Task[]): Task[] {
  const taskMap = new Map<string, Task & { children: Task[] }>();
  
  // First pass: create map with all tasks
  tasks.forEach(task => {
    taskMap.set(task.id, { ...task, children: [] });
  });
  
  const rootTasks: Task[] = [];
  
  // Second pass: build hierarchy
  tasks.forEach(task => {
    const taskWithChildren = taskMap.get(task.id)!;
    
    if (!task.parentTaskId) {
      rootTasks.push(taskWithChildren);
    } else {
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

// Get all ancestors (breadcrumb path)
export function getTaskAncestors(
  taskId: string, 
  allTasks: Task[]
): Task[] {
  const ancestors: Task[] = [];
  let currentTask = allTasks.find(t => t.id === taskId);
  
  while (currentTask?.parentTaskId) {
    const parent = allTasks.find(t => t.id === currentTask!.parentTaskId);
    if (!parent) break;
    ancestors.unshift(parent); // Add to beginning
    currentTask = parent;
  }
  
  return ancestors;
}

// Get all descendants (recursive)
export function getTaskDescendants(
  taskId: string,
  allTasks: Task[]
): Task[] {
  const descendants: Task[] = [];
  
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

// Count all descendants
export function countTaskDescendants(
  taskId: string,
  allTasks: Task[]
): number {
  return getTaskDescendants(taskId, allTasks).length;
}
```

## 🎨 UI Improvements

With unified tasks, you can now:

### 1. Show Task Breadcrumbs
```typescript
const Breadcrumbs: React.FC<{ task: Task }> = ({ task }) => {
  const allTasks = useTaskStore(state => state.tasks);
  const ancestors = getTaskAncestors(task.id, allTasks);
  
  return (
    <View style={{ flexDirection: 'row' }}>
      {ancestors.map((ancestor, i) => (
        <React.Fragment key={ancestor.id}>
          {i > 0 && <Text> › </Text>}
          <Text>{ancestor.title}</Text>
        </React.Fragment>
      ))}
    </View>
  );
};
```

### 2. Show Indent Levels
```typescript
<View style={{ paddingLeft: task.nestingLevel * 20 }}>
  <Text>{task.title}</Text>
</View>
```

### 3. Collapsible Tree View
```typescript
const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

const renderTask = (task: Task) => {
  const hasChildren = childTasks.some(t => t.parentTaskId === task.id);
  const isCollapsed = collapsed.has(task.id);
  
  return (
    <View>
      <Pressable onPress={() => {
        setCollapsed(prev => {
          const next = new Set(prev);
          if (isCollapsed) {
            next.delete(task.id);
          } else {
            next.add(task.id);
          }
          return next;
        });
      }}>
        <Text>
          {hasChildren && (isCollapsed ? '▶' : '▼')} {task.title}
        </Text>
      </Pressable>
      
      {!isCollapsed && hasChildren && (
        <View style={{ paddingLeft: 20 }}>
          {childTasks
            .filter(t => t.parentTaskId === task.id)
            .map(child => renderTask(child))}
        </View>
      )}
    </View>
  );
};
```

## ✅ Testing Checklist

After migration, test these scenarios:

- [ ] Create top-level task
- [ ] Create nested task (1 level)
- [ ] Create deeply nested task (3+ levels)
- [ ] View task tree in UI
- [ ] Update nested task
- [ ] Delete nested task
- [ ] Delete parent task (children should cascade)
- [ ] Move task to different parent
- [ ] Filter tasks by project
- [ ] Search across all tasks
- [ ] Dashboard calculations (inbox/outbox)
- [ ] Task updates still work
- [ ] File attachments still work

## 🐛 Common Issues

### Issue 1: "Cannot find SubTask type"
**Solution:** Search and replace all `SubTask` with `Task` in your codebase.

```bash
# Find all occurrences
grep -r "SubTask" src/

# Manual replacement or use IDE refactoring
```

### Issue 2: "Tasks not showing children"
**Solution:** Use the `buildTaskTree()` helper function or fetch children explicitly.

### Issue 3: "Infinite loop in tree rendering"
**Solution:** Check for circular references (parent points to child that points back).

## 📊 Performance Tips

### 1. Cache Tree Structure
```typescript
const cachedTree = useMemo(() => 
  buildTaskTree(tasks.filter(t => t.projectId === projectId)),
  [tasks, projectId]
);
```

### 2. Lazy Load Children
```typescript
// Only fetch children when parent is expanded
const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());

// Fetch on demand
useEffect(() => {
  expandedTasks.forEach(async (taskId) => {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('parent_task_id', taskId);
    // Add to store
  });
}, [expandedTasks]);
```

### 3. Virtualized List for Deep Trees
Use `react-native-virtualized-list` or `FlashList` for large task trees.

## 🎉 Benefits You'll See

After migration:

1. ✅ **Simpler code** - No more duplicate logic for tasks vs subtasks
2. ✅ **Faster queries** - One table scan instead of two
3. ✅ **Better type safety** - Single Task type throughout
4. ✅ **Easier maintenance** - Changes in one place
5. ✅ **More flexible** - Unlimited nesting depth
6. ✅ **Cleaner UI** - Consistent rendering logic

## 📝 Summary

**Files to Update:**
1. ✅ `src/types/buildtrack.ts` - Remove SubTask, update Task
2. ✅ `src/state/taskStore.supabase.ts` - Remove subTasks array, add helpers
3. ✅ `src/screens/DashboardScreen.tsx` - Simplify calculations
4. ✅ `src/screens/TasksScreen.tsx` - Update filtering
5. ✅ `src/screens/TaskDetailScreen.tsx` - Load children from unified table
6. ✅ `src/components/TaskCard.tsx` - Single type
7. ✅ All components that create/update tasks

**Estimated Migration Time:** 2-4 hours

---

**Need help?** Refer to the complete proposal in `UNIFIED_TASKS_TABLE_PROPOSAL.md`

