-- M-SUPABASE-04a — Remediation: add RealtimeSyncManager tables to supabase_realtime
-- Classification: WRITE — DO NOT RUN without explicit Human GO.
-- Suggested GO phrase: you have GO for M-SUPABASE-04a publication ADD TABLE
-- Anti-secret: never paste connection strings / passwords / project refs into git.
--
-- Precondition (confirmed live 2026-08-10 RO audit):
--   supabase_realtime exists with puballtables=false and 0 member tables.
--   public.tasks, task_activities, projects, users exist (replica identity default).
--
-- Apply via pooler SESSION port :5432 only. Re-run audit SQL after apply.
-- Live applied production 2026-08-10 after Human GO (publication ADD TABLE).
-- Post-apply audit: 4/4 in_publication=t for tasks, task_activities, projects, users.

ALTER PUBLICATION supabase_realtime ADD TABLE
  public.tasks,
  public.task_activities,
  public.projects,
  public.users;

-- Verify (same as audit Query 2):
-- SELECT t.expected_table, EXISTS (...) AS in_publication
-- FROM (VALUES ('tasks'),('task_activities'),('projects'),('users')) AS t(expected_table);
