# Test Unified Tasks Migration - Quick Guide

## 🚀 Start the App

```bash
cd /Users/tristan/Desktop/BuildTrack
npm start
# or
npx expo start
```

## 📋 Quick Test Scenarios

### Test 1: View Existing Tasks (1 minute)
1. Open the app
2. Navigate to Dashboard
3. **Expected**: All existing tasks and nested tasks should display
4. **Check**: Numbers match what you had before

### Test 2: Create Top-Level Task (2 minutes)
1. Click "Create Task" button
2. Fill in task details
3. Save
4. **Expected**: Task appears in list
5. **Check**: Console has no errors

### Test 3: Create Nested Task (3 minutes)
1. Open an existing task
2. Click "Create Sub-Task"
3. Fill in details
4. Save
5. **Expected**: Subtask appears under parent task
6. **Check**: Console logs show `parent_task_id`, `nesting_level`, `root_task_id`

### Test 4: Create Deeply Nested Task (3 minutes)
1. Open a subtask from Test 3
2. Click "Create Sub-Task" again
3. Fill in details
4. Save  
5. **Expected**: Sub-subtask appears
6. **Check**: `nesting_level` should be 2

### Test 5: View Task Tree (1 minute)
1. Open TaskDetailScreen for a parent task
2. **Expected**: All child tasks listed in "Sub-Tasks" section
3. **Check**: Count matches actual number of children

### Test 6: Update Nested Task (2 minutes)
1. Click on a nested task
2. Change progress to 50%
3. Save
4. **Expected**: Update saves successfully
5. **Check**: Parent task progress updates

### Test 7: Delete Nested Task (2 minutes)
1. Open a nested task
2. Delete it
3. **Expected**: Task disappears from list
4. **Check**: Doesn't appear in parent's children

### Test 8: Delete Parent Task (2 minutes)
1. Open a parent task that has children
2. Delete it
3. **Expected**: Parent AND all children disappear (CASCADE)
4. **Check**: Verify children are gone too

### Test 9: Dashboard Calculations (2 minutes)
1. Go to Dashboard
2. Check all numbers:
   - Urgent tasks
   - New requests
   - Current tasks
   - Pending review
   - Accomplishments
3. **Expected**: Numbers make sense
4. **Check**: Click each box, verify tasks shown match count

### Test 10: Filtering (2 minutes)
1. Navigate to Tasks screen
2. Try different filters:
   - Inbox
   - Outbox
   - My Tasks
   - WIP, Done, Overdue
3. **Expected**: Correct tasks shown for each filter
4. **Check**: Nested tasks appear in appropriate filters

## 🔍 What to Look For

### ✅ Good Signs
- ✅ App loads without errors
- ✅ All tasks visible (count matches before)
- ✅ Can create nested tasks
- ✅ Task tree displays correctly
- ✅ Updates save successfully
- ✅ Dashboard numbers make sense
- ✅ No console errors

### ❌ Bad Signs
- ❌ Console errors about `sub_tasks` table
- ❌ TypeScript errors about `SubTask`
- ❌ Tasks not displaying
- ❌ Can't create nested tasks
- ❌ Dashboard shows 0 for everything
- ❌ App crashes on task operations

## 🐛 Common Issues & Fixes

### Issue: "relation sub_tasks does not exist"
**Fix**: Clear app cache and reload
```bash
npm start -- --clear
```

### Issue: Tasks not showing
**Fix**: Check Supabase connection, verify data migrated
```sql
SELECT COUNT(*) FROM tasks;
SELECT COUNT(*) FROM tasks WHERE parent_task_id IS NULL;
SELECT COUNT(*) FROM tasks WHERE parent_task_id IS NOT NULL;
```

### Issue: TypeScript errors about SubTask
**Fix**: Already fixed in code. If still seeing them:
```bash
# Clear TypeScript cache
rm -rf node_modules/.cache
npm start
```

### Issue: Dashboard numbers don't match
**Fix**: Force refresh in app (pull-to-refresh on Dashboard)

## 📊 Console Checks

### When Fetching Tasks
**Look for:**
```
✅ Fetched tasks from Supabase: 250
```

**Should NOT see:**
```
❌ Error: relation "sub_tasks" does not exist
```

### When Creating Subtask
**Look for:**
```
Creating sub-task with data: {
  parent_task_id: "...",
  nesting_level: 1,  // ✅ Should be present
  root_task_id: "...",  // ✅ Should be present
  ...
}
✅ Sub-task created successfully: ...
```

### When Loading TaskDetail
**Look for:**
```
🔍 Grouping tasks. Total tasks: 50
  📎 Subtask found: "..." (parentId: ...)
    Parent exists in list: true
    ✅ Added to parent's subtask list
📊 Grouping complete: 10 parent groups, 0 standalone subtasks
```

## 🎯 Success Criteria

**Migration is successful if all these pass:**

- [ ] App starts without errors
- [ ] All existing tasks load
- [ ] Nested tasks display under parents
- [ ] Can create new top-level task
- [ ] Can create new nested task (any depth)
- [ ] Can update tasks
- [ ] Can delete tasks
- [ ] Dashboard counts are correct
- [ ] Filtering works properly
- [ ] Task starring works
- [ ] Review workflow works
- [ ] No console errors
- [ ] Performance feels smooth

## 🆘 If Something's Wrong

### Quick Fix Attempts

1. **Clear cache and reload:**
   ```bash
   npm start -- --clear
   ```

2. **Restart Metro bundler:**
   ```bash
   # Kill Metro, then restart
   npm start
   ```

3. **Check database:**
   ```sql
   -- Verify migration succeeded
   SELECT COUNT(*) as total FROM tasks;
   SELECT 
     COUNT(*) FILTER (WHERE parent_task_id IS NULL) as top_level,
     COUNT(*) FILTER (WHERE parent_task_id IS NOT NULL) as nested
   FROM tasks;
   ```

4. **Check for missing data:**
   ```sql
   -- Find any orphaned references
   SELECT COUNT(*) FROM tasks 
   WHERE parent_task_id IS NOT NULL 
   AND parent_task_id NOT IN (SELECT id FROM tasks);
   ```

### If Issues Persist

1. Document the exact error message
2. Check which test scenario failed
3. Review console logs
4. Check `MIGRATION_SUCCESS_SUMMARY.md` for rollback options

## 🎓 Understanding the New Structure

### Top-Level Task
```
Task {
  id: "abc123",
  parentTaskId: null,  // ← No parent = top-level
  nestingLevel: 0,
  title: "Build Foundation"
}
```

### Nested Task (Level 1)
```
Task {
  id: "def456",
  parentTaskId: "abc123",  // ← Points to parent
  nestingLevel: 1,
  rootTaskId: "abc123",
  title: "Pour Concrete"
}
```

### Deeply Nested Task (Level 2)
```
Task {
  id: "ghi789",
  parentTaskId: "def456",  // ← Points to level-1 parent
  nestingLevel: 2,
  rootTaskId: "abc123",    // ← Points to top-level root
  title: "Mix Cement"
}
```

### Tree Structure
```
Build Foundation (abc123)          parentTaskId: null
  └─ Pour Concrete (def456)        parentTaskId: abc123
      └─ Mix Cement (ghi789)       parentTaskId: def456
          └─ Get Materials (jkl012) parentTaskId: ghi789
              └─ ... unlimited depth
```

## 📱 App Features to Test

1. **Dashboard**
   - Urgent tasks count
   - New requests
   - Current tasks
   - Pending review
   - Accomplishments
   - Quick Overview (collapsed/expanded)

2. **Tasks Screen**
   - Inbox filter
   - Outbox filter
   - My Tasks filter
   - Status filters (WIP, Done, Overdue)
   - Task search
   - Sorting

3. **Task Detail**
   - View task info
   - Sub-tasks section
   - Add updates
   - Mark complete
   - Submit for review
   - Accept/reject

4. **Task Creation**
   - Create from Dashboard FAB
   - Create from Tasks screen
   - Create subtask from TaskDetail
   - Create nested subtask (3+ levels)

## 📝 Quick Reference

### Get Top-Level Tasks Only
```typescript
const topLevel = tasks.filter(t => !t.parentTaskId);
```

### Get Children of a Task
```typescript
const children = tasks.filter(t => t.parentTaskId === taskId);
```

### Check if Task is Nested
```typescript
const isNested = !!task.parentTaskId;
```

### Get Task Depth
```typescript
const depth = task.nestingLevel || 0;
```

---

## ✅ Ready to Test!

Open the app and start testing. Check each scenario above.

**Good luck! 🚀**

**Report**: Any issues or success to the team.

