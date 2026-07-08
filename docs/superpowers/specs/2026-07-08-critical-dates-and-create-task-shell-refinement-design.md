# WS-UX / M-UX-01 / S-UX-01L Critical Dates + Create Task Shell Refinement

## Summary

Refine the `Activity` dashboard and `Create New Task` experience so `Critical Dates` is derived from task due dates in the current calendar week rather than a dedicated task flag, and so `Create New Task` visually belongs to the same shell family as `Activity` and `Tasks`.

This pass is intentionally focused on dashboard date qualification, removal of the now-redundant create-task checkbox, and the shell/body alignment of the create-task screen.

## Approved Direction

- Design Decision: Replace the dedicated `critical_this_week` dashboard inclusion rule with a due-date-in-current-week rule based on the local calendar week.
- Design Decision: Remove the `Show in This Week's Critical Dates` checkbox from `Create New Task` once dashboard inclusion is derived from due dates.
- Design Decision: Keep the dashboard `Critical Dates` section scoped to open tasks in the selected project.
- Design Decision: Make `Create New Task` use the same branded header treatment as `Activity` and `Tasks`.
- Design Decision: Restore the missing side tab icons and align the screen to the same shell/navigation behavior as the other main-tab surfaces.
- Design Decision: Change the create-task background surface to match the current `Activity` / `Tasks` light-blue screen treatment.
- Design Decision: Move the primary `Create Task` button so it sits correctly above the bottom navigation bar.
- Design Decision: Review the visible create-task body components and align their font sizing, spacing, and section rhythm to the `Activity` / `Tasks` design language without redesigning the task workflow itself.

## Critical Dates Rules

- Design Decision: A task qualifies for dashboard `Critical Dates` when it belongs to the selected project, is still open, has a valid `dueDate`, and that `dueDate` falls inside the current local calendar week.
- Design Decision: Use calendar-week boundaries rather than a rolling 7-day window.
- Design Decision: Tasks without a valid due date do not qualify for `Critical Dates`.
- Design Decision: Sorting should remain due-date ascending, with earlier due dates appearing first.
- Design Decision: The section should continue to cap the visible list to the current compact dashboard treatment unless implementation review finds a conflicting requirement.
- Design Decision: The legacy `critical_this_week` tag should stop driving dashboard inclusion for this surface.

## Create Task Shell Rules

- Design Decision: The create-task header should match the branded teal shell language already used by `Activity` and `Tasks`.
- Design Decision: The create-task screen should sit inside the same visual shell treatment as the other main-tab surfaces, including the restored side navigation icons.
- Design Decision: The screen background should use the same light-blue page surface family as `Activity` and `Tasks`, rather than the current flatter white/gray treatment.
- Design Decision: The primary action button should anchor correctly above the bottom navigation bar, with intentional spacing rather than a floating gap.

## Create Task Body Rules

- Design Decision: Section titles, helper text, form labels, and input rhythm should be brought into line with the updated `Activity` / `Tasks` type scale and spacing cadence.
- Design Decision: Form sections should feel visually consistent with the newer shell styling through spacing, surface treatment, and typography hierarchy.
- Design Decision: Existing create-task controls, field order, navigation behavior, and submit semantics should remain intact unless removal of the critical-date checkbox requires small structural cleanup.
- Design Decision: This is a refinement of the current form, not a full redesign of task creation.

## Scope

### In Scope

- `useDashboardViewAdapter()` critical-date qualification changes
- dashboard critical-date regression coverage
- removal of the critical-date checkbox from `Create New Task`
- create-task header/shell alignment with `Activity` / `Tasks`
- restoration of missing bottom-nav side icons on the create-task surface
- create-task background, body spacing, typography, and primary-button placement refinement
- focused create-task integration or adapter regression coverage where it protects the changed behavior

### Out Of Scope

- changes to task assignment, submission, edit, or upload workflow semantics
- broad task-detail redesign or task-detail checkbox removal unless required for consistency in a later slice
- changes to queue logic, dashboard search-first behavior, or task-row card styling
- broad navigation architecture changes beyond what is required to restore shell parity for create-task
- schema or Supabase migrations unless hidden dependencies force a follow-up decision

## Implementation Notes

- `useDashboardViewAdapter()` is the primary place to replace tag-based critical-date selection with due-date week qualification because it already builds the dashboard `criticalDates` payload.
- `CreateTaskScreen.tsx` will likely own most of the shell/body styling updates because that screen currently defines the visible form structure.
- `useCreateTaskViewAdapter.ts` will likely need to stop hydrating, defaulting, and submitting the `criticalThisWeek` form field once the checkbox is removed.
- Existing task-store compatibility around tags should be inspected before removing any tag-writing path, but the requested behavioral goal is to stop relying on the dedicated flag for dashboard display.

## Validation

- Design Decision: Update adapter-level coverage to prove tasks due this calendar week appear in `Critical Dates` without requiring the old dedicated flag.
- Design Decision: Remove or rewrite tests that currently assert the create-task critical-date checkbox exists or persists.
- Design Decision: Add focused create-task structure assertions where they protect the shell/header/background/button alignment.
- Design Decision: Validate visually in the simulator that the create-task header, body, background, bottom-nav icons, and primary-button placement now feel consistent with `Activity` and `Tasks`.

## Code Handoff

- Slice label: `WS-UX / M-UX-01 / S-UX-01L`
- Likely files: `src/ui/viewAdapters/useDashboardViewAdapter.ts`, `src/ui/viewAdapters/__tests__/useDashboardViewAdapter.test.ts`, `src/screens/DashboardScreen.tsx`, `src/screens/CreateTaskScreen.tsx`, `src/ui/viewAdapters/useCreateTaskViewAdapter.ts`, `src/__tests__/integration/CreateTaskScreen.test.tsx`, `src/ui/viewAdapters/__tests__/useCreateTaskViewAdapter.test.ts`
- Interaction rules (must): preserve current task-creation workflow, preserve selected-project and route-return behavior, preserve dashboard selected-project scoping, preserve main shell branding.
- Interaction rules (must never): do not keep dashboard critical-date dependence on the old checkbox flag, do not redesign the create-task workflow flowchart, do not silently change submission semantics unrelated to the removed checkbox, do not introduce new shell divergence from `Activity` / `Tasks`.
- Acceptance checks: confirm due-this-week tasks appear in dashboard `Critical Dates`, confirm tasks outside the current week do not; confirm the create-task checkbox is gone; confirm the create-task header and background match the other main screens; confirm the side nav icons are visible again; confirm the `Create Task` button sits correctly above the nav bar; confirm body typography and spacing now read as part of the same design family.
