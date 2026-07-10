# Task Detail Screen Design

Date: 2026-07-10
Status: Drafted for review
Decision: Approved direction is Option C

## Objective

Simplify the `TaskDetailScreen` top section by removing the hero card, moving all current hero badges into the header area, and consolidating description and assignment metadata into one compact `Task Details` card.

## User-Approved Decisions

- Remove the hero card from `TaskDetailScreen`.
- Keep all current hero badges visible for now.
- Move those badges into the header area.
- Rename the current description/info card section to `Task Details`.
- `Task Details` must contain:
  - description
  - site location
  - delegation
- Use the compact Option C layout for metadata inside `Task Details`.
- Metadata chip labels are locked to:
  - `Site`
  - `By`
  - `To`
  - `Owner`
- After live-screen inspection, perform a second-pass visual refinement focused on both card spacing and chip sizing.

## Scope

This slice changes the task detail presentation only.

In scope:

- `TaskDetailScreen` layout composition
- task-detail header badge placement
- `Task Details` card content and visual treatment
- delegation placement and compact rendering
- regression tests covering the new layout

Out of scope:

- changing task-detail actions or permissions
- changing work-thread content or ordering
- changing banner logic
- changing task-detail data fetching semantics

## Current Problem

The current top of the Task Detail screen duplicates information:

- `ModernScreenHeader` already establishes the page identity.
- `TaskDetailHero` repeats the title and carries the top-level badges.

This creates unnecessary vertical weight and makes the screen feel more layered than necessary.

At the same time, delegation currently uses a relatively tall row-based block inside the info card. That format is readable but not space-efficient for the compact single-card direction now approved.

## Target Layout

Top-to-bottom structure after the change:

1. Header
2. `Task Details` card
3. banners and critical toggle area
4. work thread
5. other actions
6. bottom quick actions

## Header Design

The header keeps the current shared `ModernScreenHeader` shell for title, back navigation, profile trigger, and project picker access.

Below the title, render a compact wrapping badge row containing all currently supported hero badges:

- critical badge when applicable
- category badge when present
- status badge
- completion badge
- due-date badge when present

The badge row should:

- wrap naturally across lines on smaller screens
- sit within the header visual region, not in a separate body card
- remain visually compact and subordinate to the title

## Hero Removal

`TaskDetailHero` is removed from the screen composition.

Implications:

- no dedicated hero surface
- no duplicated top title region
- no separate hero spacing block between the header and the first content card

The screen should not render `task-detail__hero` or `task-detail__hero_shell` after the change.

## Task Details Card

The existing info card becomes a single compact card titled `Task Details`.

Contents:

1. Description block
2. Compact metadata chips

### Description Block

- Keep description at the top of the card.
- Show the body text directly under the `Task Details` heading.
- Preserve readability for multi-line descriptions.
- If description is empty, keep the fallback `—`.

### Metadata Chips

Render a wrapping set of compact chips under the description.

Approved chip labels:

- `Site: <value>`
- `By: <value>`
- `To: <value>`
- `Owner: <value>`

Rendering rules:

- `Site` uses the task's site location string
- `By` uses the assigner label
- `To` uses the assigned-to summary
- `Owner` renders only when a primary owner exists
- omit chips whose backing value is empty, except where the existing card currently expects a fallback `—`

Visual intent:

- compact
- premium
- easy to scan
- less vertically heavy than the current delegation rows

### Live-Screen Refinement Pass

After inspecting the live screen, the first Option C implementation is functionally correct but still visually under-tuned.

Observed issues:

- chips read undersized relative to the card title and description
- the chip block wraps awkwardly, especially when `Owner` lands on its own line
- the `Task Details` card feels slightly too airy for the amount of metadata it contains
- the work-thread card below feels denser and more resolved than the top card

Approved tuning direction:

- optimize for both chip sizing and spacing together
- keep the chip-based Option C structure
- keep the approved `Site`, `By`, `To`, and `Owner` wording

Refinement rules:

- increase chip text size by one small step
- increase chip horizontal and vertical padding slightly
- keep the existing rounded chip treatment and tonal family
- tighten the spacing from card title to description
- tighten the spacing from description to chip block
- reduce the feeling of excess bottom-space inside the card
- tighten inter-chip gaps enough to make the wrap feel more intentional
- allow wrapping, but bias toward a more balanced second row when wrapping is unavoidable

Non-goals:

- no chip-to-grid redesign
- no new metadata fields
- no wording changes
- no changes to the header badge strategy

## Delegation Placement

Delegation does not remain as a separate lower-page block.

Delegation is considered part of `Task Details` and is represented through the compact chips:

- `By`
- `To`
- `Owner`

This keeps delegation visible while reducing the vertical footprint of the top card.

## Data Mapping

No new domain behavior is introduced.

The new presentation reuses existing view-adapter outputs:

- header title from `output.header`
- badge data currently sourced through `output.taskHero`
- description and assignment metadata currently sourced through `output.infoCard`

Preferred implementation direction:

- preserve existing view-adapter semantics where possible
- extend or reinterpret header rendering in the screen layer
- keep adapter changes focused on supporting compact chip rendering only if needed

## Testing Plan

Update targeted task-detail tests to assert:

- hero is not rendered
- header still renders title and back affordances
- approved badge set is visible in the header region
- `Task Details` replaces `Description`
- `Task Details` contains description text
- compact chips render with approved labels:
  - `Site`
  - `By`
  - `To`
  - `Owner`
- separate delegation block is absent
- work thread and action regions remain present and ordered after `Task Details`

## Risks

- Header crowding on narrow screens if all badges wrap poorly
- Long assignee or location values causing chip overflow or awkward wrapping
- Existing tests may assert the old hero shell or old delegation wording

## Mitigations

- use wrapping chips with controlled padding and compact text size
- prefer single-line chips that can wrap to new rows as a group
- keep the `Task Details` card width and spacing aligned with current task-detail cards
- validate the second-pass tuning against the live-screen screenshot before further structural changes
- update only the tests tied to the approved visual contract

## Acceptance Criteria

- The hero card is removed from `TaskDetailScreen`.
- The header shows the current hero badge set.
- The first body card is titled `Task Details`.
- `Task Details` includes description, site location, and delegation information.
- Site/delegation metadata use compact chips labeled `Site`, `By`, `To`, and `Owner`.
- The second-pass tuning makes the chips more legible and the `Task Details` card spacing feel denser and more intentional on the live screen.
- There is no separate delegation section elsewhere on the screen.
- Work thread, other actions, and quick actions remain functionally intact.
