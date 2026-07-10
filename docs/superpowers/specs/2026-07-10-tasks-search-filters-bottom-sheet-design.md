# Tasks Search Filters Bottom Sheet Design

## Goal

Replace the current Tasks screen four-button filter strip with a compact `Search + Filters` header control that is easier to scan, easier to extend, and better aligned with the existing Tasks screen visual style.

## Scope

This design applies only to the Tasks screen search and filtering experience:

- the top search/filter controls
- active-filter chip presentation
- the filter bottom sheet
- related filter behavior and state transitions

This design supersedes the previous four-button filter-strip model for the Tasks screen filter UI, but does not redefine the current task-card density work unless required by the new header/filter flow.

## Problem Summary

The current `All / Queue / Status / Overdue` button row is functionally correct but visually heavy.

The main issues are:

- four equal-weight buttons make the header feel crowded
- cycling controls are harder to understand than explicit filter choices
- the current layout does not scale well when more filters are added later
- the search and filter area needs to feel like part of the current off-white Tasks body, not a separate design system

## Approved Direction

### High-Level Model

Use a single-row `Search + Filters` control area:

- left: compact search field
- right: fixed-width `Filters` button

All explicit filter controls move into a bottom sheet.

When filters are active, surface them as removable chips below the search row.

## Layout

### Placement

This section appears below the existing Tasks screen header.

It must not repeat the `Tasks` title inside the section itself.

### Background

The search row, active chips row, and task list all sit directly on the existing Tasks screen off-white body background.

Do not place the search/filter section on a teal band.

### Search + Filters Row

Render two controls side by side:

- `Search` field: `flex-1`
- `Filters` button: fixed-width, `flex-shrink-0`

The row should preserve the current screen gutter and compact top-of-list density.

Approved spacing around this section:

- top padding from the header into the search section: `8pt`
- gap from the search/filter row to the active chips row: `4pt`
- bottom padding under the active chips row before the task list begins: `8pt`

If the active chips row is hidden, the search section should still keep the approved top spacing and bottom spacing without leaving extra phantom vertical gaps.

### Search Field

The search field should visually align with the current screen body treatment rather than a separate frosted-on-teal presentation.

Approved qualities:

- compact height
- left search icon
- placeholder text: `Search tasks...`
- right-aligned task count
- task count uses monospace styling
- visually integrated with the off-white body treatment

### Filters Button

The button should be a pill or rounded rectangle with:

- sliders-style icon
- label: `Filters`

Default state:

- ghost or quiet style
- no badge

Filtered state:

- stronger active styling using the current Tasks palette
- active-filter badge at the top-right

Do not introduce a new orange-primary visual system for this button. Keep the color direction aligned with the current Tasks screen palette.

## Active Chips Row

### Rendering Rule

Render the chip row only when one or more bottom-sheet filters are active.

If no bottom-sheet filters are active:

- do not render the chips row
- do not leave phantom vertical space below the search row

### Position

The chips row appears below the search/filter row with a `4pt` top margin.

### Appearance

Each chip shows an active filter value and an `✕` affordance on the right.

Approved qualities:

- lightweight chip presentation
- visually compatible with the off-white body background
- compact enough to wrap to multiple lines if needed

### Chip Removal Behavior

Tapping the `✕` on a chip:

- removes that filter immediately
- immediately updates the task list based on the new active filter set
- immediately updates the filters button badge count

Chip removal does not require reopening the sheet and does not wait for `Apply Filters`.

## Result Count

When filters are active, the list may show a summary such as:

- `Showing 3 of 7 tasks`

This is optional in implementation polish, but if rendered it should appear below the active chips and before the task list in a low-emphasis style consistent with the current screen.

## Bottom Sheet

### Open / Close

The `Filters` button opens a bottom sheet that slides up from the bottom.

The background behind it uses a dark scrim overlay.

The sheet is content-driven in height rather than full-screen.

### Sheet Chrome

The sheet includes:

- centered drag handle
- title: `Filters`
- right-aligned text action: `Reset all`

### Queue Section

Label:

- `QUEUE`
- uppercase monospace treatment

Options:

- `All queues`
- `Inbox`
- `Outbox`
- `Archived`

Queue options use explicit toggle chips rather than cycling behavior.

### Status Section

Label:

- `STATUS`
- uppercase monospace treatment

Options:

- `Any status`
- `New`
- `Doing`
- `Review`
- `Overdue`

Status options use explicit chips, not tap-to-cycle behavior.

Active status chips keep the current approved semantic color model:

- `New`: blue-accent chip
- `Doing`: teal-aligned active chip using the current Tasks palette direction
- `Review`: purple-accent chip
- `Overdue`: red-accent chip
- `Any status`: navy/default active chip

### Overdue Window Section

Label:

- `OVERDUE WINDOW`
- uppercase monospace treatment

Options:

- `Show all`
- `3 active`
- `1 week`
- `1 month`

This section is primarily relevant when an overdue-oriented filter is active, but it remains part of the bottom-sheet model so the filter system can scale without returning to header clutter.

### Apply Button

The bottom of the sheet includes a full-width primary action:

- label: `Apply Filters`
- navy background
- white bold text
- safe-area-aware bottom spacing

## Filter Behavior Model

### Search

Search remains independent from the bottom-sheet filter count.

Search affects visible tasks immediately as the user types.

### Sheet Selections

The bottom sheet acts as a staging area for filter changes.

Behavior:

- tapping filter chips inside the sheet changes staged selections
- tapping `Apply Filters` closes the sheet and updates the active filter set
- tapping the scrim dismisses the sheet without applying staged changes
- tapping `Reset all` clears staged selections back to defaults without closing the sheet

### Active Filter Badge Count

The badge count on the `Filters` button includes only active bottom-sheet filters.

It does not include the search query.

Examples of counted filters:

- `Queue`
- `Status`
- `Archived`
- `Overdue window`

### Default State

Default screen state:

- search query empty
- no bottom-sheet filters active
- filters button in quiet state
- no badge
- no active chips row

## Naming

Approved queue terminology:

- `Inbox`
- `Outbox`

Avoid using `Team` as a visible label in this filter system because it implies a future team-wide queue concept that does not yet exist.

## Implementation Boundaries

### useTasksViewAdapter.ts

This adapter should own:

- search query state
- staged vs applied filter state for the bottom sheet
- active filter count derivation
- chip model derivation
- immediate chip-removal behavior
- final visible-task filtering logic

### TasksScreen.tsx

This screen should own:

- rendering the search field
- rendering the filters button
- rendering the active chips row
- rendering the bottom sheet chrome and controls
- wiring screen interactions to adapter actions

The screen should remain presentational where possible.

### Shared Components

Prefer reusing current primitives and card components where they still fit.

Do not broaden this work into a general global filter-sheet framework unless the Tasks implementation clearly requires a reusable abstraction.

## Testing Requirements

### Screen Tests

Update or add screen tests to verify:

- the four-button filter strip no longer renders
- the search row renders as `Search + Filters`
- the section sits on the off-white body treatment
- the search section uses `8pt` top padding below the header
- the filters button shows no badge in the default state
- the active chips row is hidden when no bottom-sheet filters are active
- the filters button badge count reflects active bottom-sheet filters only
- the search query does not increase the filters badge count
- active chips render below the search row with a `4pt` gap when filters are applied
- the search section keeps `8pt` bottom padding before the task list begins
- tapping chip `✕` removes that filter immediately and updates the visible list
- the bottom sheet opens from the filters button
- `Reset all` clears staged selections without closing the sheet
- tapping the scrim dismisses without applying
- tapping `Apply Filters` commits staged selections and closes the sheet

### Adapter Tests

Add or update adapter tests to verify:

- default state has no applied bottom-sheet filters
- badge count excludes search query
- staged sheet state does not affect the visible list until apply
- applying staged filters updates visible tasks and active chips
- resetting staged filters restores defaults
- chip removal updates applied filters immediately
- queue uses `Inbox / Outbox / Archived / All queues` values correctly
- status uses explicit values rather than cycle sequencing

## Non-Goals

- No redesign of the existing Tasks screen header component
- No change to task-card layout unless needed for spacing harmony with the new filter header
- No implementation of a real team-wide queue concept
- No global shared filter system outside the Tasks screen unless later justified

## Acceptance Criteria

- The Tasks screen no longer uses the four-button filter strip
- The top control area is a compact `Search + Filters` row
- The search/filter section sits on the existing off-white body background
- The section does not repeat the `Tasks` title below the header
- The search/filter section uses `8pt` top padding, `4pt` search-to-chips spacing, and `8pt` bottom padding before the list
- The filters button shows a badge only when bottom-sheet filters are active
- Search text does not count toward the filters badge
- Active filters render as removable chips below the search row
- Removing a chip updates the screen immediately
- The bottom sheet uses explicit filter chips for queue, status, and overdue window
- The sheet dismisses via scrim without applying staged changes
- `Apply Filters` commits staged changes and updates the chips row
- `Reset all` clears staged selections without closing the sheet
- Visible queue labels are `Inbox` and `Outbox`
