# Debug Instructions - Task Not Showing

## Quick Check

Since console logs aren't showing, let's try these steps:

### Step 1: Force Refresh Tasks
1. Open the app
2. Navigate to TasksScreen
3. **Pull down to refresh** (swipe down from top)
4. This will call `fetchTasks()` and you should see logs starting with `✅✅✅`

### Step 2: Check React Native Debugger
If using React Native Debugger or Chrome DevTools:
- Make sure **"Preserve log"** is enabled
- Check for logs starting with `🔍🔍🔍` or `✅✅✅`
- Filter console to show only logs (hide warnings/errors)

### Step 3: Check Metro Bundler Terminal
Sometimes logs appear in the Metro bundler terminal instead of the debugger:
- Look at the terminal where you ran `npm start` or `expo start`
- Check for logs there

### Step 4: Add Alert for Testing
If logs still don't show, we can add an Alert popup to verify the task exists.

## What We Know

✅ **Database Check Complete:**
- Task exists: "Testing sub task after schema change"
- Assigned to Peter: `66666666-6666-6666-6666-666666666666`
- In Project A: `0b6fa7e5-0b77-45f7-b359-9e679d6a921c`
- Top-level task (parent_task_id is NULL)
- Not accepted (accepted is NULL)
- Status: not_started

## Potential Issues

1. **Tasks not fetched**: Store might be empty
2. **Task filtered out**: Project filter or user ID mismatch
3. **Cache issue**: Old cached data

## Next Steps

1. Try pull-to-refresh on TasksScreen
2. Check Metro bundler terminal for logs
3. If still no logs, we can add Alert popups instead

