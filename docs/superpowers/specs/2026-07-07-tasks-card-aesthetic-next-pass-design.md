# WS-UX / M-UX-01 / S-UX-01I2 Tasks Card Aesthetic Next Pass

## Summary

Refine the `Tasks` screen thumbnail card so it feels visually aligned with the stronger `Recent Activity` card aesthetic while preserving the current `ContainerCard` plumbing, navigation behavior, thumbnail-first layout, and search-result provenance.

This is a presentation-focused follow-up to the earlier thumbnail-card reskin. It does not introduce a new card system or change task-routing behavior.

## Approved Direction

- Design Decision: Keep the existing thumbnail-left, content-right card structure and `ContainerCard` plumbing.
- Design Decision: Apply the stronger `Recent Activity` aesthetic to the task thumbnail card shell through softer radius, lighter border treatment, and subtle depth.
- Design Decision: Preserve the task-first hierarchy: title first, status second, provenance/context after that.
- Design Decision: Keep search-result provenance visible on thumbnail cards so users can distinguish similar tasks.
- Design Decision: Limit this pass to `Tasks` screen thumbnail cards rather than broadening to dashboard cards or unrelated card families.

## Visual Rules

- Design Decision: The task card shell must feel softer and more premium than the current compact card through increased rounding and lighter chrome.
- Design Decision: The thumbnail column remains visually dominant enough to anchor the card, but the text column carries the primary reading hierarchy.
- Design Decision: The title uses the strongest emphasis in the card and should feel closer to the `Recent Activity` title cadence.
- Design Decision: The status badge remains present but should read as supporting metadata rather than the loudest element.
- Design Decision: Supporting metadata should be visually calmer than the title through smaller size, lighter color, and more even spacing.
- Design Decision: When both provenance and task-specific context are available, provenance should remain readable without overpowering the task-specific detail.

## Content Hierarchy

- Design Decision: Queue/list cards continue to show task-specific context as the supporting line beneath status.
- Design Decision: Search-result cards must continue to show queue, bucket, and project provenance in the supporting line so same-titled tasks stay distinguishable.
- Design Decision: If a task-specific secondary context line is retained for queue cards, it should appear after provenance only when spacing remains clean and the card height still feels intentional.
- Design Decision: Missing thumbnails must continue to render a deliberate placeholder block rather than collapsing layout.

## Scope

### In Scope

- `Tasks` screen thumbnail-card visual refinement
- task thumbnail spacing, shell styling, and typography rhythm
- support-line handling for search-result provenance
- focused visual and adapter-level regression coverage

### Out Of Scope

- dashboard `Recent Activity` card changes
- non-thumbnail `ContainerCard` variants
- task data-model changes
- navigation, route, or Supabase behavior changes

## Validation

- Design Decision: Add focused test coverage for the search-result provenance path at the adapter level.
- Design Decision: Keep or extend the thumbnail card component tests only where they protect the new hierarchy or shell intent.
- Design Decision: Validate visually in the running app on the `Tasks` tab after implementation.

## Code Handoff

- Slice label: `WS-UX / M-UX-01 / S-UX-01I2`
- Route names + params: `MainTabs -> Tasks -> TasksList` with no route-shape change.
- Screen list + responsibilities: `TasksScreen` continues to render the row list; `useTasksViewAdapter()` continues to shape queue/search task rows; `mapTaskRowToContainerCardProps()` continues to map thumbnail data into `ContainerCard`; `ContainerCard` owns the visual shell and text hierarchy.
- Interaction rules (must): preserve current tap behavior, preserve thumbnail placeholder behavior, preserve search provenance visibility, preserve indentation handling for nested tasks.
- Interaction rules (must never): do not introduce a new card family, do not remove task thumbnail support, do not hide search provenance behind expansion, do not change task navigation semantics.
- Visual/UX rules: keep thumbnail-left layout, increase shell softness, reduce visual heaviness around borders, keep title as primary focus, keep status badge calmer than title, keep supporting lines lighter and easier to scan.
- Edge cases + empty/error states: no-photo tasks must still render a stable placeholder; long titles must still truncate cleanly; search rows with identical titles must remain distinguishable through provenance; missing task-specific context must not create awkward empty spacing.
- Acceptance checks: open the live `Tasks` tab, compare queue cards and search-result cards, confirm provenance appears in search mode, confirm no-photo cards still look intentional, confirm card taps still open task detail.
