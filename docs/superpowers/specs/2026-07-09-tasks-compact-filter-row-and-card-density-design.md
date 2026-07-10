# Tasks Compact Filter Row And Card Density Design

## Goal

Reduce Tasks screen top-of-list real estate by replacing dropdown-style filter controls with a compact four-button filter strip, while tightening card typography and surfacing overdue tasks more clearly.

## Scope

This design applies only to the Tasks screen search/filter row and the task row card presentation used on that screen.

## Current Problems

- The current filter set is not aligned with the desired task-list workflow of `All`, `Queue`, `Status`, and `Overdued`.
- The current search section still needs stronger default spacing around the search bar block.
- The existing filter controls still carry older button-model assumptions around queue/bucket/sort behavior.
- The gap between the search field and filters is still visually looser than desired.
- Task row typography is larger than necessary for a dense operational list.
- The task card meta date does not adapt to the chosen sort field.

## Approved Interaction Model

### Compact Filter Controls

The Tasks screen keeps a single filter row directly below the search field.

The row contains four tap targets:

- All button
- Queue button
- Status button
- Overdue button

The first three buttons are equal-width controls.

All four buttons render visible titles and visible selected state/value text.

The control area should prefer a single row on standard phone widths, but the full filter section must never exceed two rows on narrower widths.

### Toggle-Only Behavior

The `Queue` and `Status` buttons are single-tap cyclers. No dropdown menus, sheets, or popovers are shown from this row.

Approved behavior:

- `All` resets to the full task list
- `Queue` cycles: Mine -> Team
- `Status` cycles: New -> Doing -> Review
- `Overdue` switches the list to overdue-only tasks

There is no visible Sort button in this model.

### Overdue Badge

The `Status` button no longer shows a red numeric badge.

The dedicated `Overdue` button replaces that role at the filter-strip level.

## Layout And Spacing

### Search Row Spacing

The search bar block should have default outer spacing of `20 pt` above and `20 pt` below.

This spacing applies around the search bar section, not as internal padding inside the input.

### Search Label Removal

The Tasks search input should not render the visible `Search` label above the field.

The input may continue to use placeholder text and internal accessibility labeling, but the extra visible label line should be removed so the search area stays more compact.

### Filter Row Density

The filter row uses tighter horizontal spacing than the current implementation so that all four controls fit on one line on standard phone widths where possible.

On narrower widths, the controls may wrap, but the total filter area must not exceed two rows.

The row preserves the existing outer screen gutter and only reduces internal control-row spacing and control footprint.

### Filter Button Typography

The filter buttons should reduce their internal typography so the controls stay compact and readable.

Recommended sizing:

- filter label text: reduce from `text-base` to `text-sm`
- filter value text: reduce from `text-lg` to `text-base`
- Order control icon sizing may remain visually balanced with the reduced text sizing

All four buttons may use up to two visible text lines internally, but no individual button should exceed two lines.

This means each button can show:

- line 1: title
- line 2: current state/value

Even with this structure, the total control section must still remain within the two-row maximum described above.

### Filter Button Content Simplification

Filter buttons should not show inline numeric counters in their visible text.

Approved button titles and state/value text:

- `All`
- `Queue` with values `Mine` and `Team`
- `Status` with values `New`, `Doing`, and `Review`
- `Overdue`

The `Status` button must not show the previous red number-counter badge.

## Card Presentation

### Typography Density

Task cards on the Tasks screen reduce typography by one additional step from the current compact implementation:

- title: text-lg -> text-base
- subtitle/context line: text-base -> text-sm
- line-3 meta/status row text: text-sm

This change applies to the Tasks screen usage of the shared row card, not a global typography change for every screen using the component.

### Title Truncation

Long task titles must truncate with ellipsis instead of expanding unpredictably.

The card should preserve explicit truncation behavior and remain stable within the tighter layout.

The existing multi-line clamp behavior may remain as long as overflow clearly truncates to ellipsis.

### Line 3 Status Badge

The task status must render as a pill-style badge on line 3, right-aligned.

It should no longer render in the current top-right slot alongside the title/subtitle block.

Line 3 now consists of:

- left: sort-aware date/meta label
- right: status pill badge

The line-3 date label and status badge text should use the same base text size as line 2 (`text-sm`).

### Overdue Floating Badge

Overdue tasks must render a larger floating badge at the upper-left corner of the task card.

Badge label text: `Overdue`

This badge is separate from the line-3 status badge.

Non-overdue tasks must not render this floating `Overdued` badge.

## Sort-Aware Date Label

The task card meta line remains due-date-oriented because the Tasks screen no longer exposes user-selectable sorting.

### Default List Ordering

The Tasks list should always default to due-date ordering in ascending order.

This means:

- earlier due dates appear first
- the most overdue task appears at the top

### Required Label

- display `Due: YYYY-MM-DD` when a due date exists

### Fallback Rule

If a task does not have a due date, the adapter should fall back to the next meaningful available task date label rather than rendering a blank meta line.

The fallback must remain deterministic and user-readable.

## Implementation Boundaries

### useTasksViewAdapter.ts

This adapter is responsible for:

- `All` reset behavior
- `Queue` cycle sequencing
- `Status` cycle sequencing
- `Overdue` overdue-only filtering
- default due-date ascending sorting
- due-date label generation
- deterministic fallback date label generation

This keeps the screen component presentational and keeps card metadata logic close to the existing task list derivation.

### TasksScreen.tsx

This screen is responsible for:

- removing the dropdown panels for queue, status, sort, and sort direction
- rendering the compact single-row control layout
- rendering visible titles for `All`, `Queue`, `Status`, and `Overdue`
- removing the Sort button entirely
- removing the red numeric badge from the `Status` button
- applying `20 pt` outer spacing above and below the search bar block
- passing reduced typography props into the shared card component
- passing line-3 status badge styling into the shared card component
- passing `Overdue` floating-badge visibility into the shared card component

### ActivityStyleRowCard.tsx

This shared component should remain generic.

It should continue to support:

- smaller className overrides from the Tasks screen
- explicit truncation for long titles
- an optional top-left corner marker slot
- a bottom metadata row with separate left and right slots

No Tasks-specific business logic should be added to the shared card component.

## Testing Requirements

### Screen Tests

Update Tasks screen tests to verify:

- all four controls render on the compact row
- dropdown menu panels no longer render
- tapping each control cycles values in the approved sequence
- `All` resets to the full task list
- `Queue` cycles `Mine -> Team`
- `Status` cycles `New -> Doing -> Review`
- `Overdue` filters the list to overdue-only items
- `Sort` does not render
- `20 pt` outer spacing is applied above and below the search bar block
- the visible `Search` label is no longer rendered above the search field
- reduced filter-button typography classes are applied
- all four buttons respect the two-line-per-button maximum
- the control container does not require more than two rows in the intended responsive layout contract
- inline counters are not rendered inside the filter buttons
- visible titles render for `All`, `Queue`, `Status`, and `Overdue`
- reduced task card typography classes are passed to the shared row card
- status renders as a right-aligned pill on line 3
- overdue tasks render the larger floating `Overdue` badge in the upper-left card corner
- non-overdue tasks do not render the floating `Overdue` badge

### Adapter Tests

Add or update adapter-focused tests to verify:

- `All` resets to the full task set
- `Queue` cycles `Mine -> Team`
- `Status` cycles `New -> Doing -> Review`
- `Overdue` filters overdue-only tasks
- default sorting is due-date ascending
- due-date fallback labeling is deterministic when the preferred date is missing
- fallback date labeling is deterministic when the preferred date is missing

## Non-Goals

- No redesign of task card structure beyond density/truncation/date label behavior
- No changes to Activity screen controls
- No additional filters beyond the approved `All` / `Queue` / `Status` / `Overdue` concepts
- No new persistent user preference storage for filter selections

## Acceptance Criteria

- The four controls fit on one row on standard phone width where possible
- The filter control area never exceeds two rows
- The first three controls share the same width
- Filter controls no longer open menus and instead cycle through values on tap
- `All` resets to the full task list
- `Queue` cycles only `Mine` and `Team`
- `Status` cycles only `New`, `Doing`, and `Review`
- `Overdue` filters to overdue-only tasks
- There is no visible Sort button
- The list is ordered by due date ascending, with the most overdue item on top
- Filter button label and value text are reduced enough to support the two-row maximum
- Each button uses no more than two internal text lines
- Filter buttons do not show inline counters
- Visible button titles are `All`, `Queue`, `Status`, and `Overdue`
- The visible `Search` label above the search field is removed
- The search bar block has `20 pt` outer spacing above and below
- Tasks card title text is reduced by one additional size step
- Tasks card line 2 and line 3 use the same text size
- Task status is shown as a right-aligned pill badge on line 3
- Overdue tasks show a floating `Overdue` badge at the upper-left corner of the task card
- Long task titles truncate with ellipsis
- Card date text remains due-date-oriented, with deterministic fallback behavior
