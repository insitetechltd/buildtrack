# Tasks Queue And Dashboard Correction Design

**Date:** 2026-07-04  
**Scope:** Correction to the current `Activity` and `Tasks` redesign direction after validating the implemented `S-UX-01E` behavior against the intended mockup and workflow needs.

## Goal

Correct the queue experience so it supports fast triage, preserves all six important task categories, and restores the intended photo-centric expansion behavior without overloading the `Activity` page.

This correction changes the current direction in two important ways:

1. `Tasks` should no longer use section-collapse as the primary interaction model.
2. `Activity` should reintroduce a dense six-category dashboard grid that launches directly into the corresponding queue bucket on `Tasks`.

## Approved Product Direction

### Activity page

- Keep `Activity` as the high-level triage surface.
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

It should not become the place where long queue lists are worked through. Its job is overview and launch.

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

Category reorganization remains a **future slice** and should be scheduled separately.

## Implementation Implications

This correction should revise the current Tasks direction that was just implemented.

### Replace

- section-collapse as the primary model on `Tasks`
- simplified triage grouping that hides the six-category distinction on `Activity`

### Introduce

- dense six-cell dashboard grid on `Activity`
- queue-to-tasks navigation contract
- bucket-first queue interaction on `Tasks`
- one-open-bucket-per-queue behavior
- compact two-line rows
- photo-centric per-task expansion

## Testing Focus

Critical verification points for implementation:

1. `Activity` shows all six categories in a dense dashboard grid
2. tapping any grid cell navigates to `Tasks` with the correct queue and bucket open
3. both `My Queue` and `Team Queue` use the same interaction model
4. opening one bucket auto-collapses sibling buckets
5. default task rows remain compact and two-line
6. expanded task rows show latest photos prominently
7. opened lists sort by latest update
8. draft content is no longer the most visually dominant section on `Activity`

## Recommended Slice Breakdown

This correction is best implemented as two linked redesign slices:

1. `Activity` dense dashboard grid restoration and queue-launch routing
2. `Tasks` bucket-first queue redesign with compact rows and photo-centric expansion

The later category reorganization should remain a separate follow-on slice.
