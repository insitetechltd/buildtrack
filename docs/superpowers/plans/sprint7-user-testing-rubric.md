# Sprint 7 User Testing Rubric

**Goal:** Validate real-user workflow correctness and iPhone 17 layout density using the canonical Tristan/Herman Sprint 7 sandbox.

**Sandbox Entry Point:** `Profile -> Developer Settings -> Initialize Sprint 7 Staging Sandbox`

**Canonical Users**
- `Tristan` - Main Contractor / reviewer / cross-project dashboard owner
- `Herman` - Subcontractor / executor / field update owner

**Seed Scope**
- `2 users`
- `2 projects`
- `5 tasks total`
- Shared project: `Harbor Tower - Level 12 Fitout`
- Tristan-only project: `Private Penthouse Defects`

## Scenario A: Rejection Loop
- Initialize the sandbox as `Herman`.
- Open the shared project task list and locate `Seal corridor ceiling joints`.
- Progress the task until it reaches submitted-for-review state.
- Use the Developer Settings sandbox action to switch to `Tristan` without resetting the dataset.
- Decline the same task.
- Verify expected behavior:
- Tristan sees the task as `ACTION_REQUIRED`.
- Herman no longer sees it as active work; it should either disappear from active responsibility views or resolve into a `VOID_ARCHIVED` context.
- Dashboard quick-grid totals do not gain phantom open or overdue counts.

## Scenario B: Overdue Crunch
- Initialize the sandbox as either user.
- Confirm `Review fire-stop penetrations` is already seeded in `submitted_for_review`.
- Use the overdue scenario helper in `src/test-utils/sprint7Seeds.ts` or reinitialize the dataset with an overdue-focused loader path if added locally.
- Verify expected behavior:
- Dashboard quick-grid shows the review backlog as overdue.
- The overdue badge appears without label clipping or row collapse.
- Project cards remain visible below the quick-grid with no jump in height.

## Scenario C: Isolation Wall
- Initialize or switch the sandbox to `Herman`.
- Start on the dashboard.
- Verify expected behavior:
- Herman only sees `Harbor Tower - Level 12 Fitout`.
- Tristan-only metrics from `Private Penthouse Defects` do not appear on Herman’s dashboard.
- Shared-project tasks remain visible, but Tristan-only project summaries stay hidden.

## iPhone 17 Viewport Audit
- Verify the dashboard header clears the Dynamic Island with no clipped icons or text.
- Verify the 3-tile quick-grid remains fully visible above the first project card on first load.
- Verify `Action Required`, `In Progress`, and `Awaiting Approval` labels do not clip, wrap awkwardly, or overlap overdue badges.
- Verify scrolling leaves comfortable spacing above the Home Indicator and does not hide the final action targets.
- Verify the `TasksScreen` search field stays anchored, with no layout jump when typing or clearing.
- Verify project cards remain scannable in portrait orientation and do not crowd each other vertically.
- Verify developer action buttons in `Developer Settings` remain tappable on iPhone 17 without safe-area collisions.

## Pass / Fail Capture
- Record actor used: `Tristan` or `Herman`
- Record screen tested: `Dashboard`, `Tasks`, `Task Detail`, `Developer Settings`
- Record result: `Pass`, `Fail`, or `Needs follow-up`
- Record evidence: screenshot, simulator note, or exact reproduction step
