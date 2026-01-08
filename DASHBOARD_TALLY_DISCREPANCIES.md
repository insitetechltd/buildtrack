# Dashboard Button Tally Discrepancies Analysis

## Overview

This document identifies discrepancies between dashboard button counts and the actual filters applied in TasksScreen.

---

## 🔴 Critical Discrepancies

### 1. "Pending Approval" Button (Outbox + Reviewing)

**Location:** Dashboard Priority Summary → Tasks from Me → "Pending Approval"

**Dashboard Count:**
```typescript
// Line 701-709 in DashboardScreen.tsx
const outboxReviewingTasks = projectFilteredTasks.filter(task => {
  const userIdStr = String(user.id);
  const isCreatedByMe = String(task.assignedBy) === userIdStr;
  return isCreatedByMe &&
         task.completionPercentage === 100 &&
         task.status === "submitted_for_review";
});
// Count: outboxReviewingTasks.length
```

**Dashboard Filter:**
```typescript
setSectionFilter("outbox");
setStatusFilter("reviewing");
setButtonLabel("Tasks from me - Pending Approval");
```

**TasksScreen Filter:**
```typescript
// Lines 918-924 in TasksScreen.tsx
if (activeStatusFilter === "reviewing") {
  // REVIEWING: Tasks I submitted for review (that OTHERS assigned to ME)
  // Special case: Breaks outbox definition to show my submissions awaiting approval
  return !isCreatedByMe &&
         isAssignedToMe &&
         task.completionPercentage === 100 &&
         task.status === "submitted_for_review";
}
```

**❌ MISMATCH:**
- **Count shows:** Tasks I CREATED that are submitted for review
- **Filter shows:** Tasks assigned TO ME (not created by me) that are submitted for review
- **Impact:** Button count will be wrong - shows count of tasks I created, but filter shows tasks assigned to me

**Fix Required:**
The count should match the filter logic. Either:
1. Change count to: Tasks assigned TO ME (not created by me) with `status === "submitted_for_review"` and `completionPercentage === 100`
2. OR change filter to: Tasks I CREATED with `status === "submitted_for_review"` and `completionPercentage === 100`

**Recommended Fix:** Change the count to match the filter (option 1), since the button label says "Pending Approval" which implies tasks waiting for MY approval (tasks assigned to me).

---

## ⚠️ Potential Issues

### 2. "Pending my review" Button (Inbox + Reviewing)

**Location:** Dashboard Priority Summary → Tasks for Me → "Pending my review"

**Dashboard Count:**
```typescript
// Lines 598-602 in DashboardScreen.tsx
const inboxReviewingTasks = projectFilteredTasks.filter(task => {
  const isCreatedByMeForReview = String(task.assignedBy) === String(user.id);
  return isCreatedByMeForReview && 
         (task.status === "submitted_for_review" || task.status === "declined");
});
// Count: inboxReviewingTasks.length
```

**Dashboard Filter:**
```typescript
setSectionFilter("inbox");
setStatusFilter("reviewing");
setButtonLabel("Tasks for me - Pending my review");
```

**TasksScreen Filter:**
```typescript
// Lines 806-815 in TasksScreen.tsx
if (activeStatusFilter === "reviewing") {
  const isCreatedByMeForReview = String(task.assignedBy) === userIdStr;
  const matchesReviewing = isCreatedByMeForReview &&
         ((task.status === "submitted_for_review" && task.completionPercentage === 100) ||
          (task.status === "declined"));
  // ... returns matchesReviewing
}
```

**⚠️ POTENTIAL MISMATCH:**
- **Count includes:** All tasks I created with `submitted_for_review` OR `declined` (regardless of completion %)
- **Filter includes:** Tasks I created with:
  - `submitted_for_review` AND `completionPercentage === 100`, OR
  - `declined` (any completion %)
- **Impact:** Count may include tasks with `submitted_for_review` but `completionPercentage < 100`, which won't appear in filter

**Fix Required:**
Update count to match filter:
```typescript
const inboxReviewingTasks = projectFilteredTasks.filter(task => {
  const isCreatedByMeForReview = String(task.assignedBy) === String(user.id);
  return isCreatedByMeForReview && 
         ((task.status === "submitted_for_review" && task.completionPercentage === 100) ||
          (task.status === "declined"));
});
```

---

## ✅ Verified Matches

### 3. "My Action Required Now" Button

**Dashboard Count:** `myOverdueTasks.length + inboxOverdueTasks.length`
**Filter:** `sectionFilter("my_work")` + `statusFilter("overdue")`
**Status:** ✅ Matches

### 4. "Follow Up Now" Button

**Dashboard Count:** `outboxOverdueTasks.length`
**Filter:** `sectionFilter("outbox")` + `statusFilter("overdue")`
**Status:** ✅ Matches

### 5. "New Requests" Button

**Dashboard Count:** `inboxReceivedTasks.length`
**Filter:** `sectionFilter("inbox")` + `statusFilter("received")`
**Status:** ✅ Matches

### 6. "Current Tasks" Button

**Dashboard Count:** `myWIPTasks.length + inboxWIPTasks.length`
**Filter:** `sectionFilter("my_work")` + `statusFilter("wip")`
**Status:** ✅ Matches

### 7. "Pending Acceptance" Button

**Dashboard Count:** `outboxAssignedTasks.length`
**Filter:** `sectionFilter("outbox")` + `statusFilter("assigned")`
**Status:** ✅ Matches

### 8. "Team Proceeding" Button

**Dashboard Count:** `outboxWIPTasks.length`
**Filter:** `sectionFilter("outbox")` + `statusFilter("wip")`
**Status:** ✅ Matches

### 9. "Work Accepted" Button

**Dashboard Count:** `myDoneTasks.length + inboxDoneTasks.length + outboxDoneTasks.length`
**Filter:** `sectionFilter("my_work")` + `statusFilter("done")`
**Status:** ✅ Matches (filter includes all done tasks from my_work, inbox, and outbox)

---

## Summary

### Critical Issues (Must Fix)
1. ❌ **"Pending Approval"** - Count and filter logic are completely different
2. ❌ **"My Action Required Now" (Overdue)** - Count missing `completionPercentage < 100` and `status !== "rejected"` checks
3. ❌ **"Follow Up Now" (Overdue)** - Count missing `completionPercentage < 100` and `status !== "rejected"` checks

### Potential Issues (Should Fix)
4. ⚠️ **"Pending my review"** - Count may include tasks with `submitted_for_review` but `completionPercentage < 100`

### Verified Matches
- ✅ All other 5 buttons match correctly

---

## Recommended Fixes

### Fix 1: "Pending Approval" Button Count

**File:** `src/screens/DashboardScreen.tsx`

**Current (Line 701-709):**
```typescript
const outboxReviewingTasks = projectFilteredTasks.filter(task => {
  const userIdStr = String(user.id);
  const isCreatedByMe = String(task.assignedBy) === userIdStr;
  return isCreatedByMe &&
         task.completionPercentage === 100 &&
         task.status === "submitted_for_review";
});
```

**Should be:**
```typescript
const outboxReviewingTasks = projectFilteredTasks.filter(task => {
  const assignedTo = task.assignedTo || [];
  const userIdStr = String(user.id);
  const isAssignedToMe = Array.isArray(assignedTo) && assignedTo.some(id => String(id) === userIdStr);
  const isCreatedByMe = String(task.assignedBy) === userIdStr;
  return !isCreatedByMe &&  // NOT created by me
         isAssignedToMe &&  // Assigned TO me
         task.completionPercentage === 100 &&
         task.status === "submitted_for_review";
});
```

### Fix 2: "Pending my review" Button Count

**File:** `src/screens/DashboardScreen.tsx`

**Current (Line 598-602):**
```typescript
const inboxReviewingTasks = projectFilteredTasks.filter(task => {
  const isCreatedByMeForReview = String(task.assignedBy) === String(user.id);
  return isCreatedByMeForReview && 
         (task.status === "submitted_for_review" || task.status === "declined");
});
```

**Should be:**
```typescript
const inboxReviewingTasks = projectFilteredTasks.filter(task => {
  const isCreatedByMeForReview = String(task.assignedBy) === String(user.id);
  return isCreatedByMeForReview && 
         ((task.status === "submitted_for_review" && task.completionPercentage === 100) ||
          (task.status === "declined"));
});
```

### Fix 3: "My Action Required Now" (Overdue) Button Count

**File:** `src/screens/DashboardScreen.tsx`

**Current (Line 561-565):**
```typescript
const myOverdueTasks = myTasksAll.filter(task => {
  const status = getTaskStatus(task);
  return (status === "in_progress" || status === "accepted") &&
         isOverdue(task);
});
```

**Should be:**
```typescript
const myOverdueTasks = myTasksAll.filter(task => {
  const status = getTaskStatus(task);
  return (status === "in_progress" || status === "accepted") &&
         task.completionPercentage < 100 &&
         isOverdue(task) &&
         status !== "rejected";
});
```

**Also fix inboxOverdueTasks (Line 613-616):**
```typescript
const inboxOverdueTasks = inboxAll.filter(task => {
  const status = getTaskStatus(task);
  return (status === "in_progress" || status === "accepted") &&
         task.completionPercentage < 100 &&
         isOverdue(task) &&
         status !== "rejected";
});
```

### Fix 4: "Follow Up Now" (Overdue) Button Count

**File:** `src/screens/DashboardScreen.tsx`

**Current (Line 722-725):**
```typescript
const outboxOverdueTasks = outboxAll.filter(task =>
  (task.status === "in_progress" || task.status === "accepted") &&
  isOverdue(task)
);
```

**Should be:**
```typescript
const outboxOverdueTasks = outboxAll.filter(task => {
  const status = getTaskStatus(task);
  return (status === "in_progress" || status === "accepted") &&
         task.completionPercentage < 100 &&
         isOverdue(task) &&
         status !== "rejected";
});
```

---

## Testing Checklist

After fixes, verify:
- [ ] "Pending Approval" count matches filtered results in TasksScreen
- [ ] "Pending my review" count matches filtered results in TasksScreen
- [ ] All other button counts still match their filters
- [ ] No tasks appear in "Catch-All" that should be in main buttons

