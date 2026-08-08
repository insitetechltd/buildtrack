-- S-UX-01N live fixup: finish RLS for project_containers after partial apply.
-- Live tenant has NO user_has_project_access helpers — mirror project_locations
-- assignment-based policies + restrictive anon_block_all.

REVOKE ALL ON TABLE public.project_containers FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.project_containers TO authenticated, service_role;

ALTER TABLE public.project_containers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_containers_select ON public.project_containers;
DROP POLICY IF EXISTS project_containers_insert ON public.project_containers;
DROP POLICY IF EXISTS project_containers_update ON public.project_containers;
DROP POLICY IF EXISTS project_containers_delete ON public.project_containers;
DROP POLICY IF EXISTS project_containers_select_assigned_users ON public.project_containers;
DROP POLICY IF EXISTS project_containers_insert_assigned_users ON public.project_containers;
DROP POLICY IF EXISTS project_containers_update_assigned_users ON public.project_containers;
DROP POLICY IF EXISTS project_containers_delete_assigned_users ON public.project_containers;
DROP POLICY IF EXISTS anon_block_all ON public.project_containers;

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

CREATE POLICY anon_block_all
  ON public.project_containers
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);
