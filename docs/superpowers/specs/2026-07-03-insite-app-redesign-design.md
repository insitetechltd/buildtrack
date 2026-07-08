# Insite App Redesign Design

Date: 2026-07-03

## Summary

This redesign repositions Insite as a project-scoped, photo-centric field documentation app for mixed teams. The product should feel fast enough for on-site workers, structured enough for supervisors, and simple enough that documenting site conditions never feels like admin work, while also supporting multi-user delegation and reliable activity logging.

The core product model is:

`Project → Container → Task + Tags`

Where:
- `Project` is the primary workspace and persists between sessions
- `Container` is a lightweight organizational layer inside a project
- `Task` is the main operational object users open, update, and complete
- `Tags` provide flexible metadata for filtering and retrieval without adding hierarchy depth

The default home experience is a compact `Recent Activity` screen scoped to the last selected project from the previous session. It should prioritize the most recent task-linked activity from the last 7 days while providing a clear path into the full project task list.

## Product Goals

- Make photo documentation the fastest action in the app
- Restore users directly into their last active project
- Keep all landing-page content scoped to the current project only
- Support mixed-team workflows without requiring different home experiences for each role
- Provide a clean path from activity to full task management
- Reduce repetitive capture behavior through multi-photo batch capture
- Organize project work with light structure, not heavy hierarchy
- Support delegation of tasks across multiple users
- Preserve a clear activity log for accountability and auditability

## Core Experience Principles

### 1. Project Context Is Sticky

When the app opens, it should restore the project chosen in the previous session. Users should not need to choose a project every time they open the app. The active project acts as the default context for:

- recent activity
- visible task lists
- new photos
- new notes
- task creation or updates

Project switching must be available but secondary.

### 2. Recent Activity Is The Default Lens

The landing screen should use a recent-activity layout, not a generic dashboard and not a pure task list. This creates a more immediate, visual, and engaging experience while still supporting structured work.

The home screen should include:

- active project header
- compact recent task activity
- visible counts or summary pills
- clear entry into `All Tasks`
- persistent capture action

Every item on this screen must belong to the active project only.

### 3. Tasks Remain A Core Operational View

The app should not force users to work only from the activity feed. Users must be able to view all tasks in the active project, open a specific task, and continue structured task work easily.

This creates two connected lenses inside the same project:

- `Activity`
- `Tasks`

These are not separate products or separate contexts. They are two views of the same project workspace.

### 3A. Tasks Must Support Multi-User Delegation

Task ownership should not be limited to a single user model. Insite should support delegation patterns where a task may be:

- assigned to one primary owner
- delegated to one or more additional users
- handed off from one user to another
- updated by different team members over time

The design should make delegation visible without making task cards feel heavy. Users need to understand who owns the task now, who else is involved, and whether responsibility has changed recently.

### 4. Capture Must Be Batch-Friendly

The product should optimize for capturing multiple photos in one session. Users often document one site condition from several angles, so single-photo-only behavior would introduce unnecessary friction.

The post-capture experience should support:

- batch review of multiple photos
- one-tap save to current project
- optional attachment of the whole batch to a task
- shared batch note
- optional later organization if task assignment is not known yet

### 5. Organization Should Use Light Containers Plus Tags

The information architecture should avoid deep nesting. Instead, use:

- one primary project
- one lightweight container layer by default
- optional shallow child container only if truly needed
- tags for flexible metadata and retrieval

This provides enough structure for complex projects without slowing down field use.

## Information Architecture

### Recommended Model

`Project → Container → Task`

With:
- `Tags` applied to tasks, photos, notes, and activity items

Task records should also support:

- primary assignee
- additional delegated users
- activity history
- created-by and updated-by metadata

### Containers

Containers represent stable, high-value grouping inside a project. Good examples include:

- area
- floor
- trade
- package
- phase
- zone

Containers should help teams browse and group work, but they should not become a required step before photo capture.

### Nested Containers

Nested containers may be supported, but should remain shallow.

Recommended limit:

`Project → Container → Sub-container → Task`

This is appropriate only when large projects require additional spatial or work-package clarity. The UI must never depend on deep navigation for everyday field capture.

### Tags

Tags are recommended over deep nesting for flexible classification. Tags support multiple retrieval angles at once without forcing users to choose a rigid hierarchy.

Examples:

- `Urgent`
- `Safety`
- `Inspection`
- `Defect`
- `Electrical`
- `Level 12`
- `Access`

Tags should power:

- filtering
- search refinement
- quick metadata display
- cross-cutting retrieval across containers

## Screen Architecture

## 1. Activity Home

The default landing screen.

Purpose:
- resume the user in the active project
- show current project activity immediately
- encourage documentation through visual momentum
- provide direct access to all project tasks

Key elements:
- active project header
- task count and summary metadata
- compact recent activity rows
- queue overview for both `My Queue` and `Team Queue` using four buckets:
  - `New`
  - `Doing`
  - `Review`
  - `Overdue`
- visible `View all tasks` entry
- persistent capture button

Behavior:
- restores last selected project
- shows only activity from current project
- shows only activity from the last 7 days
- new captures inherit the project by default
- the Activity queue overview should use the same four-bucket model as the Tasks screen
- `New`, `Doing`, and `Review` should count only non-overdue tasks
- `Overdue` should aggregate all overdue tasks for that queue
- all four queue buckets must fit within the visible screen width in one row
- do not use horizontal scrolling for the four-bucket queue layout on either Activity or Tasks

Recent Activity row rules:
- each row should use a small thumbnail of the most recent relevant photo on the left
- each row should use a three-line text stack on the right:
  - line 1: actor plus meaningful action taken
  - line 2: task title
  - line 3: date or time
- prioritize human-readable actor-plus-action wording over system-like labels
- keep the row visually compact, but allow enough height for the three-line structure to remain clear
- do not show a status badge on dashboard activity rows
- if there is no activity in the last 7 days, show a concise empty state instead of older history
- use a shared activity-label resolver across summary surfaces so the same underlying action produces the same user-facing wording everywhere
- prefer meaningful action descriptions such as photo upload, review submission, approval, or delegation over generic fallback wording
- if photos were added without a meaningful progress change, use photo-oriented wording rather than copy such as `Updated progress to 0%`
- only use progress wording when progress actually changed meaningfully

## 2. All Tasks

The structured list screen for the active project.

Purpose:
- provide the full operational picture of the project
- support scanning, filtering, and drilling into tasks

Key elements:
- current project title
- task grouping by container
- status filters
- assignee filters
- delegation filters
- due-state filters
- tag filters
- compact task cards with a fixed small thumbnail on the left
- four queue buckets inside both `My Queue` and `Team Queue`:
  - `New`
  - `Doing`
  - `Review`
  - `Overdue`
- collapsed `Drafts` section at the bottom of the scroll

Behavior:
- only tasks from current project appear here
- task groups can be expanded and collapsed
- tapping a task opens `Task Detail`
- tasks should expose delegation state without requiring users to open every task
- `New`, `Doing`, and `Review` should count only non-overdue tasks in their respective workflow states
- `Overdue` should aggregate all overdue tasks in that queue regardless of whether they are new, doing, or review items
- tapping `Overdue` should open a mixed overdue list for that queue while preserving each task's own workflow context in the row content
- the `Overdue` bucket should always be present, even when its count is `0`
- all four queue buckets should fit inside one visible row within the screen width
- do not use horizontal scrolling for the queue buckets
- the `Drafts` section should be collapsed by default
- the `Drafts` section should appear at the bottom of the Tasks screen only when drafts exist
- tapping the `Drafts` header should expand or collapse the draft list in place

Task card rules:
- use a compact horizontal layout with a larger left media block that fills the full card height
- reduce the overall card height substantially from the current thumbnail-card version so the list feels denser and faster to scan
- keep card height stable whether a task has a real photo or only a placeholder surface
- make the task title the strongest visual element on the card
- allow the title to use one to two lines maximum
- use a three-line right-side hierarchy only:
  - line 1: task title
  - line 2: state badge
  - line 3: location if available, otherwise short task description
- keep the state badge visually compact and self-contained on the second line
- if overdue time context is shown, pair it tightly with the overdue badge rather than turning it into a full sentence
- do not use a separate low-value metadata row below the three core lines
- avoid large status badges or dense metadata stacks that compete with the title
- prefer the thumbnail-plus-title layout over wide image cards so the task list remains compact and scannable
- make the photo visually strong enough to improve task recognition at a glance, rather than treating it as a minor accessory

## 3. Container View

An optional focused view when a user opens a container.

Purpose:
- show all tasks and activity for one container within the active project
- reduce noise on large projects

Key elements:
- breadcrumb path
- container title
- container task list
- recent activity inside container
- filters and tag chips

Behavior:
- should feel like narrowing context, not changing workspace
- capture still inherits the active project, and may also inherit the open container

## 4. Task Detail

The main drill-in screen for structured work.

Purpose:
- unify photo evidence, notes, and status changes in one place

Key elements:
- project and container breadcrumb
- task title and status
- assignee, delegated users, and location context
- photo timeline
- recent notes and updates
- activity log
- fixed two-button bottom action bar
- delegation action

Behavior:
- task detail should feel like a visual work thread rather than a dense form
- users should be able to update a task in one or two actions
- capture launched from task detail should automatically attach context where possible
- delegation changes should be visible in the task history
- every meaningful task action should create a readable activity log entry

Task detail action-bar rules:
- use a fixed two-button bottom action layout rather than a variable multi-action cluster
- before the task is accepted, show:
  - `Accept`
  - `Reject`
- after the task is accepted, show:
  - `Add Photos`
  - `Add Comment`
- when the task is in review-related states, keep:
  - `Add Photos`
  - `Add Comment`
- do not switch the bottom two-button layout to `Approve` / `Reject` during review in this design pass
- for approved or completed tasks, the two-button bar may be hidden or reduced in a later pass; do not expand scope here
- the task-detail bottom action bar is a state-driven surface change and should not require changing the underlying navigation structure
- both `Add Photos` and `Add Comment` should converge into the same underlying task update composer rather than two unrelated submission flows
- `Add Photos` should force a photo-first entry path:
  - open camera or photo selection first
  - then return to the same task update composer with the comment area still visible
  - the user should be able to add a note about the captured photo before submitting
- `Add Comment` should open the same task update composer directly in comment-first mode
- inside that shared composer, users who entered from `Add Comment` should still be able to add photos afterward
- the difference between the two buttons should be the starting step, not the final destination

Task detail entry rules:
- each work-thread entry should read as a clear event card
- show actor, date, and time clearly at the top of the entry
- make the primary photo visually dominant within the card
- place the note or description below the photo
- if an entry has additional photos, expose them as a lightweight continuation affordance rather than shrinking the main image
- preserve the stronger existing gallery behavior while upgrading the visual composition to feel more immersive and human-readable

## Visual Adoption Strategy

The redesign should adopt the clearer visual hierarchy from the new reference screens while preserving the stronger workflow logic already established in this product direction.

Guiding rule:
- borrow the reference visual structure where it improves clarity, spacing, and information hierarchy
- keep existing product logic where it is already more mature, including:
  - shared meaningful activity labels
  - 4-bucket queue model with `Overdue`
  - overdue counting rules across Activity and Tasks
  - draft placement inside Tasks
  - richer Task Detail activity semantics

Recommended adoption order:
- refine `Recent Activity` into the thumbnail + actor/action + title + date layout
- upgrade `Tasks` cards to a larger-thumbnail, status/location-focused composition
- redesign `Task Detail` entries into stronger actor/time + large-photo event cards
- complete a final consistency pass across spacing, surfaces, corner radius, and typography

## 5. Batch Capture Review

The post-camera decision screen.

Purpose:
- minimize repetitive capture workflows
- let users document several images quickly and organize them with minimal effort

Key elements:
- multi-photo thumbnail strip or grid
- current project confirmation
- optional task assignment
- add shared note
- save batch to project
- save as draft

Behavior:
- project should be preselected from the active session
- task assignment should be optional, not required
- users should be able to batch-save first and organize later
- if a batch is attached to a task, that action should appear in the task activity log

## 6. Project Switcher

A secondary control, not a mandatory first-run choice every time.

Purpose:
- change active project when needed

Key elements:
- recent projects
- project counts or summary metadata
- last-opened cues

Behavior:
- selecting a project updates both Activity and Tasks
- selected project becomes the default next session

## Navigation Model

Primary navigation should be simple and stable:

- `Activity`
- `Tasks`
- `Camera`
- `Profile` or `More`

Rules:
- `Activity` and `Tasks` always operate inside the current project
- `Camera` is a universal capture action
- `Task Detail` is reachable from both Activity and Tasks
- `Container View` is an intermediate narrowing view, not a primary tab

## Delegation Model

The task system should support multi-user delegation in a way that remains lightweight on mobile.

Recommended model:

- one `primary owner` for accountability
- zero to many `delegated users` for execution or follow-up
- explicit `delegated by` and `delegated at` metadata
- visible handoff history inside task detail

The default task list should show:

- primary owner avatar or initials
- delegated-user count when more than one additional user is involved
- quick delegation state such as `Assigned`, `Delegated`, or `Shared`

Task detail should allow:

- assigning a task to another user
- adding supporting delegated users
- removing delegated users
- viewing prior delegation events in the activity history

The UX goal is clarity, not workflow bureaucracy.

## Key Flows

### Quick Project-Scoped Batch Capture

`Open app → resume last project → tap capture → take multiple photos → review batch → save to project`

Optional next step:

`Attach batch to task`

### Structured Task Update

`Open app → Tasks → open task → add photo/note/status update`

### Multi-User Delegation

`Open app → Tasks → open task → assign or delegate to user(s) → activity log records the change`

### Activity To Task Continuation

`Open app → Recent Activity → open activity item → continue in Task Detail`

### Container-Narrowed Task Scan

`Open app → Tasks → open container → scan container tasks → open specific task`

### Draft Completion

`Capture multiple photos → save as draft → return later from the collapsed Drafts section in Tasks or from Task Detail → finalize note or task assignment`

## Activity Logging

Activity logging should exist at both the project and task levels.

### Project-Level Activity

The `Recent Activity` home screen should show project-scoped events such as:

- photos added
- task updates
- status changes
- delegation events
- comments or notes

This feed should remain visual-first, but every item must still communicate:

- what changed
- which task it belongs to
- when it happened

The dashboard feed should be optimized for scan speed rather than audit completeness:

- show task title as the primary line
- show `timestamp · action taken` as the secondary line
- omit the status badge
- limit the feed to the last 7 days
- leave older history and draft recovery to the structured task surfaces
- use the same shared action-label logic as other recent-activity summaries so identical events do not render conflicting copy across dashboard and task-level surfaces

### Task-Level Activity

Every task should maintain its own readable activity log.

Typical entries include:

- task created
- task assigned
- user delegated
- delegation removed
- status changed
- photo batch attached
- note added
- draft completed

The activity log should be:

- chronological
- easy to scan on mobile
- tied to user identity
- tied to timestamps
- integrated with photos and notes rather than hidden as an admin-only audit view

The goal is to support accountability and team coordination without turning the interface into a dense reporting tool.

## Interaction Rules

- project context persists across sessions
- all visible tasks on the landing experience belong to the active project only
- recent activity on the landing experience belongs to the active project only
- capture inherits project automatically
- if user is already inside a container or task, capture may inherit that context too
- attaching to a task is optional at capture time
- delegation should never hide the primary owner of a task
- every meaningful task action should be logged automatically
- users should never lose captured photos because required structure is incomplete

## Error Handling And Reliability

The app should be resilient in imperfect site conditions.

Required UX behaviors:

- if network is weak, show captured photos as saved locally and syncing
- if a task is unavailable, allow save-to-project or draft instead
- if the active project was archived or access changed, clearly explain it and prompt project change
- if task assignment is unknown, allow users to continue without blocking capture

Principle:

`Never block documentation because structure is temporarily incomplete.`

## Visual Direction

Current visual direction should remain:

- clean
- calm
- native-feeling
- minimal
- easy to scan

The present wireframe direction should prioritize clarity and flow over visual expressiveness. Additional visual appeal can be layered later through:

- stronger photo treatments
- richer depth and media emphasis
- more refined motion
- stronger brand accents
- improved hierarchy in cards and capture surfaces

This later polish should not compromise speed or simplicity.

## First Proper Wireframe Scope

Recommended first complete wireframe pass:

1. Activity Home
2. All Tasks
3. Container View
4. Task Detail
5. Batch Capture Review
6. Project Switcher

This scope is sufficient to validate:

- default session restoration
- project-only content logic
- task grouping
- container organization
- batch capture workflow
- task drill-in

## Success Criteria

The redesign is successful if:

- users can open the app and immediately resume the correct project
- the home screen feels alive and useful on first glance
- users can find all project tasks in one clear step
- task grouping improves organization without adding friction
- multi-photo capture reduces repetitive work
- documentation can begin before full task assignment is known
- delegation across multiple users is clear and lightweight
- task and project history are visible enough to support accountability
- mixed teams can use the same structure without confusion

## Recommendation

Proceed with a project-scoped, recent-activity-first redesign that combines:

- sticky project context
- project-filtered activity
- full task access
- lightweight containers
- tag-based flexibility
- batch photo capture
- multi-user delegation
- built-in activity logging

This is the strongest balance between field speed, operational structure, and future scalability.
