# Tasks Container Card Reskin Design

**Date:** 2026-07-07  
**Status:** Draft for review  
**Scope:** Re-skin the existing `ContainerCard` task thumbnail presentation on `Tasks` so it keeps the shared plumbing but adopts the formatting and presentation cues of the `Recent Activity` card.

## Goal

Increase interface consistency between `Tasks` and `Recent Activity` without replacing the shared task-card plumbing.

This slice is presentation-focused:

- keep `ContainerCard` as the source of truth for task-card plumbing
- keep the current task row mapping path on `Tasks`
- reformat the existing thumbnail presentation so it visually feels closer to `Recent Activity`
- do this on `Tasks` only in the first pass

This is not a broader card-system rewrite and it does not change dashboard feed behavior yet.

## Context

The current `Tasks` surface already has the stronger reusable plumbing:

- `TasksScreen` renders queue rows through `ContainerCard`
- `mapTaskRowToContainerCardProps()` shapes the task-row contract
- `ContainerCard` owns the shared shell, media, density, and state behavior

The current `Recent Activity` card has the preferred formatting characteristics:

- stronger left-image / right-text balance
- clearer title-first hierarchy
- lighter, less grid-like metadata feel
- cleaner whitespace rhythm

The approved direction is to merge those strengths by keeping the `Tasks` plumbing and borrowing the dashboard card’s formatting language.

## In Scope

- update the existing `thumbnail` presentation path inside `ContainerCard`
- keep the current `TasksScreen` task-row contract path intact
- align the visual hierarchy of task cards toward the `Recent Activity` tile
- validate the result on queue rows in `Tasks`

## Out Of Scope

- changing `Recent Activity` implementation on the dashboard
- introducing a new `ContainerCard` presentation variant
- changing navigation, queue logic, or task filtering behavior
- adding actor/timestamp feed semantics to task cards
- rewriting the standard non-thumbnail `ContainerCard` presentation

## Options Considered

### Option A: Re-skin the existing thumbnail presentation

- keep `ContainerCard`
- keep the current `thumbnail` branch
- update only formatting and hierarchy

Pros:

- lowest-risk path
- keeps shared plumbing intact
- fastest route to visible consistency

Cons:

- less expressive than adding a dedicated new card variant
- the thumbnail branch must carry both current task semantics and the new visual language

### Option B: Add a new ContainerCard presentation variant

- keep shared plumbing
- add a separate task-card presentation based on the `Recent Activity` look

Pros:

- clearer future extensibility

Cons:

- more moving parts than needed for the first consistency pass
- unnecessary new branching for a single approved target state

### Option C: Rebuild task cards directly from dashboard markup

- replace `ContainerCard` usage with a custom task card that mimics `Recent Activity`

Pros:

- closest visual match immediately

Cons:

- breaks the shared plumbing goal
- duplicates layout logic
- weakens future consistency across task surfaces

## Selected Approach

Use **Option A: Re-skin the existing thumbnail presentation**.

This keeps the stronger shared plumbing while using formatting changes, not architectural changes, to achieve the first pass of interface consistency.

## Summary Decisions

### 1. Keep `ContainerCard` As The Plumbing Source Of Truth

The `Tasks` screen should continue to render rows through the existing `ContainerCard` path.

Approved behavior:

- `TasksScreen` continues using `mapTaskRowToContainerCardProps()`
- the thumbnail task-card branch in `ContainerCard` remains the rendering path for queue rows
- no new top-level card component is introduced for this slice

Reasoning:

- preserves the reusable task-card system
- keeps future changes centralized
- avoids visual consistency being achieved through duplicated UI code

### 2. Make The Thumbnail Layout Feel Like `Recent Activity`

The thumbnail card should shift toward the dashboard tile’s composition.

Approved behavior:

- keep a visually prominent left thumbnail region
- keep the right side as a compact vertical text stack
- reduce the feeling of a dense metadata grid
- use whitespace and typography to drive hierarchy

Reasoning:

- the user-preferred quality of `Recent Activity` is formatting, not its feed-specific data model
- this allows the `Tasks` card to feel cleaner without becoming an event feed card

### 3. Preserve Task-First Semantics

The reskinned card should still read as a task card, not as an activity card.

Approved behavior:

- title remains the primary line
- task status remains visible and easy to scan
- context remains task-oriented
- do not add actor/timestamp feed labels just to mirror dashboard formatting

Reasoning:

- `Tasks` answers “what is this task?”
- `Recent Activity` answers “what happened recently?”
- visual consistency should not erase the information-role difference between surfaces

### 4. Adopt A Simpler Information Hierarchy

The thumbnail card should move from a heavy “system card” feel toward a lighter “summary tile” feel.

Approved hierarchy:

1. task title
2. task state
3. supporting context

Approved behavior:

- title should be the strongest text element
- status should remain visible but lighter than the title
- context should become the tertiary supporting line
- if a supporting line is not useful, omit it instead of preserving density for its own sake

Reasoning:

- the current dashboard tile feels easier to scan because it emphasizes only the top few facts
- the `Tasks` card can keep the same semantic payload while presenting it with less visual competition

### 5. Keep Thumbnail Cards Compact And Direct-Open

The card should remain a direct-open summary surface.

Approved behavior:

- tapping the card still opens Task Detail
- no inline expansion is introduced
- no embedded action row is introduced inside the card
- no collapsible media behavior is added to this thumbnail branch

Reasoning:

- preserves the current direct-open interaction model
- keeps the first pass focused on presentation consistency
- avoids mixing layout changes with workflow changes

### 6. Align Visual Details With `Recent Activity`

The following visual cues should move closer to the dashboard feed tile:

- thumbnail prominence
- text spacing rhythm
- padding balance
- corner treatment and shell lightness
- cleaner separation between primary and secondary text

Approved behavior:

- keep the left image / right content split
- use a lighter, calmer card shell
- reduce visual noise from badge-like or row-like chrome where not strictly needed
- keep the card easy to scan in a stacked vertical list

Reasoning:

- these are the qualities the user prefers in the `Recent Activity` card
- they can be borrowed without adopting the dashboard’s event-specific content model

## Target Files

Expected primary targets:

- `src/components/primitives/container/ContainerCard.tsx`
- `src/ui/mappers/tasksMappers.ts`
- `src/screens/TasksScreen.tsx`
- `src/components/primitives/container/__tests__/ContainerCard.test.tsx`
- `src/screens/__tests__/TasksScreen.test.tsx`

Secondary files may be touched only if needed to keep the shared task-card contract coherent.

## Validation Plan

- verify `Tasks` still renders queue cards through `ContainerCard`
- verify title, state, and context remain visible after the re-skin
- run focused tests for `ContainerCard` and `TasksScreen`
- run `npx tsc --noEmit`
- visually confirm the `Tasks` card now feels aligned with `Recent Activity` without becoming an activity feed tile

## Risks

- over-borrowing from `Recent Activity` could weaken task-first clarity
- reducing metadata too aggressively could remove useful queue context
- styling changes inside `ContainerCard` could unintentionally affect other thumbnail consumers

## Mitigation

- preserve task-first hierarchy explicitly
- keep the rollout limited to the existing thumbnail presentation path
- validate only the `Tasks` surface in the first pass
- avoid introducing new content types or workflow changes in the same slice

## Acceptance Criteria

1. `Tasks` queue rows still use `ContainerCard` plumbing.
2. The existing thumbnail task-card presentation is visually reformatted toward the `Recent Activity` card style.
3. The task title remains the dominant information line.
4. Status and context remain visible but lighter than the title.
5. Cards still open Task Detail directly on press.
6. No dashboard `Recent Activity` behavior changes in this slice.
7. Focused tests and type-checking pass for the touched files.

## Design Decisions

- **Design Decision:** Keep `ContainerCard` as the shared plumbing source of truth for task cards.
- **Design Decision:** Re-skin the existing `thumbnail` presentation instead of adding a new card variant.
- **Design Decision:** Borrow formatting cues from `Recent Activity`, but preserve task-first semantics.
- **Design Decision:** Roll out on `Tasks` only for the first pass.

## Code Handoff

**Slice label**

- `WS-UX / M-UX-01 / S-UX-01I` - `Tasks` card consistency re-skin

**Route names + params**

- `Tasks`: existing route, no param changes required
- `TaskDetail`: existing navigation target, no param changes required

**Screen list + responsibilities**

- `TasksScreen`
  - continue rendering queue rows through `ContainerCard`
  - adopt the reskinned thumbnail presentation automatically through the existing mapping path
- `TaskDetail`
  - unchanged in this slice
- `DashboardScreen`
  - unchanged in this slice; used only as the visual reference for formatting direction

**Interaction rules**

- task cards must remain direct-open
- no inline expansion or embedded action controls are added
- no task feed/timestamp semantics are invented for the `Tasks` screen
- the card must still communicate task identity before supporting metadata

**Visual / UX rules**

- keep a prominent left thumbnail
- make the right text stack feel closer to `Recent Activity`
- title is strongest, status is secondary, context is tertiary
- reduce grid-like metadata feel in the thumbnail branch
- keep spacing calm and scannable for vertically stacked queue cards

**Edge cases**

- cards with no photo still need a balanced shell and clear hierarchy
- long titles must truncate cleanly without collapsing status/context readability
- overdue or review-state tasks must remain understandable after the lighter presentation shift
- nested/indented task rows must still render correctly if they use the thumbnail branch

**Acceptance checks**

- `Tasks` queue cards still navigate correctly to Task Detail
- cards with and without photos both look intentional
- status remains readable on the new layout
- the `Tasks` card now visually aligns more closely with the `Recent Activity` card than before
- dashboard feed remains unchanged
