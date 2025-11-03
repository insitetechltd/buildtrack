# Data Flow Architecture: Local Stores to Database

This document explains the complete data flow mechanism from local Zustand stores to the Supabase database.

## Overview

BuildTrack uses a **hybrid architecture** combining:
1. **Local State Management** (Zustand with AsyncStorage persistence)
2. **Cloud Database** (Supabase PostgreSQL)
3. **Optimistic Updates** for instant UI feedback
4. **Automatic Synchronization** between local and remote data

---

## Architecture Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    UI Components                             │
│  (React Native Screens, TaskDetailScreen, etc.)             │
└──────────────────────┬──────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              Zustand State Stores                            │
│  (taskStore, userStore, projectStore, companyStore, etc.)  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Optimistic Updates                                    │  │
│  │  - Update local state immediately                      │  │
│  │  - Sync to database in background                      │  │
│  │  - Rollback on failure                                 │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────────┘
                      │
         ┌────────────┴────────────┐
         │                         │
         ▼                         ▼
┌──────────────────┐      ┌──────────────────┐
│  AsyncStorage    │      │   Supabase API    │
│  (Local Cache)   │      │   (PostgreSQL)    │
│                  │      │                   │
│  - Tasks         │      │  - tasks table    │
│  - Users         │      │  - users table    │
│  - Projects      │      │  - projects table │
│  - Companies     │      │  - task_updates   │
└──────────────────┘      └──────────────────┘
```

---

## Data Flow Patterns

### 1. **Store Initialization with Persistence**

All stores use Zustand's `persist` middleware with AsyncStorage:

```typescript
export const useTaskStore = create<TaskStore>()(
  persist(
    (set, get) => ({
      // Store state
      tasks: [],
      isLoading: false,
      error: null,
      
      // Store methods...
    }),
    {
      name: "buildtrack-tasks",           // Storage key
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // Only persist essential data, not loading/error states
        tasks: state.tasks,
        taskReadStatuses: state.taskReadStatuses,
      }),
    }
  )
);
```

**How it works:**
- On app start: Zustand automatically **hydrates** the store from AsyncStorage
- On state change: Zustand automatically **persists** selected state to AsyncStorage
- This provides **offline-first** capability - app works even without network

---

### 2. **Fetching Data (Database → Local Store)**

#### Pattern: **Pull-to-Refresh / On-Demand Fetch**

```typescript
fetchTasks: async () => {
  if (!supabase) {
    // Fallback: Use cached data from AsyncStorage
    set({ tasks: [], isLoading: false, error: 'Supabase not configured' });
    return;
  }

  set({ isLoading: true, error: null });
  
  try {
    // 1. Fetch from Supabase database
    const { data: allTasksData, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (tasksError) throw tasksError;

    // 2. Fetch related data (task updates)
    const { data: taskUpdatesData } = await supabase
      .from('task_updates')
      .select('*')
      .order('timestamp', { ascending: true });

    // 3. Transform database format to app format
    const transformedTasks = (allTasksData || []).map(task => ({
      id: task.id,
      title: task.title,
      completionPercentage: task.completion_percentage,  // snake_case → camelCase
      currentStatus: task.current_status,
      // ... more transformations
    }));

    // 4. Update Zustand store (which auto-persists to AsyncStorage)
    set({ 
      tasks: transformedTasks, 
      isLoading: false 
    });
    
  } catch (error: any) {
    set({ 
      error: error.message, 
      isLoading: false 
    });
  }
}
```

**Data Flow:**
1. **Supabase** → Fetch from PostgreSQL database
2. **Transform** → Convert snake_case DB format to camelCase app format
3. **Zustand Store** → Update local state
4. **AsyncStorage** → Auto-persist (handled by Zustand persist middleware)

---

### 3. **Creating Data (Local Store → Database)**

#### Pattern: **Optimistic Update with Rollback**

```typescript
createTask: async (taskData) => {
  if (!supabase) {
    // Fallback: Local-only creation
    const newTask = { ...taskData, id: Date.now().toString() };
    set(state => ({ tasks: [...state.tasks, newTask] }));
    return newTask.id;
  }

  set({ isLoading: true, error: null });
  
  try {
    // 1. Insert into Supabase database
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        title: taskData.title,
        description: taskData.description,
        project_id: taskData.projectId,
        // ... transform camelCase → snake_case
      })
      .select()
      .single();

    if (error) throw error;

    // 2. Transform response to app format
    const transformedTask = {
      id: data.id,
      title: data.title,
      projectId: data.project_id,
      // ...
    };

    // 3. Update local store
    set(state => ({
      tasks: [...state.tasks, transformedTask],
      isLoading: false
    }));

    return transformedTask.id;
    
  } catch (error: any) {
    set({ isLoading: false, error: error.message });
    throw error;
  }
}
```

**Data Flow:**
1. **UI Action** → User creates task
2. **Supabase Insert** → Save to database first
3. **Transform Response** → Convert DB format to app format
4. **Update Store** → Add to local state
5. **Auto-Persist** → Zustand saves to AsyncStorage

---

### 4. **Updating Data (Local Store → Database)**

#### Pattern: **Optimistic Update with Rollback**

This is the most sophisticated pattern, used for progress updates, status changes, etc.

```typescript
addTaskUpdate: async (taskId, update) => {
  if (!supabase) {
    // Fallback: Local-only update
    const newUpdate = { ...update, id: `update-${Date.now()}` };
    set(state => ({
      tasks: state.tasks.map(task =>
        task.id === taskId
          ? { ...task, updates: [...task.updates, newUpdate] }
          : task
      )
    }));
    return;
  }

  // OPTIMISTIC UPDATE: Store original state for rollback
  const originalTasks = get().tasks;
  
  try {
    // STEP 1: OPTIMISTIC UPDATE - Update local state IMMEDIATELY
    console.log(`⚡ [Optimistic Update] Adding update to task ${taskId} locally`);
    set(state => ({
      tasks: state.tasks.map(task =>
        task.id === taskId
          ? { 
              ...task, 
              updates: [...task.updates, newUpdate],
              completionPercentage: update.completionPercentage,  // ✅ UI updates instantly
              currentStatus: update.status,
              updatedAt: new Date().toISOString(),
            }
          : task
      )
    }));

    // STEP 2: Insert task_update record to database
    const { error: updateError } = await supabase
      .from('task_updates')
      .insert({
        task_id: taskId,
        user_id: update.userId,
        description: update.description,
        completion_percentage: update.completionPercentage,
        status: update.status,
      });

    if (updateError) throw updateError;

    // STEP 3: Update main task record in database
    const { error: taskError } = await supabase
      .from('tasks')
      .update({
        completion_percentage: update.completionPercentage,
        current_status: update.status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', taskId);

    if (taskError) throw taskError;

    // STEP 4: Refresh from database to get latest data (real IDs, timestamps, etc.)
    console.log(`✅ [Optimistic Update] Backend confirmed, refreshing...`);
    await get().fetchTaskById(taskId);
    
  } catch (error: any) {
    // ROLLBACK: Restore original state on failure
    console.error('❌ [Optimistic Update] Backend failed, rolling back');
    set({ tasks: originalTasks });
    throw error;
  }
}
```

**Data Flow:**
1. **Store Original State** → Save copy for potential rollback
2. **Optimistic Update** → Update local state immediately (UI updates instantly)
3. **AsyncStorage** → Auto-persist optimistic update
4. **Database Insert** → Save task_update record
5. **Database Update** → Update main task record
6. **Refresh** → Fetch latest data from DB to sync
7. **On Error** → Rollback to original state

**Benefits:**
- ✅ **Instant UI feedback** - User sees changes immediately
- ✅ **Offline capable** - Works without network (stores in AsyncStorage)
- ✅ **Automatic sync** - Background syncs to database
- ✅ **Error handling** - Rollback on failure

---

## Store-by-Store Breakdown

### **taskStore.supabase.ts**

**Persistence:**
- Stores: `tasks[]`, `taskReadStatuses[]`
- Storage Key: `"buildtrack-tasks"`
- Excludes: `isLoading`, `error` (ephemeral state)

**Data Flow:**
- **Fetch**: `fetchTasks()` → Supabase → Transform → Store → AsyncStorage
- **Create**: `createTask()` → Supabase Insert → Transform → Store → AsyncStorage
- **Update**: `updateTask()` → Optimistic Update → Supabase → Refresh → AsyncStorage
- **Progress**: `addTaskUpdate()` → Optimistic Update → Supabase (2 tables) → Refresh → AsyncStorage

**Special Features:**
- Fetches `tasks` and `task_updates` separately, then merges
- Optimistic updates with rollback
- Auto-refreshes after updates to sync with DB

---

### **userStore.ts**

**Persistence:**
- Stores: `users[]`
- Storage Key: `"buildtrack-users"`
- Excludes: `isLoading`, `error`, `currentUser`

**Data Flow:**
- **Fetch**: `fetchUsers()` → Supabase → Transform → Store → AsyncStorage
- **Create**: `createUser()` → Supabase Insert → Transform → Store → AsyncStorage
- **Update**: `updateUser()` → Supabase Update → Transform → Store → AsyncStorage

**Note:** `currentUser` is stored in `authStore`, not `userStore`

---

### **projectStore.supabase.ts**

**Persistence:**
- Stores: `projects[]`, `userProjectAssignments[]`
- Storage Key: `"buildtrack-projects"`
- Excludes: `isLoading`, `error`

**Data Flow:**
- Fetches projects and assignments separately
- Merges assignments into project data
- Similar optimistic update pattern

---

### **companyStore.ts**

**Persistence:**
- Stores: `companies[]`
- Storage Key: `"buildtrack-companies"`
- Excludes: `isLoading`, `error`

**Data Flow:**
- Standard CRUD operations
- No optimistic updates (companies rarely change)

---

### **authStore.ts**

**Persistence:**
- Stores: `user`, `session`, `isAuthenticated`
- Storage Key: `"buildtrack-auth"`
- **Special:** Uses Supabase's built-in session persistence

**Data Flow:**
- Supabase handles auth session persistence
- User data synced with `userStore`
- Token refresh handled automatically

---

## Supabase Configuration

### **Client Setup** (`src/api/supabase.ts`)

```typescript
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,           // Use AsyncStorage for session
    autoRefreshToken: true,           // Auto-refresh expired tokens
    persistSession: true,             // Persist session across restarts
    detectSessionInUrl: false,       // Not needed for mobile
  },
  realtime: {
    params: {
      eventsPerSecond: 10,            // Real-time event rate limit
    },
  },
});
```

**Features:**
- ✅ Session persistence in AsyncStorage
- ✅ Automatic token refresh
- ✅ Offline capability (cached data)
- ✅ Real-time subscriptions (ready but not fully implemented)

---

## Data Synchronization Strategy

### **1. Write Path (UI → Database)**

```
User Action
    ↓
Zustand Store Method (e.g., addTaskUpdate)
    ↓
[OPTIMISTIC] Update Local State → AsyncStorage (instant)
    ↓
Supabase Insert/Update (async, background)
    ↓
On Success: Refresh from DB (sync)
On Error: Rollback to original state
```

### **2. Read Path (Database → UI)**

```
App Start / Refresh Trigger
    ↓
fetchTasks() / fetchTaskById()
    ↓
Supabase Query
    ↓
Transform DB Format → App Format
    ↓
Update Zustand Store
    ↓
Auto-Persist to AsyncStorage
    ↓
UI Re-renders (React)
```

### **3. Offline Behavior**

```
Network Available:
  - Fetch from Supabase
  - Store in Zustand + AsyncStorage
  - Optimistic updates sync to DB

Network Unavailable:
  - Load from AsyncStorage (cached data)
  - Optimistic updates stored locally
  - Sync when network returns (manual refresh needed)
```

---

## Key Design Decisions

### **1. Why Optimistic Updates?**

- **Instant feedback** - Users see changes immediately
- **Better UX** - No waiting for network round-trip
- **Offline-first** - Works without network

### **2. Why AsyncStorage + Supabase?**

- **AsyncStorage**: Fast local access, offline capability
- **Supabase**: Multi-device sync, real-time updates, backup
- **Hybrid**: Best of both worlds

### **3. Why Separate Fetch and Refresh?**

- **Fetch**: Loads full dataset (on app start, screen open)
- **Refresh**: Updates single item (after mutation)
- **Efficiency**: Don't reload everything when one item changes

### **4. Why Transform Data?**

- **Database**: Uses `snake_case` (PostgreSQL convention)
- **App**: Uses `camelCase` (JavaScript convention)
- **Transform**: Maps between formats seamlessly

---

## Synchronization Mechanisms: AsyncStorage ↔ Supabase

### **1. Automatic Synchronization (DataRefreshManager)**

Located in `src/utils/DataRefreshManager.tsx`, this component runs in the app's root navigator (`AppNavigator.tsx`) and handles automatic syncing:

#### **Sync Triggers:**

1. **App Startup** 
   - Runs initial sync when user logs in
   - Fetches all data from Supabase → Updates stores → Persists to AsyncStorage

2. **App Foregrounding**
   - When app comes from background to foreground
   - Triggers immediate sync to get latest data

3. **Periodic Polling**
   - Every **30 seconds** while app is active
   - Keeps data fresh without user interaction

4. **Manual Refresh**
   - Pull-to-refresh on Dashboard/Tasks screens
   - Calls `syncAllData()` function

#### **Sync Process:**

```typescript
// DataRefreshManager sync flow
triggerRefresh() 
  ↓
Generate data hash (detect changes)
  ↓
Fetch from Supabase (parallel):
  - taskStore.fetchTasks()
  - projectStore.fetchProjects()
  - projectStore.fetchUserProjectAssignments()
  - userStore.fetchUsers()
  ↓
Update Zustand stores (transform data)
  ↓
Auto-persist to AsyncStorage (via Zustand persist middleware)
  ↓
UI re-renders with fresh data
```

#### **Throttling & Optimization:**

- **Minimum refresh interval**: 500ms (prevents excessive refreshes)
- **Data change detection**: Hash-based comparison (only syncs if data changed)
- **Parallel fetching**: All stores sync simultaneously for speed
- **Error handling**: Falls back to cached AsyncStorage data on failure

---

### **2. Store-Level Synchronization**

#### **On State Changes (Write Path):**

```
User Action (e.g., update progress)
  ↓
Store method (e.g., addTaskUpdate)
  ↓
[OPTIMISTIC] Update local state immediately
  ↓
Auto-persist to AsyncStorage (Zustand middleware)
  ↓
Sync to Supabase (async, background)
  ↓
On Success: Refresh from DB → Update store → Persist to AsyncStorage
On Error: Rollback to original state
```

#### **On Data Fetch (Read Path):**

```
fetchTasks() / fetchTaskById()
  ↓
Query Supabase database
  ↓
Transform DB format → App format
  ↓
Update Zustand store
  ↓
Auto-persist to AsyncStorage (Zustand middleware)
  ↓
UI re-renders
```

---

### **3. Initialization & Hydration**

#### **App Startup Flow:**

```
App.tsx
  ↓
Check version → Clear AsyncStorage if version mismatch
  ↓
AppNavigator.tsx
  ↓
DataRefreshManager mounts
  ↓
[IF USER LOGGED IN]
  - Initial sync: Fetch all data from Supabase
  - Update stores
  - Persist to AsyncStorage
[ELSE]
  - Load from AsyncStorage (cached data)
  - User sees cached data until login
```

#### **Store Hydration:**

```typescript
// Zustand persist middleware automatically:
1. On app start: Loads from AsyncStorage → Hydrates store
2. On state change: Saves to AsyncStorage → Persists data
```

---

### **4. Sync Strategy Summary**

| **Sync Type** | **Trigger** | **Frequency** | **Direction** |
|---------------|-------------|---------------|---------------|
| **Periodic Polling** | DataRefreshManager | Every 30 seconds | Supabase → AsyncStorage |
| **Foreground Sync** | App state change | When app comes to foreground | Supabase → AsyncStorage |
| **Optimistic Updates** | User actions | Immediately | AsyncStorage → Supabase |
| **Manual Refresh** | Pull-to-refresh | User-initiated | Supabase → AsyncStorage |
| **Auto-Persist** | State changes | Every state update | Store → AsyncStorage |

---

### **5. Conflict Resolution**

**Current Strategy: Last-Write-Wins**

- When sync happens, Supabase data overwrites local AsyncStorage cache
- Optimistic updates write to Supabase immediately
- If multiple users edit same item: Last successful write wins
- No merge strategy currently implemented

**Example Flow:**
```
User A: Updates task → AsyncStorage (optimistic) → Supabase ✅
User B: Updates same task → AsyncStorage (optimistic) → Supabase ✅
DataRefreshManager: Fetches from Supabase → Overwrites both local caches
Result: User B's changes visible to both (last write wins)
```

---

### **6. Offline Behavior**

#### **When Network Available:**
- ✅ Fetches from Supabase
- ✅ Stores in Zustand + AsyncStorage
- ✅ Optimistic updates sync immediately
- ✅ Periodic sync keeps data fresh

#### **When Network Unavailable:**
- ✅ Loads from AsyncStorage (cached data)
- ✅ Optimistic updates stored locally
- ✅ User can continue working offline
- ⚠️ Changes queue locally (not synced until network returns)
- ⚠️ Requires manual refresh to sync when network returns

**Note:** Currently no automatic sync queue - offline changes require manual refresh to sync.

---

## Current Limitations & Future Improvements

### **Current:**
- ❌ No automatic sync queue for offline changes (requires manual refresh)
- ❌ No conflict resolution beyond last-write-wins
- ❌ No real-time subscriptions (Supabase ready but not used)
- ❌ Periodic polling (30s) instead of event-driven updates

### **Future Improvements:**
- ✅ Real-time subscriptions (Supabase Realtime) for instant updates
- ✅ Background sync queue for offline changes
- ✅ Advanced conflict resolution (merge strategy, timestamps)
- ✅ Network state detection for automatic sync on reconnect
- ✅ Batch operations for better performance
- ✅ Compression for AsyncStorage (currently stores full JSON)

---

## Summary

**Data Flow Pattern:**
1. **UI Action** → Store method called
2. **Optimistic Update** → Local state updated immediately
3. **AsyncStorage** → Auto-persisted by Zustand
4. **Supabase** → Synced to database (async)
5. **Refresh** → Latest data fetched from DB
6. **Rollback** → On error, restore original state

**Key Features:**
- ✅ Offline-first architecture
- ✅ Optimistic updates for instant feedback
- ✅ Automatic persistence to AsyncStorage
- ✅ Background sync to Supabase
- ✅ Error handling with rollback
- ✅ Multi-device synchronization

This architecture provides a **responsive, offline-capable app** with **reliable data synchronization** between local and cloud storage.

