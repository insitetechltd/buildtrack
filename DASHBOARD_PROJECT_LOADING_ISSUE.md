# Dashboard Project Loading Issue - tristan@insitetech.co

## Database Check Results ✅

The database check shows everything is correct:
- **User ID**: `006fe339-c4c6-456f-965a-2a9ff47d35de`
- **Email**: `tristan@insitetech.co`
- **Last Selected Project ID**: `5dce7921-c7ef-4efb-85f3-9466175d220f`
- **Project Name**: "Test Project"
- **Project Status**: `planning`
- **User Assignment**: ✅ User is assigned to this project

## Root Cause Analysis

The issue is in the app logic, not the database. The `getProjectsByUser` function requires BOTH:
1. User assignments to be loaded
2. Projects to be loaded

Looking at the code in `src/state/projectStore.supabase.ts`:
```typescript
getProjectsByUser: (userId) => {
  const assignments = get().getUserProjectAssignments(userId);
  const projectIds = assignments.map(a => a.projectId);
  return get().projects.filter(project => projectIds.includes(project.id));
}
```

If either assignments or projects haven't been fetched yet, `getProjectsByUser` will return an empty array, even though the user has a valid project assignment in the database.

## Potential Issues

1. **Timing Issue**: The project selection logic runs before projects are fully loaded
2. **Initialization Order**: Projects and assignments might not be fetched in the correct order
3. **Loading State**: The `hasInitialized` flag might be set to `true` before projects are actually loaded

## How to Debug

Check the app logs for:
- `🔄 useProjectStoreWithInit: Initializing project store...`
- `✅ Project store initialization complete`
- `📊 [DashboardScreen] Initial project selection logic`
- `User projects: X` (should be 1, not 0)

## Potential Fixes

### Option 1: Ensure projects are loaded before selection logic runs

The `hasInitialized` check in `DashboardScreen.tsx` line 133 might be too lenient:
```typescript
if ((!isLoadingProjects && user) || projects.length > 0) {
  setHasInitialized(true);
}
```

This sets `hasInitialized` to `true` even if projects haven't been fetched yet (if `isLoadingProjects` is false but projects array is empty).

### Option 2: Add explicit check for project loading

Modify the initialization check to ensure projects are actually loaded:
```typescript
useEffect(() => {
  if (user && !isLoadingProjects) {
    // Check if we need to fetch projects
    if (projects.length === 0) {
      fetchProjects();
      fetchUserProjectAssignments(user.id);
    } else {
      setHasInitialized(true);
    }
  }
}, [user, isLoadingProjects, projects.length]);
```

### Option 3: Wait for both projects and assignments

The project selection logic should wait for both:
- Projects to be loaded
- User assignments to be loaded

Currently it only checks `isLoadingProjects`, but should also check if assignments are loaded.

## Recommended Fix

The most likely issue is that `hasInitialized` is being set to `true` before projects are actually loaded. The condition `projects.length > 0` might not be sufficient if projects haven't been fetched yet.

**Fix**: Modify the initialization check to ensure both projects and assignments are loaded before marking as initialized.

