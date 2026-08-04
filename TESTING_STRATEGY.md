# Testing Strategy

This repository uses a 3-layer testing strategy designed to keep the developer loop fast while still protecting the highest-risk business workflows.

## Canonical Testing Docs

- `TESTING_STRATEGY.md` is the canonical repository-wide testing strategy and confidence-ladder reference.
- `maestro/README.md` is the canonical Maestro-specific runtime, operator, and troubleshooting runbook.

## Goals

- keep local verification lightweight during feature work
- gate pull requests with targeted regression coverage
- run broader scheduled checks to detect coverage drift, stale mocks, and hidden regressions
- align task-flow testing with the production store in `src/state/taskStore.supabase.ts`

## Layer 1: Fast Unit Layer

Use this layer during the normal development loop and before commits.

### Purpose

- validate core store logic quickly
- catch component and service regressions early
- keep runtime under roughly 5 minutes when run selectively

### Primary Scripts

- `npm run test`
- `npm run test:auth`
- `npm run test:tasks`
- `npm run test:projects`
- `npm run test:uploads`
- `npm run test:components`

### Scope

- auth store behavior
- Supabase-backed task store unit and workflow coverage
- project store behavior
- upload and compression services
- component rendering and interaction checks

## Layer 2: Gated Regression

Use this layer for pull requests, merges, and nightly business-flow protection.

### Purpose

- protect the core user-facing workflows
- catch regressions that cross module boundaries
- validate the most important task, upload, and UI flows together

### Primary Script

- `npm run test:regression`

### Script Contents

`test:regression` runs:

- `npm run test:tasks`
- `npm run test:uploads`
- `npm run test:components`
- `npm run test:integration`

### Scope

- task creation and assignment flows
- accept and decline flows
- progress update flows
- subtask flows
- upload entry points
- component behavior tied to core workflows
- integration-style store workflows using mocked Supabase responses

## Layer 3: Periodic Full Confidence

Use this layer on nightly and weekly schedules.

### Purpose

- detect mock drift and stale assumptions
- enforce the Jest coverage floor
- expose failures outside the narrow PR path

### Primary Scripts

- `npm run test:all`
- `npm run test:coverage`

### Coverage Floor

The current Jest thresholds are defined in [jest.config.js](file:///Volumes/KooDrive/Insite%20App/jest.config.js):

- lines: `70%`
- statements: `70%`
- branches: `50%`
- functions: `50%`

## Active Test Surface

### Fast Unit / Store Coverage

- auth store tests in `src/state/__tests__/authStore.test.ts`
- project store tests in `src/state/__tests__/projectStore.workflow.test.ts`
- Supabase task store tests in `src/state/__tests__/taskStore.supabase.unit.test.ts`
- Supabase task workflow tests in `src/state/__tests__/taskStore.supabase.workflow.test.ts`
- upload tests in `src/api/__tests__/fileUploadService.test.ts`
- component tests in `src/components/__tests__/`

### Integration Coverage

- Supabase workflow integration tests in `src/__tests__/integration/taskWorkflows.supabase.test.ts`

### Archived Coverage

Legacy task-store workflow tests were moved out of Jest discovery into `archived-tests/` because they targeted `src/state/taskStore`, which is no longer the production task-store path.

## Contextual Commit Policies

Run the smallest useful set of tests based on what changed.

### If you touch `src/state/`

Run:

- `npm run test:tasks`
- `npm run test:projects` when project store logic is affected
- `npm run test:auth` when auth state is affected

### If you touch task workflows

Run:

- `npm run test:tasks`
- `npm run test:integration`

This applies to:

- `src/state/taskStore.supabase.ts`
- task-related screens
- task assignment or review flows
- progress update flows
- subtask flows

### If you touch `src/api/`

Run:

- `npm run test:uploads`
- `npm run test:integration` when the API change affects workflow behavior

### If you touch `src/components/` or task-related screens

Run:

- `npm run test:components`
- `npm run test:integration` when user-visible task flows are affected

### If you touch build or release configuration

Run:

- the smallest relevant targeted test layer
- then perform config inspection and any release-readiness checks needed for the change

Examples:

- `package.json`
- `app.json`
- `eas.json`
- build scripts under the repository root or `scripts/`

## Recommended Local Workflow

### During feature development

Run the narrowest relevant script for the area being changed.

Examples:

- task logic: `npm run test:tasks`
- upload flow: `npm run test:uploads`
- component changes: `npm run test:components`

### Before opening a PR

Run:

- `npm run test:regression`

### Before a release or major merge

Run:

- `npm run test:all`
- `npm run test:coverage`

## Automation Architecture

Map the 3 layers into CI so local developer discipline and scheduled validation reinforce each other.

### Feature Branch Pushes

Recommended CI behavior:

- run the smallest relevant fast unit layer for changed areas
- at minimum, run `npm run test:tasks` when `src/state/` task files are touched
- run `npm run test:uploads` when upload or file-service code is touched
- run `npm run test:components` when components or screens are touched

### Pull Requests

Recommended CI behavior:

- run `npm run test:regression`

This should be the main gate before merge because it balances speed with workflow protection.

### Merge To Main

Recommended CI behavior:

- run `npm run test:regression`
- optionally also run `npm run test:coverage` if your CI budget allows it on every merge

### Nightly Schedule

Recommended CI behavior:

- run `npm run test:regression`
- run `npm run test:all`

Example cadence:

- every night via cron in GitHub Actions or your equivalent CI scheduler

### Weekly Schedule

Recommended CI behavior:

- run `npm run test:coverage`
- run `npm run test:all`

This is the best place to watch for global coverage drift and stale mocks.

## Suggested CI Mapping

If you implement this in GitHub Actions or an equivalent system, use this shape:

- `fast-unit.yml`
  - trigger: push
  - purpose: changed-area checks
- `regression.yml`
  - trigger: pull_request and push to main
  - command: `npm run test:regression`
- `full-confidence.yml`
  - trigger: nightly and weekly cron
  - commands:
    - `npm run test:all`
    - `npm run test:coverage`

## Guardrails

- do not rely on archived legacy task-store tests for release confidence
- keep regression coverage focused on the production Supabase-backed store
- prefer targeted verification over freezing the environment with unnecessary full test runs
- update the strategy when critical flows move to new production modules
