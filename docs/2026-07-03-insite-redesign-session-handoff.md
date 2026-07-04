# Insite Redesign Session Handoff

Date: 2026-07-03

## Reusable Future Prompt

Use this prompt in a future session:

```text
Please read and use this handoff document as the source of truth for prior work completed in an earlier session:

docs/2026-07-03-insite-redesign-session-handoff.md

Continue from that exact state. Do not restart discovery. Preserve all approved design decisions, the existing redesign direction, the mock structure, and the implementation progress already completed.

Before making changes:
- summarize the approved product direction from the handoff
- identify which implementation slice was already completed
- identify what remains
- continue from the next logical step only

If the repo working directory is available, keep all new work in that single repo and avoid creating a second parallel project folder.
```

## Session Goal

This session defined and validated a complete redesign direction for the Insite / Taskr mobile app.

The user wanted:

- a complete redesign and UI alternative to the existing app
- a very simple interface with the fewest steps possible on site
- a photo-centric experience that encourages frequent documentation
- preservation of existing core business logic from the current Taskr app

## Final Approved Product Direction

The agreed redesign direction is:

- `Recent Activity` is the default home
- the app is `project-scoped`
- the app restores the `last selected project` when reopened
- all visible tasks on the task screen belong only to the active project
- users must still be able to open a full list of all tasks in the active project
- task drill-in must remain easy
- the design should feel cleaner, simpler, and more premium than the old app
- old business logic should be preserved while the UI is modernized

## Approved Information Architecture

Core model:

- `Project → Container → Task + Tags`

Refinements agreed during the session:

- containers should be lightweight
- deep nesting should be avoided
- tags are preferred over heavy nested containers for most organizational needs
- nested containers may be supported only in a shallow way when truly needed
- subtasks remain distinct from containers

Preferred organizational model:

- `Project`
- `Container`
- `Task`
- `Tags`

## Approved Navigation And Screen Model

The agreed screen structure is:

1. `Activity Home`
2. `All Tasks`
3. `Container View`
4. `Task Detail`
5. `Batch Capture Review`
6. `Project Switcher`

Primary navigation direction:

- `Activity`
- `Tasks`
- `Camera`
- `Projects` in the current mock, serving as direct access to `Project Switcher`

Key behavioral rules:

- project context persists between sessions
- activity and tasks always operate inside the current project
- capture inherits project context automatically
- attaching a capture to a task is optional at capture time
- users should be able to save first and organize later

## Approved UX Decisions

### Home / Landing

- the landing page should use the `Recent Activity` layout
- it should not be a generic dashboard
- it should not be a pure task list
- it should be image-led and useful immediately on open

### Tasks

- there must be a clear path from Activity to the full project task list
- the task list should be scoped to the active project only
- tasks should support compact and collapsible grouping
- the user explicitly approved a compact collapsible version of the tasks screen

### Task Detail

- task detail should feel like a visual work thread
- it should show delegation, activity log, subtasks, photos, and workflow state clearly
- it should preserve current review / approval / reassignment logic from the old app

### Capture

- the app should support multi-photo capture / multi-photo review
- batch capture is required to reduce repetitive behavior on site
- project-first save flow is preferred
- attaching to a task should remain optional

### Delegation And Activity Logging

The user clarified that the old Taskr logic includes:

- multiple user delegation
- activity logging

These were explicitly added into the redesign spec and are part of the approved direction.

## Existing App Review Completed

The existing Taskr / Insite app in this repository root was reviewed to compare old behavior against the new design.

Confirmed strengths in the old app:

- task workflow states are strong
- task detail flows are already rich
- project selection persistence already exists
- photo attachment and annotation flows already exist
- task-level activity logging already exists
- reassignment / multi-assignee support exists
- nested subtasks already exist

Key gaps identified versus the redesign:

- no true project-scoped activity-first home
- no dedicated `Activity` top-level experience
- no true `Project → Container → Task + Tags` model
- no standalone project-scoped batch capture review flow
- delegation implementation is incomplete
- no project-level activity feed
- navigation is still heavier than the redesign target

## Documents Created In This Session

The following working documents were created in this repository:

- redesign spec:
  - `docs/superpowers/specs/2026-07-03-insite-app-redesign-design.md`
- old vs new gap analysis:
  - `docs/superpowers/analysis/2026-07-03-taskr-old-vs-new-gap-analysis.md`
- implementation plan:
  - `docs/superpowers/plans/2026-07-03-insite-redesign-implementation.md`

## Design Mock Created

A new design mock project was created:

- `docs/superpowers/mocks/taskr-new-interface-mock/taskr-new-interface-mock.design`

This mock preserves old business logic while presenting the new interface direction.

Mock pages created:

- `Activity Home`
- `All Tasks`
- `Task Detail`
- `Batch Capture Review`
- `Project Switcher`

Design direction of the mock:

- Apple-inspired minimal mobile feel
- softer surfaces
- rounded cards
- calm spacing
- cleaner hierarchy
- stronger photo-led presentation
- lighter delegation and activity display
- compact collapsible tasks direction captured in the redesign plan and task-surface notes

## Implementation Planning Completed

An implementation plan was created for the actual app codebase.

It breaks the redesign into slices:

1. redesign-safe task model foundation
2. active project as default workspace behavior
3. activity-first home
4. compact project task surface
5. task detail redesign
6. batch-first capture review
7. migration hardening and regression coverage

## Actual Code Implementation Completed In This Session

The first implementation slice was completed in the existing app repo.

Completed slice:

- `Task 1: redesign-safe task model foundation`

What was implemented:

- redesign-safe task fields were added
- compatibility normalization was added so legacy `assignedTo` still works
- new activity types were added for delegation and batch-photo events
- focused unit tests were added and passed

Files changed in the repo for that slice:

- `src/types/buildtrack.ts`
- `src/state/taskStore.supabase.ts`
- `src/state/__tests__/taskStore.supabase.unit.test.ts`

Important compatibility note:

- database persistence of the new fields still depends on matching Supabase columns

## Git And Roadmap Status

The first redesign slice was committed in the app repo.

Commit created:

- `23acc40`
- `feat(ux): add redesign task model foundation`

Roadmap / documentation handling:

- the redesign work was added to the repo roadmap flow as:
  - `WS-UX / M-UX-01 | Insite redesign implementation | Pipeline | M-UIA-03, M-DATA-02 | 14`
- there was a temporary issue because `ROADMAP.md` was being changed in another prompt / terminal
- the user later confirmed that the `ROADMAP.md` issue was resolved in the other terminal

## Current Known Working-State Problem

The biggest operational issue discovered at the end of the session:

- this session was bound to a separate selected folder
- the real app repo is this repository root
- the user does not want to maintain two working directories for the same project

Recommended future-session instruction:

- use this repository as the only working directory
- consolidate future design docs, mock artifacts, and implementation work there
- do not continue long-term work in the temporary parallel workspace

## Recommended Next Step

The next implementation slice to execute is:

- `Task 2: make the active project the default workspace behavior`

That means:

- use sticky active-project restore as the actual workspace shell behavior
- align navigation and workspace context around the selected project
- prepare the app for the full Activity-first redesign

## If Continuing In A New Session

A future session should:

1. read this handoff doc first
2. read the redesign spec
3. read the gap analysis
4. read the implementation plan
5. confirm Slice 1 is already done
6. continue from Slice 2
7. prefer using this repository as the only working repo if possible

## Short Summary

By the end of this session:

- the redesign direction was fully agreed
- the old app was audited
- a full mock was created
- a compact collapsible task variant was added
- a spec, analysis, and implementation plan were written
- the first actual app-code slice was implemented and committed
- the next step is continuing implementation from the active-project workspace slice
