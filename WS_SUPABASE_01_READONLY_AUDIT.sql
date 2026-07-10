-- WS-SUPABASE / M-SUPABASE-01
-- Read-only audit queries for the live Supabase schema.
-- Usage:
--   /opt/homebrew/opt/libpq/bin/psql -w \
--     -h "$SUPABASE_DB_HOST" \
--     -p "$SUPABASE_DB_PORT" \
--     -d "$SUPABASE_DB_NAME" \
--     -U "$SUPABASE_DB_USER" \
--     -f WS_SUPABASE_01_READONLY_AUDIT.sql
--
-- This script is SQL-only on purpose so it can run both in `psql`
-- and in the Supabase Dashboard SQL Editor.

SELECT 'PUBLIC_TABLES' AS section;
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

SELECT 'TASK_LOCATION_COLUMNS' AS section;
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'tasks'
  AND column_name IN ('location', 'location_on_site', 'project_id', 'assigned_by')
ORDER BY ordinal_position;

SELECT 'PROJECT_LOCATIONS_TABLE_EXISTS' AS section;
SELECT COUNT(*) AS project_locations_table_count
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'project_locations';

SELECT 'PROJECT_LOCATIONS_COLUMNS' AS section;
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'project_locations'
ORDER BY ordinal_position;

SELECT 'TASK_LOCATION_JSON_TYPES' AS section;
SELECT
  COALESCE(jt, 'null') AS json_type,
  COUNT(*) AS row_count
FROM (
  SELECT jsonb_typeof(location) AS jt
  FROM public.tasks
) typed_locations
GROUP BY jt
ORDER BY 1;

SELECT 'TASK_LOCATION_ON_SITE_POPULATION' AS section;
SELECT
  COUNT(*) FILTER (WHERE NULLIF(btrim(location_on_site), '') IS NOT NULL) AS with_location_on_site,
  COUNT(*) FILTER (WHERE NULLIF(btrim(location_on_site), '') IS NULL) AS without_location_on_site
FROM public.tasks;

SELECT 'TASK_LOCATION_LABEL_CANDIDATES' AS section;
SELECT
  project_id::text AS project_id,
  COUNT(*) AS candidate_count,
  MIN(location_label) AS first_label_sample,
  MAX(location_label) AS last_label_sample
FROM (
  SELECT
    project_id,
    regexp_replace(
      COALESCE(
        NULLIF(btrim(location_on_site), ''),
        CASE
          WHEN location IS NULL THEN NULL
          WHEN jsonb_typeof(location) = 'string' THEN btrim(location::text, '"')
          WHEN jsonb_typeof(location) = 'object' THEN COALESCE(
            NULLIF(btrim(location->>'locationOnSite'), ''),
            NULLIF(btrim(location->>'onSite'), ''),
            NULLIF(btrim(location->>'label'), ''),
            NULLIF(btrim(location->>'name'), ''),
            NULLIF(btrim(location->>'text'), '')
          )
          ELSE NULL
        END
      ),
      '\s+',
      ' ',
      'g'
    ) AS location_label
  FROM public.tasks
) candidate_locations
WHERE project_id IS NOT NULL
  AND NULLIF(btrim(location_label), '') IS NOT NULL
GROUP BY project_id
ORDER BY COUNT(*) DESC, project_id::text
LIMIT 25;

SELECT 'PROJECT_ASSIGNMENT_COUNTS' AS section;
SELECT
  project_id::text AS project_id,
  COUNT(*) AS assignment_count,
  COUNT(*) FILTER (WHERE COALESCE(is_active, true)) AS active_assignment_count
FROM public.user_project_assignments
GROUP BY project_id
ORDER BY COUNT(*) DESC, project_id::text
LIMIT 25;
