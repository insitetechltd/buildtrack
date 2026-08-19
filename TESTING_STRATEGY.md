# Testing Strategy

This repository uses a 4-layer testing strategy designed to keep the developer loop fast while still protecting the highest-risk business workflows.

## Canonical Testing Docs

- `TESTING_STRATEGY.md` is the canonical repository-wide testing strategy and confidence-ladder reference.
- `documentation/MAINTABS_UX_CHECKLIST.md` is the canonical MainTabs **function-discovery** checklist (admin vs field operator, human + Maestro IDs).
- `maestro/README.md` is the canonical Maestro-specific runtime, operator, and troubleshooting runbook.

## Dev-Cycle Rule

At the start of every non-trivial development cycle:

- read `TESTING_STRATEGY.md`
- read `maestro/README.md` when the task can affect user-visible runtime behavior
- choose the smallest relevant Jest layer before implementation starts
- decide up front whether Maestro proof is required for done status

Testing is not a final-stage activity. The expected mindset is:

- Jest is the default development loop for fast, repeated confidence
- Maestro is the runtime-proof layer for real interaction behavior
- every plan should identify both the primary loop and the final proof requirement

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

## Layer 3: Native Simulator Smoke

Use this layer when a change is user-visible and you need proof that the installed iOS dev client still behaves correctly under real taps in the simulator.

### Purpose

- verify the root Maestro foundation is runnable from the repository
- prove Maestro can attach to the installed iOS dev client
- cover deterministic smoke and Sprint 7 bootstrap entry without overstating workflow confidence

### Primary Commands

- `npm run test:e2e:maestro:smoke`
- `npm run test:e2e:maestro:rc-worker-be` — **RC required** field operator sections B–E (see `documentation/MAINTABS_UX_CHECKLIST.md`)
- `npm run test:e2e:maestro:task-core`
- `npm run test:e2e:maestro:qa01`
- `bash ./scripts/maestro/run-local.sh test maestro/flows/sprint7-open-developer-settings.yaml`
- `bash ./scripts/maestro/run-local.sh test maestro/flows/sprint7-initialize-sandbox.yaml`

### Scope

- launch smoke for the installed iOS dev client
- **RC worker B–E** (Activity, Camera/create+photo, Tasks, Task Detail update+photo) via `test:e2e:maestro:rc-worker-be`
- `Profile -> Developer Settings` entry
- Sprint 7 sandbox bootstrap
- live Supabase-backed Task Core create, assign, progress, completion, and photo-upload flows
- Sprint 7 based M-QA-01 rubric automation (Rejection Loop, Overdue Crunch, Isolation Wall, iPhone 17 Viewport Audit) with screenshot evidence capture for final human sign-off
- local Maestro environment validation
- Company **admin** org journeys (Dashboard, projects, seats, billing) are **human** on the MainTabs checklist — they are not day-to-day task operations and are not in the RC B–E Maestro min gate

### Boundary

- `WS-QA / M-QA-02` uses Sprint 7 as the canonical bootstrap authority for local Maestro foundation work
- Sprint 7 is the local bootstrap authority for foundation smoke
- live Supabase-backed Maestro flows are the authority for critical Task Core workflow confidence
- Sprint 7 bootstrap smoke alone does not prove live Supabase-backed workflow correctness

## Layer 4: Periodic Full Confidence

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

## Validation Matrix

Use this section when you need to answer a practical question:

- what does this command actually test?
- what kind of confidence does a passing result give me?
- what does a green result not prove yet?

### Type And Fast Logic Gates

- `npx tsc --noEmit`
  - proves: TypeScript contracts are internally consistent across navigation params, screen props, adapter outputs, imports, and helper types
  - does not prove: runtime rendering, user interactions, simulator behavior, or live backend workflows

- `npm run test:tasks`
  - proves: Supabase-backed task-store logic and workflow rules behave correctly in Jest
  - does not prove: real screen rendering, simulator taps, or live Supabase session/runtime behavior

- `npm run test:uploads`
  - proves: upload and file-service behavior works at the service/API layer
  - does not prove: native picker integration, permission prompts, or real upload UX in the app

- `npm run test:components`
  - proves: isolated components render and react to local interactions correctly
  - does not prove: whole-screen workflows, navigation transitions, or multi-module runtime behavior

### Gated Regression And Journey Gates

- `npm run test:integration`
  - proves: screens, adapters, wrappers, and workflow contracts work together in Jest across module boundaries
  - does not prove: real simulator timing, native navigation behavior, or live backend/runtime truth

- `npm run test:regression`
  - proves: the main Jest safety net is green across task logic, uploads, components, and integration coverage
  - tests:
    - task-store lifecycle and workflow logic
    - upload entry points and file-service behavior
    - component rendering and interaction contracts
    - integration-style workflow and screen/store wiring
  - does not prove: iOS dev-client launch, Maestro setup, or live Task Core runtime behavior

- `npm run test:e2e:journeys`
  - proves: higher-level app-shell and navigation contracts remain intact in Jest
  - tests:
    - authenticated shell renders the root tabs for a seeded signed-in user
    - project picker can switch to a different project through stable row selectors
    - task-detail verification URL generation stays deterministic
  - does not prove: real deep-link execution, real simulator navigation, or live backend state

### Local Validation Wrapper

- `npm run validate:local`
  - proves: the local validation wrapper can resolve the repo, audit the workspace, pass typecheck, and pass regression
  - tests:
    - repository-root resolution
    - git worktree and branch safety checks
    - `npx tsc --noEmit`
    - `npm run test:regression`
  - does not prove: journeys unless enabled, Maestro unless enabled, or live runtime behavior

- `npm run validate:local:confidence`
  - proves: the repo-local confidence ladder is green through typecheck, regression, and journeys
  - tests:
    - workspace safety audit
    - `npx tsc --noEmit`
    - `npm run test:regression`
    - `npm run test:e2e:journeys`
  - does not prove: Maestro smoke unless separately run, or live Task Core runtime unless separately run

- `src/__tests__/integration/validateLocalScript.test.ts`
  - proves: `validate-local.sh` itself runs the right stages, stops on the right failures, and emits the correct telemetry
  - tests:
    - dirty-tree warning behavior
    - early exit on TypeScript failure
    - optional simulation, journey, and Maestro smoke gate wiring
  - does not prove: app workflows by itself

### Maestro Runtime Gates

- `npm run test:e2e:maestro:rc-worker-be`
  - proves: RC field-operator MainTabs B–E on a **worker/manager tab shell** (`isAdmin` false): Activity land, create-task one photo (P01), Tasks + update-progress one photo (U01)
  - does not prove: company-admin Dashboard, invite, Company plan / Stripe, accept/approve, drafts, or full P/U suites
  - human still walks `documentation/MAINTABS_UX_CHECKLIST.md`; PNG evidence before treating rc=0 as pass

- `npm run test:e2e:maestro:smoke`
  - proves: the root Maestro foundation is runnable from this repository against the installed iOS dev client
  - tests:
    - Expo dev-client attach from the local Metro URL
    - Sprint 7 automation deep-link bootstrap entry
    - authenticated dashboard shell visibility
    - workspace/profile trigger visibility
  - does not prove: create, assign, progress, completion, or upload workflow correctness

- `bash ./scripts/maestro/run-local.sh test maestro/flows/sprint7-open-developer-settings.yaml`
  - proves: the app can navigate from profile to Developer Settings in the simulator
  - does not prove: task workflows or live Supabase-backed behavior

- `bash ./scripts/maestro/run-local.sh test maestro/flows/sprint7-initialize-sandbox.yaml`
  - proves: Sprint 7 bootstrap can be triggered successfully from the app
  - does not prove: live production-like workflow correctness

- `npm run test:e2e:maestro:task-core`
  - proves: live Supabase-backed Task Core runtime behavior for the shipped flow bundle, if all slices pass
  - tests:
    - manager login and create-task flow
    - manager assignment flow
    - worker progress update flow
    - worker completion-to-review flow
    - worker photo-upload flow
  - does not prove: every mobile flow in the app or release readiness beyond Task Core

- `npm run test:e2e:maestro:qa01`
  - proves: Maestro can run the WS-QA / M-QA-01 Sprint 7 rubric end-to-end inside the iOS simulator and emit screenshot evidence per rubric check
  - tests:
    - Scenario A (Rejection Loop): Herman progresses task, Tristan declines, screenshot ACTION_REQUIRED state on Tristan dashboard + tasks list + return to Herman view confirming clean isolation
    - Scenario B (Overdue Crunch): applies Preset B, screenshots dashboard overdue queue, tasks overdue badge, and project cards below the grid
    - Scenario C (Isolation Wall): switches to Herman, screenshots dashboard, tasks, and dev-settings statistics confirming Private Penthouse is invisible to Herman
    - Scenario D (iPhone 17 Viewport Audit): screenshots dashboard header, 3-tile grid, bottom safearea; tasks search (idle + active + bottom safearea); dev settings top/bottom tappable regions
  - model: Maestro = operator; Human = approver (pass/fail sign-off is on captured PNG evidence, not the green Maestro run)
  - does not prove: live Supabase-backed Task Core correctness — this is Sprint 7 in-memory runtime sandbox data only

## Confidence Ladder Cheat Sheet

Use the highest layer that directly proves the behavior you changed, and no higher unless the feature needs it.

- logic-only change
  - run: `npx tsc --noEmit` plus the narrowest Layer 1 Jest script
  - example: task-store helpers, upload service helpers, adapter mapping logic

- isolated UI or component change
  - run: `npx tsc --noEmit` plus `npm run test:components`
  - add `npm run test:integration` if the change crosses component/screen boundaries

- screen contract, route param, or navigation-shell change
  - run: `npm run test:integration` and `npm run test:e2e:journeys`
  - add Maestro smoke if the change is user-visible in the real mobile runtime

- task workflow change
  - run: `npm run test:tasks` and `npm run test:integration`
  - add `npm run test:e2e:maestro:task-core` when the done-state requires live workflow proof

- user-visible runtime change without live business-flow impact
  - run: `npm run test:e2e:maestro:smoke`
  - example: shell launch, runtime attach, bootstrap entry, basic simulator path health

- task create, assign, progress, completion, or upload change
  - run: `npm run test:regression`, `npm run test:e2e:journeys`, and `npm run test:e2e:maestro:task-core`
  - this is the strongest proof for real Task Core behavior

## Reading A Green Result

- green `tsc` means: the code fits together
- green Jest regression means: logic and contract layers still behave
- green journeys mean: app-shell and navigation contracts still make sense
- green Maestro smoke means: the installed dev client still launches and attaches in the simulator
- green Maestro Task Core means: the live Task Core user workflow still works end-to-end for the shipped flow set

A lower green layer never overrides a higher red layer for the same workflow.

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

## Automation Architecture

Map the CI-relevant layers into CI so local developer discipline and scheduled validation reinforce each other.

The native simulator smoke layer remains a local operator proof step unless and until the repository explicitly promotes Maestro smoke into CI.

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

## Recommended Local Workflow

Use this table to pick the smallest effective check that matches your change size and confidence bar.

| Tier | Speed (approx) | Runs | When |
|---|---|---|---|
| Fast Regression | < 5 min | `npm run test:regression` | every feature commit, every focused bug-fix commit, before opening a draft PR |
| Slow Confidence | 5 – 30 min | `npm run validate:local:confidence && npm run test:e2e:maestro:journeys` | before opening a non-draft PR, and at every `WS-QA / M-QA-03` milestone gate |
| RC worker B–E | ~5 – 20 min | `npm run test:e2e:maestro:rc-worker-be` | **before commercial release / TestFlight ship binary**; plus human MainTabs checklist B–E (and admin G–J on device) |

### Fast Regression

`test:regression` is the default pre-commit check. It combines the production Supabase-backed task-store unit + workflow tests, the upload-service tests, the mounted component tests, and the integration layer. If your change touches a narrow area and you do not need navigation-level confidence, stop here.

### Slow Confidence

Run the full ladder when:

- your change touches navigation, header/profile popover, project switching, task creation, task detail, or update-progress flows
- you are preparing a PR for review or a release candidate tag
- the `WS-QA / M-QA-03` confidence-expansion milestone requires a pass

`validate:local:confidence` runs the local validation wrapper with `VALIDATE_LOCAL_RUN_JOURNEYS=1` (typecheck, lint-like gates, and the Jest app-shell journey suite). After that passes, `test:e2e:maestro:journeys` drives the two longest live Maestro journeys against the booted simulator to prove the Supabase-backed integration surface is intact.

If the simulator or Metro is not ready, `npm run test:confidence` is the pure-Jest fallback (no Maestro required) and covers the regression suite plus the app-shell journeys.

