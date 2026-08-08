# Workflow: WS-SUPABASE — M-SUPABASE-02a/02b UNBLOCK + M-SUPABASE-03b Close Gate

Use this rule file for the current top-priority combined cycle: 02a/02b RLS+FK hardening, then 03b tasks 6-col migration.

## CURRENT STATE ON 2026-08-08 = BLOCKED RULE 1

RULE 1 (MANDATORY BEFORE ANYTHING ELSE):
> Live Gate 1 read-only SQL pass REQUIRED NOT OPTIONAL before closing 02a/02b or producing ANY remediation migration SQL.

7 sections from WS_SUPABASE_01_READONLY_AUDIT.sql must produce redacted outputs (7/7):
1. PUBLIC_TABLES — list all public schema table names
2. TASK_LOCATION_COLUMNS — tasks table: location/location_on_site/project_id/assigned_by cols
3. PROJECT_LOCATIONS_TABLE_EXISTS — is project_locations a real table? (COUNT 0 or 1)
4. PROJECT_LOCATIONS_COLUMNS — full column spec if project_locations exists
5. TASK_LOCATION_JSON_TYPES — distribution of JSON.type values in tasks.location
6. TASK_LOCATION_ON_SITE_POPULATION — rows with non-null location_on_site vs total
7. TASK_LOCATION_LABEL_CANDIDATES — top-N distinct label values for location labels

Section 8 PROJECT_ASSIGNMENT_COUNTS is OPTIONAL extra (not counted in 7/7).

### Unblock Options (EXACT)

**Option A — ~/.pgpass pooler entry (preferred for automated runs):**
```bash
# Command 1 — write pooler line into ~/.pgpass (placeholders ONLY)
echo "aws-1-ap-south-1.pooler.supabase.com:6543:postgres:postgres.<PROJECT_REF>:<DATABASE_PASSWORD>" >> ~/.pgpass
chmod 600 ~/.pgpass

# Command 2 — run read-only Gate 1 audit against pooler using libpq psql
# NOTE: <PROJECT_REF> is replaced AT RUN TIME ONLY.
# NEVER hardcode <PROJECT_REF> into ANY git-tracked file.
# If testing multiple times, edit ~/.pgpass manually to avoid duplicate lines.
/opt/homebrew/opt/libpq/bin/psql -w -h aws-1-ap-south-1.pooler.supabase.com -p 6543 -d postgres -U postgres.<PROJECT_REF> -f /Volumes/KooDrive/InsiteApp/WS_SUPABASE_01_READONLY_AUDIT.sql
```

**Option B — Supabase Dashboard SQL Editor:**
- Open Supabase project Dashboard → SQL Editor
- Paste WS_SUPABASE_01_READONLY_AUDIT.sql contents section-by-section (or whole file)
- Run → copy outputs back into chat
- REDACT any tenant-specific identifiable data before pasting outputs; structure OK; actual UUIDs/addresses → `<REDACTED>`

If BOTH Option A AND Option B are unavailable by the user:
- EXIT with exact blocker text: `"no ~/.pgpass present AND user declined to paste dashboard outputs"`
- Do NOT proceed to remediation. Do NOT produce any migration SQL without the Gate 1 7/7 outputs.

---

## After Gate 1 Unblocked → Close 02a/02b

### 02a: RLS anon_block_all 7 tables
Apply `anon_block_all` USING false policy on 7 core tables:
- tasks, projects, project_memberships, comments, task_photos, subtasks, user_profiles

Idempotent migration pattern: DROP POLICY IF EXISTS + CREATE POLICY.
Helper: `user_has_project_access()` for user-scoped policies later.
Validation: anon SELECT returns 0 rows on all 7.

### 02b: users FK NOT VALID
Add FK from user_profiles.id (or equivalent users table) → auth.users(id).
USE NOT VALID to avoid full table scan on live table:
```sql
ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_id_fkey_auth_users
  FOREIGN KEY (id) REFERENCES auth.users(id) NOT VALID;
```
Deferred VALIDATE CONSTRAINT = future P2 task. Do NOT VALIDATE in 02b.

Evidence appendices: 7/7 Gate 1 outputs + anon SELECT 0 rows proof (7 tables) + FK \d user_profiles showing NOT VALID constraint.

---

## After 02a/02b Closed → 03b: Tasks 6-Column Migration (2-Phase HUMAN GATE)

### 7.0c F-003 ROLLOUT WARNING (VERBATIM)
The deferred-schema compat layer in src/state/taskStore.supabase.ts SILENTLY STRIPS 6 fields when INSERT/UPDATE hits a pre-migration tenant (SQLSTATE 42703 OR PostgREST PGRST204). This causes SILENT DATA LOSS for any UX that writes to these columns before 03b is closed on the tenant.

**6 columns:**
`primary_assignee_id, delegated_user_ids, container_id, sub_container_id, tags, location_on_site`

**CONSEQUENCE:** S-UX-01J/K/M/N MUST NOT ship before M-SUPABASE-03b is CLOSED on ALL production tenants.

### Phase A — Artefacts Only (NO LIVE WRITES)
Deliverables in this phase:
1. Idempotent migration SQL: CREATE COLUMN (IF NOT EXISTS pattern) for all 6 cols in tasks table
2. Any index DDL for performance (new cols indexed appropriately)
3. Containers table DDL: if project_locations exists (from Gate 1 §3), create containers table linked; if not, bundle containers into 03b DDL as standalone child table
4. Dry-run on parity tenant only. Apply + run test:parity suite.
5. Schema Review Checklist (a..e):
   a. Column types match deferred compat layer declared types in taskStore.supabase.ts
   b. FK constraints NOT VALID pattern used for live safety
   c. No DEFAULT values that write data to every row on live table (AVOID that; use nullable + backfill script separate)
   d. Rollback script exists and applies cleanly (DROP COLUMN IF EXISTS / DROP TABLE IF EXISTS)
   e. Migration order: parity → staging → production tenants staged

**HUMAN-IN-THE-LOOP SCHEMA REVIEW GATE:**
- Between Phase A and Phase B → STOP.
- Require EXPLICIT WRITTEN sign-off from user.
- Accepted forms: (1) chat transcript "GO" message for 03b live apply, (2) signed checklist line a..e.
- No sign-off = BLOCKED. Do not proceed.

### Phase B — Live Apply
1. Confirm sign-off received.
2. Apply DDL to production tenant(s) per staged order.
3. After apply: measure deferred fallback fire rate (taskStore.supabase.ts 42703/PGRST204 hits) — must be 0 immediately post-apply.
4. Verify test:parity pass on prod-mirrored parity tenant.
5. Close ledger entry in ROADMAP.md + AGENTS.md.

---

## Final Output Format
```
=== MS02/MS03B EXECUTION LEDGER ===
Gate 1 status: (BLOCKED Rule1 / 7/7 sections REDACTED output attached)
02a status: (Not Started / RLS 7 tables anon SELECT 0 rows PROOF attached)
02b status: (Not Started / FK NOT VALID added + \\d proof attached)
03b Phase A status: (Not Started / Artefacts ready, checklist complete)
03b Schema Review Gate: (BLOCKED pending sign-off / SIGN-OFF RECEIVED [evidence ref])
03b Phase B status: (Not Started / Live applied, deferred fallback 0 proof)
Risks / blockers:
Next:
```
