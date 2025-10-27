# Rejected Tasks Analysis

## Current Situation
- **DashboardScreen shows:** "6 Rejected" for John Manager
- **Tasks Screen shows:** 3 tasks (none are rejected)
- **Expected:** Clicking "Rejected" button should show 6 rejected tasks

---

## DashboardScreen Logic (Where the "6" comes from)

### Step 1: Build `myAllTasks`
```typescript
const myTasks = projectFilteredTasks.filter(task => {
  const assignedTo = task.assignedTo || [];
  const isAssignedToMe = Array.isArray(assignedTo) && assignedTo.includes(user.id);
  const isCreatedByMe = task.assignedBy === user.id;
  
  // Include if:
  // 1. Assigned to me AND created by me (self-assigned), OR
  // 2. Created by me AND rejected (auto-reassigned back to creator)
  return (isAssignedToMe && isCreatedByMe) || (isCreatedByMe && task.currentStatus === "rejected");
});

const mySubTasks = projectFilteredTasks.flatMap(task => {
  return collectSubTasksAssignedTo(task.subTasks, user.id)
    .filter(subTask => {
      const isCreatedByMe = subTask.assignedBy === user.id;
      return isCreatedByMe; // Includes both self-assigned AND rejected
    })
    .map(subTask => ({ ...subTask, isSubTask: true as const }));
});

const myAllTasks = [...myTasks, ...mySubTasks];
```

**Key Point:** `myAllTasks` includes rejected tasks created by John Manager.

### Step 2: Filter for Rejected
```typescript
const myRejectedTasks = myAllTasks.filter(task => 
  task.currentStatus === "rejected"
);
```

**Result:** Counts 6 rejected tasks from `myAllTasks`.

---

## ProjectsTasksScreen Logic (Current Flow)

### Step 1: `getAllTasks()` builds task list
```typescript
const getAllTasks = (): TaskListItem[] => {
  const allProjectTasks = userProjects.flatMap(project => {
    const projectTasks = tasks.filter(task => task.projectId === project.id);

    // Get MY_TASKS
    const myTasksParent = projectTasks.filter(task => {
      const assignedTo = task.assignedTo || [];
      const isDirectlyAssigned = Array.isArray(assignedTo) && assignedTo.includes(user.id);
      const isCreatedByMe = task.assignedBy === user.id;
      const hasAssignedSubtasks = collectSubTasksAssignedTo(task.subTasks, user.id).length > 0;
      
      // CURRENT (v81.0): Includes rejected tasks
      return (isDirectlyAssigned && isCreatedByMe && !hasAssignedSubtasks) || 
             (isCreatedByMe && task.currentStatus === "rejected");
    });
    
    const myTasksSubTasks = projectTasks.flatMap(task => {
      return collectSubTasksAssignedTo(task.subTasks, user.id)
        .filter(subTask => subTask.assignedBy === user.id)
        .map(subTask => ({ ...subTask, isSubTask: true as const }));
    });
    
    const myTasksAll = [...myTasksParent, ...myTasksSubTasks];
    
    // Return based on localSectionFilter
    if (localSectionFilter === "my_tasks") {
      return myTasksAll; // ✅ Should include rejected tasks
    }
    // ... other sections
  });
  
  return allProjectTasks;
};
```

**Status:** `getAllTasks()` now includes rejected tasks (v81.0 fix).

### Step 2: Section Filter (applied FIRST)
```typescript
if (localSectionFilter === "my_tasks") {
  sectionFilteredTasks = allProjectTasks.filter(task => {
    const assignedTo = task.assignedTo || [];
    const isAssignedToMe = Array.isArray(assignedTo) && assignedTo.includes(user.id);
    const isCreatedByMe = task.assignedBy === user.id;
    
    // Include if:
    // 1. Assigned to me, OR
    // 2. Created by me AND rejected
    return isAssignedToMe || (isCreatedByMe && task.currentStatus === "rejected");
  });
}
```

**Status:** Section filter includes rejected tasks (v80.0 fix).

### Step 3: Status Filter (applied SECOND)
```typescript
if (localSectionFilter === "my_tasks") {
  if (localStatusFilter === "rejected") {
    return matchesSearch && task.currentStatus === "rejected";
  }
}
```

**Status:** Status filter checks `currentStatus === "rejected"`.

---

## The Problem

Looking at the flow:
1. `getAllTasks()` returns tasks based on `localSectionFilter`
2. Section filter is applied to `allProjectTasks` (result of `getAllTasks()`)
3. Status filter is applied to `sectionFilteredTasks`

**Issue:** We're filtering twice on the same data source, but the logic might not be aligned.

### Specific Issue with Rejected Tasks

The section filter in Step 2 checks:
```typescript
return isAssignedToMe || (isCreatedByMe && task.currentStatus === "rejected");
```

But `getAllTasks()` when `localSectionFilter === "my_tasks"` returns:
```typescript
return myTasksAll; // Which includes rejected tasks
```

So:
- `allProjectTasks` = `myTasksAll` (includes rejected)
- Section filter filters `allProjectTasks` → `sectionFilteredTasks` (should include rejected)
- Status filter filters `sectionFilteredTasks` → `filteredTasks` (rejected tasks only)

**But:** The 3 tasks shown don't have `currentStatus === "rejected"`, so they shouldn't pass the status filter.

---

## Questions to Answer

1. **Are rejected tasks in `getAllTasks()`?**
   - Check if `getAllTasks()` correctly includes rejected tasks

2. **Are rejected tasks passing the section filter?**
   - Check if section filter correctly includes rejected tasks

3. **Are rejected tasks passing the status filter?**
   - Check if status filter is correctly applied

4. **Are the 3 displayed tasks actually rejected?**
   - The screenshot shows tasks with status "not started 0%" and "completed 100%"
   - None show "rejected" status
   - Why are these showing when clicking "Rejected" button?

---

## Potential Root Causes

1. **Status filter not being applied correctly**
   - Maybe `localStatusFilter` is not "rejected" when it should be?

2. **Search filter interfering**
   - Maybe search query is filtering out rejected tasks?

3. **Project filter issue**
   - Maybe rejected tasks are in different projects?

4. **Task status mismatch**
   - Maybe `currentStatus` is not "rejected" in the database?

5. **Subtask vs Parent task issue**
   - Maybe rejected tasks are subtasks, not parent tasks?

---

## Debugging Steps Needed

1. **Check what `getAllTasks()` returns**
   - Log `allProjectTasks` when `localSectionFilter === "my_tasks"`

2. **Check what section filter returns**
   - Log `sectionFilteredTasks` after section filter is applied

3. **Check what status filter returns**
   - Log `filteredTasks` after status filter is applied

4. **Check filter values**
   - Log `localSectionFilter` and `localStatusFilter` values

5. **Check task properties**
   - Log `currentStatus` for all tasks in the list

6. **Check if rejected tasks exist**
   - Query database to see if John Manager has 6 rejected tasks

---

## Next Steps

Please provide:
1. What is `localSectionFilter` when clicking "Rejected" button?
2. What is `localStatusFilter` when clicking "Rejected" button?
3. How many tasks does `getAllTasks()` return for "my_tasks"?
4. How many tasks have `currentStatus === "rejected"` in the database for John Manager?
5. Are there any console logs showing filter results?

