# Supabase Operations Runbook

## Purpose

This runbook defines the safe operational workflow for inspecting, validating, and maintaining the Supabase environment used by this repository.

This document is intentionally credential-safe:

- do not paste real credentials into this file
- do not commit secrets to the repository
- do not store service-role material in client code

Use secure secret storage for all real values.

## Scope

This runbook covers:

- secure access conventions
- environment variable placeholders
- read-only audit workflow
- policy and schema verification workflow
- index and query review workflow
- storage and auth operational checks

This runbook does not authorize destructive production changes. All production mutations should follow an approved rollout and backup process.

## Secure Access Rules

### Never store these in the repo

- Supabase anon key if it is not already intended for public client distribution
- service-role key
- database password
- direct connection strings with secrets
- personal tokens
- third-party webhook secrets

### Allowed in docs

- placeholder variable names
- redacted examples
- command templates that expect environment variables

### Required secret-handling rules

- keep secrets in local shell environment, secure credential managers, or CI secret stores
- rotate any secret that has ever been copied into an insecure surface
- never use the service-role key in the React Native client
- use server-side surfaces for privileged operations

## Credential Placeholders

Use placeholders like these in local shells, CI, or secret stores:

```bash
export EXPO_PUBLIC_SUPABASE_URL="<stored-securely>"
export EXPO_PUBLIC_SUPABASE_ANON_KEY="<stored-securely>"

export SUPABASE_DB_HOST="<stored-securely>"
export SUPABASE_DB_PORT="<stored-securely>"
export SUPABASE_DB_NAME="<stored-securely>"
export SUPABASE_DB_USER="<stored-securely>"
export SUPABASE_DB_PASSWORD="<stored-securely>"

export SUPABASE_SERVICE_ROLE_KEY="<stored-securely>"
```

## Access Surface Guidance

### Mobile client

Allowed:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Requirements:

- client reads and writes must be constrained by RLS
- never embed `service_role` in the mobile app

### Edge Functions or server-side admin surfaces

Allowed:

- service-role key
- privileged database or auth operations

Requirements:

- strict input validation
- narrow, purpose-specific endpoints
- audit logging for destructive actions

### Direct database access

Use direct SQL access only for:

- read-only audits
- approved migration execution
- explicit repair jobs
- index creation and verification

## Read-Only Audit Workflow

### Preconditions

- production-safe access approval
- a recent backup or rollback plan for any later write work
- environment variables loaded securely in the shell

### Run the repository audit script

The repository includes a read-only audit script:

- `WS_SUPABASE_01_READONLY_AUDIT.sql`

Example command template:

```bash
/opt/homebrew/opt/libpq/bin/psql -w \
  -h "$SUPABASE_DB_HOST" \
  -p "$SUPABASE_DB_PORT" \
  -d "$SUPABASE_DB_NAME" \
  -U "$SUPABASE_DB_USER" \
  -f WS_SUPABASE_01_READONLY_AUDIT.sql
```

If password prompting is not appropriate for the environment, use a secure secret loader rather than embedding credentials directly in shell history.

### What the audit script checks

- public table inventory
- task location-related columns
- presence and shape of `project_locations`
- legacy and normalized task location data
- project assignment counts

## Live Policy Verification

Run these read-only queries to inspect current RLS posture:

```sql
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname in ('public', 'storage')
order by schemaname, tablename, policyname;
```

```sql
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
order by c.relname;
```

### Tables that must be reviewed

- `users`
- `projects`
- `user_project_assignments`
- `tasks`
- `task_activities`
- `task_read_status`
- `project_locations`
- `storage.objects` for `buildtrack-files`

## Live Index Verification

Run:

```sql
select
  schemaname,
  tablename,
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
order by tablename, indexname;
```

Focus review on:

- task list indexes
- assignment indexes
- self-referential task indexes
- user lookup indexes
- project location indexes

## Query Performance Review

### Recommended query inspection targets

- all active tasks
- tasks by project
- tasks by user
- task detail with activities
- project memberships by user
- project memberships by project
- login lookup by phone

### Use `EXPLAIN ANALYZE`

Template:

```sql
explain (analyze, buffers, verbose)
select *
from public.tasks
where project_id = '<project-uuid>'
  and cancelled_at is null
  and archived_at is null
  and deleted_at is null
order by created_at desc;
```

```sql
explain (analyze, buffers, verbose)
select *
from public.tasks
where '<user-uuid>'::uuid = any(assigned_to)
  and cancelled_at is null
  and archived_at is null
  and deleted_at is null
order by created_at desc;
```

### Optional production query inventory

If available, inspect `pg_stat_statements`:

```sql
select
  query,
  calls,
  total_exec_time,
  mean_exec_time,
  rows
from pg_stat_statements
order by total_exec_time desc
limit 25;
```

## Schema Parity Checklist

Confirm the live database includes all runtime-required tables and columns referenced by the app.

### High-priority parity checks

- `task_read_status` exists
- `project_locations` exists
- `tasks.location_on_site` exists
- task redesign metadata fields exist if runtime depends on them:
  - `primary_assignee_id`
  - `delegated_user_ids`
  - `container_id`
  - `sub_container_id`
  - `tags`

### Column inspection template

```sql
select
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'tasks',
    'task_activities',
    'task_read_status',
    'project_locations',
    'users',
    'projects',
    'user_project_assignments'
  )
order by table_name, ordinal_position;
```

## Auth/Profile Sync Checks

### Verify trigger presence

```sql
select
  trigger_name,
  event_manipulation,
  event_object_schema,
  event_object_table,
  action_statement
from information_schema.triggers
where trigger_name = 'on_auth_user_created';
```

### Find out-of-sync users

```sql
select
  au.id,
  au.email,
  au.created_at
from auth.users au
left join public.users u on u.id = au.id
where u.id is null;
```

```sql
select
  u.id,
  u.email,
  u.created_at
from public.users u
left join auth.users au on au.id = u.id
where au.id is null;
```

### Operational rule

If production uses the auth trigger, do not keep a competing client-side profile-creation flow as the long-term authority.

## Storage Verification

### Review bucket policy strategy

Checklist:

- confirm whether `buildtrack-files` is public or private
- confirm policies scope reads and writes correctly
- confirm path design matches company or project access boundaries
- confirm client code does not rely on public URLs for sensitive assets unless explicitly accepted

### Inspect storage policies

```sql
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'storage'
order by tablename, policyname;
```

### M-SUPABASE-03c Phase A (2026-08-09) + D2 cutover (2026-08-10)

- Artefacts: `supabase/migrations/20260809000200_msupabase03c_storage_bucket_policy.sql`,
  `docs/superpowers/reports/2026-08-09-m-supabase-03c-phase-a-storage-review.md`
- Greenfield baseline: bucket **private** (`public = false`) with company-folder RLS
- Live apply Closed: `buildtrack-files.public = false` (do **not** reopen to public)
- **D2 shipped:** `src/api/fileUploadService.ts` uses `createSignedUrl` (TTL `SIGNED_URL_EXPIRY_SECONDS=3600`)
  with in-memory cache + Dashboard/Tasks/TaskDetail adapter re-sign for legacy `/object/public/` URLs
- Close report: `docs/superpowers/reports/2026-08-10-m-supabase-03c-close.md`

## Realtime Verification

The app subscribes broadly to:

- `tasks` (event `*`)
- `task_activities` (event `INSERT`)
- `projects` (event `*`)
- `users` (event `UPDATE`)

Operational checks:

- confirm Realtime is enabled only for tables that need it
- confirm broad subscriptions are still safe under current RLS
- confirm list invalidation volume remains acceptable

### M-SUPABASE-04a (2026-08-10)

- App reconnect: exponential backoff + AppState soft resubscribe in
  `src/utils/RealtimeSyncManager.tsx` / `src/utils/realtimeReconnect.ts`
- Read-only publication audit SQL:
  `docs/superpowers/sql/20260810_msupabase04a_publication_membership_audit.sql`
- Report: `docs/superpowers/reports/2026-08-10-m-supabase-04a-phase-a.md`
- Live `pg_publication_tables` SELECT: run in Dashboard when available; never paste secrets

If Realtime failures occur, inspect:

- table publication settings (`supabase_realtime` / `postgres_changes`)
- channel error logs (`CHANNEL_ERROR` / `CLOSED` → reconnect backoff)
- policy denials

## Storage retention / lifecycle (M-SUPABASE-04c)

**Unblocked** — M-SUPABASE-03c Closed (bucket private + D2 signed-URL cutover shipped).

Still Pipeline (no live lifecycle this cycle):

1. Prefer private bucket + signed URLs (Decision D1/D2 from 03c — already applied).
2. Define company retention policy (e.g. archive after N days / expire after M days).
3. Configure S3-style lifecycle on `buildtrack-files` (non-current version transitions if versioning enabled).
4. Document the chosen N/M and Dashboard path here — **no live lifecycle apply** until product retention numbers are agreed.

Do not invent retention TTLs in code; ops configures lifecycle in the Supabase/Storage console after product GO.

## Safe Change Workflow

For any non-read-only change:

1. capture a backup or rollback position
2. confirm the target environment
3. run the change first in development or staging
4. validate schema and policy impact
5. execute production rollout in a reversible order
6. run post-change verification queries

## Post-Change Verification Checklist

After any approved Supabase change, verify:

- expected tables and columns exist
- RLS is enabled where intended
- policies compile and behave correctly
- app login still works
- project lists still load
- task list queries still load
- task detail timeline still renders
- storage uploads and reads still work
- Realtime subscriptions still connect

## Operational Do-Not List

Do not:

- commit real credentials to Markdown
- paste real secrets into tickets or chat logs
- run privileged auth operations from the mobile client
- perform read-path data repair during normal user-facing fetches
- apply destructive migrations without backup and validation planning

## Companion Documents

For background and planning context, use:

- `documentation/audit/database/2026-07-12-supabase-technical-audit.md`
- `documentation/audit/database/2026-07-12-supabase-remediation-plan.md`
- `documentation/DATABASE_ARCHITECTURE.md`
