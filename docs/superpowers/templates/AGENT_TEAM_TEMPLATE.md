# Reusable Agent Team Template

Use this template to bootstrap the ultra-quality SOLO loop in future repositories. **Do not extend `.trae/`.**

## Step 1: Copy The Portable Cycle

Copy:

- `docs/superpowers/templates/solo-dev-harness/SOP.md` + `templates/` (scorecard, tracks, claim ledger, Judge handoff, shared brief)
- or install `~/.cursor/skills/solo-dev-harness/`
- `SOLO_OPERATING_PROCEDURE.md`
- `AGENTS.md` (then overlay project milestones)

## Step 2: Create The Project Overlay

Add or adapt:

- `AGENTS.md` (stack, SoT paths, milestone status)
- `.cursor/rules/` (project law)
- `.cursor/skills/<project>-dev/` (overlay — device caps, schema human gates)

## Default Team (quality loop)

Band 0 — control (never implements):

- `SOLO Orchestrator` (`@solo-orchestrator`) — track, claim ledger, loop budget
- `Quality Judge` (`@quality-judge`) — **only SHIP owner**

Band 1 — specify:

- `Scout` (`@scout`) — context pack; merge into Planner on Track S
- `Planner` (`@planner`) — falsifiable claims + proofs
- Plan Critics ×2 (Gate A) — identical shared brief
- `Test Designer` (`@test-designer`) — failing proofs before Builder

Band 2 — implement:

- `Builder` (`@builder`) — no self-SHIP
- Shadow Builder / Best-of-N — Track U or after weak first impl

Band 3 — prove:

- `Reviewer` (`@reviewer`) — independent model, 0 C/H
- `Adversary` (`@adversary`) — named gaps must be proven
- `Test Engineer` (`@test-engineer`) — executes the Test Designer contract
- `QA Validator` (`@qa-validator`) — Track M/U default-on

Band 4 — after SHIP:

- `Docs Curator` (`@docs-curator`)
- `Release Manager` (`@release-manager`)

## Track S (small) only

Planner+Scout merged, Builder, Reviewer, Test Engineer, Judge. Illegal if screens, navigation, or a store screens read changed.

## Anti-Patterns

Avoid these mistakes:

- putting all project context directly into every agent prompt
- letting `Builder` both plan and SHIP
- using the orchestrator as the main coder on Track M/U
- using `Reviewer` only for style feedback
- skipping Gate A / Adversary / QA / Judge on Track M/U with “say so”
- treating residual risks or a commit as Done
- stopping after one pass when the scorecard is below bar
