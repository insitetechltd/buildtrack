# Quick Overview Filter Matrix

## Purpose
Compare DashboardScreen button counts vs ProjectsTasksScreen filtered results for all 14 buttons.

---

## My Tasks (4 buttons)

### 1. Rejected
**DashboardScreen Count Logic:**
```typescript
const myRejectedTasks = myAllTasks.filter(task => 
  task.currentStatus === "rejected"
);
```
**Filter Criteria:**
- From: `myAllTasks` (tasks assigned to me, including self-assigned + rejected)
- Status: `currentStatus === "rejected"`

**ProjectsTasksScreen Filter Logic:**
```typescript
if (localSectionFilter === "my_tasks") {
  // Section filter: tasks assigned to me
  if (localStatusFilter === "rejected") {
    return matchesSearch && task.currentStatus === "rejected";
  }
}
```
**Filter Criteria:**
- Section: `assignedTo.includes(user.id)`
- Status: `currentStatus === "rejected"`

**Match:** ✅ Should match

---

### 2. WIP
**DashboardScreen Count Logic:**
```typescript
const myWIPTasks = myAllTasks.filter(task => {
  const isSelfAssigned = task.assignedBy === user.id && 
                         task.assignedTo?.includes(user.id);
  const isAcceptedOrSelfAssigned = task.accepted || 
                                   (isSelfAssigned && !task.accepted);
  
  return isAcceptedOrSelfAssigned && 
         task.completionPercentage < 100 &&
         !isOverdue(task) &&
         task.currentStatus !== "rejected";
});
```
**Filter Criteria:**
- From: `myAllTasks`
- Must be: `accepted || (selfAssigned && !accepted)`
- Completion: `< 100%`
- Not overdue
- Not rejected

**ProjectsTasksScreen Filter Logic:**
```typescript
if (localSectionFilter === "my_tasks") {
  if (localStatusFilter === "wip") {
    const isSelfAssigned = task.assignedBy === user.id && 
                           task.assignedTo?.includes(user.id);
    const isAcceptedOrSelfAssigned = task.accepted || 
                                     (isSelfAssigned && !task.accepted);
    return matchesSearch && 
           isAcceptedOrSelfAssigned &&
           task.completionPercentage < 100 && 
           !isOverdue(task) && 
           task.currentStatus !== "rejected";
  }
}
```
**Filter Criteria:**
- Section: `assignedTo.includes(user.id)`
- Must be: `accepted || (selfAssigned && !accepted)`
- Completion: `< 100%`
- Not overdue
- Not rejected

**Match:** ✅ Should match

---

### 3. Done
**DashboardScreen Count Logic:**
```typescript
const myDoneTasks = myAllTasks.filter(task => 
  task.completionPercentage === 100 &&
  task.currentStatus !== "rejected"
);
```
**Filter Criteria:**
- From: `myAllTasks`
- Completion: `=== 100%`
- Not rejected

**ProjectsTasksScreen Filter Logic:**
```typescript
if (localSectionFilter === "my_tasks") {
  if (localStatusFilter === "done") {
    return matchesSearch && task.completionPercentage === 100 && 
           task.currentStatus !== "rejected";
  }
}
```
**Filter Criteria:**
- Section: `assignedTo.includes(user.id)`
- Completion: `=== 100%`
- Not rejected

**Match:** ✅ Should match

---

### 4. Overdue
**DashboardScreen Count Logic:**
```typescript
const myOverdueTasks = myAllTasks.filter(task => 
  task.completionPercentage < 100 && 
  isOverdue(task) &&
  task.currentStatus !== "rejected"
);
```
**Filter Criteria:**
- From: `myAllTasks`
- Completion: `< 100%`
- Overdue
- Not rejected

**ProjectsTasksScreen Filter Logic:**
```typescript
if (localSectionFilter === "my_tasks") {
  if (localStatusFilter === "overdue") {
    return matchesSearch && task.completionPercentage < 100 && 
           isOverdue(task) && 
           task.currentStatus !== "rejected";
  }
}
```
**Filter Criteria:**
- Section: `assignedTo.includes(user.id)`
- Completion: `< 100%`
- Overdue
- Not rejected

**Match:** ✅ Should match

---

## Inbox (5 buttons)

### 5. Received
**DashboardScreen Count Logic:**
```typescript
const inboxReceivedTasks = inboxAllTasks.filter(task => 
  !task.accepted && 
  task.currentStatus !== "rejected"
);
```
**Filter Criteria:**
- From: `inboxAllTasks` (tasks assigned to me by others, not self-assigned)
- Not accepted
- Not rejected

**ProjectsTasksScreen Filter Logic:**
```typescript
// Section filter: assignedTo.includes(user.id) && !isCreatedByMe
if (localStatusFilter === "received") {
  return matchesSearch && !task.accepted && task.currentStatus !== "rejected";
}
```
**Filter Criteria:**
- Section: `assignedTo.includes(user.id) && assignedBy !== user.id`
- Not accepted
- Not rejected

**Match:** ✅ Should match

---

### 6. WIP
**DashboardScreen Count Logic:**
```typescript
const inboxWIPTasks = inboxAllTasks.filter(task => 
  task.accepted && 
  !isOverdue(task) &&
  task.currentStatus !== "rejected" &&
  (
    task.completionPercentage < 100 || 
    (task.completionPercentage === 100 && !task.readyForReview)
  )
);
```
**Filter Criteria:**
- From: `inboxAllTasks`
- Accepted
- Not overdue
- Not rejected
- Completion: `< 100%` OR (`100%` AND `!readyForReview`)

**ProjectsTasksScreen Filter Logic:**
```typescript
// Section filter: assignedTo.includes(user.id) && !isCreatedByMe
if (localStatusFilter === "wip") {
  return matchesSearch && task.accepted && 
         !isOverdue(task) && 
         task.currentStatus !== "rejected" &&
         (task.completionPercentage < 100 || 
          (task.completionPercentage === 100 && !task.readyForReview));
}
```
**Filter Criteria:**
- Section: `assignedTo.includes(user.id) && assignedBy !== user.id`
- Accepted
- Not overdue
- Not rejected
- Completion: `< 100%` OR (`100%` AND `!readyForReview`)

**Match:** ✅ Should match

---

### 7. Reviewing
**DashboardScreen Count Logic:**
```typescript
const inboxReviewingTasks = projectFilteredTasks.filter(task => {
  const isCreatedByMe = task.assignedBy === user.id;
  return isCreatedByMe &&
         task.completionPercentage === 100 &&
         task.readyForReview === true &&
         task.reviewAccepted !== true;
});
```
**Filter Criteria:**
- From: `projectFilteredTasks` (ALL tasks, not just inboxAllTasks!)
- Created by me (`assignedBy === user.id`)
- Completion: `=== 100%`
- `readyForReview === true`
- `reviewAccepted !== true`

**ProjectsTasksScreen Filter Logic:**
```typescript
// Section filter: assignedTo.includes(user.id) && !isCreatedByMe
if (localStatusFilter === "reviewing") {
  const isCreatedByMe = task.assignedBy === user.id;
  const isInProjectFiltered = projectFilteredTasks.some(t => t.id === task.id);
  return matchesSearch && 
         isInProjectFiltered &&
         isCreatedByMe &&
         task.completionPercentage === 100 &&
         task.readyForReview === true &&
         task.reviewAccepted !== true;
}
```
**Filter Criteria:**
- Section: `assignedTo.includes(user.id) && assignedBy !== user.id` ⚠️ **CONFLICT!**
- Then checks: `isCreatedByMe` (which conflicts with section filter)
- Completion: `=== 100%`
- `readyForReview === true`
- `reviewAccepted !== true`

**Match:** ❌ **DOES NOT MATCH!** Section filter excludes tasks created by me, but reviewing needs tasks created by me!

---

### 8. Done
**DashboardScreen Count Logic:**
```typescript
const inboxDoneTasks = inboxAllTasks.filter(task => 
  task.completionPercentage === 100 &&
  task.reviewAccepted === true
);
```
**Filter Criteria:**
- From: `inboxAllTasks`
- Completion: `=== 100%`
- `reviewAccepted === true`

**ProjectsTasksScreen Filter Logic:**
```typescript
// Section filter: assignedTo.includes(user.id) && !isCreatedByMe
if (localStatusFilter === "done") {
  return matchesSearch && task.completionPercentage === 100 &&
         task.reviewAccepted === true;
}
```
**Filter Criteria:**
- Section: `assignedTo.includes(user.id) && assignedBy !== user.id`
- Completion: `=== 100%`
- `reviewAccepted === true`

**Match:** ✅ Should match

---

### 9. Overdue
**DashboardScreen Count Logic:**
```typescript
const inboxOverdueTasks = inboxAllTasks.filter(task => 
  task.completionPercentage < 100 && 
  isOverdue(task) &&
  task.currentStatus !== "rejected"
);
```
**Filter Criteria:**
- From: `inboxAllTasks`
- Completion: `< 100%`
- Overdue
- Not rejected

**ProjectsTasksScreen Filter Logic:**
```typescript
// Section filter: assignedTo.includes(user.id) && !isCreatedByMe
if (localStatusFilter === "overdue") {
  return matchesSearch && task.completionPercentage < 100 && 
         isOverdue(task) && 
         task.currentStatus !== "rejected";
}
```
**Filter Criteria:**
- Section: `assignedTo.includes(user.id) && assignedBy !== user.id`
- Completion: `< 100%`
- Overdue
- Not rejected

**Match:** ✅ Should match

---

## Outbox (5 buttons)

### 10. Assigned
**DashboardScreen Count Logic:**
```typescript
const outboxAssignedTasks = outboxAllTasks.filter(task => 
  !task.accepted && 
  task.currentStatus !== "rejected"
);
```
**Filter Criteria:**
- From: `outboxAllTasks` (tasks I created, assigned to others, not self-assigned)
- Not accepted
- Not rejected

**ProjectsTasksScreen Filter Logic:**
```typescript
// Section filter: isCreatedByMe && !isSelfAssignedOnly && !rejected
if (localStatusFilter === "assigned") {
  return matchesSearch && !task.accepted && task.currentStatus !== "rejected";
}
```
**Filter Criteria:**
- Section: `assignedBy === user.id && !isSelfAssignedOnly && currentStatus !== "rejected"`
- Not accepted
- Not rejected

**Match:** ✅ Should match

---

### 11. WIP
**DashboardScreen Count Logic:**
```typescript
const outboxWIPTasks = outboxAllTasks.filter(task => 
  task.accepted && 
  !isOverdue(task) &&
  task.currentStatus !== "rejected" &&
  (
    task.completionPercentage < 100 || 
    (task.completionPercentage === 100 && !task.readyForReview)
  )
);
```
**Filter Criteria:**
- From: `outboxAllTasks`
- Accepted
- Not overdue
- Not rejected
- Completion: `< 100%` OR (`100%` AND `!readyForReview`)

**ProjectsTasksScreen Filter Logic:**
```typescript
// Section filter: isCreatedByMe && !isSelfAssignedOnly && !rejected
if (localStatusFilter === "wip") {
  return matchesSearch && task.accepted && 
         !isOverdue(task) && 
         task.currentStatus !== "rejected" &&
         (task.completionPercentage < 100 || 
          (task.completionPercentage === 100 && !task.readyForReview));
}
```
**Filter Criteria:**
- Section: `assignedBy === user.id && !isSelfAssignedOnly && currentStatus !== "rejected"`
- Accepted
- Not overdue
- Not rejected
- Completion: `< 100%` OR (`100%` AND `!readyForReview`)

**Match:** ✅ Should match

---

### 12. Reviewing
**DashboardScreen Count Logic:**
```typescript
const outboxReviewingTasks = projectFilteredTasks.filter(task => {
  const assignedTo = task.assignedTo || [];
  const isAssignedToMe = Array.isArray(assignedTo) && assignedTo.includes(user.id);
  const isCreatedByMe = task.assignedBy === user.id;
  
  return !isCreatedByMe &&
         isAssignedToMe &&
         task.completionPercentage === 100 &&
         task.readyForReview === true &&
         task.reviewAccepted !== true;
});
```
**Filter Criteria:**
- From: `projectFilteredTasks` (ALL tasks, not just outboxAllTasks!)
- NOT created by me (`assignedBy !== user.id`)
- Assigned to me (`assignedTo.includes(user.id)`)
- Completion: `=== 100%`
- `readyForReview === true`
- `reviewAccepted !== true`

**ProjectsTasksScreen Filter Logic:**
```typescript
// Section filter: isCreatedByMe && !isSelfAssignedOnly && !rejected
if (localStatusFilter === "reviewing") {
  const assignedTo = task.assignedTo || [];
  const isAssignedToMe = Array.isArray(assignedTo) && assignedTo.includes(user.id);
  const isCreatedByMe = task.assignedBy === user.id;
  const isInProjectFiltered = projectFilteredTasks.some(t => t.id === task.id);
  return matchesSearch && 
         isInProjectFiltered &&
         !isCreatedByMe &&
         isAssignedToMe &&
         task.completionPercentage === 100 &&
         task.readyForReview === true &&
         task.reviewAccepted !== true;
}
```
**Filter Criteria:**
- Section: `assignedBy === user.id && !isSelfAssignedOnly && currentStatus !== "rejected"` ⚠️ **CONFLICT!**
- Then checks: `!isCreatedByMe` (which conflicts with section filter)
- Assigned to me
- Completion: `=== 100%`
- `readyForReview === true`
- `reviewAccepted !== true`

**Match:** ❌ **DOES NOT MATCH!** Section filter requires tasks created by me, but reviewing needs tasks NOT created by me!

---

### 13. Done
**DashboardScreen Count Logic:**
```typescript
const outboxDoneTasks = outboxAllTasks.filter(task => 
  task.completionPercentage === 100 &&
  task.reviewAccepted === true
);
```
**Filter Criteria:**
- From: `outboxAllTasks`
- Completion: `=== 100%`
- `reviewAccepted === true`

**ProjectsTasksScreen Filter Logic:**
```typescript
// Section filter: isCreatedByMe && !isSelfAssignedOnly && !rejected
if (localStatusFilter === "done") {
  return matchesSearch && task.completionPercentage === 100 &&
         task.reviewAccepted === true;
}
```
**Filter Criteria:**
- Section: `assignedBy === user.id && !isSelfAssignedOnly && currentStatus !== "rejected"`
- Completion: `=== 100%`
- `reviewAccepted === true`

**Match:** ✅ Should match

---

### 14. Overdue
**DashboardScreen Count Logic:**
```typescript
const outboxOverdueTasks = outboxAllTasks.filter(task => 
  task.completionPercentage < 100 && 
  isOverdue(task) &&
  task.currentStatus !== "rejected"
);
```
**Filter Criteria:**
- From: `outboxAllTasks`
- Completion: `< 100%`
- Overdue
- Not rejected

**ProjectsTasksScreen Filter Logic:**
```typescript
// Section filter: isCreatedByMe && !isSelfAssignedOnly && !rejected
if (localStatusFilter === "overdue") {
  return matchesSearch && task.completionPercentage < 100 && 
         isOverdue(task) && 
         task.currentStatus !== "rejected";
}
```
**Filter Criteria:**
- Section: `assignedBy === user.id && !isSelfAssignedOnly && currentStatus !== "rejected"`
- Completion: `< 100%`
- Overdue
- Not rejected

**Match:** ✅ Should match

---

## Summary

### Issues Found

1. **Inbox → Reviewing (Button #7):**
   - Section filter: `assignedTo.includes(user.id) && assignedBy !== user.id` (excludes tasks I created)
   - Status filter: Requires `assignedBy === user.id` (tasks I created)
   - Conflict: Section filter removes tasks needed by status filter

2. **Outbox → Reviewing (Button #12):**
   - Section filter: `assignedBy === user.id && !isSelfAssignedOnly` (requires tasks I created)
   - Status filter: Requires `assignedBy !== user.id` (tasks NOT created by me)
   - Conflict: Section filter removes tasks needed by status filter

### Root Cause

The "Reviewing" filters break the standard section definitions:
- **Inbox Reviewing** needs tasks I CREATED (breaks "inbox = tasks assigned to me by others")
- **Outbox Reviewing** needs tasks I'm ASSIGNED TO (breaks "outbox = tasks I created")

### Solution

For "Reviewing" filters, we need to:
1. Skip the section filter when status is "reviewing"
2. Filter directly from `projectFilteredTasks` (all tasks)
3. Apply the special reviewing logic that breaks section rules

