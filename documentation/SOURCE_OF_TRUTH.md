# Documentation Source Of Truth

## Purpose

This document is the master governance file for Markdown documentation in this repository.

It defines:

- which documents are canonical
- how Markdown files should be classified
- which folders are intended for stable reference versus active planning
- how obsolete or superseded documents should be handled
- who is responsible for keeping documentation organized over time

This file is the authoritative source of truth for documentation governance.

If this document conflicts with implemented code or configuration, trust the code and update this document.

## Authority Rule

Resolve documentation conflicts in this order:

1. **Code and live configuration**
   - `src/`
   - `app.json`
   - `package.json`
   - `eas.json`
   - build scripts
   - patches

2. **This file**
   - `documentation/SOURCE_OF_TRUTH.md`

3. **Canonical documents explicitly promoted here**
   - stable product, architecture, workflow, and runbook references

4. **Active design and planning artifacts**
   - `docs/superpowers/specs/`
   - `docs/superpowers/plans/`

5. **Historical, troubleshooting, incident, and superseded notes**
   - reference-only unless explicitly promoted here

## Documentation Stewardship

### Primary Owner

The **Docs Curator** is the primary steward of this document and the documentation hierarchy it defines.

### Ownership Scope

The Docs Curator is responsible for:

- maintaining this file as the canonical documentation-governance reference
- keeping the documentation hierarchy current as the repository evolves
- promoting important implementation-aligned documents into canonical locations
- distinguishing between:
  - canonical source-of-truth documents
  - active plans and specs
  - operational runbooks
  - historical or incident-specific notes
- reducing duplication and preventing contradictory documentation from becoming authoritative
- moving obsolete or superseded Markdown files into history/archive locations when appropriate
- updating indexes and cross-links when canonical document locations change

### Ongoing Stewardship Requirement

Markdown curation is an ongoing repository responsibility, not a one-time cleanup.

The Docs Curator must perform documentation maintenance whenever necessary, including when:

- a new canonical document is introduced
- implemented behavior changes and a canonical doc becomes stale
- a planning or spec document becomes completed and should be promoted, retained as working history, or archived
- a troubleshooting or incident note is clearly obsolete or superseded
- the root of the repository begins to accumulate unmanaged documentation drift
- new folders or document classes are introduced

### Workflow Responsibility

For non-trivial documentation-governance changes, the default workflow is:

`Planner -> Docs Curator -> Reviewer`

Responsibilities:

- **Planner** defines scope, affected docs, and migration or cleanup approach
- **Docs Curator** updates and reorganizes the documentation set
- **Reviewer** checks consistency, classification, and alignment with current repository reality

## Repository Documentation Hierarchy

### 1. Code And Configuration Truth

These are always the final authority for implemented behavior:

- `src/`
- `app.json`
- `package.json`
- `eas.json`
- root build scripts
- patch files

Documentation must be updated to match these files, not the other way around.

### 2. Canonical Governance And Repository Context

These documents define how the repository should be interpreted and maintained:

- [SOURCE_OF_TRUTH.md](file:///Volumes/KooDrive/Insite%20App/documentation/SOURCE_OF_TRUTH.md)
- [AGENTS.md](file:///Volumes/KooDrive/Insite%20App/AGENTS.md)
- [README.md](file:///Volumes/KooDrive/Insite%20App/README.md)

### 3. Canonical Product And Domain References

These are the primary human-readable references for current implementation-aligned behavior:

- [INSITE_APP_LATEST.md](file:///Volumes/KooDrive/Insite%20App/documentation/INSITE_APP_LATEST.md)
- [BUG_INVENTORY.md](file:///Volumes/KooDrive/Insite%20App/documentation/BUG_INVENTORY.md)
- [role-permission-matrix.md](file:///Volumes/KooDrive/Insite%20App/documentation/role-permission-matrix.md)
- [m-fnd-04-ui-migration-wave-matrix.md](file:///Volumes/KooDrive/Insite%20App/documentation/m-fnd-04-ui-migration-wave-matrix.md)

### 4. Canonical Operational Documentation

The `documentation/` folder is the primary home for stable operational runbooks and implementation-aligned reference docs.

Primary index:

- [documentation/README.md](file:///Volumes/KooDrive/Insite%20App/documentation/README.md)

Typical content:

- build and release guides
- local build instructions
- dependency and environment notes
- implementation-aligned operational references

### 5. Active Working Documents

These are active design and planning artifacts, not implementation truth:

- `docs/superpowers/specs/`
- `docs/superpowers/plans/`

Rules:

- keep them for planning history and execution context
- do not treat them as canonical behavior docs unless explicitly promoted
- when a planning artifact becomes enduring reference material, promote the distilled outcome into `documentation/`

### 6. Historical And Superseded Documents

Historical, incident-specific, and superseded Markdown documents should be moved out of primary discovery paths and retained in history/archive locations.

Preferred locations:

- `documentation/history/`
- `documentation/history/incidents/`
- `documentation/history/releases/`
- `documentation/history/superseded/`
- `documentation/history/analysis/`

Rules:

- retain them for auditability and institutional memory
- do not allow them to compete with canonical docs
- keep filenames stable where helpful, but move them under a history structure

## Document Classes

Every Markdown file should be classified into one of these classes.

### Canonical

A document is canonical if it:

- describes current implemented behavior, workflow, or governance
- is expected to remain valid beyond a single task or incident
- is the intended first-stop reference for its topic

Canonical docs belong in:

- repo root only if they are top-level governance or entrypoint docs
- otherwise `documentation/`

### Active Plan Or Spec

A document is an active plan or spec if it:

- describes intended or approved work
- is tied to a delivery effort, sprint, migration, or execution sequence
- may become stale after implementation completes

These belong in:

- `docs/superpowers/specs/`
- `docs/superpowers/plans/`

### Operational Runbook

A document is an operational runbook if it:

- explains how to perform a recurring operational task
- supports build, release, submission, environment, debugging, or recovery workflows
- remains useful as long as the operational process remains current

These should live in:

- `documentation/`

### Historical / Incident / Superseded

A document belongs in history if it:

- captures a one-off issue, fix investigation, or incident analysis
- has been replaced by a stronger canonical document
- is useful for reference but should no longer guide normal work

These should live in:

- `documentation/history/`

## Classification Rules For New Markdown Files

When adding a new `.md` file:

1. Prefer updating an existing canonical document over creating a new one.
2. If a new durable reference is required, place it in `documentation/`.
3. If the file is tied to a specific implementation effort, place it in `docs/superpowers/specs/` or `docs/superpowers/plans/`.
4. If the file records a one-time issue or completed investigation, place it in `documentation/history/` instead of the repo root.
5. Avoid creating new root-level `.md` files unless the file is:
   - a repo entrypoint
   - governance-critical
   - intentionally top-level for discoverability

## Archive And History Policy

The current archive policy is **conservative**.

That means:

- move only clearly obsolete, superseded, incident-specific, or one-off docs into history
- leave borderline documents in place temporarily, but classify them clearly
- prefer reclassification before aggressive deletion or relocation

When a document should move to history:

- it has been superseded by a canonical document
- it documents a one-time fix or investigation
- it reflects migration-era or cleanup-era context no longer needed as current guidance
- it duplicates a stronger implementation-aligned doc in `documentation/`

When a document should stay active:

- it still aligns with current implementation
- it is still used as a recurring runbook
- it is the current stable reference for its topic

## Current Canonical Document Registry

### Repository Entry And Governance

- [README.md](file:///Volumes/KooDrive/Insite%20App/README.md)
  - top-level repo landing page
- [AGENTS.md](file:///Volumes/KooDrive/Insite%20App/AGENTS.md)
  - repository-local agent inventory and workflow context
- [ROADMAP.md](file:///Volumes/KooDrive/Insite%20App/documentation/ROADMAP.md)
  - single canonical WS/M/S milestone inventory and execution order
- [SOURCE_OF_TRUTH.md](file:///Volumes/KooDrive/Insite%20App/documentation/SOURCE_OF_TRUTH.md)
  - documentation-governance authority

### Product And Implementation Truth

- [INSITE_APP_LATEST.md](file:///Volumes/KooDrive/Insite%20App/documentation/INSITE_APP_LATEST.md)
  - consolidated current product description
- [role-permission-matrix.md](file:///Volumes/KooDrive/Insite%20App/documentation/role-permission-matrix.md)
  - current normalized role and permission reference
- [m-fnd-04-ui-migration-wave-matrix.md](file:///Volumes/KooDrive/Insite%20App/documentation/m-fnd-04-ui-migration-wave-matrix.md)
  - current `WS-FND / M-FND-04` UI migration wave reference

### Operational Documentation Hub

- [documentation/README.md](file:///Volumes/KooDrive/Insite%20App/documentation/README.md)
  - primary documentation hub for stable operational docs

### Validation And Process References

- [TESTING_STRATEGY.md](file:///Volumes/KooDrive/Insite%20App/TESTING_STRATEGY.md)
  - testing strategy reference
- [CI_WORKFLOWS.md](file:///Volumes/KooDrive/Insite%20App/CI_WORKFLOWS.md)
  - CI workflow reference
- [SOLO_OPERATING_PROCEDURE.md](file:///Volumes/KooDrive/Insite%20App/SOLO_OPERATING_PROCEDURE.md)
  - operator workflow reference, if still aligned with the current agent system

## Current Active Working-Docs Registry

These are current working-doc locations and should remain outside the canonical hierarchy unless promoted:

- `docs/superpowers/specs/`
- `docs/superpowers/plans/`
- `docs/superpowers/prompts/`
- `docs/superpowers/templates/`
- `docs/superpowers/WORKFLOW_TEMPLATES.md`

## Current Likely History Candidates

These categories are likely history/archive material unless they are still actively used:

- root-level one-off `*_FIX.md`
- root-level one-off `*_ANALYSIS.md`
- root-level one-off `*_SUMMARY.md`
- completed `*_PLAN.md`
- completed `*_STATUS.md`
- incident-specific user or project investigation notes
- duplicated build, store, keystore, and troubleshooting notes that are already superseded by stronger docs in `documentation/`

This section is intentionally category-based. Individual files should be moved conservatively after review.

## When This File Must Be Updated

Update this file whenever any of the following happens:

- a new canonical document is introduced
- a canonical document is retired, moved, or replaced
- a new documentation folder is added
- a major working-doc area changes purpose
- archive/history structure is added or changed
- a document is promoted from working history into canonical status
- a root-level document is reclassified as historical or superseded

## Expectations For Agents And Contributors

All agents and contributors should treat this file as the entry point for documentation governance.

When changing or adding Markdown files:

- check whether an existing canonical document should be updated instead
- avoid creating duplicate truths
- keep implementation-aligned docs in stable locations
- keep planning docs in planning folders
- keep obsolete docs out of the primary discovery path

## Current Cleanup Direction

The repository currently has a large root-level Markdown footprint with mixed purposes:

- some files are still useful
- many are historical or incident-specific
- several compete with more stable docs in `documentation/`

The active curation direction is:

1. maintain canonical governance and reference docs
2. keep durable operational docs in `documentation/`
3. keep active plans/specs in `docs/superpowers/`
4. keep prompts and templates in `docs/superpowers/prompts/` and `docs/superpowers/templates/`
5. move clearly obsolete docs into `documentation/history/`
6. keep the repo root limited to high-value entrypoint and governance docs

## Summary

This file is the master documentation-governance source of truth.

Use it to determine:

- where a Markdown file belongs
- whether a document is canonical, active, operational, or historical
- who is responsible for maintaining the hierarchy
- how documentation should evolve as the implementation evolves

The governing principle is simple:

- trust the code for implemented truth
- use this file for documentation governance
- keep canonical docs curated
- archive obsolete docs instead of letting them compete with current guidance
