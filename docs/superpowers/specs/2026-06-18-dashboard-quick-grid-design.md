# Dashboard Quick-Grid Design

## Goal

Render a compact, modern responsibility summary quick-grid in the modern dashboard so users can scan `Action Required`, `In Progress`, and `Awaiting Approval` counts, including overdue attention signals, without changing the underlying adapter or presentation boundaries.

## Scope

This pass covers:

- consuming the six dashboard responsibility scalar metrics already exposed by `useDashboardViewAdapter()`
- rendering a compact 3-tile quick-grid in `src/screens/DashboardScreen.tsx`
- attaching stable `testID` hooks to each tile and overdue indicator
- updating the dashboard screen test suite to verify baseline and conditional overdue rendering
- validating the dashboard screen against TypeScript and regression suites

This pass does not cover:

- changes to `src/ui/viewAdapters/useDashboardViewAdapter.ts`
- changes to `src/ui/contracts/viewAdapters.ts`
- changes to `src/components/primitives/`
- new navigation or interaction behavior for the tiles
- dashboard token distribution logic, which is already complete

## Placement

The quick-grid will be inserted directly below the existing dashboard header row and above the project `FlatList`.

The resulting vertical stack in `DashboardScreen.tsx` will be:

1. header row with title and utility buttons
2. quick-grid summary section
3. project list
4. floating create-task FAB

This keeps the summary visible near the top of the screen while preserving the current project list and FAB behavior.

## Layout

The quick-grid uses **Option A**, the compact 3-tile layout.

Design characteristics:

- single horizontal row
- three equal-width tiles
- tight vertical spacing to preserve project-card visibility
- consistent rounded card treatment aligned with the modern dashboard shell
- no nested scrolling and no impact on list virtualization

Each tile will contain:

- label
- primary count
- overdue indicator only when overdue count is greater than zero

## Tiles

### Action Required

- Source fields:
  - `actionRequiredCount`
  - `actionRequiredOverdueCount`
- Palette:
  - orange card family
  - red urgency badge when overdue count is present
- Overdue treatment:
  - render inline badge text like `2 Overdue`
  - render only when `actionRequiredOverdueCount > 0`

### In Progress

- Source fields:
  - `inProgressSentCount`
  - `inProgressSentOverdueCount`
- Palette:
  - blue card family
- Overdue treatment:
  - render compact warning-toned sub-label
  - render only when `inProgressSentOverdueCount > 0`

### Awaiting Approval

- Source fields:
  - `awaitingApprovalCount`
  - `awaitingApprovalOverdueCount`
- Palette:
  - cyan card family
  - red urgency badge when overdue count is present
- Overdue treatment:
  - render inline urgent badge text like `1 Overdue`
  - render only when `awaitingApprovalOverdueCount > 0`

## Data Consumption

`DashboardScreen.tsx` will destructure the six responsibility metrics directly from:

- `const { output, visibility } = useDashboardViewAdapter();`
- `output.scalarMetrics`

No new inline business logic is introduced into the screen.

Allowed screen-layer work:

- local destructuring
- small presentational helper structure if needed for rendering repetition
- conditional rendering based only on `> 0`

Disallowed screen-layer work:

- responsibility-token calculation
- overdue calculation
- data re-bucketing
- adapter-style reductions or filtering

## Styling Constraints

- continue using the current modern dashboard utility-class approach
- preserve `bg-slate-50` page background and current white utility button styling
- avoid text clipping on small mobile widths
- prefer compact text sizes and spacing so the three cards remain readable in one row
- keep the project `FlatList` container and footer spacing intact

## Testability

Each tile and overdue indicator will receive a stable `testID`.

Planned IDs:

- `dashboard-screen__metric_action_required`
- `dashboard-screen__metric_action_required_overdue`
- `dashboard-screen__metric_in_progress`
- `dashboard-screen__metric_in_progress_overdue`
- `dashboard-screen__metric_awaiting_approval`
- `dashboard-screen__metric_awaiting_approval_overdue`

These IDs support deterministic assertions without depending on styling or text structure.

## Validation

The implementation will be considered complete when all of the following pass:

- `npx tsc --noEmit`
- `npx jest src/screens/__tests__/DashboardScreen.test.tsx --runInBand`
- `npm run test:regression`

## Risks

- three equal-width cards can become cramped on narrow devices if text is too large
- overdue badge copy must remain compact to avoid wrapping
- adding the quick-grid above the list must not disturb the existing FAB overlay or project-card rendering

## Mitigations

- keep labels short and use compact spacing
- show overdue indicators conditionally only when non-zero
- place the quick-grid outside the `FlatList` but within the same vertical dashboard content stack
- preserve current `FlatList` structure and footer spacer
