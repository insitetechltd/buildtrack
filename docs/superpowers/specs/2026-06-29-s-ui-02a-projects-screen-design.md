# S-UI-02A ProjectsScreen Design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this design through an approved implementation plan. Do not start code changes directly from this document.

**Goal:** Migrate `ProjectsScreen` to a thinner, adapter-driven Wave 2 screen shell while preserving all existing project-list, project-filter, refresh, and edit behaviors.

**Architecture:** Keep `useProjectsViewAdapter` as the primary data/domain boundary, move only the missing render-state decisions needed to make `ProjectsScreen` more declarative, and extract prop-driven leaf UI only where it reduces screen weight without introducing parallel architecture. Treat the embedded edit-project modal as the highest-risk seam and isolate it only if that can be done without redesigning project-edit behavior or broadening the slice into unrelated project-domain work.

**Tech Stack:** Expo-managed React Native, TypeScript, Zustand, Supabase, React Navigation, Jest, `@testing-library/react-native`.

---

## Context

The earlier approved `CreateTaskScreen` factorization slice closed cleanly. The next safest Wave 2 screen is `ProjectsScreen`, which remains explicitly deferred in the migration matrix and already has a partial adapter boundary in place.

Relevant files:

- `src/screens/ProjectsScreen.tsx`
- `src/ui/viewAdapters/useProjectsViewAdapter.ts`
- `src/ui/contracts/viewAdapters.ts`
- `src/__tests__/integration/ProjectsScreen.test.tsx`

This slice is intentionally narrower than the full remaining `WS-UI / M-UI-02` roadmap. It covers only the `ProjectsScreen` slice and does not include Group B header convergence.

## Problem Statement

`ProjectsScreen` is currently a hybrid screen:

- it already relies on `useProjectsViewAdapter` for loading, search, filtering, refresh, edit-modal visibility, and project-item derivation
- it still owns significant inline rendering and presentation mapping inside the screen file
- it still contains a large embedded `EditProjectModal` that reaches directly into auth, project, and user stores

The main architecture problem is not that the screen lacks an adapter. The problem is that the adapter boundary is incomplete, so the screen remains heavier and riskier to evolve than the migrated Wave 1 targets.

## Design Objectives

### Primary Objectives

- make `ProjectsScreen` materially thinner and more declarative
- preserve current runtime behavior exactly for project-list flows
- strengthen regression coverage before refactoring
- keep this slice small enough for one clean verification gate and checkpoint commit

### Secondary Objectives

- improve the `ProjectsScreen` contract only where that clearly reduces screen-owned logic
- isolate UI-only leaf sections where it improves readability and reduces risk

### Non-Objectives

- no Group B bridge-header convergence
- no `ProjectDetailScreen` migration
- no `CreateProjectScreen` redesign
- no broad `StandardHeader` replacement across the repository
- no store-layer redesign unless a tiny compatibility fix is required to preserve existing behavior

## Existing Architecture Snapshot

### Adapter-Owned Today

`useProjectsViewAdapter` already owns:

- initial load behavior
- refresh behavior
- admin vs non-admin project scoping
- search and status filtering
- `newProjectId` retry/verification continuity
- edit-modal open/close state
- project-item derivation for the visible list

### Screen-Owned Today

`ProjectsScreen.tsx` still owns:

- inline `ProjectCard` rendering
- inline filter-chip rendering
- header-right admin actions
- loading/list/empty-state render branching
- local status-color mapping
- the embedded `EditProjectModal`

### Highest-Risk Seam

The embedded edit modal is the biggest architecture leak because it directly reads and mutates store-backed project and assignment state from inside the screen file.

## Proposed Design

### 1. Freeze Behavior First

Before any refactor, expand regression coverage around the current screen behavior.

Required freeze points:

- admin header actions render when allowed
- non-admin users do not see admin-only actions
- search input still delegates and filters as expected
- status-filter chips still delegate and filter as expected
- loading state still renders correctly
- empty state still renders correctly for both:
  - no projects
  - no search results
- refresh action still triggers the adapter refresh path
- edit affordance still appears only where currently allowed

If the seam is clean enough, add adapter-level tests for:

- admin vs non-admin project source selection
- `projectCountLabel` derivation
- `newProjectId` continuity behavior
- search and status filter narrowing

### 2. Thin The Screen Shell

Refactor `ProjectsScreen` into a more declarative shell that consumes adapter `output` and explicit navigation callbacks.

Safe extractions include:

- a project card leaf component
- a filter-chip row leaf component
- an empty-state leaf component

These components must be prop-driven only and must not read stores directly.

### 3. Promote Only Needed View State Into The Contract

Extend `ProjectsScreenViewAdapterOutput` only where doing so removes screen branching or duplicated logic.

Likely candidates:

- header action visibility state
- status badge semantic data
- search/count display labels where helpful
- any repeated UI model needed by extracted leaves

This phase should not attempt to create a giant all-purpose projects contract. Only move what is necessary to make the screen thinner and safer.

### 4. Handle The Edit Modal Conservatively

The edit modal may be:

- extracted into a dedicated leaf component with explicit props, if that can be done behavior-preservingly
- or left functionally in place if extraction would force domain redesign

What must remain stable:

- project name validation
- date validation
- project update save behavior
- current success feedback semantics
- lead PM reassignment behavior, including removal of prior lead PM where applicable

This phase must not silently redesign the project edit workflow.

## Behavioral Freeze Line

The following behaviors are explicitly protected and must remain unchanged:

- admin users see company-scoped projects
- non-admin users see assigned projects only
- `newProjectId` continuity and retry behavior remains intact
- search still matches the current fields and semantics
- status filtering still matches the current fields and semantics
- admin-only edit affordances remain admin-only
- project update saves still go through the current update flow
- lead PM assignment/removal semantics remain unchanged

## File Scope

### Primary Files

- `src/screens/ProjectsScreen.tsx`
- `src/ui/viewAdapters/useProjectsViewAdapter.ts`
- `src/ui/contracts/viewAdapters.ts`
- `src/__tests__/integration/ProjectsScreen.test.tsx`

### Possible New Files

- `src/screens/projects/ProjectsScreenProjectCard.tsx`
- `src/screens/projects/ProjectsScreenFilterChips.tsx`
- `src/screens/projects/ProjectsScreenEmptyState.tsx`
- `src/screens/projects/EditProjectModal.tsx`
- `src/ui/viewAdapters/__tests__/useProjectsViewAdapter.test.ts`

These files should only be added if they directly support the screen-shell thinning goal.

## Risks And Constraints

### High Risk

- accidentally changing `newProjectId` continuity behavior while simplifying load logic
- accidentally changing edit-project or lead-PM assignment semantics while isolating the modal

### Medium Risk

- over-expanding the adapter contract beyond what the screen actually needs
- creating presentational leaf files that do not meaningfully reduce complexity

### Low Risk

- extracting pure card/filter/empty-state leaves
- moving small view-only mappings into contract-backed data

## Testing Strategy

### Required

- expand `ProjectsScreen` integration coverage first
- add adapter-level tests if the seam is clean and the coverage materially reduces regression risk
- rerun focused nearby suites after the screen changes

### Minimum Verification Gate

- `PATH=/opt/homebrew/bin:$PATH npx jest src/__tests__/integration/ProjectsScreen.test.tsx --runInBand`
- `PATH=/opt/homebrew/bin:$PATH npx jest src/screens/__tests__/ProjectsTasksScreen.test.tsx --runInBand`
- `PATH=/opt/homebrew/bin:$PATH npx jest src/ui/viewAdapters/__tests__/useProjectsViewAdapter.test.ts --runInBand`
  - if that suite is added
- `PATH=/opt/homebrew/bin:$PATH npx tsc --noEmit`

## Definition Of Done

`S-UI-02A` is complete when:

- `ProjectsScreen` is materially thinner and more declarative
- touched screen logic is adapter-owned or prop-driven rather than screen-owned
- the edit modal is either safely isolated or explicitly preserved in place without redesign
- focused regression coverage protects the important branches
- TypeScript is clean
- the slice is checkpoint-committed independently before any later Group B header work begins

## Follow-On Work

The next slice after a clean `S-UI-02A` close remains separate:

- Group B bridge-header convergence for:
  - `src/screens/TaskDetailScreen.tsx`
  - `src/screens/UpdateProgressScreen.tsx`
  - `src/screens/CreateTaskScreen.tsx`

That work is intentionally not part of this design.
