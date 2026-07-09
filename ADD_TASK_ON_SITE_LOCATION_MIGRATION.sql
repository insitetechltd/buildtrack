-- Migration: Add dedicated task-level on-site location field
-- Description: Persists task "Location on Site" separately from projects.location
-- Date: 2026-07-08

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS location_on_site TEXT;

CREATE INDEX IF NOT EXISTS idx_tasks_project_location_on_site
ON tasks(project_id, location_on_site);

COMMENT ON COLUMN tasks.location_on_site IS
'Task-level on-site location label used by Create Task project-scoped history. Separate from projects.location.';

SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'tasks'
  AND column_name = 'location_on_site';
