# Client Data Refresh Strategy

This document details the comprehensive data refresh strategy used in the BuildTrack app client.

---

## Overview

The app uses a **multi-layered refresh strategy** combining:
1. **Automatic background polling** (periodic)
2. **Event-driven refreshes** (app lifecycle, user actions)
3. **Manual user-initiated refreshes** (pull-to-refresh, buttons)
4. **Optimistic updates** (immediate UI feedback)
5. **Screen-level refreshes** (on navigation)

---

## 1. Automatic Background Polling

### **DataRefreshManager Component**

**Location:** `src/utils/DataRefreshManager.tsx`  
**Runs in:** `AppNavigator.tsx` (root level)

#### **Polling Frequency:**
- **Every 30 seconds** while app is active
- Only runs when user is logged in
- Only runs when app state is `'active'`

#### **Refresh Logic:**

```typescript
// Periodic polling setup
refreshInterval = setInterval(() => {
  if (AppState.currentState === 'active' && user) {
    triggerRefresh();
  }
}, 30000); // 30 seconds
```

#### **Smart Refresh Features:**

1. **Throttling Protection**
   - Minimum 500ms between refreshes
   - Prevents excessive API calls

2. **Change Detection**
   - Generates hash of current data state
   - Only fetches if data hash changed OR 30+ seconds elapsed
   - Avoids unnecessary network requests

3. **Parallel Fetching**
   - Fetches all stores simultaneously:
     - `taskStore.fetchTasks()`
     - `projectStore.fetchProjects()`
     - `projectStore.fetchUserProjectAssignments(user.id)`
     - `userStore.fetchUsers()`

4. **Error Handling**
   - Falls back to cached AsyncStorage data on failure
   - Doesn't crash app if network fails

#### **Data Hash Detection:**

```typescript
const generateDataHash = () => {
  const dataString = JSON.stringify({
    taskCount: taskStore.tasks.length,
    taskIds: taskStore.tasks.map(t => t.id).sort().join(','),
    projectCount: projectStore.projects.length,
    projectIds: projectStore.projects.map(p => p.id).sort().join(','),
    userCount: userStore.users.length,
    assignmentCount: projectStore.userAssignments.length,
  });
  // Returns hash of data state
};
```

**Purpose:** Only refresh if data structure changed, not just timestamp.

---

## 2. App Lifecycle-Driven Refreshes

### **App Foregrounding**

When app comes from background to foreground:

```typescript
const handleAppStateChange = (nextAppState: AppStateStatus) => {
  if (
    appState.current.match(/inactive|background/) &&
    nextAppState === 'active'
  ) {
    console.log('[DataSync] App foregrounded - syncing data...');
    triggerRefresh();
  }
};
```

**Triggers:**
- User switches back to app
- App unlocks from background
- App resumes from suspended state

**Purpose:** Get latest data immediately when user returns to app.

---

### **App Startup**

**Initial Sync on Mount:**

```typescript
useEffect(() => {
  if (!user) return;
  
  // Initial sync
  lastDataHash = generateDataHash();
  triggerRefresh();
  
  // Set up polling and listeners...
}, [user]);
```

**Triggers:**
- When `DataRefreshManager` component mounts
- Only if user is logged in

**Purpose:** Ensure fresh data on app start.

---

## 3. Manual User-Initiated Refreshes

### **Pull-to-Refresh**

**Screens with Pull-to-Refresh:**
- `DashboardScreen.tsx`
- `TasksScreen.tsx`
- `ProfileScreen.tsx`

**Implementation:**

```typescript
const handleRefresh = async () => {
  setIsRefreshing(true);
  
  await Promise.all([
    fetchTasks(),
    fetchProjects(),
    fetchUserProjectAssignments(user.id),
    fetchUsers(),
  ]);
  
  setIsRefreshing(false);
};
```

**User Action:** Pull down on scrollable list  
**Behavior:** Shows refresh indicator, fetches all data in parallel

---

### **Manual Refresh Button (FAB)**

**Location:** `DashboardScreen.tsx`

```typescript
const handleManualRefresh = async () => {
  await Promise.all([
    fetchTasks(),
    fetchProjects(),
    fetchUserProjectAssignments(user.id),
    fetchUsers(),
  ]);
  
  Alert.alert('Success', 'Data refreshed successfully!');
};
```

**User Action:** Tap refresh button (floating action button)  
**Behavior:** Shows success/error alert

---

## 4. Screen-Level Refresh Strategies

### **Screen Focus Refresh**

**Example:** `ProjectDetailScreen.tsx`

```typescript
useFocusEffect(
  React.useCallback(() => {
    if (user?.companyId && projectId) {
      fetchProjectUserAssignments(projectId);
    }
  }, [projectId, user?.companyId])
);
```

**Triggers:** When screen comes into focus (navigation)  
**Purpose:** Ensure screen-specific data is fresh

---

### **Mount-Time Refresh**

**Example:** `TasksScreen.tsx`

```typescript
useEffect(() => {
  if (tasks.length === 0 && !isLoading) {
    taskStore.fetchTasks();
  }
}, []);
```

**Triggers:** When screen component mounts  
**Purpose:** Load data if not already loaded

---

### **Task Detail Refresh**

**Location:** `TaskDetailScreen.tsx`

```typescript
useEffect(() => {
  if (taskId) {
    fetchTaskById(taskId);
  }
  if (subTaskId) {
    fetchTaskById(subTaskId);
  }
}, [taskId, subTaskId, fetchTaskById]);
```

**Triggers:** When task detail screen opens  
**Purpose:** Get latest task data (especially completion percentage)

---

## 5. Optimistic Updates (Immediate Refresh)

### **Pattern:**

```typescript
addTaskUpdate: async (taskId, update) => {
  // 1. OPTIMISTIC: Update local state immediately
  set(state => ({
    tasks: state.tasks.map(task =>
      task.id === taskId
        ? { ...task, completionPercentage: update.completionPercentage }
        : task
    )
  }));
  
  // 2. SYNC: Save to Supabase
  await supabase.from('task_updates').insert({...});
  await supabase.from('tasks').update({...});
  
  // 3. REFRESH: Get latest from DB
  await get().fetchTaskById(taskId);
};
```

**Triggers:** On user actions (update progress, create task, etc.)  
**Purpose:** Instant UI feedback, then sync to database

---

## 6. Mutation Notification System

### **notifyDataMutation()**

**Location:** `src/utils/DataRefreshManager.tsx`

```typescript
export const notifyDataMutation = (mutationType: 'task' | 'project' | 'user' | 'assignment') => {
  // Immediately notify all subscribers
  useTaskStore.setState({ tasks: [...taskStore.tasks] });
  useProjectStore.setState({ projects: [...projectStore.projects] });
  useUserStore.setState({ users: [...userStore.users] });
  
  // Update hash
  lastDataHash = generateDataHash();
};
```

**Usage:** Called after mutations in:
- `CreateTaskScreen.tsx`
- `CreateProjectScreen.tsx`
- `UserManagementScreen.tsx`

**Purpose:** Trigger immediate re-render of all components using stores

---

## Refresh Strategy Summary

| **Refresh Type** | **Trigger** | **Frequency** | **Scope** | **User Control** |
|------------------|-------------|---------------|-----------|------------------|
| **Periodic Polling** | DataRefreshManager | Every 30s | All stores | Automatic |
| **App Foreground** | App state change | On foreground | All stores | Automatic |
| **App Startup** | Component mount | Once per session | All stores | Automatic |
| **Pull-to-Refresh** | User gesture | On demand | All stores | Manual |
| **Manual Button** | User tap | On demand | All stores | Manual |
| **Screen Focus** | Navigation | On screen focus | Screen-specific | Automatic |
| **Component Mount** | Screen mount | Once per mount | Screen-specific | Automatic |
| **Optimistic Update** | User action | Per action | Single item | Automatic |
| **Mutation Notification** | After mutation | Per mutation | All stores | Automatic |

---

## Refresh Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│                  App Startup                            │
│  DataRefreshManager mounts → Initial sync               │
└────────────────────┬──────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│            Background Polling (30s)                     │
│  ┌──────────────────────────────────────────────────┐  │
│  │ 1. Check if app active & user logged in          │  │
│  │ 2. Generate data hash                            │  │
│  │ 3. Compare with last hash                        │  │
│  │ 4. If changed OR 30s elapsed → Fetch            │  │
│  │ 5. Update stores → Persist to AsyncStorage       │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────┬──────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
         ▼                       ▼
┌──────────────────┐   ┌──────────────────┐
│  App Foreground  │   │  User Actions    │
│  - Sync on focus │   │  - Pull refresh  │
│  - Get latest    │   │  - Button tap    │
└──────────────────┘   └──────────────────┘
         │                       │
         └───────────┬───────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│            Screen-Level Refreshes                       │
│  - Screen focus → Fetch screen data                     │
│  - Component mount → Load if empty                     │
│  - Task detail → Fetch specific task                   │
└────────────────────┬──────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│         Optimistic Updates                              │
│  - Update local state immediately                       │
│  - Sync to Supabase in background                       │
│  - Refresh from DB to confirm                           │
└─────────────────────────────────────────────────────────┘
```

---

## Performance Optimizations

### **1. Throttling**
- Minimum 500ms between refreshes (prevents spam)
- 30-second polling interval (balance between freshness and battery)

### **2. Change Detection**
- Hash-based comparison (only refresh if data changed)
- Avoids unnecessary network requests

### **3. Parallel Fetching**
- All stores fetch simultaneously (faster than sequential)
- Uses `Promise.all()` for concurrency

### **4. Error Handling**
- Falls back to cached AsyncStorage data
- Doesn't block UI on network failures
- Continues polling even after errors

### **5. Conditional Execution**
- Only runs when app is active
- Only runs when user is logged in
- Skips if too soon since last refresh

---

## Refresh Priority

**High Priority (Immediate):**
1. User-initiated refresh (pull-to-refresh, button)
2. App foregrounding
3. Optimistic update confirmations

**Medium Priority (Periodic):**
1. Background polling (30s interval)
2. Screen focus refresh

**Low Priority (On-Demand):**
1. Component mount checks
2. Mutation notifications (just re-render, no fetch)

---

## Current Limitations

1. **No Network State Detection**
   - Doesn't detect when network reconnects
   - Requires manual refresh after offline period

2. **Polling-Based (Not Event-Driven)**
   - 30-second delay for updates from other users
   - Could use Supabase Realtime for instant updates

3. **No Refresh Queue**
   - Offline changes require manual refresh
   - No automatic sync queue

4. **Hash Detection Limitations**
   - Only detects structure changes, not content changes
   - Same count/IDs but different content won't trigger refresh

---

## Future Improvements

1. **Supabase Realtime Subscriptions**
   - Instant updates when data changes
   - Reduce polling frequency

2. **Network State Detection**
   - Auto-sync when network reconnects
   - Queue offline changes

3. **Smart Refresh**
   - Refresh only changed data (not full fetch)
   - Use timestamps/ETags for change detection

4. **Background Sync Service**
   - Sync queue for offline changes
   - Retry failed syncs

5. **Refresh Indicators**
   - Show when last sync occurred
   - Show sync status in UI

---

## Summary

The app uses a **comprehensive multi-layered refresh strategy**:

✅ **Automatic**: Background polling every 30s  
✅ **Event-Driven**: App lifecycle events  
✅ **User-Controlled**: Pull-to-refresh, manual buttons  
✅ **Screen-Specific**: Focus and mount refreshes  
✅ **Optimistic**: Immediate UI updates with background sync  

This ensures data stays fresh while balancing performance, battery life, and user experience.

