# All 14 Quick Overview Button Filters

## Purpose
Define the exact filter criteria for COUNTING (DashboardScreen) and DISPLAYING (ProjectsTasksScreen) for all 14 buttons.

---

## My Tasks (4 buttons)

### 1. Rejected
**DashboardScreen COUNT Logic:**
```typescript
// Step 1: Build myAllTasks
const myTasks = projectFilteredTasks.filter(task => {
  const assignedTo = task.assignedTo || [];
  const isAssignedToMe = assignedTo.includes(user.id);
  const isCreatedByMe = task.assignedBy === user.id;
  return (isAssignedToMe && isCreatedByMe) || (isCreatedByMe && task.currentStatus === "rejected");
});

const mySubTasks = projectFilteredTasks.flatMap(task => {
  return collectSubTasksAssignedTo(task.subTasks, user.id)
    .filter(subTask => subTask.assignedBy === user.id)
    .map(subTask => ({ ...subTask, isSubTask: true }));
});

const myAllTasks = [...myTasks, ...mySubTasks];

// Step 2: Filter for rejected
const myRejectedTasks = myAllTasks.filter(task => 
  task.currentStatus === "rejected"
);
```

**ProjectsTasksScreen DISPLAY Filter:**
```typescript
// Filter from ALL tasks (not pre-filtered by section)
const filteredTasks = projectFilteredTasks.filter(task => {
  const assignedTo = task.assignedTo || [];
  const isAssignedToMe = assignedTo.includes(user.id);
  const isCreatedByMe = task.assignedBy === user.id;
  
  // Must be in My Tasks AND rejected
  const isInMyTasks = (isAssignedToMe && isCreatedByMe) || (isCreatedByMe && task.currentStatus === "rejected");
  
  return isInMyTasks && 
         task.currentStatus === "rejected";
});
```

---

### 2. WIP
**DashboardScreen COUNT Logic:**
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

**ProjectsTasksScreen DISPLAY Filter:**
```typescript
const filteredTasks = projectFilteredTasks.filter(task => {
  const assignedTo = task.assignedTo || [];
  const isAssignedToMe = assignedTo.includes(user.id);
  const isCreatedByMe = task.assignedBy === user.id;
  const isSelfAssigned = isCreatedByMe && isAssignedToMe;
  const isAcceptedOrSelfAssigned = task.accepted || (isSelfAssigned && !task.accepted);
  
  const isInMyTasks = (isAssignedToMe && isCreatedByMe) || (isCreatedByMe && task.currentStatus === "rejected");
  
  return isInMyTasks &&
         isAcceptedOrSelfAssigned &&
         task.completionPercentage < 100 &&
         !isOverdue(task) &&
         task.currentStatus !== "rejected";
});
```

---

### 3. Done
**DashboardScreen COUNT Logic:**
```typescript
const myDoneTasks = myAllTasks.filter(task => 
  task.completionPercentage === 100 &&
  task.currentStatus !== "rejected"
);
```

**ProjectsTasksScreen DISPLAY Filter:**
```typescript
const filteredTasks = projectFilteredTasks.filter(task => {
  const assignedTo = task.assignedTo || [];
  const isAssignedToMe = assignedTo.includes(user.id);
  const isCreatedByMe = task.assignedBy === user.id;
  
  const isInMyTasks = (isAssignedToMe && isCreatedByMe) || (isCreatedByMe && task.currentStatus === "rejected");
  
  return isInMyTasks &&
         task.completionPercentage === 100 &&
         task.currentStatus !== "rejected";
});
```

---

### 4. Overdue
**DashboardScreen COUNT Logic:**
```typescript
const myOverdueTasks = myAllTasks.filter(task => 
  task.completionPercentage < 100 && 
  isOverdue(task) &&
  task.currentStatus !== "rejected"
);
```

**ProjectsTasksScreen DISPLAY Filter:**
```typescript
const filteredTasks = projectFilteredTasks.filter(task => {
  const assignedTo = task.assignedTo || [];
  const isAssignedToMe = assignedTo.includes(user.id);
  const isCreatedByMe = task.assignedBy === user.id;
  
  const isInMyTasks = (isAssignedToMe && isCreatedByMe) || (isCreatedByMe && task.currentStatus === "rejected");
  
  return isInMyTasks &&
         task.completionPercentage < 100 &&
         isOverdue(task) &&
         task.currentStatus !== "rejected";
});
```

---

## Inbox (5 buttons)

### 5. Received
**DashboardScreen COUNT Logic:**
```typescript
// Step 1: Build inboxAllTasks
const inboxTasks = projectFilteredTasks.filter(task => {
  const assignedTo = task.assignedTo || [];
  const isAssignedToMe = assignedTo.includes(user.id);
  const isCreatedByMe = task.assignedBy === user.id;
  return isAssignedToMe && !isCreatedByMe;
});

const inboxSubTasks = projectFilteredTasks.flatMap(task => {
  return collectSubTasksAssignedTo(task.subTasks, user.id)
    .filter(subTask => subTask.assignedBy !== user.id)
    .map(subTask => ({ ...subTask, isSubTask: true }));
});

const inboxAllTasks = [...inboxTasks, ...inboxSubTasks];

// Step 2: Filter for received
const inboxReceivedTasks = inboxAllTasks.filter(task => 
  !task.accepted && 
  task.currentStatus !== "rejected"
);
```

**ProjectsTasksScreen DISPLAY Filter:**
```typescript
const filteredTasks = projectFilteredTasks.filter(task => {
  const assignedTo = task.assignedTo || [];
  const isAssignedToMe = assignedTo.includes(user.id);
  const isCreatedByMe = task.assignedBy === user.id;
  
  const isInInbox = isAssignedToMe && !isCreatedByMe;
  
  return isInInbox &&
         !task.accepted &&
         task.currentStatus !== "rejected";
});
```

---

### 6. WIP
**DashboardScreen COUNT Logic:**
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

**ProjectsTasksScreen DISPLAY Filter:**
```typescript
const filteredTasks = projectFilteredTasks.filter(task => {
  const assignedTo = task.assignedTo || [];
  const isAssignedToMe = assignedTo.includes(user.id);
  const isCreatedByMe = task.assignedBy === user.id;
  
  const isInInbox = isAssignedToMe && !isCreatedByMe;
  
  return isInInbox &&
         task.accepted &&
         !isOverdue(task) &&
         task.currentStatus !== "rejected" &&
         (task.completionPercentage < 100 || 
          (task.completionPercentage === 100 && !task.readyForReview));
});
```

---

### 7. Reviewing
**DashboardScreen COUNT Logic:**
```typescript
// Special: Filter from projectFilteredTasks (ALL tasks), not inboxAllTasks
const inboxReviewingTasks = projectFilteredTasks.filter(task => {
  const isCreatedByMe = task.assignedBy === user.id;
  return isCreatedByMe &&
         task.completionPercentage === 100 &&
         task.readyForReview === true &&
         task.reviewAccepted !== true;
});
```

**ProjectsTasksScreen DISPLAY Filter:**
```typescript
// Special: Filter from ALL tasks (breaks inbox definition)
const filteredTasks = projectFilteredTasks.filter(task => {
  const isCreatedByMe = task.assignedBy === user.id;
  
  return isCreatedByMe &&
         task.completionPercentage === 100 &&
         task.readyForReview === true &&
         task.reviewAccepted !== true;
});
```

---

### 8. Done
**DashboardScreen COUNT Logic:**
```typescript
const inboxDoneTasks = inboxAllTasks.filter(task => 
  task.completionPercentage === 100 &&
  task.reviewAccepted === true
);
```

**ProjectsTasksScreen DISPLAY Filter:**
```typescript
const filteredTasks = projectFilteredTasks.filter(task => {
  const assignedTo = task.assignedTo || [];
  const isAssignedToMe = assignedTo.includes(user.id);
  const isCreatedByMe = task.assignedBy === user.id;
  
  const isInInbox = isAssignedToMe && !isCreatedByMe;
  
  return isInInbox &&
         task.completionPercentage === 100 &&
         task.reviewAccepted === true;
});
```

---

### 9. Overdue
**DashboardScreen COUNT Logic:**
```typescript
const inboxOverdueTasks = inboxAllTasks.filter(task => 
  task.completionPercentage < 100 && 
  isOverdue(task) &&
  task.currentStatus !== "rejected"
);
```

**ProjectsTasksScreen DISPLAY Filter:**
```typescript
const filteredTasks = projectFilteredTasks.filter(task => {
  const assignedTo = task.assignedTo || [];
  const isAssignedToMe = assignedTo.includes(user.id);
  const isCreatedByMe = task.assignedBy === user.id;
  
  const isInInbox = isAssignedToMe && !isCreatedByMe;
  
  return isInInbox &&
         task.completionPercentage < 100 &&
         isOverdue(task) &&
         task.currentStatus !== "rejected";
});
```

---

## Outbox (5 buttons)

### 10. Assigned
**DashboardScreen COUNT Logic:**
```typescript
// Step 1: Build outboxAllTasks
const outboxTasks = projectFilteredTasks.filter(task => {
  const assignedTo = task.assignedTo || [];
  const isAssignedToMe = assignedTo.includes(user.id);
  const isCreatedByMe = task.assignedBy === user.id;
  const isSelfAssignedOnly = isCreatedByMe && isAssignedToMe && assignedTo.length === 1;
  return isCreatedByMe && !isSelfAssignedOnly && task.currentStatus !== "rejected";
});

const outboxSubTasks = projectFilteredTasks.flatMap(task => {
  return collectSubTasksAssignedBy(task.subTasks, user.id)
    .filter(subTask => {
      const assignedTo = subTask.assignedTo || [];
      const isAssignedToMe = !assignedTo.includes(user.id);
      return isAssignedToMe && subTask.currentStatus !== "rejected";
    })
    .map(subTask => ({ ...subTask, isSubTask: true }));
});

const outboxAllTasks = [...outboxTasks, ...outboxSubTasks];

// Step 2: Filter for assigned
const outboxAssignedTasks = outboxAllTasks.filter(task => 
  !task.accepted && 
  task.currentStatus !== "rejected"
);
```

**ProjectsTasksScreen DISPLAY Filter:**
```typescript
const filteredTasks = projectFilteredTasks.filter(task => {
  const assignedTo = task.assignedTo || [];
  const isAssignedToMe = assignedTo.includes(user.id);
  const isCreatedByMe = task.assignedBy === user.id;
  const isSelfAssignedOnly = isCreatedByMe && isAssignedToMe && assignedTo.length === 1;
  
  const isInOutbox = isCreatedByMe && !isSelfAssignedOnly && task.currentStatus !== "rejected";
  
  return isInOutbox &&
         !task.accepted &&
         task.currentStatus !== "rejected";
});
```

---

### 11. WIP
**DashboardScreen COUNT Logic:**
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

**ProjectsTasksScreen DISPLAY Filter:**
```typescript
const filteredTasks = projectFilteredTasks.filter(task => {
  const assignedTo = task.assignedTo || [];
  const isAssignedToMe = assignedTo.includes(user.id);
  const isCreatedByMe = task.assignedBy === user.id;
  const isSelfAssignedOnly = isCreatedByMe && isAssignedToMe && assignedTo.length === 1;
  
  const isInOutbox = isCreatedByMe && !isSelfAssignedOnly && task.currentStatus !== "rejected";
  
  return isInOutbox &&
         task.accepted &&
         !isOverdue(task) &&
         task.currentStatus !== "rejected" &&
         (task.completionPercentage < 100 || 
          (task.completionPercentage === 100 && !task.readyForReview));
});
```

---

### 12. Reviewing
**DashboardScreen COUNT Logic:**
```typescript
// Special: Filter from projectFilteredTasks (ALL tasks), not outboxAllTasks
const outboxReviewingTasks = projectFilteredTasks.filter(task => {
  const assignedTo = task.assignedTo || [];
  const isAssignedToMe = assignedTo.includes(user.id);
  const isCreatedByMe = task.assignedBy === user.id;
  
  return !isCreatedByMe &&
         isAssignedToMe &&
         task.completionPercentage === 100 &&
         task.readyForReview === true &&
         task.reviewAccepted !== true;
});
```

**ProjectsTasksScreen DISPLAY Filter:**
```typescript
// Special: Filter from ALL tasks (breaks outbox definition)
const filteredTasks = projectFilteredTasks.filter(task => {
  const assignedTo = task.assignedTo || [];
  const isAssignedToMe = assignedTo.includes(user.id);
  const isCreatedByMe = task.assignedBy === user.id;
  
  return !isCreatedByMe &&
         isAssignedToMe &&
         task.completionPercentage === 100 &&
         task.readyForReview === true &&
         task.reviewAccepted !== true;
});
```

---

### 13. Done
**DashboardScreen COUNT Logic:**
```typescript
const outboxDoneTasks = outboxAllTasks.filter(task => 
  task.completionPercentage === 100 &&
  task.reviewAccepted === true
);
```

**ProjectsTasksScreen DISPLAY Filter:**
```typescript
const filteredTasks = projectFilteredTasks.filter(task => {
  const assignedTo = task.assignedTo || [];
  const isAssignedToMe = assignedTo.includes(user.id);
  const isCreatedByMe = task.assignedBy === user.id;
  const isSelfAssignedOnly = isCreatedByMe && isAssignedToMe && assignedTo.length === 1;
  
  const isInOutbox = isCreatedByMe && !isSelfAssignedOnly && task.currentStatus !== "rejected";
  
  return isInOutbox &&
         task.completionPercentage === 100 &&
         task.reviewAccepted === true;
});
```

---

### 14. Overdue
**DashboardScreen COUNT Logic:**
```typescript
const outboxOverdueTasks = outboxAllTasks.filter(task => 
  task.completionPercentage < 100 && 
  isOverdue(task) &&
  task.currentStatus !== "rejected"
);
```

**ProjectsTasksScreen DISPLAY Filter:**
```typescript
const filteredTasks = projectFilteredTasks.filter(task => {
  const assignedTo = task.assignedTo || [];
  const isAssignedToMe = assignedTo.includes(user.id);
  const isCreatedByMe = task.assignedBy === user.id;
  const isSelfAssignedOnly = isCreatedByMe && isAssignedByMe && assignedTo.length === 1;
  
  const isInOutbox = isCreatedByMe && !isSelfAssignedOnly && task.currentStatus !== "rejected";
  
  return isInOutbox &&
         task.completionPercentage < 100 &&
         isOverdue(task) &&
         task.currentStatus !== "rejected";
});
```

---

## Key Differences Between COUNT and DISPLAY

1. **COUNT (DashboardScreen):**
   - Filters from pre-built section lists (`myAllTasks`, `inboxAllTasks`, `outboxAllTasks`)
   - Exception: Reviewing filters from `projectFilteredTasks` (all tasks)

2. **DISPLAY (ProjectsTasksScreen):**
   - Filters directly from `projectFilteredTasks` (all tasks)
   - First checks if task is in correct section
   - Then applies status filter

3. **Special Cases:**
   - **Reviewing buttons:** Filter from ALL tasks (not section-filtered)
   - **Rejected tasks:** Included in My Tasks if `createdByMe && rejected`

---

## Implementation Strategy

For ProjectsTasksScreen, we should:
1. Remove the complex `getAllTasks()` + section filter + status filter chain
2. Instead, apply the exact filter logic shown above for each button
3. This ensures COUNT and DISPLAY use identical logic

