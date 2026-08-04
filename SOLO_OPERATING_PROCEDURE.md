# SOLO Operating Procedure

## Objective

This procedure defines a reusable multi-agent operating model for Trae SOLO environments. It is designed to work across projects by combining:

- reusable agent roles
- project-specific `AGENTS.md`
- project-specific `.trae/rules/`

## Core Team

- `SOLO Orchestrator`
- `Planner`
- `Builder`
- `Reviewer`
- `Test Engineer`
- `QA Validator`
- `Release Manager`
- optional: `Docs Curator`

## Operating Principles

### 1. Role Purity

Each agent should stay inside its job boundary:

- `SOLO Orchestrator` routes work and enforces workflow quality
- `Planner` plans but does not implement
- `Builder` implements but does not self-approve design drift
- `Reviewer` reviews but does not silently rewrite implementation
- `Test Engineer` validates behavior with focused checks
- `QA Validator` verifies user-visible behavior and acceptance outcomes
- `Release Manager` determines build and deployment readiness

### 2. Project Context Lives Outside The Agents

Keep the agents mostly reusable. Put project-specific constraints in:

- `AGENTS.md`
- `.trae/rules/project-context.md`
- additional domain rules under `.trae/rules/`

### 3. Smallest Safe Change

Implementation should favor:

- focused diffs
- local consistency
- reuse of existing patterns
- targeted validation

### 4. Evidence Over Assumption

Agents should clearly separate:

- observed facts
- assumptions
- recommendations
- unverified areas

### 5. Escalate Instead Of Guessing

If implementation reveals hidden complexity:

- stop broadening scope silently
- return to `Planner`
- propose options with tradeoffs

### 6. Testing Mindset Starts Before Implementation

Every development cycle must treat testing as part of delivery design, not as a final cleanup step.

Before implementation begins:

- read `TESTING_STRATEGY.md`
- read `maestro/README.md` when the work is user-visible, simulator-sensitive, navigation-heavy, or runtime-interaction-sensitive
- decide which Jest layer is the default development loop for the task
- decide whether Maestro proof is required before the task can be considered done
- define the smallest validation path that can prove correctness during implementation

During implementation:

- run the smallest relevant Jest checks early and repeatedly
- add or update focused tests when they materially reduce regression risk
- escalate to Maestro when real user interaction, simulator behavior, keyboard handling, modal behavior, navigation, permissions, or native surfaces are part of the change

Before handoff:

- state what was verified
- state what still needs Maestro proof, if any
- state any remaining gaps between logic confidence and runtime confidence

## Mandatory Dev-Cycle Preflight

At the beginning of every non-trivial development cycle, review these inputs before planning or coding:

1. `AGENTS.md`
2. project rules under `.trae/rules/`
3. `TESTING_STRATEGY.md`
4. `maestro/README.md` when the task can affect real user-visible runtime behavior

This preflight is mandatory for:

- feature work
- bug fixes
- refactors that touch behavior
- test-suite expansion
- user-visible flow changes

The purpose of the preflight is to ensure the implementation plan already includes:

- the right Jest development loop
- the right regression gate
- the right Maestro proof requirement, if applicable
- the right acceptance and validation scope

## Standard Workflows

## Feature Workflow

1. `SOLO Orchestrator`
2. `Planner`
3. `Builder`
4. `Reviewer`
5. `Test Engineer`
6. `QA Validator`
7. `Release Manager` when release readiness is needed

Feature workflow planning must explicitly include:

- target Jest checks for active development
- required regression checks before handoff
- required Maestro validation for user-visible or simulator-sensitive behavior

## Bug Fix Workflow

1. `SOLO Orchestrator`
2. `Planner`
3. `Builder`
4. `Reviewer`
5. `Test Engineer`
6. `QA Validator` if user-visible behavior changed

Bug-fix planning must explicitly state whether the issue is:

- logic-only and Jest-sufficient, or
- runtime-sensitive and requires Maestro proof

## Refactor Workflow

1. `SOLO Orchestrator`
2. `Planner`
3. `Reviewer` pre-check for design risk when needed
4. `Builder`
5. `Reviewer`
6. `Test Engineer`

## Release Workflow

1. `SOLO Orchestrator`
2. `Planner` when release scope or risk is unclear
3. `Reviewer`
4. `Test Engineer`
5. `QA Validator` when the release includes user-visible flows
6. `Release Manager`

## Hotfix Workflow

1. `SOLO Orchestrator`
2. `Planner` fast-path
3. `Builder`
4. `Reviewer`
5. `Test Engineer` smoke validation
6. `Release Manager`

## Mandatory Handoff Format

Every agent should use the following handoff structure:

- Goal
- Assumptions
- Files touched or reviewed
- What was done
- Validation plan or validation performed
- Risks or gaps
- Recommended next agent

## Exit Criteria By Agent

## Planner

Must produce:

- scope
- constraints
- likely files
- acceptance criteria
- validation strategy
- required Jest layer
- required Maestro layer, if any

## Builder

Must produce:

- files changed
- change summary
- validation performed
- remaining validation required
- unresolved risks

## Reviewer

Must produce:

- findings first
- severity ordering
- residual risks if no findings

## Test Engineer

Must produce:

- test scope
- commands or manual steps
- results
- gaps
- explicit distinction between Jest confidence and Maestro/runtime confidence

## QA Validator

Must produce:

- acceptance coverage
- passes
- failures
- reproduction steps

## Release Manager

Must produce:

- blockers
- deployment checklist
- rollback plan
- post-release checks

## Recommended SOLO Calling Rules

- Use `SOLO Orchestrator` as the default entry point for non-trivial work.
- Start with `Planner` for any non-trivial request after orchestration chooses the workflow.
- Allow `Builder`, `Reviewer`, `Test Engineer`, `QA Validator`, and `Release Manager` to be callable by other agents.
- Keep `SOLO Orchestrator` as the coordinating agent rather than the main implementer.
- Use `Docs Curator` only when implementation meaningfully changes docs or runbooks.
- If a workflow is small and low risk, `Planner -> Builder -> Reviewer` is enough.

## Future Project Reuse

To reuse this operating model in another repository:

1. copy `.trae/agents/`
2. copy this file
3. replace `AGENTS.md`
4. replace `.trae/rules/project-context.md`
5. adapt any repository-specific sections inside `solo-orchestrator.md` and the specialist prompts
6. add any new domain-specific rules

The agent prompts should remain mostly unchanged across projects.
