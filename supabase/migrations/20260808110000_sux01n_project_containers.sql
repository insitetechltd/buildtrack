-- S-UX-01N / D3 — project_containers catalogue (Phase A artefact)
--
-- NO live production apply without explicit written Human GO:
--   "you have GO for S-UX-01N containers live apply"
--
-- Purpose: shared project-scoped area / floor / zone / package list for
--   tasks.container_id + tasks.sub_container_id (live text columns, Decision D1).
-- Progressive disclosure: app UI stays hidden until this table has rows for
--   the active project (or the user opts into "Organize by area").
--
-- Mirrors public.project_locations patterns (RLS + anon revoke).
-- ROLLBACK: sibling …001_ROLLBACK.sql (guarded).

CREATE TABLE IF NOT EXISTS public.project_containers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.project_containers (id) ON DELETE CASCADE,
  label text NOT NULL,
  created_by uuid REFERENCES public.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT project_containers_label_not_blank CHECK (btrim(label) <> ''),
  CONSTRAINT project_containers_parent_not_self CHECK (parent_id IS DISTINCT FROM id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_project_containers_project_parent_label_unique
  ON public.project_containers (
    project_id,
    COALESCE(parent_id, '00000000-0000-0000-0000-000000000000'::uuid),
    lower(regexp_replace(btrim(label), '\s+', ' ', 'g'))
  );

CREATE INDEX IF NOT EXISTS idx_project_containers_project_id
  ON public.project_containers (project_id);

CREATE INDEX IF NOT EXISTS idx_project_containers_parent_id
  ON public.project_containers (parent_id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'set_updated_at'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'project_containers_set_updated_at'
  ) THEN
    CREATE TRIGGER project_containers_set_updated_at
      BEFORE UPDATE ON public.project_containers
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

ALTER TABLE public.project_containers ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.project_containers FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.project_containers TO authenticated, service_role;

-- Live tenant (2026-08-08): user_has_project_access helpers are ABSENT.
-- Mirror project_locations assignment-based policies instead.
DROP POLICY IF EXISTS project_containers_select ON public.project_containers;
DROP POLICY IF EXISTS project_containers_insert ON public.project_containers;
DROP POLICY IF EXISTS project_containers_update ON public.project_containers;
DROP POLICY IF EXISTS project_containers_delete ON public.project_containers;
DROP POLICY IF EXISTS project_containers_select_assigned_users ON public.project_containers;
DROP POLICY IF EXISTS project_containers_insert_assigned_users ON public.project_containers;
DROP POLICY IF EXISTS project_containers_update_assigned_users ON public.project_containers;
DROP POLICY IF EXISTS project_containers_delete_assigned_users ON public.project_containers;

CREATE POLICY project_containers_select_assigned_users
  ON public.project_containers FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_project_assignments upa
      WHERE upa.project_id = project_containers.project_id
        AND upa.user_id = auth.uid()
        AND COALESCE(upa.is_active, true)
    )
  );

CREATE POLICY project_containers_insert_assigned_users
  ON public.project_containers FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_project_assignments upa
      WHERE upa.project_id = project_containers.project_id
        AND upa.user_id = auth.uid()
        AND COALESCE(upa.is_active, true)
    )
  );

CREATE POLICY project_containers_update_assigned_users
  ON public.project_containers FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_project_assignments upa
      WHERE upa.project_id = project_containers.project_id
        AND upa.user_id = auth.uid()
        AND COALESCE(upa.is_active, true)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_project_assignments upa
      WHERE upa.project_id = project_containers.project_id
        AND upa.user_id = auth.uid()
        AND COALESCE(upa.is_active, true)
    )
  );

CREATE POLICY project_containers_delete_assigned_users
  ON public.project_containers FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_project_assignments upa
      WHERE upa.project_id = project_containers.project_id
        AND upa.user_id = auth.uid()
        AND COALESCE(upa.is_active, true)
    )
  );

-- Restrictive anon block (align with M-SUPABASE-02a posture)
DROP POLICY IF EXISTS anon_block_all ON public.project_containers;
CREATE POLICY anon_block_all
  ON public.project_containers
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);
