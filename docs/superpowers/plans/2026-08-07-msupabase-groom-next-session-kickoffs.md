# WS-SUPABASE-00 Groom Output — Next-Session Copy-Paste Kickoff Prompts

Generated: 2026-08-07 as part of WS-SUPABASE / M-SUPABASE-00 placeholder-groom cycle.

Each prompt below is copy-pasteable into the NEXT TRAE chat that starts with `@solo-orchestrator` on `master` HEAD after the groom commit lands.

---

## Prompt 1 = Session 2 Kickoff (M-SUPABASE-02a + M-SUPABASE-02b combined P0 Security + Integrity)

Copy verbatim into the next chat that runs remediation on the live tenant(s):

```
@solo-orchestrator

MILESTONE: WS-SUPABASE / M-SUPABASE-02a + M-SUPABASE-02b combined — Confirmed-live baseline conversion (Gate 1 live-SQL REQUIRED NOT OPTIONAL) + RLS 7-table enablement + public.users FK/policy NOT VALID + VALIDATE later rollback-safe.
CANONICAL INPUTS:
  - ROADMAP.md rows Order 13.1 (M-SUPABASE-02a RLS P0) + Order 13.2 (M-SUPABASE-02b FK P0).
  - Live connection parameters: SUPABASE_SQL_ACCESS.md lines 6–38 (pooler aws-1-ap-south-1.pooler.supabase.com:6543, /opt/homebrew/opt/libpq/bin/psql binary, username=postgres.<PROJECT_REF>, ~/.pgpass secret-handling; alternative = run via Supabase Dashboard SQL Editor and paste redacted outputs).
  - WS_SUPABASE_01_READONLY_AUDIT.sql — 7 read-only sections for Gate 1 live introspection.
  - Historical 2026-07-12 audit P0 finding: anon client could READ 7 production tables live-confirmed on 2026-07-12. M-SUPABASE-01 close stated: next session MUST re-verify live via the same SQL to convert UNKNOWN → confirmed-live before closing 02a.
  - Historical migration inputs for policy helpers: supabase/migrations/20260715000300_*.sql (has user_has_project_access() helper + existing per-role templates).

DELIVERABLES (docs only + 1 migration SQL for 02a policies + 1 migration SQL for 02b FK/policy; NO PROD SOURCE CODE EDITS IN THIS SESSION):
  (A) §Gate-1 live-SQL appendices in 02a/02b close report = outputs of the 7 sections of WS_SUPABASE_01_READONLY_AUDIT.sql, redacted, with anon SELECT row counts highlighted — anon=0 pass, anon>0 fail = requires 02a remediation work below.
  (B) 1 new idempotent supabase/migrations/YYYYMMDDHHMMMS02a_rls_anon_hardening.sql = ENABLE RLS on 7 tables (IF NOT EXISTS enabled), REVOKE default public grants from anon, policies with helpers. Header line comment "ROLLBACK: drop policies + disable RLS if exists".
  (C) 1 new idempotent supabase/migrations/YYYYMMDDHHMMMS02b_users_fk_not_valid.sql = ALTER TABLE public.users ADD CONSTRAINT IF NOT EXISTS users_id_fkey FOREIGN KEY…ON DELETE CASCADE NOT VALID + CREATE POLICY IF NOT EXISTS users_self_write WITH CHECK. Header comment "ROLLBACK: ALTER TABLE DROP CONSTRAINT IF EXISTS users_id_fkey; DROP POLICY IF EXISTS users_self_write".
  (D) Close report documenting: live baseline numbers, number of policies added per table, close-gate anon client SELECT 0 rows on all 7 tables; signup parity harness 0 constraint violations after NOT VALID add; live rc=0.
  (E) ROADMAP.md 13.1 + 13.2 rows: Pipeline → Closed (YYYY-MM-DD); AGENTS.md Current Delivery Status update.

HARD SAFETY RULES:
 1. Gate 1 live-SQL READ-ONLY audit pass IS MANDATORY this session. Do not close 02a/02b with "code-path only" — at minimum, run 7-section audit in Supabase Dashboard SQL Editor and paste redacted outputs into §Appendix. If credentials/Dashboard access are not available: RETURN session BLOCKED with exact blocker (no ~/.pgpass AND user declined to run Dashboard) — do not mark Closed.
 2. Schema edits ONLY of these classes are permitted: ALTER TABLE … ENABLE RLS, REVOKE, CREATE POLICY, CREATE POLICY IF NOT EXISTS, ALTER TABLE … ADD CONSTRAINT … NOT VALID. ABSOLUTELY NO: DROP TABLE, ALTER TABLE DROP COLUMN, UPDATE, INSERT, DELETE, TRUNCATE, VALIDATE CONSTRAINT in this session. VALIDATE CONSTRAINT is scheduled in a follow-on off-hours P2 milestone later.
 3. Anti-secret grep MANDATORY before commit gate: grep -rE "(password|service_role|jwt|ANON_KEY|PGPASSWORD)=." documentation/ scripts/ docs/ .trae/documents/ → 0 matches. The 2 new migration SQLs must contain env-var or project_ref patterns only; NEVER embed PROJECT_REF or password strings.
 4. After each policy add: run a live anon key select (via anon JS client probe OR Dashboard set role = anon) on all 7 tables and paste results. Result must be 0 rows COUNT on all 7. If any row comes back: fail close gate, add more policies, loop back.
 5. Service-role scripts if used to apply migration: use DRY_RUN default first; print --diff; require EXPLICIT --apply before mutation. If no --dry-run pattern in current apply script, add it (this session only the script, pattern reuse from check_and_fix_auth_users.js verbatim).

AGENT WORKFLOW CONTRACT (feature variant):
@planner → @builder → @reviewer + anti-secret gate (0 matches) + TRAE-code-review (SQL rollback headers) → [git-commit skill: commit message = "docs(supabase-02): live baseline + RLS+FK hardening"; scope docs + 2 migration SQLs + ROADMAP + AGENTS edits ONLY; NO src edits] → @test-engineer (tsc rc=0; L2 regression baseline; plus a 1-shot anon SELECT probe counts if anon key available via env EXPO_PUBLIC vars) → @qa-validator (5/5 docs review incl. anon counts 0 + signup 0 violations) → D8 Delivery push origin/master rev-list 0 → END 1-line: "M-SUPABASE-02a/b closed. Live baseline converted to confirmed-live. Anon SELECTs 0 all 7. P0 integrity mitigated."
```

---

## Prompt 2 = Session 3 Kickoff (M-SUPABASE-03b 6-col tasks migration + EXPLICIT Schema Review Gate BEFORE live apply)

Copy verbatim. THIS PROMPT HAS A HUMAN-IN-THE-LOOP GATE between Phase A and Phase B. The agent stops after Phase A until human GO.

```
@solo-orchestrator

MILESTONE: WS-SUPABASE / M-SUPABASE-03b — Tasks redesign metadata 6-column migration + cross-tenant backfill. PREREQUISITES BEFORE YOU START: (1) M-SUPABASE-02a Closed; (2) M-SUPABASE-02b Closed; (3) S-UX-01J/K/M/N are all still in Pipeline NOT Closed.
CANONICAL INPUTS:
  - ROADMAP.md Order 13.4 row (ROLLOUT WARNING verbatim + 6-col explicit list `primary_assignee_id, delegated_user_ids, container_id, sub_container_id, tags, location_on_site`).
  - taskStore.supabase.ts lines 58-73 (snake_case + camelCase 6-col lists), lines 106-154 getDeferredTaskSchemaField() 42703/PGRST204 union retry, lines 1551-1563 createTask retry stripped payload, lines 1946-1959 updateTask retry stripped payload.
  - taskStore.deferred-fallback.contract.test.ts (fire-rate 0 close gate test).
  - taskStore.supabase.unit.test.ts deferred fallback scenarios.

DELIVERABLES IN 2 PHASES WITH AN EXPLICIT HUMAN-IN-THE-LOOP GATE PHASE BETWEEN THEM.
PHASE A (NO WRITES AGAINST ANY LIVE TENANT — artefacts only):
  (A1) 1 new supabase/migrations/YYYYMMDDHHMMMS03b_tasks_6col_metadata.sql = idempotent:
       1-6 ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS (primary_assignee_id UUID REFERENCES users(id) NULL; delegated_user_ids UUID[] NULL; container_id UUID NULL; sub_container_id UUID NULL; tags TEXT[] NULL; location_on_site TEXT NULL).
       7 CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_primary_assignee ON tasks(primary_assignee_id);
       8 CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_tags_gin ON tasks USING GIN(tags);
       9 Best-effort backfill: `UPDATE tasks SET primary_assignee_id = assigned_to WHERE primary_assignee_id IS NULL AND assigned_to IS NOT NULL;`
       Header line rollback comment: "ROLLBACK: CREATE OR REPLACE VIEW … (backup cols first IF populated); DROP INDEX CONCURRENTLY IF EXISTS; ALTER TABLE tasks DROP COLUMN IF EXISTS … (6 cols) IF AND ONLY IF they did not pre-exist and are empty; guarded pre-check script so existing 3rd-party writes are NOT dropped".
  (A2) 1 rollback script supabase/migrations/YYYYMMDDHHMMMS03b_ROLLBACK.sql with the guard above and a DRY_RUN pre-check.
  (A3) Apply (A1) on parity tenant / sandbox tenant ONLY. Run the deferred-fallback contract tests against parity tenant. Result: getDeferredTaskSchemaField() = null for every task create and update write → fire rate 0.
  (A4) Gate artefacts: the signed-off schema review checklist doc = (a) column definitions, (b) indexes + CONCURRENTLY usage justification, (c) best-effort backfill row estimate count from Gate 1 live-SQL, (d) rollback script proofed against parity with dry-run rc=0, (e) timeline for live apply (off-hours recommended).

  ⚠️  STOP AFTER PHASE A AND WAIT FOR EXPLICIT HUMAN "GO" BEFORE PHASE B.
  ⚠️  THIS IS NON-NEGOTIABLE PER F-003 ROLLOUT WARNING IN ROADMAP 13.4 NOTES.

PHASE B (AFTER EXPLICIT HUMAN "GO" RECEIVED):
  (B1) Apply (A1) on remaining live tenant(s). Run post-apply anon key check (no regression vs 02a RLS close gates).
  (B2) Close test: deferred-fallback contract against each live tenant → fire rate 0 all 6 fields. tsc --noEmit rc=0; test:regression baseline PASS; test:l2 components baseline PASS.
  (B3) ROADMAP.md Order 13.4 13.12 13.13 13.14 13.15: update 13.4 → Closed (YYYY-MM-DD). Update 13.12 (01J)/13.13(01K)/13.14(01M)/13.15(01N) Notes column to say "Prereq 03b Closed. Unblocked to schedule." (do NOT mark them Closed; they just unblock). AGENTS.md Current Delivery Status update.

HARD SAFETY RULES:
 1. Phase A never writes live tenant. Phase B only after explicit GO.
 2. All 6 ADD COLUMN IF NOT EXISTS so repeated application idempotent; no DROP COLUMN in migration SQL itself; rollback script is SEPARATE, has pre-check guard that drops ONLY if fully empty and did not pre-exist.
 3. Anti-secret 0 matches; commit message: `docs(supabase-03b): phase A schema review artefacts` (phase A commit) + later `docs(supabase-03b): phase B live apply close` (separate phase B commit). Optionally single commit if GO same session.
 4. INDEX CONCURRENTLY ONLY; never CREATE INDEX non-concurrently against live tables.
 5. Best-effort UPDATE backfill only; no rows are deleted. If primary_assignee_id is already set, leave untouched.

AGENT WORKFLOW CONTRACT:
Phase A:
@planner → @builder (A1..A4) → @reviewer + anti-secret 0 + TRAE-code-review SQL headers → [git-commit (A-only)] → @test-engineer → @qa-validator docs-review → PHASE-A BLOCKED OUTPUT "Phase A complete. HUMAN SCHEMA REVIEW REQUIRED. Await GO before Phase B." → CYCLE PAUSES.
When human GO provided later, resume:
→ @builder (B1..B3) → @reviewer → [git-commit B-only] → @test-engineer → @qa-validator → D8 push → END 1-line: "M-SUPABASE-03b closed. 6-col live. Deferred fire rate 0. S-UX-01J/K/M/N unblocked to schedule."
```

---

## Prompt 3 = Session 4 Kickoff (Parallel P1s 03a/03c/03d/03e + P2 04a-d — can be interleaved with UX tails after 03b)

**Status (2026-08-13):** Prompt 3 items Closed except **M-SUPABASE-04b** (Blocked until ~2026-09-07; no column drops). **M-SUPABASE-04c** Closed docs/policy (hot retain + 6-month back-pay; no live expire). Cold archive parked as **M-SUPABASE-04e** (Order 13.18, Pipeline deferred). Historical prompt body left intact below.

These are parallel-safe. You can do them one-at-a-time, or combined into a single "P1/P2 Hygiene" session if bandwidth allows. Copy verbatim as a combined master prompt:

```
@solo-orchestrator

MILESTONE: WS-SUPABASE PARALLEL P1s + P2s — M-SUPABASE-03a (role CHECK), 03c (bucket), 03d (observability), 03e (script safety), 04a (publication reconnect), 04b (status cleanup), 04c (retention), 04d (indexes). Can run interleaved with WS-UX tail slices; only prerequisites: 02a/b for P2 audit shared steps.
CANONICAL INPUTS:
  - ROADMAP.md rows Order 13.3 (03a), 13.5 (03c), 13.6 (03d), 13.7 (03e), 13.8 (04a), 13.9 (04b), 13.10 (04c), 13.11 (04d).
  - Shared live-Gate-1 audit from 02a (pg_publication_tables for 04a; pg_stat_user_indexes for 04d; bucket/policies listing for 03c).
  - Service-role script inventory: 5 scripts; check_and_fix_auth_users.js has --dry-run guards already; siblings rebuild_auth_users_from_users.js + fix_missing_user_record.js missing gate.

SCOPE DOCS + PARITY CODE ONLY.
DELIVERABLES (choose scoping in planner — you can split into 1/2/4/8 sub-sessions or combine; user's budget call):
  03a CHECK constraints role on users + user_project_assignments; parity harness invalid insert fails.
  03c bucket `buildtrack-files` public/private decision + if private fileUploadService signedUrl refactor; if public runbook note.
  03d fallback fire-rate audit hook taskStore (or Postgres audit table). Gate metric: 7-day sustained 0 after 03b.
  03e script dry-run ports to 2 siblings.
  04a publication audit + RealtimeSyncManager reconnect backoff.
  04b 30-day cool-down post 03b legacy status dual-write removal.
  04c bucket retention lifecycle policy + runbook.
  04d composite indexes health pass + Dashboard p95 delta.

RULES:
  - Each item follows: @planner → @builder → @reviewer anti-secret 0 → commit → test-engineer → qa-validator → D8 push and 1-line close state per item, or batched.
  - Source-code edit windows allowed ONLY for 03c (signedUrl if private), 03d (hook), 03e (scripts), 04a (reconnect), 04b (dual-write removal). All others docs + SQLs only.
  - Anti-secret 0, tsc rc=0, test:regression baselines for all close gates.
```
