# WS-QA / M-QA-03 Automated Confidence And Low-Touch Dev Loop Design

## Goal

Evolve the repository from a mostly mocked, manually coordinated validation flow into a lower-touch development cycle that can drive implementation toward a real done state with less user intervention and materially stronger confidence in end-to-end UX behavior.

## Context

The current repository already has a useful local loop:

- `scripts/dev-loop.sh`
- `scripts/validation/validate-local.sh`
- Jest unit, integration, simulation, and parity suites
- an approved but not yet expanded `WS-QA / M-QA-02` Maestro foundation direction

That baseline is good, but it still leaves two meaningful gaps:

1. the core local loop does not automatically escalate from fast validation into richer confidence checks unless a human decides when to do so
2. the existing UI simulation coverage is still mostly harness-driven and does not yet prove full app-shell journeys or simulator-driven user behavior

The result is that feature delivery still depends too much on human orchestration to decide:

- which confidence tier to run
- when a change needs screen-flow verification
- how to move from implementation to “ready for review”

## Scope

### In Scope

- improve the development cycle loop so the default path requires less user steering
- add a clear confidence ladder from fast checks to app-shell journey tests to simulator-driven E2E flows
- introduce app-shell journey tests that exercise real navigation and composed screens
- expand iOS-first Maestro coverage for critical user journeys
- align package scripts, docs, and validation handoff around a single low-touch workflow
- add selector hardening only where needed for durable automation

### Out Of Scope

- promising impossible certainty under every possible runtime condition
- replacing all existing Jest coverage with simulator-only tests
- broad Android automation in the same slice
- major app architecture rewrites unrelated to testability
- live-production destructive test automation

## Design Principles

### 1. Confidence should be layered, not monolithic

One giant E2E suite is too slow and too brittle to be the only safety net. The better model is:

- fast deterministic checks for active development
- richer app-shell journey checks before completion
- slower simulator-driven UX checks for release-facing confidence

### 2. The default loop should choose the next safe step automatically

A strong senior-engineering loop should not make the user decide every validation tier manually. The default tooling should:

- run the smallest mandatory checks automatically
- escalate to broader confidence tiers when the task touches user-visible flows
- surface exactly why a run stopped and what the next corrective action is

### 3. Reuse existing repo patterns first

This work should extend the existing shell scripts, package scripts, Jest setup, navigation verification hooks, and `testID` patterns already present in the repo instead of introducing a disconnected second automation culture.

### 4. Optimize for reliable progress, not theoretical completeness

The target is materially higher confidence with lower manual effort. It is not a claim that software can be proven correct under literally any circumstance.

## Approaches Considered

### Option A: Expand Jest Only

Add more app-shell and navigation-driven Jest tests, keep the development loop centered on Node-based automation, and defer real simulator E2E work.

#### Advantages

- fastest implementation path
- stable CI ergonomics
- reuses existing tooling heavily

#### Weaknesses

- still cannot fully prove runtime simulator UX behavior
- does not close the “human-like interaction” confidence gap

### Option B: Maestro-Heavy Automation

Push most critical confidence into simulator-driven Maestro coverage and treat Jest as secondary.

#### Advantages

- strongest approximation of real human interaction
- best proof for navigation and visible UX behavior

#### Weaknesses

- slower local loop
- higher flake risk
- weaker coverage for edge cases and state permutations

### Option C: Hybrid Confidence Ladder

Use deterministic Jest journey tests for broad flow coverage and simulator-driven Maestro for the highest-value visible paths, then wire both into a low-touch dev loop that escalates intelligently.

#### Advantages

- best balance of speed and realism
- fits the current repo architecture
- reduces user steering without forcing every edit through slow E2E runs

#### Weaknesses

- requires careful tier definitions
- needs selector and runtime discipline to stay maintainable

## Recommendation

Use **Option C: Hybrid Confidence Ladder**.

This is the only option that simultaneously improves user-flow realism, preserves fast iteration, and supports a lower-touch development cycle. It also matches the current repository direction: Jest already protects logic and integration paths, while the approved Maestro foundation is the natural place to add real simulator UX proof.

## Proposed Architecture

## 1. Low-Touch Development Loop

Upgrade the existing local validation flow from a single static bundle into a staged confidence loop with explicit tiers.

### Proposed default tiers

- `Tier 0: workspace safety`
  - repo root resolution
  - branch/worktree audit
- `Tier 1: fast correctness`
  - `npx tsc --noEmit`
  - existing targeted regression bundle
- `Tier 2: app-shell journeys`
  - navigation-driven Jest journeys for user-visible flows
- `Tier 3: simulator UX confidence`
  - iOS-first Maestro smoke and critical flows

### Loop behavior

The loop should support:

- a default command for the common local completion path
- a fast mode for tight iteration
- an auto mode that chooses the next appropriate confidence tier from task context or explicit flags
- machine-readable failure events so the next repair action is obvious

### Key design decision

Do not replace `validate-local.sh`. Extend it or compose around it so the existing validation contract remains recognizable.

## 2. App-Shell Journey Test Layer

Add a new Jest-driven layer that mounts the real navigation shell and composed screens instead of isolated harness components.

### Purpose

- test real route transitions
- validate state handoff between screens
- confirm screen-level contracts under realistic navigation conditions

### Candidate flows

- authentication entry to first authenticated shell
- project switching and downstream refresh
- create-task entry and form persistence path
- deterministic task-detail open via verification route
- one action flow such as progress update, comment, or reassignment entry

### Non-goal

These are not screenshot-comparison tests. They are behavioral journey tests inside the real app shell.

## 3. Simulator-Driven Maestro Layer

Expand the existing `M-QA-02` foundation into critical iOS-first runtime flows.

### Initial flow set

- launch smoke
- authentication smoke or authenticated entry path
- project switching
- task creation entry or draft-save path
- task-detail verification route open
- one high-value action path

### Stability model

- prefer existing `testID` and stable visible labels first
- add targeted selector hardening only for unstable or ambiguous interactions
- reuse the existing verification-route direction for deterministic screen targeting

## 4. Script And Command Model

Expose a clear command surface so the user does not need to remember the correct sequence manually.

### Proposed script families

- `test:e2e:journeys`
- `test:e2e:maestro:smoke`
- `test:e2e:maestro:critical`
- `test:confidence`
- `validate:local` refined to remain the stable local entrypoint
- optional `validate:local:auto` or equivalent if the existing script contract should remain untouched

### Expected behavior

- fast commands stay fast
- confidence commands are explicit and composable
- one canonical command exists for “take this change to strong local confidence”

## 5. Documentation And Handoff

The final system needs one canonical explanation of:

- what each confidence tier does
- when each tier runs
- what prerequisites exist for simulator-driven testing
- how to interpret failures
- how the loop minimizes user input without hiding important risk boundaries

## Error Handling

The loop should fail with actionable categories, not generic red output.

Examples:

- type failure
- regression failure
- journey failure
- Maestro environment/setup failure
- simulator attach failure
- selector drift failure

Where possible, output should point directly to the next action such as:

- `fix_types`
- `fix_tests`
- `fix_journeys`
- `repair_maestro_setup`

## Validation Strategy

Validation for this milestone should prove both the automation assets and the loop contract.

### Minimum validation

- targeted execution of any new Jest journey suites
- targeted execution of at least one Maestro smoke flow
- command verification for any new package scripts
- markdown and reference review for updated docs

### Completion signal

The milestone is ready for implementation review when:

- the low-touch loop can run the intended tiers predictably
- at least one real app-shell journey is automated
- at least one simulator-driven flow is automated
- the command surface and docs are coherent

## Acceptance Criteria

- the repository has a documented low-touch local development loop for confidence validation
- the suite includes app-shell journey tests beyond isolated harness simulations
- the suite includes iOS-first Maestro runtime coverage for critical UX paths
- the default automation path reduces user decision overhead compared with the current flow
- existing fast validation remains available and is not replaced by an always-slow E2E path
- roadmap and supporting QA docs remain aligned with the implemented automation model

## Risks And Guardrails

### Risk: loop becomes too slow for daily use

Guardrail:

- keep explicit fast and confidence tiers
- do not force full simulator flows on every local iteration

### Risk: simulator automation becomes flaky

Guardrail:

- start with deterministic smoke and critical flows only
- harden selectors narrowly instead of sweeping UI-only rewrites

### Risk: “fully automatic” is interpreted as “no human review needed”

Guardrail:

- define automation as reduced-input delivery assistance, not removal of engineering judgment
- keep failure categories and stop points explicit

### Risk: docs and scripts drift apart

Guardrail:

- keep one canonical milestone plan and one canonical testing strategy update
- validate scripts against the actual package and shell entrypoints

## Recommended First Implementation Slice

The first implementation pass under this milestone should deliver:

- low-touch loop refinement on top of the current validation scripts
- one app-shell journey test path
- one Maestro smoke flow
- updated testing strategy documentation

This is enough to prove the architecture before expanding to broader critical-path coverage.
