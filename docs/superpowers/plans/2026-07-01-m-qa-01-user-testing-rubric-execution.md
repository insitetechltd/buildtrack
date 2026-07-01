# WS-QA / M-QA-01 — User Testing Rubric Execution Log

This document records the actual execution evidence for the Sprint 7 user testing rubric.

## Run Metadata

- Date:
- Device / Simulator:
- OS Version:
- App Build Type: (Dev build / Preview build / Production build)
- Commit SHA:
- Tester:
- Sandbox Entry Point Used: `Profile -> Developer Settings -> Initialize Sprint 7 Staging Sandbox`

## Pre-Flight Automated Gates (Optional, Recommended)

- `npx jest src/test-utils/__tests__/sprint7RuntimeSandbox.test.ts src/test-utils/__tests__/sprint7Seeds.test.ts --runInBand`
  - Result:

## Scenario A — Rejection Loop

- Actor start: `Herman`
- Steps performed:
  - [ ] Initialize sandbox as Herman
  - [ ] Open shared project task list, locate `Seal corridor ceiling joints`
  - [ ] Progress task to submitted-for-review
  - [ ] Switch to Tristan without resetting dataset
  - [ ] Decline the same task
- Expected checks:
  - [ ] Tristan sees the task as `ACTION_REQUIRED`
  - [ ] Herman no longer sees it as active work (disappears or `VOID_ARCHIVED` context)
  - [ ] Dashboard quick-grid totals do not gain phantom open/overdue counts
- Result: (Pass / Fail / Needs follow-up)
- Evidence: (screenshot filename(s) / short note)
- Notes:

## Scenario B — Overdue Crunch

- Actor: (Tristan / Herman)
- Steps performed:
  - [ ] Initialize sandbox
  - [ ] Confirm `Review fire-stop penetrations` is seeded in `submitted_for_review`
  - [ ] Apply overdue helper (if used) and verify overdue behavior
- Expected checks:
  - [ ] Dashboard quick-grid shows review backlog as overdue
  - [ ] Overdue badge appears without label clipping or row collapse
  - [ ] Project cards remain visible below the quick-grid with no jump in height
- Result: (Pass / Fail / Needs follow-up)
- Evidence:
- Notes:

## Scenario C — Isolation Wall

- Actor start: `Herman`
- Steps performed:
  - [ ] Initialize or switch sandbox to Herman
  - [ ] Start on dashboard
- Expected checks:
  - [ ] Herman only sees `Harbor Tower - Level 12 Fitout`
  - [ ] Tristan-only metrics from `Private Penthouse Defects` do not appear
  - [ ] Shared-project tasks remain visible; Tristan-only project summaries stay hidden
- Result: (Pass / Fail / Needs follow-up)
- Evidence:
- Notes:

## iPhone 17 Viewport Audit

- Target device: iPhone 17 (or closest available)
- Checks:
  - [ ] Dashboard header clears Dynamic Island with no clipped icons or text
  - [ ] 3-tile quick-grid fully visible above first project card on first load
  - [ ] `Action Required`, `In Progress`, `Awaiting Approval` labels do not clip/wrap/overlap overdue badges
  - [ ] Scrolling leaves comfortable spacing above Home Indicator and does not hide final actions
  - [ ] `TasksScreen` search field stays anchored with no layout jump when typing/clearing
  - [ ] Project cards remain scannable in portrait and do not crowd vertically
  - [ ] Developer Settings action buttons remain tappable without safe-area collisions
- Result: (Pass / Fail / Needs follow-up)
- Evidence:
- Notes:

## Closure Summary

- Overall Result: (Pass / Fail / Needs follow-up)
- Follow-ups required:
  - [ ]

