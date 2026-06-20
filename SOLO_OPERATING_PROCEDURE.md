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

## Standard Workflows

## Feature Workflow

1. `SOLO Orchestrator`
2. `Planner`
3. `Builder`
4. `Reviewer`
5. `Test Engineer`
6. `QA Validator`
7. `Release Manager` when release readiness is needed

## Bug Fix Workflow

1. `SOLO Orchestrator`
2. `Planner`
3. `Builder`
4. `Reviewer`
5. `Test Engineer`
6. `QA Validator` if user-visible behavior changed

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

## Builder

Must produce:

- files changed
- change summary
- validation performed
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
