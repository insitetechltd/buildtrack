# Taskr Old App vs New Design Gap Analysis

Date: 2026-07-03

## Purpose

This report compares the existing Taskr app implementation in `\KooDrive\Insite App` against the new Insite redesign direction documented in:

- `docs/superpowers/specs/2026-07-03-insite-app-redesign-design.md`

The goal is to identify:

- what the current app already does well
- what is missing relative to the redesign
- what should be preserved during redesign
- where migration or product-definition risks exist

## Executive Summary

The current Taskr app already has strong operational foundations:

- robust task workflow states
- real task detail flows
- project selection persistence plumbing
- photo attachments, annotation, and upload flows
- task-level activity logging
- reassignment and multi-assignee support
- nested tasks / subtasks

However, it does **not** yet match the core redesign model.

The biggest gaps are:

- no project-scoped, recent-activity-first home
- no dedicated `Activity` top-level experience
- no true `Project → Container → Task + Tags` information architecture
- no standalone project-scoped batch photo capture workflow
- no complete delegation model
- no project-level activity feed
- no simplified field-first navigation shell centered on `Activity`, `Tasks`, and `Camera`

In short:

The old app is operationally capable, but the new design is shifting the product from a task-management shell into a project-scoped, photo-centric field workspace.

## Confirmed Current Capabilities

### 1. Navigation And Screen Coverage

The existing app already includes:

- dashboard
- tasks list
- create task
- reports
- profile
- task detail
- project picker
- update progress
- add comment
- reject task
- reassign task
- photo selection / viewer / annotation flows

Relevant files:

- `src/navigation/AppNavigator.tsx`
- `src/navigation/navigationTypes.ts`

### 2. Project Selection Persistence

The current app already has infrastructure to persist and restore the last selected project.

Relevant file:

- `src/state/projectFilterStore.ts`

This is important because it aligns with the redesign requirement that the app restore the last active project when reopened.

### 3. Task List And Filtering

The current task system already supports:

- search
- task list filtering
- inbox / outbox / my work views
- per-project filtering when a project is selected
- nested task trees using `parentTaskId`

Relevant files:

- `src/screens/TasksScreen.tsx`
- `src/ui/viewAdapters/useTasksViewAdapter.ts`
- `src/state/taskStore.supabase.ts`

### 4. Task Detail Workflows

Task detail is already rich and supports:

- accept / decline
- progress updates
- review submission
- approval / rejection
- reassignment
- comments
- subtasks
- attachments
- activity timeline

Relevant files:

- `src/screens/TaskDetailScreen.tsx`
- `src/ui/viewAdapters/useTaskDetailViewAdapter.ts`

### 5. Photo Handling

The current app already supports:

- camera and photo library access
- multiple image selection from library
- annotation / editing
- remove / add more during review
- upload or return photos to the caller flow

Relevant files:

- `src/utils/usePhotoSelection.ts`
- `src/screens/PhotoSelectionScreen.tsx`
- `src/ui/viewAdapters/usePhotoSelectionViewAdapter.ts`

### 6. Task Activity Logging

The app already has a strong task-level activity model.

Confirmed activity types include:

- progress updates
- status changes
- metadata edits
- assignment
- creation
- cancellation
- review submission
- review acceptance
- review rejection
- assigner comments

Relevant files:

- `src/types/buildtrack.ts`
- `src/state/taskStore.supabase.ts`
- `src/components/taskDetail/TaskActivityTimeline.tsx`

## Gap Analysis

## 1. Home / Landing Experience

### Current App

The current home experience is a dashboard-style summary screen with project summaries and task metrics.

Relevant files:

- `src/screens/DashboardScreen.tsx`
- `src/ui/viewAdapters/useDashboardViewAdapter.ts`

### New Design

The redesign requires the home screen to be:

- recent-activity-first
- project-scoped
- photo-centric
- draft-aware
- clearly linked to all tasks within the active project

### Gap

The current dashboard is not a recent-activity feed and is not structured as a project workspace. It is metrics-led rather than visual and capture-led.

### Impact

This is one of the largest conceptual gaps between the old and new design.

## 2. Project-Scoped Workspace Model

### Current App

Project filtering exists, but the product still behaves like a broader task-management shell.

### New Design

The redesign assumes:

- one active project at a time
- app restores the last selected project
- both `Activity` and `Tasks` operate inside that active project

### Gap

The persistence layer exists, but the visible product experience does not yet consistently behave as a sticky project-scoped workspace.

### Impact

The redesign can reuse the existing persistence foundation, but the surface UX and navigation need to be re-centered around project context.

## 3. Activity Feed

### Current App

The app has task-level activity logging, but not a project-level activity home.

### New Design

The redesign requires a project-level recent activity stream showing:

- photos
- notes
- task updates
- drafts
- delegation events
- status changes

### Gap

Activity exists as data at the task level, but not as a top-level project activity product surface.

### Impact

This is a structural UX gap, not just a styling gap. The redesign will need a new aggregation layer for project-scoped activity.

## 4. Task Organization: Containers And Tags

### Current App

The current app uses:

- project
- task
- subtask via `parentTaskId`
- category

### New Design

The redesign proposes:

- `Project → Container → Task`
- optional shallow nesting only when necessary
- tags for flexible cross-cutting classification

### Gap

The current app does not have domain-level containers or a full tag system. Subtasks exist, but subtasks are not the same as containers.

### Impact

Containers and tags will require data-model and UI additions, not just rearranging current screens.

## 5. Batch Photo Capture

### Current App

The current app supports multiple photo selection from library and photo review flows tied to task or update actions.

### New Design

The redesign requires:

- batch photo review
- project-first save behavior
- optional task attachment
- shared batch note
- save-as-draft / organize-later workflow

### Gap

The current app supports photo handling, but not a standalone project-scoped batch capture flow optimized for rapid field documentation.

### Impact

The redesign should preserve the current photo tooling, but change its surrounding workflow and IA substantially.

## 6. Delegation

### Current App

Delegation infrastructure exists in the data model and UI:

- `delegationHistory`
- delegation banner on task cards
- reassignment flows

But the implementation is incomplete.

Relevant doc:

- `TASK_DELEGATION_STRATEGY.md`

### New Design

The redesign expects:

- clear primary owner
- supporting delegated users
- delegation state visible in task UI
- delegation events reflected in activity history

### Gap

The current app does not fully implement the intended delegation logic. It has partial UI and data structure, but reassignment does not yet create a reliable delegation audit trail.

### Impact

Delegation must be treated as a true product/system gap, not just a missing screen refinement.

## 7. Activity Logging Quality

### Current App

Task-level activity logging is a strength of the old app.

### New Design

The redesign wants:

- task activity logging
- project activity visibility
- photo batch events
- delegation history visibility
- lightweight accountability

### Gap

Current logging is strong at task level, but weak at project level, and not yet complete for delegation and batch-photo semantics.

### Impact

This is an evolution of an existing strength rather than a brand-new capability.

## 8. Mobile Field Usability

### Current App

The app is operationally rich, but still has a relatively dense navigation model with multiple separate flows.

### New Design

The redesign prioritizes:

- fewer steps
- faster capture
- simpler mental model
- photo-centric documentation
- clearer project context

### Gap

The current app feels more like a task-management application with attached media workflows, whereas the redesign is aiming for a field-documentation application with structured task access.

### Impact

The redesign is not merely visual polish. It is a product simplification and flow re-prioritization.

## Old App Strengths To Preserve

These are important capabilities from the current Taskr app that should be preserved or adapted in the redesign.

### 1. Task Workflow State Machine

The current task lifecycle is strong and operationally meaningful.

Examples:

- `new`
- `accepted`
- `in_progress`
- `submitted_for_review`
- `approved`
- `rejected`
- `declined`
- `cancelled`

### 2. Task Activity Timeline

The current activity timeline is already a valuable foundation for accountability and auditability.

### 3. Nested Task Capability

Subtasks are useful and should likely remain as an execution-level structure, even if the new IA adds containers.

### 4. Photo Tooling

The current app’s media capability is already strong:

- multiple image selection
- annotation
- image review
- attachment workflows

This should be preserved and re-centered around faster field capture.

### 5. Project Persistence Plumbing

The last-selected-project persistence is already implemented and should be reused.

### 6. Responsibility Filters

The current inbox / outbox / my-work logic is useful and may remain as a secondary lens inside the new Tasks view.

## Migration Risks And Ambiguities

## 1. Primary Owner vs Delegated Users

The current app uses `assignedTo` as a multi-user array, but the redesign wants clearer ownership semantics.

The migration must define:

- how existing multi-assignee tasks map to primary owner
- how delegated users are represented
- whether “shared task” remains a valid state

## 2. Reassignment Behavior

Current reassignment resets task state in some flows. The redesign may want a lighter-weight delegation or handoff model.

This is a product behavior decision, not just a UI choice.

## 3. Drafts

The redesign expects more visible project-scoped drafts. Current draft behavior is more local/form-based and not yet surfaced as a project activity object.

## 4. Containers vs Subtasks

The current app already has subtasks. The redesign must be explicit that:

- containers are organization
- subtasks are execution breakdown

Otherwise the product may become confusing.

## 5. Documentation Drift

The codebase contains many historical documents. The safest interpretation remains:

- trust code over older root-level markdown

This matters when planning migration or preserving current behavior.

## Recommended Design Response

Based on the current app, the redesign should:

1. preserve the current task workflow engine
2. preserve task-level activity logging
3. preserve strong photo tooling
4. preserve project persistence
5. add a true project-scoped `Activity` home
6. add container and tag support
7. redesign capture into a batch-first workflow
8. finish and normalize delegation properly
9. unify task and activity views under a simpler field-first navigation model

## Priority Gaps To Solve First

If the redesign moves into implementation, the most important gaps to solve first are:

1. project-scoped home model
2. project-level recent activity feed
3. batch photo capture and review
4. task grouping model with containers and tags
5. explicit delegation model
6. simplified mobile navigation

## Conclusion

The current Taskr app is already feature-rich and operationally capable, especially around tasks, reviews, and activity history.

But the redesign is asking the product to become simpler, more visual, more project-scoped, and more field-friendly.

So the redesign should not discard the existing app’s operational strengths. It should:

- retain the workflow engine
- retain the audit logic
- retain the media foundation
- reorganize the product around project context and rapid documentation

That is the clearest path from the old app to the new design.
