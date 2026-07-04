# Phase 2 Canonical Architecture Docs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create canonical software and database architecture documents that accurately describe the current app structure and register them in the repository's documentation hierarchy.

**Architecture:** This is a documentation-governance slice grounded in implemented runtime paths, not aspirational redesign prose. The work creates `documentation/SOFTWARE_ARCHITECTURE.md` and `documentation/DATABASE_ARCHITECTURE.md`, then updates the canonical hubs so readers can reconstruct the system from the curated document stack.

**Tech Stack:** Markdown, Expo React Native, Zustand, Supabase, React Navigation

---

### Task 1: Create The Canonical Software Architecture Document

**Files:**
- Create: `documentation/SOFTWARE_ARCHITECTURE.md`
- Reference: `documentation/UI_ARCHITECTURE.md`
- Reference: `documentation/INSITE_APP_LATEST.md`
- Reference: `src/navigation/AppNavigator.tsx`
- Reference: `src/api/supabase.ts`
- Reference: `src/state/authStore.supabase.ts`
- Reference: `src/state/projectStore.supabase.ts`
- Reference: `src/state/taskStore.supabase.ts`
- Reference: `src/state/userStore.supabase.ts`
- Reference: `src/utils/DataRefreshManager.tsx`
- Reference: `src/utils/NetworkSyncManager.tsx`
- Reference: `src/utils/RealtimeSyncManager.tsx`

- [ ] **Step 1: Reconfirm the active runtime architecture inputs**

Read:

```bash
sed -n '1,260p' src/navigation/AppNavigator.tsx
sed -n '1,220p' src/api/supabase.ts
sed -n '1,220p' src/utils/DataRefreshManager.tsx
sed -n '1,260p' src/utils/RealtimeSyncManager.tsx
```

Expected: confirm the main app shell, navigation split, store boundaries, Supabase client setup, and sync managers.

- [ ] **Step 2: Draft `documentation/SOFTWARE_ARCHITECTURE.md`**

Create a canonical doc that covers:

- system scope and runtime stack
- entrypoints and top-level app shell
- authenticated and unauthenticated navigation structure
- layer boundaries for screens, view adapters, state, API, and sync managers
- major data flows for auth, projects, tasks, and realtime refresh
- current transitional boundaries such as dual auth/store variants and legacy compatibility fields
- canonical source-of-truth references for deeper subdomains

- [ ] **Step 3: Review the new architecture doc**

Run:

```bash
git diff -- documentation/SOFTWARE_ARCHITECTURE.md
```

Expected: the document reads as a full-system architecture reference instead of only a UI-contract note.

### Task 2: Create The Canonical Database Architecture Document

**Files:**
- Create: `documentation/DATABASE_ARCHITECTURE.md`
- Reference: `src/api/supabase.ts`
- Reference: `src/types/buildtrack.ts`
- Reference: `src/state/authStore.supabase.ts`
- Reference: `src/state/projectStore.supabase.ts`
- Reference: `src/state/taskStore.supabase.ts`
- Reference: `src/state/userStore.supabase.ts`
- Reference: `documentation/role-permission-matrix.md`
- Reference: `scripts/sandbox/bootstrap_minimal_supabase.sql`
- Reference: `TASK_ACTIVITIES_UNIFICATION_MIGRATION.sql`
- Reference: `TASK_STATUS_UNIFIED_MIGRATION.sql`
- Reference: `TASK_EDIT_HISTORY_MIGRATION.sql`

- [ ] **Step 1: Reconfirm the active database entities and transitional migrations**

Read:

```bash
sed -n '1,260p' scripts/sandbox/bootstrap_minimal_supabase.sql
sed -n '1,240p' TASK_ACTIVITIES_UNIFICATION_MIGRATION.sql
sed -n '1,220p' TASK_STATUS_UNIFIED_MIGRATION.sql
sed -n '1,120p' TASK_EDIT_HISTORY_MIGRATION.sql
```

Expected: confirm the operational tables and identify which migration-era artifacts are transitional or superseded.

- [ ] **Step 2: Draft `documentation/DATABASE_ARCHITECTURE.md`**

Create a canonical doc that covers:

- database source-of-truth rules
- Supabase auth/public/storage split
- operational tables currently used by the app
- table-by-table field and relationship summary for companies, users, projects, user_project_assignments, tasks, task_activities, task_read_status, and roles
- task audit/activity model and status transition history
- auth-to-users synchronization behavior
- persistence conventions such as snake_case storage vs camelCase transforms
- transitional schema notes and non-canonical root SQL files

- [ ] **Step 3: Review the new database doc**

Run:

```bash
git diff -- documentation/DATABASE_ARCHITECTURE.md
```

Expected: the document distinguishes runtime truth from old migration scripts and one-off diagnostics.

### Task 3: Register The New Canonical Documents

**Files:**
- Modify: `documentation/SOURCE_OF_TRUTH.md`
- Modify: `documentation/README.md`
- Modify: `README.md`
- Reference: `documentation/SOFTWARE_ARCHITECTURE.md`
- Reference: `documentation/DATABASE_ARCHITECTURE.md`

- [ ] **Step 1: Update the canonical hierarchy and registry**

Add the new software and database architecture docs to the appropriate canonical sections in `documentation/SOURCE_OF_TRUTH.md`.

- [ ] **Step 2: Update both documentation hubs**

Expose the new docs in:

- the canonical read order in `documentation/README.md`
- the root “Start here” list in `README.md`

- [ ] **Step 3: Review the hub diffs**

Run:

```bash
git diff -- documentation/SOURCE_OF_TRUTH.md documentation/README.md README.md
```

Expected: the canonical ladder now includes software and database architecture in a consistent order.

### Task 4: Review, Commit, Merge, And Push

**Files:**
- Modify: `documentation/SOFTWARE_ARCHITECTURE.md`
- Modify: `documentation/DATABASE_ARCHITECTURE.md`
- Modify: `documentation/SOURCE_OF_TRUTH.md`
- Modify: `documentation/README.md`
- Modify: `README.md`
- Modify: `docs/superpowers/plans/2026-07-04-phase-2-canonical-architecture-docs.md`

- [ ] **Step 1: Run a focused review pass**

Run:

```bash
rg -n "SOFTWARE_ARCHITECTURE|DATABASE_ARCHITECTURE|UI_ARCHITECTURE|task_activities|user_project_assignments|task_read_status" documentation/SOURCE_OF_TRUTH.md documentation/README.md README.md documentation/SOFTWARE_ARCHITECTURE.md documentation/DATABASE_ARCHITECTURE.md
git diff --stat -- documentation/SOFTWARE_ARCHITECTURE.md documentation/DATABASE_ARCHITECTURE.md documentation/SOURCE_OF_TRUTH.md documentation/README.md README.md
```

Expected: references are consistent and only the intended files changed.

- [ ] **Step 2: Create the checkpoint commit**

Run:

```bash
git add documentation/SOFTWARE_ARCHITECTURE.md documentation/DATABASE_ARCHITECTURE.md documentation/SOURCE_OF_TRUTH.md documentation/README.md README.md docs/superpowers/plans/2026-07-04-phase-2-canonical-architecture-docs.md
git commit -m "docs(architecture): add canonical system and database references"
```

Expected: one focused Phase 2 checkpoint commit.

- [ ] **Step 3: Merge Phase 2 back into the active branch and push**

Run:

```bash
git checkout wip/local-ui-before-uia-merge
git merge --ff-only docs/phase1-canonical-governance
git push origin wip/local-ui-before-uia-merge
```

Expected: the active branch includes both Phase 1 and Phase 2 isolated-doc changes and is backed up to GitHub.
