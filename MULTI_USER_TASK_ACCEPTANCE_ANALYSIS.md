# Multi-User Task Acceptance Logic Analysis

## Expected Behavior

1. **Individual Acceptance**: Each assigned user must accept the task individually
2. **Progress Updates**: Only users who have accepted can update progress
3. **Rejection Isolation**: If one user rejects, it doesn't affect other users

## Current Implementation Analysis

### ❌ Issue 1: Individual Acceptance NOT Supported

**Current Implementation:**
- `acceptedBy` is a **single UUID field** (line 340 in `buildtrack.ts`)
- `accepted` is a **single boolean flag** (line 339 in `buildtrack.ts`)

**Problem:**
```typescript
// src/state/taskStore.supabase.ts (lines 894-900)
acceptTask: async (taskId, userId) => {
  await get().updateTask(taskId, { 
    accepted: true,
    currentStatus: "in_progress",
    acceptedBy: userId,  // ⚠️ Overwrites previous acceptedBy
    acceptedAt: new Date().toISOString()
  });
}
```

**What Happens:**
- When Paul accepts: `accepted = true`, `acceptedBy = Paul's ID`
- When Sam accepts: `accepted = true`, `acceptedBy = Sam's ID` (overwrites Paul's!)
- Only the **last user to accept** is tracked
- Previous acceptances are lost

**Expected:**
- Should track an **array of user IDs** who have accepted
- Each user's acceptance should be independent

---

### ❌ Issue 2: Progress Update Check is Incorrect

**Current Implementation:**
```typescript
// src/screens/TaskDetailScreen.tsx (line 237)
const canUpdateProgress = isTaskCreator || (isAssignedToMe && task.accepted === true);
```

**Problem:**
- Checks `task.accepted === true` (global flag)
- Doesn't check if the **current user** has accepted
- For multi-user tasks: if ANYONE accepts, EVERYONE can update progress

**Example Scenario:**
- Task assigned to [Paul, Sam]
- Paul accepts → `accepted = true`, `acceptedBy = Paul's ID`
- Sam can now update progress (even though Sam hasn't accepted!)
- This violates the requirement: "only users who have accepted can update progress"

**Expected:**
```typescript
const hasCurrentUserAccepted = task.acceptedByUsers?.includes(user.id) || false;
const canUpdateProgress = isTaskCreator || (isAssignedToMe && hasCurrentUserAccepted);
```

---

### ❌ Issue 3: Rejection Affects All Users

**Current Implementation:**
```typescript
// src/state/taskStore.supabase.ts (lines 903-928)
declineTask: async (taskId, userId, reason) => {
  // ...
  await get().updateTask(taskId, { 
    accepted: false,  // ⚠️ Global flag - affects everyone
    declineReason: reason,  // ⚠️ Single reason - overwrites others
    currentStatus: "rejected",  // ⚠️ Global status - affects everyone
    assignedTo: [task.assignedBy], // ⚠️ Re-assigns to creator (removes all assignees!)
  });
}
```

**Problem:**
- Sets `accepted = false` globally (affects all users)
- Sets `currentStatus = "rejected"` globally (affects all users)
- Re-assigns task to creator (removes all other assignees!)
- If Sam rejects, Paul's acceptance is lost

**Example Scenario:**
- Task assigned to [Paul, Sam]
- Paul accepts → `accepted = true`, `acceptedBy = Paul's ID`
- Sam rejects → `accepted = false`, `currentStatus = "rejected"`, `assignedTo = [creator]`
- Paul's acceptance is lost
- Paul can no longer update progress
- Task is removed from Paul's list

**Expected:**
- Rejection should be **per-user**
- Other users' acceptances should remain intact
- Task should remain assigned to other users
- Only the rejecting user should be removed from the assignment

---

## Database Schema Issues

### Current Schema (Inferred from Code):
```sql
-- tasks table
accepted BOOLEAN,              -- Single global flag
accepted_by UUID,              -- Single user ID (last to accept)
accepted_at TIMESTAMP,         -- Single timestamp
decline_reason TEXT,           -- Single reason (last to reject)
current_status TEXT,           -- Global status
assigned_to UUID[],             -- Array of user IDs (correct)
```

### Required Schema for Expected Behavior:
```sql
-- Option 1: JSONB array (simpler, but less queryable)
accepted_by_users UUID[],      -- Array of user IDs who accepted
accepted_at_by_user JSONB,     -- { "user_id": "timestamp", ... }
rejected_by_users UUID[],      -- Array of user IDs who rejected
rejected_reasons JSONB,        -- { "user_id": "reason", ... }

-- Option 2: Separate junction table (better for queries)
-- task_user_acceptances table
task_id UUID,
user_id UUID,
accepted_at TIMESTAMP,
rejected_at TIMESTAMP,
rejection_reason TEXT,
PRIMARY KEY (task_id, user_id)
```

---

## Summary of Violations

| Requirement | Current Behavior | Expected Behavior | Status |
|------------|------------------|------------------|--------|
| Individual acceptance | Only last user tracked | All users tracked | ❌ **VIOLATED** |
| Progress updates | Anyone can update if anyone accepted | Only accepted users can update | ❌ **VIOLATED** |
| Rejection isolation | Rejection affects all users | Rejection only affects rejecting user | ❌ **VIOLATED** |

---

## Required Changes

### 1. Database Schema Migration
- Add `accepted_by_users UUID[]` or create `task_user_acceptances` table
- Add `rejected_by_users UUID[]` or use junction table
- Remove or deprecate single `accepted_by` field

### 2. Update TypeScript Types
```typescript
// src/types/buildtrack.ts
export interface Task {
  // ... existing fields ...
  acceptedByUsers?: string[];  // Array of user IDs who accepted
  acceptedAtByUser?: Record<string, string>;  // { userId: timestamp }
  rejectedByUsers?: string[];  // Array of user IDs who rejected
  rejectedReasons?: Record<string, string>;  // { userId: reason }
  // Deprecate:
  // accepted?: boolean;
  // acceptedBy?: string;
  // declineReason?: string;
}
```

### 3. Update `acceptTask` Function
```typescript
acceptTask: async (taskId, userId) => {
  const task = get().tasks.find(t => t.id === taskId);
  const acceptedByUsers = task.acceptedByUsers || [];
  
  // Add user to accepted list if not already there
  if (!acceptedByUsers.includes(userId)) {
    await get().updateTask(taskId, {
      acceptedByUsers: [...acceptedByUsers, userId],
      acceptedAtByUser: {
        ...(task.acceptedAtByUser || {}),
        [userId]: new Date().toISOString()
      }
    });
  }
}
```

### 4. Update `declineTask` Function
```typescript
declineTask: async (taskId, userId, reason) => {
  const task = get().tasks.find(t => t.id === taskId);
  const rejectedByUsers = task.rejectedByUsers || [];
  const rejectedReasons = task.rejectedReasons || {};
  
  // Remove user from accepted list (if they had accepted)
  const acceptedByUsers = (task.acceptedByUsers || []).filter(id => id !== userId);
  
  // Add user to rejected list
  const newRejectedByUsers = rejectedByUsers.includes(userId) 
    ? rejectedByUsers 
    : [...rejectedByUsers, userId];
  
  await get().updateTask(taskId, {
    acceptedByUsers: acceptedByUsers,  // Remove from accepted
    rejectedByUsers: newRejectedByUsers,  // Add to rejected
    rejectedReasons: {
      ...rejectedReasons,
      [userId]: reason
    },
    // Remove user from assigned_to (optional - depends on requirements)
    assignedTo: (task.assignedTo || []).filter(id => id !== userId)
  });
}
```

### 5. Update Progress Update Check
```typescript
// src/screens/TaskDetailScreen.tsx
const acceptedByUsers = task.acceptedByUsers || [];
const hasCurrentUserAccepted = acceptedByUsers.includes(user.id);
const canUpdateProgress = isTaskCreator || (isAssignedToMe && hasCurrentUserAccepted);
```

### 6. Update Filter Logic
```typescript
// src/screens/TasksScreen.tsx
// For "received" filter:
const acceptedByUsers = task.acceptedByUsers || [];
const hasCurrentUserAccepted = acceptedByUsers.includes(userIdStr);
const isPendingAcceptance = !hasCurrentUserAccepted && 
                            !task.rejectedByUsers?.includes(userIdStr);

// For "WIP" filter:
const hasCurrentUserAccepted = task.acceptedByUsers?.includes(userIdStr) || false;
return hasCurrentUserAccepted && /* other conditions */;
```

---

## Migration Strategy

### Phase 1: Add New Fields (Non-Breaking)
1. Add `accepted_by_users UUID[]` column to `tasks` table
2. Add `rejected_by_users UUID[]` column to `tasks` table
3. Migrate existing data:
   - If `accepted = true` and `accepted_by` exists, add to `accepted_by_users`
   - If `decline_reason` exists, add to `rejected_by_users`

### Phase 2: Update Application Logic
1. Update `acceptTask` to use new fields
2. Update `declineTask` to use new fields
3. Update progress update checks
4. Update filter logic

### Phase 3: Deprecate Old Fields (Optional)
1. Mark `accepted`, `accepted_by`, `decline_reason` as deprecated
2. Keep for backward compatibility during transition
3. Remove after full migration

---

## Testing Checklist

After implementing changes, verify:

- [ ] Paul accepts → `acceptedByUsers` includes Paul's ID
- [ ] Sam accepts → `acceptedByUsers` includes both Paul and Sam's IDs
- [ ] Paul can update progress (Paul accepted)
- [ ] Sam can update progress (Sam accepted)
- [ ] Unaccepted user cannot update progress
- [ ] Sam rejects → Sam removed from `acceptedByUsers`, added to `rejectedByUsers`
- [ ] Paul's acceptance remains intact after Sam rejects
- [ ] Paul can still update progress after Sam rejects
- [ ] Task remains assigned to Paul after Sam rejects
- [ ] Task removed from Sam's list after Sam rejects
- [ ] Task still appears in Paul's list after Sam rejects

---

## Related Files

- `src/types/buildtrack.ts`: Task interface definition
- `src/state/taskStore.supabase.ts`: Task acceptance/rejection logic
- `src/screens/TaskDetailScreen.tsx`: Progress update permission check
- `src/screens/TasksScreen.tsx`: Task filtering logic
- `src/screens/DashboardScreen.tsx`: Dashboard task display logic

