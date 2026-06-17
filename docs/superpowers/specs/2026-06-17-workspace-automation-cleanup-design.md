# Workspace Automation Cleanup Design

## Goal

Create a repeatable local developer loop that keeps the repository's active automation easy to find, archives stale helpers out of the main workspace, and aligns local validation with the current GitHub Actions guardrails.

## Scope

This pass covers:

- auditing custom helper and automation scripts in the repository root and `scripts/`
- validating likely-active scripts against the current local environment, including paths with spaces
- moving obsolete, redundant, or broken scripts into `scripts/archive/`
- adding a reusable local shell utility for the core development loop
- documenting the surviving active tools, archived items, and the exact local command to use

This pass does not cover:

- changing mobile runtime code or app behavior
- changing CI workflow behavior unless a mismatch is discovered during audit
- restructuring backend/admin recovery scripts unless they are clearly stale or duplicated

## Constraints

- Preserve working production and release helpers unless they are clearly non-functional or duplicated.
- Prefer small, reversible edits that fit the existing repository style.
- Keep path handling safe for the repository location `/Volumes/KooDrive/Insite App`.
- Mirror current CI expectations for validation: local success should include `npx tsc --noEmit` and `npm run test:regression`.
- Avoid destructive script validation; use bounded, read-only, or no-op checks where possible.

## Audit Strategy

The audit classifies each discovered script into one of three buckets:

- `Active production tool`: still useful in the current workflow and not obviously superseded
- `Legacy/stale artifact`: tied to old build paths, old flags, or a retired manual process
- `Duplicate logic`: overlaps with another clearer or better-maintained script and adds noise

Each script entry returned to the user will include:

- exact file path
- one-sentence purpose summary
- structural health status

## Validation Strategy

Only scripts relevant to the modern local workflow will be executed. Validation will focus on:

- root build/deploy helpers
- `scripts/` utilities that support build validation or release operations
- the proposed consolidated local loop utility

Validation methods will prefer:

- `bash -n` or equivalent syntax checks
- help/no-op invocations when available
- bounded dry-run style execution where safe

Potentially destructive admin or data-repair scripts will be inspected but not run.

## Archive Strategy

Create `scripts/archive/` at the repository root and move only scripts that meet at least one of these conditions:

- broken by current environment assumptions and not worth repairing
- clearly obsolete for the 2026 local workflow
- duplicated by another surviving script with the same purpose

Archived items remain in-repo for historical reference but are removed from the main working view.

## Local Loop Design

Add a small shell utility under `scripts/` that performs the primary local loop:

1. verify git working tree status and current branch context
2. run `npx tsc --noEmit`
3. run `npm run test:regression`
4. push the current branch only if validation succeeds

The script should be written so it can be invoked as a single command from repo root and should fail fast on the first error.

## CI Alignment Check

The resulting local loop must match the active GitHub Actions expectations:

- local validation includes TypeScript checking, which is stricter than CI and therefore acceptable
- regression coverage uses `npm run test:regression`, which is already part of PR and post-merge CI
- the push step remains local-only and does not change CI semantics

If the audit reveals a local-vs-CI mismatch, document it and adjust the local loop to stay compatible with current workflows.

## Expected Deliverables

- audited tooling inventory
- `scripts/archive/` with stale or duplicate utilities moved out of the primary view
- one reusable local loop shell utility
- final markdown summary with active tooling, archive log, and exact command to run
