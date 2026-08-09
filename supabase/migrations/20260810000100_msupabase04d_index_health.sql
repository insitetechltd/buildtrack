-- M-SUPABASE-04d Phase A — index health (task_read_status + project_locations)
-- ROLLOUT: artefacts only. NO LIVE PRODUCTION APPLY without explicit written Human GO:
--   "you have GO for M-SUPABASE-04d live apply"
--
-- Intent:
--   1) Ensure composite lookup index on task_read_status (user_id, task_id)
--      for Dashboard/Tasks per-row unread patterns.
--   2) Ensure project_id index on project_locations for CreateTask location picker.
--
-- Greenfield already has:
--   - PK (user_id, task_id) on task_read_status (+ idx_task_read_status_task)
--   - idx_project_locations_project_id on project_locations (project_id)
-- Live/lagging tenants may diverge — IF NOT EXISTS keeps this idempotent.
--
-- CONCURRENTLY cannot run inside a transaction block. Apply statements
-- individually (Dashboard / psql) after GO — do not wrap in BEGIN/COMMIT.
--
-- Pre-apply read-only probes (safe anytime):
--
--   SELECT schemaname, relname AS table_name, indexrelname AS index_name, idx_scan
--   FROM pg_stat_user_indexes
--   WHERE relname IN ('task_read_status', 'project_locations')
--   ORDER BY relname, indexrelname;
--
--   SELECT indexname, indexdef
--   FROM pg_indexes
--   WHERE schemaname = 'public'
--     AND tablename IN ('task_read_status', 'project_locations')
--   ORDER BY tablename, indexname;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_task_read_status_user_task
  ON public.task_read_status (user_id, task_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_locations_project_id
  ON public.project_locations (project_id);
