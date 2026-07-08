# WS-UX / M-UX-01 / S-UX-01M Create Task Form Flow + Location Refinement

## Summary

Refine `Create New Task` so submission becomes part of the normal scrollable form flow, the large bottom gap above the navigation bar is eliminated, and the form structure better matches the way users complete work from top to bottom.

This pass also adds a project-scoped `Location` dropdown with an `Add new location` path, moves `Assign To` into `Task Basics`, and removes the now-redundant standalone `Assignment` section.

## Approved Direction

- Design Decision: Remove the separate bottom action layer that currently houses the `Create Task` button.
- Design Decision: Make the `Create Task` button part of the normal form flow, placed directly below the attachment section as the final section in the scrollable content.
- Design Decision: Add a `Location` dropdown field to `Create New Task`.
- Design Decision: Scope saved location options per project rather than globally or per user.
- Design Decision: Let the `Location` field choose from existing project locations or branch into `Add new location`.
- Design Decision: Move `Assign To` and the selected-users presentation into the `Task Basics` section as the last field group in that section.
- Design Decision: Remove the standalone `Assignment` section after that move.

## Form Flow Rules

- Design Decision: Users should naturally progress through the full form before reaching submission.
- Design Decision: The submit button should scroll with the rest of the form instead of being hosted in a fixed or separate bottom container.
- Design Decision: The old visual layer above the bottom navigation bar should be removed entirely rather than merely shrinking the gap.
- Design Decision: The revised structure should reduce premature submission affordance by placing submission after the rest of the data-entry flow.

## Location Field Rules

- Design Decision: `Location` is a dropdown/select field that sits within the normal create-task form.
- Design Decision: Location options are scoped to the currently selected project.
- Design Decision: Existing project locations should be selectable from prior entries.
- Design Decision: The dropdown must include an `Add new location` path for values that do not yet exist in the current project's history.
- Design Decision: Adding a new location should feel like an extension of the same field flow, not a separate unrelated workflow.
- Design Decision: This refinement should not broaden into a new global locations subsystem unless hidden implementation constraints force a later decision.

## Field Order Rules

- Design Decision: `Task Basics` should include the core task-entry information plus assignee selection.
- Design Decision: `Assign To` and the selected-users summary should become the last field group inside `Task Basics`.
- Design Decision: Removing the standalone `Assignment` section should not change assignment behavior, validation behavior, or downstream payload semantics unless required for the new location field.
- Design Decision: Existing task-creation workflow semantics should otherwise remain intact.

## Scope

### In Scope

- removal of the separate create-task bottom action layer
- moving the submit button into the scrollable form beneath attachments
- adding a project-scoped `Location` dropdown with `Add new location`
- moving `Assign To` and selected-users display into `Task Basics`
- removing the standalone `Assignment` section
- focused adapter and integration regression coverage for the new field order and location behavior

### Out Of Scope

- redesign of the overall create-task workflow beyond the requested structural changes
- global company-wide location management
- user-personal location history independent of project scope
- dashboard logic changes unrelated to the create-task form flow
- broad task-model redesign unless hidden data-shape constraints require a follow-up slice

## Implementation Notes

- `CreateTaskScreen.tsx` will likely own most of the visible form restructuring because it already defines the rendered section order, field grouping, attachment section, and submit area.
- `useCreateTaskViewAdapter.ts` will likely need to own any new `location` field state, hydration, validation, and submit payload changes.
- Existing project/task data surfaces should be inspected to determine whether reusable per-project location entries already exist or whether a lightweight persistence path is needed.
- The design goal is to keep the change local to the current create-task flow rather than introducing a large new architecture layer for locations.

## Validation

- Design Decision: Add or update focused tests to prove the separate bottom action container is gone and the submit button now appears in normal form flow below attachments.
- Design Decision: Add coverage for the new project-scoped `Location` field behavior, including selecting an existing option and showing the `Add new location` path.
- Design Decision: Add coverage for the moved `Assign To` field and the removal of the standalone `Assignment` section.
- Design Decision: Validate visually in the simulator that the button now sits naturally below the form content and that the old large bottom gap is gone.

## Code Handoff

- Slice label: `WS-UX / M-UX-01 / S-UX-01M`
- Likely files: `src/screens/CreateTaskScreen.tsx`, `src/ui/viewAdapters/useCreateTaskViewAdapter.ts`, `src/ui/viewAdapters/__tests__/useCreateTaskViewAdapter.test.ts`, `src/__tests__/integration/CreateTaskScreen.test.tsx`, and any nearby project/location data helper needed to source per-project location options
- Interaction rules (must): preserve the existing create-task workflow, preserve the shell/header styling already established, preserve attachment behavior, preserve assignment semantics while moving the field, preserve project-scoped behavior for location options
- Interaction rules (must never): do not reintroduce a floating submit layer, do not make location history global, do not keep the standalone `Assignment` section after moving `Assign To`, do not broaden into an unrelated create-task redesign
- Acceptance checks: confirm the `Create Task` button appears below attachments in scroll flow; confirm the old gap/layer is gone; confirm `Location` offers existing project-specific options plus `Add new location`; confirm `Assign To` appears in `Task Basics`; confirm the standalone `Assignment` section is removed
