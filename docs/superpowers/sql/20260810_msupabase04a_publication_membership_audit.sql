-- M-SUPABASE-04a — READ-ONLY postgres_changes publication membership audit
-- Classification: inspect only. NO ALTER PUBLICATION / NO writes.
-- Anti-secret: do not paste connection strings, passwords, or project refs into git.
--
-- Expected membership (aligned with src/utils/RealtimeSyncManager.tsx):
--   public.tasks            — client listens event=*
--   public.task_activities  — client listens INSERT only
--   public.projects         — client listens event=*
--   public.users            — client listens UPDATE only
--
-- Note: Supabase publication membership is table-level; event filters live in
-- the client subscribe() call. Confirm tables are IN the publication; event
-- mask alignment is a code contract, not a pubsub column.
--
-- Run via Dashboard SQL Editor OR psql with local secrets (never echo).
-- Live audit skipped this cycle when ~/.pgpass absent.

-- 1) Publication tables for supabase_realtime / postgres_changes
SELECT pubname, schemaname, tablename
FROM pg_publication_tables
WHERE pubname IN ('supabase_realtime', 'postgres_changes')
ORDER BY pubname, schemaname, tablename;

-- 2) Expected 4-table presence checklist (1 = present)
SELECT
  t.expected_table,
  EXISTS (
    SELECT 1
    FROM pg_publication_tables p
    WHERE p.schemaname = 'public'
      AND p.tablename = t.expected_table
      AND p.pubname IN ('supabase_realtime', 'postgres_changes')
  ) AS in_publication
FROM (
  VALUES
    ('tasks'),
    ('task_activities'),
    ('projects'),
    ('users')
) AS t(expected_table)
ORDER BY t.expected_table;

-- 3) Optional: list all publications (names only)
SELECT oid, pubname, puballtables
FROM pg_publication
ORDER BY pubname;
