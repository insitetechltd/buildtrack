# Screen Verification Route Design

**Goal**

Create a deterministic, reusable verification path for screen-specific UI changes so future simulator screenshots only happen after the app has opened the exact target screen.

## Context

The current app can relaunch successfully, but after relaunch it returns to the last normal shell state, not necessarily the screen that was modified. That means a screenshot taken immediately after relaunch proves only what happened to be visible, not whether a specific target screen such as Task Detail actually reflects the intended change.

The codebase already gives us two useful anchors:

- app scheme: `taskr`
- existing internal destination: `DeveloperSettings`

So the right fix is not ad-hoc simulator guessing. It is a deterministic verification route built on top of existing navigation and debug surfaces.

## Options Considered

### Option A: Manual-only verification

Flow:

1. relaunch app
2. manually tap through the UI
3. take screenshot

Pros:

- no code changes

Cons:

- not deterministic
- easy to land on the wrong record or wrong screen state
- not reusable for future screen work
- still depends on human setup before every capture

### Option B: Developer Settings verification launcher

Flow:

1. open `Developer Settings`
2. choose a preset verification destination such as `Task Detail`
3. supply a task id or use a known seeded target
4. navigate directly
5. verify screen and capture

Pros:

- uses an existing internal surface
- explicit and understandable
- reusable for future screens
- works even when deep-link support is incomplete

Cons:

- requires a few taps before each verification
- still needs some parameter input or preset management

### Option C: Deep-link driven verification route via `taskr://...`

Flow:

1. relaunch app
2. trigger a deterministic deep link such as:
   - `taskr://verify/task-detail?taskId=<id>`
3. app opens the exact target screen
4. confirm target content
5. capture screenshot

Pros:

- most deterministic
- fastest repeated verification path
- works well for automation and future screenshot workflows
- reusable for any screen once registered

Cons:

- needs linking configuration and route parsing
- needs a clear mapping between verification URLs and navigation destinations

## Recommendation

Use a hybrid of **Option B + Option C**.

### Why this is the best approach

Option C gives the app a true deterministic verification path. Option B provides a visible, maintainable internal launcher for humans and fallback debugging. Together they solve both use cases:

- automated or semi-automated verification through `taskr://...`
- explicit manual verification through `Developer Settings`

This avoids building a throwaway Task Detail shortcut while still making the route available for any future screen modification.

## Proposed Design

### 1. Verification route model

Add a verification route concept that maps a small set of debug-only destinations to real navigation targets.

Initial supported destination:

- `Task Detail`

Initial required parameters:

- `taskId`
- optional `subTaskId`

Example verification URL:

- `taskr://verify/task-detail?taskId=<task-id>`
- `taskr://verify/task-detail?taskId=<task-id>&subTaskId=<subtask-id>`

### 2. Navigation behavior

When the app receives a supported verification URL:

- it should navigate to the correct root tab / stack combination
- then open the exact target screen with the provided params
- then expose enough visible content to confirm that the right record is open

For Task Detail, the verification route must resolve into the real `TaskDetail` screen, not a mock or preview shell.

### 3. Developer Settings launcher

Add a small `Screen Verification` section inside the existing `Developer Settings` screen.

For the first pass, keep it simple:

- one preset action: `Open Task Detail`
- task-id input or a known seeded task id
- optional subtask id input
- launch button

This section is for internal verification only and should not alter normal user navigation.

### 4. Verification protocol

Going forward, screen-specific verification must follow this order:

1. relaunch app if needed
2. open the exact target screen through the deterministic verification route
3. confirm visible identifiers that prove the right record or screen is open
4. only then capture screenshots

If step 2 cannot be completed, screenshots must not be presented as proof of that screen-specific UI change.

### 5. Reuse standard

This system should be built so future screens can be added with small incremental changes.

Future candidate targets:

- Create Task
- Update Progress
- Developer Settings sections
- specific project detail screens

The first implementation only needs Task Detail, but the structure should make additional verification destinations straightforward.

## Acceptance Criteria

1. the app can open a real Task Detail screen deterministically from a verification route
2. the verification path uses the existing `taskr` app scheme
3. `Developer Settings` exposes a visible internal launcher for the same destination
4. the verification route does not change normal production navigation behavior
5. future screen verification uses the explicit sequence:
   - navigate to exact target screen first
   - capture second
6. screenshots are no longer treated as evidence of a screen-specific fix unless the target screen was explicitly opened first

## Risks And Guardrails

### Risk: verification-only code leaks into normal UX

Guardrail:

- keep the launcher inside existing internal developer tooling
- keep verification route handling explicit and scoped

### Risk: route opens the wrong navigation stack

Guardrail:

- test the exact root-tab and stack navigation path for Task Detail
- verify both dashboard-origin and tasks-origin ambiguity are avoided by using one canonical verification entry path

### Risk: screenshot still proves the wrong thing

Guardrail:

- require a visible record identifier or screen-specific content check before capture

## Recommended First Slice

Implement only:

- deep-link verification for Task Detail
- a `Developer Settings` launcher for Task Detail
- tests for route parsing and navigation
- one execution note documenting the new verification rule

That is enough to fix the current verification gap without broadening into a full internal QA framework.
