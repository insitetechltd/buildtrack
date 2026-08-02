# Testing Strategy

This repository uses a hybrid confidence ladder designed to keep the developer loop fast while still protecting the highest-risk business workflows with targeted Jest, app-shell journey, and native simulator checks.

## Goals

- keep local verification lightweight during feature work
- gate pull requests with targeted regression coverage
- run broader scheduled checks to detect coverage drift, stale mocks, and hidden regressions
- provide a repeatable path from local correctness checks to release-confidence smoke validation
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
- `npm run test:regression`
- `npm run validate:local`

### Script Contents

`test:regression` runs:

- `npm run test:tasks`
- `npm run test:uploads`
- `npm run test:components`
- `npm run test:integration`

`validate:local` runs:

- `npx tsc --noEmit`
- `npm run test:regression`

### Scope

- auth store behavior
- Supabase-backed task store unit and workflow coverage
- project store behavior
- upload and compression services
- component rendering and interaction checks

## Layer 2: App-Shell Journeys

Use this layer when a change touches navigation, authenticated shell behavior, or cross-screen task journeys and you want more confidence than mocked regression coverage alone.

### Purpose

- exercise lightweight mounted-app and app-shell-adjacent paths inside Jest
- catch selector, store-seeding, and route-contract regressions that unit tests can miss
- provide a higher-confidence local gate before native simulator smoke

### Primary Scripts

- `npm run test:e2e:journeys`
- `npm run test:confidence`
- `npm run validate:local:confidence`

### Script Contents

`test:e2e:journeys` runs the app-shell journey suite in `src/__tests__/journeys`.

`test:confidence` runs:

- `npm run test:regression`
- `npm run test:e2e:journeys`

`validate:local:confidence` runs:

- `npx tsc --noEmit`
- `npm run test:regression`
- `npm run test:e2e:journeys`

### Scope

- authenticated shell boot and root-tab availability
- project switching and downstream refresh behavior
- task-detail verification URL and route-contract safety
- confidence checks that still run fully inside Jest without simulator dependencies

## Layer 3: Native Simulator Smoke

Use this layer when the change is user-visible and you need proof that the installed iOS dev client still behaves correctly under real taps on the simulator.

### Purpose

- catch native-shell and selector-level drift that Jest cannot see
- validate the local dev-client + Metro + automation-bootstrap path end to end
- provide a release-confidence smoke check for the highest-risk UI work

### Primary Scripts

- `npm run test:e2e:maestro:smoke`
- `npm run test:e2e:maestro:critical`
- `./scripts/dev-loop.sh --confidence-full`

### Script Contents

`test:e2e:maestro:smoke` runs:

- `maestro test maestro/flows/launch-smoke.yaml`

`test:e2e:maestro:critical` runs:

- `maestro test maestro/flows`

`./scripts/dev-loop.sh --confidence-full` runs the local validation loop with:

- `npx tsc --noEmit`
- `npm run test:regression`
- `npm run test:e2e:journeys`
- `npm run test:e2e:maestro:smoke`

### Scope

- launch smoke for the installed iOS dev client
- dev-only Sprint 7 sandbox bootstrap from a cold simulator start
- workspace menu to `Developer Settings`
- Sprint 7 sandbox entry flow coverage through shipped Maestro files

## Scheduled Audit Layer

Use these broader Jest sweeps to watch for coverage drift and stale mocks outside the main local confidence path.

### Primary Scripts

- `npm run test:all`
- `npm run test:coverage`

### Coverage Floor

The current Jest thresholds are defined in `jest.config.js`:

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

### Journey Coverage

- authenticated shell journey in `src/__tests__/journeys/authenticated-shell.journey.test.tsx`
- project switching journey in `src/__tests__/journeys/project-switching.journey.test.tsx`
- task-detail verification journey in `src/__tests__/journeys/task-detail-verification.journey.test.tsx`

This layer is intentionally narrower than simulator E2E coverage. It is best treated as an app-shell-adjacent confidence tier, not full native end-to-end proof.

### Native Smoke Coverage

- Maestro launch smoke in `maestro/flows/launch-smoke.yaml`
- Maestro developer settings entry in `maestro/flows/sprint7-open-developer-settings.yaml`
- Maestro Sprint 7 sandbox initializer in `maestro/flows/sprint7-initialize-sandbox.yaml`

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
- navigation or app-shell flow: `npm run test:e2e:journeys`

### Before opening a PR

Run:

- `npm run test:regression`

### Before a high-risk UI handoff

Run:

- `npm run validate:local:confidence`

If the change is simulator-sensitive, also run:

- `./scripts/dev-loop.sh --confidence-full`

### Before a release or major merge

Run:

- `npm run test:all`
- `npm run test:coverage`

## Automation Architecture

Map the local confidence ladder into CI and QA so regression protection, journey checks, and simulator smoke complement each other instead of competing.

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

### Local QA Confidence

Recommended QA behavior:

- run `npm run validate:local:confidence` for navigation-heavy or high-risk user-visible changes
- add `./scripts/dev-loop.sh --confidence-full` when simulator-level evidence is required

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

If you expand the current GitHub Actions coverage later, use this shape:

- `fast-unit.yml`
  - trigger: push
  - purpose: changed-area checks
- `regression.yml`
  - trigger: pull_request and push to main
  - command: `npm run test:regression`
- `journeys.yml`
  - trigger: manual or risk-based pre-release runs
  - command: `npm run validate:local:confidence`
- `maestro-smoke.yml`
  - trigger: manual or device/simulator-capable environments
  - command: `./scripts/dev-loop.sh --confidence-full`
- `full-confidence.yml`
  - trigger: nightly and weekly cron
  - commands:
    - `npm run test:all`
    - `npm run test:coverage`

## Guardrails

- do not rely on archived legacy task-store tests for release confidence
- keep regression coverage focused on the production Supabase-backed store
- prefer targeted verification over freezing the environment with unnecessary full test runs
- treat `test:confidence` as the highest-confidence Jest-only checkpoint
- treat Maestro smoke as an opt-in native proof step that depends on local simulator setup
- update the strategy when critical flows move to new production modules
