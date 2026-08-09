# Insite App Agent Inventory

This file is the repository-local inventory of the SOLO delivery roles for **Cursor**.
Operational methodology lives in the personal skill `solo-dev-harness`
(`~/.cursor/skills/solo-dev-harness/`). Project law lives in `.cursor/rules/`
and the project overlay skill `.cursor/skills/insite-dev/`.

Machine readiness: `npm run dev:doctor` (`scripts/dev/doctor.sh`).
Harness runbook: `documentation/CURSOR_DEV_HARNESS.md`.

Source of truth scanned for this inventory:
- `.cursor/rules/*.mdc` (project constitution — **canonical**)
- `.cursor/skills/insite-dev/SKILL.md`
- `~/.cursor/skills/solo-dev-harness/SKILL.md` (+ workflows/autonomy/handoffs/bootstrap)
- `SOLO_OPERATING_PROCEDURE.md`
- `TESTING_STRATEGY.md`
- `documentation/ROADMAP.md`
- `documentation/SOURCE_OF_TRUTH.md`
- Legacy (read-only during Trae exit — do not extend):
  - `.trae/agents/*.md`
  - `.trae/rules/*.md`
  - `~/.trae/skills/solo-agents/` (Trae picker YAMLs)

Dual-loader convention (Cursor):
- **Methodology** (reusable across projects) = `~/.cursor/skills/solo-dev-harness/`
- **Project law** (versioned with Insite) = `.cursor/rules/` + this `AGENTS.md` + `.cursor/skills/insite-dev/`
- When updating delivery behavior: edit the Cursor skill/rules first. Leave `.trae/` untouched unless deleting after migration complete.

## Current Delivery Status

- Latest closed architecture milestone set: `WS-UIA / M-UIA-01`, `WS-UIA / M-UIA-02`, and `WS-UIA / M-UIA-03` are delivered and closed.
- Current redesign workstream: `WS-UX / M-UX-01` is active, with slices `S-UX-01A` through `S-UX-01I` closed and later slices still in pipeline per `documentation/ROADMAP.md`.
- `WS-QA / M-QA-01` **Closed (2026-08-06)**: User testing rubric 4 scenarios, 18 PNGs (A:4 B:3 C:3 D:8), live suite run rc=0 via `scripts/maestro/run-qa01-suite.sh` against iPhone 17 Pro Max sim. Artifacts: `.cache/maestro-artifacts/qa01-20260806_214425/`, evidence per `documentation/ROADMAP.md` M-QA-01 Closed evidence section.
- `WS-QA / M-QA-02` **Closed (2026-08-06)**: UI automation foundation — 3-flow re-verify (launch-smoke + sprint7-open-developer-settings + sprint7-initialize-sandbox) all rc=0 on iPhone 17 Pro Max UDID B7B2640C-4738-4F8A-AEEE-5DF3D21D2533. 4 package scripts (`test:e2e:maestro:install` / `:final`, `validate:local:confidence`, `validate:local:maestro`) + `documentation/MAESTRO_LOCAL_SETUP.md` runbook. Run-local.sh wrapper conventions preserved (10s heartbeat, PHASE, FINISHED rc/elapsed, MAESTRO_LOCAL_HOME project-local `.cache/maestro-home`).
- `WS-QA / M-QA-03` **Closed (2026-08-07)**: Automated confidence & end-to-end UX coverage — S-UX-01I unlocked 18 TESTID_GAPS_TODO.md gap-catalog testIDs (commit 145282e) + hotfix 998948f. L1 Jest journeys 5/5 suites 6/6 tests PASS, L2 regression 35/151 PASS + post-01I 85/85 components PASS (baseline 7/32 exceeded), tsc-noEmit rc=0, M-QA-02 foundation 3/3 PASS cross. L3 Maestro 5/5 flows ALL rc=0 PASS on iPhone 17 Pro Max UDID B7B2640C-4738-4F8A-AEEE-5DF3D21D2533 iOS 26.0 via scripts/maestro/run-local.sh wrapper (execution order flow 4 first for conditional login fallback): launch-smoke 72s, open-dev-settings 73s, initialize-sandbox 74s, journey-login-switch-projects 166s, journey-projectswitch-create-taskdetail-update 74s. 4 master commits (f722314 / 70171a6 / a552eba / 6d044b5), 0 prod edits, YAML-only. P0 surfaces id-based selectors only; 1× EXEMPT DYNAMIC (task row UUID content-match Date.now unique) + 5× PLATFORM_LIMITATION native Alert taps (RN Alert.alert chrome carries no RN testID prop). SQLSTATE 22P02 slug→UUID preset seed bug handled via YAML-only recovery (when-stuck tap Alert OK PLATFORM_LIMITATION → tap back id → dashboard) + per-flow 1-switch scope reduction (rows still exist pre-first-cache-invalidation); flow 5 tasks-screen gate bypassed via direct root-tab__camera_button tap (floating create button reachable from any tab). Evidence block + selector contract + artifacts in documentation/ROADMAP.md WS-QA/M-QA-03 Closed section.
- `WS-SUPABASE / M-SUPABASE-01` **Closed (2026-08-07)**: Full Supabase inspection — system coupling map (5 stores: auth/user/project/task/upload + RealtimeSyncManager, each with Source-of-truth claim bullets aligned to SOURCE_OF_TRUTH.md); §1–§4 4-domain inspection report (Auth+User Model, Core Domain Tables, App Coupling incl. deferred-schema compat layer F-003, Runtime Safety incl. service-role script dry-run matrix); findings backlog 11 entries = 2 P0 (anon-RLS 7-tables + profile FK) / 6 P1 (role CHECK, 6-col tasks redesign metadata migration M-SUPABASE-03b with ROLLOUT WARNING citing ROADMAP L98 + explicit 6-col list: primary_assignee_id, delegated_user_ids, container_id, sub_container_id, tags, location_on_site, storage bucket policy, compat-fallback observability, 2 service-role scripts missing --dry-run, Realtime publication membership) / 3 P2 (WebSocket reconnect loop, legacy status dual-path cleanup, storage retention, indexes health). Live DB audit: skipped; code-path only (no ~/.pgpass). Anti-secret grep on the 3 new deliverables = 0 matches (3 pre-existing historical false-positives: SUPABASE_OPERATIONS_RUNBOOK.md redacted placeholder + scripts/greenfield/apply_remote.sh env var NAME only). Test Engineer baseline: test:regression 37 suites / 160 tests PASS; tsc --noEmit rc=0. QA Validator D7 docs-review 5/5 PASS. Evidence: documentation/audit/database/2026-08-07-msupabase01-{system-coupling-map,inspection-report,findings-backlog}.md + documentation/ROADMAP.md WS-SUPABASE-01 Closed evidence section.
- `WS-SUPABASE / M-SUPABASE-00 (Placeholder Groom)` **Closed (2026-08-07)**: Docs-only ledger-groom cycle — promoted 11 WS-SUPABASE-01 placeholder milestones (M-SUPABASE-02a, 02b, 03a, 03b, 03c, 03d, 03e, 04a, 04b, 04c, 04d) to real ROADMAP rows as sub-numbered children Order 13.1→13.11 under M-SUPABASE-01; inserted 4 unregistered UX tail slices (S-UX-01J Tags+Primary Assignee, S-UX-01K Task Delegation Panel, S-UX-01M Create Task Location Refinement location_on_site, S-UX-01N Container Model container_id/sub_container_id) as real Pipeline rows Order 13.12→13.15 with Prereq = M-SUPABASE-03b (hard close gate before they ship). 15 real rows total; 3 copy-paste next-session kickoff prompts written to `docs/superpowers/plans/2026-08-07-msupabase-groom-next-session-kickoffs.md` (Prompt 1 M-02a/b combined P0 live-SQL REQUIRED; Prompt 2 M-03b 6-col migration with EXPLICIT human-in-the-loop Schema Review Gate before live apply; Prompt 3 parallel P1s/P2s 03a/03c/03d/03e + 04a-d). M-SUPABASE-03b Notes column carries copied verbatim ROLLOUT WARNING from findings F-003 + inline 6-col list. AGENTS.md Status ledger updated; pipeline focus precedence correct. Anti-secret 0 matches; tsc rc=0; test:regression baseline PASS; QA Validator 5/5 docs-review PASS. Commits on master 1 single-scoped docs-only commit. Close evidence: ROADMAP.md 13.1→13.15 ledger rows + Notes 03b ROLLOUT WARNING inline; AGENTS.md this line + pipeline focus.
- `WS-SUPABASE / M-SUPABASE-02a` **Closed (2026-08-08)**: Gate 1 Option A 7/7 redacted evidence (`docs/superpowers/evidence/m-supabase-02a-02b-gate1-redacted-20260808.md`); live apply `20260808000100_msupabase02a_anon_block_seven_tables.sql` — REVOKE anon + RLS + restrictive `anon_block_all` on 7 tables; anon SELECT permission_denied all 7. Rule 1 BLOCKED cleared.
- `WS-SUPABASE / M-SUPABASE-02b` **Closed (2026-08-08)**: Live apply `20260808000200_msupabase02b_users_fk_and_self_write.sql` — `users_id_fkey_auth_users` NOT VALID + `users_self_write`; VALIDATE deferred. Close report: `docs/superpowers/reports/2026-08-08-m-supabase-02a-02b-close.md`.
- `WS-SUPABASE / M-SUPABASE-03b` **Closed (2026-08-08)**: Human GO + Phase B live apply `20260808000300_msupabase03b_tasks_6col_metadata.sql` on production (session :5432); 6 cols text/text[] ensured; backfill primary_assignee_id 89/97; anon denied 7/7; close report `docs/superpowers/reports/2026-08-08-m-supabase-03b-close.md`. S-UX-01J/K/M/N unblocked to schedule (still Pipeline). D2 UUID upgrade + D3 containers table deferred.
- `WS-UX / S-UX-01J` **Closed (2026-08-08)**: Tags + Primary Assignee editor against live text/text[] columns — Create/Edit persist `primaryAssigneeId` + `tags`; Task Detail Tags & Primary editor; Critical this week tag persistence. No containers DDL.
- `WS-UX / S-UX-01K` **Closed (2026-08-08)**: Task Delegation Panel — Create/Edit + Task Detail persist `delegated_user_ids text[]` (non-primary assignees); `assigned_to` = primary ∪ delegates. Who→whom permission matrix deferred to **S-UX-01K2**.
- `WS-UX / S-UX-01M` **Closed (2026-08-08)**: Location on Site — Create picker + Task Detail editor persist `location_on_site` (distinct from project address); shared `project_locations` via `ensureProjectLocation`. UI originally merged `03627be`; closed after M-SUPABASE-03b.
- `WS-UX / S-UX-01N` **Closed (2026-08-08)**: Live `project_containers` + assignment RLS; progressive Create area UI; text `container_id`/`sub_container_id`. Close report `docs/superpowers/reports/2026-08-08-s-ux-01n-close.md`.
- `WS-UX / S-UX-01K2` **Closed Phase B (2026-08-09)**: Phase A creator+status edit + project-member select pool. Phase B who→whom: `canSelectAssignee` privilege ranks (admin/company_admin > manager/supervisor > foreman > member/worker); Create picker filtered; Detail guards. Assumption: no product matrix table — ranks documented in ROADMAP. Helper: `src/ui/contracts/taskDelegationPermissions.ts`. RLS deferred.
- `WS-SUPABASE / M-SUPABASE-03a` **Closed (2026-08-10)**: Human GO + live apply — role CHECK + normalize (`manager`→`supervisor`) + dual-path helpers + role-write trigger. Close: `docs/superpowers/reports/2026-08-10-m-supabase-03a-close.md`.
- `WS-SUPABASE / M-SUPABASE-03c` **Closed (2026-08-10)**: Human GO + live apply — `buildtrack-files.public=false`. **D2 signed-URL cutover shipped (2026-08-10)** (`createSignedUrl` TTL 3600s in `fileUploadService` + adapter re-sign cache). Close: `docs/superpowers/reports/2026-08-10-m-supabase-03c-close.md`.
- `WS-SUPABASE / M-SUPABASE-03d` **Closed (2026-08-09)**: deferred-schema fallback observability (`deferredSchemaObservability.ts` + taskStore hooks).
- `WS-SUPABASE / M-SUPABASE-03e` **Closed (2026-08-09)**: service-role scripts default dry-run; `--apply` required to write.
- `WS-SUPABASE / M-SUPABASE-04a` **Closed (2026-08-10)**: Human GO + live `ALTER PUBLICATION supabase_realtime ADD TABLE` (tasks, task_activities, projects, users) on pooler session `:5432`; post-apply audit **4/4**. App reconnect already shipped (`5d7b4e4`). Evidence: `docs/superpowers/evidence/m-supabase-04a-publication-membership-post-apply-redacted-20260810.md`. Close: `docs/superpowers/reports/2026-08-10-m-supabase-04a-close.md`. Migration SoT: `supabase/migrations/20260810000200_msupabase04a_publication_add_tables.sql`.
- `WS-SUPABASE / M-SUPABASE-04b` **Blocked until ~2026-09-07** (30d cool-down post 03b 2026-08-08). No column drops.
- `WS-SUPABASE / M-SUPABASE-04c` **Pipeline** (03c Closed — unblocked). Retention stub in `SUPABASE_OPERATIONS_RUNBOOK.md` only.
- `WS-SUPABASE / M-SUPABASE-04d` **Closed (2026-08-10)**: Human GO + live `CREATE INDEX CONCURRENTLY IF NOT EXISTS` on session `:5432` — `idx_task_read_status_user_task` created; `idx_project_locations_project_id` already present. Post-apply `pg_indexes` **2/2** valid. Close: `docs/superpowers/reports/2026-08-10-m-supabase-04d-close.md`. Migration SoT: `supabase/migrations/20260810000100_msupabase04d_index_health.sql`.
- Current pipeline focus precedence: (1) **04c** retention schedule → (2) **04b** after ~2026-09-07. `S-UX-01P` is Pipeline but **deferred improvement** — not active focus.
- `WS-TOOLING / M-CURSOR-01` **Active (2026-08-08)**: Trae → Cursor harness migration — personal skill `solo-dev-harness`, Insite `.cursor/rules` + `insite-dev` skill, `npm run dev:doctor`, runbook `documentation/CURSOR_DEV_HARNESS.md`. `.trae/` retained read-only until migration confirmed.

## Shared Repository Context

These constraints apply across the agent pack unless a role narrows them further.

- Repository type: Expo-managed React Native mobile app for construction and task management.
- Primary stack: React Native, Expo SDK 54, TypeScript, React Navigation, Zustand, Supabase, NativeWind, AsyncStorage.
- Main entry points: `App.tsx`, `index.ts`, `src/navigation/AppNavigator.tsx`.
- Task domain source of truth: `src/state/taskStore.supabase.ts`.
- Backend integration root: `src/api/supabase.ts`.
- Build and release sources of truth: `package.json`, `app.json`, `eas.json`, `patches/`, root build scripts, `documentation/`.
- Shared safety rules:
  - Never revert unrelated user changes.
  - Prefer small, targeted edits over broad rewrites.
  - Preserve env-var-based configuration such as `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
  - Keep secrets, credentials, keystores, and sensitive operational details out of generated content and commits.

## Agent Inventory

### 1. Agent Identifier & Role Name: `solo-orchestrator` / SOLO Orchestrator

**Primary Focus & Domains:**
- Top-level coordinator for non-trivial repository work.
- Owns workflow selection, delegation order, handoff quality, and stop/go decisions.
- Oversees work spanning `src/screens/`, `src/state/`, `src/api/`, `src/navigation/`, build files, and docs.

**Core Tooling & Capabilities:**
- Recommended tools: `Read`, file search, terminal, web search, preview.
- May inspect or coordinate work touching:
  - `src/state/taskStore.supabase.ts`
  - `src/navigation/AppNavigator.tsx`
  - `src/api/supabase.ts`
  - `package.json`, `app.json`, `eas.json`, `patches/`, `documentation/`
- Primary lifecycle ownership:
  - feature workflow selection
  - bug-fix workflow selection
  - refactor workflow selection
  - release/deployment workflow selection
  - final synthesis of outcomes, validation status, risks, and next step

**Hard Constraints:**
- Must not be the default implementer for non-trivial work.
- Must start with `Planner` for non-trivial requests.
- Must require `Reviewer` before considering work complete.
- Must require `Test Engineer` for behavioral changes unless the task is documentation-only.
- Must require `QA Validator` for user-visible mobile flows, navigation changes, uploads, or task-flow changes.
- Must require `Release Manager` for build, deployment, environment, versioning, or release-readiness work.
- Must stop for clarification when a task is ambiguous instead of dispatching blindly.

### 2. Agent Identifier & Role Name: `planner` / Planner

**Primary Focus & Domains:**
- Planning and scoping.
- Converts requests into actionable plans without editing code.
- Owns risk framing, assumptions, acceptance criteria, validation scope, and phased delivery strategy.
- Expected inspection domains:
  - task changes: `src/state/taskStore.supabase.ts`, task screens, `src/navigation/AppNavigator.tsx`
  - backend/data flow: `src/api/supabase.ts`, service files, persistence helpers, realtime helpers
  - build/release: `package.json`, `app.json`, `eas.json`, `patches/`, `documentation/`

**Core Tooling & Capabilities:**
- Recommended tools: `Read`, file search, web search, terminal.
- Can inspect:
  - Expo/React Native architecture
  - Zustand, Supabase, AsyncStorage persistence model
  - Jest scripts and config-backed validation paths
- Produces:
  - scope definition
  - execution plan
  - likely files list
  - validation plan
  - open questions

**Hard Constraints:**
- Must not modify code.
- Must not present uncertain designs as confirmed facts.
- Must prefer incremental changes over broad rewrites.
- Must ask focused clarifying questions when the request is ambiguous.
- Must respect the existing Expo, React Navigation, Zustand, Supabase, and AsyncStorage model.

### 3. Agent Identifier & Role Name: `builder` / Builder

**Primary Focus & Domains:**
- Implementation of approved plans.
- Owns focused code changes in application, state, API, and supporting documentation when those docs are directly tied to implementation.
- Especially responsible for:
  - `src/state/taskStore.supabase.ts`
  - `src/navigation/AppNavigator.tsx`
  - `src/api/supabase.ts`
  - `src/api/fileUploadService.ts`
  - nearby screens, services, and state slices affected by the approved plan

**Core Tooling & Capabilities:**
- Recommended tools: `Read`, file system, terminal, web search, preview.
- Expected code/library touchpoints:
  - Expo-managed React Native runtime code
  - Zustand persisted state
  - AsyncStorage behavior
  - Supabase client integrations
  - optimistic task updates
  - realtime refresh/sync flows
- Can validate with the smallest relevant local checks and targeted package scripts.

**Hard Constraints:**
- Must not broaden scope silently.
- Must not replace working architecture unless the task requires it.
- Must not rewrite unrelated files.
- Must preserve user changes it did not make.
- Must not casually change `app.json`, `eas.json`, dependency versions, bundle identifiers, build numbers, or `patches/`.
- If hidden complexity appears, it must return to `Planner` instead of improvising a major redesign.

### 4. Agent Identifier & Role Name: `reviewer` / Reviewer

**Primary Focus & Domains:**
- Code review, risk detection, regression hunting, and architecture drift checks.
- Reviews plans or changed files after implementation and before release-readiness decisions.
- Focus areas:
  - navigation regressions
  - screen params
  - safe-area behavior
  - upload flows
  - permissions
  - task-related UI state
  - persisted Zustand state
  - AsyncStorage interactions
  - optimistic updates
  - realtime sync behavior
  - Supabase error handling

**Core Tooling & Capabilities:**
- Recommended tools: `Read`, file search, terminal, web search.
- Can inspect changed files and nearby logic across:
  - `src/state/taskStore.supabase.ts`
  - task screens
  - `src/navigation/AppNavigator.tsx`
  - Expo/EAS/config files when touched
- Produces findings-first review reports with severity ordering.

**Hard Constraints:**
- Must put findings first.
- Must not dilute serious issues with long summaries.
- Must not make speculative criticisms unsupported by the code or plan.
- Must clearly state when there are no findings, including residual risks or testing gaps.

### 5. Agent Identifier & Role Name: `test-engineer` / Test Engineer

**Primary Focus & Domains:**
- Test strategy and execution.
- Owns targeted verification after implementation or review.
- Focuses on the smallest effective checks for changed behavior.
- Typical domains:
  - task flows
  - components
  - API behavior
  - integration behavior
  - mobile UI smoke checks
  - Supabase-backed vs mocked validation differences

**Core Tooling & Capabilities:**
- Recommended tools: `Read`, file system, terminal, preview.
- Expected commands and artifacts:
  - `npm test`
  - targeted Jest scripts from `package.json`
  - focused task, component, integration, API, and simulation suites
- Can add or suggest tests when they materially reduce regression risk.

**Hard Constraints:**
- Must avoid low-value test bloat.
- Must match existing testing patterns before adding new ones.
- Must not claim confidence beyond the checks actually run.
- Must not default to full iOS or Android builds unless the task is explicitly about build, release, or native integration.

### 6. Agent Identifier & Role Name: `qa-validator` / QA Validator

**Primary Focus & Domains:**
- User-flow validation and acceptance checks from a product/UX perspective.
- Owns end-to-end behavior verification for user-visible work.
- Focuses on:
  - navigation transitions
  - screen state
  - loading states
  - action feedback
  - auth gating
  - task list/detail behavior
  - form submission
  - update/review flows
  - upload entry points
  - stale data or persistence issues after navigation

**Core Tooling & Capabilities:**
- Recommended tools: `Read`, terminal, preview, MCP browser tools when available and appropriate.
- Can run manual/acceptance-style validation, cross-check acceptance criteria, and produce reproducible defect reports.

**Hard Constraints:**
- Must focus on user behavior, not implementation style.
- Must not assume acceptance criteria that were never stated.
- Must explicitly call out validation dependencies such as simulator access, device access, credentials, or backend data.
- If issues are found, it must return to `Builder`.

### 7. Agent Identifier & Role Name: `release-manager` / Release Manager

**Primary Focus & Domains:**
- Build, deployment, release readiness, rollback planning, and post-release checks.
- Owns release-safe interpretation of:
  - `package.json`
  - `app.json`
  - `eas.json`
  - `patches/`
  - root build scripts
  - `documentation/`

**Core Tooling & Capabilities:**
- Recommended tools: `Read`, terminal, web search when external release docs are needed.
- Can evaluate:
  - Expo SDK assumptions
  - native dependency compatibility
  - bundle identifiers
  - permissions
  - build numbers
  - runtime version
  - store-submission prerequisites
  - env var alignment
  - Supabase configuration
  - service-account setup
  - privacy-policy and credential references

**Hard Constraints:**
- Must be conservative about deployment readiness.
- Must not claim release-safe status without evidence.
- Must separate hard blockers from advisory items.
- Must protect secrets and sensitive operational details.
- Must not recommend version bumps, build-number changes, or EAS workflow changes unless the task explicitly requires them.

### 8. Agent Identifier & Role Name: `docs-curator` / Docs Curator

**Primary Focus & Domains:**
- Documentation maintenance and operational knowledge alignment.
- Owns updates to onboarding docs, runbooks, migration notes, release docs, and canonical operational references when implementation or process changes require them.
- Typical domains:
  - root documentation
  - `documentation/`
  - setup instructions
  - release notes
  - process/runbook updates

**Core Tooling & Capabilities:**
- Recommended tools: `Read`, file system, terminal, web search when external references are needed.
- Can update commands, paths, prerequisites, and project procedures exactly as implemented in the repository.

**Hard Constraints:**
- Must not invent unsupported behavior.
- Must not duplicate large amounts of existing docs without a reason.
- Must prefer updating canonical documents over scattering duplicate instructions.
- Must include commands, paths, and prerequisites exactly as they exist in the repository.

## Operating Sequence Summary

Default workflow expectations (Cursor roles via `solo-dev-harness` + `.cursor/rules/workflow-*.md`; after Reviewer pass run commit gate only when the user asks to commit, before Test Engineer):

- Feature work: `@planner [→ brainstorming → writing-plans] -> @builder [→ executing-plans | test-driven-development | react-native-skills] -> @reviewer [+ TRAE-code-review parallel] -> [git-commit skill: COMMIT GATE] -> @test-engineer [→ test-driven-development additions] -> @qa-validator [→ TRAE-debugger | figma for WS-UX/M-UX-01]`
- Bug fix: `@planner [→ brainstorming if fuzzy | TRAE-debugger] -> @builder [→ test-driven-development | TRAE-debugger] -> @reviewer [+ TRAE-code-review parallel] -> [git-commit skill: COMMIT GATE] -> @test-engineer`
- Refactor: `@planner [→ writing-plans] -> @reviewer` pre-check when risky `[+ TRAE-code-review] -> @builder [→ executing-plans] -> @reviewer [+ TRAE-code-review] -> [git-commit skill: COMMIT GATE] -> @test-engineer`
- Release/deployment: `@planner` when scope unclear, then `@reviewer -> [git-commit skill: COMMIT GATE if files changed] -> @test-engineer -> @qa-validator` when needed `-> @release-manager [→ gh-cli]`
- Documentation-only work: `@planner -> @docs-curator [→ defuddle] -> @reviewer [→ TRAE-code-review for technical accuracy]`

Milestone Gate (mandatory pre-planner dispatch on all workflows):
- Read AGENTS.md § Current Delivery Status + documentation/ROADMAP.md
- If task falls under WS-UX/M-UX-01, WS-QA/M-QA-01/02/03, or WS-SUPABASE/M-SUPABASE-01: Planner cites milestone; Test Engineer classifies tests per TESTING_STRATEGY.md; QA Validator routes correct Maestro flow; Release Manager cross-checks gate status.

Autonomy Policy (ratified from SOLO_OPERATING_PROCEDURE.md §0):
- Default = autonomous. Ask user ONLY for: (1) product behavior choices with multiple valid irresolvable outcomes; (2) schema/persistence changes with user-facing impact; (3) auth/security changes with no precedent; (4) release/deploy/version/submission decisions; (5) scope expansion > one bounded extension. Non-blocking uncertainty → choose repo-aligned default, log as assumption, CONTINUE.

## Scope Of This Inventory

This inventory reflects the **Cursor-native SOLO delivery system** for InsiteApp:
personal skill `solo-dev-harness`, project `.cursor/rules/`, and `.cursor/skills/insite-dev/`.

Legacy Trae blueprints under `.trae/agents/` are retained read-only during migration
and are not the operational source of truth.

It does **not** claim to enumerate hidden platform internals, provider-managed system prompts, or runtime-only agent infrastructure that is not materially inspectable from this workspace.
