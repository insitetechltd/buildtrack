-- 004_tasks_core.sql
-- Slim tasks table: single status column, no assignee/attachment arrays.

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  title text not null,
  description text not null default '',
  status text not null default 'new'
    check (status in (
      'new',
      'declined',
      'accepted',
      'in_progress',
      'submitted_for_review',
      'approved',
      'rejected',
      'cancelled'
    )),
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high', 'urgent')),
  category text,
  task_reference text,
  due_date timestamptz,
  completion_percentage integer not null default 0
    check (completion_percentage >= 0 and completion_percentage <= 100),
  assigned_by uuid references public.users (id) on delete set null,
  location_on_site text,
  project_location_id uuid,
  container_id text,
  sub_container_id text,
  tags text[] not null default '{}',
  billing_status text
    check (billing_status is null or billing_status in ('billable', 'non_billable', 'billed')),
  declined_reason text,
  rejected_reason text,
  accepted_by uuid references public.users (id) on delete set null,
  accepted_at timestamptz,
  reviewed_by uuid references public.users (id) on delete set null,
  reviewed_at timestamptz,
  parent_task_id uuid references public.tasks (id) on delete set null,
  root_task_id uuid references public.tasks (id) on delete set null,
  nesting_level integer not null default 0 check (nesting_level >= 0),
  cancelled_at timestamptz,
  cancelled_by uuid references public.users (id) on delete set null,
  archived_at timestamptz,
  archived_by uuid references public.users (id) on delete set null,
  deleted_at timestamptz,
  deleted_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_tasks_project_active
  on public.tasks (project_id, created_at desc)
  where deleted_at is null and archived_at is null;

create index idx_tasks_project_status
  on public.tasks (project_id, status)
  where deleted_at is null;

create index idx_tasks_parent on public.tasks (parent_task_id);
create index idx_tasks_root on public.tasks (root_task_id);
create index idx_tasks_tags on public.tasks using gin (tags);

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

alter table public.tasks enable row level security;
revoke all on table public.tasks from anon;
grant select, insert, update, delete on table public.tasks to authenticated, service_role;

create policy tasks_select_project_access
  on public.tasks for select to authenticated
  using (
    public.user_has_project_access(auth.uid(), project_id)
    or public.user_system_permission(auth.uid()) = 'admin'
  );

create policy tasks_insert_project_access
  on public.tasks for insert to authenticated
  with check (
    public.user_has_project_access(auth.uid(), project_id)
    and not public.user_is_pending(auth.uid())
  );

create policy tasks_update_project_access
  on public.tasks for update to authenticated
  using (
    public.user_has_project_access(auth.uid(), project_id)
    or public.user_system_permission(auth.uid()) = 'admin'
  )
  with check (
    public.user_has_project_access(auth.uid(), project_id)
    or public.user_system_permission(auth.uid()) = 'admin'
  );

-- Prefer soft-delete via UPDATE; hard DELETE limited to admin.
create policy tasks_delete_admin
  on public.tasks for delete to authenticated
  using (public.user_system_permission(auth.uid()) = 'admin');
