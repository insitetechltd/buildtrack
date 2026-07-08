# Insite UI/UX Source Of Truth

**Status:** Canonical design reference  
**Last updated:** 2026-07-06  
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
- `Camera`
- `Tasks`

These are all views of the same project-scoped workspace, not separate products.

Profile is **not** a bottom-navigation destination in the approved shell. It belongs in the **top-right header area** as an account/access affordance, not as a primary bottom-tab work mode.

## Approved Shell Hierarchy

The approved shell should use a **3-item bottom navigation bar**:

- `Activity` on the left
- `Camera` in the center
- `Tasks` on the right

### Camera button treatment

The center camera control is not a standard tab.

It should be treated as:

- the visually dominant bottom action
- a larger circular center button
- red camera iconography
- the primary on-site field action in the shell

This makes the app read as:

- `Activity` = monitor / triage
- `Camera` = act / capture
- `Tasks` = process / work through the queue

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

## Active-Project Summary Card

The summary card is scoped to the **active project only**.

It should include:

- active project identity
- today’s date
- project elapsed number of days
- compact inline weather status
- inline `This Week’s Critical Dates` list

### Weather

Weather behavior for the current design:

- live weather integration is **not required in this pass**
- weather should be visually **small and inline**, not a large tile
- place it on the same line as the date / elapsed-day metadata
- use:
  - a small status icon
  - short temperature label

Example pattern:

- `Fri, Jul 4 · Day 118 · ☁️ 29°`

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

- recency and urgency should be more visible
- the page should feel like “what needs attention now”

Drafts do **not** belong on `Activity` in the current approved direction. They belong under `Tasks` as lower-priority execution-support content.

## Tasks Page — Approved Design

## Purpose

`Tasks` is the structured worklist screen.

It should optimize for:

- processing tasks by ownership
- compact scanning
- quick task selection
- deeper visual review when needed
- supporting lower-priority execution content such as drafts

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

Tasks should appear as **compact scannable summary cards/rows** by default.

Expected content:

- task title
- compact key metadata such as status, priority, due date, assignee, latest update time, or project label
- optional compact signal for photos / attachments

The default state should be optimized for fast vertical scanning while still exposing enough metadata to support field decisions without opening every task.

### Task open behavior

Tapping a task row/card should open `Task Detail` directly.

Inline row expansion is **not** part of the current approved interaction model.

Deeper visual review, evidence chronology, delegation context, and subtask context belong in `Task Detail`, not as an in-place expanded state inside `Tasks`.

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
- lightweight contextual controls for project scoping and reset as needed

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

Filtering does **not** require a dedicated modal or bottom-sheet entry point in the current approved direction.

Project scoping, queue context, bucket context, and reset affordances may be exposed through lightweight in-screen controls rather than a separate filter sheet.

Filters may include:

- project
- queue
- bucket
- status
- overdue
- critical-date flagged

## Drafts Placement

Drafts belong on `Tasks`, not on `Activity`.

Approved behavior:

- drafts are lower-priority supporting execution content
- drafts should be visually demoted relative to active queue work
- drafts may appear as a dedicated supporting section on `Tasks`
- drafts should not compete with `Activity` triage content

## Relationship Between Activity And Tasks

The approved distinction is:

- `Activity` = **what is happening / what needs attention**
- `Tasks` = **what work am I processing**

Or phrased another way:

- `Activity` is action-based / triage-based
- `Tasks` is goal-based / worklist-based

## Task Detail — Approved Model

## Role

`Task Detail` is the focused work-thread view for a single task.

Its job is to:

- show the task’s current state clearly
- preserve delegation and ownership context
- keep evidence and updates readable in chronological context
- support follow-up actions without fragmenting the screen into too many competing modules

## Structure

The approved direction is a **unified visual work-thread** rather than a dense stack of separate summary cards.

This means:

- task context is introduced through the top-level hero and info surfaces
- activity history remains the primary storytelling structure
- photos/evidence appear inline with the relevant updates and chronology
- delegation context is visible within the task context surfaces, not required as a separate pinned summary card
- subtask context remains visible and drillable, but does not require a separate always-on dedicated card

## Non-goals

The current approved direction does **not** require:

- a separate pinned delegation summary surface
- a separate pinned evidence/photo summary strip
- a separate always-on subtasks card above the work thread

Those patterns were explored earlier but are superseded by the unified task-detail direction.

## Camera — Approved Model

## Role

`Camera` is the primary capture action in the shell.

Its job is to:

- encourage fast on-site documentation
- reduce friction before task organization
- support both general capture and task-specific updates

## Default camera behavior

When the center camera button is pressed:

- open the camera immediately
- put photo capture first
- defer the organization choice until after capture

## Outside task context

When camera is launched from anywhere outside Task Detail:

- capture first
- default the post-capture route to **Create New Task**
- still allow an alternate path to **Add to Existing Task**

This keeps capture lightweight while preserving the ability to file evidence into an existing task when needed.

## Inside task context

When camera is launched from a Task Detail screen:

- capture first
- default directly into a **photo update for that same task**
- skip the generic post-capture routing choice

This should feel like a context-aware in-task update action, not a detached navigation flow.

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

From `Task Detail`:

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
- top-level shell alignment to `Activity / Camera / Tasks` with profile in the header area
- project-scoped `Recent Activity` home
- a compact task surface slice has been implemented and now reflects the latest approved direct-open `Tasks` model

### Correction now governs future work

The approved queue/dashboard correction supersedes the earlier `S-UX-01E` direction where necessary.

Specifically, the approved target is now:

- dense dashboard grid on `Activity`
- active-project summary card above the grid
- task-derived critical dates in the summary
- bucket-first queues on `Tasks`
- `My Queue / Team Queue`
- `Team Queue` lighter preview row on `Tasks`
- compact direct-open task summary cards/rows
- global all-task search/filter mode
- drafts as lower-priority supporting content on `Tasks`, not `Activity`

### Current implemented correction state

The approved correction is now implemented as `WS-UX / M-UX-01 / S-UX-01E2`.

Implemented correction outcomes:

- `Activity` renders the active-project summary card before the dense queue dashboard
- dashboard cells launch the corresponding queue/bucket in `Tasks`
- `Tasks` uses ownership-first queues with bucket-first interaction and a unified search mode
- weekly critical dates are sourced from the `critical_this_week` task tag
- the create/detail flows expose the lightweight critical-date flag entry path

The following approved design decisions are now implemented in `WS-UX / M-UX-01 / S-UX-01F`:

- 3-item bottom shell with `Activity / Camera / Tasks`
- dominant center camera button
- profile moved into the top-right header area for the worker shell
- compact inline weather treatment replacing the larger weather tile
- context-aware camera defaults based on whether the user launches camera from Task Detail or elsewhere

The following approved design decisions are now implemented in `WS-UX / M-UX-01 / S-UX-01G`:

- task detail is presented as a visual work-thread surface rather than a dense generic section stack
- delegation context remains visible within the unified task context rather than a separate dedicated summary surface
- evidence remains part of the task’s visual work thread rather than a separate pinned photo/evidence surface
- activity history is reframed as a clearer work thread with stronger event labeling and media grouping
- subtask context remains visible and drillable inside the redesigned task-detail surface without requiring a separate always-on summary card

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
