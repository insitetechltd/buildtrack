# WS-UX / M-UX-01 / S-UX-01J Activity + Tasks Search-First Fix

## Summary

Repair the current `Activity` and `Tasks` screen regressions while using the opportunity to move `Tasks` into a cleaner search-first list layout.

This slice restores the intended section hierarchy on `Activity`, brings back usable visual structure on `Tasks`, and replaces the queue-panel-first `Tasks` layout with a simpler dropdown-driven list that better emphasizes finding and opening tasks quickly.

## Approved Direction

- Design Decision: Restore the `Activity` screen header rhythm so there is no oversized blank gap before the page heading.
- Design Decision: Move `Active Project`, the project title, and project summary details to the same section level as `Queue Overview` and `Recent Activity`.
- Design Decision: Keep only inner grouped content such as `This Week's Critical Dates` inside the white `Active Project` card.
- Design Decision: `Recent Activity` cards use a conditional left thumbnail only when a preview photo exists; cards with no photo remain text-only.
- Design Decision: Replace the `Tasks` queue-wrapper-first layout with a search-first continuous list.
- Design Decision: Use dropdown controls for `Tasks` filtering rather than queue panels or segmented tabs.
- Design Decision: Both dropdowns must support an `All` state so the user can view the full list with no queue/bucket narrowing.

## Activity Rules

- Design Decision: `Active Project` must visually read as a peer section header, not as content buried inside a single outer card.
- Design Decision: Project summary text such as the date/day/weather line remains directly beneath the project title at section level.
- Design Decision: The `This Week's Critical Dates` group remains carded and visually grouped beneath the project summary.
- Design Decision: `Recent Activity` cards must preserve current tap behavior and continue opening the related task.
- Design Decision: If an activity item has a preview image, render a left thumbnail rail.
- Design Decision: If an activity item has no preview image, render the existing text-first card layout with no empty thumbnail placeholder.

## Tasks Rules

- Design Decision: The `Tasks` screen must always show one primary task list as the dominant content area.
- Design Decision: Search remains visible at the top and filters the currently visible task set.
- Design Decision: The queue dropdown offers `All`, `My Queue`, and `Team Queue`.
- Design Decision: The bucket dropdown offers `All`, `New`, `Doing`, and `Review`.
- Design Decision: Dropdown items show inline counts.
- Design Decision: Bucket dropdown counts are dynamic based on the current queue dropdown selection.
- Design Decision: When both dropdowns are `All`, the list shows the full task set.
- Design Decision: Narrowing one dropdown while the other stays `All` filters only by the selected dimension.
- Design Decision: The queue-wrapper cards and nested open/closed panel treatment are removed from the main `Tasks` layout for this slice.

## Tasks Ordering

- Design Decision: When the full list is shown, task ordering is `priority first`, then `latest update`, then `status flow`.
- Design Decision: Priority ordering should keep more urgent work ahead of lower-priority work.
- Design Decision: Within the same priority band, the most recently updated task appears first.
- Design Decision: If both priority and latest-update timestamps are tied, status flow is used as the final stable tie-breaker.
- Design Decision: The status-flow order is `New`, then `Doing`, then `Review`.

## Data and Count Behavior

- Design Decision: Queue counts reflect the currently visible project scope.
- Design Decision: Bucket counts recompute immediately when queue selection changes.
- Design Decision: Search applies on top of the selected queue/bucket state rather than replacing it with a separate search-only mode.
- Design Decision: Search-result cards and mixed-list cards must preserve enough queue/project context to disambiguate same-titled tasks when needed.

## Scope

### In Scope

- `Activity` header spacing correction
- `Activity` section hierarchy correction
- conditional thumbnail rendering for `Recent Activity`
- `Tasks` search-first continuous list layout
- `Tasks` dropdown filter state and counts
- `Tasks` full-list ordering logic
- focused regression coverage for affected layout and filtering behavior

### Out Of Scope

- task store or Supabase schema changes
- navigation route shape changes
- dashboard queue logic redesign beyond the visual hierarchy correction
- new task-card families outside the affected `Activity` and `Tasks` surfaces

## Validation

- Design Decision: Add focused screen-level or adapter-level coverage for dynamic dropdown counts and `All` filtering behavior.
- Design Decision: Add focused coverage for the full-list ordering path: priority, latest update, then status flow.
- Design Decision: Add or update focused coverage for `Activity` hierarchy and conditional thumbnail rendering.
- Design Decision: Validate the repaired `Activity` and `Tasks` screens in the running app after implementation.

## Code Handoff

- Slice label: `WS-UX / M-UX-01 / S-UX-01J`
- Route names + params: `MainTabs -> Activity -> DashboardMain` and `MainTabs -> Tasks -> TasksList`; no route shape changes.
- Screen list + responsibilities: `DashboardScreen` restores section hierarchy and conditional activity thumbnails; `useDashboardViewAdapter()` continues preparing project summary and activity row data; `TasksScreen` becomes search-first with dropdown controls and a single visible list; `useTasksViewAdapter()` owns queue/bucket options, counts, list filtering, and ordering.
- Interaction rules (must): preserve task-card tap behavior, preserve project scoping, preserve `All` states in both dropdowns, preserve dynamic bucket counts when queue selection changes.
- Interaction rules (must never): do not require a queue selection to view tasks, do not show empty thumbnail placeholders on activity cards without photos, do not reintroduce the large queue wrapper as the dominant `Tasks` layout.
- Visual/UX rules: `Active Project` is a peer section header; only inner grouped content remains carded; `Recent Activity` thumbnails are conditional; `Tasks` list is visually dominant; dropdown items use inline counts; the list must remain readable without washed-out empty wrappers.
- Edge cases + empty/error states: if no activity photo exists, render a text-only card; if no tasks match the selected queue/bucket/search combination, show a clear empty state; if `All` is selected in both dropdowns, show the full ordered list; if a queue narrows results to zero for a bucket, the bucket count shows `0`.
- Acceptance checks: confirm `Activity` no longer has the large top gap; confirm `Active Project` now sits at section level; confirm `Recent Activity` uses conditional thumbnails; confirm `Tasks` shows a real visible list without queue wrappers; confirm dropdown counts update dynamically; confirm `All` + `All` shows the full ordered list.
