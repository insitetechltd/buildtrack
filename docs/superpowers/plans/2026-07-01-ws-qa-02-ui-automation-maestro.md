# WS-QA / M-QA-02 — UI Automation Foundation (Maestro)

## Purpose

Introduce a repeatable native UI automation track for the iOS simulator workflow using Maestro, starting with local execution before any CI rollout.

## Scope

### In Scope

- local Maestro setup for the existing iOS dev-client simulator flow
- starter smoke and sandbox-entry flows
- reusable flow structure for future QA coverage
- documentation and scripts for local execution

### Out of Scope

- CI integration in the first slice
- Android automation
- full workflow coverage in the foundation milestone

## Proposed Milestones

### Foundation

- install and document Maestro locally
- add a `maestro/` folder structure
- add starter smoke and Sprint 7 sandbox entry flows
- validate local execution against the installed Taskr simulator app

### Coverage Expansion

Follow-on slices can expand flow coverage to:

- two-user task handoff
- task accept and update
- photo update and reviewer verification
- viewport smoke checks

## Dependencies

- `WS-UI / M-UI-07` closed so the current UI structure is stable enough to automate
- current iOS dev-client simulator workflow remains usable

## Validation

- local Maestro install/doctor checks
- at least one successful smoke flow run against the simulator app
- documentation aligned with the repo’s current build/run commands

## Notes

- Local-first is intentional. CI integration should be planned only after the local flows and selectors are proven stable.
