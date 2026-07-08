# WS-UX / M-UX-01 / S-UX-01K Activity + Tasks Latest UI Refinement

## Summary

Refine the current `Activity` and `Tasks` screens with a small, screenshot-driven polish pass that preserves the approved worker-shell direction, search-first task flow, branded header treatment, and existing navigation behavior.

This pass is intentionally narrow. It adjusts spacing and feed-window behavior only where the latest review identified visible friction.

## Approved Direction

- Design Decision: Use a targeted refinement pass in the existing screen and adapter files rather than broadening into shared layout refactors.
- Design Decision: Increase the vertical separation between the `Activity` header and the active project title by another fixed 10pt.
- Design Decision: Limit `Recent Activity` to a rolling last-5-days window, defined as the last 120 hours from the current time.
- Design Decision: Make the `Tasks` header align exactly with the `Activity` header so the visible white top gap is removed.
- Design Decision: Reduce the fixed gap between the bottom of the search field and the top of the `Queue` / `Bucket` filter cards by about half.
- Design Decision: Keep the search-to-filter gap static in all screen states rather than making it depend on dropdown expansion.

## Visual Rules

- Design Decision: The `Activity` project title block should feel more clearly separated from the branded header without changing the card hierarchy beneath it.
- Design Decision: The extra `Activity` spacing is a fixed visual offset, not a responsive or conditional behavior.
- Design Decision: The `Tasks` header must sit flush to the top safe-area treatment in the same way as `Activity`, with no visible white strip above the teal shell.
- Design Decision: The `Tasks` search field and filter row should read as one compact control cluster, with a smaller but still breathable vertical gap.
- Design Decision: The reduced search-to-filter spacing becomes the single canonical gap for that control cluster and should remain unchanged whether filter menus are closed or expanded.

## Behavior Rules

- Design Decision: `Recent Activity` should only include active-project items whose source timestamp is newer than `Date.now() - 120 hours`.
- Design Decision: The rolling 120-hour filter applies before the final newest-first ordering is surfaced to the screen.
- Design Decision: Activity items outside the rolling window should be omitted rather than visually marked as stale.
- Design Decision: If no items remain after filtering, the current empty-state copy and structure remain unchanged.
- Design Decision: Drafts, queue counts, critical dates, and task-row behavior are unaffected by this refinement.

## Scope

### In Scope

- `DashboardScreen` spacing between the branded header and project title section
- `useDashboardViewAdapter()` filtering of `Recent Activity` to the last 120 hours
- `TasksScreen` header/top alignment correction
- `TasksScreen` fixed search-to-filter spacing reduction
- focused screen and adapter regression coverage for the changed behavior

### Out Of Scope

- task card redesign or typography changes beyond spacing already requested
- queue, bucket, search, or navigation behavior changes
- dashboard queue overview, drafts interaction, or critical-dates logic changes
- shared app-wide header redesign beyond what is required to restore parity between `Activity` and `Tasks`
- Supabase, store, or task-domain workflow changes

## Implementation Notes

- `DashboardScreen` should own the added 10pt title offset because this is a screen-specific hierarchy change, not a reusable primitive requirement.
- `useDashboardViewAdapter()` should own the 120-hour filter because it already maps raw task/update timestamps into `activityItems`.
- The rolling-window calculation should use raw timestamps from updates or fallback task activity timestamps before display formatting.
- `TasksScreen` should adjust its local top-area spacing so the screen body begins directly beneath the shared teal header treatment.
- The search/filter spacing should be represented by a single fixed margin value between the search field wrapper and the filter-row wrapper.

## Validation

- Design Decision: Extend adapter-level coverage to prove active-project activity older than 120 hours is excluded while newer items remain visible in newest-first order.
- Design Decision: Keep screen-level tests focused on structural hooks and behavior contracts rather than brittle screenshot assertions.
- Design Decision: Validate visually in the running iOS simulators after implementation, specifically checking `Activity` header-to-title spacing, `Recent Activity` trimming, `Tasks` top header alignment, and the reduced search-to-filter gap.

## Code Handoff

- Slice label: `WS-UX / M-UX-01 / S-UX-01K`
- Likely files: `src/screens/DashboardScreen.tsx`, `src/ui/viewAdapters/useDashboardViewAdapter.ts`, `src/screens/TasksScreen.tsx`, `src/screens/__tests__/DashboardScreen.test.tsx`, `src/screens/__tests__/TasksScreen.test.tsx`, `src/ui/viewAdapters/__tests__/useDashboardViewAdapter.test.ts`
- Interaction rules (must): preserve current task-row navigation, preserve current draft toggle behavior, preserve queue-dashboard routing, preserve existing empty-state copy.
- Interaction rules (must never): do not broaden this pass into new shared layout abstractions, do not alter queue/bucket semantics, do not change header branding, do not make the search-to-filter gap dynamic.
- Acceptance checks: compare `Activity` and `Tasks` headers in the simulator, confirm `Activity` title spacing visibly increases, confirm old activity beyond 120 hours is absent, confirm the `Tasks` control stack feels tighter without crowding, confirm no new white top gap appears on `Tasks`.
