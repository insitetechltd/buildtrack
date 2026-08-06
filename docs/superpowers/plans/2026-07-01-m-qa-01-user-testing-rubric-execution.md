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

## Automation Model

Maestro runs 4 flows (scenarios A, B, C, D) located in `maestro/flows/qa01-*.yaml`, and captures screenshot evidence for each rubric check. Final sign-off is human review of the captured PNGs against the Sprint 7 rubric in `sprint7-user-testing-rubric.md`.

## Pre-Flight Automated Gates (Optional, Recommended)

- `npx jest src/test-utils/__tests__/sprint7RuntimeSandbox.test.ts src/test-utils/__tests__/sprint7Seeds.test.ts --runInBand`
  - Result:

## How to Run the Automation

1. Start Expo dev server: `npm run ios` with iPhone 17 simulator booted
2. Install maestro CLI: `brew install maestro`
3. Run all 4 scenarios:
   ```
   MAESTRO_OUTPUT=maestro/artifacts/qa01 maestro test maestro/flows/qa01-scenario-a-rejection-loop.yaml \
     maestro/flows/qa01-scenario-b-overdue-crunch.yaml \
     maestro/flows/qa01-scenario-c-isolation-wall.yaml \
     maestro/flows/qa01-scenario-d-iphone17-viewport.yaml
   ```
4. Inspect screenshots under `maestro/artifacts/qa01/` and fill this log's Pass/Fail/Evidence cells.

## Scenario A — Rejection Loop

- Automation flow path: `maestro/flows/qa01-scenario-a-rejection-loop.yaml`
- Captured artifact directory: `maestro/artifacts/qa01/`
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
- Evidence: qa01-a-01-dashboard-herman-post-init, qa01-a-02-dashboard-tristan-actions-required, qa01-a-03-tristan-tasks-action-required, qa01-a-04-herman-no-active-task
- Notes:

## Scenario B — Overdue Crunch

- Automation flow path: `maestro/flows/qa01-scenario-b-overdue-crunch.yaml`
- Captured artifact directory: `maestro/artifacts/qa01/`
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
- Evidence: qa01-b-01-dashboard-overdue-queue, qa01-b-02-tasks-firestop-overdue-badge, qa01-b-03-project-cards-below-grid
- Notes:

## Scenario C — Isolation Wall

- Automation flow path: `maestro/flows/qa01-scenario-c-isolation-wall.yaml`
- Captured artifact directory: `maestro/artifacts/qa01/`
- Actor start: `Herman`
- Steps performed:
  - [ ] Initialize or switch sandbox to Herman
  - [ ] Start on dashboard
- Expected checks:
  - [ ] Herman only sees `Harbor Tower - Level 12 Fitout`
  - [ ] Tristan-only metrics from `Private Penthouse Defects` do not appear
  - [ ] Shared-project tasks remain visible; Tristan-only project summaries stay hidden
- Result: (Pass / Fail / Needs follow-up)
- Evidence: qa01-c-01-herman-dashboard-only-shared-project, qa01-c-02-herman-tasks-no-penthouse, qa01-c-03-herman-devsettings-statistics-1-project
- Notes:

## iPhone 17 Viewport Audit

- Automation flow path: `maestro/flows/qa01-scenario-d-iphone17-viewport.yaml`
- Captured artifact directory: `maestro/artifacts/qa01/`
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
- Evidence: qa01-d-01, qa01-d-02, qa01-d-03, qa01-d-04, qa01-d-05, qa01-d-06, qa01-d-07, qa01-d-08
- Notes:

## Closure Summary

- Automation-assisted model: Maestro = operator, Human = approver
- Overall Result: (Pass / Fail / Needs follow-up)
- Follow-ups required:
  - [ ]

