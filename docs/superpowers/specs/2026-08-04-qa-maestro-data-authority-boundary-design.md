# QA Maestro Data Authority Boundary Design

## Goal

Clarify the data authority boundary between `WS-QA / M-QA-02` and `WS-QA / M-QA-03` so the repository does not repeat earlier debugging failures caused by treating the Sprint 7 runtime sandbox as equivalent to live Supabase-backed behavior.

## Context

The repository currently contains two distinct Maestro-compatible testing modes:

- a Sprint 7 runtime sandbox that injects deterministic local state through Developer Settings
- a newer live Supabase-backed Task Core path that uses real login, real project membership, real task mutations, and real uploads

Those two modes serve different purposes.

The earlier Maestro foundation work was intentionally planned around the Sprint 7 entry path because it offers a stable, local, low-flake bootstrap for simulator automation. That remains useful for proving local Maestro wiring, smoke coverage, and deterministic navigation entry.

However, recent Task Core debugging showed that the Sprint 7 runtime sandbox is not a reliable authority for production-like behavior. It bypasses real auth, real fetch hydration, real store refresh timing, and real backend mutation paths. That difference materially affected debugging and confidence, especially for assignment visibility, update routing, keyboard behavior, completion handoff, and photo upload flows.

This design makes that distinction explicit so future QA planning stays honest.

## Problem Statement

Without an explicit boundary:

- `M-QA-02` risks being overextended into workflow-truth claims it was never meant to support
- `M-QA-03` risks inheriting sandbox assumptions that hide or distort real runtime bugs
- roadmap status and testing docs can become internally inconsistent about what Maestro proof actually means

The repository needs one clear rule:

- Sprint 7 sandbox is a foundation/bootstrap authority
- live Supabase is the workflow-confidence authority

## Approaches Considered

### Option A: Keep Sprint 7 As The Main Maestro Authority

Continue using Sprint 7 as the default entry path for both the Maestro foundation and the broader Task Core automation work.

#### Advantages

- most deterministic local dataset
- lowest setup friction
- easier reruns without live-data cleanup

#### Weaknesses

- does not reflect real Supabase-backed behavior
- can hide hydration, membership, persistence, and mutation bugs
- repeats the debugging trap already observed in Task Core work

### Option B: Replace Sprint 7 Entirely With Live Supabase

Move both `M-QA-02` and `M-QA-03` to live Supabase-backed automation and treat the Sprint 7 runtime sandbox as obsolete.

#### Advantages

- one consistent runtime authority
- strongest realism across milestones

#### Weaknesses

- makes the foundation milestone heavier than approved
- weakens deterministic bootstrap and local smoke ergonomics
- forces live-data complexity into the local foundation layer

### Option C: Split Data Authority By Milestone

Keep Sprint 7 for the local Maestro foundation milestone and use live Supabase-backed flows for the critical-confidence milestone.

#### Advantages

- preserves the original purpose of `M-QA-02`
- aligns `M-QA-03` with the real runtime authority needed for workflow truth
- reflects the lessons learned from recent Maestro debugging
- keeps milestone boundaries clean and auditable

#### Weaknesses

- requires docs to explain two testing modes clearly
- needs discipline so sandbox flows are not overinterpreted as end-to-end workflow proof

## Recommendation

Use **Option C: Split Data Authority By Milestone**.

This is the only option that preserves the value of Sprint 7 as a deterministic bootstrap while also respecting the hard lesson from recent Task Core work: production-like workflow confidence must come from live Supabase-backed execution, not from local runtime injection.

## Boundary Statement

The canonical milestone boundary should be:

- `WS-QA / M-QA-02` validates that local Maestro is installed, documented, and operational against the iOS dev-client workflow using stable smoke and Sprint 7 sandbox-entry flows.
- `WS-QA / M-QA-03` validates higher-confidence user-visible behavior through a hybrid Jest plus Maestro ladder, with critical Task Core Maestro flows using live Supabase-backed data authority rather than Sprint 7 runtime injection.

Or stated more simply:

- `M-QA-02` proves the automation track exists and is usable
- `M-QA-03` proves high-value workflows behave correctly under real runtime conditions

## Proposed Milestone Interpretation

## 1. `WS-QA / M-QA-02` — UI Automation Foundation

`M-QA-02` should remain intentionally narrow.

### Canonical role

- local Maestro setup
- local documentation and runbook quality
- root command surface for simulator automation
- launch smoke
- Developer Settings entry
- Sprint 7 sandbox initialization

### What counts as valid proof

- Maestro can attach to the installed iOS dev client
- the app can be opened and driven locally by Maestro
- at least one starter smoke flow and one Sprint 7 bootstrap path run successfully
- the docs truthfully explain prerequisites and local execution

### What does not count as `M-QA-02`

- claiming live workflow correctness
- treating Sprint 7 task states as the production truth source
- broad end-to-end Task Core coverage
- final confidence for assignment, progress, completion, or photo upload behavior

## 2. `WS-QA / M-QA-03` — Automated Confidence And End-to-End UX Coverage

`M-QA-03` should absorb the broader confidence system and the live Task Core work.

### Canonical role

- hybrid confidence ladder
- app-shell journey coverage in Jest
- critical iOS-first Maestro flows
- low-touch development loop alignment
- runtime-sensitive bug detection that depends on real auth, real membership, real mutations, and real backend timing

### Data authority rule

For high-value workflow validation, the default authority is live Supabase-backed execution.

That specifically applies to:

- real login bootstrap
- project membership visibility
- task creation and assignment
- progress updates
- completion and review handoff
- photo upload
- state synchronization after live mutations

### What Sprint 7 may still do inside `M-QA-03`

Sprint 7 may still remain available for:

- smoke entry helpers
- deterministic local diagnostics
- reproducing purely local selector or navigation issues

But it must not be treated as the primary proof source for production-like Task Core behavior.

## Runtime Model Comparison

### Sprint 7 Runtime Sandbox

Characteristics:

- dev-only
- entered through Developer Settings
- injects seed data directly into Zustand stores
- spoofs the authenticated actor locally
- bypasses real Supabase login and fetch hydration

Best for:

- local Maestro wiring
- deterministic bootstrap
- smoke coverage
- selector and navigation scaffolding

Not authoritative for:

- live data freshness
- auth/session behavior
- project membership hydration
- mutation timing
- upload completion behavior
- post-mutation refetch and cache invalidation

### Live Supabase-Backed Flows

Characteristics:

- use real login
- use real persisted project memberships
- create and mutate real tasks
- exercise actual upload and completion paths
- require cleanup and anti-collision discipline

Best for:

- critical workflow truth
- production-like debugging
- high-value confidence closures

## Documentation Impact

The repo should describe this split explicitly in the QA docs:

- `M-QA-02` docs must say Sprint 7 is the canonical local bootstrap path for foundation work
- `M-QA-03` docs must say live Supabase is the authority for critical Task Core workflow proof
- `TESTING_STRATEGY.md` should distinguish bootstrap confidence from workflow confidence
- `maestro/README.md` should explain which flows are sandbox-based versus live-backed

## Command And Flow Impact

### `M-QA-02` command surface

Should emphasize:

- smoke
- Developer Settings entry
- Sprint 7 initialize flow

### `M-QA-03` command surface

Should emphasize:

- journey tests
- confidence commands
- live Task Core Maestro flows

Those live flows should carry the operational safeguards already learned:

- unique task titles
- deterministic project selection
- cleanup policy for live-created tasks
- runtime-alignment SOP
- explicit handling for keyboard, modals, and transient UI blockers

## Error Handling Guidance

When a Maestro flow fails, classify the failure before choosing a fix:

- if the issue is smoke/bootstrap/selector attachment, investigate the `M-QA-02` foundation path first
- if the issue depends on live data, auth, membership, mutation timing, or upload behavior, prefer live Supabase-backed investigation under `M-QA-03`
- do not “fix” a live-runtime issue by hiding it behind Sprint 7 injection unless the goal is explicitly only local smoke stability

## Acceptance Criteria

- the milestone boundary is explicit and non-contradictory
- Sprint 7 is preserved as a foundation/bootstrap tool, not a workflow-truth substitute
- live Supabase is explicitly named as the authority for critical Task Core confidence
- docs and future plans can distinguish local bootstrap proof from production-like workflow proof

## Follow-On Work

Once this boundary is accepted:

- update the root `M-QA-02` implementation plan to stay Sprint 7 foundation-focused
- update the root `M-QA-03` plan/spec to explicitly include live Supabase-backed Task Core flows
- normalize `TESTING_STRATEGY.md` and `maestro/README.md` so the split is visible in the canonical docs
- reconcile roadmap status once the root implementation catches up with the active QA worktree
