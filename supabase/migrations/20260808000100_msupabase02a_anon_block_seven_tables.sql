-- M-SUPABASE-02a: RLS anon-block on 7 core tables (P0)
-- Tables (ROADMAP / F-001): companies, users, projects, tasks,
--   task_activities, task_read_status, project_locations
-- Close gate: anon SELECT returns 0 rows on all 7.
-- Idempotent. Does not VALIDATE any FK. No 03b column work.

do $$
declare
  t text;
begin
  foreach t in array array[
    'companies',
    'users',
    'projects',
    'tasks',
    'task_activities',
    'task_read_status',
    'project_locations'
  ]
  loop
    execute format('revoke all on table public.%I from anon', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists anon_block_all on public.%I', t);
    execute format(
      'create policy anon_block_all on public.%I as restrictive for all to anon using (false) with check (false)',
      t
    );
  end loop;
end
$$;

-- Interim authenticated access for tables that had RLS disabled and no
-- authenticated policies on the live tenant (helpers like user_has_project_access
-- are absent). Restrictive anon_block_all still denies anon. Finer project-scoped
-- policies remain a follow-on hardening step after helpers exist on-tenant.

drop policy if exists companies_authenticated_interim on public.companies;
create policy companies_authenticated_interim
  on public.companies for all to authenticated
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

drop policy if exists projects_authenticated_interim on public.projects;
create policy projects_authenticated_interim
  on public.projects for all to authenticated
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

drop policy if exists tasks_authenticated_interim on public.tasks;
create policy tasks_authenticated_interim
  on public.tasks for all to authenticated
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

drop policy if exists task_activities_authenticated_interim on public.task_activities;
create policy task_activities_authenticated_interim
  on public.task_activities for all to authenticated
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

-- users: SELECT/UPDATE/DELETE interim; INSERT owned by 02b users_self_write
drop policy if exists users_authenticated_select_interim on public.users;
create policy users_authenticated_select_interim
  on public.users for select to authenticated
  using (auth.uid() is not null);

drop policy if exists users_authenticated_update_interim on public.users;
create policy users_authenticated_update_interim
  on public.users for update to authenticated
  using (auth.uid() is not null)
  with check (auth.uid() is not null);

drop policy if exists users_authenticated_delete_interim on public.users;
create policy users_authenticated_delete_interim
  on public.users for delete to authenticated
  using (auth.uid() is not null);

-- project_locations + task_read_status already had authenticated policies;
-- only anon revoke + anon_block_all above. Do not widen those tables here.
