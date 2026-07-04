# Tasks Queue And Dashboard Correction Design

**Date:** 2026-07-04  
**Scope:** Correction to the current `Activity` and `Tasks` redesign direction after validating the implemented `S-UX-01E` behavior against the intended mockup and workflow needs.

## Document Role

This document is a **scoped correction spec** for the current redesign pass.

It should work together with:

- `documentation/ROADMAP.md` for WS / M / S status, dependencies, and execution order
- `docs/INSITE_UI_UX_SOURCE_OF_TRUTH.md` for the latest canonical approved UI/UX logic

If this correction is accepted and remains valid, its product-level logic should be normalized into the canonical source-of-truth document rather than living only here.

**Implementation status:** Implemented and normalized into `docs/INSITE_UI_UX_SOURCE_OF_TRUTH.md` via `WS-UX / M-UX-01 / S-UX-01E2`. This spec remains as the scoped correction record for the redesign turn.

## Goal

Correct the queue experience so it supports fast triage, preserves all six important task categories, and restores the intended photo-centric expansion behavior without overloading the `Activity` page.

This correction changes the current direction in two important ways:

1. `Tasks` should no longer use section-collapse as the primary interaction model.
2. `Activity` should reintroduce a dense six-category dashboard grid that launches directly into the corresponding queue bucket on `Tasks`.

## Approved Product Direction

### Activity page

- Keep `Activity` as the high-level triage surface.
- Add an **active-project summary card above the dense dashboard grid**.
- Replace the current simplified summary treatment with a **dense dashboard grid**.
- The grid should preserve all **six categories**:
  - three categories for work assigned to me
  - three categories for work I assigned to others
- The two ownership groups should use:
  - `My Queue`
  - `Team Queue`
- Each group shows aggregated counts for its three categories.
- Tapping any of the six cells should **navigate to `Tasks`**, not expand inline on `Activity`.
- Navigation should carry enough state so `Tasks` opens with:
  - the correct queue selected
  - the correct bucket opened
  - the task list filtered to that category

### Activity summary card

The summary card is scoped to the **active project only**.

It should include:

- today’s date
- project elapsed number of days
- a weather-app-inspired visual tile
- an inline list for **This Week’s Critical Dates**

Weather is a **styled visual module only** in this correction pass.

- the UI may resemble the phone weather style
- live weather integration is not required yet

The `This Week’s Critical Dates` list should be embedded directly inside the summary card, not moved into a separate tray or link-only module.

### Tasks page

- `Tasks` becomes the detailed work surface.
- Both `My Queue` and `Team Queue` use the **same interaction pattern**.
- `My Queue` is more prominent and should open by default.
- Each queue contains **three compact bucket pills** with aggregated counters.
- Buckets are not all open at once:
  - opening one bucket automatically collapses the others in the same queue
- Expanding a bucket reveals **that bucket’s own task list**
- The default task presentation inside an expanded bucket is:
  - **compact**
  - **two-line**
  - optimized for quick vertical scanning

### Task expansion behavior

- The compact two-line task row is the collapsed default state.
- Tapping a task row expands that task into a richer card.
- The expanded card must be **photo-centric**.
- When expanded, the card should surface the **latest task photos prominently**, matching the original mockup intent.
- Metadata remains present, but the photos are the visual priority.

## Information Architecture

## Activity

The `Activity` page should answer:

- what requires attention right now
- how my workload is distributed
- how team-delegated work is progressing
- what critical dates are coming up for the active project this week

It should not become the place where long queue lists are worked through. Its job is overview and launch.

### Active-project summary structure

The `Activity` page should open with an active-project summary block before the dense queue grid.

Recommended internal order:

1. active project identity
2. today’s date and elapsed day count
3. weather-style visual tile
4. inline `This Week’s Critical Dates` list
5. dense queue dashboard grid

This preserves overview at the top and keeps the queue grid as the second major block instead of the very first element on the page.

### Dense dashboard grid structure

- Top-level heading remains `Recent Activity` / `Activity`
- Queue dashboard module appears near the top of the page
- The module is visually split into:
  - `My Queue`
  - `Team Queue`
- Each queue contains three category cells in a dense layout
- A `2 x 3` grid or equivalent compact grouping is acceptable so long as:
  - all six categories are visible at once
  - count scanning is immediate
  - tap targets remain clear

### Grid interaction

- Tapping a cell does not reveal a list on `Activity`
- Tapping a cell routes into `Tasks`
- The destination state should be deterministic and restorable

### Critical dates

The weekly critical-date list is **not** a private note module and is **not** a separate object type.

Instead, it is a **task-derived subset**.

That means:

- critical dates come from tasks
- this keeps one source of truth
- the model can later be extended to shared/team visibility without inventing a second interface now

The summary card should show only the subset relevant to:

- the active project
- the current week
- tasks marked for inclusion in the weekly critical-date list

## Tasks

The `Tasks` page should answer:

- which queue am I working in
- which bucket is open
- what tasks are newest or most recently updated
- which specific task should I open next

### Queue structure

- Two top-level queue groups:
  - `My Queue`
  - `Team Queue`
- Same interaction model for both
- `My Queue` opens by default
- `Team Queue` starts collapsed or visually secondary, but still visible

### Bucket structure

Each queue contains three bucket pills with counts.

Expected behavior:

- bucket pills stay compact
- opening one bucket closes other buckets in the same queue
- bucket lists remain sorted by **most recent update**

This preserves the six-category distinction without forcing all six task lists onto the screen at once.

### Task row structure

Collapsed/default row:

- line 1: task title
- line 2: compact metadata, such as category, latest update time, assignee, or due date
- photo count / attachment signal can appear as a compact indicator
- no large media preview in the collapsed row

Expanded row/card:

- latest photos become the main visual element
- the newest images should be shown prominently
- key metadata remains visible below or beside the photo content
- expansion is local to the tapped task

This gives fast scan speed by default while preserving the mockup’s image-first detail behavior.

## Prioritization Rules

### Activity

The current over-emphasis on `Drafts In Progress` should be corrected.

The higher-value priorities are:

1. new incoming tasks
2. tasks with the latest updates
3. clear ownership separation across the six categories

As a result:

- draft content should be demoted visually
- new work and recently updated work should be more prominent
- recent updates should sort by newest first

### Tasks

Within any opened bucket:

- sort by the latest meaningful update, newest first
- preserve category meaning without making the user decode a mixed feed

## Navigation Contract

When a dashboard cell is tapped, route to `Tasks` with state representing:

- selected queue: `My Queue` or `Team Queue`
- selected bucket: one of the three queue-specific categories
- bucket expansion: selected bucket open, sibling buckets closed
- list sorted by latest update

This contract should support direct landing from the dashboard without requiring the user to manually reconstruct context.

## Critical Date Entry Model

Critical dates should be created through a **lightweight task-level flag**, not a separate creation flow.

### Recommended interaction

Primary entry point:

- from the expanded task card
- a quick action such as:
  - `Mark Critical`
  - or `Add to This Week`

Secondary support:

- task create/edit can include the same flag when needed

### Reasoning

This is the preferred model because it:

- minimizes interface sprawl
- avoids a second management surface
- avoids duplicate data entry
- supports later sharing without remapping the concept into a different object type

### Display rule

When a task is marked for the weekly critical-date list:

- the displayed date should come from the task’s existing due date or milestone date
- the displayed description should come from the task title or a lightweight task-derived label

This correction pass does **not** require a separate reason picker or separate critical-date editor.

## Terminology

Approved top-level ownership language:

- `My Queue`
- `Team Queue`

Rejected or deprioritized alternatives:

- `Incoming / Outgoing`
- `For Me / From Me`
- `Received / Delegated`

Reason:

- the preferred framing is **work ownership**, not task movement

## Non-Goals For This Correction Pass

The following is explicitly not part of this correction pass:

- full category reorganization / renaming of the six underlying task buckets
- larger task-detail redesign beyond the row expansion behavior needed in `Tasks`
- rebuilding queue semantics across backend/store contracts unless necessary for routing state
- live weather integration
- a standalone critical-date management interface

Category reorganization remains a **future slice** and should be scheduled separately.

## Approved Follow-On Shell Decisions

The following decisions were approved after this correction scope was written and should guide the next shell/navigation slice:

### Bottom navigation

- reduce the bottom navigation to **three items**
- `Activity` on the left
- `Camera` as the dominant center action
- `Tasks` on the right

### Camera button treatment

- center button should be visually larger than the other nav items
- use a circular treatment
- use red camera iconography
- treat camera as the primary field action, not a standard peer tab

### Profile placement

- remove `Profile` from the bottom navigation
- place profile access in the **top-right header area**

### Weather treatment

- reduce weather from a separate visual tile to a **compact inline weather status**
- place weather on the same metadata line as the date and elapsed days

### Camera behavior

Outside Task Detail:

- open camera immediately
- capture first
- default post-capture flow to **Create New Task**
- still allow an alternate route to **Add to Existing Task**

Inside Task Detail:

- open camera immediately
- capture first
- default directly to a **photo update for the same task**
- skip the generic routing choice in that context

## Implementation Implications

This correction should revise the current Tasks direction that was just implemented.

### Replace

- section-collapse as the primary model on `Tasks`
- simplified triage grouping that hides the six-category distinction on `Activity`

### Introduce

- active-project summary card above the `Activity` dashboard grid
- inline weekly critical-date list derived from marked tasks
- dense six-cell dashboard grid on `Activity`
- queue-to-tasks navigation contract
- bucket-first queue interaction on `Tasks`
- one-open-bucket-per-queue behavior
- compact two-line rows
- photo-centric per-task expansion
- lightweight task-level flag for critical-date inclusion

## Testing Focus

Critical verification points for implementation:

1. `Activity` shows the active-project summary card above the queue dashboard
2. the summary card includes date, elapsed day count, weather-style tile, and inline weekly critical dates
3. `Activity` shows all six categories in a dense dashboard grid
4. tapping any grid cell navigates to `Tasks` with the correct queue and bucket open
5. both `My Queue` and `Team Queue` use the same interaction model
6. opening one bucket auto-collapses sibling buckets
7. default task rows remain compact and two-line
8. expanded task rows show latest photos prominently
9. opened lists sort by latest update
10. draft content is no longer the most visually dominant section on `Activity`
11. critical dates can be flagged quickly from the task flow without a separate management screen

## Recommended Slice Breakdown

This correction is best implemented as two linked redesign slices:

1. `Activity` summary-card and dense dashboard grid restoration with queue-launch routing
2. `Tasks` bucket-first queue redesign with compact rows, photo-centric expansion, and critical-date flag entry

The later category reorganization should remain a separate follow-on slice.
