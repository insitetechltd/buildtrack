-- M-SUPABASE-03b Phase A — tasks redesign metadata 6-column ensure + indexes + best-effort backfill
-- ROLLOUT WARNING (F-003 / ROADMAP 13.4): This file is the migration artefact.
--   Phase A: apply on PARITY / sandbox ONLY. NO live production apply without
--   explicit written Human GO ("you have GO for Phase B live apply").
--
-- LIVE TENANT FINDING (2026-08-08 read-only inventory; Schema Review Decision D1):
--   Production already has all 6 columns as TEXT / TEXT[] (not UUID / UUID[]):
--     primary_assignee_id text, delegated_user_ids text[],
--     container_id text, sub_container_id text,
--     tags text[], location_on_site text
--   Prompt 2's UUID target is therefore a SEPARATE type-upgrade (Decision D2),
--   not a blind ADD COLUMN. This migration MATCHES live text/text[] so parity
--   and any lagging tenant converge without creating dual-type drift.
--
-- assigned_to on production is uuid[] (NOT uuid scalar). Backfill uses
--   assigned_to[1]::text into primary_assignee_id when empty.
--
-- containers parent table: ABSENT on prod + parity (A9). Not created here —
--   Decision D3 left to Schema Review (bundle with type-upgrade or S-UX-01N).
--
-- ROLLBACK: use sibling 20260808000301_msupabase03b_ROLLBACK.sql (guarded).
--   Do NOT DROP COLUMN from this forward migration.
--
-- Idempotent: ADD COLUMN IF NOT EXISTS; CREATE INDEX CONCURRENTLY IF NOT EXISTS;
--   backfill only fills NULL/blank primary_assignee_id.

-- 1-6 Ensure columns (text/text[] — live-compatible; see Decision D1)
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS primary_assignee_id text;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS delegated_user_ids text[];

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS container_id text;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS sub_container_id text;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS tags text[];

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS location_on_site text;

-- 7-8 Indexes (CONCURRENTLY; cannot run inside a transaction block).
-- Names match live production indexes discovered 2026-08-08 so IF NOT EXISTS
-- is a true no-op there (idx_tasks_primary_assignee_id / idx_tasks_tags).
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_primary_assignee_id
  ON public.tasks (primary_assignee_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tasks_tags
  ON public.tasks USING GIN (tags);

-- 9 Best-effort backfill from assigned_to[1] when present and primary empty.
--    No deletes. Leaves existing primary_assignee_id untouched.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tasks'
      AND column_name = 'assigned_to'
  ) THEN
    EXECUTE $sql$
      UPDATE public.tasks
      SET primary_assignee_id = assigned_to[1]::text
      WHERE (primary_assignee_id IS NULL OR btrim(primary_assignee_id) = '')
        AND assigned_to IS NOT NULL
        AND cardinality(assigned_to) >= 1
        AND assigned_to[1] IS NOT NULL
    $sql$;
  END IF;
END
$$;
