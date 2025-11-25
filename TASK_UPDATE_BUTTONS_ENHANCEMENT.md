# Task Update Buttons Enhancement

## Changes Implemented

### 1. Removed "Edit Task Details" Button
- **Location**: Bottom of TaskDetailScreen (previously lines 1280-1305)
- **Reason**: Replaced with more accessible update buttons

### 2. Added Always-Visible Update Buttons
**Location**: Bottom of task detail screen (replaces Edit button)

**Two buttons side-by-side:**
- **Left Button**: "Update Progress" (Green)
  - Opens the progress update modal
  - Icon: `create-outline`
  - Action: `setShowUpdateModal(true)`

- **Right Button**: "Add Photos" (Blue)
  - Opens photo picker, then update modal
  - Icon: `camera-outline`
  - Action: `handleAddPhotos()` → opens update modal after photos selected

### 3. Updated Permission Logic
**Before:**
```typescript
const canUpdateProgress = isTaskCreator || (isAssignedToMe && task.accepted === true);
```

**After:**
```typescript
const canUpdateProgress = isTaskCreator || isAssignedToMe;
```

**Change**: Assignee can now update progress **even if they haven't accepted the task yet**. This facilitates quicker communication between creator and assignee.

### 4. Enhanced Photo Upload Flow
- When photos are added via "Add Photos" button, the update modal automatically opens
- Photos are pre-filled in the update form
- User can then add description and adjust completion percentage

## UI Layout

```
┌─────────────────────────────────┐
│  Task Details (ScrollView)      │
│  ...                            │
│                                 │
│  [Update Progress] [Add Photos] │ ← New buttons (always visible)
└─────────────────────────────────┘
         [FAB Menu] ← Still available for Edit/Cancel
```

## Benefits

1. ✅ **Faster Updates** - No need to expand FAB menu
2. ✅ **Better Communication** - Both creator and assignee can update easily
3. ✅ **More Accessible** - Buttons always visible, not hidden in menu
4. ✅ **Clearer Intent** - Separate buttons for progress vs photos

## Button Visibility

- **Shown when**: `canUpdateProgress && !isViewingSubTask`
- **Available to**: Both creator and assignee (assignee no longer needs to accept first)
- **Hidden when**: Viewing a subtask (subtasks use different update flow)

## Technical Details

### Button Styling
- Both buttons use `flex-1` for equal width
- `gap-3` for spacing between buttons
- `mb-24` bottom margin to avoid FAB overlap
- Shadow and elevation for depth
- Green for progress, Blue for photos

### Photo Upload Flow
1. User taps "Add Photos"
2. Alert shows: "Take Photo" or "Choose from Library"
3. Photos are uploaded immediately
4. Update modal opens with photos pre-filled
5. User adds description and adjusts completion percentage
6. User submits update

---

**Implementation Date**: 2025-01-20
**Status**: Complete

