# Roadmap Taxonomy Normalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename active roadmap documents, filenames, and cross-references so the repository consistently uses the `WS / M / S` taxonomy while preserving intentional `Wave` and historical `Sprint` references.

**Architecture:** Apply the taxonomy in three passes: first rename the highest-signal roadmap/spec/plan filenames, then normalize content and links across active planning and meta docs, then run a repo-wide exception audit to keep only intentional non-roadmap uses of `stage`, `phase`, and `sprint`. Keep the scope documentation-only and avoid touching task-domain workflow terms or TDD phase labels.

**Tech Stack:** Markdown documentation, repository file moves, ripgrep validation, TypeScript diagnostics only if any doc-linked code references are touched.

---

## File Structure

**Primary files to rename**
- Rename: `docs/superpowers/plans/2026-06-28-post-sprint7-master-roadmap.md`
- Rename: `docs/superpowers/specs/2026-06-29-phase-4b-projects-screen-design.md`
- Rename: `docs/superpowers/plans/2026-06-29-phase-4b-projects-screen-blueprint.md`
- Rename: `docs/superpowers/plans/2026-06-29-phase-4b-projects-screen-implementation.md`
- Rename: `docs/superpowers/specs/2026-06-30-phase-4c-group-b-header-convergence-design.md`
- Rename: `docs/superpowers/plans/2026-06-30-phase-4c-group-b-header-convergence-implementation.md`
- Rename: `docs/superpowers/specs/2026-06-30-phase-4d-photo-update-shortcut-design.md`
- Rename: `docs/superpowers/plans/2026-06-30-phase-4d-photo-update-shortcut-implementation.md`
- Rename: `documentation/ui-migration-foundations-wave1-matrix.md`

**Primary files to modify**
- Modify: `AGENTS.md`
- Modify: `documentation/README.md`
- Modify: `docs/superpowers/specs/2026-06-30-roadmap-taxonomy-normalization-design.md`
- Modify: renamed roadmap/spec/plan files above
- Modify: any active `docs/superpowers/` files that link to the renamed files or reinforce the old lifecycle taxonomy

**Files to inspect but normally leave unchanged**
- `TASK_EDITING_PERMISSIONS.md`
- `docs/superpowers/plans/2026-06-18-dashboard-quick-grid-layout.md`
- `docs/superpowers/plans/2026-06-20-role-model-normalization-plan.md`
- archived docs under `documentation/history/`

## Task 1: Freeze The Rename Inventory And Mapping Table

**Files:**
- Modify: `docs/superpowers/specs/2026-06-30-roadmap-taxonomy-normalization-design.md`
- Create/modify plan notes in `docs/superpowers/plans/2026-06-30-roadmap-taxonomy-normalization-implementation.md`

- [ ] **Step 1: Record the exact old-to-new filename mapping in the implementation plan**

```md
- `docs/superpowers/plans/2026-06-28-post-sprint7-master-roadmap.md`
  -> `docs/superpowers/plans/2026-06-28-ws-roadmap-near-term-execution.md`
- `docs/superpowers/specs/2026-06-29-phase-4b-projects-screen-design.md`
  -> `docs/superpowers/specs/2026-06-29-s-ui-02a-projects-screen-design.md`
- `docs/superpowers/plans/2026-06-29-phase-4b-projects-screen-blueprint.md`
  -> `docs/superpowers/plans/2026-06-29-s-ui-02a-projects-screen-blueprint.md`
- `docs/superpowers/plans/2026-06-29-phase-4b-projects-screen-implementation.md`
  -> `docs/superpowers/plans/2026-06-29-s-ui-02a-projects-screen-implementation.md`
- `docs/superpowers/specs/2026-06-30-phase-4c-group-b-header-convergence-design.md`
  -> `docs/superpowers/specs/2026-06-30-s-ui-02b-group-b-header-convergence-design.md`
- `docs/superpowers/plans/2026-06-30-phase-4c-group-b-header-convergence-implementation.md`
  -> `docs/superpowers/plans/2026-06-30-s-ui-02b-group-b-header-convergence-implementation.md`
- `docs/superpowers/specs/2026-06-30-phase-4d-photo-update-shortcut-design.md`
  -> `docs/superpowers/specs/2026-06-30-s-ui-02c-photo-update-shortcut-design.md`
- `docs/superpowers/plans/2026-06-30-phase-4d-photo-update-shortcut-implementation.md`
  -> `docs/superpowers/plans/2026-06-30-s-ui-02c-photo-update-shortcut-implementation.md`
- `documentation/ui-migration-foundations-wave1-matrix.md`
  -> `documentation/m-fnd-04-ui-migration-wave-matrix.md`
```

- [ ] **Step 2: Verify the source files exist before any rename**

Run:

```bash
test -f docs/superpowers/plans/2026-06-28-post-sprint7-master-roadmap.md
test -f docs/superpowers/specs/2026-06-29-phase-4b-projects-screen-design.md
test -f docs/superpowers/plans/2026-06-29-phase-4b-projects-screen-blueprint.md
test -f docs/superpowers/plans/2026-06-29-phase-4b-projects-screen-implementation.md
test -f docs/superpowers/specs/2026-06-30-phase-4c-group-b-header-convergence-design.md
test -f docs/superpowers/plans/2026-06-30-phase-4c-group-b-header-convergence-implementation.md
test -f docs/superpowers/specs/2026-06-30-phase-4d-photo-update-shortcut-design.md
test -f docs/superpowers/plans/2026-06-30-phase-4d-photo-update-shortcut-implementation.md
test -f documentation/ui-migration-foundations-wave1-matrix.md
```

Expected:

```text
All commands exit with code 0 and produce no output.
```

- [ ] **Step 3: Snapshot current references to the old filenames and old lifecycle labels**

Run:

```bash
rg -n "post-sprint7-master-roadmap|phase-4b|phase-4c|phase-4d|ui-migration-foundations-wave1-matrix|Sprint 4|Phase 4|Stage 2" AGENTS.md documentation docs/superpowers
```

Expected:

```text
Matches appear only in roadmap, plan, spec, and repo-summary docs that are in scope for the rename.
```

- [ ] **Step 4: Commit the mapping freeze if isolated**

```bash
git add docs/superpowers/specs/2026-06-30-roadmap-taxonomy-normalization-design.md docs/superpowers/plans/2026-06-30-roadmap-taxonomy-normalization-implementation.md
git commit -m "docs(roadmap): freeze taxonomy rename mapping"
```

## Task 2: Rename The Highest-Signal Roadmap Filenames

**Files:**
- Rename the nine roadmap/spec/plan files listed in Task 1

- [ ] **Step 1: Rename the master roadmap and recent slice docs**

Run:

```bash
mv docs/superpowers/plans/2026-06-28-post-sprint7-master-roadmap.md docs/superpowers/plans/2026-06-28-ws-roadmap-near-term-execution.md
mv docs/superpowers/specs/2026-06-29-phase-4b-projects-screen-design.md docs/superpowers/specs/2026-06-29-s-ui-02a-projects-screen-design.md
mv docs/superpowers/plans/2026-06-29-phase-4b-projects-screen-blueprint.md docs/superpowers/plans/2026-06-29-s-ui-02a-projects-screen-blueprint.md
mv docs/superpowers/plans/2026-06-29-phase-4b-projects-screen-implementation.md docs/superpowers/plans/2026-06-29-s-ui-02a-projects-screen-implementation.md
mv docs/superpowers/specs/2026-06-30-phase-4c-group-b-header-convergence-design.md docs/superpowers/specs/2026-06-30-s-ui-02b-group-b-header-convergence-design.md
mv docs/superpowers/plans/2026-06-30-phase-4c-group-b-header-convergence-implementation.md docs/superpowers/plans/2026-06-30-s-ui-02b-group-b-header-convergence-implementation.md
mv docs/superpowers/specs/2026-06-30-phase-4d-photo-update-shortcut-design.md docs/superpowers/specs/2026-06-30-s-ui-02c-photo-update-shortcut-design.md
mv docs/superpowers/plans/2026-06-30-phase-4d-photo-update-shortcut-implementation.md docs/superpowers/plans/2026-06-30-s-ui-02c-photo-update-shortcut-implementation.md
mv documentation/ui-migration-foundations-wave1-matrix.md documentation/m-fnd-04-ui-migration-wave-matrix.md
```

Expected:

```text
No output. `git status --short` shows the old paths as renamed into the new taxonomy-aligned paths.
```

- [ ] **Step 2: Verify the renamed files are now present**

Run:

```bash
test -f docs/superpowers/plans/2026-06-28-ws-roadmap-near-term-execution.md
test -f docs/superpowers/specs/2026-06-29-s-ui-02a-projects-screen-design.md
test -f docs/superpowers/plans/2026-06-29-s-ui-02a-projects-screen-blueprint.md
test -f docs/superpowers/plans/2026-06-29-s-ui-02a-projects-screen-implementation.md
test -f docs/superpowers/specs/2026-06-30-s-ui-02b-group-b-header-convergence-design.md
test -f docs/superpowers/plans/2026-06-30-s-ui-02b-group-b-header-convergence-implementation.md
test -f docs/superpowers/specs/2026-06-30-s-ui-02c-photo-update-shortcut-design.md
test -f docs/superpowers/plans/2026-06-30-s-ui-02c-photo-update-shortcut-implementation.md
test -f documentation/m-fnd-04-ui-migration-wave-matrix.md
```

Expected:

```text
All commands exit with code 0 and produce no output.
```

- [ ] **Step 3: Inspect git rename detection before content edits**

Run:

```bash
git status --short
```

Expected:

```text
The nine old paths appear as renames to the nine new paths, with no accidental product-code files changed.
```

- [ ] **Step 4: Commit the pure-rename checkpoint if it remains isolated**

```bash
git add docs/superpowers/plans docs/superpowers/specs documentation/m-fnd-04-ui-migration-wave-matrix.md
git commit -m "docs(roadmap): rename roadmap artifacts to ws-m-s taxonomy"
```

## Task 3: Normalize Content Inside Renamed Roadmap And Slice Docs

**Files:**
- Modify: `docs/superpowers/plans/2026-06-28-ws-roadmap-near-term-execution.md`
- Modify: `docs/superpowers/specs/2026-06-29-s-ui-02a-projects-screen-design.md`
- Modify: `docs/superpowers/plans/2026-06-29-s-ui-02a-projects-screen-blueprint.md`
- Modify: `docs/superpowers/plans/2026-06-29-s-ui-02a-projects-screen-implementation.md`
- Modify: `docs/superpowers/specs/2026-06-30-s-ui-02b-group-b-header-convergence-design.md`
- Modify: `docs/superpowers/plans/2026-06-30-s-ui-02b-group-b-header-convergence-implementation.md`
- Modify: `docs/superpowers/specs/2026-06-30-s-ui-02c-photo-update-shortcut-design.md`
- Modify: `docs/superpowers/plans/2026-06-30-s-ui-02c-photo-update-shortcut-implementation.md`
- Modify: `documentation/m-fnd-04-ui-migration-wave-matrix.md`

- [ ] **Step 1: Update document titles and headings to the new taxonomy**

```md
# WS Roadmap Near-Term Execution Plan

## M-DATA-01: Cache Authority & Sync Hardening
## M-SEC-01: Security & Worktree Sanitization
## M-DATA-02: Core Model Unification & Debt Elimination
## M-UI-02: Wave 2 UI Migration & Selector Adoption

# S-UI-02A ProjectsScreen Design
# S-UI-02A ProjectsScreen Implementation Plan
# S-UI-02B Group B Header Convergence Design
# S-UI-02B Group B Header Convergence Implementation Plan
# S-UI-02C Photo Update Shortcut Design
# S-UI-02C Photo Update Shortcut Implementation Plan

# M-FND-04 UI Migration Wave Matrix
```

- [ ] **Step 2: Reword the lifecycle references without erasing historical context**

```md
- Replace active roadmap phrases like `Stage 2`, `Phase 4`, and `Phase 4B` with `M-DATA-01`, `M-UI-02`, and `S-UI-02A`.
- Keep historical context as explanatory text, for example:
  - `historically closed during Sprint 4`
  - `this slice followed S-UI-02A`
- Keep `Wave 1` and `Wave 2` only when referring to migration cohorts.
```

- [ ] **Step 3: Update summary sections so they list both completed and pipeline work under WS/M/S**

```md
Completed:
- `WS-FND / M-FND-01` Reliability & Data Integrity
- `WS-FND / M-FND-02` Store Performance & Request Deduplication
- `WS-FND / M-FND-03` Workspace Automation & Script Cleanup
- `WS-FND / M-FND-04` UI Migration Foundations
- `WS-UI / M-UI-02 / S-UI-02A` ProjectsScreen migration
- `WS-UI / M-UI-02 / S-UI-02B` Group B header convergence
- `WS-UI / M-UI-02 / S-UI-02C` Photo update shortcut

Pipeline:
- `WS-DATA / M-DATA-01` Cache authority & sync hardening
- `WS-SEC / M-SEC-01` Security & worktree sanitization
- `WS-DATA / M-DATA-02` Core model unification
- `WS-AUTHZ / M-AUTHZ-01` Role model normalization
- `WS-UI / M-UI-03` Batch A
- `WS-UI / M-UI-04` Batch B
- `WS-UI / M-UI-05` Batch C
- `WS-UI / M-UI-06` Photo screens modernization remainder
- `WS-UI / M-UI-07` CreateTaskScreen full modernization completion
- `WS-DEVEX / M-DEVEX-01` Workspace loop & simulation tests
- `WS-QA / M-QA-01` User testing rubric execution
```

- [ ] **Step 4: Run a focused grep to verify the renamed docs no longer use lifecycle `phase/stage` as active hierarchy labels**

Run:

```bash
rg -n "\b(Stage|Phase|Sprint)\b" \
  docs/superpowers/plans/2026-06-28-ws-roadmap-near-term-execution.md \
  docs/superpowers/specs/2026-06-29-s-ui-02a-projects-screen-design.md \
  docs/superpowers/plans/2026-06-29-s-ui-02a-projects-screen-blueprint.md \
  docs/superpowers/plans/2026-06-29-s-ui-02a-projects-screen-implementation.md \
  docs/superpowers/specs/2026-06-30-s-ui-02b-group-b-header-convergence-design.md \
  docs/superpowers/plans/2026-06-30-s-ui-02b-group-b-header-convergence-implementation.md \
  docs/superpowers/specs/2026-06-30-s-ui-02c-photo-update-shortcut-design.md \
  docs/superpowers/plans/2026-06-30-s-ui-02c-photo-update-shortcut-implementation.md \
  documentation/m-fnd-04-ui-migration-wave-matrix.md
```

Expected:

```text
Only intentional historical `Sprint` mentions or explicitly preserved non-roadmap uses remain.
```

- [ ] **Step 5: Commit the content-normalization checkpoint**

```bash
git add docs/superpowers/plans/2026-06-28-ws-roadmap-near-term-execution.md docs/superpowers/specs/2026-06-29-s-ui-02a-projects-screen-design.md docs/superpowers/plans/2026-06-29-s-ui-02a-projects-screen-blueprint.md docs/superpowers/plans/2026-06-29-s-ui-02a-projects-screen-implementation.md docs/superpowers/specs/2026-06-30-s-ui-02b-group-b-header-convergence-design.md docs/superpowers/plans/2026-06-30-s-ui-02b-group-b-header-convergence-implementation.md docs/superpowers/specs/2026-06-30-s-ui-02c-photo-update-shortcut-design.md docs/superpowers/plans/2026-06-30-s-ui-02c-photo-update-shortcut-implementation.md documentation/m-fnd-04-ui-migration-wave-matrix.md
git commit -m "docs(roadmap): normalize roadmap content to ws-m-s taxonomy"
```

## Task 4: Update Cross-Repo References And Inventory Docs

**Files:**
- Modify: `AGENTS.md`
- Modify: `documentation/README.md`
- Modify: any active `docs/superpowers/` file that links to renamed roadmap docs

- [ ] **Step 1: Update AGENTS.md delivery history and next-step language**

```md
- `Sprint 4 - UI Migration Foundations`
  becomes
  `WS-FND / M-FND-04 - UI Migration Foundations (historically closed during Sprint 4)`
- `Validation completed during Phase 3`
  becomes
  `Validation completed during the third delivery slice of M-FND-04`
- `Phase 4 staging`
  becomes
  `post-milestone staging`
```

- [ ] **Step 2: Update documentation/README.md to point to the renamed migration matrix**

```md
- [m-fnd-04-ui-migration-wave-matrix.md](./m-fnd-04-ui-migration-wave-matrix.md) - Current M-FND-04 UI migration wave reference while active
```

- [ ] **Step 3: Update any in-scope links that still point at old filenames**

Run:

```bash
rg -n "2026-06-28-post-sprint7-master-roadmap|2026-06-29-phase-4b|2026-06-30-phase-4c|2026-06-30-phase-4d|ui-migration-foundations-wave1-matrix" AGENTS.md documentation docs/superpowers
```

Expected:

```text
The output is empty outside the intentional old-to-new mapping references kept in this taxonomy implementation plan and spec.
```

- [ ] **Step 4: Commit the cross-reference update checkpoint**

```bash
git add AGENTS.md documentation/README.md docs/superpowers documentation
git commit -m "docs(roadmap): update repository references to ws-m-s artifacts"
```

## Task 5: Repo-Wide Exception Audit And Final Verification

**Files:**
- Verify: `AGENTS.md`
- Verify: `documentation/README.md`
- Verify: renamed roadmap/spec/plan files
- Inspect but do not automatically modify exception candidates outside active roadmap scope

- [ ] **Step 1: Run the final repo-wide lifecycle-term scan**

Run:

```bash
rg -n "\b(Stage|Phase|Sprint|Wave)\b" AGENTS.md documentation docs/superpowers
```

Expected:

```text
Matches are limited to:
- intentional `Wave 1` / `Wave 2` cohort labels
- intentional historical `Sprint` references
- excluded domain or TDD uses that were explicitly preserved
```

- [ ] **Step 2: Review the remaining matches and classify each as keep or fix**

```md
Keep:
- task-domain workflow stages
- TDD red/green phase wording
- agent lifecycle gates and repository process phases
- plan-local sequencing phases inside one implementation plan
- named sandbox, fixture, and example labels that include sprint numbers
- historical sprint chronology when used as context only
- UI migration wave labels as cohort metadata

Fix:
- any remaining active roadmap heading or queue item that still uses `Stage` or `Phase`
- any link text or filename reference that still points to the old file names
```

- [ ] **Step 3: Inspect the final diff and ensure only documentation files changed**

Run:

```bash
git status --short
git diff -- AGENTS.md documentation docs/superpowers
```

Expected:

```text
Only approved documentation files are changed or renamed.
```

- [ ] **Step 4: Run diagnostics only if any non-markdown files were touched; otherwise skip and record that no diagnostics were required**

```text
No diagnostics run is required if the change set remains markdown-only.
```

- [ ] **Step 5: Create the final checkpoint commit**

```bash
git add AGENTS.md documentation docs/superpowers
git commit -m "docs(roadmap): complete ws-m-s taxonomy normalization"
```

## Self-Review

**Spec coverage**
- WS/M/S rules, rename scope, exclusions, file strategy, and mapping are covered by Tasks 1 through 5.
- Both completed work and remaining pipeline work are explicitly re-rendered under the new taxonomy in Task 3.
- Exception handling for preserved terms is covered by Task 5.

**Placeholder scan**
- no `TODO`, `TBD`, or unresolved “implement later” instructions remain
- every task includes exact files, commands, or concrete replacement text

**Type consistency**
- all renamed files use the same `WS / M / S` taxonomy
- `Wave` remains a cohort label only
- `Sprint` remains historical context only
