# Tasks Compact Filter Row And Card Density Design

## Goal

Reduce Tasks screen top-of-list real estate by replacing dropdown-style filter controls with compact cycling buttons, while tightening card typography and making the card date label follow the active sort mode.

## Scope

This design applies only to the Tasks screen search/filter row and the task row card presentation used on that screen.

## Current Problems

- The current four filter controls consume two rows because the Order button is too wide.
- All controls open menus, which increases vertical space and interaction cost.
- The Bucket control does not surface overdue pressure at a glance.
- The gap between the search field and filters is still visually looser than desired.
- Task row typography is larger than necessary for a dense operational list.
- The task card meta date does not adapt to the chosen sort field.

## Approved Interaction Model

### Compact Filter Controls

The Tasks screen keeps a single filter row directly below the search field.

The row contains four tap targets:

- Queue
- Bucket
- Sort By
- Order

The first three buttons are equal-width controls.

The Order control is intentionally narrower than the other three controls and uses only an arrow icon instead of the word Order or a text value.

### Toggle-Only Behavior

All four controls are single-tap cyclers. No dropdown menus, sheets, or popovers are shown from this row.

Each tap advances to the next option in a fixed cycle:

- Queue: All -> My Queue -> Team Queue
- Bucket: All -> New -> Doing -> Review
- Sort By: Due -> Modified -> Created
- Order: Latest -> Earliest

The Order control visually communicates direction using up/down arrow iconography rather than text labels.

### Overdue Badge

The Bucket button shows a red badge in its corner.

The badge value is the overdue count for the currently visible filtered list, not for the total queue/project universe.

This means the overdue badge must reflect the current combination of:

- selected queue
- selected bucket
- selected project scope
- active search query
- any other list-affecting Tasks-screen filtering already in effect

## Layout And Spacing

### Search Row Spacing

The vertical spacing between the search bar and the filter row is reduced.

### Filter Row Density

The filter row uses tighter horizontal spacing than the current implementation so that all four controls fit on one line on standard phone widths.

The row preserves the existing outer screen gutter and only reduces internal control-row spacing and control footprint.

## Card Presentation

### Typography Density

Task cards on the Tasks screen reduce typography by one step from the current Tasks-specific sizing:

- title: text-xl -> text-lg
- subtitle/context line: text-lg -> text-base
- meta/date line: text-base -> text-sm
- status/badge label: text-base -> text-sm

This change applies to the Tasks screen usage of the shared row card, not a global typography change for every screen using the component.

### Title Truncation

Long task titles must truncate with ellipsis instead of expanding unpredictably.

The card should preserve explicit truncation behavior and remain stable within the tighter layout.

The existing multi-line clamp behavior may remain as long as overflow clearly truncates to ellipsis.

## Sort-Aware Date Label

The task card meta line must adapt to the currently selected sort field.

### Required Labels

- If sort is Due, display Due: YYYY-MM-DD
- If sort is Modified, display Modified: YYYY-MM-DD
- If sort is Created, display Created on: YYYY-MM-DD

### Data Source Rules

- Due uses the task due date
- Modified uses the latest meaningful activity/update/edit timestamp already used by the adapter's recency logic
- Created uses the task created date

### Fallback Rule

If a task does not have the date required by the active sort field, the adapter should fall back to the next meaningful available task date label rather than rendering a blank meta line.

The fallback must remain deterministic and user-readable.

Recommended fallback order:

- for Due: due date -> modified date -> created date
- for Modified: modified date -> created date -> due date
- for Created: created date -> modified date -> due date

## Implementation Boundaries

### useTasksViewAdapter.ts

This adapter is responsible for:

- fixed-cycle control sequencing
- sort option ordering
- visible overdue badge count
- sort-aware date label generation
- fallback date label generation

This keeps the screen component presentational and keeps card metadata logic close to the existing task list derivation.

### TasksScreen.tsx

This screen is responsible for:

- removing the dropdown panels for queue, bucket, sort, and sort direction
- rendering the compact single-row control layout
- rendering the narrow arrow-only Order button
- rendering the red overdue badge on Bucket
- tightening the search-to-filter spacing
- passing reduced typography props into the shared card component

### ActivityStyleRowCard.tsx

This shared component should remain generic.

It should continue to support:

- smaller className overrides from the Tasks screen
- explicit truncation for long titles

No Tasks-specific business logic should be added to the shared card component.

## Testing Requirements

### Screen Tests

Update Tasks screen tests to verify:

- all four controls render on the compact row
- Order uses icon-only presentation
- dropdown menu panels no longer render
- tapping each control cycles values in the approved sequence
- the Bucket badge renders and reflects the visible overdue count
- tighter spacing classes are applied where expected
- reduced task card typography classes are passed to the shared row card

### Adapter Tests

Add or update adapter-focused tests to verify:

- sort options are ordered Due -> Modified -> Created
- sort direction toggles between latest and earliest behavior
- visible overdue count is derived from the filtered visible list
- date labels switch based on the active sort field
- fallback date labeling is deterministic when the preferred date is missing

## Non-Goals

- No redesign of task card structure beyond density/truncation/date label behavior
- No changes to Activity screen controls
- No additional filters beyond the existing queue/bucket/sort/order concepts
- No new persistent user preference storage for filter selections

## Acceptance Criteria

- The four controls fit on one row on standard phone width
- The first three controls share the same width
- The Order control is visibly narrower and arrow-only
- Filter controls no longer open menus and instead cycle through values on tap
- The Bucket control shows a red overdue badge for the currently visible filtered list
- Search-to-filter spacing is tighter than the current screen
- Tasks card text is reduced by one size step
- Long task titles truncate with ellipsis
- Card date text changes to match the active sort field, with deterministic fallback behavior
