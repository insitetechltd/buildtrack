# Multi-User Task Acceptance Logic (Clarified Requirements)

## Clarified Expected Behavior

1. **First User Accepts → Accepts for ALL**: If the first user accepts the task, it's accepted for all assigned users
2. **First User Rejects → Rejects for ALL**: If the first user rejects the task, it's rejected for all assigned users
3. **Progress Updates**: Only users can update progress if the task has been accepted (by anyone)

## Current Implementation Analysis

### ✅ Issue 1: Acceptance Logic - Mostly Correct

**Current Implementation:**
```typescript
// src/state/taskStore.supabase.ts (lines 894-900)
acceptTask: async (taskId, userId) => {
  await get().updateTask(taskId, { 
    accepted: true,  // ✅ Sets global flag
    currentStatus: "in_progress",
    acceptedBy: userId,  // ✅ Tracks who accepted (first user)
    acceptedAt: new Date().toISOString()
  });
}
```

**Status:** ✅ **CORRECT** - First user to accept sets `accepted = true` for everyone

**However, there's a potential issue:**
- If Paul accepts first, then Sam accepts, `acceptedBy` gets overwritten to Sam's ID
- This is okay if we only care about the first acceptance, but we should prevent subsequent acceptances

**Recommendation:** Add a check to prevent accepting if already accepted:
```typescript
acceptTask: async (taskId, userId) => {
  const task = get().tasks.find(t => t.id === taskId);
  if (task?.accepted === true) {
    // Task already accepted - no need to accept again
    return;
  }
  // ... rest of logic
}
```

---

### ✅ Issue 2: Progress Update Check - CORRECT

**Current Implementation:**
```typescript
// src/screens/TaskDetailScreen.tsx (line 237)
const canUpdateProgress = isTaskCreator || (isAssignedToMe && task.accepted === true);
```

**Status:** ✅ **CORRECT** - Checks if task is accepted (by anyone), which is correct for the clarified requirement

**Logic:**
- Task creator can always update
- Assigned users can update if `task.accepted === true` (accepted by anyone)

---

### ❌ Issue 3: Rejection Logic - NEEDS FIX

**Current Implementation:**
```typescript
// src/state/taskStore.supabase.ts (lines 903-928)
declineTask: async (taskId, userId, reason) => {
  // ...
  await get().updateTask(taskId, { 
    accepted: false,  // ✅ Sets global flag
    declineReason: reason,
    currentStatus: "rejected",  // ✅ Sets global status
    assignedTo: [task.assignedBy], // ⚠️ Re-assigns to creator (removes all assignees!)
  });
}
```

**Problem:**
- Sets `accepted = false` ✅ (correct - rejects for all)
- Sets `currentStatus = "rejected"` ✅ (correct - rejects for all)
- **BUT**: Re-assigns task to creator, removing all assignees
- This might be correct if rejection means "task is cancelled for everyone"
- **OR** it might be wrong if rejection should keep assignees but mark as rejected

**Question:** When a task is rejected, should:
- **Option A**: Remove all assignees and re-assign to creator (current behavior)
- **Option B**: Keep assignees but mark task as rejected (they can't update progress)

**Current behavior suggests Option A** - task is returned to creator when rejected.

**However, there's a potential issue:**
- If Sam rejects first, then Paul tries to accept, what happens?
- Should we prevent accepting if already rejected?
- Should we prevent rejecting if already accepted?

---

## Issues to Address

### 1. Prevent Accepting After Rejection

**Current:** No check - user can accept even if task is rejected

**Should be:**
```typescript
acceptTask: async (taskId, userId) => {
  const task = get().tasks.find(t => t.id === taskId);
  
  // Prevent accepting if already rejected
  if (task?.currentStatus === "rejected" || task?.declineReason) {
    throw new Error('Cannot accept a rejected task');
  }
  
  // Prevent accepting if already accepted (optional - depends on requirements)
  if (task?.accepted === true) {
    // Task already accepted - silently return or show message
    return;
  }
  
  // ... rest of logic
}
```

### 2. Prevent Rejecting After Acceptance

**Current:** No check - user can reject even if task is accepted

**Should be:**
```typescript
declineTask: async (taskId, userId, reason) => {
  const task = get().tasks.find(t => t.id === taskId);
  
  // Prevent rejecting if already accepted
  if (task?.accepted === true) {
    throw new Error('Cannot reject an accepted task');
  }
  
  // Prevent rejecting if already rejected
  if (task?.currentStatus === "rejected" || task?.declineReason) {
    throw new Error('Task is already rejected');
  }
  
  // ... rest of logic
}
```

### 3. Update Acceptance Banner Logic

**Current:** Banner shows if `task.accepted === false`

**Should be:** Banner shows if:
- Task is not accepted (`accepted === false`)
- Task is not rejected (`currentStatus !== "rejected"`)
- User is assigned to the task
- **AND** no one has accepted yet (first user to respond)

**Current Implementation:**
```typescript
// src/screens/TaskDetailScreen.tsx (lines 700-708)
{isAssignedToMe && (() => {
  const userIdStr = String(user.id);
  const hasCurrentUserAccepted = task.accepted === true && 
                                 task.acceptedBy && 
                                 String(task.acceptedBy) === userIdStr;
  return !hasCurrentUserAccepted && !task.declineReason && task.currentStatus !== "rejected";
})() && (
```

**Issue:** This checks if CURRENT user has accepted, but according to clarified requirements, we should check if ANYONE has accepted.

**Should be:**
```typescript
{isAssignedToMe && 
 !task.accepted &&  // No one has accepted yet
 !task.declineReason && 
 task.currentStatus !== "rejected" && (
```

---

## Summary of Required Changes

| Issue | Current Behavior | Expected Behavior | Status |
|-------|------------------|-------------------|--------|
| First user accepts for all | ✅ Works, but allows multiple accepts | ✅ Works, but should prevent subsequent accepts | ⚠️ **NEEDS GUARD** |
| First user rejects for all | ✅ Works, but allows multiple rejects | ✅ Works, but should prevent subsequent rejects | ⚠️ **NEEDS GUARD** |
| Prevent accept after reject | ❌ No check | ✅ Should prevent | ❌ **MISSING** |
| Prevent reject after accept | ❌ No check | ✅ Should prevent | ❌ **MISSING** |
| Progress update check | ✅ Correct | ✅ Correct | ✅ **CORRECT** |
| Acceptance banner | ⚠️ Checks current user | ✅ Should check if anyone accepted | ⚠️ **NEEDS FIX** |

---

## Recommended Fixes

### Fix 1: Add Guards to `acceptTask`
```typescript
acceptTask: async (taskId, userId) => {
  const task = get().tasks.find(t => t.id === taskId);
  if (!task) {
    throw new Error('Task not found');
  }
  
  // Prevent accepting if already rejected
  if (task.currentStatus === "rejected" || task.declineReason) {
    throw new Error('Cannot accept a rejected task');
  }
  
  // Prevent accepting if already accepted (optional - show message instead of error)
  if (task.accepted === true) {
    console.log('Task already accepted by', task.acceptedBy);
    return; // Silently return or show info message
  }
  
  await get().updateTask(taskId, { 
    accepted: true,
    currentStatus: "in_progress",
    acceptedBy: userId,
    acceptedAt: new Date().toISOString()
  });
}
```

### Fix 2: Add Guards to `declineTask`
```typescript
declineTask: async (taskId, userId, reason) => {
  const task = get().tasks.find(t => t.id === taskId);
  if (!task) {
    throw new Error('Task not found');
  }
  
  // Prevent rejecting if already accepted
  if (task.accepted === true) {
    throw new Error('Cannot reject an accepted task');
  }
  
  // Prevent rejecting if already rejected
  if (task.currentStatus === "rejected" || task.declineReason) {
    throw new Error('Task is already rejected');
  }
  
  // ... rest of existing logic
}
```

### Fix 3: Fix Acceptance Banner Logic
```typescript
// src/screens/TaskDetailScreen.tsx
{isAssignedToMe && 
 !task.accepted &&  // No one has accepted yet
 !task.declineReason && 
 task.currentStatus !== "rejected" && (
  // Show accept/reject banner
)}
```

### Fix 4: Update Filter Logic
```typescript
// src/screens/TasksScreen.tsx - "received" filter
if (activeStatusFilter === "received") {
  // Show if task is not accepted AND not rejected
  const isPendingAcceptance = !task.accepted && 
                              !task.declineReason && 
                              task.currentStatus !== "rejected" &&
                              task.completionPercentage < 100;
  return isPendingAcceptance;
}
```

---

## Testing Checklist

After implementing fixes, verify:

- [ ] First user accepts → `accepted = true` for all users
- [ ] Second user tries to accept → prevented or ignored
- [ ] First user rejects → `accepted = false`, `currentStatus = "rejected"` for all users
- [ ] Second user tries to reject → prevented
- [ ] User tries to accept after rejection → prevented with error
- [ ] User tries to reject after acceptance → prevented with error
- [ ] All assigned users can update progress after acceptance
- [ ] No users can update progress after rejection
- [ ] Acceptance banner shows only when no one has accepted/rejected yet
- [ ] Task appears in "new requests" only when not accepted/rejected

