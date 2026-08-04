-- 003_projects_assignments.sql

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  status text not null default 'active'
    check (status in ('planning', 'active', 'on_hold', 'completed', 'cancelled')),
  start_date timestamptz not null default now(),
  end_date timestamptz,
  budget numeric,
  client_info jsonb not null default '{}'::jsonb,
  location text,
  company_id uuid references public.companies (id) on delete set null,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users
  add constraint users_last_selected_project_fkey
  foreign key (last_selected_project_id)
  references public.projects (id)
  on delete set null;

create table public.user_project_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  project_role text not null
    check (project_role in (
      'lead_project_manager',
      'contractor',
      'subcontractor',
      'inspector',
      'architect',
      'engineer',
      'worker',
      'foreman'
    )),
  assigned_by uuid references public.users (id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index user_project_assignments_active_unique
  on public.user_project_assignments (user_id, project_id)
  where is_active = true;

create index idx_upa_user_active
  on public.user_project_assignments (user_id)
  where is_active = true;

create index idx_upa_project_active
  on public.user_project_assignments (project_id)
  where is_active = true;

create index idx_projects_company on public.projects (company_id);
create index idx_projects_status on public.projects (status);

create trigger projects_set_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

create trigger upa_set_updated_at
  before update on public.user_project_assignments
  for each row execute function public.set_updated_at();

create or replace function public.user_has_project_access(uid uuid, p_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select not public.user_is_pending(uid)
    and exists (
      select 1
      from public.user_project_assignments upa
      where upa.project_id = p_project_id
        and upa.user_id = uid
        and upa.is_active = true
    );
$$;

revoke all on function public.user_has_project_access(uuid, uuid) from public;
grant execute on function public.user_has_project_access(uuid, uuid) to authenticated, service_role;

alter table public.projects enable row level security;
alter table public.user_project_assignments enable row level security;

revoke all on table public.projects from anon;
revoke all on table public.user_project_assignments from anon;
grant select, insert, update, delete on table public.projects to authenticated, service_role;
grant select, insert, update, delete on table public.user_project_assignments to authenticated, service_role;

create policy projects_select_assigned
  on public.projects for select to authenticated
  using (
    public.user_has_project_access(auth.uid(), id)
    or public.user_system_permission(auth.uid()) = 'admin'
  );

create policy projects_insert_manager_admin
  on public.projects for insert to authenticated
  with check (
    public.user_system_permission(auth.uid()) in ('admin', 'manager')
    and not public.user_is_pending(auth.uid())
  );

create policy projects_update_manager_admin
  on public.projects for update to authenticated
  using (
    public.user_system_permission(auth.uid()) in ('admin', 'manager')
    and (
      public.user_has_project_access(auth.uid(), id)
      or public.user_system_permission(auth.uid()) = 'admin'
    )
  )
  with check (
    public.user_system_permission(auth.uid()) in ('admin', 'manager')
  );

create policy projects_delete_admin
  on public.projects for delete to authenticated
  using (public.user_system_permission(auth.uid()) = 'admin');

create policy upa_select_own_or_admin
  on public.user_project_assignments for select to authenticated
  using (
    user_id = auth.uid()
    or public.user_has_project_access(auth.uid(), project_id)
    or public.user_system_permission(auth.uid()) = 'admin'
  );

create policy upa_mutate_manager_admin
  on public.user_project_assignments for all to authenticated
  using (
    public.user_system_permission(auth.uid()) in ('admin', 'manager')
    and not public.user_is_pending(auth.uid())
  )
  with check (
    public.user_system_permission(auth.uid()) in ('admin', 'manager')
    and not public.user_is_pending(auth.uid())
  );
