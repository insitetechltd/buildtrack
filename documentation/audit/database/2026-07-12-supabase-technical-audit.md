# Supabase Technical Audit

Date: 2026-07-12
Classification: Historical analysis
Status: Repository audit with partial live verification

## Purpose

This document captures a deep-dive technical audit of the current Supabase setup as represented in the repository at the time of review.

This is a point-in-time analysis artifact, not a canonical source of truth. If this document conflicts with current code or configuration, trust:

1. `src/`
2. `app.json`
3. `package.json`
4. `eas.json`
5. canonical docs in `documentation/`

## Audit Scope

The audit was based on the repository's:

- Supabase client setup in `src/api/supabase.ts`
- data access stores in `src/state/*.supabase.ts`
- realtime logic in `src/utils/RealtimeSyncManager.tsx`
- architecture documentation in `documentation/DATABASE_ARCHITECTURE.md`
- checked-in SQL bootstrap and migration files in the repository root and `scripts/sandbox/`

The audit was later supplemented with a partial live verification using:

- the local `.env` Supabase URL
- the local anon key
- the local service-role key
- read-only API probing through Supabase clients

The audit did not include:

- direct SQL access to the live database through `psql`
- `pg_stat_statements`
- real query plans from `EXPLAIN ANALYZE`
- current Supabase dashboard settings that are not checked into the repo
- any disclosure of actual credentials, secrets, or service-role material

## Live Consistency Check

After the initial repository audit, a live read-only verification pass was executed through Supabase clients using local secure environment values without exposing those secrets in documentation or command output.

### What was verified live

- anonymous read accessibility for core public tables
- existence of key runtime tables
- existence of key runtime columns by executing selective reads
- approximate live row counts using `head: true` and `count: exact`

### What could not be verified live through the available interface

- direct `information_schema` inspection
- direct `pg_catalog.pg_policies` inspection
- `psql`-level schema introspection
- `EXPLAIN ANALYZE`
- `pg_stat_statements`

### Live results summary

Confirmed through live API checks:

- anonymous access to `companies`
- anonymous access to `users`
- anonymous access to `projects`
- anonymous access to `tasks`
- anonymous access to `task_activities`
- anonymous access to `task_read_status`
- anonymous access to `project_locations`

Confirmed live table existence and queryability:

- `tasks`
- `project_locations`
- `task_read_status`
- `users`
- `user_project_assignments`
- `task_activities`

Confirmed live task column presence via successful selective query:

- `location_on_site`
- `primary_assignee_id`
- `delegated_user_ids`
- `container_id`
- `sub_container_id`
- `tags`
- `archived_at`
- `deleted_at`
- `current_status`
- `status`
- `decline_reason`
- `declined_reason`

Observed live row counts during the check:

- `tasks`: 60
- `project_locations`: 2
- `task_read_status`: 2073
- `users`: 20
- `user_project_assignments`: 15
- `task_activities`: 205

Schema introspection through PostgREST was blocked to the exposed schemas:

- `public`
- `graphql_public`

This means the live verification strongly confirms table accessibility and runtime-shape concerns, but it does not replace direct SQL inspection for policies, indexes, or planner behavior.

## Application Context

Inferred system profile:

- Domain: B2B construction and task-management mobile application
- Client stack: Expo-managed React Native, Zustand, AsyncStorage, Supabase
- Backend surface: Supabase Auth, `public` schema tables, Supabase Realtime, Supabase Storage

Primary runtime tables referenced by code:

- `companies`
- `users`
- `projects`
- `user_project_assignments`
- `tasks`
- `task_activities`
- `task_read_status`
- `roles`
- `project_locations`

## Executive Summary

The current Supabase architecture is functional for early-stage delivery, but it shows several structural risks that should be addressed before larger-scale growth:

- production RLS is not documented canonically in the repository
- the checked-in sandbox bootstrap disables RLS and grants broad table access
- task reads contain full-table and near-full-table access patterns
- task schema evolution is incomplete, with live code still depending on transitional columns
- auth/profile synchronization has overlapping strategies
- storage access currently favors public URLs rather than private-file delivery

The biggest practical risks are:

1. security ambiguity around RLS and client-side CRUD
2. scaling pressure from broad `tasks` and `task_activities` fetch patterns
3. maintainability drag from schema drift across task status and related fields

## Key Findings

### 1. Security Posture Depends Almost Entirely on Production RLS

The mobile app performs extensive client-side CRUD directly against Supabase using the anon-key client.

That is acceptable only if production RLS is strict and complete. The repository does not provide a canonical, comprehensive policy set for the main tables used by the app.

Repository signals:

- `scripts/sandbox/bootstrap_minimal_supabase.sql` disables RLS on `companies`, `users`, `projects`, `user_project_assignments`, `tasks`, and `task_activities`
- the same sandbox grants broad table access to `authenticated`
- the only clearly implemented RLS in checked-in SQL is for `project_locations`
- `RealtimeSyncManager.tsx` assumes RLS is the safety boundary for broad subscriptions

Live consistency result:

This concern is now live-confirmed at least for anonymous reads. Anonymous API probes succeeded against all tested public tables listed above.

Implication:

Cross-tenant or cross-company data leakage is not only a theoretical repo concern. Anonymous public-table readability is currently observable from the live API surface that was tested.

### 2. The Auth/Profile Sync Model Has Conflicting Authorities

The repository contains two different strategies for creating `public.users` records:

- a database trigger from `auth.users`
- a client-side manual insert after `supabase.auth.signUp()`

Checked-in SQL:

- `SYNC_AUTH_USERS_TRIGGER.sql`
- `scripts/sandbox/bootstrap_minimal_supabase.sql`

Client runtime path:

- `src/state/authStore.supabase.ts`

Risk:

- duplicate or racing inserts
- unclear operational ownership for failure recovery
- increased difficulty auditing identity/profile integrity

Recommended direction:

Use one canonical authority only. The preferred long-term approach is a database trigger or a server-side provisioning flow, not a client-side duplicate insert.

### 3. Task Read Paths Are the Main Scaling Risk

The task store is the dominant workload driver in the current app.

Observed hot patterns:

- `fetchTasks()` reads all active tasks, then reads all task activities
- `fetchArchivedTasks()` reads archived tasks, then again reads all task activities
- `fetchTasksByProject()` filters tasks by project and then reads matching activities
- `fetchTasksByUser()` filters on `assigned_to` array containment and then reads matching activities
- `fetchTaskById()` loads a single task and its activities

The broadest issue is not single-row detail fetches. It is the list-level pattern where the app hydrates large task sets and then separately hydrates activity history.

At higher cardinality, this will create:

- slower cold loads
- larger bandwidth usage
- higher Realtime invalidation cost
- more client memory churn

### 4. The Task Schema Has Ongoing Drift

The runtime still leans on legacy or transitional fields, while newer migrations introduce a more normalized direction.

Examples of drift:

- `current_status` is still heavily used by runtime code
- a migration also introduces `status`
- runtime still references fields such as `decline_reason`, `ready_for_review`, and `review_accepted`
- newer migrations introduce `declined_reason`, `rejected_reason`, `location_on_site`, `project_locations`, `primary_assignee_id`, `delegated_user_ids`, and `tags`

This drift produces several problems:

- unclear indexing priorities
- RLS and policy complexity
- migration fragility
- compatibility code paths that persist longer than intended

### 5. Some Denormalization Is Reasonable, Some Is Becoming Expensive

Reasonable denormalization:

- `task_activities.data jsonb`
- `projects.client_info jsonb`
- `companies.banner jsonb`

These are good uses of JSONB because they represent flexible document-like attributes and polymorphic activity payloads.

More problematic denormalization:

- `tasks.assigned_to uuid[]`
- `tasks.attachments text[]`
- `tasks.delegated_user_ids text[]`

Array-based assignees are convenient early, but they complicate:

- relational integrity
- indexing strategy
- RLS policy logic
- analytics and joins
- future workflow auditing

The attachment field is especially weak because repository history already shows compatibility logic for multiple stored shapes.

### 6. Some Identifier Columns Lost Type Safety

The redesign migration adds:

- `primary_assignee_id TEXT`
- `delegated_user_ids TEXT[]`
- `container_id TEXT`
- `sub_container_id TEXT`

The `container` fields being text is acceptable if they are labels.

The assignee fields being text rather than `uuid` or `uuid[]` is a long-term downside because it sacrifices:

- foreign key enforcement
- type clarity
- join consistency
- safer server-side policies

### 7. `task_read_status` Exists in Runtime But Not in Bootstrap

`task_read_status` is clearly used in runtime code, but it is not present in the checked-in minimal sandbox bootstrap.

Live consistency result:

The live table exists and returned a count of 2073 rows during the read-only verification pass.

Implications:

- local bootstrap parity is incomplete
- environment drift is likely
- developers cannot rely on the bootstrap as a full reflection of runtime needs

### 8. A Read Path Performs Data Mutation

`fetchTasks()` includes a repair loop that updates tasks while reading them.

This is a high-risk smell because reads should not silently mutate operational data. It can create:

- unexpected writes
- harder debugging
- Realtime noise
- inconsistent audit trails
- avoidable RLS failures if policies tighten

Repair logic should be isolated into:

- one-off migrations
- admin-only scripts
- edge functions
- explicit repair jobs

### 9. Storage Delivery Appears Public-URL Oriented

The current file upload flow uploads to `buildtrack-files` and then retrieves a public URL using `getPublicUrl()`.

That is simple and fast, but it is not ideal if uploaded media contains internal jobsite photos, drawings, or sensitive operational material.

Preferred model for sensitive data:

- private storage bucket
- signed URLs
- policy-scoped object access by company and user role

### 10. Client Auth Admin Calls Belong on the Server

The repo contains a client-side call to `supabase.auth.admin.deleteUser()`.

This should not be part of a mobile-client execution surface. Admin auth operations belong in:

- Supabase Edge Functions
- backend services
- controlled admin scripts

## Table-Level Assessment

### `users`

Strengths:

- `uuid` primary key aligned to Supabase Auth
- company affiliation is modeled directly
- approval workflow fields exist

Risks:

- `role` remains overloaded as a compatibility field
- approval policies checked into the repo are partial and not clearly promoted as canonical
- phone-number login depends on `users.phone`, which should be normalized and indexed carefully

### `projects`

Strengths:

- clean ownership and company linkage
- reasonable shape for current needs

Risks:

- visibility and mutation rules depend on assignment logic but those policies are not canonically documented in the repo
- list queries will benefit from more explicit composite indexes

### `user_project_assignments`

Strengths:

- clear join table between users and projects
- role/category captured at project scope

Risks:

- `unique (user_id, project_id)` prevents a clean historical-membership model if inactive rows are retained
- query patterns are active-membership-heavy and need stronger partial indexes

### `tasks`

Strengths:

- self-referential tree model is a reasonable choice for top-level tasks and subtasks
- soft-delete and archive timestamps provide audit-friendly semantics

Risks:

- current status model is split across legacy and newer fields
- assignee arrays complicate relational operations
- archival, deletion, and active-list filters need more targeted indexing
- self-referential keys need explicit indexing support

### `task_activities`

Strengths:

- good canonical direction for auditability
- JSONB payload is justified here
- a unified activity log simplifies timeline rendering

Risks:

- unscoped list reads are expensive
- activity writes are widely distributed in app code instead of being governed by a smaller number of controlled write paths

### `project_locations`

Strengths:

- good normalization move for shared project-scoped location suggestions
- unique normalized label index is a strong design choice
- RLS is present and more robust than other checked-in policy examples

Risks:

- policy pattern is not yet generalized across the rest of the domain

## Indexing Assessment

Indexes visibly present in checked-in SQL are helpful but incomplete for the observed query workload.

Good existing examples:

- `idx_projects_company_id`
- `idx_assignments_user_active`
- `idx_tasks_project_id`
- `idx_task_activities_task_id`
- `idx_task_activities_task_timestamp`
- `idx_users_pending`
- `idx_project_locations_project_id`
- `idx_project_locations_project_label_unique`

Major likely missing indexes:

- partial GIN index for active-task `assigned_to` containment
- partial composite indexes for active task list queries
- active project-assignment indexes ordered by `assigned_at`
- self-referential task-tree indexes on `parent_task_id` and `root_task_id`
- stronger company/name and phone lookup indexes for users

## Realtime Assessment

Realtime currently subscribes broadly to:

- `tasks`
- `task_activities`
- `projects`
- `users`

The current model is cache invalidation plus refetch, not fully event-native state projection.

This is acceptable early if:

- table volumes remain moderate
- RLS is strong
- invalidated list queries are cheap

It becomes more expensive when:

- many users are connected
- projects accumulate large task histories
- activity insert volume rises
- broad subscriptions trigger repeated list refreshes

## Maintainability Assessment

The repository has a clear database direction, but it is currently burdened by transitional layers:

- compatibility fields
- stale-schema retry paths
- parallel naming conventions
- mixed bootstrap and migration authority
- one-off repair scripts in the repository root

This is manageable now, but it should be simplified before further domain growth.

## Risk Ranking

### Critical

- anonymous public-table readability is live-confirmed on core domain tables
- production RLS is under-specified relative to client access patterns
- client-side admin auth operations are architecturally unsafe
- auth/profile synchronization has overlapping authorities

### High

- full or broad task and activity scans in common reads
- schema drift around task status and related legacy fields
- read-path mutation in task fetching

### Medium

- array-based assignee modeling
- weak attachment modeling
- incomplete bootstrap parity
- broad Realtime scope without narrower workspace filtering

## Recommended Strategic Direction

The database should move toward this target state:

- strict RLS as the only client-side data boundary
- Edge Functions or server-side surfaces for admin and cross-tenant actions
- one canonical task status model
- one canonical auth/profile bootstrap path
- activity-log reads scoped to relevant tasks only
- private storage plus signed access for sensitive files
- a more relational assignee and attachment model as scale increases

## References Used In This Audit

Primary repository references reviewed for this analysis:

- `documentation/DATABASE_ARCHITECTURE.md`
- `src/api/supabase.ts`
- `src/state/taskStore.supabase.ts`
- `src/state/projectStore.supabase.ts`
- `src/state/userStore.supabase.ts`
- `src/state/authStore.supabase.ts`
- `src/utils/RealtimeSyncManager.tsx`
- `scripts/sandbox/bootstrap_minimal_supabase.sql`
- `TASK_ACTIVITIES_UNIFICATION_MIGRATION.sql`
- `TASK_STATUS_UNIFIED_MIGRATION.sql`
- `SYNC_AUTH_USERS_TRIGGER.sql`
- `ADD_PROJECT_LOCATIONS_MIGRATION.sql`
- `ADD_TASK_REDESIGN_METADATA_MIGRATION.sql`
- `ADD_TASK_ON_SITE_LOCATION_MIGRATION.sql`
- `ADD_TASK_ARCHIVE_MIGRATION.sql`
- `FIX_CURRENT_STATUS_CONSTRAINT.sql`

## Live Verification Notes

The live check materially changed the confidence level of the original findings:

- the repo-based concern about permissive access is now a confirmed live issue for anonymous reads
- the repo-based concern about `task_read_status` being runtime-only is confirmed as a live table
- the repo-based concern about schema drift in the task model is reinforced by the live presence of both legacy and newer task columns

The highest-priority next step is immediate production policy review and containment.

## Follow-On Documents

This audit is paired with:

- `documentation/audit/database/2026-07-12-supabase-remediation-plan.md`
- `documentation/audit/database/SUPABASE_OPERATIONS_RUNBOOK.md`
