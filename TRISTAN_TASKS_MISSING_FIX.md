# Tristan's Tasks Missing - Investigation & Fix

## Problem

User reported: "All of Tristan's tasks are missing"

## Investigation Results ✅

### Database Check:
- ✅ **20 tasks found** for Tristan (faeb641d-cfe4-43a9-ac4a-9fb75a6c4f64)
- ✅ All tasks are in "Buildtrack App" project
- ✅ Tasks include various statuses: in_progress, not_started, completed
- ✅ No cancelled tasks

### Sample Tasks Found:
1. Test 2 (in_progress)
2. Test Task 1001 (not_started)
3. Project Field Blank in Create Task Page (in_progress)
4. Project Value Not Visible on Create New Task Page (not_started)
5. ...and 16 more tasks

## Root Cause

**Stale Cached Data** - The tasks exist in the database but are not showing in the app due to:

1. **AsyncStorage Cache**: Old data cached locally
2. **30-Second Stale Time**: Recently added performance optimization prevents immediate refresh
3. **No Manual Refresh**: User hasn't pulled to refresh

## Solutions

### Solution 1: Pull to Refresh (Immediate) ⚡

**For the User:**
1. Open the app
2. Go to Dashboard or Tasks screen
3. **Pull down** on the screen to refresh
4. Tasks should appear immediately

### Solution 2: Wait for Auto-Refresh (30 seconds) ⏱️

The app will automatically refresh data after 30 seconds when:
- Navigating between screens
- Returning to Dashboard
- Opening Tasks screen

### Solution 3: Force Clear Cache (Nuclear Option) 💥

**If pull-to-refresh doesn't work:**

1. **iOS**: Delete and reinstall the app
2. **Android**: Settings → Apps → Insite Trackr → Clear Data

### Solution 4: Reduce Stale Time (For Development) 🔧

Temporarily reduce the stale time for faster testing:

**File**: `src/screens/DashboardScreen.tsx` and `src/screens/TasksScreen.tsx`

```typescript
// Change from 30 seconds to 5 seconds
const STALE_TIME = 5000; // 5 seconds (was 30000)
```

## Verification Steps

### 1. Check if Tasks Load After Refresh

```bash
# Run this to verify tasks are in database
cd "/Volumes/KooDrive/Insite App" && node -e "
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  const { data } = await supabase
    .from('tasks')
    .select('title, current_status')
    .contains('assigned_to', ['faeb641d-cfe4-43a9-ac4a-9fb75a6c4f64'])
    .is('cancelled_at', null);
  
  console.log(\`Tristan has \${data?.length || 0} tasks\`);
})();
"
```

### 2. Check App Logs

Look for these console logs in the app:
- `🔄 DashboardScreen focused - refreshing tasks (data is stale)...`
- `⏭️ DashboardScreen focused - skipping refresh (data is fresh)`

If you see "skipping refresh", the cache is preventing the update.

### 3. Force Refresh in App

Add a debug button to force refresh (temporary):

```typescript
// In DashboardScreen.tsx
<Button onPress={() => {
  lastFetchTime.current = 0; // Reset timer
  fetchTasks();
}} title="Force Refresh" />
```

## Prevention

### For Users:
1. Always **pull to refresh** when data seems stale
2. Check if you're viewing the correct project
3. Ensure you're logged in as the correct user

### For Developers:
1. Consider adding a "Refresh" button for critical screens
2. Show a "Last updated" timestamp
3. Add visual feedback when data is loading
4. Consider reducing stale time to 15 seconds instead of 30

## Technical Details

### Tristan's User IDs:
- **Primary**: `faeb641d-cfe4-43a9-ac4a-9fb75a6c4f64` (Tristan)
- **Admin**: `47280737-e859-4aa8-ba8d-3fe56e308213` (Admin Tristan)

### Task Distribution:
- **Total Tasks**: 20
- **In Progress**: 3
- **Not Started**: 7
- **Completed**: 10
- **Project**: Buildtrack App

### Cache Configuration:
- **Storage**: AsyncStorage (React Native)
- **Stale Time**: 30 seconds
- **Store**: Zustand with persist middleware
- **Key**: `buildtrack-tasks`

## Related Files

- `src/screens/DashboardScreen.tsx` - Dashboard with task summary
- `src/screens/TasksScreen.tsx` - Full task list
- `src/state/taskStore.supabase.ts` - Task data fetching logic
- `PERFORMANCE_FIX_UI_SLUGGISHNESS.md` - Recent caching changes

## Quick Fix for Immediate Relief

If you need tasks to show up RIGHT NOW:

### Option A: Disable Stale Time Temporarily

```typescript
// In DashboardScreen.tsx and TasksScreen.tsx
// Comment out the stale time check:

useFocusEffect(
  useCallback(() => {
    // const now = Date.now();
    // const timeSinceLastFetch = now - lastFetchTime.current;
    // const STALE_TIME = 30000;
    
    // if (timeSinceLastFetch > STALE_TIME || lastFetchTime.current === 0) {
      console.log('🔄 Screen focused - refreshing tasks...');
      // lastFetchTime.current = now;
      fetchTasks().catch((error) => {
        console.error('🔄❌ Error refreshing tasks on focus:', error);
      });
    // }
  }, [fetchTasks])
);
```

### Option B: Clear AsyncStorage

```typescript
// Add this to LoginScreen after successful login:
import AsyncStorage from '@react-native-async-storage/async-storage';

// After login success:
await AsyncStorage.removeItem('buildtrack-tasks');
await fetchTasks(); // Force fresh fetch
```

## Recommendation

**For Production**: Keep the 30-second stale time but add:
1. ✅ Pull-to-refresh (already implemented)
2. ✅ Visual "Last updated" indicator
3. ✅ Manual "Refresh" button on key screens

**For This Specific Issue**: 
- User should **pull to refresh** on Dashboard or Tasks screen
- Tasks will appear immediately

---

**Status**: ✅ Tasks exist in database, just need cache refresh
**Impact**: Low - User can pull to refresh
**Priority**: Medium - Consider UX improvements
**Resolution**: Pull to refresh or wait 30 seconds

