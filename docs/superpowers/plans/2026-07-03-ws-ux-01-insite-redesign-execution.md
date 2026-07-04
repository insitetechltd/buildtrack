# WS-UX / M-UX-01 — Insite Redesign Execution

## Governance

- `documentation/ROADMAP.md` remains the single canonical WS/M/S inventory for the repository.
- This document records execution intent, slice boundaries, and closure evidence for `WS-UX / M-UX-01` only.
- Use WS/M/S identifiers only; do not introduce competing roadmap taxonomies or duplicate milestone ledgers elsewhere.

## Milestone Goal

Deliver the Insite redesign in narrowly governed slices while preserving the existing Expo, React Navigation, Zustand, and Supabase workflow engine.

## Registered Slices

| ID | Name | Status | Notes |
| --- | --- | --- | --- |
| WS-UX / M-UX-01 / S-UX-01A | Redesign-safe task model foundation | Closed | Foundation slice completed ahead of navigation-facing bootstrap restore work. |
| WS-UX / M-UX-01 / S-UX-01B | Active-project workspace bootstrap restore | Closed | Completed as a bootstrap-only slice without renaming the existing tab shell or expanding into broader navigation redesign work. |
| WS-UX / M-UX-01 / S-UX-01C | Top-level shell and navigation IA alignment | Closed | Aligned the live worker shell to the approved `Activity / Tasks / Camera / Profile` model while preserving active-project behavior established by `S-UX-01B`. |
| WS-UX / M-UX-01 / S-UX-01D | Activity-first home rollout | Closed | Replaced the legacy dashboard with the approved project-scoped `Recent Activity` home while preserving task, project, and camera entry paths. |
| WS-UX / M-UX-01 / S-UX-01E | Compact project task surface | Closed | Rolled out the approved compact and collapsible project task list while preserving search, filters, drill-in behavior, and project scoping. |
| WS-UX / M-UX-01 / S-UX-01F | Task detail redesign | Pipeline | Recompose task detail into the approved visual work-thread surface without losing workflow controls. |
| WS-UX / M-UX-01 / S-UX-01G | Batch-first capture review | Pipeline | Convert capture review into the approved project-first, multi-photo save flow. |
| WS-UX / M-UX-01 / S-UX-01H | Migration hardening and regression closure | Pipeline | Finish create/edit alignment, migration safety, validation, and milestone-close evidence. |

## Slice Detail

### WS-UX / M-UX-01 / S-UX-01A — Redesign-safe task model foundation

Purpose:

- establish redesign-safe foundation work that unblocks project-scoped workspace behavior
- preserve compatibility with the current shell while later redesign slices remain in pipeline

Boundary:

- no broader shell rename
- no top-level navigation information architecture rewrite
- no user-visible redesign rollout beyond prerequisite foundation behavior

### WS-UX / M-UX-01 / S-UX-01B — Active-project workspace bootstrap restore

Purpose:

- restore the authenticated user’s active project into the workspace before the shell renders
- prevent stale project context from leaking across auth transitions or prior persisted selections

In scope:

- finalize `src/state/projectFilterStore.ts` bootstrap behavior
- finalize `src/navigation/AppNavigator.tsx` workspace bootstrap gate behavior
- keep focused regression coverage in store and navigation tests
- align roadmap and execution documentation with the slice outcome

Out of scope:

- renaming the current tab shell to `Activity`, `Camera`, or other redesign names
- changing `RootTabParamList` shell names
- broader navigation redesign or new IA rollout

Implementation notes:

- bootstrap readiness is now tied to the authenticated user instead of a generic persisted ready flag
- restoring `null` for the current user clears `selectedProjectId` instead of falling back to a stale in-memory selection
- the gate continues to block rendering until workspace readiness belongs to the current authenticated user

Primary files:

- `src/state/projectFilterStore.ts`
- `src/navigation/AppNavigator.tsx`
- `src/state/__tests__/projectFilterStore.workspace.test.ts`
- `src/navigation/__tests__/WorkspaceBootstrapGate.test.tsx`

Validation used for slice closure:

- `npx jest src/state/__tests__/projectFilterStore.workspace.test.ts src/navigation/__tests__/WorkspaceBootstrapGate.test.tsx --runInBand`
- `npx tsc --noEmit`

Closure criteria:

- bootstrap restores the current user’s last selected project when present
- bootstrap clears stale selection when no restorable project exists for the current user
- navigation shell stays gated until workspace readiness is established for the authenticated user
- roadmap and execution docs reflect the slice without creating a competing inventory

### WS-UX / M-UX-01 / S-UX-01C — Top-level shell and navigation IA alignment

Purpose:

- move the live app shell from the legacy tab framing to the approved `Activity / Tasks / Camera / Profile` navigation model
- preserve the project-scoped workspace behavior introduced by `S-UX-01B`

In scope:

- update top-level tab and route naming in `src/navigation/AppNavigator.tsx`
- align `src/navigation/navigationTypes.ts` with the new shell names and camera entry semantics
- keep `ProjectPicker` and active-project access consistent from the new shell
- add focused navigation coverage for the renamed shell

Out of scope:

- replacing the content of the Activity home itself
- compact task list redesign
- task detail redesign
- batch-first capture review layout changes beyond shell entry alignment

Primary files:

- `src/navigation/AppNavigator.tsx`
- `src/navigation/navigationTypes.ts`
- `src/navigation/__tests__/AppNavigator.back-behavior.test.tsx`
- `src/navigation/__tests__/WorkspaceBootstrapGate.test.tsx`

Planned validation:

- `npx jest src/navigation/__tests__/AppNavigator.back-behavior.test.tsx src/navigation/__tests__/WorkspaceBootstrapGate.test.tsx --runInBand`
- `npx tsc --noEmit`

Closure criteria:

- the top-level shell exposes `Activity`, `Tasks`, `Camera`, and `Profile`
- camera entry preserves optional task/project context params
- the authenticated workspace still waits for current-user bootstrap readiness before rendering
- roadmap and execution docs remain aligned with the slice status

Closure evidence:

- worker root tab contract renamed from `Dashboard / CreateTask / Reports` to `Activity / Tasks / Camera / Profile`
- worker-facing parent-tab redirects updated to `Activity` and `Camera`
- obsolete worker `Reports` shell artifacts removed from the touched navigation surface
- focused validation passed:
  - `npx jest src/navigation/__tests__/AppNavigator.back-behavior.test.tsx src/navigation/__tests__/WorkspaceBootstrapGate.test.tsx --runInBand`
  - `npx tsc --noEmit`

### WS-UX / M-UX-01 / S-UX-01D — Activity-first home rollout

Purpose:

- replace the legacy dashboard with the approved project-scoped `Recent Activity` home

In scope:

- repurpose the current dashboard route into the approved Activity home surface
- scope visible activity to the active project only
- preserve direct paths into tasks and capture

Closure evidence:

- `DashboardScreen` now renders the approved `Recent Activity` home instead of the legacy metric-grid dashboard
- the activity adapter is scoped to the active project selected in the workspace filter store
- no-selection behavior now suppresses project-specific pills, task shortcuts, and activity rows until a project is selected
- focused validation passed:
  - `npx jest src/__tests__/integration/activity-home.integration.test.tsx src/ui/viewAdapters/__tests__/useDashboardViewAdapter.test.ts src/navigation/__tests__/WorkspaceBootstrapGate.test.tsx --runInBand`
  - `npx tsc --noEmit`

### WS-UX / M-UX-01 / S-UX-01E — Compact project task surface

Purpose:

- deliver the approved compact and collapsible task list scoped to the active project

In scope:

- group tasks by lightweight container context
- preserve fast drill-in and filter behavior
- keep the compact collapsible variant as the production default

Closure evidence:

- `TasksScreen` now renders compact collapsible task sections instead of the legacy flat task list
- section grouping is scoped by active project, and same-named sections remain distinct across projects in all-project mode
- empty results now render an explicit empty state rather than a blank task surface
- focused validation passed:
  - `npx jest src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts src/screens/__tests__/TasksScreen.test.tsx src/__tests__/integration/TasksScreenInteraction.test.tsx --runInBand`
  - `npx tsc --noEmit`

### WS-UX / M-UX-01 / S-UX-01F — Task detail redesign

Purpose:

- redesign task detail as a lighter visual work thread while preserving workflow logic

In scope:

- delegation summary
- activity log clarity
- photo and subtask context
- review and reassignment actions

### WS-UX / M-UX-01 / S-UX-01G — Batch-first capture review

Purpose:

- align the photo flow to the approved project-first, batch-save experience

In scope:

- multi-photo review
- optional task attachment
- save-first and organize-later behavior
- capture-related activity logging

### WS-UX / M-UX-01 / S-UX-01H — Migration hardening and regression closure

Purpose:

- complete redesign-safe migration, validation, and closure evidence for `WS-UX / M-UX-01`

In scope:

- create/edit flow alignment
- legacy data compatibility hardening
- regression coverage for the redesigned surfaces
- milestone-close validation and roadmap update
