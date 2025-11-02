# "New Requests" Logic - Detailed Breakdown

This document shows the complete logic flow for the "New Requests" button, from Dashboard calculation to TasksScreen filtering.

---

## DashboardScreen: "New Requests" Button

### Button Location
**File**: `src/screens/DashboardScreen.tsx`  
**Lines**: 668-692

### Button Configuration
```typescript
<Pressable 
  onPress={() => {
    setSectionFilter("inbox");  // Filter: tasks assigned TO me BY others
    setStatusFilter("received"); // Filter: not yet accepted
    setButtonLabel("Tasks for me - New Requests");
    onNavigateToTasks();
  }}
>
  <Text>{inboxReceivedTasks.length}</Text>
  <Text>New{'\n'}Requests</Text>
</Pressable>
```

**Actions on Press**:
1. Sets section filter: tasks assigned TO current user BY others
2. Sets status filter: not yet accepted
3. Sets `buttonLabel = "Tasks for me - New Requests"`
4. Navigates to TasksScreen

---

## DashboardScreen: Calculation Logic

### Step 1: Get Tasks Assigned TO Current User BY Others

#### 1a. Get Top-Level Tasks Assigned TO Me BY Others
**Lines**: 326-331

```typescript
const inboxParentTasks = projectFilteredTasks.filter(task => {
  const assignedTo = task.assignedTo || [];
  const isAssignedToMe = Array.isArray(assignedTo) && assignedTo.includes(user.id);
  const isCreatedByMe = task.assignedBy === user.id;
  return isTopLevelTask(task) && isAssignedToMe && !isCreatedByMe; // Top-level only
});
```

**Precise Filter Criteria**:
- ✅ Task is top-level (no `parentTaskId`)
- ✅ Task is assigned TO current user (`assignedTo.includes(user.id)`)
- ✅ Task is NOT created by current user (`assignedBy !== user.id`)

#### 1b. Get Nested Tasks Assigned TO Me BY Others
**Lines**: 333-334

```typescript
const inboxNestedTasks = getNestedTasksAssignedTo(user.id)
  .filter(task => task.assignedBy !== user.id);
```

**Helper Function** (`getNestedTasksAssignedTo`) - **Lines**: 254-261:
```typescript
const getNestedTasksAssignedTo = (userId: string): Task[] => {
  return projectFilteredTasks.filter(task => {
    const assignedTo = task.assignedTo || [];
    return isNestedTask(task) && // Is a nested task
           Array.isArray(assignedTo) && 
           assignedTo.includes(userId);
  });
};
```

**Then filters**: `task.assignedBy !== user.id`

**Precise Filter Criteria**:
- ✅ Task is nested (has `parentTaskId`)
- ✅ Task is assigned TO current user
- ✅ Task is NOT created by current user

#### 1c. Combine All Tasks Assigned TO Me BY Others
**Line**: 336

```typescript
const inboxAll = [...inboxParentTasks, ...inboxNestedTasks];
```

---

### Step 2: Filter for "Received" Status (Not Yet Accepted)
**Lines**: 338-347

```typescript
// Helper: Check if task is not yet accepted (null, undefined, or false)
const isNotAccepted = (task: Task) => {
  return task.accepted === null || task.accepted === undefined || task.accepted === false;
};

const inboxReceivedTasks = inboxAll.filter(task =>
  isNotAccepted(task) && 
  task.currentStatus !== "rejected"
);
```

**Final Criteria for "New Requests"**:
1. ✅ Task is assigned TO current user BY others
2. ✅ Task is NOT accepted (`accepted === null || undefined || false`)
3. ✅ Task is NOT rejected (`currentStatus !== "rejected"`)

---

## TasksScreen: Filter Logic

### Step 1: Get All Tasks from User's Projects
**Lines**: 276-489

TasksScreen collects tasks from all user's projects and categorizes them by filter criteria.

#### 1a. Get Tasks Assigned TO Me BY Others from Each Project
**Lines**: 313-406

```typescript
// Get tasks assigned to me by OTHERS only (not self-assigned)
const inboxParentTasks = projectTasks.filter(task => {
  const assignedTo = task.assignedTo || [];
  const userIdStr = String(user.id);
  const isDirectlyAssigned = Array.isArray(assignedTo) && assignedTo.some(id => String(id) === userIdStr);
  const isCreatedByMe = String(task.assignedBy) === userIdStr;
  
  // Include top-level tasks assigned to me but NOT created by me
  return isTopLevelTask(task) && isDirectlyAssigned && !isCreatedByMe;
});

// Get nested tasks assigned to me but not created by me
const inboxNestedTasks = projectTasks.filter(task => {
  const assignedTo = task.assignedTo || [];
  const isNested = isNestedTask(task);
  const userIdStr = String(user.id);
  const isAssigned = Array.isArray(assignedTo) && assignedTo.some(id => String(id) === userIdStr);
  const notCreatedByMe = String(task.assignedBy) !== userIdStr;
  
  return isNested && isAssigned && notCreatedByMe;
});

const inboxTasks = [...inboxParentTasks, ...inboxNestedTasks];
```

**Key Differences from Dashboard**:
- Uses `String()` conversion for UUID comparisons (`String(user.id)`, `String(id)`)
- Uses `.some()` with string comparison: `assignedTo.some(id => String(id) === userIdStr)`
- Includes debug logging for troubleshooting

---

### Step 2: Apply Section Filter (Tasks Assigned TO Me BY Others)
**Lines**: 441-460

```typescript
if (localSectionFilter === "inbox") {
  // Filter: tasks assigned to me by others
  const userIdStr = String(user.id);
  const verifiedInboxTasks = inboxTasks.filter(task => {
    const assignedTo = task.assignedTo || [];
    const isAssignedToMe = Array.isArray(assignedTo) && assignedTo.some(id => String(id) === userIdStr);
    if (!isAssignedToMe) {
      console.log('🔍 [DEBUG] ⚠️ Task in inboxTasks but NOT assigned to user:', {
        title: task.title,
        assignedTo: assignedTo,
        user_id: user.id
      });
    }
    return isAssignedToMe;
  });
  return verifiedInboxTasks;
}
```

**Returns**: All tasks assigned TO current user BY others

---

### Step 3: Apply Status Filter ("received" - Not Yet Accepted)
**Lines**: 628-686

```typescript
} else if (localSectionFilter === "inbox") {
  // Filter: Tasks assigned TO me BY others (not self-assigned)
  const assignedTo = task.assignedTo || [];
  const userIdStr = String(user.id);
  const isAssignedToMe = Array.isArray(assignedTo) && assignedTo.some(id => String(id) === userIdStr);
  const isCreatedByMe = String(task.assignedBy) === userIdStr;
  const isInInbox = isAssignedToMe && !isCreatedByMe;
  
  // 🔍 CRITICAL FIX: If task is not assigned to me, immediately exclude it
  if (!isAssignedToMe) {
    return false;
  }
  
  // Only proceed if task is assigned to me AND not created by me
  if (!isInInbox) return false;
  
  if (localStatusFilter === "received") {
    // RECEIVED: New tasks from others waiting for my acceptance
    // Check explicitly for null, undefined, or false (not yet accepted)
    const isNotAccepted = task.accepted === null || task.accepted === undefined || task.accepted === false;
    
    return isNotAccepted &&
           task.currentStatus !== "rejected";
  }
  // ... other status filters
}
```

**Final Filter Criteria**:
1. ✅ Task is assigned TO current user (`isAssignedToMe`)
2. ✅ Task is NOT created by current user (`!isCreatedByMe`)
3. ✅ Task is NOT accepted (`accepted === null || undefined || false`)
4. ✅ Task is NOT rejected (`currentStatus !== "rejected"`)

---

## Complete Logic Flow Summary

### DashboardScreen Calculation:
```
1. Filter tasks by selectedProjectId
   ↓
2. Get top-level tasks assigned TO me BY others
   ↓
3. Get nested tasks assigned TO me BY others
   ↓
4. Combine: allTasksAssignedToMeByOthers = [...topLevel, ...nested]
   ↓
5. Filter for "received" status: 
   - isNotAccepted(task) 
   - task.currentStatus !== "rejected"
   ↓
6. Count: newRequestsCount.length
   ↓
7. Display count on button
```

### TasksScreen Filtering:
```
1. Get all tasks from user's projects
   ↓
2. For each project, get tasks assigned TO me BY others:
   - Top-level tasks (assigned TO me, NOT created by me)
   - Nested tasks (assigned TO me, NOT created by me)
   ↓
3. Apply section filter (tasks assigned TO me BY others):
   - Verify task is assigned TO current user
   - Return verified tasks
   ↓
4. Apply status filter ("received" - not yet accepted):
   - Task must be assigned TO me, NOT created by me
   - Task must NOT be accepted (accepted === null || undefined || false)
   - Task must NOT be rejected (currentStatus !== "rejected")
   ↓
5. Display filtered tasks
```

---

## Key Differences Between Dashboard and TasksScreen

| Aspect | DashboardScreen | TasksScreen |
|--------|----------------|-------------|
| **UUID Comparison** | Direct comparison: `assignedTo.includes(user.id)` | String conversion: `String(id) === String(user.id)` |
| **Array Check** | `Array.isArray(assignedTo) && assignedTo.includes(user.id)` | `Array.isArray(assignedTo) && assignedTo.some(id => String(id) === userIdStr)` |
| **Verification** | Single filter pass | Double verification (once in section filter, once in status filter) |
| **Debug Logging** | None | Extensive debug logging for troubleshooting |

---

## Critical Checks

### 1. Task Assignment Check
- ✅ Must be assigned TO current user (`assignedTo` array includes user's ID)
- ✅ Must use string comparison for UUID type safety

### 2. Task Creation Check
- ✅ Must NOT be created by current user (`assignedBy !== user.id`)
- ✅ This ensures only tasks FROM others are shown

### 3. Acceptance Status Check
- ✅ Must NOT be accepted: `accepted === null || undefined || false`
- ✅ This ensures only NEW requests are shown (not yet accepted)

### 4. Rejection Status Check
- ✅ Must NOT be rejected: `currentStatus !== "rejected"`
- ✅ Rejected tasks are excluded from "New Requests"

### 5. Task Hierarchy
- ✅ Includes both top-level tasks (`isTopLevelTask`) and nested tasks (`isNestedTask`)
- ✅ Top-level: `!task.parentTaskId`
- ✅ Nested: `!!task.parentTaskId`

---

## Example Scenarios

### ✅ Should Show in "New Requests"
- Task created by User A, assigned to User B (current user), not accepted, not rejected
- Subtask created by User A, assigned to User B (current user), not accepted, not rejected

### ❌ Should NOT Show in "New Requests"
- Task created by current user (even if assigned to self)
- Task already accepted (`accepted === true`)
- Task rejected (`currentStatus === "rejected"`)
- Task not assigned to current user
- Task with `accepted === null` but `currentStatus === "rejected"` (rejected takes precedence)

---

## Debug Logging

TasksScreen includes debug logging at **lines 671-683**:

```typescript
if (task.title?.toLowerCase().includes("testing sub task")) {
  console.log('🔍 [DEBUG] Checking received filter:', {
    title: task.title,
    id: task.id,
    isInInbox,
    accepted: task.accepted,
    isNotAccepted,
    currentStatus: task.currentStatus,
    isRejected: task.currentStatus === "rejected",
    willPassFilter: isNotAccepted && task.currentStatus !== "rejected"
  });
}
```

This helps troubleshoot why specific tasks appear or don't appear in the "New Requests" list.

