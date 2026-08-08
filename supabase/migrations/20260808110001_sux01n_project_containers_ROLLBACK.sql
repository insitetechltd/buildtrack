-- ROLLBACK for 20260808110000_sux01n_project_containers.sql
-- Dry-run: SET app.sux01n_containers_rollback_dry_run = 'true';
-- Apply:   SET app.sux01n_containers_rollback_dry_run = 'false'; then run.
-- Refuses DROP when any tasks still reference container ids as text.

DO $$
DECLARE
  dry_run boolean := COALESCE(
    nullif(current_setting('app.sux01n_containers_rollback_dry_run', true), ''),
    'true'
  ) = 'true';
  referenced bigint;
BEGIN
  SELECT COUNT(*) INTO referenced
  FROM public.tasks t
  WHERE (
      (t.container_id IS NOT NULL AND btrim(t.container_id) <> '')
      OR (t.sub_container_id IS NOT NULL AND btrim(t.sub_container_id) <> '')
    );

  RAISE NOTICE 'S-UX-01N rollback dry_run=% referenced_tasks=%', dry_run, referenced;

  IF referenced > 0 THEN
    RAISE NOTICE 'REFUSE drop project_containers — % tasks still reference container ids', referenced;
    RETURN;
  END IF;

  IF dry_run THEN
    RAISE NOTICE 'DRY RUN — would DROP TABLE public.project_containers';
    RETURN;
  END IF;

  DROP TABLE IF EXISTS public.project_containers CASCADE;
  RAISE NOTICE 'Dropped public.project_containers';
END $$;
