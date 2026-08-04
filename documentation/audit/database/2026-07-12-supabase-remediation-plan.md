# Supabase Remediation Plan

Date: 2026-07-12
Classification: Historical analysis
Status: Proposed remediation roadmap derived from repository audit and partial live verification

## Purpose

This document converts the Supabase technical audit into a prioritized remediation plan focused on:

- security
- performance
- scalability
- maintainability
- rollout safety

This is a planning artifact, not a canonical runtime document.

## Live Verification Update

After the initial repository audit, a partial live verification pass was completed through Supabase clients using secure local environment variables without exposing those secrets.

The most important result was a live-confirmed security issue:

- anonymous reads succeeded against `companies`
- anonymous reads succeeded against `users`
- anonymous reads succeeded against `projects`
- anonymous reads succeeded against `tasks`
- anonymous reads succeeded against `task_activities`
- anonymous reads succeeded against `task_read_status`
- anonymous reads succeeded against `project_locations`

This result moves RLS and API exposure containment from a theoretical P0 concern to an actively confirmed production issue on the tested live surface.

## Planning Principles

The remediation strategy follows these rules:

1. fix security boundaries before optimization work
2. avoid schema churn without a migration order
3. preserve client compatibility while transitional fields are retired
4. prefer reversible, incremental changes
5. separate admin/server operations from mobile-client surfaces

## Target End State

The intended future-state Supabase architecture should have:

- strict RLS for all client-accessible tables
- no client-side admin auth operations
- one canonical auth/profile bootstrap mechanism
- one canonical task status model
- no hidden write behavior inside read paths
- scoped and indexed task/activity reads
- private or policy-scoped storage for sensitive media
- durable runbooks with redacted placeholders only

## Priority Summary

### P0: Immediate Security and Integrity Work

- contain anonymous public-table reads immediately
- verify production RLS on all client-accessed tables
- remove client-side `auth.admin` usage
- resolve duplicate auth-to-profile provisioning paths
- isolate read-path repair logic from normal fetch flows

### P1: High-Impact Performance Work

- add missing hot-path indexes
- stop broad task-activity scans in list views
- tighten Realtime invalidation scope
- close bootstrap/runtime schema parity gaps

### P2: Schema Normalization and Scale Work

- unify task status fields
- rationalize legacy reason/review fields
- improve assignment modeling
- improve attachment modeling

### P3: Long-Term Architecture Hardening

- move privileged workflows to Edge Functions
- introduce stronger reporting and operational observability
- formalize migration governance for future schema evolution

## Phase 0: Establish Safe Baseline

### Goal

Create operational clarity before making structural changes.

### Actions

- document the live-confirmed anonymous-read exposure across core tables
- inventory live `pg_policies` for all public tables used by the mobile app
- inventory current indexes from production
- capture row counts for:
  - `users`
  - `projects`
  - `user_project_assignments`
  - `tasks`
  - `task_activities`
  - `task_read_status`
  - `project_locations`
- capture the most common and slowest queries using `pg_stat_statements`
- confirm whether production currently uses the auth-user sync trigger

### Deliverables

- live policy inventory
- live index inventory
- table cardinality snapshot
- top query report
- trigger usage confirmation

### Exit Criteria

- the team knows which repo findings are already fixed in production
- the team has a baseline before altering policies or indexes

## Phase 1: Security Boundary Hardening

### Goal

Make client-side access safe under strict least-privilege rules.

### Immediate containment note

Because anonymous reads are already live-confirmed on core tables, the first production action should be containment, not just discovery. If there is no compensating external control, treat this as an active security incident until proven otherwise.

### Workstream 1A: Canonical RLS Coverage

Add or verify RLS for:

- `users`
- `projects`
- `user_project_assignments`
- `tasks`
- `task_activities`
- `task_read_status`
- `project_locations`
- `storage.objects` for the `buildtrack-files` bucket

Immediate verification target:

- anonymous access to all listed tables must fail after containment

### Required policy principles

- users can read only:
  - their own profile
  - users in accessible projects or their company, if business rules allow it
- project access is derived from active assignment or explicit company-admin privilege
- task access is derived from project access
- task-activity access is derived from task access
- task read-status is self-only by `user_id = auth.uid()`
- storage access is derived from company or project scope, not just bucket membership

### Workstream 1B: Remove Client Privileged Operations

Move all privileged operations out of the mobile app, especially:

- auth admin user deletion
- any future bulk-user or cross-tenant operations
- any future repair jobs or reconciliation actions

Preferred implementation boundary:

- Supabase Edge Functions
- or tightly controlled backend scripts

### Workstream 1C: Resolve Auth/User Provisioning Ownership

Pick one authority:

- database trigger from `auth.users`
- or a server-side provisioning function

Do not keep both the trigger and the client-side insert path as long-term parallel mechanisms.

### Exit Criteria

- every client-accessed table has explicit RLS
- no client-side `auth.admin` calls remain in runtime code
- auth/profile sync has one canonical write path

## Phase 2: Query and Index Optimization

### Goal

Stabilize common reads before row counts grow further.

### Workstream 2A: Add Hot-Path Indexes

Recommended index priorities:

1. active-task list indexes
2. project-scoped active-task indexes
3. assignee containment index for `assigned_to`
4. assignment active-membership indexes
5. self-referential task tree indexes
6. user phone and company-name lookup support

### Suggested SQL

```sql
create index concurrently if not exists idx_tasks_active_created_at
on public.tasks (created_at desc)
where cancelled_at is null and archived_at is null and deleted_at is null;

create index concurrently if not exists idx_tasks_project_active_created_at
on public.tasks (project_id, created_at desc)
where cancelled_at is null and archived_at is null and deleted_at is null;

create index concurrently if not exists idx_tasks_assigned_by_active_created_at
on public.tasks (assigned_by, created_at desc)
where cancelled_at is null and archived_at is null and deleted_at is null;

create index concurrently if not exists idx_tasks_assigned_to_active_gin
on public.tasks using gin (assigned_to)
where cancelled_at is null and archived_at is null and deleted_at is null;

create index concurrently if not exists idx_tasks_parent_task_id
on public.tasks (parent_task_id);

create index concurrently if not exists idx_tasks_root_task_id
on public.tasks (root_task_id);

create index concurrently if not exists idx_upa_user_active_assigned_at
on public.user_project_assignments (user_id, assigned_at desc)
where is_active = true;

create index concurrently if not exists idx_upa_project_active_assigned_at
on public.user_project_assignments (project_id, assigned_at desc)
where is_active = true;

create index concurrently if not exists idx_projects_company_created_at
on public.projects (company_id, created_at desc);

create index concurrently if not exists idx_users_company_name
on public.users (company_id, name);

create index concurrently if not exists idx_users_phone
on public.users (phone);
```

### Workstream 2B: Remove Broad Activity Reads

Current issue:

- list-level task reads often perform a second query over large or entire slices of `task_activities`

Remediation:

- always scope activity fetches to the task IDs relevant to the list
- consider limiting activities on list views to recent events only
- load full task timelines only on detail screens

### Workstream 2C: Eliminate Read-Path Mutation

Move any repair behavior out of task-fetch flows and into:

- explicit migrations
- admin repair scripts
- one-time reconciliation functions

### Exit Criteria

- list and detail queries have a defined index strategy
- broad unscoped activity reads are removed from hot paths
- task fetch flows are read-only

## Phase 3: Schema Consolidation

### Goal

Reduce long-term drift and compatibility burden.

### Workstream 3A: Canonicalize Task Status

Choose a single status authority:

- keep `current_status` and retire `status`
- or migrate to `status` and retire `current_status`

The current long-term recommendation is to migrate to a single canonical field with a clear domain enum and then:

- backfill all rows
- update all code paths
- update indexes and policies
- drop deprecated status fields when safe

### Workstream 3B: Canonicalize Reason and Review Fields

Rationalize:

- `decline_reason` vs `declined_reason`
- `accepted` vs derived status
- `ready_for_review`
- `review_accepted`

Preferred direction:

- derive workflow meaning from the canonical status model
- retain only fields required for audit or explicit business semantics

### Workstream 3C: Close Runtime/Bootstrap Gaps

Ensure the checked-in bootstrap covers:

- `task_read_status`
- `project_locations`
- any task redesign metadata fields still required by runtime

### Exit Criteria

- there is one canonical task workflow shape
- bootstrap and runtime schema are aligned
- retry/fallback logic for stale schema is greatly reduced

## Phase 4: Data Model Hardening for Scale

### Goal

Improve relational integrity and long-term reporting ability.

### Workstream 4A: Revisit Task Assignment Modeling

Current state:

- `tasks.assigned_to uuid[]`
- `tasks.primary_assignee_id text`
- `tasks.delegated_user_ids text[]`

Recommended end state:

- `tasks.primary_assignee_id uuid nullable`
- new `task_assignments` table for many-to-many or delegated assignments

Example shape:

```sql
create table public.task_assignments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  assignment_kind text not null default 'assignee',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references public.users(id) on delete set null
);
```

### Workstream 4B: Normalize Attachments

Current state:

- `tasks.attachments text[]`

Recommended end state:

- `task_files` or `file_attachments` relational table
- optional link to `task_activities` for event-scoped uploads

Benefits:

- better metadata quality
- cleaner storage-path auditing
- stronger joins and reporting
- reduced shape ambiguity

### Workstream 4C: Improve Historical Membership Modeling

If historical assignment rows are desired, replace the full unique constraint on `user_project_assignments` with an active-only uniqueness rule.

Suggested direction:

```sql
alter table public.user_project_assignments
drop constraint if exists user_project_assignments_user_id_project_id_key;

create unique index concurrently if not exists idx_upa_one_active_membership
on public.user_project_assignments (user_id, project_id)
where is_active = true;
```

### Exit Criteria

- assignment and attachment modeling better reflect relational use cases
- reporting and audit semantics improve
- future policy writing becomes simpler

## Phase 5: Realtime and Operational Architecture

### Goal

Reduce unnecessary invalidation and prepare for larger connected-user counts.

### Workstream 5A: Narrow Realtime Scope

Recommended improvements:

- subscribe by active project or workspace when possible
- avoid broad global list invalidation where a targeted resource key can be invalidated
- keep detail timelines detail-scoped

### Workstream 5B: Move Privileged or Cross-Tenant Workloads to Edge Functions

Use Edge Functions for:

- admin-only user deletion
- future webhook receivers
- cross-project or cross-company reports
- repair and reconciliation jobs
- storage signing for private file delivery

### Workstream 5C: Add Observability

Track:

- slow query frequency
- policy denial rates
- auth/profile sync failures
- storage policy failures
- Realtime subscription failures

### Exit Criteria

- Realtime cost is more predictable
- privileged operations no longer depend on the mobile client
- operational debugging becomes easier

## Recommended Rollout Order

### Wave 1

- contain anonymous public-table reads
- audit live policies and indexes
- remove client-side privileged auth calls
- make auth/profile provisioning single-authority

### Wave 2

- add hot-path indexes
- fix broad task and activity reads
- remove read-path mutation

### Wave 3

- canonicalize status and reason fields
- close bootstrap/runtime schema gaps

### Wave 4

- private storage plus signed delivery
- assignment and attachment normalization
- tighter Realtime scope

## Validation Plan

Each phase should be validated with the smallest effective checks.

### Security validation

- verify anonymous reads now fail for all non-public domain tables
- run policy matrix checks for each table
- verify cross-company reads fail
- verify legitimate project members still have access

### Performance validation

- capture before/after `EXPLAIN ANALYZE`
- compare latency for:
  - all-task list load
  - project task list load
  - user inbox load
  - task detail timeline load

### Data-integrity validation

- compare row counts before and after migrations
- ensure activity history remains intact
- verify no duplicate user-profile creation paths remain

## Risks and Tradeoffs

### Tightening RLS

Risk:

- policies may break currently working client flows

Mitigation:

- stage changes in development
- use a policy test matrix
- add a fallback validation checklist before production rollout

### Schema consolidation

Risk:

- old code paths may depend on transitional columns

Mitigation:

- backfill first
- update code second
- drop legacy columns last

### Assignment normalization

Risk:

- array-based assumptions are deeply embedded in app code

Mitigation:

- introduce relational tables in parallel
- backfill
- switch reads gradually

## Success Criteria

This remediation plan is complete when:

- anonymous access to non-public domain data is blocked and verified
- production-safe RLS is verified and documented
- no privileged auth admin operations run from the client
- task list queries are indexed and scoped
- task status has one canonical model
- task reads no longer perform silent writes
- storage access matches the sensitivity of uploaded media
- bootstrap, migrations, and runtime schema are materially aligned

## Companion Documents

- `documentation/audit/database/2026-07-12-supabase-technical-audit.md`
- `documentation/audit/database/SUPABASE_OPERATIONS_RUNBOOK.md`
