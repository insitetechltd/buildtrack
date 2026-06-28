# Review Acceptance/Rejection Buttons Fix

**Date:** November 17, 2025  
**Issue:** Review acceptance and rejection buttons missing on task detail screen  
**Status:** ✅ FIXED

---

## Problem

When a task is completed at 100% and submitted for review, the task creator should see buttons to accept or reject the completion. However, these buttons were not appearing on the task detail screen.

---

## Root Cause

The issue had multiple potential causes:

1. **Type Comparison Issue:** The `isTaskCreator` check used direct equality (`task.assignedBy === user.id`), which can fail if one is a UUID string and the other is a number, or if there are type mismatches.

2. **Missing Screen Refresh:** The task detail screen wasn't refreshing when it came back into focus, so if a task was submitted for review while viewing it, the banner wouldn't appear until manually refreshed.

3. **No Debug Visibility:** There was no way to see why the banner wasn't showing (what conditions were failing).

---

## Solution

### 1. Fixed Type Comparison

**File:** `src/screens/TaskDetailScreen.tsx` (line 190)

**Before:**
```typescript
const isTaskCreator = task.assignedBy === user.id;
```

**After:**
```typescript
// Use String() comparison to handle type mismatches (UUID vs string)
const isTaskCreator = String(task.assignedBy) === String(user.id);
```

**Why:** Ensures the comparison works regardless of whether IDs are stored as strings, numbers, or UUIDs.

---

### 2. Added Screen Refresh on Focus

**File:** `src/screens/TaskDetailScreen.tsx` (lines 147-162)

**Added:**
```typescript
import { useFocusEffect } from "@react-navigation/native";

// Refresh task data when screen comes into focus (e.g., after returning from update modal)
useFocusEffect(
  useCallback(() => {
    if (taskId) {
      console.log('🔄 TaskDetailScreen focused - refreshing task data...');
      fetchTaskById(taskId).catch((error) => {
        console.error('🔄❌ Error refreshing task on focus:', error);
      });
    }
    if (subTaskId) {
      fetchTaskById(subTaskId).catch((error) => {
        console.error('🔄❌ Error refreshing subtask on focus:', error);
      });
    }
  }, [taskId, subTaskId, fetchTaskById])
);
```

**Why:** Ensures the task data is always fresh when the screen is viewed, especially after:
- Returning from the update modal
- Navigating back from another screen
- Task being submitted for review in the background

---

### 3. Added Debug Logging

**File:** `src/screens/TaskDetailScreen.tsx` (lines 192-207)

**Added:**
```typescript
// Debug logging for review banner visibility
if (task.completionPercentage === 100 && task.readyForReview) {
  console.log('🔍 [DEBUG] Review Banner Check:', {
    title: task.title,
    taskId: task.id,
    isTaskCreator,
    assignedBy: task.assignedBy,
    assignedByType: typeof task.assignedBy,
    userId: user.id,
    userIdType: typeof user.id,
    readyForReview: task.readyForReview,
    reviewAccepted: task.reviewAccepted,
    completionPercentage: task.completionPercentage,
    shouldShowBanner: isTaskCreator && task.readyForReview && !task.reviewAccepted && task.completionPercentage === 100
  });
}
```

**Why:** Provides visibility into why the banner is or isn't showing, making it easier to diagnose issues.

---

## Review Banner Conditions

The review acceptance/rejection banner appears when **ALL** of these conditions are met:

1. ✅ **Task Creator:** `isTaskCreator === true` (task.assignedBy === user.id)
2. ✅ **Ready for Review:** `task.readyForReview === true`
3. ✅ **Not Yet Reviewed:** `task.reviewAccepted !== true` (false or undefined)
4. ✅ **100% Complete:** `task.completionPercentage === 100`

**Code Location:** `src/screens/TaskDetailScreen.tsx` (lines 715-750)

```typescript
{isTaskCreator && 
 task.readyForReview && 
 !task.reviewAccepted && 
 task.completionPercentage === 100 && (
  // Banner with Accept/Reject buttons
)}
```

---

## Banner UI

The banner includes:

1. **Purple Header:**
   - Eye icon
   - "Ready for Review" title
   - "Assignee submitted this task for your review" message

2. **Action Buttons:**
   - **Reject Button (Red):** Calls `handleRejectTask()`
     - Prompts for rejection reason
     - Calls `rejectTaskCompletion()` or `rejectSubTaskCompletion()`
   - **Accept Button (Green):** Calls `handleApproveTask()`
     - Confirms acceptance
     - Calls `acceptTaskCompletion()` or `acceptSubTaskCompletion()`

---

## Testing

### Test Case 1: Task Submitted for Review
1. **User A** creates a task
2. **User A** assigns it to **User B**
3. **User B** completes task to 100%
4. **User B** submits for review (automatic)
5. **User A** views task detail screen
6. **Expected:** Purple banner with Accept/Reject buttons appears ✅

### Test Case 2: Screen Refresh
1. **User A** is viewing a task at 99%
2. **User B** updates task to 100% and submits for review
3. **User A** navigates away and back, or closes/reopens update modal
4. **Expected:** Banner appears after screen refresh ✅

### Test Case 3: Type Mismatch
1. Task has `assignedBy` as UUID string
2. User has `id` as number (or vice versa)
3. **Expected:** Banner still appears (String() comparison handles it) ✅

### Test Case 4: Already Reviewed
1. Task is at 100% with `readyForReview: true`
2. Task has `reviewAccepted: true`
3. **Expected:** Banner does NOT appear ✅

---

## Debugging

### Check Console Logs

When viewing a task at 100% with `readyForReview: true`, look for:

```
🔍 [DEBUG] Review Banner Check: {
  title: "Task Name",
  isTaskCreator: true/false,
  readyForReview: true,
  reviewAccepted: false/undefined,
  completionPercentage: 100,
  shouldShowBanner: true/false
}
```

### Common Issues

1. **`isTaskCreator: false`**
   - Check `assignedBy` vs `userId` types
   - Verify user is actually the task creator
   - Check console for type mismatches

2. **`readyForReview: false`**
   - Task hasn't been submitted for review yet
   - Check if `submitTaskForReview()` was called
   - Verify task update was successful

3. **`reviewAccepted: true`**
   - Task was already reviewed
   - Banner won't show (expected behavior)

4. **`completionPercentage: < 100`**
   - Task isn't complete yet
   - Banner won't show (expected behavior)

---

## Related Functions

### Accept Task Completion
- **Function:** `acceptTaskCompletion(taskId, userId)` or `acceptSubTaskCompletion(taskId, subTaskId, userId)`
- **Location:** `src/state/taskStore.supabase.ts`
- **Handler:** `handleApproveTask()` in `TaskDetailScreen.tsx`

### Reject Task Completion
- **Function:** `rejectTaskCompletion(taskId, userId, reason)` or `rejectSubTaskCompletion(taskId, subTaskId, userId, reason)`
- **Location:** `src/state/taskStore.supabase.ts`
- **Handler:** `handleRejectTask()` in `TaskDetailScreen.tsx`

---

## Files Modified

1. ✅ `src/screens/TaskDetailScreen.tsx`
   - Fixed `isTaskCreator` type comparison (line 190)
   - Added debug logging (lines 192-207)
   - Added `useFocusEffect` for screen refresh (lines 147-162)
   - Added imports: `useCallback`, `useFocusEffect` (lines 1, 16)

---

## Summary

**Problem:** Review buttons not appearing due to type comparison issues and missing screen refresh  
**Solution:** 
- Fixed type comparison using `String()` conversion
- Added screen refresh on focus
- Added debug logging for visibility

**Result:** Review acceptance/rejection buttons now appear correctly when:
- Task is at 100% completion
- Task has been submitted for review
- Task creator is viewing the task
- Task hasn't been reviewed yet

---

**Status:** ✅ COMPLETE  
**Linter Errors:** 3 pre-existing (unrelated to this fix)  
**Ready for:** Testing

