# Essential Test Matrix And Task Core Native Slice Design

> **Disposition (2026-08-27): CLOSED / ARCHIVED — do not execute.**
>
> Work represented here was completed on `master` under **WS-QA / M-QA-03 Closed (2026-08-07)**
> (L3 Maestro 5/5 rc=0; evidence in `documentation/ROADMAP.md` M-QA-03 Notes + AGENTS.md).
> Successor SoT on master: `docs/superpowers/plans/2026-08-01-ws-qa-03-automated-confidence-and-e2e-coverage.md`,
> `TESTING_STRATEGY.md`, `maestro/TESTID_GAPS_TODO.md`, `scripts/maestro/run-local.sh`.
> This file is retained as historical planning context from the `slice/m-qa-03-automation-loop` worktree.



## Summary

This design expands the current QA automation strategy from a working confidence ladder into a broader essential-function test matrix for the Insite App. The planning target is a full matrix of essential app behavior across task, project, auth, list accuracy, role visibility, and upload domains. The first implementation slice remains intentionally narrower: build a native-heavy `Task Core + Photo Upload` test slice that proves the most important user-visible workflows under real simulator interaction.

The design keeps the current layered strategy intact:

- Jest remains the fast and deterministic support layer for unit, integration, route, contract, and seeded-state checks.
- Maestro becomes the primary proof layer for the first essential workflow slice.
- The local development loop remains progressive rather than monolithic, so new native flows can graduate into the default loop only after they are deterministic and fast enough.

## Goals

- define one full essential-function test matrix for the app
- improve release confidence around the app's core task workflows
- make the development loop stronger on real user-visible behavior, not just mocked logic
- prioritize native simulator proof for the first slice
- keep the first implementation slice focused enough to land and maintain

## Non-Goals

- do not make the first slice a full all-domain matrix implementation
- do not replace the current Jest stack with Maestro
- do not require manual credentials for the default native task-core flows
- do not pull full project-creation coverage into slice 1
- do not attempt complete Android parity in this slice

## Decision Summary

### Planning Target

Plan the **full essential matrix** first.

### First Implementation Slice

Implement **Task Core + Photo Upload** first.

### Confidence Bias

Use a **native-heavy** approach for slice 1.

### Role Baseline

Use a three-role baseline for the first slice:

- manager
- worker
- reviewer

### List Accuracy Rule

Adopt **immediate cross-screen sync** as the acceptance baseline:

- after create, assign, update, upload, and complete actions
- the relevant list screens and detail screens must reflect the new state without manual refresh

### Project Creation Scope

Add **Project Creation And Project Visibility** to the full planned matrix, but keep it out of slice 1 implementation. Slice 1 will use seeded projects.

## Recommended Approach

### Approach A: Native-Heavy Front Door

This is the chosen approach.

The first slice should prove the app's most important workflows using real simulator taps and app-shell behavior. Jest should still cover deterministic setup and low-cost regressions, but the primary source of confidence for the new slice should come from Maestro flows that exercise the dev client, seeded role switching, and visible UI state changes.

This approach is preferred because it best matches the user goal of making the development loop more reliable for real product behavior rather than only improving test count.

### Rejected Approach: Layered Expansion

This approach would implement most new coverage in Jest first and promote flows to Maestro later. It is faster initially, but it delays native proof for exactly the type of regressions most likely to escape into release candidates.

### Rejected Approach: Full Matrix Buildout

This approach would start implementing several essential domains at once. It raises scope and maintenance risk too early and is likely to slow down adoption of the new loop.

## Full Essential Matrix

The full essential matrix should be managed as a domain grid, not just a flat test inventory. Each domain should define:

- participating roles
- primary screens and source-of-truth views
- required cross-screen updates
- default proof layer
- promotion rule into the local loop
- failure severity

### Domain List

The matrix should include these domains:

1. Task Creation
2. Task Assignment And Reassignment
3. Task List Accuracy And Visibility
4. Task Detail Accuracy
5. Task Update / Progress / Comments
6. Task Completion / Review / Closure
7. Photo Upload / Attachment Visibility
8. Auth / Session Continuity
9. Project Switching And Filter Correctness
10. Role-Based Permissions And Visibility
11. Project Creation And Project Visibility

## Matrix Domain Structure

Each domain entry should contain:

### 1. Roles

Examples:

- manager creates and assigns
- worker updates and uploads
- reviewer verifies completion state

### 2. Screens

Examples:

- dashboard
- tasks list
- task detail
- create task
- profile/project picker
- developer settings for seeded automation entry

### 3. Expected Cross-Screen Updates

Examples:

- a created task appears in the relevant list immediately
- assignment changes the visible owner and the receiving actor's list visibility
- progress and completion changes appear in both list and detail surfaces
- uploaded photos appear in the relevant detail/update surfaces

### 4. Proof Layer

Each domain should declare its default proof layer:

- Maestro native flow
- Jest journey
- Jest integration
- Supabase-backed simulation scenario

### 5. Promotion Rule

A domain or subflow can be promoted into the default local loop only when it is:

- deterministic across repeated runs
- seeded without manual credentials
- fast enough for regular use
- valuable at catching regressions not already well-covered in Jest

### 6. Failure Severity

Each domain should declare whether failure blocks:

- feature confidence
- release confidence
- scheduled audit only

## Slice 1: Task Core + Photo Upload

Slice 1 is the first implementation target. It is intentionally narrower than the full matrix.

### Scope In

- task creation
- assignment or reassignment handoff
- task list accuracy after task creation
- task detail accuracy after assignment
- progress update behavior
- photo upload in the task workflow
- task completion and downstream verification
- immediate cross-screen sync between list and detail surfaces

### Scope Out

- project creation flows
- full auth credential entry flows
- offline recovery and reconnect behavior
- Android-native parity
- broader non-task matrix domains beyond planning and documentation

## Slice 1 Flow Design

The first slice should be implemented as a small native flow set rather than one large script.

### Flow 1: Bootstrap + Manager Create / Assign

Purpose:

- open the dev client
- enter the seeded authenticated shell
- create a task
- assign it to the worker role
- assert that the manager-facing list and detail views reflect the new task correctly

### Flow 2: Worker Open / Update / Upload

Purpose:

- switch to the worker actor
- verify task visibility in worker-facing lists
- open task detail
- perform progress update actions
- upload at least one photo
- assert that detail and list surfaces reflect the updated state

### Flow 3: Reviewer Verify / Complete / Close

Purpose:

- switch to the reviewer actor
- verify downstream visibility
- inspect the updated task state
- complete, close, or confirm the downstream workflow state
- assert task status changes are visible on the appropriate screens

### Flow 4: Cross-Screen List Accuracy Assertions

Purpose:

- explicitly verify that no manual refresh is required
- assert the same task state is reflected across:
  - dashboard surfaces
  - tasks list surfaces
  - task detail surfaces

## Supporting Jest Additions

Jest should support slice 1 in ways that reduce native brittleness and debug time.

### Required Jest Responsibilities

- deterministic Sprint 7 seeded-state helpers for manager, worker, and reviewer
- route and selector contract tests for the new native flows
- integration coverage for cheap state transitions that are expensive to debug on the simulator
- local regression coverage for list/detail state mapping where Maestro only proves the visible end state

### Jest Should Not Replace

Jest should not become the main proof for the new task-core slice. It is a support layer for determinism, contracts, and faster diagnosis.

## Developer Loop Integration

The new task-core native coverage should graduate progressively.

### Promotion Stages

1. individual runnable native scripts
2. grouped `task-core-native` suite
3. promotion into the broader native critical suite
4. optional inclusion in `./scripts/dev-loop.sh --confidence-full`

### Promotion Criteria

Do not promote new flows into the default local confidence wrapper until they are:

- stable across repeated local simulator runs
- seeded without credential prompts
- fast enough to preserve loop usability
- proven to catch meaningful regressions

## Project Creation Domain

Project creation must exist in the **planned full matrix**, but it will not be implemented in slice 1.

### Planned Coverage

- project creation success
- immediate project picker visibility
- role-based project visibility
- task creation against a newly created project
- downstream filter and list correctness

### Slice 1 Handling

- use seeded projects only
- do not block task-core slice delivery on project-creation automation

## Acceptance Criteria

The design is considered successful when:

- the full essential matrix is documented as a domain grid with proof-layer expectations
- slice 1 is clearly scoped as `Task Core + Photo Upload`
- the first slice uses manager, worker, and reviewer seeded roles
- the first slice enforces immediate cross-screen sync as the main correctness rule
- project creation is included in planning but excluded from slice 1 implementation
- the promotion path into the local loop is explicit and conservative

## Risks

### 1. Native Flow Brittleness

Maestro flows may become brittle if selectors or role-switching entry points drift.

Mitigation:

- add selector contract coverage in Jest
- keep flows small
- use seeded deterministic entry points

### 2. Runtime Cost

Native-heavy coverage can slow the local loop if promoted too early.

Mitigation:

- keep direct runnable scripts separate first
- only promote proven flows

### 3. Seed Drift

The seeded sandbox may diverge from current product expectations.

Mitigation:

- keep slice-1 acceptance criteria tied to user-visible outcomes
- extend seeded-state helpers only through explicit domain rules

### 4. Over-Scoping

Adding project creation, auth, and all edge cases to slice 1 would delay useful delivery.

Mitigation:

- preserve the planning-versus-implementation boundary

## Validation Strategy

The design should be validated by:

- confirming the matrix domains map to actual app behavior
- confirming slice 1 remains focused enough for a single implementation plan
- confirming the current confidence ladder can absorb the new native suite progressively
- confirming the seeded role model can support manager, worker, and reviewer handoffs without manual login

## Open Follow-On Planning Work

The next planning phase should produce an implementation plan for:

- slice 1 native task-core flows
- supporting Jest contracts and seeded helpers
- new command surface for grouped task-core native execution
- documentation updates showing:
  - planned domains
  - implemented domains
  - promoted domains
