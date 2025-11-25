# Project ID Changes Analysis

This document lists all locations in the codebase where `projectId` (or `selectedProjectId`) is changed during application operation.

## Summary

The `projectId` can be changed in the following scenarios:
1. **User manually selects a project** via ProjectPickerScreen
2. **Automatic project selection** in DashboardScreen based on user's project count
3. **Form data updates** in CreateTaskScreen when creating/editing tasks
4. **Database synchronization** when restoring last selected project from database

---

## 1. Project Filter Store (`src/state/projectFilterStore.ts`)

### Primary Function: `setSelectedProject`
**Location:** Lines 58-113

**What it does:**
- Updates `selectedProjectId` in the Zustand store
- Updates local storage (`lastSelectedProjects` per user)
- **Updates database** (`users.last_selected_project_id` column)

**Called from:**
- `ProjectPickerScreen.tsx` - User manually selects a project
- `DashboardScreen.tsx` - Automatic project selection logic

**Database Update:**
```typescript
// Line 76: Updates users table
await supabase
  .from('users')
  .update({ last_selected_project_id: projectId })
  .eq('id', userId);

// Line 102: Clears selection
await supabase
  .from('users')
  .update({ last_selected_project_id: null })
  .eq('id', userId);
```

---

## 2. Project Picker Screen (`src/screens/ProjectPickerScreen.tsx`)

### Function: `handleProjectSelect`
**Location:** Lines 43-72

**What it does:**
- User manually selects a project from the picker
- Calls `setSelectedProject(projectId, user.id)` to update the selected project
- Refreshes all data (tasks, projects, assignments, users) after project change

**Code:**
```typescript
const handleProjectSelect = async (projectId: string) => {
  if (!user) return;
  
  // Only refresh if actually changing projects
  if (selectedProjectId === projectId) {
    onNavigateBack();
    return;
  }
  
  setIsProjectSwitching(true);
  await setSelectedProject(projectId, user.id); // ← Changes projectId
  
  // Refresh all data when project changes
  await Promise.all([
    fetchTasks(),
    fetchProjects(),
    fetchUserProjectAssignments(user.id),
    fetchUsers()
  ]);
  onNavigateBack();
};
```

---

## 3. Dashboard Screen (`src/screens/DashboardScreen.tsx`)

### Multiple Locations Where `setSelectedProject` is Called:

#### A. Initial Project Selection (Lines 165-263)
**When:** On initial load, based on user's project count

**Scenarios:**
1. **No projects** (Line 188):
   ```typescript
   await setSelectedProject(null, user.id);
   ```

2. **Single project** (Line 200):
   ```typescript
   await setSelectedProject(singleProject.id, user.id);
   ```

3. **Multiple projects - Restore from database** (Line 233):
   ```typescript
   await setSelectedProject(lastSelectedFromDB, user.id);
   ```

4. **Multiple projects - Sync current to database** (Line 244):
   ```typescript
   await setSelectedProject(selectedProjectId, user.id);
   ```

#### B. Validation Effect (Lines 267-317)
**When:** After initial selection, when projects change

**Scenarios:**
1. **User has no projects** (Line 280):
   ```typescript
   await setSelectedProject(null, user.id);
   ```

2. **User has multiple projects but no selection** (Line 285-308):
   - Opens project picker (doesn't directly call `setSelectedProject`)
   - User must select manually

---

## 4. Create Task Screen (`src/screens/CreateTaskScreen.tsx`)

### A. Form Data Initialization (Line 271)
**When:** When user projects are loaded and form has no projectId

**Code:**
```typescript
React.useEffect(() => {
  if (userProjects.length > 0 && !formData.projectId) {
    const defaultProjectId = selectedProjectId && userProjects.some(p => p.id === selectedProjectId)
      ? selectedProjectId
      : userProjects[0].id;
    setFormData(prev => ({ ...prev, projectId: defaultProjectId })); // ← Changes form's projectId
  }
}, [userProjects, formData.projectId, selectedProjectId]);
```

### B. Parent Task Project Inheritance (Line 258)
**When:** Creating a sub-task, inherits parent task's projectId

**Code:**
```typescript
setFormData(prev => ({
  ...prev,
  projectId: parentTask.projectId || prev.projectId // ← Sets projectId from parent
}));
```

### C. User Manual Selection (Line 1294)
**When:** User manually selects a project in the project picker modal

**Code:**
```typescript
<Pressable
  onPress={() => {
    setFormData(prev => ({ ...prev, projectId: project.id })); // ← Changes form's projectId
    setShowProjectPicker(false);
  }}
>
```

**Note:** This only changes the form's `projectId`, not the global `selectedProjectId`. The task will be created with this projectId.

---

## 5. Database Updates

### A. Users Table - `last_selected_project_id`
**Location:** `src/state/projectFilterStore.ts` Lines 74-77, 100-103

**When:** 
- User selects a project (updates to projectId)
- User clears selection (updates to null)

**SQL Equivalent:**
```sql
UPDATE users 
SET last_selected_project_id = 'project-id-here' 
WHERE id = 'user-id-here';

-- Or to clear:
UPDATE users 
SET last_selected_project_id = NULL 
WHERE id = 'user-id-here';
```

---

## Important Notes

### 1. Two Types of `projectId`:
- **`selectedProjectId`** (global): Stored in `projectFilterStore`, represents the currently selected project for filtering
- **`formData.projectId`** (local): Used in CreateTaskScreen form, represents the project for the task being created

### 2. Database Synchronization:
- When `setSelectedProject` is called with a `userId`, it updates:
  - Local Zustand store
  - Local storage (AsyncStorage)
  - **Database** (`users.last_selected_project_id`)

### 3. Cross-Device Sync:
- The `last_selected_project_id` in the database allows the selected project to sync across devices
- DashboardScreen checks the database on load to restore the last selected project

### 4. Automatic vs Manual Selection:
- **Automatic:** DashboardScreen auto-selects when user has 1 project
- **Manual:** User selects via ProjectPickerScreen
- **Form-level:** CreateTaskScreen allows selecting a different project for the task being created

---

## Files That Read `projectId` (But Don't Change It)

These files use `projectId` for filtering/display but don't modify it:
- `src/screens/TasksScreen.tsx` - Filters tasks by projectId
- `src/screens/DashboardScreen.tsx` - Filters tasks by selectedProjectId
- `src/screens/ReportsScreen.tsx` - Filters tasks by selectedProjectId
- `src/screens/ProjectsTasksScreen.tsx` - Filters tasks by selectedProjectId
- `src/state/taskStore.supabase.ts` - Fetches tasks by projectId
- `src/state/projectStore.supabase.ts` - Fetches project assignments by projectId

---

## Summary Table

| Location | Function/Method | When | Updates DB? | Updates Store? |
|----------|----------------|------|-------------|----------------|
| `projectFilterStore.ts` | `setSelectedProject` | Called by screens | ✅ Yes | ✅ Yes |
| `ProjectPickerScreen.tsx` | `handleProjectSelect` | User selects project | ✅ Yes (via setSelectedProject) | ✅ Yes |
| `DashboardScreen.tsx` | Initial selection effect | On load | ✅ Yes (via setSelectedProject) | ✅ Yes |
| `DashboardScreen.tsx` | Validation effect | Projects change | ✅ Yes (via setSelectedProject) | ✅ Yes |
| `CreateTaskScreen.tsx` | Form initialization | Projects loaded | ❌ No | ❌ No (form only) |
| `CreateTaskScreen.tsx` | User selection | User picks project | ❌ No | ❌ No (form only) |
| `CreateTaskScreen.tsx` | Parent inheritance | Creating sub-task | ❌ No | ❌ No (form only) |

---

## Recommendations

If you need to track or prevent projectId changes:

1. **Add logging** in `setSelectedProject` to track all changes
2. **Add validation** before allowing project changes
3. **Add confirmation dialogs** if project change should require user confirmation
4. **Monitor database updates** to `users.last_selected_project_id` column
5. **Check form submissions** in CreateTaskScreen to ensure projectId is set correctly

