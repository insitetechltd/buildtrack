# SOLO Operating Procedure

**Portable cycle SoT:** `~/.cursor/skills/solo-dev-harness/SOP.md` (git-tracked copy: `docs/superpowers/templates/solo-dev-harness/SOP.md`). Whole cycle = **quality loop**: Scout → Spec → Gate A → Test contract → Build → Prove → Quality Judge.

**Dual-write:** when the process improves, update SOP.md + harness `templates/` + this file / `.cursor/rules/workflow-*.md` as applicable. Do not refine Insite only. Insite overlays (Maestro, Supabase Human Gates, Taskr SoT) stay in `.cursor/skills/insite-dev/` and Insite-specific rule files.

The sections below are the Insite-flavored operating model (roles, Trae-exit notes, workflow templates). If they conflict with SOP.md on portable rules, **SOP.md wins**; keep overlays here.

---

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
| `SOLO Orchestrator` | `@solo-orchestrator` | No — entry point only; never implements on Track M/U |
| `Scout` | `@scout` | Yes — merge into Planner on Track S |
| `Planner` | `@planner` | Yes |
| `Test Designer` | `@test-designer` | Yes — may be Test Engineer in TDD mode |
| `Builder` | `@builder` | Yes — no self-SHIP |
| `Reviewer` | `@reviewer` | Yes — independent model |
| `Adversary` | `@adversary` | Yes — Gate B; named gaps must be proven |
| `Test Engineer` | `@test-engineer` | Yes — executes Test Designer contract |
| `QA Validator` | `@qa-validator` | Yes — Track M/U default-on |
| `Quality Judge` | `@quality-judge` | Yes — **only SHIP owner**; never implements |
| `Release Manager` | `@release-manager` | Yes |
| `Docs Curator` | `@docs-curator` | Yes |

Canonical operational methodology: `~/.cursor/skills/solo-dev-harness/` (SOP + `templates/`; git-tracked mirror `docs/superpowers/templates/solo-dev-harness/`). Project law: `.cursor/rules/` + `AGENTS.md`. Insite overlay: `.cursor/skills/insite-dev/`.

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

- `@solo-orchestrator` routes work, owns the claim ledger, proposes track S/M/U, enforces loop budget, and never implements on Track M/U
- `@scout` produces a context pack, not a plan
- `@planner` plans falsifiable claims with named proofs and does not implement
- `@test-designer` writes the failing proof contract before Builder
- `@builder` implements the approved contract and never self-SHIP
- `@reviewer` reviews findings-first (independent model) and never silently rewrites implementation
- `@adversary` lists unproven user-visible failures; Orchestrator must prove named gaps
- `@test-engineer` executes the Test Designer contract; NEVER claims QA-layer signoff
- `@qa-validator` verifies user-visible behavior natively on iOS simulator; Track M/U default-on; fail → Builder
- `@quality-judge` scores the scorecard; **only role that emits SHIP**; never implements
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
- decide the Jest development loop **and** the named proofs in the Test Designer contract
- on Track M/U, Maestro or headed proof is **required** for screens/nav/uploads/stores-that-screens-read unless the Quality Judge classifies the work as logic-only with evidence
- define the claim ledger the Judge will score

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
- the right Maestro/headed proof requirement on Track M/U (Judge-classified logic-only is the only skip)
- the right acceptance and validation scope (falsifiable claims)
- track S / M / U proposed

## Standard Workflows

Each workflow step lists the specialist agent + OPTIONAL marketplace skills that should be invoked to amplify that step.

### Workflow Legend

Each step below uses the format: `Step #. @identifier  [Skill: skill-name if applicable]  — brief responsibility`

Commit Gate: between Prove (Reviewer 0 C/H) and Done, **Quality Judge SHIP** is required. Conventional commit may run during loops for recovery, or after SHIP when the user asks. If review has findings, send back to @builder. Never treat commit as SHIP.

### Milestone Gate (applies to ALL workflows before @planner dispatch)

Before running the workflow, read `documentation/NOW.md`, then `AGENTS.md § Current Delivery Status` and `documentation/ROADMAP.md`. If the task falls inside an active milestone (WS-UX / M-UX-01 redesign, WS-QA / M-QA-03 hybrid QA, WS-SUPABASE / M-SUPABASE-01) or a pipeline milestone (WS-QA / M-QA-01, M-QA-02):
- The @planner must cite the milestone when writing scope
- The @test-engineer must classify tests correctly per TESTING_STRATEGY.md layers
- The @qa-validator (if called) must explicitly route Maestro scripts for the correct flow
- The @release-manager (if called) must cross-check the milestone gate status against AGENTS.md before marking a release-ready status

## Feature Workflow

1. `@solo-orchestrator` — select workflow; Milestone Gate; Autonomy Policy §0; propose track M (or U); open claim ledger
2. `@scout` — context pack (merge into Planner only if the work later collapses to Track S — features usually do not)
3. `@planner` — falsifiable claims + named proofs, files, Jest classification, Maestro/headed requirement
4. Gate A Plan Critics ×2 (identical brief) — fold C/H into spec. Skip = Judge FAIL
5. `@test-designer` — failing proofs / named commands before Builder
6. `@builder` — implementation to green the contract; no self-SHIP
7. Prove (parallel): `@reviewer` (independent model, 0 C/H) + `@test-engineer` (execute contract) + `@qa-validator` (default-on; Maestro PNG-read)
8. `@adversary` — unproven user-visible gaps; Orchestrator runs named proofs now. Skip = Judge FAIL
9. `@quality-judge` — scorecard. PATCH/REWORK/REDESIGN loop, or SHIP. Loop budget M=3 / U=4
10. `@docs-curator` — only after SHIP if canonical docs changed
11. `@release-manager` — only if release readiness is needed
12. Commit: allowed during loops for recovery; user-requested commit after SHIP → push by default

Feature workflow planning must explicitly include:

- target Jest checks for active development (Test Designer contract)
- required regression checks before Judge
- required Maestro/headed validation for user-visible or simulator-sensitive behavior (QA layer, not Test Engineer signoff)
- milestone gate alignment if applicable
- claim ledger rows the Judge will score

## Bug Fix Workflow

1. `@solo-orchestrator` — select workflow; Milestone Gate; Autonomy Policy §0; propose track
2. `@planner` — failure mode, delta elimination, falsifiable claims + proofs (Scout may merge on Track S)
3. Gate A + `@test-designer` on Track M/U — failing regression proof first. Skip Gate A on M/U = Judge FAIL
4. `@builder` — smallest safe fix to green the contract; no self-SHIP
5. Prove: `@reviewer` + `@test-engineer` + `@qa-validator` (default-on unless Judge classified logic-only)
6. `@adversary` on Track M/U
7. `@quality-judge` — loop or SHIP

Bug-fix planning must explicitly state whether the issue is:

- logic-only (Judge must classify; no screen/nav/store-read), or
- runtime-sensitive and requires Maestro/headed proof (QA Validator) in addition to the Test Designer contract

## Refactor Workflow

1. `@solo-orchestrator` — select workflow; Milestone Gate; Autonomy Policy §0; propose track
2. `@planner` — refactor scope, backward compat, proof contract
3. `@reviewer` — pre-check: design risk before implementation (skip only for tiny mechanical refactors)
4. `@test-designer` — parity / regression proofs before Builder
5. `@builder` — implementation per plan; no self-SHIP
6. Prove: `@reviewer` + `@test-engineer` + `@qa-validator` if user-visible / nav (Track M/U default-on)
7. `@adversary` on Track M/U
8. `@quality-judge` — loop or SHIP

## Release Workflow

1. `@solo-orchestrator` — select workflow; Milestone Gate (ALWAYS re-check milestone closure status)
2. `@planner` — only if release scope, impact, or blockers are unclear
3. `@reviewer` — final drift + security + bundle-id/runtimeVersion audit
4. `@test-engineer` — targeted release smoke (Jest + Maestro bootstrap via run-local.sh for evidence)
5. `@qa-validator` — default-on if the release includes user-visible mobile flows
6. `@quality-judge` — SHIP required before release-ready
7. `@docs-curator` — release notes, changelog, runbook updates
8. `@release-manager` — blockers + deployment checklist + rollback plan + post-release checks. READY requires Judge SHIP.

Release Manager hard safety rules (see release-manager.yaml § BUILD ID + SUBMISSION SAFETY RULES):
- Always verify iOS bundle-id match between app.json / eas.json / App Store Connect. Mismatch = Hard Blocker.
- Worker bootstrap + native routing callbacks: rerun-safe (idempotent)? Block on "no".
- App Store PUBLIC release checkbox in ASC: remains a manual human step. Never report "released to users" after submit-only run.

## Hotfix Workflow

1. `@solo-orchestrator` — select workflow; Milestone Gate; Autonomy Policy §0; propose track (often M)
2. `@planner` — fast-path scope + rollback plan included in plan + failing proof
3. `@builder` — smallest targeted fix
4. `@reviewer` — findings-first; speed over depth, but NO Critical findings escape
5. `@test-engineer` — Jest smoke + Test Designer contract
6. `@quality-judge` — SHIP (or PATCH). Do not skip Judge.
7. `@release-manager` — fast deploy + rollback trigger list

## Documentation-only Workflow

1. `@solo-orchestrator` — choose this workflow ONLY when: implementation/code changes = 0, doc-only update (Track S)
2. `@planner` — scope docs to update; which files are canonical vs which can wait
3. `@docs-curator` — update canonical docs exactly as implemented
4. `@reviewer` — verify docs match code/scripts; reject docs that describe unsupported behavior
5. `@quality-judge` — light scorecard; SHIP

## Mandatory Handoff Format

Every agent should use the following handoff structure:

- Goal
- Assumptions
- Files touched or reviewed
- What was done
- Validation plan or validation performed (claim ledger)
- Judge verdict if this is the close handoff
- Risks or gaps (in-scope UNPROVEN blocks SHIP)
- Recommended next agent

## Exit Criteria By Agent

## Scout

Must produce:

- context pack (NOW / ROADMAP / SoT / similar code)
- proposed track S/M/U (Judge confirms later)

## Planner

Must produce:

- scope
- constraints
- likely files
- falsifiable acceptance claims, each with a named proof
- Test Designer contract inputs (Jest layer, Maestro/headed if Track M/U)
- proposed track S/M/U

## Test Designer

Must produce:

- failing proofs or exact named commands before Builder
- headed/Maestro steps when Track M/U touches UI

## Builder

Must produce:

- files changed
- change summary
- validation performed
- remaining validation required
- unresolved risks
- no SHIP claim

## Reviewer

Must produce:

- findings first
- severity ordering
- residual risks if no findings (inputs to Judge — not Done)

## Adversary

Must produce:

- unproven user-visible failure list
- which gaps Orchestrator must prove now vs explicitly out of scope

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

## Quality Judge

Must produce:

- track confirmed (S/M/U)
- scorecard dimensions 0–3
- verdict PATCH | REWORK | REDESIGN | SHIP | ESCALATE
- loop index / budget
- in-scope UNPROVEN list (must be empty for SHIP)

## Recommended SOLO Calling Rules

- Invoke agents with the `@identifier` syntax, NOT display names. Exact identifiers: `@scout`, `@planner`, `@test-designer`, `@builder`, `@reviewer`, `@adversary`, `@test-engineer`, `@qa-validator`, `@quality-judge`, `@release-manager`, `@docs-curator`. Use `SOLO Orchestrator` as entry point.
- Start with `@scout` then `@planner` for any non-trivial request after orchestrator chooses the workflow and track.
- For fuzzy requests: explore 2–3 approaches, then hand structured output to `@planner` for a proof contract.
- For TDD: `@test-designer` / `test-driven-development` **before** `@builder`. Additive, not a replacement for Judge.
- COMMIT vs SHIP: Reviewer 0 C/H before commit. **Quality Judge SHIP** before Done. Order: Prove → Judge SHIP → (user-requested) conventional commit → push by default.
- Keep `@solo-orchestrator` and `@quality-judge` from implementing on Track M/U.
- Track M/U: do not skip Gate A, Adversary, QA, or Judge. There is no “say so” hatch. Track S is illegal if screens/nav/store-read changed.
- If two PATCHes still score below bar, dispatch Shadow Builder / Best-of-N instead of a third cosmetic patch.

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

1. Copy `docs/superpowers/templates/solo-dev-harness/` (or install `~/.cursor/skills/solo-dev-harness/`)
2. Copy this file and `AGENTS.md`
3. Add project overlay skill + `.cursor/rules/` (do **not** extend `.trae/`)
4. Keep portable SOP free of device UDIDs and live-schema human gates

The agent identifiers stay portable. Project specialization lives in rules and the overlay skill.
