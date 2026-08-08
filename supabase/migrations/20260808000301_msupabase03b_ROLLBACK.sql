-- M-SUPABASE-03b ROLLBACK (guarded) — sibling to 20260808000300_msupabase03b_tasks_6col_metadata.sql
--
-- DRY_RUN default: set msupabase03b_rollback_apply = false (default) to only REPORT.
-- APPLY: BEGIN; SELECT set_config('msupabase03b.rollback_apply', 'true', true); \i this file; COMMIT;
--
-- Guards:
--   - DROP INDEX CONCURRENTLY IF EXISTS for indexes this migration may have added
--   - DROP COLUMN IF AND ONLY IF:
--       (a) column is fully empty (all NULL / empty array / blank text), AND
--       (b) session GUC msupabase03b.allow_drop_columns = 'true', AND
--       (c) msupabase03b.rollback_apply = 'true'
--   - NEVER drops columns that contain data (3rd-party / app writes preserved)
--
-- Does NOT attempt UUID type reverse-migrations (Decision D2 was never applied in Phase A).

DO $$
DECLARE
  -- Missing GUC must mean DRY_RUN (false), never NULL — `IF NOT NULL` does not early-return.
  do_apply boolean := (
    lower(coalesce(current_setting('msupabase03b.rollback_apply', true), '')) = 'true'
  );
  allow_drop boolean := (
    lower(coalesce(current_setting('msupabase03b.allow_drop_columns', true), '')) = 'true'
  );
  empty_primary boolean;
  empty_delegated boolean;
  empty_container boolean;
  empty_sub boolean;
  empty_tags boolean;
  empty_location boolean;
BEGIN
  RAISE NOTICE 'msupabase03b rollback DRY_RUN=% allow_drop=%', NOT do_apply, allow_drop;

  SELECT
    NOT EXISTS (
      SELECT 1 FROM public.tasks
      WHERE primary_assignee_id IS NOT NULL AND btrim(primary_assignee_id) <> ''
    ),
    NOT EXISTS (
      SELECT 1 FROM public.tasks
      WHERE delegated_user_ids IS NOT NULL AND cardinality(delegated_user_ids) > 0
    ),
    NOT EXISTS (
      SELECT 1 FROM public.tasks
      WHERE container_id IS NOT NULL AND btrim(container_id) <> ''
    ),
    NOT EXISTS (
      SELECT 1 FROM public.tasks
      WHERE sub_container_id IS NOT NULL AND btrim(sub_container_id) <> ''
    ),
    NOT EXISTS (
      SELECT 1 FROM public.tasks
      WHERE tags IS NOT NULL AND cardinality(tags) > 0
    ),
    NOT EXISTS (
      SELECT 1 FROM public.tasks
      WHERE location_on_site IS NOT NULL AND btrim(location_on_site) <> ''
    )
  INTO empty_primary, empty_delegated, empty_container, empty_sub, empty_tags, empty_location;

  RAISE NOTICE 'empty primary=% delegated=% container=% sub=% tags=% location=%',
    empty_primary, empty_delegated, empty_container, empty_sub, empty_tags, empty_location;

  IF NOT do_apply THEN
    RAISE NOTICE 'DRY_RUN only — no DROP INDEX / DROP COLUMN executed';
    RETURN;
  END IF;

  -- Index drops (non-CONCURRENTLY inside DO is fine for rollback script; prefer CONCURRENTLY outside)
  -- Only drop indexes this migration ensures. Live may also have older names;
  -- do not drop idx_tasks_primary_assignee_id / idx_tasks_tags if they pre-existed
  -- with data-dependent use — Phase A rollback on PARITY only drops if we created them.
  EXECUTE 'DROP INDEX IF EXISTS public.idx_tasks_primary_assignee_id';
  EXECUTE 'DROP INDEX IF EXISTS public.idx_tasks_tags';
  RAISE NOTICE 'Dropped idx_tasks_primary_assignee_id / idx_tasks_tags if present';

  IF NOT allow_drop THEN
    RAISE NOTICE 'allow_drop_columns=false — skipping DROP COLUMN';
    RETURN;
  END IF;

  IF empty_primary THEN
    EXECUTE 'ALTER TABLE public.tasks DROP COLUMN IF EXISTS primary_assignee_id';
    RAISE NOTICE 'Dropped primary_assignee_id (was empty)';
  ELSE
    RAISE NOTICE 'SKIP drop primary_assignee_id — has data';
  END IF;

  IF empty_delegated THEN
    EXECUTE 'ALTER TABLE public.tasks DROP COLUMN IF EXISTS delegated_user_ids';
    RAISE NOTICE 'Dropped delegated_user_ids (was empty)';
  ELSE
    RAISE NOTICE 'SKIP drop delegated_user_ids — has data';
  END IF;

  IF empty_container THEN
    EXECUTE 'ALTER TABLE public.tasks DROP COLUMN IF EXISTS container_id';
    RAISE NOTICE 'Dropped container_id (was empty)';
  ELSE
    RAISE NOTICE 'SKIP drop container_id — has data';
  END IF;

  IF empty_sub THEN
    EXECUTE 'ALTER TABLE public.tasks DROP COLUMN IF EXISTS sub_container_id';
    RAISE NOTICE 'Dropped sub_container_id (was empty)';
  ELSE
    RAISE NOTICE 'SKIP drop sub_container_id — has data';
  END IF;

  -- tags / location_on_site often pre-existed with data — only drop if empty
  IF empty_tags THEN
    EXECUTE 'ALTER TABLE public.tasks DROP COLUMN IF EXISTS tags';
    RAISE NOTICE 'Dropped tags (was empty)';
  ELSE
    RAISE NOTICE 'SKIP drop tags — has data';
  END IF;

  IF empty_location THEN
    EXECUTE 'ALTER TABLE public.tasks DROP COLUMN IF EXISTS location_on_site';
    RAISE NOTICE 'Dropped location_on_site (was empty)';
  ELSE
    RAISE NOTICE 'SKIP drop location_on_site — has data';
  END IF;
END
$$;
