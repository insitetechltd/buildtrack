# Task Detail Correction Design

**Date:** 2026-07-05  
**Scope:** Correction pass for the newly redesigned Task Detail surface before moving to the next roadmap slice.

## Goal

Refine the current Task Detail redesign so it better matches the intended interaction model:

- no duplicate camera affordance in the top area
- smaller, metadata-level critical treatment
- better evidence behavior and photo presentation
- tighter permission model for edit actions

This is a correction pass to the current Task Detail redesign, not a new independent redesign slice.

## Approved Direction

The approved direction is:

- dynamic bottom-nav camera behavior on Task Detail
- sticky evidence rail
- compact critical flag inside the task hero/title area
- visible inline secondary actions
- creator-only visibility for `Edit task details`

## Design Decisions

### 1. Dynamic Camera Behavior

When Task Detail is the active screen:

- the bottom navigation camera button becomes context-sensitive
- activating it routes directly into the same-task photo update flow
- the dedicated Task Detail top camera button is removed

When Task Detail is not the active screen:

- the bottom navigation camera retains its normal global capture behavior

#### Reasoning

- removes duplicate camera entry points
- prevents the top area from feeling crowded
- keeps the camera as a consistent global affordance while still becoming smart in context

## 2. Critical Marker Treatment

The existing `Mark critical` treatment should no longer appear as a standalone prominent section.

Instead:

- critical state is displayed as a small flag/badge inside the task hero/title row
- the flag is treated as task metadata, not as a primary section
- the state may still be toggled from the action area, but it should not dominate the layout

#### Reasoning

- critical is important, but it is still task metadata
- the current treatment visually overstates it relative to the task itself
- a small hero-level marker communicates state more cleanly

## 3. Evidence Rail Behavior

The evidence area should remain present near the top of Task Detail, but it needs different behavior.

Approved behavior:

- evidence appears as a sticky evidence rail directly below the task hero
- evidence thumbnails should display cleanly without awkward visual chopping
- once the page reaches the locked top position, the outer page should stop scrolling
- after that point, the work-thread section becomes the scrollable region
- as work-thread entries scroll upward, their own photo evidence continues the narrative below the sticky rail

This means the top stack behaves like:

1. task hero
2. sticky evidence rail
3. scrollable work thread below

#### Reasoning

- preserves instant access to recent/top-level evidence
- avoids the current clipped-thumbnail problem
- makes the work thread feel like a continuation of the top evidence context

## 4. Action Hierarchy

The action hierarchy should remain:

- one primary action promoted
- secondary actions visible inline lower in the screen

Approved secondary-action behavior:

- `Edit task details` is demoted into the visible secondary action group
- `Edit task details` is only visible to the creator of the task
- secondary actions remain visible rather than hidden in a sheet or overflow menu

#### Reasoning

- keeps actions discoverable
- avoids over-promoting edit behavior above workflow behavior
- enforces the correct permission model directly in the interface

## Final Screen Structure

Approved Task Detail order:

1. task hero
2. sticky evidence rail
3. work-thread section
4. subtasks
5. visible inline secondary actions

Explicit removals from the current version:

- no separate Task Detail top camera button
- no standalone large `Mark critical` section

## Interaction Rules

### Camera

- Task Detail active: bottom-nav camera routes to same-task update/photo flow
- any other screen: bottom-nav camera retains global capture behavior

### Critical

- critical state is visible as a small hero/title flag
- critical can still be toggled from actions, but not promoted as a separate section

### Evidence

- evidence rail stays pinned below the hero
- work thread scrolls independently below after lock position is reached
- work-thread photos remain visible as part of the evidence story

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
3. critical marker appears only as a small hero/title flag
4. sticky evidence rail remains at the top while the work-thread region scrolls
5. evidence thumbnails are no longer visibly chopped in the top evidence rail
6. `Edit task details` is visible for task creators
7. `Edit task details` is hidden for non-creators

## Implementation Notes

This correction should be planned and executed as a focused follow-up to the existing Task Detail redesign work. It should reuse the current redesigned screen structure and adapter model where possible, rather than replacing the Task Detail redesign wholesale.
