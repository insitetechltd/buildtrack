# WS-QA / M-QA-03 — Automated Confidence & End-to-End UX Coverage

## Purpose

Extend the existing QA automation track beyond local Maestro foundation work so the repository gains a realistic, repeatable confidence ladder for critical user journeys, a lower-touch development loop, simulator-driven UX smoke coverage, and release-facing regression detection.

## Scope

### In Scope

- navigation-driven app-shell journey tests that exercise real screen composition and route transitions
- deterministic test-data and state-seeding helpers for critical user flows
- development-loop refinement so the default local path requires less user steering
- iOS-first Maestro flows for core human journeys such as sign-in, project switching, task creation entry, task detail verification, and at least one update/action path
- targeted selector hardening where current screens lack stable automation anchors
- package scripts and documentation for local execution and CI-ready rollout
- confidence-bundle alignment so the new E2E layer complements existing Jest unit, integration, simulation, and parity coverage

### Out Of Scope

- claiming absolute correctness under every possible circumstance
- replacing the existing Jest-based unit and integration layers
- Android-first or simultaneous cross-platform E2E expansion
- exhaustive live-backend coverage for every edge case in the same milestone
- broad UI redesign or unrelated navigation refactors

## Why This Is A Separate Milestone

`WS-QA / M-QA-02` is intentionally scoped as a local Maestro foundation. It explicitly excludes CI rollout and broad workflow coverage. This follow-on milestone captures the larger automation objective without silently broadening the foundation milestone beyond its approved boundaries.

## Proposed Delivery Shape

### Phase 1: App-Shell Journey Harness

- refine the local development loop so validation tiers are easier to run with minimal user input
- mount the real navigation shell in Jest-driven journey tests
- seed auth, project, and task state deterministically
- validate high-value user journeys across screen boundaries instead of isolated harness components

### Phase 2: Critical Maestro Flows

- convert the strongest user-critical paths into iOS simulator Maestro coverage
- reuse deterministic verification routes and stable `testID` anchors
- capture failure points at the actual runtime UI layer

### Phase 3: Confidence Bundle Alignment

- expose explicit package scripts for local and future CI execution
- define what belongs in fast regression versus slower confidence runs
- document prerequisites, simulator expectations, and failure triage paths

## Dependencies

- `WS-QA / M-QA-02` to establish the local Maestro foundation and command structure
- `WS-UX / M-UX-01 / S-UX-01I` to reduce churn from active migration hardening before broad UX automation is treated as reliable
- existing verification-route and selector-adoption work already tracked under the current UI and QA foundation docs

## Validation

- targeted Jest execution for new journey tests
- at least one passing simulator-driven Maestro smoke path against the iOS dev-client flow
- documentation aligned with the real package scripts and current local run commands
- roadmap and agent-inventory references updated so the milestone is discoverable in the canonical queue

## Notes

- This milestone should improve confidence materially, not promise impossible certainty.
- The preferred automation model is hybrid: fast Jest journey coverage plus simulator-level Maestro smoke and critical-flow validation.
- CI rollout can be staged after the local flow set is stable and the simulator/runtime prerequisites are documented.
