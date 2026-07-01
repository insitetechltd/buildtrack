# Maestro Local Setup Design

## Goal

Add a local-only Maestro automation scaffold for the existing Expo-managed iOS dev-client workflow so the repository can run repeatable simulator-driven QA flows without introducing CI wiring or a second E2E framework.

## Scope

### In Scope

- Add a `maestro/` workspace for local flow files.
- Add a small set of starter flows focused on current QA needs:
  - app launch smoke
  - Sprint 7 sandbox entry path
  - two-user manual-QA helper entry points
- Add local helper scripts in `package.json` for common Maestro tasks.
- Add one canonical local runbook under `documentation/`.
- Reuse the existing dev-client simulator workflow already present in the repo.

### Out of Scope

- CI pipeline integration
- broad app-wide accessibility refactors
- Android Maestro setup
- replacing Jest or simulation tests
- full end-to-end coverage for every screen

## Approaches Considered

### 1. Minimal Scaffold

Create a local Maestro folder, a few starter flows, package scripts, and documentation. Flows rely on current visible text and stable app launch behavior first, with selector hardening deferred until real failures identify the exact gaps.

#### Advantages

- Lowest setup cost
- Smallest repo change set
- Fastest path to local QA automation

#### Risks

- Some flows may be brittle if screen text changes
- Additional selectors may still be needed later

### 2. Selector-First Scaffold

Set up Maestro and also add accessibility labels or test hooks to target screens immediately.

#### Advantages

- Stronger automation stability from day one
- Better long-term E2E ergonomics

#### Risks

- Larger implementation scope
- Higher chance of touching user-visible screens during setup

### 3. Script-Only Bootstrap

Add only install and run commands, leaving flows for later.

#### Advantages

- Smallest initial diff

#### Risks

- Delays actual automation value
- Leaves the repo without working examples

## Recommendation

Use **Minimal Scaffold** now.

This matches the requested local-only scope, preserves the current Expo-managed structure, and keeps the first change set focused on immediate usefulness. Selector hardening can be added in a follow-up slice once real flow execution shows where the current UI needs stronger automation anchors.

## Proposed Structure

### Files

- `maestro/README.md`
- `maestro/config.yaml` if needed by the chosen command style
- `maestro/flows/launch-smoke.yaml`
- `maestro/flows/sprint7-open-developer-settings.yaml`
- `maestro/flows/sprint7-initialize-sandbox.yaml`
- `maestro/helpers/` for shared reusable steps if duplication appears
- `documentation/MAESTRO_LOCAL_SETUP.md`

### Package Scripts

Add local scripts such as:

- `maestro:install`
- `maestro:doctor`
- `maestro:test`
- `maestro:test:smoke`

These scripts should prefer shell-safe local commands and keep the invocation path explicit for macOS developers.

## Flow Design

### Launch Smoke

Purpose:

- verify Maestro can attach to the running simulator app
- verify the app opens and basic first-screen assertions work

### Sprint 7 Developer Settings Entry

Purpose:

- provide a reusable path to the existing `Profile -> Developer Settings` entry
- reduce duplication across future manual-QA flows

### Sprint 7 Sandbox Initialization

Purpose:

- automate the entry path to the existing sandbox initializer
- stop short of overcommitting to every branching user action in the first slice

This first setup should favor stable reusable entry flows instead of pretending the full two-user suite is already automated.

## Data And Runtime Assumptions

- The iOS dev client is already buildable and installable through the repo’s current simulator workflow.
- Metro is started separately with `npx expo start --dev-client`.
- The simulator app can be launched before Maestro runs.
- Existing Sprint 7 sandbox tooling in Developer Settings remains the canonical QA seed path.

## Error Handling

- Documentation should clearly separate:
  - dev-client install/build issues
  - Metro connection issues
  - Maestro tool installation issues
  - flaky selector failures inside app flows
- Scripts should fail fast and print the exact command to rerun manually.

## Validation Plan

Use the smallest relevant checks:

- verify any new `package.json` scripts are valid
- run the documented Maestro install/doctor commands
- run at least one smoke flow locally against the installed simulator app
- run `npx tsc --noEmit` if TypeScript-facing scripts or config references change

## Acceptance Criteria

- The repo contains a clear local Maestro scaffold.
- A developer can install Maestro locally using the documented path.
- At least one flow runs successfully against the installed iOS simulator app.
- The setup is documented in one canonical runbook under `documentation/`.
- No CI or unrelated app refactors are introduced.

## Follow-On Work

Once the local scaffold is proven, the next slice can add:

- selector hardening for unstable screens
- richer two-user flows
- screenshot capture/evidence helpers
- optional CI-facing command structure
