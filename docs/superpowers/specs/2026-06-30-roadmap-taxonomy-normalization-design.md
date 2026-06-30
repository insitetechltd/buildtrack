# Roadmap Taxonomy Normalization Design

## Objective

Normalize roadmap and execution terminology across the repository so delivery work is referenced with one consistent hierarchy:

- `WS` = Workstream
- `M` = Milestone
- `S` = Slice

This change removes roadmap ambiguity caused by mixed use of `stage`, `phase`, `sprint`, and `wave` in lifecycle documents and cross-references.

## Problem Statement

Current planning artifacts mix multiple overlapping terms:

- `Sprint` is used both as a historical timebox and as a delivery grouping label.
- `Stage` and `Phase` are both used as roadmap hierarchy levels.
- `Wave` is sometimes used correctly as a UI migration cohort, but is sometimes read like a primary roadmap level.
- Recent work references such as `Phase 4B`, `Phase 4C`, and `Phase 4D` are internally understandable but do not fit a durable repo-wide taxonomy.

This makes it harder to answer:

- what work is done
- what work remains in the pipeline
- how one roadmap item relates to another
- which labels are historical and which labels are active planning units

## Goals

- Establish one delivery taxonomy for roadmap work: `Workstream -> Milestone -> Slice`.
- Re-render active and historical roadmap references using `WS/M/S` identifiers where appropriate.
- Preserve `Wave` only as a migration cohort label for UI modernization.
- Preserve `Sprint` only as a historical chronology label, not as an active roadmap hierarchy level.
- Rename relevant roadmap/spec/plan filenames and update cross-references so the repository reads consistently.

## Non-Goals

- Do not rename domain terms that are not delivery hierarchy labels.
- Do not change task workflow terminology such as task lifecycle `stages`.
- Do not change TDD step language such as `Red Phase` or `Green Phase`.
- Do not rewrite technical intent inside plans beyond what is needed for taxonomy consistency.
- Do not change product code, runtime behavior, or build configuration.

## Taxonomy Rules

### 1. Primary Delivery Hierarchy

- `Workstream (WS)`: a durable theme of related work with a shared outcome.
- `Milestone (M)`: a shippable checkpoint or grouped objective within a workstream.
- `Slice (S)`: the smallest execution unit completed through the full loop of spec, plan, implementation, review, and verification.

### 2. Secondary Labels

- `Wave`: allowed only for UI migration cohort grouping such as `Wave 1` and `Wave 2`.
- `Sprint`: allowed only as a historical timing reference such as `closed during Sprint 4`, but not as the active roadmap node name.

### 3. Conversion Rules

- Replace roadmap `Stage` references with either `Milestone` or a named workstream grouping based on context.
- Replace roadmap `Phase` references with `Slice` when they refer to executable work units.
- Keep `Phase` unchanged when it is clearly a local method label rather than roadmap hierarchy, such as TDD cycle wording.
- Replace active roadmap `Sprint` headings with `Milestone` names while preserving the sprint number as historical context where useful.
- Keep `Wave` in UI migration matrices and related docs, but position it under the relevant `WS/M/S` structure.

## Planned Naming Model

### Active Roadmap Workstreams

- `WS-FND` Foundations
- `WS-DATA` Data Authority and Model Consistency
- `WS-UI` UI Modernization
- `WS-AUTHZ` Roles and Permissions
- `WS-SEC` Security and Worktree Hygiene
- `WS-DEVEX` Developer Workflow and Test Infrastructure
- `WS-QA` QA and Acceptance
- `WS-FUTURE` Deferred Long-Range Initiatives

### Known Milestone Examples

- `M-FND-04` UI Migration Foundations
- `M-DATA-02` Core Model Unification and Debt Elimination
- `M-UI-02` Wave 2 Screen Migration and Header Convergence
- `M-SEC-01` Security and Worktree Sanitization

### Known Slice Examples

- `S-UI-02A` ProjectsScreen migration slice
- `S-UI-02B` Group B header convergence slice
- `S-UI-02C` Photo update shortcut slice

## File and Reference Scope

This normalization uses the full-sweep approach:

- rename document content in active roadmap, spec, and plan files
- rename relevant filenames in `docs/superpowers/specs/` and `docs/superpowers/plans/`
- update intra-repo markdown links and textual references
- update cross-repo meta docs such as:
  - `AGENTS.md`
  - `documentation/README.md`
  - `documentation/m-fnd-04-ui-migration-wave-matrix.md`
  - selected templates or inventory docs that currently reinforce the mixed taxonomy

## Explicit Exclusions

The following should not be renamed unless a specific document is later re-scoped as a roadmap artifact:

- task-domain workflow `stage` terminology
- TDD `phase` wording
- agent/process gate language such as discovery, staging, or validation phases
- plan-local sequencing labels inside a single implementation plan
- named sandbox, fixture, or example labels that happen to include a sprint number
- generic external architecture documents where `phase` is part of the original proposal structure and not part of the active delivery roadmap
- archived historical analysis docs unless they are directly referenced as active source-of-truth planning artifacts

## Filename Strategy

### Strategy

- Use descriptive filenames that begin with the new taxonomy identifier when the file is an active roadmap, spec, or implementation plan.
- Preserve the existing date prefix when present.

### Examples

- `2026-06-28-post-sprint7-master-roadmap.md`
  becomes
  `2026-06-28-ws-roadmap-near-term-execution.md`
- `2026-06-29-phase-4b-projects-screen-design.md`
  becomes
  `2026-06-29-s-ui-02a-projects-screen-design.md`
- `2026-06-30-phase-4c-group-b-header-convergence-implementation.md`
  becomes
  `2026-06-30-s-ui-02b-group-b-header-convergence-implementation.md`

## Mapping Plan

### Previously Completed Work

- historical `Sprint 1` -> `WS-FND / M-FND-01`
- historical `Sprint 2` -> `WS-FND / M-FND-02`
- historical `Sprint 3` -> `WS-FND / M-FND-03`
- historical `Sprint 4` -> `WS-FND / M-FND-04`
- `Phase 4B` -> `WS-UI / M-UI-02 / S-UI-02A`
- `Phase 4C` -> `WS-UI / M-UI-02 / S-UI-02B`
- `Phase 4D` -> `WS-UI / M-UI-02 / S-UI-02C`

### Pipeline Work Still To Finish

- cache authority and sync hardening -> `WS-DATA / M-DATA-01`
- core model unification and debt elimination -> `WS-DATA / M-DATA-02`
- security and worktree sanitization -> `WS-SEC / M-SEC-01`
- role model normalization -> `WS-AUTHZ / M-AUTHZ-01`
- screen modernization batches A/B/C -> `WS-UI / M-UI-03`, `M-UI-04`, `M-UI-05`
- photo screens remaining modernization -> `WS-UI / M-UI-06`
- CreateTaskScreen full modernization completion -> `WS-UI / M-UI-07`
- workspace loop and simulation tests -> `WS-DEVEX / M-DEVEX-01`
- manual user-testing rubric execution -> `WS-QA / M-QA-01`
- long-range deferred initiatives -> `WS-FUTURE`

## Implementation Steps

1. Rename the highest-signal roadmap files and their references.
2. Update active roadmap language from `stage/phase/sprint` to `WS/M/S`.
3. Update UI migration docs so `Wave` remains only as a cohort label under the taxonomy.
4. Update repository meta docs that summarize delivery history and current queue.
5. Run a repo-wide search for remaining lifecycle uses of `stage`, `phase`, and `sprint`.
6. Manually review exceptions and keep only intentional non-roadmap uses.

## Risks

- Over-renaming could damage documents that use `phase` or `stage` for domain concepts rather than delivery taxonomy.
- Filename changes can break markdown links if every reference is not updated.
- Historical context can become less readable if sprint references are removed instead of reframed.

## Mitigations

- Restrict the sweep to active roadmap, planning, spec, and repo-summary artifacts first.
- Preserve historical context inline, for example `historically closed during Sprint 4`.
- Re-scan the repository after edits and review remaining matches one by one.

## Validation

- every renamed file remains reachable through updated markdown links
- active roadmap docs read consistently using `WS/M/S`
- UI migration docs keep `Wave` only as a cohort label
- repo-summary docs no longer mix active roadmap hierarchy terms
- remaining `stage/phase/sprint` matches are intentional and documented by exception

## Approval Gate

After this spec is reviewed, implementation will:

- rename roadmap documents and references
- regenerate the reorganized roadmap summary with both completed and pipeline work
- provide a final exception list for any intentionally preserved legacy terminology
