# Task Missing Diagnosis - "Testing sub task after schema change"

## ✅ Database Verification Complete

### Task Exists in Database ✅
- **Title**: "Testing sub task after schema change"
- **ID**: `f92462c6-b619-47f3-8030-04e649a2d8e7`
- **Project**: Project A - Commercial Building (`0b6fa7e5-0b77-45f7-b359-9e679d6a921c`)
- **Parent Task ID**: `NULL` (top-level task) ✅
- **Assigned To**: Peter (`66666666-6666-6666-6666-666666666666`) ✅
- **Assigned By**: John Manager (`11111111-1111-1111-1111-111111111111`) ✅
- **Accepted**: `NULL` (should show in "received") ✅
- **Status**: `not_started` (not rejected) ✅

### Peter's Project Access ✅
- Peter has access to 3 projects:
  1. Project A - Commercial Building ✅ (task is in this project)
  2. Project B - Residential Complex
  3. Test Project 001

## 🔍 Debug Logging Added

I've added comprehensive debug logging to `TasksScreen.tsx` that will show:

1. **Task Store Check**: Whether the task exists in the Zustand store
2. **Project Filtering**: Which projects are being checked
3. **Inbox Filtering**: Whether the task passes inbox criteria
4. **Status Filtering**: Whether the task passes "received" status filter

## 🐛 Potential Issues

### 1. Task Not Fetched into Store
- **Check**: Look for `🔍 [DEBUG] Task NOT found in store` in console
- **Fix**: Refresh data or check `fetchTasks()` is being called

### 2. Selected Project Filter
- **Check**: If `selectedProjectId` is set, tasks from other projects won't show
- **Location**: Line 111-113 in `TasksScreen.tsx`
- **Fix**: Ensure `selectedProjectId` is `null` when viewing "all tasks"

### 3. User ID Mismatch
- **Check**: Console logs show `user_id` vs `assignedTo` array
- **Fix**: Verify Peter's user ID matches `66666666-6666-6666-6666-666666666666`

### 4. Task Not in User's Projects
- **Check**: Console logs show which projects are being processed
- **Fix**: Verify project filtering logic includes "Project A - Commercial Building"

## 📋 Next Steps

1. **Run the app** and navigate to TasksScreen → Inbox → New Requests
2. **Check console logs** for messages starting with `🔍 [DEBUG]`
3. **Share the console output** so we can identify the exact issue

## 🔧 Quick Fixes to Try

### Option 1: Clear Project Filter
If `selectedProjectId` is set, clear it:
```typescript
// In TasksScreen or via filter store
clearSelectedProject();
```

### Option 2: Force Refresh Tasks
Pull to refresh or manually call:
```typescript
taskStore.fetchTasks();
```

### Option 3: Check User ID
Verify Peter's user ID in the app matches:
```
66666666-6666-6666-6666-666666666666
```

The debug logs will reveal the exact issue! 🎯

