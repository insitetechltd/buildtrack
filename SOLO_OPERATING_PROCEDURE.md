# SOLO Operating Procedure

## Objective

This procedure defines a reusable multi-role operating model for **Cursor** solo delivery. It is designed to work across projects by combining:

- reusable methodology in personal skill `solo-dev-harness` (`~/.cursor/skills/solo-dev-harness/`)
- project-specific `AGENTS.md`
- project-specific `.cursor/rules/` (+ optional `.cursor/skills/<project>-dev/`)

Legacy Trae paths (`.trae/`, `~/.trae/skills/solo-agents/`) are read-only during migration and must not be extended. See `documentation/CURSOR_DEV_HARNESS.md`.

## Core Team

Roles are behavioral modes (or Task subagents) inside Cursor — not Trae picker entries. Keep these identifiers for handoffs:

| Display name | Identifier | Callable by other agents |
|---|---|---|
| `SOLO Orchestrator` | `@solo-orchestrator` | No — entry point only |
| `Planner` | `@planner` | Yes |
| `Builder` | `@builder` | Yes |
| `Reviewer` | `@reviewer` | Yes |
| `Test Engineer` | `@test-engineer` | Yes |
| `QA Validator` | `@qa-validator` | Yes |
| `Release Manager` | `@release-manager` | Yes |
| `Docs Curator` (optional) | `@docs-curator` | Yes |

Canonical operational methodology: `~/.cursor/skills/solo-dev-harness/` (workflows, autonomy, handoffs). Project law: `.cursor/rules/` + `AGENTS.md`. Insite overlay: `.cursor/skills/insite-dev/`.

## Operating Principles

### 0. Default Autonomy Policy (ratified from automation-autonomy-recommendations.md)

This repository uses **autonomous-by-default execution** with a narrow blocker list.

- Default execution mode is `autonomous`. Do not ask the user for confirmation if the task is:
  - a bug fix
  - a focused refactor
  - a small feature aligned with existing patterns
  - documentation that follows an implemented change
  - a plan/spec/writing task with clear scope
- Ask the user only for:
  - product behavior choices with multiple valid outcomes that cannot be resolved from AGENTS.md or .trae/rules/
  - schema or persistence model changes with user-facing consequences
  - auth, permissions, or security-sensitive changes with no existing precedent in the codebase
  - release, deployment, or environment decisions (build profiles, version bumps, store submission)
  - changes that exceed the requested scope by more than one bounded extension
- If uncertainty is non-blocking, record an assumption and continue. Surface assumptions in the final synthesis, not in mid-workflow pauses.
- If several clarifications ARE needed, batch them into a single user message (max 4 at a time).
- If a question is NOT blocking (file choice when a dominant likely file exists; validation method; UI details following current app patterns; naming; doc wording; local refactor shape) → choose a reasonable default aligned with the codebase, write it as an assumption, CONTINUE.

### 1. Role Purity

Each agent should stay inside its job boundary:

- `@solo-orchestrator` routes work, enforces workflow quality, and invokes marketplace skills at the right step
- `@planner` plans but does not implement
- `@builder` implements approved plans and never self-approves design drift
- `@reviewer` reviews findings-first and never silently rewrites implementation
- `@test-engineer` validates behavior with focused checks; owns Jest layer; runs Maestro only for bootstrap/smoke evidence; NEVER claims QA-layer signoff
- `@qa-validator` verifies user-visible behavior natively on iOS simulator; owns Maestro layer with "Maestro executes, Human approves" model
- `@release-manager` determines build and deployment readiness; enforces bundle-ID + submission safety
- Marketplace skills are AMPLIFIERS, not role replacements (see § Skill Synergy Hooks below)

### 2. Project Context Lives Outside The Agents

Keep the agents mostly reusable. Put project-specific constraints in:

- `AGENTS.md`
- `.cursor/rules/` (canonical project law in Cursor)
- `.cursor/skills/insite-dev/` (Insite overlay)
- Legacy during Trae exit only: `.trae/rules/` (do not extend)

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
- every feature or behavioral-change plan must explicitly state which tests will be added, updated, or intentionally not added, and why

Before handoff:

- state what was verified
- state what still needs Maestro proof, if any
- state any remaining gaps between logic confidence and runtime confidence

## Mandatory Dev-Cycle Preflight

At the beginning of every non-trivial development cycle, review these inputs before planning or coding:

1. `AGENTS.md`
2. project rules under `.cursor/rules/` (legacy `.trae/rules/` only if Cursor rules missing)
3. `TESTING_STRATEGY.md`
4. `maestro/README.md` when the task can affect real user-visible runtime behavior
5. `npm run dev:doctor` before Maestro or release-readiness claims

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

Each workflow step lists the specialist agent + OPTIONAL marketplace skills that should be invoked to amplify that step.

### Workflow Legend

Each step below uses the format: `Step #. @identifier  [Skill: skill-name if applicable]  — brief responsibility`

Commit Gate: between @reviewer (pass) and @test-engineer, ALWAYS run the `git-commit` skill to produce a conventional commit from the diff. If review has findings, send back to @builder; the git-commit step runs AFTER the reviewer emits "No findings" or the findings are Low/Info-only and don't require code changes.

### Milestone Gate (applies to ALL workflows before @planner dispatch)

Before running the workflow, read `documentation/NOW.md`, then `AGENTS.md § Current Delivery Status` and `documentation/ROADMAP.md`. If the task falls inside an active milestone (WS-UX / M-UX-01 redesign, WS-QA / M-QA-03 hybrid QA, WS-SUPABASE / M-SUPABASE-01) or a pipeline milestone (WS-QA / M-QA-01, M-QA-02):
- The @planner must cite the milestone when writing scope
- The @test-engineer must classify tests correctly per TESTING_STRATEGY.md layers
- The @qa-validator (if called) must explicitly route Maestro scripts for the correct flow
- The @release-manager (if called) must cross-check the milestone gate status against AGENTS.md before marking a release-ready status

## Feature Workflow

1. `@solo-orchestrator` — select workflow; apply Milestone Gate above; apply Autonomy Policy §0
2. `@planner`  [Skill: brainstorming if request is fuzzy; Skill: writing-plans if spec/tasks.md format desired]  — scope, constraints, plan, likely files, acceptance, validation strategy, Jest classification, Maestro requirement
3. `@builder`  [Skill: executing-plans for tasks.md checkpoint-based work; Skill: test-driven-development for TDD tasks]  — implementation, adhering to Maestro UI compatibility rules (builder.yaml § Maestro / automation compatibility)
4. `@reviewer`  [Skill: TRAE-code-review in parallel for cross-project layer; Skill: TRAE-debugger for runtime-only bugs encountered]  — findings-first review + Maestro accessibility audit + interaction binding + legacy parity
5. `@git-commit` (Commit Gate: run ONLY if @reviewer has no Critical/High findings)  — compose conventional commit; stage files according to diff
6. `@test-engineer`  [Skill: test-driven-development for test additions; Skill: TRAE-debugger for runtime flakes]  — targeted Jest + typecheck + lint; OPTIONAL Maestro bootstrap/smoke for EVIDENCE only (NOT QA signoff); declare Jest vs Maestro confidence boundary
7. `@qa-validator`  [Skill: TRAE-debugger for simulator runtime issues; Skill: figma for WS-UX/M-UX-01 pixel-diff after implementation]  — native iOS simulator run + Maestro flows (scripts/maestro/run-local.sh) with unique MAESTRO_TASK_TITLE; "Maestro executes, Human approves" signoff
8. `@docs-curator` — only if canonical docs, runbooks, setup notes, or release steps changed
9. `@release-manager` — only if release readiness is needed (build/deploy/versioning/submission)

Feature workflow planning must explicitly include:

- target Jest checks for active development
- required regression checks before handoff
- required Maestro validation (Test Engineer layer vs QA Validator layer, clearly separated) for user-visible or simulator-sensitive behavior
- milestone gate alignment if applicable

## Bug Fix Workflow

1. `@solo-orchestrator` — select workflow; Milestone Gate; Autonomy Policy §0
2. `@planner`  [Skill: brainstorming if root cause is unclear; Skill: TRAE-debugger if runtime evidence needed for scope]  — scope, root-cause hypotheses, Jest vs Maestro classification, repro steps
3. `@builder`  [Skill: test-driven-development for fix-first-then-pass style; Skill: TRAE-debugger for runtime reproduction]  — smallest safe fix
4. `@reviewer`  [Skill: TRAE-code-review in parallel]  — findings-first; confirm the fix targets the root cause
5. `@git-commit` (Commit Gate: only if no Critical/High findings)
6. `@test-engineer`  [Skill: TRAE-debugger for flaky reproduction]  — targeted Jest + failure-mode validation; declare Jest vs Maestro confidence boundary
7. `@qa-validator` — ONLY if bug affects user-visible mobile flows, navigation, uploads, auth behavior, or task workflow behavior

Bug-fix planning must explicitly state whether the issue is:

- logic-only and Jest-sufficient, or
- runtime-sensitive and requires Maestro proof (Test Engineer evidence) + possibly QA Validator native simulator run

## Refactor Workflow

1. `@solo-orchestrator` — select workflow; Milestone Gate; Autonomy Policy §0
2. `@planner`  [Skill: writing-plans for phased refactor docs; Skill: brainstorming for approach selection]  — refactor scope, backward compat, verification harness
3. `@reviewer`  [Skill: TRAE-code-review in parallel]  — pre-check: design risk before implementation (skip only for tiny mechanical refactors)
4. `@builder`  [Skill: executing-plans for phase-by-phase checkpoint work]  — implementation per plan
5. `@reviewer`  [Skill: TRAE-code-review in parallel]  — findings-first + interaction binding + legacy parity check (modernization MUST NOT drop features)
6. `@git-commit` (Commit Gate: only if no Critical/High findings)
7. `@test-engineer` — targeted Jest + parity tests where applicable; declare Jest vs Maestro confidence boundary
8. `@qa-validator` — ONLY if refactor touches user-visible behavior or navigation

## Release Workflow

1. `@solo-orchestrator` — select workflow; Milestone Gate (ALWAYS re-check milestone closure status)
2. `@planner` — only if release scope, impact, or blockers are unclear
3. `@reviewer` — final drift + security + bundle-id/runtimeVersion audit
4. `@test-engineer` — targeted release smoke (Jest + Maestro bootstrap via run-local.sh for evidence)
5. `@qa-validator` — only if the release includes user-visible mobile flows that need native simulator confidence
6. `@docs-curator` — release notes, changelog, runbook updates
7. `@release-manager`  [Skill: gh-cli for milestone tag/PR sync]  — blockers + deployment checklist + rollback plan + post-release checks

Release Manager hard safety rules (see release-manager.yaml § BUILD ID + SUBMISSION SAFETY RULES):
- Always verify iOS bundle-id match between app.json / eas.json / App Store Connect. Mismatch = Hard Blocker.
- Worker bootstrap + native routing callbacks: rerun-safe (idempotent)? Block on "no".
- App Store PUBLIC release checkbox in ASC: remains a manual human step. Never report "released to users" after submit-only run.

## Hotfix Workflow

1. `@solo-orchestrator` — select workflow; Milestone Gate; Autonomy Policy §0
2. `@planner` — fast-path scope + rollback plan included in plan
3. `@builder` — smallest targeted fix
4. `@reviewer`  [Skill: TRAE-code-review in parallel]  — findings-first; speed over depth, but NO Critical findings escape
5. `@git-commit` (Commit Gate: always for hotfix — preserves rollback point)
6. `@test-engineer` — Jest smoke validation
7. `@release-manager`  [Skill: gh-cli for tagging]  — fast deploy + rollback trigger list

## Documentation-only Workflow

1. `@solo-orchestrator` — choose this workflow ONLY when: implementation/code changes = 0, doc-only update
2. `@planner` — scope docs to update; which files are canonical vs which can wait
3. `@docs-curator`  [Skill: defuddle for extracting clean markdown from external URLs]  — update canonical docs exactly as implemented
4. `@reviewer`  [Skill: TRAE-code-review for technical accuracy]  — verify docs match code/scripts; reject docs that describe unsupported behavior

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
- EXPLICIT distinction between:
  * Jest confidence (unit/integration/journeys/simulation/parity — YOUR LAYER)
  * Maestro bootstrap/smoke EVIDENCE (you may run scripts/maestro/run-local.sh with unique MAESTRO_TASK_TITLE for evidence only — NEVER claim QA signoff)
  * QA Validator layer (MAESTRO = QA Validator domain; "Maestro executes, Human approves" — signoff is theirs, not yours)

## QA Validator

Must produce:

- acceptance coverage (native iOS simulator run REQUIRED for UI/user-visible)
- passes
- failures with exact reproduction steps
- Maestro flow evidence (if run): commands used, MAESTRO_TASK_TITLE value, screenshots/logs where useful, but EXPLICITLY state "Human approval required" per the "Maestro executes, Human approves" model
- Explicitly verify: Maestro keyboard dismissal before CTAs, modals marked accessible={false}, dedicated UpdateProgress callback routes, MAESTRO_TASK_TITLE uniqueness, rerun-safe worker bootstrap callbacks

## Release Manager

Must produce:

- blockers
- deployment checklist
- rollback plan
- post-release checks

## Recommended SOLO Calling Rules

- Invoke agents with the `@identifier` syntax, NOT display names. Exact identifiers: `@planner`, `@builder`, `@reviewer`, `@test-engineer`, `@qa-validator`, `@release-manager`, `@docs-curator`. Use `SOLO Orchestrator` as entry point by opening a turn with the kickoff prompt (§ WORKFLOW_TEMPLATES.md or § SOLO_KICKOFF_PROMPT.md).
- Start with `@planner` for any non-trivial request after orchestrator chooses the workflow.
- For fuzzy requests: call Skill `brainstorming` BEFORE dispatching to `@planner`. Let it explore 2-3 approaches, then hand the structured output to `@planner` for formal scope.
- For phased plan tasks: call Skill `writing-plans` AFTER `@planner` emits scope to generate spec.md / tasks.md / check_list.md. Treat that output as input to `@builder`, not as a replacement for `@planner`.
- For checkpoint-based implementation: call Skill `executing-plans` INSIDE `@builder` turn with tasks.md. Never replace `@builder` wholesale (it carries the Maestro UI compatibility + Supabase guardrails).
- For TDD: call Skill `test-driven-development` as a Builder pre-step OR during `@test-engineer` for test additions. This is additive, does not conflict.
- For risky changes: run `@reviewer` AND `TRAE-code-review` skill in parallel. Each catches different layers.
- COMMIT GATE (non-negotiable): Run the `git-commit` skill ONLY AFTER `@reviewer` emits "no Critical/High findings". Never commit pre-review. Order: Builder → Reviewer → git-commit → Test Engineer → QA Validator.
- Allow `@builder`, `@reviewer`, `@test-engineer`, `@qa-validator`, and `@release-manager` to be callable by other agents.
- Keep `@solo-orchestrator` as the coordinating agent rather than the main implementer.
- Use `@docs-curator` only when implementation meaningfully changes canonical docs or runbooks.
- If a workflow is small and low risk, `@planner -> @builder -> @reviewer` (plus Commit Gate git-commit) is enough. Skip Test Engineer/QA Validator only if scope is zero-user-visible and zero-behavioral (e.g., doc-only, comment-only, mechanically-proven rename inside a single file with no test surface impact).

## Skill Synergy Hooks Quick Reference

| Installed marketplace skill | When to call during workflow |
|---|---|
| `brainstorming` | Pre-@planner when request is fuzzy / open-ended |
| `writing-plans` | Post-@planner to generate spec/tasks/checklist artifacts |
| `executing-plans` | Inside @builder when using tasks.md for checkpoint-based work |
| `test-driven-development` | @builder (write failing test first) OR @test-engineer (add tests post-hoc) |
| `TRAE-code-review` | Parallel with @reviewer for risky changes (cross-project layer) |
| `TRAE-debugger` | @builder, @test-engineer, @reviewer when runtime evidence is needed |
| `git-commit` | Commit Gate: ONLY after @reviewer no Critical/High findings |
| `gh-cli` | @release-manager and @docs-curator for milestones, tags, PRs, issue ↔ ROADMAP sync |
| `figma` | Pre-@planner (design → code) AND @qa-validator (pixel diffs) for WS-UX/M-UX-01 redesign work |
| `agent-browser` | @qa-validator or @planner for auxiliary browser tasks (Supabase web dashboard, external doc sites) — mobile flows stay native simulator |
| `defuddle` | @planner or @docs-curator instead of raw WebFetch when extracting clean markdown from a URL |
| `react-native-skills` | ALWAYS prefer over `react-best-practices` for Expo/React Native code in Builder, Reviewer, QA |
| `react-best-practices` | Secondary fallback for shared pure-React utilities |

## Future Project Reuse

To reuse this operating model in another repository:

1. copy `.trae/agents/`
2. copy this file
3. replace `AGENTS.md`
4. replace `.trae/rules/project-context.md`
5. adapt any repository-specific sections inside `solo-orchestrator.md` and the specialist prompts
6. add any new domain-specific rules
7. install the skill copy at `~/.trae/skills/solo-agents/` and update repository-specific sections in every YAML:
   - `planner.yaml` → Current Milestone Awareness
   - `builder.yaml` → Maestro / automation compatibility
   - `reviewer.yaml` → Maestro accessibility audit checks
   - `test-engineer.yaml` → Jest vs Maestro layer boundary
   - `qa-validator.yaml` → Maestro execution model / keyboard rules / iOS checklist
   - `release-manager.yaml` → bundle-ID safety / submission rules
   - `docs-curator.yaml` → AGENTS.md milestone maintenance
   - `solo-agents/SKILL.md` → Synergies table / related_skills
   - `solo-agents/metadata.json` → version bump + related_skills + categories

The agent prompts should remain mostly unchanged across projects. The YAML files carry the project specialization; the `.md` blueprints stay portable.
