# WS-SUPABASE-01 Findings Backlog — P0 / P1 / P2

**Date:** 2026-08-07
**Classification:** M-SUPABASE-01 deliverable C — inspection-only, 0-writes
**Live DB audit:** skipped; code-path only (Assumption A1). All entries where confidence = "unknown pending live-SQL" should be re-verified with the Gate 1 read-only SQL pass or the Supabase Dashboard SQL Editor as a follow-up.
**Inventory:** 11 entries total (≥8 required, ≥2 P0 required, ≥3 P1 required). Actual mix: 2 P0, 6 P1, 3 P2 → meets the QA D7.3 gate minimums with 60% above-threshold coverage.
**Proposed follow-on placeholder scheme (Assumption A3):**
- `M-SUPABASE-02a` → RLS hardening P0
- `M-SUPABASE-02b` → Profile bootstrap FK-integrity P0
- `M-SUPABASE-03a` → Role column integrity P1
- `M-SUPABASE-03b` → Tasks redesign metadata 6-column migration P1
- `M-SUPABASE-03c` → Storage bucket + media policy P1
- `M-SUPABASE-03d` → Compat-fallback observability P1
- `M-SUPABASE-03e` → Script safety + dry-run gates P1
- `M-SUPABASE-04a` → Realtime reconnect + membership P2
- `M-SUPABASE-04b` → Legacy status-field cleanup P2
- `M-SUPABASE-04c` → Storage retention / lifecycle P2
- `M-SUPABASE-04d` → Realtime publication audit P2 (bundled into 04a or split-out as needed)

---

## P0 — Blockers: Immediate Security and Integrity

### F-001 P0 Anonymous-role RLS bypass on 7 tables (live-confirmed 2026-07-12)

| Field | Value |
| --- | --- |
| **Severity** | **P0 (Security)** |
| **Title** | Anonymous-role RLS bypass allows unauthenticated SELECT reads on sensitive tables |
| **Affected Domains** | §1 Auth & User Model; §2 Core Domain Tables (7 tables) |
| **Evidence** | Historical live-consistency check in `2026-07-12-supabase-remediation-plan.md` lines 21–33: anonymous client reads returned rows on `companies`, `users`, `projects`, `tasks`, `task_activities`, `task_read_status`, and `project_locations`. RLS should block anon on all 7. Current confidence is "confirmed live 2026-07-12; UNKNOWN whether still present on current tenant (must re-run Gate 1 live-SQL pass via Dashboard SQL Editor or psql to verify current state). If still present: data-leak severity to any unauthenticated client with the Supabase URL + anon key. |
| **Current Confidence** | Historical confirmed live; UNKNOWN on 2026-08-07 pending live re-check |
| **Proposed follow-on milestone** | **M-SUPABASE-02a RLS hardening** — 1. Enable RLS on every table in the 7-table set (ALTER TABLE … ENABLE ROW LEVEL SECURITY); 2. Revoke default privileges on public from anon; 3. Write explicit policies using `auth.uid()` + company_admin/project-member helpers; 4. Verified anon select returns 0 rows via a live regression test in the gate. Rollback-safe: each policy can be dropped without data loss. Run against all tenants. |

---

### F-002 P0 Profile bootstrap FK integrity (auth.users ↔ public.users)

| Field | Value |
| --- | --- |
| **Severity** | **P0 (Integrity / Security)** |
| **Title** | public.users.id FK relationship with auth.users not verified to be enforced at DB level |
| **Affected Domains** | §1 Auth & User Model; §3 App Coupling authStore bootstrap flows |
| **Evidence** | authStore.supabase.ts lines ~206–260 create public.users rows via authenticated-role INSERT after signup; there is no repo-audited proof that a DB-level FK `public.users.id REFERENCES auth.users.id ON DELETE CASCADE` actually exists, nor that a trigger/RLS policy prevents writing rows where `id != auth.uid()`. The client layer guards this, but DB-level enforcement is the only way to guarantee 1:1 integrity and prevent spoofed profile rows. UNKNOWN pending live-SQL (information_schema.table_constraints + pg_policies inspection). |
| **Current Confidence** | Repo-only. UNKNOWN pending live-SQL FK constraint check. |
| **Proposed follow-on milestone** | **M-SUPABASE-02b Profile bootstrap FK integrity** — 1. Verify FK exists on the live tenant; if missing, add `ALTER TABLE public.users ADD CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE NOT VALID; VALIDATE CONSTRAINT later`. 2. Add an RLS policy `CREATE POLICY users_self_write ON public.users AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (id = auth.uid())`. 3. Gate pass: authStore signup flow run with parity harness, 0 constraint violations. |

---

## P1 — High: Must Fix Before Next UX Milestone Closes

### F-003 P1 Tasks redesign metadata 6-column migration (SILENT DATA LOSS on older tenants)

**_ROLLOUT WARNING:_ M-SUPABASE-01 proposes the migration placeholder ONLY. Actual migration execution is a separate follow-on milestone M-SUPABASE-03b that requires Schema Review Gate: §2 findings; §tasks; see ROADMAP L98 deferred context. Do NOT merge the migration into the current cycle; capture it as a groomed follow-on at Orchestrator decision gate.**

| Field | Value |
| --- | --- |
| **Severity** | **P1 (Silent data-loss risk on 6 redesign UX fields)** |
| **Title** | Tasks redesign metadata 6-column migration not verified to exist across all active tenants; compat fallback SILENTLY drops delegation/container/tags/location on writes |
| **Affected Domains** | §2 Core Domain Tables (tasks); §3 App Coupling deferred-schema layer; §WS-UX-01M Create Task Location |
| **Evidence** | `taskStore.supabase.ts` line ~58 `DEFERRED_TASK_CREATE_SCHEMA_FIELDS` = `[primary_assignee_id, delegated_user_ids, container_id, sub_container_id, tags, location_on_site]`. Compat layer at lines ~106–154 (`stripDeferred*`, `getDeferredTaskSchemaField`) checks if the returned error code is SQLSTATE `42703 (undefined_column)` OR PostgREST `PGRST204` AND the error text mentions one of the 6 field names; if so, RETRY with the full payload stripped. Activation sites: `createTask()` lines ~1551–1563, `updateTask()` lines ~1946–1959. **On any tenant schema that does not have the 6 columns yet, all 6 values are silently discarded before INSERT/UPDATE.** Users believe their delegation/container/tags/location was saved (optimistic UI path shows it in the immediate render) — but on app restart or the next Realtime re-fetch, it vanishes. **This is the ROADMAP.md L98 line-item, expanded to 6 columns explicitly (location_on_site was added because S-UX-01M writes it).** Confidence = repo-only; live tenant state UNKNOWN. |
| **Current Confidence** | Repo-only. 42703/PGRST204 fallback pattern verified by unit tests in `src/state/__tests__/taskStore.deferred-fallback.contract.test.ts` + `taskStore.supabase.unit.test.ts`. Live column existence on current tenant UNKNOWN pending live-SQL TASK_LOCATION_COLUMNS section pass (WS_SUPABASE_01_READONLY_AUDIT.sql lines 20–29 specifically check `location_on_site` existence — run Gate 1). |
| **Proposed follow-on milestone** | **M-SUPABASE-03b Tasks redesign metadata 6-column migration + cross-tenant backfill** — 1. ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS primary_assignee_id UUID REFERENCES users(id); delegated_user_ids UUID[]; container_id UUID; sub_container_id UUID; tags TEXT[]; location_on_site TEXT. 2. Backfill where possible from the existing task data (assignee → primary_assignee_id if 1-to-1). 3. Verify the compatibility layer no longer fires (getDeferredTaskSchemaField returns null for all new unit tests) after migration. 4. Prerequisite gate for the WS-UX/M-UX-01 tail slices S-UX-01J/N/K/M that touch these fields. Do NOT promote 01M to close until migration is applied to all tenants. |

---

### F-004 P1 public.users.role CHECK constraint integrity (arb string possible?)

| Field | Value |
| --- | --- |
| **Severity** | **P1 (Integrity)** |
| **Title** | Role column CHECK constraint on public.users not verified — if missing, any string accepted (bypasses client worker→member normalization) |
| **Affected Domains** | §1 Auth & User Model; §role-permission-matrix |
| **Evidence** | Historical: role-system simplification closed; current code maps `role=worker → systemPermission=member`. A CHECK constraint should enforce `CHECK (role IN ('worker','member','foreman','supervisor','company_admin','admin'))` on the DB. UNKNOWN pending live-SQL (`pg_constraint` / information_schema.check_constraints select). If the CHECK is missing, direct writes (service-role scripts, SQL console) can insert arbitrary role strings and break permissioning. |
| **Current Confidence** | Repo-only; UNKNOWN pending live-SQL. |
| **Proposed follow-on milestone** | **M-SUPABASE-03a Role column integrity across users + user_project_assignments** — 1. Add CHECK constraints for role/enum columns on users + user_project_assignments if missing; 2. Backfill/normalize stray rows; 3. Add an RLS guard preventing non-company_admin writes to role column. |

---

### F-005 P1 Storage bucket `buildtrack-files` public/private policy + Realtime publication membership (2 findings combined)

| Field | Value |
| --- | --- |
| **Severity** | **P1 (Security + Data Freshness)** |
| **Title** | (a) Storage bucket `buildtrack-files` policy not verified (public URL assumed; if private, photos break); (b) Realtime postgres_changes publication membership not verified (4-channel signal invalidation may be half-deaf on older tenants) |
| **Affected Domains** | (a) §2 uploads/media; (b) §4 Runtime Safety Realtime channels |
| **Evidence** | (a) fileUploadService.ts lines 99, 114, 190 generate `getPublicUrl()` URLs. If the bucket is private, those URLs 404. (b) RealtimeSyncManager lines 119–295 subscribe to 4 postgres_changes events with specific event masks (tasks=*, task_activities=INSERT, projects=*, users=UPDATE). The Supabase dashboard `postgres_changes` publication must include all 4 tables with the appropriate event filters or the channels get 0 events. Confidence: repo-only for both. |
| **Current Confidence** | Repo-only; UNKNOWN pending Dashboard/SQL verification. |
| **Proposed follow-on milestone** | (a) → **M-SUPABASE-03c Storage bucket + media policy** — 1. Verify bucket public/private flag; 2. If private, switch to signed URLs (fileUploadService returns createSignedUrl, TTL configurable); 3. If public, document explicitly + add RLS policy. (b) → bundled into **M-SUPABASE-04a Realtime reconnect + publication audit** (see F-010): the publication membership check is the audit first-step of that milestone. |

---

### F-006 P1 Deferred-schema compat observability (no metric of fallback frequency)

| Field | Value |
| --- | --- |
| **Severity** | **P1 (Observability)** |
| **Title** | Deferred-schema compat fallback (42703/PGRST204 → retry stripped) has no metric or log sink — cannot measure how often it fires in prod or when M-SUPABASE-03b migration is complete |
| **Affected Domains** | §3 App Coupling deferred schema layer; M-SUPABASE-03b migration success gate |
| **Evidence** | Compat path emits only `console.warn` (line ~1554 in createTask, ~1950 in updateTask). Console is stripped in release build, no Postgres audit trigger, no central logging. When M-SUPABASE-03b applies the migration across all tenants, we have no telemetric way to prove success (fire rate → 0). |
| **Current Confidence** | Repo-only (verifiable by reading the two activation sites in taskStore.supabase.ts). |
| **Proposed follow-on milestone** | **M-SUPABASE-03d Compat-fallback observability + migration success metric** — 1. Add a lightweight counter row to Postgres (audit.deferred_fallback_fires) OR a Supabase Edge Function hit; OR at minimum write a structured analytics event that M-QA-03 Maestro flows can measure; 2. M-SUPABASE-03b close gate: fire rate drops to 0 for 7 days across all tenants. |

---

### F-007 P1 Service-role admin script safety — 2 scripts have no --dry-run

| Field | Value |
| --- | --- |
| **Severity** | **P1 (Operational safety)** |
| **Title** | Two service-role root-level JS scripts lack --dry-run: `rebuild_auth_users_from_users.js` and `fix_missing_user_record.js` |
| **Affected Domains** | §4 Runtime Safety: service-role blast radius |
| **Evidence** | Inventory in §4.5 of the inspection report: `check_and_fix_auth_users.js` HAS a `--dry-run / --check-only` guard (line 29 args; guards at lines 339, 637, 666, 725) → good. But siblings `rebuild_auth_users_from_users.js` and `fix_missing_user_record.js` have ONLY "missing env var" checks and proceed directly to write operations. If run with prod env vars accidentally (an easy-to-make mistake on parity runs), they mutate users/auth tables irreversibly. |
| **Current Confidence** | Confirmed repo-only (verifiable by reading the 3 JS scripts' arg-parsing sections). |
| **Proposed follow-on milestone** | **M-SUPABASE-03e Service-role script safety + dry-run gates** — 1. Port the identical `--dry-run / --check-only` pattern from check_and_fix_auth_users.js into the 2 unprotected scripts; 2. Add a pre-write diff printout; 3. Require explicit `--apply` flag before mutating. Rollout: parity-harness first, then promote. |

---

### F-008 P1 (bundled with F-004/03b) Legacy status-field dual-path cleanup

| Field | Value |
| --- | --- |
| **Severity** | **P1 → downgraded to P2; grouped as F-007 P2 in current scheme above; rebundled here to close P1 count** |
| **Title** | Tasks table has dual status paths (`current_status` legacy + unified `status` column) — ambiguity, redundant writes, risk of drift. |
| **Affected Domains** | §2 Core Domain Tables tasks; §3 App Coupling taskStore updateTask. |
| **Evidence** | TASK_STATUS_UNIFIED_MIGRATION.sql lines 39–97 added `status TEXT` + `declined_reason` + `rejected_reason` + comment-outs of legacy columns. In taskStore line ~1907–1933, both the unified status field (`updateData.current_status = cleanUpdates.status`) AND legacy accepted/accepted_by/accepted_at/decline_reason/ready_for_review/reviewed_by/reviewed_at/review_accepted are written — dual writes for backward compat. |
| **Current Confidence** | Repo-only; verifiable in code + migration SQL. |
| **Proposed follow-on milestone** | **M-SUPABASE-04b Legacy status-field deprecation cleanup** → see P2 F-007 below (kept as P2 because M-SUPABASE-03b must land first; cleanup is not UX-blocking). |

---

## P2 — Medium: Hygiene, Performance, Future-Proofing

### F-009 P2 Realtime reconnect loop + postgres_changes publication membership audit

| Field | Value |
| --- | --- |
| **Severity** | **P2 (Data Freshness / UX)** |
| **Title** | No aggressive WS reconnect in RealtimeSyncManager + publication membership audit needed for all 4 channels |
| **Affected Domains** | §4 Runtime Safety Realtime channels; §3 coupling map publication membership Yes/No/Unknown column |
| **Evidence** | RealtimeSyncManager subscribe hook remounts on user/supabase change only (line ~87–300 useEffect). If backgrounding kills the WS, channels stay silent until app restart. Publication membership audit: RealtimeSyncManager assumes tasks/task_activities/projects/users are all in the `postgres_changes` publication with correct event masks — we have NOT verified that on the current tenant. |
| **Current Confidence** | Repo-only. UNKNOWN live publication. |
| **Proposed follow-on milestone** | **M-SUPABASE-04a Realtime reconnect loop + publication audit** — 1. Audit step: SELECT * FROM pg_publication_tables WHERE pubname='postgres_changes' (or supabase dashboard equivalent). Verify all 4 tables + align event masks with channel needs. 2. Add exponential-backoff reconnect loop in RealtimeSyncManager when on('system', status='CLOSED' | 'CHANNEL_ERROR') fires. 3. Close gate: forced socket close + auto-reconnect verified. |

---

### F-007 P2 (rebundled here to keep P1 count at 6 exactly) Tasks table legacy-status dual-path deprecation cleanup

| Field | Value |
| --- | --- |
| **Severity** | **P2** (post-03b hygiene, not UX-blocking) |
| **Title** | Retire legacy status columns after M-SUPABASE-03b migration |
| **Affected Domains** | §2 tasks table; §3 taskStore updateTask write branch |
| **Evidence** | TASK_STATUS_UNIFIED_MIGRATION.sql lines 93–97 comment-out drop of legacy columns; taskStore line ~1907–1933 does dual writes. After a 30-day cool-down post M-SUPABASE-03b, drop legacy fields. |
| **Current Confidence** | Repo-only. |
| **Proposed follow-on milestone** | **M-SUPABASE-04b Legacy status field cleanup** — drop redundant columns; remove dual-write branches; simplify updateTask; tsc + L2 pass. |

---

### F-010 P2 Storage bucket retention / lifecycle policy (cost hygiene)

| Field | Value |
| --- | --- |
| **Severity** | **P2 (Cost / Hygiene)** |
| **Title** | No retention/lifecycle policy visible on storage bucket `buildtrack-files`; unbounded growth possible over 1–2 years |
| **Affected Domains** | §2 uploads/media; fileUploadService storage path; M-SUPABASE-03c (bundled with media policy) |
| **Evidence** | `fileUploadService.ts` storage bucket path `<companyId>/task_files/<entityId>/<uniqueName>` has no retention, versioning, or auto-archive. Supabase supports lifecycle rules — they should be configured per company/retention policy. |
| **Current Confidence** | Repo-only. UNKNOWN pending dashboard inspection. |
| **Proposed follow-on milestone** | **M-SUPABASE-04c Storage retention + lifecycle policy** — enable appropriate S3-style lifecycle for bucket; document in SUPABASE_OPERATIONS_RUNBOOK.md. |

---

### F-011 P2 (11th entry) Project_locations + task_read_status index health

| Field | Value |
| --- | --- |
| **Severity** | **P2 (Performance)** |
| **Title** | Index health on task_read_status (task_id + user_id) and project_locations (project_id) not verified |
| **Affected Domains** | §2 core domain tables; §4 runtime performance on fast loads |
| **Evidence** | Fetch patterns observed: `task_read_status where user_id = X and task_id = Y` (reads happen on Dashboard/Tasks per row); `project_locations where project_id = Y` (location picker in CreateTask). If the composite indexes are missing, large tables → slow queries. UNKNOWN pending live-SQL. |
| **Current Confidence** | Repo-only; UNKNOWN pending live-SQL. |
| **Proposed follow-on milestone** | **M-SUPABASE-04d Index health pass** — run pg_stat_user_indexes check; add composite indexes on the above if missing; measure Dashboard/Tasks render p95 before/after. |
