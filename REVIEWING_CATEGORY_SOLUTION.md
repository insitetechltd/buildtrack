# Reviewing Category Solution

## Problem Statement

The Reviewing category conflicts with the standard definitions of Inbox and Outbox.

### Standard Definitions
- **Inbox**: Tasks assigned to me by others (`assignedTo.includes(me) && assignedBy !== me`)
- **Outbox**: Tasks I created and assigned to others (`assignedBy === me && assignedTo !== [me]`)

### Reviewing Category Requirements
- **Inbox → Reviewing**: Tasks I CREATED that are submitted for review (awaiting my action)
- **Outbox → Reviewing**: Tasks I'm ASSIGNED TO that I submitted for review (I submitted them)

**Conflict**: These break the standard Inbox/Outbox rules!

---

## Solution: Special Exception Logic

We handle the Reviewing category as a **special exception** to the standard Inbox/Outbox definitions.

### Implementation Approach

#### Inbox → Reviewing
**Filter**: Tasks I CREATED (`assignedBy === user.id`) that are submitted for review

**Why**: 
- When assignee submits for review, assigner needs to take action
- Assigner sees it in their Inbox (even though they created it)
- This is an exception to the normal Inbox rule

**Code**:
```typescript
// Filter from ALL tasks, not just inboxAllTasks
const inboxReviewingTasks = projectFilteredTasks.filter(task => {
  const isCreatedByMe = task.assignedBy === user.id;
  return isCreatedByMe &&
         task.completionPercentage === 100 &&
         task.readyForReview === true &&
         task.reviewAccepted !== true;
});
```

#### Outbox → Reviewing
**Filter**: Tasks I'm ASSIGNED TO (`assignedTo.includes(user.id) && assignedBy !== user.id`) that I submitted

**Why**:
- When I submit a task for review, I see it in my Outbox (even though I didn't create it)
- This tracks what I submitted
- This is an exception to the normal Outbox rule

**Code**:
```typescript
// Filter from ALL tasks, not just outboxAllTasks
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

---

## Why This Works

### For Assigner (Tristan)
When Dennis submits Task A for review:
- **Tristan's Inbox → Reviewing**: Shows Task A (he created it, awaiting his action)
- **Tristan's Outbox → Reviewing**: Does NOT show Task A (it's not in his standard Outbox)

**Logic**: 
- Inbox Reviewing filters from ALL tasks (not just inboxAllTasks)
- Checks if `assignedBy === Tristan.id` (he created it)
- Shows in Inbox because it requires his action

### For Assignee (Dennis)
When Dennis submits Task A for review:
- **Dennis's Inbox → Reviewing**: Does NOT show Task A (he didn't create it)
- **Dennis's Outbox → Reviewing**: Shows Task A (he's assigned to it, he submitted it)

**Logic**:
- Outbox Reviewing filters from ALL tasks (not just outboxAllTasks)
- Checks if `assignedTo.includes(Dennis.id) && assignedBy !== Dennis.id` (assigned to him, not created by him)
- Shows in Outbox because he submitted it

---

## Implementation in ProjectsTasksScreen

The filtering logic must match DashboardScreen exactly:

### Inbox → Reviewing Filter
```typescript
} else if (localStatusFilter === "reviewing") {
  // Inbox Reviewing: Tasks I CREATED that are submitted for review (awaiting my action)
  const isCreatedByMe = task.assignedBy === user.id;
  return matchesSearch && 
         isCreatedByMe &&
         task.completionPercentage === 100 &&
         task.readyForReview === true &&
         task.reviewAccepted !== true;
}
```

### Outbox → Reviewing Filter
```typescript
} else if (localStatusFilter === "reviewing") {
  // Outbox Reviewing: Tasks I'm ASSIGNED TO that I submitted for review (I submitted them)
  const assignedTo = task.assignedTo || [];
  const isAssignedToMe = Array.isArray(assignedTo) && assignedTo.includes(user.id);
  const isCreatedByMe = task.assignedBy === user.id;
  return matchesSearch && 
         !isCreatedByMe &&
         isAssignedToMe &&
         task.completionPercentage === 100 &&
         task.readyForReview === true &&
         task.reviewAccepted !== true;
}
```

---

## Total Calculation

Because Reviewing tasks use special filters (not from inboxAllTasks/outboxAllTasks), they're added separately:

```typescript
// Inbox Total
const inboxTotal = inboxReceivedTasks.length + 
                   inboxWIPTasks.length + 
                   inboxReviewingTasks.length +  // Special filter
                   inboxDoneTasks.length + 
                   inboxOverdueTasks.length;

// Outbox Total
const outboxTotal = outboxAssignedTasks.length + 
                    outboxWIPTasks.length + 
                    outboxReviewingTasks.length +  // Special filter
                    outboxDoneTasks.length + 
                    outboxOverdueTasks.length;
```

---

## Summary

✅ **Reviewing category uses special exception logic**
✅ **Inbox Reviewing**: Tasks I CREATED awaiting my action
✅ **Outbox Reviewing**: Tasks I'm ASSIGNED TO that I submitted
✅ **Filters applied consistently in DashboardScreen and ProjectsTasksScreen**
✅ **Totals calculated correctly with separate filters**

This solution handles the conflict by making Reviewing a special case that breaks the normal Inbox/Outbox rules for workflow reasons.

