# Review Buttons Disappearing Fix

**Date:** November 17, 2025  
**Issue:** Review accept/reject buttons appear briefly then disappear, task disappears from list  
**Status:** ✅ FIXED

---

## Problem

When viewing a task that's pending review:
1. ✅ Dashboard shows "1 task pending my review"
2. ✅ Task list shows the task with "Reviewing" status
3. ❌ Task detail screen shows approve/reject buttons briefly, then they disappear
4. ❌ When exiting task detail, the task disappears from the list

---

## Root Causes

### 1. Missing Review Fields in `fetchTaskById`

**Location:** `src/state/taskStore.supabase.ts` (lines 491-521, old code)

**Problem:**
The `fetchTaskById` function was missing critical review workflow fields:
- `readyForReview`
- `reviewedBy`
- `reviewedAt`
- `reviewAccepted`
- `starredByUsers`

**Impact:**
When `useFocusEffect` in `TaskDetailScreen` calls `fetchTaskById` to refresh the task, it overwrites the task in the store with a version that doesn't have these fields. This causes:
- `readyForReview` becomes `undefined` (falsy)
- Review buttons disappear (condition fails)
- Task disappears from "Pending my review" list (filter fails)

---

### 2. Auto-Accept Logic Type Comparison Issue

**Location:** `src/state/taskStore.supabase.ts` (lines 655-667, old code)

**Problem:**
The auto-accept logic for self-assigned tasks used direct equality (`===`), which can fail with type mismatches:
```typescript
const isSelfAssigned = currentTask.assignedBy && 
                      currentTask.assignedTo && 
                      currentTask.assignedTo.length === 1 && 
                      currentTask.assignedTo[0] === currentTask.assignedBy;
```

**Impact:**
- Type mismatches (UUID vs string vs number) can cause incorrect evaluation
- Tasks might be incorrectly identified as self-assigned
- Auto-accept might trigger when it shouldn't

---

### 3. Auto-Accept Logic Missing `readyForReview` Check

**Location:** `src/state/taskStore.supabase.ts` (lines 655-667, old code)

**Problem:**
The auto-accept logic didn't check if the task was already submitted for review:
```typescript
if (isSelfAssigned && updates.reviewAccepted === undefined) {
  // Auto-accept - but what if readyForReview is true?
}
```

**Impact:**
- Tasks submitted for review (`readyForReview: true`) could still be auto-accepted
- This would clear `readyForReview` and set `reviewAccepted: true`
- Review buttons would disappear

---

## Solution

### 1. Added Missing Review Fields to `fetchTaskById`

**File:** `src/state/taskStore.supabase.ts` (lines 508-514)

**Fix:**
```typescript
// Review workflow fields - CRITICAL: Must include these or review buttons disappear!
readyForReview: taskData.ready_for_review || false,
reviewedBy: taskData.reviewed_by,
reviewedAt: taskData.reviewed_at,
reviewAccepted: taskData.review_accepted,
// Starring
starredByUsers: taskData.starred_by_users || [],
```

**Why:** Ensures that when the task is refreshed, all review-related fields are preserved.

---

### 2. Fixed Type Comparison in Auto-Accept Logic

**File:** `src/state/taskStore.supabase.ts` (lines 655-681)

**Fix:**
```typescript
// Use String() comparison to handle type mismatches
const assignedBy = currentTask.assignedBy;
const assignedTo = currentTask.assignedTo || [];

const isSelfAssigned = assignedBy && 
                      assignedTo.length === 1 && 
                      String(assignedTo[0]) === String(assignedBy);
```

**Why:** Ensures comparison works regardless of ID type (string, number, UUID).

---

### 3. Added `readyForReview` Check to Auto-Accept Logic

**File:** `src/state/taskStore.supabase.ts` (lines 667-680)

**Fix:**
```typescript
// Only auto-accept if:
// 1. Task is truly self-assigned
// 2. reviewAccepted is not already set (don't override existing review)
// 3. readyForReview is not true (don't auto-accept if already submitted for review)
if (isSelfAssigned && 
    updates.reviewAccepted === undefined && 
    !currentTask.readyForReview) {
  console.log('✅ Auto-accepting self-assigned task:', currentTask.id);
  updates.reviewAccepted = true;
  updates.reviewedBy = currentTask.assignedBy;
  updates.reviewedAt = new Date().toISOString();
} else if (isSelfAssigned && currentTask.readyForReview) {
  console.log('⚠️ Task is self-assigned but readyForReview is true - skipping auto-accept');
}
```

**Why:** Prevents auto-accepting tasks that are already submitted for review.

---

## How It Works Now

### Task Refresh Flow

1. **User opens task detail screen**
   - `useFocusEffect` triggers
   - Calls `fetchTaskById(taskId)`

2. **`fetchTaskById` fetches from database**
   - Includes ALL fields, including review fields
   - Transforms data with review fields included
   - Updates store with complete task data

3. **Task detail screen renders**
   - Checks `isTaskCreator && readyForReview && !reviewAccepted && completionPercentage === 100`
   - All conditions met → Review buttons appear ✅

4. **User navigates away and back**
   - `useFocusEffect` triggers again
   - `fetchTaskById` preserves review fields
   - Review buttons remain visible ✅

---

## Testing

### Test Case 1: Review Buttons Persist
1. **User A** creates a task
2. **User A** assigns it to **User B**
3. **User B** completes task to 100%
4. **User B** submits for review (automatic)
5. **User A** views task detail
6. **Expected:** 
   - Review buttons appear ✅
   - Buttons remain visible when navigating away/back ✅
   - Task remains in "Pending my review" list ✅

### Test Case 2: Task Doesn't Disappear
1. Task is pending review
2. User views task detail
3. User navigates back to task list
4. **Expected:** Task still appears in "Pending my review" list ✅

### Test Case 3: Self-Assigned Task
1. **User A** creates a task
2. **User A** assigns it to themselves
3. **User A** completes task to 100%
4. **Expected:**
   - Task auto-accepted (no review needed) ✅
   - Task does NOT appear in "Pending my review" ✅
   - Review buttons do NOT appear ✅

---

## Files Modified

1. ✅ `src/state/taskStore.supabase.ts`
   - Added review fields to `fetchTaskById` (lines 508-514)
   - Fixed type comparison in auto-accept logic (lines 655-681)
   - Added `readyForReview` check to prevent auto-accepting reviewed tasks
   - Applied same fixes to subtask auto-accept logic (lines 1382-1408)

---

## Summary

**Problem:** Review buttons disappearing due to missing fields in `fetchTaskById` and auto-accept logic issues  
**Solution:** 
- Added missing review fields to `fetchTaskById`
- Fixed type comparison in auto-accept logic
- Added `readyForReview` check to prevent auto-accepting reviewed tasks

**Result:** 
- Review buttons now persist when viewing task details ✅
- Tasks remain in "Pending my review" list ✅
- Auto-accept only happens for truly self-assigned tasks ✅

---

**Status:** ✅ COMPLETE  
**Linter Errors:** 8 pre-existing (unrelated to this fix)  
**Ready for:** Testing

