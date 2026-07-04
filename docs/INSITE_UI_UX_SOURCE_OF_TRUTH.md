# Insite UI/UX Source Of Truth

**Status:** Canonical design reference  
**Last updated:** 2026-07-04  
**Purpose:** Centralized UI/UX / product-design source of truth for the Insite redesign. This document aggregates the current approved design direction from earlier specs, gap analysis, execution slices, and the latest design discussions.

## Canonical Use

This document is the **single source of truth** for Insite product UI/UX decisions.

Use it for:

- future implementation planning
- design reviews
- AI-assisted redesign critique or iteration
- validating whether a proposed screen change matches the approved product logic
- separating current implementation state from approved target design

If any future design decision changes the approved direction, update this document first or at the same time as the supporting slice/spec.

## Relationship To `ROADMAP.md`

This document is intentionally **not** a competing roadmap.

The documentation hierarchy should be:

1. `documentation/ROADMAP.md`
2. `docs/INSITE_UI_UX_SOURCE_OF_TRUTH.md`
3. slice specs and execution plans under `docs/superpowers/`

### Responsibility split

`documentation/ROADMAP.md` owns:

- WS / M / S inventory
- status (`Pipeline`, `Closed`, `Deferred`)
- execution order
- dependency ordering
- milestone references

`docs/INSITE_UI_UX_SOURCE_OF_TRUTH.md` owns:

- approved product logic
- page-role distinctions
- interaction models
- information architecture decisions
- naming / terminology decisions
- latest accepted UX direction when implementation lags behind

Slice specs and plans under `docs/superpowers/` own:

- narrowly scoped design detail for a specific correction or slice
- implementation sequencing
- closure evidence
- temporary design exploration before normalization into this canonical doc

### Rule for future updates

When a design decision changes product behavior:

- update this canonical doc
- update the relevant slice spec/plan if needed
- update `documentation/ROADMAP.md` only if slice status, references, sequencing, or milestone boundaries change

## Source Documents Aggregated Here

This document consolidates and normalizes decisions from:

- `docs/superpowers/specs/2026-07-03-insite-app-redesign-design.md`
- `docs/superpowers/specs/2026-07-04-tasks-queue-dashboard-correction-design.md`
- `docs/superpowers/analysis/2026-07-03-taskr-old-vs-new-gap-analysis.md`
- `docs/superpowers/plans/2026-07-03-ws-ux-01-insite-redesign-execution.md`
- approved follow-up discussion on:
  - page-role distinction between `Activity` and `Tasks`
  - queue terminology
  - queue interaction model
  - dashboard grid behavior
  - task-row compression
  - photo-centric task expansion
  - search/filter mode
  - active-project summary content
  - critical-date modeling and entry path

## Product Summary

Insite is a **project-scoped, photo-centric field operations app** for mixed teams.

The product should feel:

- fast enough for on-site workers
- structured enough for supervisors
- visual enough to encourage documentation
- operational enough to manage delegated work clearly

The core model remains:

`Project → Container → Task + Tags`

Where:

- `Project` is the main workspace context
- `Container` is a lightweight grouping layer
- `Task` is the primary operational object
- `Tags` support flexible filtering and retrieval

## Product Goals

- restore users into the last active project
- make activity and photo evidence feel immediate
- preserve structured task execution
- support delegation and ownership clarity
- keep capture and task updates fast
- avoid deep navigation hierarchy
- keep project context sticky across `Activity`, `Tasks`, and capture flows

## Experience Principles

### 1. Project context is sticky

The active project should persist between sessions and remain the default workspace context until intentionally changed.

The active project should scope:

- activity
- tasks
- critical dates
- captures
- new task context

### 2. Activity is the triage surface

`Activity` exists to answer:

- what changed recently
- what needs attention now
- what is happening on site this week
- what queue or task bucket should I enter next

It is an **action-based triage surface**, not the primary long-form worklist.

### 3. Tasks is the execution surface

`Tasks` exists to answer:

- what work belongs to me or my team
- which bucket I am working through
- which task I should open next
- how I can process work efficiently

It is a **goal/worklist-based execution surface**.

### 4. Photo evidence is a first-class interaction

Photos are not just attachments. The product should visibly emphasize the latest visual evidence when task context is expanded.

### 5. Six-category task visibility matters

The distinction between:

- three categories of tasks assigned to me
- three categories of tasks I assigned to others

is important product information and should not be flattened away in the core experience.

## Approved Page Roles

## Activity

Primary role:

- site/project overview
- recent happenings
- critical dates this week
- queue triage
- launch into the correct task bucket

Not for:

- working through long task lists inline
- becoming a second full task screen

## Tasks

Primary role:

- ownership-based task processing
- bucket-based list work
- global retrieval via search/filter
- compact task scanning
- expanded visual task review

Not for:

- replacing the role of `Activity`
- duplicating the full dashboard overview

## Information Architecture

Top-level navigation is:

- `Activity`
- `Tasks`
- `Camera`
- `Profile`

These are all views of the same project-scoped workspace, not separate products.

## Activity Page — Approved Design

## Purpose

The `Activity` page should function like a project command view for the active project.

It should focus on:

- recent activity on site
- current project context
- this week’s important dates
- ownership-aware queue overview

## Structure

Approved top-down order:

1. active-project summary card
2. dense queue dashboard grid
3. recent activity / updates
4. supporting lower-priority content such as drafts

## Active-Project Summary Card

The summary card is scoped to the **active project only**.

It should include:

- active project identity
- today’s date
- project elapsed number of days
- weather-app-inspired visual tile
- inline `This Week’s Critical Dates` list

### Weather

Weather behavior for the current design:

- visual style may be inspired by the phone weather app
- live weather integration is **not required in this pass**
- treat weather as a styled visual module for now

### Critical Dates

The critical dates list is:

- inline inside the summary card
- not a separate tray
- not a link-only module
- not a separate object type

Its role is to surface the most important task-derived dates for the active project this week.

## Dense Queue Dashboard Grid

Below the summary card, `Activity` should show a dense dashboard grid.

This grid should preserve all six categories:

- 3 under `My Queue`
- 3 under `Team Queue`

Each cell shows:

- category name
- aggregated counter

### Interaction

Tapping a dashboard cell should:

- **navigate to `Tasks`**
- open the correct queue
- open the correct bucket
- apply the correct filtering context

It should **not** expand a task list inline on `Activity`.

## Content Priority On Activity

`Activity` should emphasize:

1. new incoming tasks
2. tasks with the latest updates
3. critical dates this week
4. queue ownership overview

This means:

- drafts should be visually demoted
- recency and urgency should be more visible
- the page should feel like “what needs attention now”

## Tasks Page — Approved Design

## Purpose

`Tasks` is the structured worklist screen.

It should optimize for:

- processing tasks by ownership
- compact scanning
- quick task selection
- deeper visual review when needed

## Queue Model

Approved ownership terminology:

- `My Queue`
- `Team Queue`

This wording is preferred because it reflects **work ownership**, not movement direction.

Rejected / deprioritized alternatives:

- `Incoming / Outgoing`
- `For Me / From Me`
- `Received / Delegated`

## Queue Layout

### My Queue

- primary queue
- visible and open by default
- visually dominant

### Team Queue

- same interaction model as `My Queue`
- lower visual priority
- on the Tasks screen, presented as a **smaller preview row with count only** until opened

This decision replaces the earlier side-by-side layout, which felt too crowded on phone width.

## Bucket Model

Each queue contains **three compact bucket pills** with aggregated counts.

Approved behavior:

- buckets are compact and scannable
- only **one bucket** within a queue is open at a time
- opening one bucket auto-collapses the others in that queue
- expanded bucket reveals **that bucket’s own task list**
- bucket lists sort by **latest meaningful update**, newest first

This bucket-first model is preferred over a mixed single list because it preserves category distinction without overloading the screen.

## Task Row Model

### Collapsed/default row

Tasks should appear as **2-line compact rows** by default.

Expected content:

- line 1: task title
- line 2: compact metadata such as category, latest update time, assignee, due date, or project label
- optional compact signal for photos / attachments

The collapsed state should be optimized for fast vertical scanning.

### Expanded row/card

Tapping a task row expands it into a richer card.

The expanded card must be:

- **photo-centric**
- centered on the **latest task photos**
- still readable as a task record with metadata, but with photos as the main visual priority

This corrects the earlier under-implementation where the tasks surface did not match the intended mockup behavior.

## Global Search And Filter Model

Search and filtering should be integrated as a **global mode layered over the Tasks screen**, not embedded separately inside each queue.

### Default Tasks mode

Normal Tasks mode is:

- ownership-first
- queue-based
- bucket-first

### Search entry

At the top of `Tasks`:

- one global search bar
- one filter button

### Search behavior

When the user starts searching:

- the screen switches into an **All Tasks Results** mode
- queue blocks collapse out of the way
- results become one unified result list
- each result row should show compact labels for:
  - queue
  - bucket
  - project

Clearing search returns the screen to the normal queue layout.

### Filter behavior

The filter button should open a modal or bottom-sheet filter panel.

Filters may include:

- project
- queue
- bucket
- status
- overdue
- critical-date flagged

## Relationship Between Activity And Tasks

The approved distinction is:

- `Activity` = **what is happening / what needs attention**
- `Tasks` = **what work am I processing**

Or phrased another way:

- `Activity` is action-based / triage-based
- `Tasks` is goal-based / worklist-based

## Critical Dates — Approved Model

## Concept

`This Week’s Critical Dates` should be modeled as a **task-derived subset**, not a separate private note or separate object type.

This gives:

- one source of truth
- easier future sharing
- less duplicated entry
- a clean upgrade path later if team sharing is introduced

## Scope

The inline summary list should show only tasks that are:

- within the active project
- within the current week
- marked for inclusion in the critical-date list

## Entry Model

Critical dates should be created via a **lightweight task-level flag**.

### Primary entry point

From the expanded task card:

- `Mark Critical`
- or `Add to This Week`

### Secondary support

Task create/edit may also include the same flag when needed.

### Current-pass constraint

This pass does **not** require:

- a standalone critical-date management interface
- a separate critical-date object
- a reason picker
- live sharing logic

The displayed date should come from the task’s existing due date or milestone date.

## Current Implementation Snapshot

This section distinguishes approved design from current shipped/implemented slices.

### Implemented so far

- active-project workspace bootstrap restore
- top-level shell alignment to `Activity / Tasks / Camera / Profile`
- project-scoped `Recent Activity` home
- a compact task surface slice has been implemented, but it does **not** fully match the corrected approved queue design

### Correction now governs future work

The approved queue/dashboard correction supersedes the earlier `S-UX-01E` direction where necessary.

Specifically, the approved target is now:

- dense dashboard grid on `Activity`
- active-project summary card above the grid
- task-derived critical dates in the summary
- bucket-first queues on `Tasks`
- `My Queue / Team Queue`
- `Team Queue` lighter preview row on `Tasks`
- compact 2-line task rows
- photo-centric task expansion
- global all-task search/filter mode

## Non-Goals In This Correction Stage

Not included in the current correction stage:

- full category reorganization / renaming of the six underlying bucket semantics
- live weather integration
- standalone critical-date management UI
- deeper redesigns outside the directly affected `Activity` and `Tasks` surfaces unless required by routing or task-card behavior

The category reorganization remains a future follow-on design slice.

## Design Decision Logging Rules

From now on, all design decisions should be documented in a durable way.

### Required rule

When a design decision is approved, document it in one of:

1. this canonical source-of-truth document, if it affects product UI/UX logic broadly
2. a linked slice/spec, if it is implementation-specific but still relevant

### Best practice

For broad product behavior changes:

- update this document first
- then update supporting slice specs and implementation plans as needed

### Intended usage for future AI review

If this document is provided to another AI model, it should be treated as:

- canonical product logic
- latest approved page-role distinction
- latest approved interaction model
- the baseline for proposing future UI improvements without reintroducing already-rejected directions

## Recommended Next Documentation Practice

To keep this usable over time:

- treat this document as the canonical PRD/UI-UX reference
- keep roadmap and slice plans focused on status and implementation sequencing
- append or revise this document whenever major design logic changes
- do not let new slice plans silently override this document without updating it

## Suggested Companion Documents

This canonical doc should work together with:

- `documentation/ROADMAP.md` for status and WS/M/S inventory
- execution plans for implementation sequencing
- narrower specs for slice-level detail

But this file should remain the **single reference** for current approved UI/UX logic.
