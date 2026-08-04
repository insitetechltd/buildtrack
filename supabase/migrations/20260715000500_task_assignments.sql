-- 005_task_assignments.sql

create table public.task_assignments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  assignment_kind text not null default 'delegated'
    check (assignment_kind in ('primary', 'delegated', 'watcher')),
  is_active boolean not null default true,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index task_assignments_active_unique
  on public.task_assignments (task_id, user_id)
  where is_active = true;

create unique index task_assignments_one_primary
  on public.task_assignments (task_id)
  where is_active = true and assignment_kind = 'primary';

create index idx_task_assignments_user_active
  on public.task_assignments (user_id)
  where is_active = true;

create index idx_task_assignments_task_active
  on public.task_assignments (task_id)
  where is_active = true;

create trigger task_assignments_set_updated_at
  before update on public.task_assignments
  for each row execute function public.set_updated_at();

alter table public.task_assignments enable row level security;
revoke all on table public.task_assignments from anon;
grant select, insert, update, delete on table public.task_assignments to authenticated, service_role;

create policy task_assignments_select
  on public.task_assignments for select to authenticated
  using (
    exists (
      select 1 from public.tasks t
      where t.id = task_id
        and (
          public.user_has_project_access(auth.uid(), t.project_id)
          or public.user_system_permission(auth.uid()) = 'admin'
        )
    )
  );

create policy task_assignments_mutate
  on public.task_assignments for all to authenticated
  using (
    exists (
      select 1 from public.tasks t
      where t.id = task_id
        and public.user_has_project_access(auth.uid(), t.project_id)
        and not public.user_is_pending(auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.tasks t
      where t.id = task_id
        and public.user_has_project_access(auth.uid(), t.project_id)
        and not public.user_is_pending(auth.uid())
    )
  );
