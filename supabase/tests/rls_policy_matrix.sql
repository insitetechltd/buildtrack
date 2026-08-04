-- RLS policy matrix smoke tests for greenfield v1.
-- Run AFTER migrations on a NEW sandbox with service_role / SQL editor.
-- Replace UUIDs after seeding Tristan (manager) / Herman (member) fixtures.
--
-- Expected:
--   L-HARBOR: Herman can SELECT Harbor tasks (Y)
--   L-PENT:   Herman cannot SELECT Penthouse tasks (N)
--   S-06:     anon SELECT on tasks fails / returns empty under RLS

-- 1) Inventory: RLS enabled on all client tables
select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in (
    'companies', 'users', 'projects', 'user_project_assignments',
    'tasks', 'task_assignments', 'task_activities', 'task_read_status',
    'task_stars', 'project_locations', 'task_files'
  )
order by 1;

-- 2) Anon grants must be empty (DELTA-SEC vs OLD)
select table_name, privilege_type
from information_schema.role_table_grants
where grantee = 'anon'
  and table_schema = 'public'
order by 1, 2;

-- 3) Policy catalog
select schemaname, tablename, policyname, cmd, roles
from pg_policies
where schemaname in ('public', 'storage')
order by schemaname, tablename, policyname;

-- 4) Manual isolation checks (set locals after seed):
-- begin;
--   set local role authenticated;
--   set local request.jwt.claim.sub = '<herman-user-id>';
--   select count(*) as harbor_visible from public.tasks where project_id = '<harbor-id>';
--   select count(*) as penthouse_visible from public.tasks where project_id = '<penthouse-id>';
-- rollback;
