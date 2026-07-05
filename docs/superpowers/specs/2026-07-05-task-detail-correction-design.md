# Task Detail Correction Design

**Date:** 2026-07-05  
**Scope:** Refined correction pass for the redesigned Task Detail surface before moving to the next roadmap slice.

## Goal

Refine the current Task Detail redesign so it matches the intended compact, photo-centric, operational interaction model:

- no duplicate camera affordance in the top area
- no oversized standalone critical treatment
- no wasted hero space on low-value metadata
- a clearer active-entry stage above the work thread
- a safer model for text-only and document-bearing updates
- tighter permission and back-navigation behavior

This is still a focused correction pass to the current Task Detail redesign, not a new independent redesign slice.

## Approved Direction

The approved direction is now:

- dynamic bottom-nav camera behavior on Task Detail
- no dedicated top camera shortcut
- no visible `Progress update` button
- text-only updates go through comment for now
- back from the camera/update flow returns to Task Detail
- compact hero with no project-label string above the title
- status chip carries quick task-state context
- compact critical flag inside the hero/title area
- visible inline secondary actions
- creator-only visibility for `Edit task details`
- newest-first work thread
- pinned active-entry stage above the thread
- top-edge trigger for determining the active entry
- photo, text-only, and PDF-bearing entries all render through the same active-entry stage model

## Design Decisions

### 1. Dynamic Camera Behavior

When Task Detail is the active screen:

- the bottom navigation camera button becomes context-sensitive
- activating it routes directly into the same-task photo update flow
- the dedicated Task Detail top camera button is removed
- if the user backs out of the camera/update flow, they should return to Task Detail rather than to the dashboard

When Task Detail is not the active screen:

- the bottom navigation camera retains its normal global capture behavior

#### Reasoning

- removes duplicate camera entry points
- prevents the top area from feeling crowded
- keeps the camera as a consistent global affordance while still becoming smart in context
- preserves continuity when the user is updating a specific task

### 2. Hero Compaction and Critical Marker Treatment

The hero should be more compact than the current implementation.

Approved behavior:

- remove the low-value project-label string above the title
- let the task title become the first strong line in the hero
- let the first status chip such as `In Progress` carry the quick state signal
- critical state is displayed as a small flag/badge inside the hero/title area
- the flag is treated as metadata, not as a standalone section

#### Reasoning

- the project-label string is taking space without earning enough visual value
- the title should dominate more strongly
- critical is important, but it is still metadata rather than a primary content block

### 3. Active-Entry Stage Behavior

The top area below the hero should no longer be thought of as only an “evidence card.”

It should behave as a **pinned active-entry stage**.

Approved behavior:

- the work thread remains vertically scrollable and newest-first
- the top-most entry reaching the top edge of the thread region becomes the active entry
- the pinned stage updates to display the active entry
- the pinned stage does not control which thread entry is active
- horizontal swipe inside the stage only changes photos belonging to the active entry

This means the interaction is:

- vertical scroll = change active entry
- horizontal swipe = change photo within the active entry

#### Reasoning

- keeps the mental model clean
- avoids disorienting bi-directional control between stage and thread
- makes the pinned stage feel like a focused display rather than a controller

### 4. Entry Type Modes Inside the Active-Entry Stage

The active-entry stage must safely support three types of entries.

#### Photo-bearing entry

- display the active entry in photo mode
- show one prominent photo with horizontal swipe across that entry’s photo set
- show event title, actor/timestamp, and short supporting summary below the image

#### Text-only entry

- switch the stage into a neutral no-photo state
- do **not** carry forward the previous entry’s image
- still show event title, actor/timestamp, and short supporting summary

This rule is mandatory because otherwise a photo from another entry could be mistakenly associated with a text-only update.

#### PDF-bearing entry

- switch the stage into a document preview mode
- show PDF/document styling rather than pretending it is a photo
- include file identity and short supporting summary/status

#### Reasoning

- the stage must represent the active entry faithfully
- no entry should accidentally inherit media from a different entry
- PDFs should participate in the same narrative model without being forced into an image-only treatment

### 5. Work Thread Order and Trigger

Approved thread behavior:

- newest first
- the active entry is determined by the top-edge trigger, not by center focus and not by tap-to-activate

#### Reasoning

- the first thing the user sees should be the latest task state
- the pinned stage should usually reflect the current/latest state first
- top-edge activation is predictable and easy to understand

### 6. Information Density Limits

The pinned active-entry stage must be height-capped and summary-based.

Approved behavior:

- the stage should show only the summary version of the active entry
- if an entry contains more information than fits comfortably, full detail remains in the thread card below
- the stage must not grow so tall that it blocks access to later entries

#### Reasoning

- protects scrollability and reachability of the thread
- keeps the stage stable while the thread remains the detailed narrative

### 7. Action Hierarchy

The action hierarchy should remain:

- one primary action promoted
- secondary actions visible inline lower in the screen

Approved secondary-action behavior:

- remove the visible `Progress update` button
- for now, text-only progress updates should happen through comment
- `Edit task details` is demoted into the visible secondary action group
- `Edit task details` is only visible to the creator of the task
- secondary actions remain visible rather than hidden in a sheet or overflow menu

#### Reasoning

- keeps actions discoverable
- removes redundant progress affordances after camera becomes the photo-driven update path
- avoids over-promoting edit behavior above workflow behavior
- enforces the correct permission model directly in the interface

## Final Screen Structure

Approved Task Detail order:

1. compact task hero
2. pinned active-entry stage
3. newest-first work-thread section
4. subtasks
5. visible inline secondary actions

Explicit removals from the current version:

- no separate Task Detail top camera button
- no standalone large `Mark critical` section
- no project-label string above the task title
- no visible `Progress update` button

## Interaction Rules

### Camera

- Task Detail active: bottom-nav camera routes to same-task update/photo flow
- leaving the camera/update flow via back returns to Task Detail
- any other screen: bottom-nav camera retains global capture behavior

### Hero

- no project-label string above the title
- title is the first strong line
- first status chip handles quick state context
- critical state is visible as a compact flag in the hero

### Active-Entry Stage

- pinned above the thread
- controlled by the top-most active thread entry
- does not control the thread vertically
- horizontal swipe only changes photos within the active entry

### Text-only Entries

- switch the stage to a neutral no-photo state
- never inherit or reuse a previous entry’s photo

### PDF Entries

- switch the stage to a document preview mode
- show document identity and summary/status rather than a photo layout

### Edit Permissions

- `Edit task details` appears only for the creator of the task
- non-creators must not see this action

## Non-Goals

This correction pass does **not** include:

- a new batch capture review flow
- a new photo annotation model
- a redesign of the global bottom navigation outside the camera-context behavior needed for Task Detail
- a new hidden action menu or bottom sheet pattern
- changes to the broader Activity or Tasks surfaces

## Validation Targets

The correction is only complete if all of the following are true:

1. Task Detail no longer renders a separate top camera button
2. bottom-nav camera uses task-detail context when Task Detail is active
3. back from the camera/update flow returns to Task Detail
4. hero no longer renders the top project-label string
5. critical marker appears only as a compact hero/title flag
6. no visible `Progress update` button remains
7. comment remains the text-only update path for now
8. pinned active-entry stage stays above the work thread
9. work thread is newest-first
10. top-edge trigger determines the active entry
11. text-only entries render a neutral no-photo state in the stage
12. PDF entries render a document-preview state in the stage
13. `Edit task details` is visible for task creators
14. `Edit task details` is hidden for non-creators

## Implementation Notes

This correction should be planned and executed as a focused follow-up to the existing Task Detail redesign work. It should reuse the current redesigned screen structure and adapter model where possible, rather than replacing the Task Detail redesign wholesale.

The most important conceptual change is that the previous “evidence card” should now be treated as a **pinned active-entry stage** rather than a simple photo strip.
