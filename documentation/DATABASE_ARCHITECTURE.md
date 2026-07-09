# Database Architecture

## Purpose

This document is the canonical database and Supabase architecture reference for the app as implemented in this repository.

Use it together with:

- `documentation/SOFTWARE_ARCHITECTURE.md` for the overall system structure
- `documentation/role-permission-matrix.md` for permission and role normalization
- `documentation/INSITE_APP_LATEST.md` for current product behavior

If this document conflicts with implemented application code, trust the code and update this file.

## Source-Of-Truth Rule

Database truth in this repository must be interpreted in the following order:

1. live application code that reads and writes Supabase
2. runtime domain types in `src/types/buildtrack.ts`
3. canonical database documentation in this file
4. supporting SQL bootstrap and migration files
5. one-off root SQL diagnostics and historical repair scripts

This ordering is important because the checked-in SQL files are mixed:

- some are active reference material
- some are migration-era transition notes
- many root SQL files are one-off fixes or diagnostics rather than canonical schema definitions

## Backend Platform

The app uses Supabase as its primary backend.

The runtime backend surface is split across:

- Supabase Auth for identity and session issuance
- the `public` schema for operational application tables
- Supabase Realtime for incremental data refresh
- Supabase Storage for uploaded files and media

The client integration point is:

- `src/api/supabase.ts`

## Runtime Database Access Model

### Client and session persistence

`src/api/supabase.ts` creates the client with:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- AsyncStorage-backed session persistence
- auto-refresh enabled
- a request timeout wrapper

### Row shape vs runtime shape

Database rows are generally stored in snake_case.

Application runtime models are generally normalized to camelCase in the stores, for example:

- `company_id` -> `companyId`
- `created_at` -> `createdAt`
- `last_selected_project_id` -> `lastSelectedProjectId`
- `assigned_to` -> `assignedTo`

This normalization happens primarily in:

- `src/state/authStore.ts`
- `src/state/projectStore.supabase.ts`
- `src/state/taskStore.supabase.ts`
- `src/state/userStore.supabase.ts`
- `src/state/roleStore.ts`

## Operational Schemas And Surfaces

### Auth schema

Supabase Auth is the source of credentials and sessions.

Operational behavior:

- users authenticate through Supabase Auth
- the app then hydrates an application user record from `public.users`
- auth metadata is used to seed or synchronize the public user record

### Public schema

The `public` schema is the main application data surface.

The current operational table set visible in runtime code includes:

- `companies`
- `users`
- `projects`
- `user_project_assignments`
- `tasks`
- `task_activities`
- `task_read_status`
- `roles`

### Storage schema

Supabase Storage is used for uploaded files and media.

The sandbox bootstrap SQL references the `buildtrack-files` bucket and creates permissive development policies for authenticated insert/read access. That bootstrap is useful as a development reference, but it is not the sole authority for the production storage setup.

## Canonical Operational Tables

### `companies`

Purpose:

- organization ownership and identity for users and projects

Key fields reflected in runtime code:

- `id`
- `name`
- `type`
- `description`
- `address`
- `phone`
- `email`
- `website`
- `logo`
- `tax_id`
- `license_number`
- `insurance_expiry`
- `banner`
- `created_by`
- `is_active`
- `created_at`
- `updated_at`

Relationships:

- one company has many users
- one company has many projects

### `users`

Purpose:

- application-level user identity, profile, approval, company membership, and compatibility role storage

Key runtime fields:

- `id`
- `name`
- `email`
- `phone`
- `company_id`
- `position`
- `role`
- `last_selected_project_id`
- `is_pending`
- `approved_by`
- `approved_at`
- `created_at`
- `updated_at`

Important notes:

- `users.role` remains the persisted compatibility field for system permission
- runtime code normalizes this to `systemPermission`
- `last_selected_project_id` is used for cross-device workspace continuity

Relationships:

- belongs to one company
- may belong to many projects through `user_project_assignments`
- creates projects
- assigns tasks
- performs task activities

### `projects`

Purpose:

- top-level project workspace and container for tasks and assignments

Key runtime fields:

- `id`
- `name`
- `description`
- `status`
- `start_date`
- `end_date`
- `budget`
- `location`
- `client_info`
- `created_by`
- `company_id`
- `created_at`
- `updated_at`

Relationships:

- belongs to a company
- has many project assignments
- has many tasks

### `user_project_assignments`

Purpose:

- maps a user to a project with a project-scoped role/category

Key runtime fields:

- `id`
- `user_id`
- `project_id`
- `category`
- `assigned_at`
- `assigned_by`
- `is_active`

Important notes:

- this table remains transitional because `category` is still the persisted compatibility field
- runtime code conceptually prefers `projectRole`, but persistence still centers on `category`

Relationships:

- belongs to one user
- belongs to one project
- assigned by a user

### `tasks`

Purpose:

- unified task and subtask storage using a self-referential tree model

Key runtime fields reflected in code and at least part of the checked-in schema surface:

- `id`
- `project_id`
- `parent_task_id`
- `nesting_level`
- `root_task_id`
- `title`
- `description`
- `task_reference`
- `billing_status`
- `priority`
- `category`
- `due_date`
- `location_on_site`
- `current_status`
- `status`
- `completion_percentage`
- `assigned_to`
- `primary_assignee_id`
- `delegated_user_ids`
- `assigned_by`
- `original_assigned_by`
- `container_id`
- `sub_container_id`
- `tags`
- `attachments`
- `accepted`
- `accepted_by`
- `accepted_at`
- `reviewed_by`
- `reviewed_at`
- `declined_reason` / `decline_reason`
- `rejected_reason`
- `starred_by_users`
- `cancelled_at`
- `cancelled_by`
- `archived_at`
- `archived_by`
- `deleted_at`
- `deleted_by`
- `has_unread_changes`
- `last_edited_at`
- `created_at`
- `updated_at`

Important notes:

- the task model is unified: top-level tasks and nested tasks share the same table
- the runtime still carries some legacy compatibility fields while the unified model settles
- soft-delete and archival behavior are modeled in the main table
- `location_on_site` is the dedicated task-level field for the Create Task "Location on Site" flow and is intentionally separate from `projects.location`
- Create Task derives project-scoped location suggestions from existing `tasks.location_on_site` values in the active project, then appends an explicit `Add new location` affordance in the view adapter
- the redesign metadata fields `primary_assignee_id`, `delegated_user_ids`, `container_id`, `sub_container_id`, and `tags` are part of the intended runtime model, but live-environment rollout may lag; the repository now carries `ADD_TASK_REDESIGN_METADATA_MIGRATION.sql` to close that drift, and app-side compatibility fallbacks currently avoid hard failures while those fields remain non-persistent on stale schemas
- the repository now also carries `ADD_TASK_ON_SITE_LOCATION_MIGRATION.sql`; task creation currently treats `location_on_site` as a deferred schema field so older environments can still create tasks by retrying without that column when Supabase schema cache is behind

Relationships:

- belongs to one project
- may belong to a parent task
- may have child tasks
- assigned by one user
- assigned to many users through the array field
- has many task activities

### `task_activities`

Purpose:

- unified chronological activity log for tasks

Key runtime fields:

- `id`
- `task_id`
- `user_id`
- `activity_type`
- `timestamp`
- `data`
- `description`
- `completion_percentage`
- `status`
- `notifications_sent`
- `notified_at`
- `created_at`

Important notes:

- this table is the current activity-oriented runtime model for task updates, status changes, metadata edits, and related lifecycle events
- runtime code reads this table heavily in `taskStore.supabase.ts`
- compatibility transforms still expose older views such as `updates` and `editHistory`

Relationships:

- belongs to one task
- belongs to one user

### `task_read_status`

Purpose:

- per-user read tracking for tasks

Observed runtime usage:

- written in `src/state/taskStore.supabase.ts`
- used to support unread task counts and read-state persistence

Important note:

- this table is clearly part of the runtime schema surface, but it is not defined in `scripts/sandbox/bootstrap_minimal_supabase.sql`
- that means the checked-in bootstrap SQL is incomplete relative to current runtime needs

### `roles`

Purpose:

- role-catalog metadata for the emerging role system

Observed runtime fields from `src/state/roleStore.ts`:

- `id`
- `name`
- `display_name`
- `description`
- `level`
- `permissions`
- `is_system_role`
- `created_at`
- `updated_at`

Important note:

- the `roles` table exists in runtime code, but it is not the primary authority for current permission checks
- the active permission model still normalizes mostly from `users.role` and project assignment category data

## Relationship Summary

At a conceptual level, the current operational graph is:

- company -> users
- company -> projects
- user -> projects through `user_project_assignments`
- project -> tasks
- task -> child tasks through `parent_task_id`
- task -> activities through `task_activities`
- user -> task activities

## Task Domain Database Model

### Unified task tree

The current task model uses a self-referential table strategy:

- top-level tasks have `parent_task_id = null`
- nested tasks reference another task
- `root_task_id` anchors a whole task tree
- `nesting_level` helps with tree rendering and traversal

### Task-level on-site location history

The create-task flow now treats on-site location as task metadata instead of project metadata:

- `tasks.location_on_site` stores the task-specific label chosen during create and edit flows
- `projects.location` remains the broader project address/location field and must not be repurposed as task on-site location storage
- project-scoped suggestion history is reconstructed from prior tasks in the same project that already have `location_on_site` populated
- this keeps the persistence model local to the task domain without introducing a separate global locations table

### Unified activity log

The intended current audit model is:

- `tasks` stores current state
- `task_activities` stores chronological lifecycle history

This is the canonical direction documented by runtime code and the activity unification migration.

### Transitional audit artifacts

The repository still contains migration-era references to:

- `task_updates`
- `task_status_history`
- `task_edit_history`

These are important historical inputs but should not be treated as the primary current runtime model when they disagree with `taskStore.supabase.ts` and the active `Task` / `TaskActivity` types.

## Auth Synchronization Behavior

The sandbox bootstrap SQL defines a trigger-driven pattern:

- `handle_new_user()` inserts into `public.users` after `auth.users` insertion
- `on_auth_user_created` attaches that behavior to Supabase Auth

The application also creates and reads `public.users` rows directly during auth and registration flows.

Current architectural takeaway:

- Supabase Auth is the identity authority
- `public.users` is the application-profile authority
- synchronization between them is part of the expected system design

## Realtime And Invalidation

`RealtimeSyncManager.tsx` listens for realtime changes on:

- `tasks`
- `task_activities`
- `projects`
- `users`

The database architecture therefore assumes:

- realtime-enabled public tables for key entities
- invalidation-driven refetch rather than purely local mutation replay
- fallback refresh through polling and reconnect sync when realtime is unavailable

## Security And RLS Posture

The checked-in sandbox bootstrap SQL disables RLS on several public tables and creates permissive storage policies for development convenience.

That script should be interpreted as:

- a development and test scaffold
- not an authoritative production-security declaration

For canonical runtime architecture, the important rule is:

- app behavior depends on Supabase access policies being compatible with authenticated project/task reads and writes
- production security posture must not be inferred solely from the sandbox bootstrap file

## Transitional SQL Artifacts

The repository root contains many SQL files. They do not all have the same status.

### Useful reference artifacts

These help explain the current model or migration history:

- `scripts/sandbox/bootstrap_minimal_supabase.sql`
- `TASK_ACTIVITIES_UNIFICATION_MIGRATION.sql`
- `TASK_STATUS_UNIFIED_MIGRATION.sql`
- `TASK_EDIT_HISTORY_MIGRATION.sql`
- `ADD_TASK_ON_SITE_LOCATION_MIGRATION.sql`

### Non-canonical one-off artifacts

Many other root SQL files are operationally useful but not canonical schema documents, for example:

- data checks
- one-time fixes
- user/account repair scripts
- migration-location cleanup scripts

These should be treated as history or troubleshooting inputs unless explicitly promoted elsewhere.

## Known Gaps And Transitional Risks

### Bootstrap coverage gap

`task_read_status` is used in runtime code but is not defined in the checked-in minimal bootstrap SQL.

### Role-model transition

The `roles` table exists, but runtime authorization still mainly depends on normalized compatibility fields rather than full role-catalog authority.

### Task-schema transition

The runtime has moved toward unified `task_activities`, but older migration files still describe intermediate states and legacy tables.

### Create-task location field rollout

The runtime expects `tasks.location_on_site`, but some Supabase environments may briefly lag the checked-in migration. Current create-task writes therefore include a compatibility retry path so task creation can proceed while stale schema caches catch up.

## Canonical References

Use these documents together for database and backend reconstruction:

- `documentation/SOURCE_OF_TRUTH.md`
- `documentation/SOFTWARE_ARCHITECTURE.md`
- `documentation/INSITE_APP_LATEST.md`
- `documentation/role-permission-matrix.md`
- `src/api/supabase.ts`
- `src/types/buildtrack.ts`

## Summary

The current database architecture is a Supabase-backed model with:

- Auth-managed identity
- public-schema operational tables for users, projects, assignments, tasks, and activities
- runtime normalization from snake_case rows to camelCase app models
- a unified task tree plus unified activity-log direction
- realtime invalidation and persisted local store coordination
- several migration and bootstrap artifacts that remain useful but are not themselves canonical truth

This file is the canonical database architecture reference for that runtime.
