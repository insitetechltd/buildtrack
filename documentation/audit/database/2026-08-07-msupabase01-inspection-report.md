# WS-SUPABASE-01 Inspection Report — §1–§4 4-Domain

**Date:** 2026-08-07
**Classification:** M-SUPABASE-01 deliverable B — inspection-only, 0-writes
**Live DB audit:** skipped; code-path only (Assumption A1 — no `~/.pgpass`)
**Predecessor input (superseded):** `2026-07-12-supabase-technical-audit.md` (historical) + `2026-07-12-supabase-remediation-plan.md` (historical findings list used as precursor)
**Reference inputs:** `documentation/DATABASE_ARCHITECTURE.md`, `documentation/SOFTWARE_ARCHITECTURE.md`, `documentation/SOURCE_OF_TRUTH.md`, `documentation/history/analysis/ROLE_SYSTEM_MIGRATION_COMPLETE.md`, root-level `ADD_*_MIGRATION.sql` files

---

## §1 Auth And User Model

### 1.1 Auth.users ↔ public.users alignment

**Architecture (observed):** Two-tier auth model per the role-system simplification milestone closed in Q2 2026 (see `ROLE_SYSTEM_MIGRATION_COMPLETE.md`):
- Tier 1: GoTrue `auth.users` = authority for identity, passwords, MFA, email, auth.uid().
- Tier 2: `public.users` (managed profile table) = authority for role, company_id, is_pending, display_name, avatar_url, worker→member normalization fields.
- Relationship: `public.users.id = auth.users.id` 1-to-1 FK expected.

**Writes observed in authStore.supabase.ts:**
- After `signInWithPassword()` succeeds (line ~84), authStore runs a SELECT against `public.users` by id (line ~115) to hydrate the profile. If the profile row indicates `is_pending=true`, the login is **blocked** (line ~116–120: auto sign-out, no access).
- After signup flows (lines 206–260), authStore performs an INSERT into `public.users` with `company_id`, `role = worker → member normalization` per the simplified role system.

**Findings in this section:**
- **F-001 (P0, see backlog):** P0 security finding from 2026-07-12 live consistency check: anonymous-role reads succeeded against `companies`, `users`, `projects`, `tasks`, `task_activities`, `task_read_status`, `project_locations` (7 tables total). Confidence = historical `confirmed live 2026-07-12`. RLS must be verified on the current tenant schema (live-SQL Gate 1 or Dashboard SQL Editor). If still present, this is a data leak to unauthenticated clients.
- **F-002 (P0):** GoTrue → `public.users` profile bootstrap creates rows via authenticated-role INSERT after signup, but there is no explicit audit record (in RLS or triggers) proving that the `id` FK relationship with auth.users is enforced with a DB-level trigger or RLS policy that uses `auth.uid() = id`. Code-level guard exists; DB-level guard UNKNOWN pending live-SQL.

### 1.2 Login lookup behavior and user-profile hydration

- Login blocked if `is_pending` on public.users profile row (lines ~116–120). This is the `pending_approval` gate required by the simplified role system — admin must invite/accept the user before they can access any route.
- Hydration maps `role` → both `role` (backward compat) AND `systemPermission` (new canonical field per role system: worker→member, foreman→supervisor, etc.) at lines ~131–139. This is the core role-normalization pattern used throughout the app.

### 1.3 Pending approval and role normalization interactions

- Pending state lives in both `is_pending` (snake_case on public.users DB column) and `isPending` (camelCase in TS); userStore normalizes at the fetch boundary (line ~84: `isPending: user.is_pending ?? user.isPending ?? false`).
- Role values observed: `worker, member, foreman, supervisor, company_admin, admin`. Normalization rule: stored role = `worker` is treated as `systemPermission = member` (per migration complete doc). This is consistent across the codebase and verified in parity tests.
- Role system simplification history: 2026-07-01 analysis + 2026-07 migration closed; no evidence of legacy 6-role values being written anywhere in the current app code — only READ-side normalization is present.

**Findings in this section:**
- **F-004 (P1):** `public.users` role column CHECK constraint not verified on the live tenant schema. If the DB allows arbitrary strings (not just the 6 canonical values), role normalization at the client layer can be bypassed via direct writes. UNKNOWN pending live-SQL.

---

## §2 Core Domain Tables

Per-table column inventory, RLS status UNKNOWN pending live-SQL, approximate row counts UNKNOWN pending live-SQL. Information derived from:
- `DATABASE_ARCHITECTURE.md` schema intent
- Store layer `select`/`insert`/`update` grep
- Root-level migration SQLs: `ADD_TASK_ARCHIVE_MIGRATION.sql`, `TASK_STATUS_UNIFIED_MIGRATION.sql`, `ADD_COMMERCIAL_CATEGORY_MIGRATION.sql`
- `scripts/sandbox/bootstrap_minimal_supabase.sql` bootstrap

### 2.1 users
- Expected PK: `id UUID FK auth.users.id`
- Columns used by stores: `role, company_id, is_pending, display_name, avatar, email` + legacy `isPending` alias (read-normalized only)
- RLS ENABLED expected; policies: self-read + company_admin-read + self-update; number of policies UNKNOWN
- Indexes: PK index on id (implicit); composite on (company_id, role) expected but UNKNOWN

### 2.2 companies
- PK: `id UUID`
- Columns used: `name, created_at, updated_at, industry, commercial (category fix applied)`
- Commercial category fix: `COMMERCIAL_CATEGORY_FIX.md` documents an altered tasks_category_check constraint with `commercial` included; the same may apply to companies if companies have industry-category enum

### 2.3 projects
- PK: `id UUID`
- Columns used: `company_id, name, created_by, created_at, updated_at, archived_at, status, color`
- RLS on projects: `user_has_project_access(uuid, uuid)` helper function (from `supabase/migrations/20260715000300_projects_assignments.sql` line 88) — grants SELECT/INSERT/UPDATE/DELETE to authenticated + service_role.

### 2.4 user_project_assignments
- PK: composite `user_id + project_id` or surrogate
- Columns: `user_id, project_id, role/assignment_category, created_at, updated_at`
- Junction table for project↔user membership
- RLS: authenticated + service_role

### 2.5 tasks (HIGHEST TOUCH SURFACE)
- PK: `id UUID`
- **Columns present (from ADD_TASK_ARCHIVE + TASK_STATUS_UNIFIED + category fix migrations):**
  - Core: `project_id, assigned_to, created_by, title, description, task_reference, billing_status, priority, category, due_date, accepted, accepted_by, accepted_at, declined_reason, status, rejected_reason, completion_percentage, starred_by_users, archived_at, archived_by, deleted_at, deleted_by, current_status, ready_for_review, reviewed_by, reviewed_at, review_accepted, has_unread_changes, last_edited_at, updated_at, created_at`
  - Legacy status fields: `current_status, accepted, ready_for_review, reviewed_by, reviewed_at, review_accepted, accepted_by, accepted_at, declined_reason, rejected_reason` — legacy + unified model overlap.
- **Columns NOT YET GUARANTEED on every tenant schema (Deferred Redesign Metadata — critical finding F-003):**
  - `primary_assignee_id UUID`
  - `delegated_user_ids UUID[]`
  - `container_id UUID FK containers.id` (if containers table exists)
  - `sub_container_id UUID FK containers.id` (self-FK)
  - `tags TEXT[]`
  - `location_on_site TEXT`
  - These 6 are listed in `DEFERRED_TASK_CREATE_SCHEMA_FIELDS` (taskStore line ~58) and are **silently stripped before INSERT/UPDATE** when the tenant schema returns SQLSTATE `42703` or PostgREST `PGRST204`.
- RLS: grant `select, insert, update, delete` on tasks to authenticated + service_role per migrations; actual RLS ENABLED flag UNKNOWN pending live-SQL
- Key indexes: PK on id (implicit); indexes on (project_id, status, due_date, assigned_to) would be ideal for the read-path queries (taskStore fetches by project, by user, with status/overdue filters); indexes UNKNOWN pending live-SQL.

### 2.6 task_activities / comments / review fields
- `task_activities`: PK id; columns `task_id, user_id, activity_type, description, photos JSON[], progress_percentage, status_change, created_at`
- `task_comments`: if present as a separate table; current code reads comments via activities; DATABASE_ARCHITECTURE.md intent.
- Review fields: task-level `submitted_for_review` status transitions, `approved / rejected` status, `rejected_reason`.
- Realtime subscription: task_activities channel listens `event: INSERT` only — new activities trigger a full task re-fetch (optimized signal-only invalidation, as documented in the coupling map).

### 2.7 uploads and storage-linked metadata
- **No `public.uploads` table in the current ground-truth repository schema.** Storage metadata lives inline JSON in `task_activities.photos[]` with fields: `storage_path, public_url, uploaded_by, created_at, width, height, mime`.
- Storage bucket: `buildtrack-files` used literally in `fileUploadService.ts` lines ~99, 114, 167, 190.
- Bucket access: code currently generates public URLs via `getPublicUrl()`. If the bucket is private, media renders will break on fresh sessions. PUBLIC bucket policy status UNKNOWN pending Dashboard/SQL verification.

**Findings in this section:**
- **F-003 (P1, critical for 01M):** Tasks redesign metadata 6-column migration (primary_assignee_id, delegated_user_ids, container_id, sub_container_id, tags, location_on_site) has not been proven to exist on the live tenant schema; until M-SUPABASE-03b migration runs, these fields are SILENTLY DROPPED on older tenants and data-loss occurs on writes. This is the ROADMAP L98 line-item, elevated to a P1 finding because S-UX-01M Create Task Location Refinement ships a location_on_site WRITE path with NO fallback compatibility layer (DEFERRED_TASK_CREATE_SCHEMA_FIELDS includes it, so stripping happens correctly; but the CreateTask UI picker currently sets it — if the column does not exist, users silently believe their location was saved when it was discarded). Confidence = repo-only until live-SQL runs.
- **F-005 (P1):** Storage bucket `buildtrack-files` public/private status UNKNOWN; code uses public URLs. If bucket is private, photo display breaks post-first-session. Confidence = repo-only / UNKNOWN bucket policy pending live verification.
- **F-007 (P2):** Legacy task status fields (current_status vs unified status model dual-path) create redundant column bloat and client-layer ambiguity; recommend soft-deprecation + migration in follow-on. Confidence = repo-only (verifiable from live column inventory).

---

## §3 App Coupling

### 3.1 5 stores + supabase.ts + RealtimeSyncManager — coupling map
- Fully documented in companion deliverable **A: system coupling map**. Key points reiterated here for the inspection summary:
  1. authStore → auth.users (GoTrue) + public.users (profile) — Hybrid SoT.
  2. userStore → public.users + companies — DB SoT, invalidated by Realtime users-channel (UPDATE only).
  3. projectStore → projects + user_project_assignments — Hybrid with per-resource dedupe via buildResourceKey/hasFetchedOnce pattern (post-fc2807b fix; identity loop eliminated).
  4. taskStore → tasks + task_activities + task_read_status + project_locations read + inline JSON photo metadata. **DB SoT EXCEPT for the 6 deferred redesign fields (see F-003), which are cache-authoritative-temporary until migration.**
  5. fileUploadService → storage bucket `buildtrack-files` (bytes) + inline JSON attachment metadata (task_activities.photos). No public.uploads metadata table.
  6. RealtimeSyncManager — 4-channel signal-only invalidation; NEVER writes values directly into stores. Always refetches via store methods on a change signal.

### 3.2 KEY FINDING: getDeferredTaskSchemaField() compatibility layer + 42703/PGRST204 union retry

**WHAT IT IS.** S-UX-01I deliverable. Implementation in `src/state/taskStore.supabase.ts` lines ~58–154 and two activation sites:
- `createTask()` lines ~1551–1563: `fullInsertPayload` → first attempt; if Postgres returns `code=42703 (undefined_column)` OR PostgREST returns `PGRST204 (column does not exist)`, AND the error message/details/code text string-includes one of the 6 snake_case field names → retry with `stripDeferredTaskSchemaFields(fullInsertPayload)`.
- `updateTask()` lines ~1939–1959: same pattern, with an additional short-circuit: if the stripped payload has 0 keys (the entire update was redesign-field-only), treat as `skippedCompatibilityOnlyUpdate = true` and `error = null` (no actual DB write occurred; UI shows success but values were dropped silently).

**WHERE IT FIRES.** Any tenant schema older than the upcoming redesign-metadata migration where column set = pre-01I migration. Confidence = repo-only. We do not know which tenants (if any) are currently firing the compat path in production, because:
1. There is NO aggregate telemetry.
2. The fallback route only produces a console.warn (which is stripped from the Expo release build).
3. No production logs are centralized.

**WHAT IT STRIPS.** 6 fields × 2 naming forms (snake_case for create INSERT payload, camelCase at the runtime user-provided updates layer):
- Snake: `primary_assignee_id, delegated_user_ids, container_id, sub_container_id, tags, location_on_site`
- Camel: `primaryAssigneeId, delegatedUserIds, containerId, subContainerId, tags, locationOnSite`

**WHICH TENANT SCHEMA VERSIONS TRIGGER IT.** Any tenant schema that has not run the 2026-07 post-01I tasks-redesign metadata migration. Currently, `supabase/migrations/` folder contains `20260715000100` through `20260715000800` migrations; none in that date range add the 6 fields (verified by scan). So:
- If the tenant applied the 2026-0715 migration set AND then manually applied a separate migration, columns might exist.
- If the tenant ONLY ran the checked-in migrations and NO manual follow-ups, columns DO NOT exist and compat path fires 100% of the time.

**CRITICAL FINDING F-003 here.** Until migration M-SUPABASE-03b (placeholder for tasks redesign 6-column migration) is applied across ALL tenants:
- The 6 fields are WRITE-only locally (they update the Zustand cache via the optimistic UI path) but are LOST on the next app restart/reload/fresh read because they never made it to the DB.
- This is a *silent data-loss bug* for any user who sets delegation/container/tags/location on an older tenant. S-UX-01M Create Task Location Refinement UI MUST ship ONLY AFTER the migration runs on all active tenants; otherwise the existing `location picker → locationOnSite → stripped` path will silently lose user data and look like a UX bug.

### 3.3 supabase.ts client entry point
- Single singleton `supabase` client with Expo secure storage + React Native AsyncStorage session persistence (uses `@supabase/supabase-js` + `expo-secure-store` adapter).
- Anon key only inside `.ts` app code; service_role only in root standalone admin JS scripts — never imported into src/. Good separation.

**Findings in this section:**
- **F-003 (P1, elevated):** Tasks redesign metadata 6-col migration + cross-tenant backfill required before S-UX-01M ships. See §3.2 above.
- **F-006 (P1):** No telemetry/metric to track how often the deferred-compat fallback fires (console.warn only). Recommend: if Supabase Logflare or Postgres audit triggers are enabled, add a lightweight counter/log row so the follow-on migration's success can be measured. Confidence = repo-only UNKNOWN live.
- **F-008 (P2):** Legacy status-field dual-path redundancy; recommend unifying and dropping redundant columns in follow-on.

---

## §4 Runtime Safety

### 4.1 Cache vs database authority boundaries
- Aligned to SOURCE_OF_TRUTH.md: DB writes are authoritative; cache is read-through performance layer.
- Cache invalidation channels:
  1. Post-write success handler in each store: stores re-fetch affected resourceKeys after any write.
  2. Realtime 4 channels: signal invalidation → re-fetch.
- The only exception (documented repeatedly above): 6 deferred redesign fields are temporarily cache-authoritative because the compat layer strips them from writes. This is a known gap (F-003), not an architectural drift.

### 4.2 Optimistic update safety
- Optimistic writes in the main screens (CreateTask, TaskDetail QuickActions, Tasks row edits) generally follow the pattern:
  1. Pre-apply update to Zustand cache (fast UI feedback).
  2. Issue the Supabase UPDATE/INSERT in the background.
  3. If write fails → rollback cache + surface error (toast + console.error).
- Verified in taskStore.supabase.ts lines ~1880–1960 (updateTask pre-apply + rollback branches) and lines ~1540–1569 (createTask).

### 4.3 Realtime update assumptions
- Per deliverable A §Realtime channels: all 4 are SIGNAL-ONLY (never write the postgres_changes payload directly; always call `fetchXxx(id)` to do a SELECT). This is robust against payload shape drift, BUT:
  - **Postgres_changes publication membership is UNKNOWN on the live tenant schema.** If any of the 4 tables are not in the publication OR the publication does not emit for the specific event mask (e.g., tasks needs `event='*'`, users needs `event='UPDATE'`, task_activities needs `event='INSERT'`, projects needs `event='*'`), the channel receives 0 events and stale state persists.
  - **Network loss handling:** RealtimeSyncManager has cleanup on unmount and re-subscription via the component mount hook. But there is no aggressive reconnect loop with exponential backoff in the event the WebSocket dies silently.

### 4.4 Sandbox/test environment safety gates
- `scripts/sandbox/bootstrap_minimal_supabase.sql` (minimal bootstrap) — read-only for this milestone.
- `scripts/greenfield/wipe_remote.sql` + `apply_remote.sh` — wipe_remote contains explicit `GRANT ALL` / `DROP IF EXISTS` statements that ONLY touch the parity-greenfield target (invoked via `GREENFIELD_SERVICE_ROLE_KEY env var gate`). The blast radius is limited because the script requires a dedicated service role key env var that is set only in CI parity jobs. There is NO blanket `DROP public.*` that accidentally targets prod if the wrong env is pointed.
- `scripts/maestro/*` scripts are entirely local-simulator Maestro flow wrappers with `DRY_RUN` support (`run-qa01-suite.sh` line ~50 `DRY_RUN=0` default, overridden via env). Good gate.

### 4.5 Service-role script inventory + blast-radius check
Inventory of root-level service-role–using JS scripts (each imports `SUPABASE_SERVICE_ROLE_KEY` from env):
| Script | Purpose | Has safety gate / dry-run? |
| --- | --- | --- |
| `rebuild_auth_users_from_users.js` | Repopulate public.users from auth.users after bulk invite | NO explicit `--dry-run`; errors on missing env only. **Potential blast radius high.** |
| `check_user_sync.js` | Check auth.users ↔ public.users sync drift | Read-only probe, safe. |
| `diagnose_user_update_errors.js` | Diagnose recent user-update errors via selects | Read-only probe, safe. |
| `check_and_fix_auth_users.js` | Check + optionally fix mismatches | **YES has `--dry-run` / `--check-only` (line 29 args includes; lines 339, 637, 666, 725 guard the write branches).** Writes only when CHECK_ONLY/DRY_RUN both false. |
| `fix_missing_user_record.js` | Create user row after auth sign-up mismatch | NO dry-run gate; errors on missing env. Medium blast radius. |
| `scripts/greenfield/apply_remote.sh` | Apply migrations on parity target; env-gated to greenfield keys | Target-gated to a new DB; blast radius limited by dedicated env-var key requirement. |

Additional documentation references with `SUPABASE_SERVICE_ROLE_KEY` env patterns (no secrets committed, env-only — good):
- `SUPABASE_OPERATIONS_RUNBOOK.md`, `CHECK_AND_FIX_AUTH_USERS.md`, `RESET_PASSWORDS_README.md`, `REBUILD_AUTH_USERS_GUIDE.md`, `SUPABASE_SQL_ACCESS.md`.

**Findings in this section:**
- **F-009 (P1):** Two service-role admin scripts (`rebuild_auth_users_from_users.js`, `fix_missing_user_record.js`) have NO `--dry-run` flag. If run against the wrong env (prod vs parity) they mutate production users/auth rows with no pre-flight diff output. Recommend: add `--dry-run` guard identical to the `check_and_fix_auth_users.js` pattern. Confidence = repo-only (verifiable in source code today).
- **F-005 (P1, reiterated):** Realtime publication membership verification required — are all 4 tables + specific events in the dashboard `postgres_changes` publication? UNKNOWN. See coupling map last column.
- **F-010 (P2):** No explicit WebSocket reconnect / backoff loop in RealtimeSyncManager — current mount hook re-subscribes only on component re-mount. If backgrounding kills the socket, channels stay silent until user kills/restarts the app. Recommend: follow-up milestone M-SUPABASE-04a adds a reconnect loop. Low severity because app reload fixes it; elevated to P2 not P1 because app reload is a common user recovery pattern.
- **F-011 (P2):** No storage bucket retention / lifecycle policy visible — `buildtrack-files` may grow unbounded. P2 capacity/cost hygiene finding.

**Findings in this section:** see bullets above for P0/P1/P2 inventory → cross-referenced into deliverable C.
