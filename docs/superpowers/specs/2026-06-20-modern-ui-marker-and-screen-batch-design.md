# Modern UI Marker And Screen Batch Design

**Goal**

Add a temporary, reusable `Modern UI` marker to all already-modernized screens and modernize the next approved six screens using the existing view-adapter and primitive-driven architecture, without interrupting the active workflow for additional approvals.

## Scope

This design covers two coordinated tracks:

1. A shared temporary migration marker that appears in the top-right action area of modernized screens.
2. Modernization of the next six approved screens:
   - `ProjectPickerScreen`
   - `AddCommentScreen`
   - `RejectTaskScreen`
   - `ReassignTaskScreen`
   - `ProfileScreen`
   - `ProjectsScreen`

This design also records an explicit future follow-up: complete Group B header convergence from `StandardHeader` to fully custom modern headers at an appropriate later migration milestone.

## Current State

The repository currently has two kinds of already-modernized screen shells:

- **Group A: fully custom modern headers**
  Screens such as `DashboardScreen`, `TasksScreen`, and `PhotoSelectionScreen` already compose their own top bar directly in the screen.
- **Group B: modernized body with bridge header**
  Screens such as `TaskDetailScreen`, `UpdateProgressScreen`, and `CreateTaskScreen` already use view adapters and modernized layout patterns, but still rely on `StandardHeader` as a lower-risk transition layer.

This is a migration-stage distinction, not an intended permanent architecture split.

## Design Decisions

### 1. Marker Placement

Use a small reusable `Modern UI` pill in the top-right header action area.

Reasons:

- easy to scan during QA and manual review
- visually consistent across both header groups
- low risk of covering content
- easy to remove later from one shared component path

Rejected alternatives:

- floating overlay badge: too intrusive and more likely to overlap content
- title suffix: less visible and pollutes screen titles

### 2. Marker Integration Strategy

Create one shared marker component and integrate it in two ways:

- **Group A screens**
  Render the shared marker directly inside each screen's existing right-side action row.
- **Group B screens**
  Feed the same shared marker through `StandardHeader`'s right-side slot so the visual treatment matches Group A without rewriting those headers yet.

### 3. Modernization Strategy For The Six-Screen Batch

Modernize in this order:

1. `ProjectPickerScreen`
2. `AddCommentScreen`
3. `RejectTaskScreen`
4. `ReassignTaskScreen`
5. `ProfileScreen`
6. `ProjectsScreen`

Reasons:

- starts with the smallest blast-radius screen
- groups similar task-action screens together for reuse
- defers the largest and most coupled screen until the primitives and patterns are already proven

### 4. Architecture Expectations

For each target screen:

- extract state, formatting, and conditional logic into a dedicated view adapter under `src/ui/viewAdapters/`
- keep the screen component presentation-focused
- reuse the current primitive and mapper direction where it already exists
- preserve existing business logic and navigation semantics

Task-domain screens must preserve current task workflow expectations for comments, rejection, reassignment, uploads, and refresh behavior.

## Screen Notes

### ProjectPickerScreen

- Lowest complexity in the batch
- Good first candidate for establishing the marker pattern on a `StandardHeader` screen
- Primary risks: project switching refresh flow and required-selection behavior

### AddCommentScreen

- Form + photo upload + submit flow
- Strong reuse potential for `RejectTaskScreen`
- Primary risks: upload handling, task refresh, and success/failure feedback

### RejectTaskScreen

- Similar structure to `AddCommentScreen`
- Shares photo attachment and fixed-action layout patterns
- Primary risks: task/subtask branching and rejection semantics

### ReassignTaskScreen

- Searchable assignment list and selection flow
- Primary risks: candidate filtering, favorites, and callback/return navigation

### ProfileScreen

- Multi-section utility screen with modals and admin-sensitive paths
- Primary risks: refresh actions, language/preferences, password flow, and role-based visibility

### ProjectsScreen

- Highest complexity
- Large inline modal and broad store coupling
- Primary risks: filtering, list state, role-specific controls, and edit modal behavior

## Validation Strategy

For the marker:

- verify it appears on all already-modernized screens
- verify it appears in a visually consistent top-right location for both header groups

For each screen modernization:

- run the smallest focused verification available
- preserve existing tests where present
- add focused interaction/integration tests when no meaningful regression coverage exists
- run `npx tsc --noEmit`
- run targeted Jest coverage for changed screens/adapters

For user-visible task flows:

- ensure QA-style manual validation remains part of the subagent-driven lifecycle

## Follow-Up Commitment: Group B Header Convergence

Group B screens will not remain on the bridge header permanently.

This batch intentionally keeps Group B header migration out of scope so the approved six-screen rollout stays focused and low-risk. However, the convergence work must be scheduled as a follow-up modernization milestone after the next batch patterns stabilize.

Planned future follow-up:

- define a shared modern screen-header primitive or header composition pattern
- migrate Group B screens off `StandardHeader`
- keep the temporary `Modern UI` marker removable throughout that work

## Out Of Scope

- changing task-store domain behavior beyond what is required to preserve existing screen behavior
- redesigning the app-wide navigation structure
- removing `StandardHeader` globally in this batch
- making the `Modern UI` marker permanent
