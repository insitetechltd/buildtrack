# Phase 1 Canonical Governance Docs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align the repository's canonical governance documents so the documented hierarchy, agent inventory, and first-stop doc entry points match the current roadmap and local agent pack.

**Architecture:** This is a documentation-governance cleanup, not a product-behavior change. The work updates the canonical registry in `documentation/SOURCE_OF_TRUTH.md`, improves doc discoverability in the root and documentation READMEs, and refreshes `AGENTS.md` so it reflects the actual `.trae/agents/` pack and current roadmap state.

**Tech Stack:** Markdown, git, repository governance docs

---

### Task 1: Re-register The Canonical Doc Ladder

**Files:**
- Modify: `documentation/SOURCE_OF_TRUTH.md`
- Reference: `documentation/ROADMAP.md`
- Reference: `docs/INSITE_UI_UX_SOURCE_OF_TRUTH.md`
- Reference: `documentation/UI_ARCHITECTURE.md`
- Reference: `documentation/BUG_INVENTORY.md`
- Reference: `SOLO_OPERATING_PROCEDURE.md`

- [ ] **Step 1: Review the current canonical registry and the current roadmap/UI hierarchy**

Read:

```bash
sed -n '106,170p' documentation/SOURCE_OF_TRUTH.md
sed -n '259,320p' documentation/SOURCE_OF_TRUTH.md
sed -n '63,70p' documentation/ROADMAP.md
sed -n '21,63p' docs/INSITE_UI_UX_SOURCE_OF_TRUTH.md
```

Expected: confirm that `SOURCE_OF_TRUTH.md` omits `docs/INSITE_UI_UX_SOURCE_OF_TRUTH.md` and `documentation/UI_ARCHITECTURE.md` from the canonical registry.

- [ ] **Step 2: Update the canonical governance and product-reference sections**

Edit `documentation/SOURCE_OF_TRUTH.md` so these sections explicitly include:

```md
### 2. Canonical Governance And Repository Context

These documents define how the repository should be interpreted and maintained:

- `documentation/SOURCE_OF_TRUTH.md`
- `documentation/ROADMAP.md`
- `AGENTS.md`
- `SOLO_OPERATING_PROCEDURE.md`
- `README.md`

### 3. Canonical Product, UX, Architecture, And Domain References

These are the primary human-readable references for current implementation-aligned behavior and approved target-state direction:

- `docs/INSITE_UI_UX_SOURCE_OF_TRUTH.md`
- `documentation/UI_ARCHITECTURE.md`
- `documentation/INSITE_APP_LATEST.md`
- `documentation/BUG_INVENTORY.md`
- `documentation/role-permission-matrix.md`
- `documentation/m-fnd-04-ui-migration-wave-matrix.md`
```

- [ ] **Step 3: Update the current canonical document registry**

Edit the registry in `documentation/SOURCE_OF_TRUTH.md` so the canonical ladder is explicit:

```md
### Repository Entry And Governance

- `README.md`
- `AGENTS.md`
- `SOLO_OPERATING_PROCEDURE.md`
- `documentation/SOURCE_OF_TRUTH.md`
- `documentation/ROADMAP.md`

### Product, UX, Architecture, And Domain Truth

- `docs/INSITE_UI_UX_SOURCE_OF_TRUTH.md`
- `documentation/UI_ARCHITECTURE.md`
- `documentation/INSITE_APP_LATEST.md`
- `documentation/BUG_INVENTORY.md`
- `documentation/role-permission-matrix.md`
- `documentation/m-fnd-04-ui-migration-wave-matrix.md`
```

Also remove the conditional wording on `SOLO_OPERATING_PROCEDURE.md` so it is classified decisively as current.

- [ ] **Step 4: Review the edited file**

Run:

```bash
git diff -- documentation/SOURCE_OF_TRUTH.md
```

Expected: the diff shows the canonical ladder and registry now include roadmap, UX source of truth, UI architecture, and SOP without conditional authority language.

### Task 2: Improve First-Stop Discoverability

**Files:**
- Modify: `documentation/README.md`
- Modify: `README.md`
- Reference: `documentation/SOURCE_OF_TRUTH.md`
- Reference: `documentation/ROADMAP.md`
- Reference: `docs/INSITE_UI_UX_SOURCE_OF_TRUTH.md`
- Reference: `documentation/UI_ARCHITECTURE.md`

- [ ] **Step 1: Review the current doc hubs**

Run:

```bash
sed -n '1,60p' documentation/README.md
sed -n '19,35p' README.md
```

Expected: confirm the current hubs do not clearly expose the full canonical ladder.

- [ ] **Step 2: Update `documentation/README.md` to show the canonical read order**

Add a short section near the top like:

```md
## Canonical Read Order

For repository-wide orientation, read these in order:

1. `documentation/SOURCE_OF_TRUTH.md`
2. `documentation/ROADMAP.md`
3. `docs/INSITE_UI_UX_SOURCE_OF_TRUTH.md`
4. `documentation/UI_ARCHITECTURE.md`
5. `documentation/INSITE_APP_LATEST.md`
6. `documentation/BUG_INVENTORY.md`
```

Also add `UI_ARCHITECTURE.md` and `docs/INSITE_UI_UX_SOURCE_OF_TRUTH.md` to the canonical references list.

- [ ] **Step 3: Update the root `README.md` to point readers to the true canonical stack**

Adjust the `## Documentation` section so the “Start here” bullets include:

```md
- `documentation/SOURCE_OF_TRUTH.md`
- `documentation/ROADMAP.md`
- `docs/INSITE_UI_UX_SOURCE_OF_TRUTH.md`
- `documentation/UI_ARCHITECTURE.md`
- `documentation/README.md`
```

Keep the language concise and consistent with the repo’s documentation governance.

- [ ] **Step 4: Review both README diffs**

Run:

```bash
git diff -- documentation/README.md README.md
```

Expected: both files now guide a new operator into the same canonical ladder.

### Task 3: Refresh `AGENTS.md` To Match The Real Agent Pack And Current Delivery State

**Files:**
- Modify: `AGENTS.md`
- Reference: `.trae/agents/README.md`
- Reference: `documentation/ROADMAP.md`

- [ ] **Step 1: Review the current agent inventory and actual pack**

Run:

```bash
sed -n '1,120p' AGENTS.md
sed -n '1,80p' .trae/agents/README.md
sed -n '40,55p' documentation/ROADMAP.md
```

Expected: confirm `AGENTS.md` is stale and references an agent not present in `.trae/agents/README.md`.

- [ ] **Step 2: Rewrite the current delivery status block**

Replace the old `WS-FND / M-FND-04` “latest lifecycle milestone” language with a current summary aligned to `documentation/ROADMAP.md`, for example:

```md
## Current Delivery Status

- Latest closed architecture milestone set: `WS-UIA / M-UIA-01`, `M-UIA-02`, and `M-UIA-03` are delivered and closed.
- Current redesign workstream: `WS-UX / M-UX-01` is active with slices `S-UX-01A` through `S-UX-01E` closed locally and later slices still in pipeline per `documentation/ROADMAP.md`.
- Current pipeline focus after those closures remains in QA execution, Supabase inspection, and later redesign slices as listed in `documentation/ROADMAP.md`.
```

Keep the rest of the file’s repository context intact unless it is directly contradicted by current repo state.

- [ ] **Step 3: Remove or reconcile the nonexistent `sre-observability` role**

Delete the `sre-observability` inventory section if it is not part of `.trae/agents/README.md`, and keep the inventory aligned to the actual current pack:

```md
- `solo-orchestrator`
- `planner`
- `builder`
- `reviewer`
- `test-engineer`
- `qa-validator`
- `release-manager`
- `docs-curator`
```

- [ ] **Step 4: Review the updated `AGENTS.md`**

Run:

```bash
git diff -- AGENTS.md
```

Expected: the delivery summary matches the roadmap and the inventory matches `.trae/agents/README.md`.

### Task 4: Validate Governance Consistency

**Files:**
- Modify: `documentation/SOURCE_OF_TRUTH.md`
- Modify: `documentation/README.md`
- Modify: `README.md`
- Modify: `AGENTS.md`

- [ ] **Step 1: Search for canonical hierarchy drift after edits**

Run:

```bash
rg -n "INSITE_UI_UX_SOURCE_OF_TRUTH|UI_ARCHITECTURE|SOLO_OPERATING_PROCEDURE|sre-observability|Latest lifecycle milestone" documentation/SOURCE_OF_TRUTH.md documentation/README.md README.md AGENTS.md
```

Expected: no stale `sre-observability` reference remains, and the canonical hierarchy appears consistently across the updated docs.

- [ ] **Step 2: Review overall changed-file summary**

Run:

```bash
git diff --stat -- documentation/SOURCE_OF_TRUTH.md documentation/README.md README.md AGENTS.md
```

Expected: only the intended governance files changed.

- [ ] **Step 3: Check for diagnostics on edited docs if available**

Inspect the edited files in the editor and confirm no markdown/link issues are introduced.

- [ ] **Step 4: Commit the phase**

Run:

```bash
git add documentation/SOURCE_OF_TRUTH.md documentation/README.md README.md AGENTS.md docs/superpowers/plans/2026-07-04-phase-1-canonical-governance-docs.md
git commit -m "docs(governance): align canonical documentation hierarchy"
```

Expected: one focused checkpoint commit for Phase 1 governance cleanup.
