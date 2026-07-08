# WS-UX / M-UX-01 / S-UX-01K Shared Activity-Style Card

## Summary

Standardize the `Recent Activity` and `Tasks` row presentation on one shared card shell.

This slice stops treating `Tasks` as a separately proportioned card layout. Instead, both surfaces use the same `Recent Activity` card proportions, spacing, text rhythm, and balanced left photo rail, with a neutral placeholder and `no photo` icon whenever no usable image exists.

## Approved Direction

- Design Decision: `Recent Activity` is the canonical card visual for both `Activity` and `Tasks`.
- Design Decision: `Tasks` rows must use the same outer card shell, proportions, spacing, and text rhythm as `Recent Activity`.
- Design Decision: Restore the left photo rail on both `Recent Activity` and `Tasks`.
- Design Decision: The thumbnail treatment is balanced, not oversized and not photo-dominant.
- Design Decision: Cards with no usable image still keep the left rail and render a neutral placeholder with a `no photo` icon.
- Design Decision: Avoid maintaining a separate `Tasks` card proportion system.

## Visual Rules

- Design Decision: Card height, border radius, inner padding, and text spacing are shared between `Recent Activity` and `Tasks`.
- Design Decision: The left thumbnail rail has the same width on both surfaces.
- Design Decision: The text stack on `Tasks` follows the same three-line rhythm as the current `Recent Activity` card.
- Design Decision: The placeholder rail should look intentional, not like a missing image or broken load state.
- Design Decision: The placeholder icon must clearly communicate `no photo` without becoming visually dominant.

## Content Rules

- Design Decision: `Recent Activity` keeps its current text-line structure.
- Design Decision: `Tasks` adopts that same text-line structure rather than maintaining a task-specific spacing cadence.
- Design Decision: Task-specific data still flows through the Tasks adapter and mapper, but it is rendered inside the shared `Recent Activity`-style shell.
- Design Decision: The card shell must support both real image thumbnails and placeholder thumbnails without changing the overall card size.

## Architecture

- Design Decision: Extract a shared activity-style card shell instead of duplicating JSX between `DashboardScreen` and `TasksScreen`.
- Design Decision: `DashboardScreen` and `TasksScreen` should both render through that shared shell, each providing their own content values.
- Design Decision: Keep data preparation in the existing adapters (`useDashboardViewAdapter()` and `useTasksViewAdapter()`), and keep visual composition in the shared card renderer.
- Design Decision: Do not broaden this slice into navigation, store, or backend changes.

## Scope

### In Scope

- shared card shell for `Recent Activity` and `Tasks`
- balanced left thumbnail rail on both surfaces
- placeholder rail with `no photo` icon
- Tasks rows reusing Recent Activity card proportions and spacing
- focused regression coverage for shared card rendering

### Out Of Scope

- task store or Supabase changes
- navigation changes
- queue/filter logic redesign
- unrelated dashboard or task-detail card redesign

## Validation

- Design Decision: Add focused tests proving both `Activity` and `Tasks` render through the shared shell.
- Design Decision: Add focused tests proving the placeholder rail with `no photo` icon renders when no usable image exists.
- Design Decision: Add focused tests proving real thumbnails still render correctly when a usable image exists.
- Design Decision: Recheck both live screens in the simulator after implementation.

## Code Handoff

- Slice label: `WS-UX / M-UX-01 / S-UX-01K`
- Route names + params: no route-shape changes; applies to `MainTabs -> Activity` and `MainTabs -> Tasks`.
- Screen list + responsibilities: `DashboardScreen` continues to supply activity items; `TasksScreen` continues to supply task rows; shared card renderer owns the unified shell, balanced photo rail, and placeholder-with-icon treatment.
- Interaction rules (must): preserve row tap behavior on both screens, preserve real photo rendering when available, preserve placeholder rendering when not.
- Interaction rules (must never): do not create separate visual proportions for `Tasks`, do not hide the left rail when the photo is missing, do not let broken image paths collapse card layout.
- Visual/UX rules: both surfaces use the same card size and spacing; photo rail stays balanced; placeholder uses a neutral block with a `no photo` icon; text rhythm matches current `Recent Activity`.
- Edge cases + empty/error states: broken photo URLs fall back to placeholder rail; missing photo data uses placeholder rail immediately; cards remain stable whether an image exists or not.
- Acceptance checks: compare `Activity` and `Tasks` cards side by side in the running app; confirm shared proportions; confirm real photos render; confirm no-photo rows show the placeholder icon rail; confirm rows still tap through correctly.
