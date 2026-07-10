-- Migration: Add project-scoped shared on-site locations
-- Description: Creates public.project_locations, preserves compatibility with legacy task location storage,
--              and backfills shared project locations from existing task data.
-- Date: 2026-07-10

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS location_on_site TEXT;

COMMENT ON COLUMN public.tasks.location_on_site IS
'Task-level on-site location label used by Create Task. Shared project suggestions should be sourced from public.project_locations.';

CREATE TABLE IF NOT EXISTS public.project_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT project_locations_label_not_blank CHECK (btrim(label) <> '')
);

COMMENT ON TABLE public.project_locations IS
'Canonical project-scoped on-site location directory shared by all users assigned to the project.';

COMMENT ON COLUMN public.project_locations.label IS
'Human-readable on-site location label as shown in Create Task and related task flows.';

CREATE INDEX IF NOT EXISTS idx_project_locations_project_id
ON public.project_locations(project_id);

CREATE INDEX IF NOT EXISTS idx_project_locations_created_by
ON public.project_locations(created_by);

CREATE UNIQUE INDEX IF NOT EXISTS idx_project_locations_project_label_unique
ON public.project_locations(
  project_id,
  lower(regexp_replace(btrim(label), '\s+', ' ', 'g'))
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'set_updated_at'
  ) THEN
    DROP TRIGGER IF EXISTS set_project_locations_updated_at ON public.project_locations;

    CREATE TRIGGER set_project_locations_updated_at
    BEFORE UPDATE ON public.project_locations
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
  END IF;
END
$$;

ALTER TABLE public.project_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_locations_select_assigned_users ON public.project_locations;
CREATE POLICY project_locations_select_assigned_users
ON public.project_locations
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_project_assignments upa
    WHERE upa.project_id = project_locations.project_id
      AND upa.user_id = auth.uid()
      AND COALESCE(upa.is_active, true)
  )
);

DROP POLICY IF EXISTS project_locations_insert_assigned_users ON public.project_locations;
CREATE POLICY project_locations_insert_assigned_users
ON public.project_locations
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_project_assignments upa
    WHERE upa.project_id = project_locations.project_id
      AND upa.user_id = auth.uid()
      AND COALESCE(upa.is_active, true)
  )
);

DROP POLICY IF EXISTS project_locations_update_assigned_users ON public.project_locations;
CREATE POLICY project_locations_update_assigned_users
ON public.project_locations
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_project_assignments upa
    WHERE upa.project_id = project_locations.project_id
      AND upa.user_id = auth.uid()
      AND COALESCE(upa.is_active, true)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.user_project_assignments upa
    WHERE upa.project_id = project_locations.project_id
      AND upa.user_id = auth.uid()
      AND COALESCE(upa.is_active, true)
  )
);

DROP POLICY IF EXISTS project_locations_delete_assigned_users ON public.project_locations;
CREATE POLICY project_locations_delete_assigned_users
ON public.project_locations
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.user_project_assignments upa
    WHERE upa.project_id = project_locations.project_id
      AND upa.user_id = auth.uid()
      AND COALESCE(upa.is_active, true)
  )
);

WITH parsed_legacy_task_locations AS (
  SELECT
    t.id,
    NULLIF(
      regexp_replace(
        COALESCE(
          NULLIF(btrim(t.location_on_site), ''),
          CASE
            WHEN t.location IS NULL THEN NULL
            WHEN jsonb_typeof(t.location) = 'string' THEN btrim(t.location::text, '"')
            WHEN jsonb_typeof(t.location) = 'object' THEN COALESCE(
              NULLIF(btrim(t.location->>'locationOnSite'), ''),
              NULLIF(btrim(t.location->>'onSite'), ''),
              NULLIF(btrim(t.location->>'label'), ''),
              NULLIF(btrim(t.location->>'name'), ''),
              NULLIF(btrim(t.location->>'text'), '')
            )
            ELSE NULL
          END
        ),
        '\s+',
        ' ',
        'g'
      ),
      ''
    ) AS normalized_label
  FROM public.tasks t
)
UPDATE public.tasks t
SET location_on_site = parsed.normalized_label
FROM parsed_legacy_task_locations parsed
WHERE t.id = parsed.id
  AND parsed.normalized_label IS NOT NULL
  AND NULLIF(btrim(t.location_on_site), '') IS NULL;

INSERT INTO public.project_locations (project_id, label, created_by)
SELECT DISTINCT
  t.project_id,
  regexp_replace(btrim(t.location_on_site), '\s+', ' ', 'g') AS label,
  t.assigned_by
FROM public.tasks t
WHERE t.project_id IS NOT NULL
  AND NULLIF(btrim(t.location_on_site), '') IS NOT NULL
ON CONFLICT DO NOTHING;

SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'project_locations')
    OR (table_name = 'tasks' AND column_name = 'location_on_site')
  )
ORDER BY table_name, ordinal_position;
