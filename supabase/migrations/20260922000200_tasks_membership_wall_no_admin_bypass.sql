-- F6 follow-on (Human GO 2026-09-22): membership wall for field task SELECT/UPDATE.
--
-- After dropping authenticated_interim, company `system_permission=admin` still
-- bypassed `tasks_*_project_access` and `task_activities_select` via OR admin.
-- Product law (construction-domain / AUTHZ): admin field lists use the same
-- project-membership wall as workers — wrong-project rows must stay invisible.
-- Hard DELETE remains admin-only (`tasks_delete_admin`).
--
-- Apply: DEV then PROD after 20260922000100. Prove: F6 PASS on both planes.

BEGIN;

DROP POLICY IF EXISTS tasks_select_project_access ON public.tasks;
CREATE POLICY tasks_select_project_access
  ON public.tasks FOR SELECT TO authenticated
  USING (public.user_has_project_access(auth.uid(), project_id));

DROP POLICY IF EXISTS tasks_update_project_access ON public.tasks;
CREATE POLICY tasks_update_project_access
  ON public.tasks FOR UPDATE TO authenticated
  USING (public.user_has_project_access(auth.uid(), project_id))
  WITH CHECK (public.user_has_project_access(auth.uid(), project_id));

DROP POLICY IF EXISTS task_activities_select ON public.task_activities;
CREATE POLICY task_activities_select
  ON public.task_activities FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.tasks t
      WHERE t.id = task_id
        AND public.user_has_project_access(auth.uid(), t.project_id)
    )
  );

COMMIT;
