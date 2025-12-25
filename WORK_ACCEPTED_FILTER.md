# "Work Accepted" Filter Logic

## Overview

The "Work Accepted" filter (also called "Accomplishments - Work Accepted") shows all tasks that are:
- ✅ **100% complete** (`completionPercentage === 100`)
- ✅ **Review accepted** (`reviewAccepted === true`)

## Filter Location

**Dashboard Screen** → **Accomplishments Section** → **"Work Accepted"** button

When clicked, it navigates to TasksScreen with:
- `sectionFilter = "my_work"`
- `statusFilter = "done"`
- `buttonLabel = "Report Cards - Work Accepted"`

## What Tasks Are Included

The filter includes tasks from three categories:

### 1. My Tasks (Self-Assigned)
**Location**: `src/screens/DashboardScreen.tsx` lines 447-450
```typescript
const myDoneTasks = myTasksAll.filter(task => 
  task.completionPercentage === 100 &&
  task.reviewAccepted === true
);
```

**Includes**:
- Tasks you created AND assigned to yourself
- Must be 100% complete
- Must have review accepted

### 2. Inbox Tasks (Assigned to You by Others)
**Location**: `src/screens/DashboardScreen.tsx` lines 534-537
```typescript
const inboxDoneTasks = inboxAll.filter(task =>
  task.completionPercentage === 100 &&
  task.reviewAccepted === true
);
```

**Includes**:
- Tasks assigned TO you BY others
- Must be 100% complete
- Must have review accepted

### 3. Outbox Tasks (Assigned by You to Others)
**Location**: `src/screens/DashboardScreen.tsx` lines 627-628
```typescript
const outboxDoneTasks = outboxAll.filter(task => {
  const matches = task.completionPercentage === 100 && task.reviewAccepted === true;
  return matches;
});
```

**Includes**:
- Tasks you created and assigned to others
- Must be 100% complete
- Must have review accepted

## Filter Logic in TasksScreen

**Location**: `src/screens/TasksScreen.tsx` lines 602-629

When viewing "Work Accepted" (section="my_work", status="done"):

```typescript
if (activeStatusFilter === "done") {
  // Outbox tasks (created by me but not assigned to me)
  if (isInOutbox) {
    return task.completionPercentage === 100 &&
           task.reviewAccepted === true;
  } 
  // My tasks (self-assigned)
  else if (isInMyTasks) {
    // For self-assigned tasks: show if completed at 100%
    // (reviewAccepted not required since they're auto-accepted)
    if (isSelfAssignedOnly) {
      return task.completionPercentage === 100;
    } else {
      return task.completionPercentage === 100 &&
             task.reviewAccepted === true;
    }
  } 
  // Inbox tasks (assigned to me by others)
  else if (isInInbox) {
    return task.completionPercentage === 100 &&
           task.reviewAccepted === true;
  }
}
```

## Key Conditions

### Required Fields:
1. **completionPercentage === 100**
   - Task must be fully complete

2. **reviewAccepted === true**
   - Task must have been reviewed and accepted
   - Exception: Self-assigned-only tasks may not require reviewAccepted

### Excluded:
- Tasks with `completionPercentage < 100`
- Tasks with `reviewAccepted !== true` (unless self-assigned-only)
- Tasks with `currentStatus === "rejected"`

## Count Display

The dashboard shows the total count:
```typescript
{myDoneTasks.length + inboxDoneTasks.length + outboxDoneTasks.length}
```

This is the sum of all three categories above.

## Visual Representation

```
Work Accepted
├── My Tasks Done (self-assigned, 100%, review accepted)
├── Inbox Done (assigned to me, 100%, review accepted)
└── Outbox Done (assigned by me, 100%, review accepted)
```

## Code References

- **Dashboard Count**: `src/screens/DashboardScreen.tsx:1100`
- **Navigation**: `src/screens/DashboardScreen.tsx:1089-1094`
- **Filter Logic**: `src/screens/TasksScreen.tsx:602-629`
- **My Tasks Done**: `src/screens/DashboardScreen.tsx:447-450`
- **Inbox Done**: `src/screens/DashboardScreen.tsx:534-537`
- **Outbox Done**: `src/screens/DashboardScreen.tsx:627-628`

## Translation Keys

- English: `t.dashboard.workAccepted` = "Work\nAccepted"
- Chinese: `t.dashboard.workAccepted` = "接受的工作"

---

**Summary**: The "Work Accepted" filter shows all tasks that are 100% complete and have been reviewed and accepted, regardless of whether they're self-assigned, assigned to you, or assigned by you to others.




