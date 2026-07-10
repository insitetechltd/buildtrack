# WS-SUPABASE / M-SUPABASE-01 — Full Supabase Deep-Dive Inspection

## Purpose

Add an explicit discovery and inspection workstream for the live Supabase-backed system so the repository has a planned, auditable pass over schema usage, auth alignment, data integrity, operational risk, and application coupling.

## Scope

### In Scope

- inspect the active Supabase-backed application surface across auth, users, projects, tasks, comments, uploads, and supporting relations
- map application code usage to the underlying tables, policies, and data flows
- verify source-of-truth boundaries between app state, cache layers, and Supabase persistence
- identify schema drift, orphaned paths, duplicated logic, and unsafe assumptions
- produce findings and a prioritized remediation backlog

### Out of Scope

- automatic destructive schema changes
- dropping legacy tables without an explicit milestone authorizing that action
- production hotfix execution as part of the inspection milestone itself

## Inspection Domains

### 1. Auth And User Model

- `auth.users` to `users` alignment
- login lookup behavior and user-profile hydration
- pending approval and role normalization interactions

### 2. Core Domain Tables

- users
- companies
- projects
- user-project assignments
- tasks
- task activities / comments / review fields
- uploads and storage-linked metadata

### 3. Application Coupling

- `src/api/supabase.ts`
- `src/state/taskStore.supabase.ts`
- `src/state/authStore.supabase.ts`
- `src/state/projectStore.supabase.ts`
- `src/state/userStore.supabase.ts`
- supporting utilities and diagnostic scripts

### 4. Runtime Safety

- cache vs database authority boundaries
- optimistic update safety
- realtime update assumptions
- sandbox/test environment safety gates
- service-role script usage and operational blast radius

## Expected Deliverables

- a full inspection report
- a system map of app-to-Supabase coupling
- explicit findings grouped by severity
- recommended follow-on milestones for schema, auth, reliability, or tooling work

## Dependencies

- `WS-DATA / M-DATA-02` closed so the inspection reviews the unified post-migration model
- current Supabase environment access and safe read-only inspection path available

## Validation

- repository inspection against current stores, services, and scripts
- safe read-oriented database checks where credentials and environment policy allow
- no secret leakage into docs, commits, or logs

## Audit Connection Path

- use the pooler-based PostgreSQL connection documented in `SUPABASE_SQL_ACCESS.md`
- prefer `/opt/homebrew/opt/libpq/bin/psql` in this workspace because `libpq` is installed there
- keep the database password in a local secret source such as `~/.pgpass`; do not commit it or paste it into repo docs
- use `WS_SUPABASE_01_READONLY_AUDIT.sql` for repeatable read-only inspection passes
- use the direct `db.<project-ref>.supabase.co:5432` host only if the environment can actually route to it; in the current workspace, the pooler host is the reliable path
- if live inspection confirms schema drift, record it explicitly and author follow-on migrations instead of silently assuming the repo schema is already applied

## Notes

- This is intentionally an inspection-first milestone.
- If the inspection finds significant risk, the result should be follow-on WS/M items rather than silent scope expansion inside this milestone.
