# Phase 4B ProjectsScreen Blueprint

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate `ProjectsScreen` to a thinner, adapter-driven Wave 2 screen shell without changing project-domain behavior.

**Architecture:** Keep `useProjectsViewAdapter` as the data/domain boundary, make `ProjectsScreen` more declarative, and reduce inline rendering/business decisions that currently live in the screen file. Treat the embedded edit-project modal as a controlled sub-scope within this screen slice only if it can be cleanly isolated without pulling in broader project-domain redesign or Group B header convergence.

**Tech Stack:** Expo-managed React Native, TypeScript, Zustand, Supabase, React Navigation, Jest, `@testing-library/react-native`.

---

## Intent

This is the recommended next Wave 2 slice after Phase `4A` closure.

`ProjectsScreen` is the safest next screen because:

- it is explicitly listed as a deferred Wave 2 target in `documentation/ui-migration-foundations-wave1-matrix.md`
- it already has an adapter boundary in `src/ui/viewAdapters/useProjectsViewAdapter.ts`
- it has lower regression blast radius than reopening another task-heavy screen immediately
- it lets Phase 4 continue with the same discipline used for `CreateTaskScreen`: narrow scope, stronger tests first, small checkpoint commit

## Scope

### In Scope

- `src/screens/ProjectsScreen.tsx`
- `src/ui/viewAdapters/useProjectsViewAdapter.ts`
- `src/ui/contracts/viewAdapters.ts`
- focused tests for `ProjectsScreen` and `useProjectsViewAdapter`
- small leaf extraction inside `src/screens/` only if it clearly thins the screen shell without changing behavior

### Out Of Scope

- Group B bridge-header convergence for `TaskDetailScreen`, `UpdateProgressScreen`, or `CreateTaskScreen`
- broad replacement of `StandardHeader` across the repository
- `ProjectDetailScreen` migration
- `CreateProjectScreen` redesign
- project-domain/store rewrites in `src/state/projectStore.supabase.ts` unless a tiny compatibility fix is required to preserve existing behavior
- any security, release, dependency, or native build work

## Current Architecture Snapshot

### What Is Already Good

- `useProjectsViewAdapter.ts` already owns:
  - loading
  - refresh
  - admin-vs-user scoping
  - search/status filtering
  - edit-modal open/close state
  - projection of raw projects into `projectItems`
- `viewAdapters.ts` already defines a contract for `ProjectsScreen`
- the screen already consumes `output` and `actions` rather than calling every store selector inline

### What Is Still Too Heavy In The Screen

- `ProjectsScreen.tsx` still owns inline presentational composition for:
  - project cards
  - filter chips
  - admin header actions
  - loading/empty/list branching
  - status-color mapping
- the embedded `EditProjectModal` bypasses the adapter boundary and reads stores directly
- the current integration test is too narrow and mostly proves that the mocked adapter can render

### Main Architectural Concern

`ProjectsScreen` is not as overloaded as pre-4A `CreateTaskScreen`, but it is still a hybrid screen rather than a clean adapter-driven shell. The biggest leak is the embedded edit modal, not the card list itself.

## Recommended 4B Target State

At the end of Phase `4B`, `ProjectsScreen` should behave like an adapter-driven shell with:

- explicit header action inputs from the adapter
- explicit list/filter/search render state from the adapter
- minimal inline branching in the screen
- extracted leaf presentation where it materially reduces file size
- stronger screen and adapter regression coverage around admin/user differences, filters, empty states, refresh, and edit entry

The screen does **not** need to become fully primitive-perfect in one pass. The target is safe thinning and selector discipline, not a cosmetic rewrite.

## Recommended Decomposition

### Slice 1: Freeze Existing Behavior With Tests

Add or expand tests before implementation for:

- admin rendering:
  - create-project action visible
  - user-management action visible when callback exists
- non-admin rendering:
  - admin actions hidden
  - assigned-to-you count label behavior preserved
- search delegation
- status filter delegation
- empty state rendering:
  - no projects
  - no search results
  - create action shown only when appropriate
- loading state rendering
- refresh wiring
- edit-entry affordance visibility and delegation

If test setup allows it cleanly, add adapter-level tests for:

- admin-vs-user project source selection
- project count label derivation
- `newProjectId` continuity behavior remaining intact
- filter/search narrowing logic

### Slice 2: Thin The Screen Shell

Refactor `ProjectsScreen.tsx` into a mostly declarative shell that consumes adapter output and explicit callbacks.

Safe extractions:

- `ProjectsScreenProjectCard`
- `ProjectsScreenFilterChips`
- optional `ProjectsScreenEmptyState`

Keep these extractions prop-driven only. They should not read stores directly.

### Slice 3: Promote Missing View Data Into The Adapter Contract

Extend the `ProjectsScreen` contract only where it reduces screen logic cleanly.

Likely additions:

- header action visibility model
- status badge semantic model
- search placeholder and count display strings if needed
- edit affordance visibility on each project item

Do **not** over-model the screen. Only move logic that is currently causing screen-level branching or duplication.

### Slice 4: Contain The Edit Modal

The modal is the highest-risk part of this screen.

Recommended rule:

- if the modal can be extracted into a leaf component with the same behavior and explicit props, do that inside `4B`
- if isolating it requires broader project-domain redesign, stop short and keep it functionally intact

Acceptable `4B` outcome:

- modal extracted but still powered by current save/open/close flow
- or modal left in place, but with surrounding screen shell thinned and tests strengthened

Unacceptable `4B` outcome:

- silent redesign of project editing behavior
- store logic moved into the screen
- hidden changes to lead-PM assignment semantics

## Likely Files

### Primary Files

- `src/screens/ProjectsScreen.tsx`
- `src/ui/viewAdapters/useProjectsViewAdapter.ts`
- `src/ui/contracts/viewAdapters.ts`
- `src/__tests__/integration/ProjectsScreen.test.tsx`

### Possible New Leaf Files

- `src/screens/projects/ProjectsScreenProjectCard.tsx`
- `src/screens/projects/ProjectsScreenFilterChips.tsx`
- `src/screens/projects/ProjectsScreenEmptyState.tsx`
- `src/screens/projects/EditProjectModal.tsx`

Only create files that directly reduce the screen shell without introducing parallel architecture.

### Possible New Tests

- `src/ui/viewAdapters/__tests__/useProjectsViewAdapter.test.ts`
- screen-local tests under `src/screens/projects/__tests__/` only if there is a clean leaf seam worth locking down

## Business Logic To Preserve

The following behaviors are part of the freeze line and must not drift:

- admin users see company-scoped projects
- non-admin users see assigned projects only
- `newProjectId` continuity reload/retry logic stays intact
- status filter logic remains exact
- search still matches current fields and behavior
- edit button visibility remains admin-only
- project update save flow still updates project data and preserves current success feedback semantics
- lead PM assignment/removal flow inside edit behavior must not silently change

## Risks

### High Risk

- embedded edit modal has direct store coupling and user/assignment logic
- continuity logic around `newProjectId` can be accidentally lost during cleanup

### Medium Risk

- moving too much presentational logic into the adapter can create bloated contracts
- tightening selector usage can accidentally change admin/user scoping if tests are too shallow

### Low Risk

- extracting cards/filter chips as pure components
- narrowing header-right-action rendering behind explicit props

## Validation Gate

Minimum expected verification for `4B`:

- `PATH=/opt/homebrew/bin:$PATH npx jest src/__tests__/integration/ProjectsScreen.test.tsx --runInBand`
- `PATH=/opt/homebrew/bin:$PATH npx jest src/screens/__tests__/ProjectsTasksScreen.test.tsx --runInBand`
- `PATH=/opt/homebrew/bin:$PATH npx jest src/ui/viewAdapters/__tests__/useProjectsViewAdapter.test.ts --runInBand`
  - only if this adapter suite is added
- `PATH=/opt/homebrew/bin:$PATH npx tsc --noEmit`

Recommended extra check if the modal is touched materially:

- rerun any nearby project flow suite already present in `src/__tests__/integration/`

## Definition Of Done

Phase `4B` is done when:

- `ProjectsScreen` is materially thinner and more declarative
- touched logic is adapter-owned or prop-driven rather than screen-owned
- the edit flow is either safely isolated or explicitly preserved in place without redesign
- focused screen regression coverage protects the important branches
- TypeScript is clean
- the slice is checkpoint-committed independently

## Recommended Execution Order

1. Expand `ProjectsScreen` regression coverage first.
2. Add adapter-level coverage if the seam is clean.
3. Move only the minimum missing render-state logic into the contract/adapter.
4. Thin the screen shell with small leaf extractions.
5. Contain the edit modal only if it can be done behavior-preservingly.
6. Run the `4B` verification gate.
7. Create a checkpoint commit before any Group B header work starts.

## What Comes After 4B

If `4B` closes cleanly, the next logical follow-up remains:

- Group B bridge-header convergence for:
  - `src/screens/TaskDetailScreen.tsx`
  - `src/screens/UpdateProgressScreen.tsx`
  - `src/screens/CreateTaskScreen.tsx`

That should be treated as a separate approved slice, not folded into `ProjectsScreen`.
