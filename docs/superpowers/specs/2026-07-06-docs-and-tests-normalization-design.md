# Docs And Tests Normalization Design

**Date:** 2026-07-06  
**Status:** Proposed and approved for normalization pass  
**Scope:** Align active audit notes, active design/plan docs, and active tests with the latest accepted UI/UX direction already reflected in `docs/INSITE_UI_UX_SOURCE_OF_TRUTH.md`.

## Goal

Normalize the active repository so future prompts, reviews, and implementation work do not keep tripping over stale references to superseded UI/UX behavior.

This pass is documentation-and-test normalization only. It is not a new product redesign.

## Approved Direction To Normalize Around

The canonical direction now is:

- `Activity` remains a triage surface
- `Drafts` belong on `Tasks`, not `Activity`
- `Tasks` uses direct-open summary cards/rows rather than inline expansion
- `Task Detail` uses a unified visual work-thread model
- delegation/evidence/subtask context does not require separate pinned summary surfaces
- filtering on `Tasks` may use lightweight in-screen controls rather than a required dedicated filter sheet

## In Scope

- update `ui-ux-source-of-truth-audit-2026-07-06.md`
- update active `docs/superpowers` specs/plans that still describe the superseded interaction model
- update active tests that still assert stale expectations against the approved model

## Out Of Scope

- changing historical worktree mirrors under `.worktrees/`
- redesigning current implementation behavior
- adding new product functionality
- refactoring unrelated test structure

## Target Files

Expected primary targets:

- `ui-ux-source-of-truth-audit-2026-07-06.md`
- `docs/superpowers/specs/2026-07-04-tasks-queue-dashboard-correction-design.md`
- `docs/superpowers/plans/2026-07-04-activity-tasks-correction-implementation.md`
- `docs/superpowers/plans/2026-07-06-dashboard-compact-activity-and-drafts-relocation.md`
- `src/screens/__tests__/TasksScreen.test.tsx`

Secondary files may be updated if they are active references and still contradict the canonical doc.

## Approach Options Considered

### Option 1: Minimal normalization only

- update the active audit note
- update active living plans/specs
- update active tests
- leave worktree snapshots untouched

Pros:

- keeps active branch coherent
- avoids noisy branch-history churn
- fixes the highest-value contradictions quickly

Cons:

- old worktree mirrors still contain superseded wording

### Option 2: Docs-only cleanup

- update audit and stale docs
- leave tests unchanged

Pros:

- lowest risk

Cons:

- active tests continue to encode contradictory expectations

### Option 3: Full normalization everywhere

- update active repo plus mirrored worktree copies

Pros:

- most exhaustive

Cons:

- high churn
- unnecessary for active branch work

## Selected Approach

Use **Option 1: Minimal normalization only**.

This gives the active branch one coherent story without rewriting every historical copy.

## Planned Edits

## 1. Audit Note Update

Change the audit from:

- reporting intentional `Tasks` and `Task Detail` choices as misalignment

To:

- recognizing those areas as aligned with the newly updated canonical doc
- preserving only genuine remaining gaps such as unfinished alternate global capture routing and any still-unwired critical-date entry details

## 2. Spec / Plan Updates

Update active planning artifacts so they no longer prescribe:

- compact 2-line task rows as a must
- inline photo-centric expansion on `Tasks`
- a required top-level filter button and modal filter sheet
- critical-date entry from an expanded task row/card
- `Drafts` living on `Activity`

Replace with the latest accepted language:

- direct-open task summary cards/rows
- unified `Task Detail`
- drafts on `Tasks`
- lightweight contextual filtering controls
- critical-date entry centered on `Task Detail` and create/edit support

## 3. Test Updates

Normalize tests so they assert the current approved branch behavior.

For `TasksScreen` tests:

- keep drafts-under-`Tasks` expectations where those elements are intentionally present
- remove or rewrite stale expectations that were written as mismatch evidence against the canonical doc

## Validation Plan

- search for stale phrases after edits
- run the smallest relevant targeted tests
- confirm active docs no longer contradict `docs/INSITE_UI_UX_SOURCE_OF_TRUTH.md`

## Risks

- some older plan docs may intentionally preserve historical intent; over-editing them could erase useful history
- tests may expose real implementation gaps rather than wording-only drift

## Mitigation

- limit updates to active, still-referenced docs
- preserve historical context where helpful, but clearly mark superseded wording
- keep validation targeted and explicit
