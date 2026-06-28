# Post-Sprint 7 Master Roadmap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the remaining near-term post-Sprint 7 backlog in a dependency-aware order that protects runtime correctness, reduces worktree noise, and finishes deferred Stage 2 and Wave 2 work without mixing long-range initiatives into the same execution track.

**Architecture:** Complete the remaining data authority and sync-hardening work before broad UI follow-on changes, then eliminate repository/environment noise, then unify the remaining legacy task activity and progress-log data model seams, and only then finish the deferred Wave 2 UI migration surfaces. Use small checkpoint commits at each verified boundary so the worktree never accumulates another mixed, rollback-hostile batch.

**Tech Stack:** Expo-managed React Native, TypeScript, Zustand, Supabase, AsyncStorage, React Navigation, Jest.

---

## Sequence Rules

- Maintain a permanent `do-not-stage` quarantine from the first task onward for `credentials.json`, local env files, swap files, transient build folders, and machine-local artifacts.
- Do not begin Wave 2 UI work until cache authority, sync invalidation, and model unification gates are green.
- Keep long-range roadmap documents out of the active implementation queue:
  - `MCP_HUB_ARCHITECTURE.md`
  - `AI_AGENT_TASK_AUTOMATION.md`
  - `CONSTRUCTION_PLATFORM_INTEGRATION_TARGETS.md`
- Keep commit boundaries phase-sized or smaller:
  - one cache/sync hardening checkpoint
  - one security/worktree sanitization checkpoint
  - one or more model-unification checkpoints
  - one or more Wave 2 UI checkpoints

## Near-Term Scope

This roadmap covers only the remaining execution work that is still relevant to the current repository state:

1. Stage 2 cache authority and sync invalidation hardening
2. Security and worktree sanitization
3. Task activity and progress-log model unification
4. Wave 2 UI migration and selector adoption

Out of scope for this plan:

- MCP Hub
- AI Task Automation
- Construction platform integrations
- broad release engineering changes beyond hygiene and file quarantine

## Phase 1: Stage 2 Cache Authority & Sync Hardening

**Target Components:**
- `src/state/taskStore.supabase.ts`
- `src/api/supabase.ts`
- `src/utils/DataRefreshManager.tsx`
- `src/utils/RealtimeSyncManager.tsx`
- review adjacency in `src/utils/NetworkSyncManager.tsx`

**Primary Objective:**
- eliminate the remaining authority drift between persisted query metadata and the in-memory request envelope layer
- make realtime and forced-refresh flows invalidate the same resource keys consistently
- ensure cold-start behavior cannot treat stale persisted metadata as fresh authority when no in-memory envelope exists

**Deliverables:**
- a single documented authority rule for task freshness:
  - persisted `taskQueryMeta` is advisory metadata only
  - `requestCacheRegistry` freshness envelopes are rebuilt or explicitly treated as missing after cold start
- `completeTaskQuerySuccess()` and related query completion paths stop synthesizing misleading freshness from partial defaults when the corresponding envelope does not exist
- realtime task changes invalidate or refresh the same resource key families used by manual fetches:
  - `tasks:all`
  - `task:<id>`
  - `tasks:project:<id>`
  - `tasks:user:<id>`
  - any related assignment-scope keys already supported by `buildResourceKey()`
- `DataRefreshManager` and nearby sync utilities stop creating freshness ambiguity after reconnect, foreground, or polling refreshes

**Likely Files To Modify:**
- `src/state/taskStore.supabase.ts`
- `src/api/supabase.ts`
- `src/utils/DataRefreshManager.tsx`
- `src/utils/RealtimeSyncManager.tsx`
- optional nearby tests in:
  - `src/state/__tests__/taskStore.supabase.unit.test.ts`
  - `src/__tests__/integration/syncManagers.test.tsx`
  - new integration coverage under `src/__tests__/integration/`

**Validation Gate:**
- add or update integration tests that prove invalidation removes effective freshness and forces a network-backed refresh path after:
  - realtime delete or soft-delete
  - foreground refresh
  - manual invalidation
  - cold start with persisted `taskQueryMeta` but no in-memory request envelope
- minimum verification commands:
  - `PATH=/opt/homebrew/bin:$PATH npx jest src/state/__tests__/taskStore.supabase.unit.test.ts --runInBand`
  - `PATH=/opt/homebrew/bin:$PATH npx jest src/__tests__/integration/syncManagers.test.tsx --runInBand`
  - `PATH=/opt/homebrew/bin:$PATH npx tsc --noEmit`

**Why This Comes Here:**
- this is the last unresolved data-authority seam left behind after Sprint 7
- every later phase depends on trustworthy freshness, invalidation, and reconciliation semantics
- unifying task activities on top of unstable cache authority would make regressions harder to localize

**Definition of Done (DoD):**
- cached task reads cannot remain artificially fresh after invalidation or realtime deletion
- cold-start request coordination no longer trusts persisted freshness without a corresponding live envelope
- targeted task store and sync manager tests are green
- the phase is checkpoint-committed on its own

## Phase 2: Security & Worktree Sanitization

**Target Components:**
- Git tracking rules
- `.gitignore`
- local credentials and keystore handling
- transient build and editor artifacts
- canonical documentation for local-sensitive files if needed

**Primary Objective:**
- remove environmental noise from the active working tree
- ensure sensitive files remain outside normal commit candidates
- stop machine-local artifacts from polluting implementation phases

**Deliverables:**
- explicit quarantine handling for:
  - `credentials.json`
  - `.env` and backups
  - local keystore credential files
  - `.App.tsx.swp`
  - `.tmp/`
  - `.xcode-derived-data/`
  - local logs
- `.gitignore` updated only where repository policy requires it
- any repo-tracked sensitive/local files assessed and moved into the existing deferred security/release cleanup track if they should not be versioned
- documentation updated only if the cleanup changes the canonical operator workflow

**Likely Files To Modify:**
- `.gitignore`
- root/local-ignore patterns if already used by repository policy
- optional doc touchpoints:
  - `documentation/README.md`
  - `documentation/SOURCE_OF_TRUTH.md`
  - release/security cleanup notes if promoted to canonical docs

**Validation Gate:**
- `git status --short` shows no product-code residue from prior phases and only intentional local-sensitive files if they are explicitly still quarantined
- no sensitive file is staged
- if `.gitignore` changes:
  - `git status --short`
  - `PATH=/opt/homebrew/bin:$PATH npx tsc --noEmit`

**Why This Comes Here:**
- worktree hygiene must be restored before the larger model-unification phase
- this phase reduces the chance of mixing credentials or editor/build noise into high-risk data-model refactors
- it also enforces the checkpoint discipline needed for the remaining backlog

**Definition of Done (DoD):**
- the product-code worktree is clean at the end of the phase
- sensitive and local-only files are either ignored, quarantined, or explicitly deferred in the security/release track
- `git status` is predictable and free of accidental environmental leaks
- the phase is checkpoint-committed on its own

## Phase 3: Core Model Unification & Debt Elimination

**Target Components:**
- Task Activities Unification
- Progress Log Unification
- remaining legacy activity/status/edit table reads and writes
- activity-related task types and timeline consumers

**Primary Objective:**
- replace the split `task_updates`, `task_edit_history`, and related legacy activity reads/writes with one authoritative activity model
- collapse duplicate progress/status/edit pathways into one unified contract before additional UI follow-on work

**Deliverables:**
- write-side unification:
  - `addTaskUpdate()`
  - `addSubTaskUpdate()`
  - `trackTaskEdit()`
  - status-transition writers
  all target the unified activity contract
- read-side unification:
  - `fetchTasks()`
  - `fetchTaskById()`
  - `fetchTasksByProject()`
  - `fetchTasksByUser()`
  - `fetchTaskEditHistory()`
  are migrated to unified activity reads or compatibility adapters
- task model updates:
  - `Task` uses `activities` as the active timeline contract
  - `updates`, `editHistory`, and other legacy fields are deprecated, compatibility-layered, or removed in a controlled way
- progress-log duplication is eliminated or compatibility-shimmed behind the unified activity model
- the UI timeline consumers are moved to the unified contract only after the data layer is green

**Likely Files To Modify:**
- `src/state/taskStore.supabase.ts`
- `src/types/buildtrack.ts`
- `src/screens/TaskDetailScreen.tsx`
- any activity timeline helpers/components used by task detail and review flows
- optional supporting utilities:
  - `src/utils/databaseUtils.ts`
  - activity-related mappers
- tests in:
  - `src/state/__tests__/`
  - `src/__tests__/integration/`
  - task workflow suites

**Validation Gate:**
- focused green runs proving unified read/write behavior:
  - `PATH=/opt/homebrew/bin:$PATH npx jest src/state/__tests__/ --runInBand`
  - `PATH=/opt/homebrew/bin:$PATH npx jest src/__tests__/integration/taskWorkflows.supabase.test.ts --runInBand`
  - `PATH=/opt/homebrew/bin:$PATH npx jest src/__tests__/integration/fieldReliability.test.ts --runInBand`
  - `PATH=/opt/homebrew/bin:$PATH npx tsc --noEmit`
- updated assertions validate unified activity data instead of legacy split structures

**Why This Comes Here:**
- once cache and sync authority are stable and the worktree is clean, this becomes the next highest-risk debt seam
- the deferred Wave 2 screens, especially task-heavy surfaces, should migrate on top of the final activity contract rather than a temporary compatibility layer
- this phase removes the largest remaining model drift in the task domain

**Definition of Done (DoD):**
- active task read/write flows use the unified activity model
- legacy tables are no longer the primary application contract
- the active state and task workflow suites are green with updated data assertions
- the phase is checkpointed in one or more small verified commits

## Phase 4: Wave 2 UI Migration & Selector Adoption

**Target Components:**
- `src/screens/CreateTaskScreen.tsx`
- transitional bridge-header migrated screens
- remaining view adapters using raw array consumption instead of strict selector-backed derivation
- navigation/header convergence for deferred Group B screens

**Primary Objective:**
- finish the deferred UI migration surfaces only after the data contracts beneath them are stable
- remove raw store-array coupling in migrated screen shells and replace it with memoized selectors or adapter-owned derivation

**Deliverables:**
- full Wave 2 migration of `CreateTaskScreen`
- header convergence for transitional bridge-header screens noted in the Wave 1 matrix
- selector sanitation across affected view adapters:
  - no direct broad array consumption when a memoized selector or narrowed derived set should exist
- adapter-level tests for high-risk binding surfaces
- screen-level tests for critical flow continuity

**Likely Files To Modify:**
- `src/screens/CreateTaskScreen.tsx`
- `src/ui/viewAdapters/useCreateTaskViewAdapter.ts`
- any Group B bridge-header screens and shared header composition files
- affected view adapters under `src/ui/viewAdapters/`
- related contracts under `src/ui/contracts/`
- tests under:
  - `src/__tests__/integration/`
  - `src/ui/viewAdapters/__tests__/`
  - screen-local test files where they already exist

**Validation Gate:**
- `CreateTaskScreen` and other deferred migrated screens have adapter-level or screen-level coverage for their core interactions
- selector-driven derivation replaces raw broad reads where migration work touches the file
- minimum verification commands:
  - `PATH=/opt/homebrew/bin:$PATH npx jest src/__tests__/integration/CreateTaskScreen.test.tsx --runInBand`
  - targeted migrated-screen suites for any touched screen
  - `PATH=/opt/homebrew/bin:$PATH npx tsc --noEmit`

**Why This Comes Here:**
- this phase is intentionally last because it is downstream of both data correctness and model correctness
- `CreateTaskScreen` was already deferred to Wave 2 due to blast radius
- touching UI before the underlying cache and activity contracts are finished would multiply regression surfaces

**Definition of Done (DoD):**
- all deferred Wave 2 screens touched in this phase are migrated onto stable data contracts
- remaining transitional bridge-header debt scheduled for this phase is resolved or explicitly re-scoped with a written reason
- touched view adapters rely on strict memoized selector-style derivation instead of raw broad arrays
- targeted UI tests and `npx tsc --noEmit` are green
- the phase is checkpointed in one or more verified commits

## Future Phase: Deferred Long-Range Roadmaps

These tracks remain explicitly outside the near-term sequence:

- `MCP_HUB_ARCHITECTURE.md`
- `AI_AGENT_TASK_AUTOMATION.md`
- `CONSTRUCTION_PLATFORM_INTEGRATION_TARGETS.md`

They should only be reopened after the four near-term phases are complete and the repository has:

- stable cache authority
- clean worktree hygiene
- unified task activity contracts
- completed Wave 2 UI migration for the currently deferred surfaces

## Execution Order Summary

1. Phase 1: Stage 2 Cache Authority & Sync Hardening
2. Phase 2: Security & Worktree Sanitization
3. Phase 3: Core Model Unification & Debt Elimination
4. Phase 4: Wave 2 UI Migration & Selector Adoption
5. Future Phase: Long-range roadmap bucket only after the near-term queue closes

## Commit Discipline

- Create a checkpoint commit at every verified phase boundary
- If a phase is too large for one safe commit, split it into sub-checkpoints by behavior boundary, not by file-extension or folder
- Never include:
  - credentials
  - local swap files
  - derived-data folders
  - unrelated machine-local artifacts

## Risks To Watch

- cache authority fixes can appear green in unit tests while still failing across cold-start hydration edges
- model unification can accidentally preserve legacy compatibility fields in some read paths but not others
- Wave 2 UI migration can reintroduce broad store subscriptions unless selector discipline is checked during review
- security/worktree cleanup can accidentally remove files still needed for local operator workflows if the quarantine policy is not documented carefully
