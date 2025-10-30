# Project Picker Bug Analysis

## Problem

Users report that the app unexpectedly loads another project without explicitly choosing it.

## Root Cause

Located in `src/screens/DashboardScreen.tsx` lines 122-176.

### Issue 1: Overly Aggressive useEffect Dependencies

```typescript
useEffect(() => {
  // Auto-selection logic...
}, [user?.id, hasInitialized, userProjectCount, selectedProjectId]);
```

The `userProjectCount` dependency causes this effect to re-run whenever:
- Projects are refreshed (pull-to-refresh)
- Background data sync occurs
- Project assignments are updated
- Component re-renders for any reason

### Issue 2: Auto-Selection on Single Project

```typescript
// Case 2: User has exactly 1 project → Auto-select it
if (userProjectCount === 1) {
  const singleProject = userProjects[0];
  if (selectedProjectId !== singleProject.id) {
    console.log(`   → Single project, auto-selecting: ${singleProject.name}`);
    setSelectedProject(singleProject.id, user.id);
  }
  return;
}
```

This automatically selects a project even if:
- User explicitly deselected it
- User is viewing a different screen
- Data is being refreshed in the background

### Issue 3: Auto-Restoration of Last Selected Project

```typescript
// No valid selection - check for last selected project
const lastSelected = getLastSelectedProject(user.id);
const isLastSelectedValid = lastSelected && userProjects.some(p => p.id === lastSelected);

if (isLastSelectedValid) {
  // Restore last selected project
  console.log(`   → Restoring last selected project: ${lastSelected}`);
  setSelectedProject(lastSelected, user.id);
  return;
}
```

This can cause unexpected project switching when:
- Projects list is updated
- User's project assignments change
- Component re-renders after navigation

## When Bug Occurs

1. User is working in Project A
2. Background data sync occurs (every 3 minutes via DataSyncManager)
3. The sync causes `userProjectCount` or `projects` array to update
4. useEffect triggers and runs auto-selection logic
5. Project switches unexpectedly to Project B (last selected or single project)

## Solution

The fix should:

1. **Track explicit user selections**: Add a flag to distinguish between user-initiated selections and automatic selections
2. **Only auto-select on initial mount**: Don't re-run auto-selection logic on every data refresh
3. **Be conservative**: Only auto-select when absolutely necessary (e.g., first time load, no valid selection exists)
4. **Respect user intent**: Don't override user's current selection during background updates

## Recommended Changes

1. Add `hasUserExplicitlySelected` state to track intentional user actions
2. Only run auto-selection logic on initial mount (`hasInitialized` changes from false to true)
3. Don't auto-select when data refreshes in the background
4. Add a ref to track if we've already run initial selection logic

---

## ✅ SOLUTION IMPLEMENTED

### Changes Made to `src/screens/DashboardScreen.tsx`

#### 1. Added useRef Hook (Line 1)
```typescript
import React, { useState, useEffect, useRef } from "react";
```

#### 2. Added Tracking Ref (Line 63)
```typescript
// Track if we've already run initial project selection to prevent re-running on data refreshes
const hasRunInitialSelection = useRef(false);
```

#### 3. Split useEffect into Two Separate Effects

**Effect 1: Initial Project Selection (Lines 124-184)**
- **Runs once**: Only on initial load when `hasInitialized` becomes true
- **Tracked**: Uses `hasRunInitialSelection.current` to prevent re-runs
- **Dependencies**: `[user?.id, hasInitialized]` (removed `userProjectCount` and `selectedProjectId`)
- **Purpose**: Handle initial project selection, auto-select single project, restore last selected

**Effect 2: Selection Validation (Lines 186-207)**
- **Runs**: When projects or selection changes
- **Purpose**: Only validates and clears invalid selections (defensive)
- **Does NOT auto-select**: Never switches projects automatically
- **Behavior**: 
  - Clears selection if user has no projects
  - Clears selection if current project is no longer accessible
  - Shows picker if user has multiple projects after clearing invalid selection

### Key Improvements

1. **No More Unexpected Switches**: Auto-selection only happens once on initial app load
2. **Respects User Intent**: Background data refreshes don't trigger project changes
3. **Defensive Validation**: Second effect validates selection but never auto-switches
4. **Clear Separation**: Initial selection vs. validation logic are separate concerns

### Testing Scenarios

✅ **Scenario 1: User has 1 project**
- Initial load: Auto-selects the single project
- Data refresh: Project stays selected (no re-selection)

✅ **Scenario 2: User has multiple projects**
- Initial load: Restores last selected or shows picker
- User selects Project A: Stays on Project A
- Background sync: Project A remains selected
- Pull-to-refresh: Project A remains selected

✅ **Scenario 3: User switches between projects**
- User manually picks Project B: Switches to Project B
- Background sync: Project B remains selected
- No unexpected switches back to previous project

✅ **Scenario 4: Project becomes inaccessible**
- User is viewing Project A
- Project A is removed or user loses access
- Selection is cleared (defensive)
- Picker shows if user has other projects

### Console Logs for Debugging

The fix includes clear console logs:
- `📊 [DashboardScreen] Initial project selection logic (one-time)`: Initial selection
- `⚠️ [DashboardScreen] User has no projects, clearing selection`: No projects available
- `⚠️ [DashboardScreen] Current project no longer accessible, clearing selection`: Invalid selection cleared

## Status: ✅ FIXED

The bug has been resolved. Users will no longer experience unexpected project switching during:
- Background data syncs
- Pull-to-refresh
- Component re-renders
- Project assignment updates

