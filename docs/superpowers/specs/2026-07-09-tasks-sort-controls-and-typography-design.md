# WS-UX / M-UX-01 / S-UX-01N Tasks Sort Controls + Typography Refinement

## Summary

Refine the search-first `Tasks` screen so it behaves more like a direct task list workspace: remove the header back button, add explicit sorting controls next to the current queue/bucket filters, and increase typography by one step across the entire screen for better readability.

This change keeps the current search-first list model intact. It does not redesign task cards, queue/bucket filtering semantics, navigation architecture, or persistence behavior beyond what is necessary to sort the visible list.

## Approved Direction

- Design Decision: Remove the back button from `Tasks` entirely.
- Design Decision: Add a new `Sort by` control alongside `Queue` and `Bucket`.
- Design Decision: Supported sort fields are `Creation date`, `Due date`, and `Modified date`.
- Design Decision: Add a separate sort-direction control for ascending vs descending order.
- Design Decision: Apply sorting after search, queue, bucket, and project-based filtering have already determined the visible row set.
- Design Decision: Increase typography by one step across the whole `Tasks` screen, not only the new controls.

## Control Model

- Design Decision: Keep the existing queue and bucket controls unchanged in purpose.
- Design Decision: Add `Sort by` as a peer control rather than burying sort choices inside an existing filter.
- Design Decision: Keep sort direction separate from sort field so users can flip earliest-first vs latest-first without reopening the field selector.
- Design Decision: Use the existing lightweight press-to-open menu pattern already used by `Queue` and `Bucket`.
- Design Decision: Only one menu should be open at a time.

## Sorting Rules

- Design Decision: Sort the already-filtered `taskRowItems` in the view adapter.
- Design Decision: `Creation date` sorts by task creation timestamp.
- Design Decision: `Due date` sorts by task due date.
- Design Decision: `Modified date` sorts by the latest known update timestamp, with task update metadata used where already available.
- Design Decision: Ascending means earliest first; descending means latest first.
- Design Decision: Rows missing the chosen sort timestamp should sort to the end instead of producing unstable ordering.
- Design Decision: Existing queue, bucket, and search behavior must remain unchanged apart from final row order.

## Typography Rules

- Design Decision: Increase font size by one step across the full `Tasks` screen surface.
- Design Decision: This includes the search field content, visible-result count, queue/bucket/sort labels and values, task row text, and empty-state copy.
- Design Decision: The typography bump should fit the current Activity/Tasks visual language rather than introducing a new density system.
- Design Decision: Header styling should continue matching the Activity screen, but without the back button affordance.

## Scope

### In Scope

- removing the `Tasks` header back button
- adding `Sort by` field selection to the `Tasks` screen
- adding ascending/descending toggle control
- adapter-owned sorting of visible task rows
- one-step typography increase across the whole `Tasks` screen
- focused adapter and screen regression coverage for sorting and header/control behavior

### Out Of Scope

- redesign of task card layout or metadata model
- persistence of sort preference across sessions
- changes to queue or bucket definitions
- changes to task creation, task detail, or dashboard behavior
- broad navigation refactors outside the `Tasks` header back affordance

## Implementation Notes

- `src/ui/viewAdapters/useTasksViewAdapter.ts` should own sort field state, sort direction state, and final ordering of filtered rows.
- `src/ui/contracts/viewAdapters.ts` may need a lightweight contract extension so `TasksScreen.tsx` can render sort controls without inventing local-only state.
- `src/screens/TasksScreen.tsx` should stay responsible for menu presentation and control layout, while deferring row ordering to the adapter.
- `src/screens/__tests__/TasksScreen.test.tsx` should verify that the back button is absent, the new controls render, and direction/sort affordances appear as expected.
- `src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts` should verify ordering by creation date, due date, and modified date in both directions.

## Validation

- Design Decision: Add adapter tests that prove sorting is applied after filtering and search.
- Design Decision: Add screen tests that prove the back button is removed and the new `Sort by` and direction controls appear.
- Design Decision: Add or update tests that prove the visible task order changes correctly for creation, due, and modified timestamps.
- Design Decision: Validate in the simulator that the `Tasks` header has no back button, the new controls fit on screen cleanly, and the one-step font increase improves readability without clipping.

## Code Handoff

- Slice label: `WS-UX / M-UX-01 / S-UX-01N`
- Likely files: `src/screens/TasksScreen.tsx`, `src/ui/viewAdapters/useTasksViewAdapter.ts`, `src/ui/contracts/viewAdapters.ts`, `src/screens/__tests__/TasksScreen.test.tsx`, `src/ui/viewAdapters/__tests__/useTasksViewAdapter.test.ts`
- Interaction rules (must): keep the search-first model, preserve existing queue/bucket filtering semantics, sort only the visible row set, remove the Tasks back button, and raise Tasks typography by one step consistently
- Interaction rules (must never): do not move sorting into unrelated global state, do not redesign cards, do not change task workflow semantics, do not hide sort direction inside the field selector, do not reintroduce the old nested queue-dashboard model
- Acceptance checks: confirm no back button renders on `Tasks`; confirm `Sort by` supports `Creation date`, `Due date`, and `Modified date`; confirm a separate ascending/descending control exists; confirm sort order changes correctly; confirm fonts are one step larger across the screen; confirm queue and bucket filtering still behave as before
