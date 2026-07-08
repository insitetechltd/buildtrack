# UI/UX Source-Of-Truth Audit

**Date:** 2026-07-06  
**Scope:** Audit the current worker-shell UI implementation against:

- `documentation/SOURCE_OF_TRUTH.md`
- `docs/INSITE_UI_UX_SOURCE_OF_TRUTH.md`
- `documentation/UI_ARCHITECTURE.md`
- `documentation/ROADMAP.md`

## Executive Verdict

The latest UI/UX implementation is **partially aligned**, not fully aligned.

### High-level conclusion

- The **shell / navigation / Activity-home foundation** is largely aligned with the canonical UI/UX source of truth.
- The **Tasks surface** is only **partially aligned**. Its queue structure is close, but key interaction requirements from the canonical doc are missing.
- The **task-detail implementation currently diverges from the canonical UI/UX document** in a meaningful way.
- There is also at least one area where **tests codify behavior that does not match the canonical doc**, which strongly suggests **documentation drift** or an unnormalized design decision.

Because `documentation/SOURCE_OF_TRUTH.md` explicitly states that **code is the final authority for implemented behavior**, the practical meaning is:

1. some canonical UI/UX expectations are not yet implemented, and/or
2. the canonical UI/UX document is stale and needs to be updated to reflect the actual accepted implementation.

## Audit Method

This audit compared canonical docs with the live implementation in:

- `src/navigation/AppNavigator.tsx`
- `src/screens/DashboardScreen.tsx`
- `src/screens/TasksScreen.tsx`
- `src/screens/TaskDetailScreen.tsx`
- `src/screens/CreateTaskScreen.tsx`
- `src/ui/viewAdapters/useDashboardViewAdapter.ts`
- `src/ui/viewAdapters/useTasksViewAdapter.ts`
- `src/ui/viewAdapters/useTaskDetailViewAdapter.ts`
- supporting task-detail components and contracts

Verification also included targeted test execution:

- `src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx` → passed
- `src/navigation/__tests__/AppNavigator.bottom-tabs.test.tsx` → passed
- `src/screens/__tests__/TasksScreen.test.tsx` → failed on missing drafts section expectations

## What Is Aligned

## 1. Bottom Shell And Navigation IA

The canonical doc requires:

- 3-item bottom navigation
- `Activity` left
- `Camera` center
- `Tasks` right
- profile removed from bottom tabs and moved to header area

Current implementation is aligned:

- `AppNavigator.tsx` defines worker tabs as `Activity`, `Camera`, `Tasks`
- `Profile` is not a bottom tab
- profile access is routed through header/profile triggers
- the center camera button is visually dominant and not rendered like a normal tab

Evidence:

- `src/navigation/AppNavigator.tsx`
- `src/navigation/__tests__/AppNavigator.bottom-tabs.test.tsx`

## 2. Center Camera Button Styling And Placement

The canonical doc requires:

- dominant center action
- larger circular button
- red camera iconography

Current implementation is aligned:

- camera tab button uses a dedicated `CenterCameraTabButton`
- circular 64x64 button
- red background
- elevated styling
- visually centered in the middle slot

Evidence:

- `src/navigation/AppNavigator.tsx`

## 3. Sticky Active-Project Workspace

The canonical doc requires the active project to persist and scope:

- activity
- tasks
- capture
- new-task context

Current implementation is aligned at the workspace level:

- `WorkspaceBootstrapGate` restores workspace project before main app render
- `projectFilterStore` persists `selectedProjectId`
- it also restores the last selected project per user, including DB sync

Evidence:

- `src/navigation/AppNavigator.tsx`
- `src/state/projectFilterStore.ts`

## 4. Activity Screen Core Composition

The canonical doc requires:

1. active-project summary card
2. dense queue dashboard grid
3. recent activity / updates

Current implementation is substantially aligned:

- summary card appears first
- summary card includes active project title
- includes today label, elapsed-day label, inline weather text
- includes inline `This Week’s Critical Dates`
- queue dashboard appears below summary
- recent activity list appears below queue dashboard
- dashboard cells navigate into `Tasks` with queue/bucket preset

Evidence:

- `src/screens/DashboardScreen.tsx`
- `src/ui/viewAdapters/useDashboardViewAdapter.ts`

## 5. Queue Terminology And Queue Dashboard

The canonical doc requires:

- `My Queue`
- `Team Queue`
- 3 buckets each

Current implementation is aligned:

- `useDashboardViewAdapter` builds `My Queue` and `Team Queue`
- buckets are `new`, `wip`, `review`
- `Tasks` screen also uses those labels

Evidence:

- `src/ui/viewAdapters/useDashboardViewAdapter.ts`
- `src/ui/viewAdapters/useTasksViewAdapter.ts`

## 6. Team Queue As Lighter Secondary Surface

The canonical doc requires:

- `My Queue` dominant
- `Team Queue` lower priority / preview-like until opened

Current implementation is aligned:

- `my_queue` panel is `primary`
- `team_queue` panel is `preview`
- collapsed `Team Queue` shows a lighter preview state and instructional copy

Evidence:

- `src/ui/viewAdapters/useTasksViewAdapter.ts`
- `src/screens/TasksScreen.tsx`

## 7. Unified Search Results Mode

The canonical doc requires:

- one global search bar
- search switches to unified all-task results mode
- queue blocks collapse away in search mode

Current implementation is mostly aligned on search behavior:

- one search input at top of `Tasks`
- search mode replaces queue panels with a unified results list
- results include queue/bucket/project context in the row model

Evidence:

- `src/screens/TasksScreen.tsx`
- `src/ui/viewAdapters/useTasksViewAdapter.ts`

## 8. Critical Dates Use Task-Derived Tagging

The canonical doc requires:

- task-derived model
- `critical_this_week` style tagging

Current implementation is aligned at the data model level:

- dashboard critical dates are sourced from `critical_this_week`
- create/edit flows support critical-date tagging

Evidence:

- `src/ui/viewAdapters/useDashboardViewAdapter.ts`
- `src/ui/contracts/viewAdapters.ts`
- `src/screens/CreateTaskScreen.tsx`

## 9. Context-Aware Camera Shortcut From Task Detail

The canonical doc requires:

- launching camera from task detail should default to a same-task update

Current implementation is aligned:

- camera tab press detects active task-detail route
- it redirects into create-task flow with:
  - `cameraLaunchContext: "task_detail"`
  - `postCaptureDefault: "same_task_update"`

Evidence:

- `src/navigation/photoShortcutRoutes.ts`
- `src/navigation/AppNavigator.tsx`

## What Is Not Aligned

## 1. Tasks Rows Are Not Implemented As The Approved Compact 2-Line Default

The canonical doc says default rows should be:

- compact
- 2-line by default
- optimized for fast scanning

Current implementation does **not** match that:

- row rendering uses `ContainerCard`
- rendered cards display multiple metadata rows:
  - status
  - priority
  - due
  - assignees
  - photo count / updated date when present
- `TasksScreen` explicitly overrides row density to `"standard"` when rendering

That is more detailed than the approved compact collapsed-row model.

Evidence:

- `src/screens/TasksScreen.tsx`
- `src/ui/mappers/tasksMappers.ts`
- test output from `TasksScreen.test.tsx`

Severity: **High**

## 2. In-Place Task Row Expansion Is Missing

The canonical doc says:

- tapping a task row expands it into a richer card
- photo-centric expansion should happen on the `Tasks` surface

Current implementation does **not** match that:

- task rows navigate directly to task detail via `onPress`
- `toggleTaskExpansion` exists in the adapter but is not wired to the screen
- there is no inline expand/collapse interaction in `TasksScreen`

This is one of the clearest mismatches in the audit.

Evidence:

- `src/ui/viewAdapters/useTasksViewAdapter.ts`
- `src/screens/TasksScreen.tsx`

Severity: **High**

## 3. Photo-Centric Expanded Task Card On Tasks Screen Is Not Delivered

The canonical doc says expanded rows/cards on `Tasks` must be:

- photo-centric
- centered on latest task photos

Current implementation does **not** fully deliver this:

- row cards can display media regions via `ContainerCard`
- but those media regions are not tied to an actual inline expand interaction
- the main interaction is still direct navigation to task detail

So the intended `Tasks`-screen photo-centric expansion behavior is still missing.

Evidence:

- `src/ui/mappers/tasksMappers.ts`
- `src/components/primitives/container/ContainerCard.tsx`
- `src/screens/TasksScreen.tsx`

Severity: **High**

## 4. Filter Button / Filter Panel Required By Canonical Doc Is Missing

The canonical doc says the top of `Tasks` should include:

- one global search bar
- one filter button

and the filter button should open a modal or bottom sheet.

Current implementation does **not** match that:

- search bar exists
- no filter button exists on the screen
- there is a reset-filters shortcut and project picker shortcut, but not the canonical filter affordance

Evidence:

- `src/screens/TasksScreen.tsx`

Severity: **High**

## 5. Primary Critical-Date Entry On Task Detail Is Missing

The canonical doc says the **primary** critical-date entry point should be:

- from the expanded task card
- `Mark Critical` or `Add to This Week`

Current implementation is only partially aligned:

- create/edit flow supports critical-date tagging
- task detail screen has UI for a critical toggle, but the adapter never supplies the corresponding action item
- therefore the task-detail toggle is effectively not part of the working screen

This means the canonical primary entry path is not actually delivered.

Evidence:

- `src/screens/TaskDetailScreen.tsx`
- `src/ui/viewAdapters/useTaskDetailViewAdapter.ts`
- `src/screens/CreateTaskScreen.tsx`

Severity: **Medium-High**

## 6. Global Camera Outside Task Context Exposes A Non-Implemented Alternate Path

The canonical doc says outside task context:

- capture first
- default to `Create New Task`
- allow alternate path to `Add to Existing Task`

Current implementation is only partially aligned:

- the post-capture routing sheet shows both options
- but the `Add to Existing Task` path is explicitly marked as not implemented

The UI currently advertises a flow that is not actually delivered.

Evidence:

- `src/screens/CreateTaskScreen.tsx`

Severity: **Medium**

## 7. Task Detail Surface Does Not Match The Canonical “Implemented” Description

The canonical UI/UX doc says the task-detail redesign is implemented with:

- dedicated delegation summary surface
- dedicated evidence/photo summary surface
- activity history reframed as work thread
- subtask context visible and drillable inside redesigned task-detail surface

Current implementation diverges from that description:

- delegation is embedded inside `TaskDetailInfoCard`, not a dedicated rendered delegation surface
- evidence is shown inside `TaskActivityTimeline`, not as a dedicated summary strip/surface
- subtask context appears inside the unified thread, but there is no rendered subtask section/card
- dedicated components exist:
  - `TaskDetailDelegationCard`
  - `TaskDetailEvidenceStrip`
  - `TaskDetailSubtasksSection`
- but they are **not used** in `TaskDetailScreen`

This is not just a minor styling difference. It is a genuine doc/implementation divergence.

Evidence:

- `src/screens/TaskDetailScreen.tsx`
- `src/components/taskDetail/TaskDetailDelegationCard.tsx`
- `src/components/taskDetail/TaskDetailEvidenceStrip.tsx`
- `src/components/taskDetail/TaskDetailSubtasksSection.tsx`
- `src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx`

Severity: **High**

## Strong Documentation-Drift Evidence

## 1. TaskDetail Acceptance Tests Intentionally Enforce A Different UI Than The Canonical Doc

The targeted integration test that passed asserts:

- no separate delegation summary card
- no pinned evidence region
- no separate subtasks card
- no active update stage surface
- photo storytelling stays inside the work thread

Those passing expectations conflict with the canonical UI/UX doc’s “implemented” description.

This strongly suggests that either:

- the implementation intentionally changed and the canonical doc was not updated, or
- the canonical doc describes the intended target but the actual implementation finalized differently

Either way, the canonical doc is not fully normalized to current behavior.

Evidence:

- `src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx`

## 2. Tasks Screen Tests Expect A Drafts Section That The Current Screen Does Not Render

The targeted `TasksScreen` test run failed because it expected:

- `tasks-screen__drafts_section`
- `tasks-screen__drafts_toggle`

but the current `TasksScreen` does not render those elements.

This appears to come from newer working-plan expectations rather than the canonical UI/UX source itself. It indicates ongoing drift between:

- current code
- test expectations
- working plans
- canonical docs

Evidence:

- `src/screens/__tests__/TasksScreen.test.tsx`
- test run on 2026-07-06

## Governance Interpretation Under `documentation/SOURCE_OF_TRUTH.md`

Per `documentation/SOURCE_OF_TRUTH.md`:

- code is final authority for implemented behavior
- canonical docs must be updated when implemented behavior changes
- planning artifacts must not silently compete with canonical docs

So the audit result is not simply “the UI is wrong.”

The more precise result is:

- some canonical UX expectations remain unimplemented
- some “implemented” claims in the canonical UX doc no longer reflect the actual accepted screen behavior
- at least one working/test expectation around drafts is ahead of or divergent from current screen implementation

## Recommended Actions

## Priority 1: Resolve Tasks-Screen Core UX Gaps

If the canonical UI/UX doc is still the intended target, implement:

1. compact true collapsed rows
2. inline row expansion
3. photo-centric expanded row state
4. top-level filter button + filter panel

These are the biggest feature-level gaps versus the canonical doc.

## Priority 2: Decide Whether Task Detail Or Canonical Doc Is The Truth

You need one explicit decision:

- **Option A:** keep the current unified work-thread task-detail design  
  Then update `docs/INSITE_UI_UX_SOURCE_OF_TRUTH.md` so it no longer claims separate delegation/evidence/subtask surfaces are implemented.

- **Option B:** keep the canonical doc as the target  
  Then update `TaskDetailScreen` to actually render the dedicated surfaces that the doc claims are implemented.

Right now those two truths conflict.

## Priority 3: Finish Or Remove The Global “Add To Existing Task” Capture Path

The current UI exposes a choice that is not fully delivered.

Do one of:

1. implement the existing-task attach route, or
2. remove/hide the choice until ready

## Priority 4: Normalize Tests, Working Plans, And Canonical Docs

Specifically align:

- `docs/INSITE_UI_UX_SOURCE_OF_TRUTH.md`
- `src/__tests__/integration/TaskDetailAcceptanceUI.test.tsx`
- `src/screens/__tests__/TasksScreen.test.tsx`
- any active 2026-07-06 drafts-relocation plan

At the moment those layers are not all describing the same accepted product behavior.

## Alignment Summary

### Fully / Mostly aligned

- bottom shell IA
- dominant center camera button
- profile out of bottom tabs
- sticky active project
- Activity summary card + queue dashboard + recent activity order
- queue terminology
- Team Queue preview treatment
- search-mode unified task results
- task-derived critical-date data model
- task-detail camera shortcut routing

### Partially aligned

- global camera flow
- critical-date entry UX
- Tasks search/filter model

### Not aligned

- compact 2-line task rows
- inline expandable photo-centric task cards on `Tasks`
- filter button / filter panel
- canonical task-detail implemented-state description

## Final Verdict

The redesign is **not fully inline** with the current canonical UI/UX source of truth.

The main gaps are on:

- `Tasks` interaction model
- critical-date entry UX
- global capture alternate routing
- task-detail screen/doc normalization

The shell, Activity-home structure, and navigation architecture are in much better shape than the detail-level interactions.
