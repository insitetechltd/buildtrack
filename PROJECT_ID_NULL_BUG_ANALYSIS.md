# Project ID Set to Null Bug Analysis

## Problem
When logging in using phone number, after selecting a button on dashboard to view tasks, when selecting a task, the app sets `projectId` to null, causing the tasks screen to show no tasks.

## Root Cause

The issue is in `DashboardScreen.tsx` at **lines 307-315**. There's a validation effect that runs when dependencies change, and it can incorrectly clear the `selectedProjectId` if there's a timing/race condition.

### The Problematic Code

```typescript
// Lines 267-317: Validation effect
useEffect(() => {
  // Skip if we haven't initialized yet, initial selection hasn't run, still loading, or waiting for DB query
  if (!user || !hasInitialized || !hasRunInitialSelection.current || isLoadingProjects || isWaitingForDBQuery.current) return;
  
  // Recalculate to get latest data
  const currentUserProjects = getProjectsByUser(user.id);
  const currentUserProjectCount = currentUserProjects.length;
  
  // ... other checks ...
  
  // ⚠️ PROBLEM: If current selection is invalid (project no longer accessible), clear it
  if (selectedProjectId && !currentUserProjects.some(p => p.id === selectedProjectId)) {
    console.log(`⚠️ [DashboardScreen] Current project no longer accessible, clearing selection`);
    await setSelectedProject(null, user.id); // ← This clears the projectId!
    // Optionally show picker if user has multiple projects
    if (currentUserProjectCount > 1) {
      onNavigateToProjectPicker?.(true); // Allow back
    }
  }
}, [userProjectCount, selectedProjectId, user?.id, hasInitialized, isLoadingProjects]);
```

### Why This Happens with Phone Login

1. **Timing Issue**: When logging in with phone number, user data is fetched using `user.id` instead of `user.email`. This might cause a slight delay in loading project assignments.

2. **Race Condition**: When navigating to TaskDetailScreen and back, or when data refreshes:
   - The validation effect runs
   - `getProjectsByUser(user.id)` might temporarily return an empty or incomplete list
   - The check `!currentUserProjects.some(p => p.id === selectedProjectId)` fails
   - The code incorrectly thinks the project is no longer accessible
   - It clears the `selectedProjectId` to null

3. **Dependency Array**: The effect depends on `userProjectCount`, which might change during data refresh, triggering the validation even when projects are still loading.

## Solution

The validation should be more defensive and check if projects are actually loaded before clearing the selection. Here's the fix:

### Fix 1: Add Loading Check
Add an additional check to ensure projects are fully loaded before validating:

```typescript
// Skip if projects are still loading
if (isLoadingProjects || !hasInitialized) return;

// Get current projects
const currentUserProjects = getProjectsByUser(user.id);

// ⚠️ FIX: Only clear if projects are loaded AND the project is truly invalid
// Don't clear if projects list is empty (might still be loading)
if (selectedProjectId && currentUserProjects.length > 0 && !currentUserProjects.some(p => p.id === selectedProjectId)) {
  console.log(`⚠️ [DashboardScreen] Current project no longer accessible, clearing selection`);
  await setSelectedProject(null, user.id);
}
```

### Fix 2: Add Debounce/Delay
Add a small delay before validation to allow projects to load:

```typescript
// Wait a bit for projects to load
setTimeout(async () => {
  const currentUserProjects = getProjectsByUser(user.id);
  // ... validation logic ...
}, 100); // Small delay to allow data to settle
```

### Fix 3: Check Project Store State
Verify that project assignments are loaded before validating:

```typescript
const { isLoading: isLoadingProjects, getUserProjectAssignments } = projectStore;

// Get assignments to verify they're loaded
const assignments = getUserProjectAssignments(user.id);
if (assignments.length === 0 && isLoadingProjects) {
  // Still loading, skip validation
  return;
}
```

## Recommended Fix

The best fix is **Fix 1** - add a check to ensure projects are loaded before clearing:

```typescript
// If current selection is invalid (project no longer accessible), clear it
// BUT: Only if we have projects loaded (don't clear if projects are still loading)
if (selectedProjectId && 
    currentUserProjects.length > 0 && // ← ADD THIS CHECK
    !currentUserProjects.some(p => p.id === selectedProjectId)) {
  console.log(`⚠️ [DashboardScreen] Current project no longer accessible, clearing selection`);
  await setSelectedProject(null, user.id);
  // Optionally show picker if user has multiple projects
  if (currentUserProjectCount > 1) {
    onNavigateToProjectPicker?.(true); // Allow back
  }
}
```

This prevents the validation from clearing the projectId when projects are still loading or haven't been fetched yet.

