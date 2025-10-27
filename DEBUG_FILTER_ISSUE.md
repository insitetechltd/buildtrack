# Debug: Status Filter Not Working

## Problem
All buttons under "my tasks", "inbox", and "outbox" are displaying the same tasks, regardless of which status filter button is clicked.

## Investigation Steps

1. **Check if `localStatusFilter` is being set correctly:**
   - When clicking "My Tasks → Rejected", does `localStatusFilter` become `"rejected"`?
   - When clicking "My Tasks → WIP", does `localStatusFilter` become `"wip"`?

2. **Check console logs:**
   - Look for `🔍 [ProjectsTasksScreen] Filter Store Update:` log
   - Look for `🔍 [ProjectsTasksScreen] Filtering with:` log
   - What values are shown for `localSectionFilter` and `localStatusFilter`?

3. **Verify the filter logic:**
   - The code checks `if (localStatusFilter === "rejected")` etc.
   - If `localStatusFilter` is always `"all"`, all buttons would show the same tasks

## Potential Issues

1. **The second `useEffect` is resetting `localStatusFilter` to `"all"`:**
   ```typescript
   useEffect(() => {
     if (!sectionFilter && !statusFilter && localSectionFilter !== "all") {
       setLocalStatusFilter("all"); // This might be resetting it!
     }
   }, [localSectionFilter, sectionFilter, statusFilter]);
   ```
   - This effect runs when `localSectionFilter` changes
   - If the conditions are met, it resets `localStatusFilter` to `"all"`
   - This could be interfering with the status filter

2. **Filter values not matching:**
   - Dashboard sets `setStatusFilter("rejected")` 
   - But filter checks `if (localStatusFilter === "rejected")`
   - Need to verify these match exactly

3. **Race condition:**
   - First `useEffect` sets `localStatusFilter` to `"rejected"`
   - Then clears `statusFilter` from store
   - Second `useEffect` sees `!statusFilter` and resets `localStatusFilter` to `"all"`

## Solution

The second `useEffect` is likely the culprit. It should be removed or modified to not reset the status filter when both filters are set together.

