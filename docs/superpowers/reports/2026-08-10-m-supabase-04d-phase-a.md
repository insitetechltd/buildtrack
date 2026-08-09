# M-SUPABASE-04d Phase A — Index health

**Date:** 2026-08-10  
**Milestone:** WS-SUPABASE / M-SUPABASE-04d  
**Status:** Phase A artefacts complete — **AWAITING HUMAN GO for live apply**  
**GO phrase required:** `you have GO for M-SUPABASE-04d live apply`

**Do not** apply on production without that exact written GO.

---

## Artefact

`supabase/migrations/20260810000100_msupabase04d_index_health.sql`

| Index | Table | Columns | Notes |
|---|---|---|---|
| `idx_task_read_status_user_task` | `task_read_status` | `(user_id, task_id)` | PK often covers this; IF NOT EXISTS no-op when present |
| `idx_project_locations_project_id` | `project_locations` | `(project_id)` | Exists on greenfield; IF NOT EXISTS for lagging tenants |

Both use `CREATE INDEX CONCURRENTLY IF NOT EXISTS` — **not** inside a transaction.

## Pre-apply (read-only)

See commented probes in the migration file (`pg_stat_user_indexes` + `pg_indexes`).

## Close gate after GO

1. Apply CONCURRENTLY statements individually.
2. Re-run `pg_indexes` — both names present.
3. Optional: Dashboard/Tasks unread + CreateTask location picker smoke (no Maestro required for Phase A close of artefacts).
