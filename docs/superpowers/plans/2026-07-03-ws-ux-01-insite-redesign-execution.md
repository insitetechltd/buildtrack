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
