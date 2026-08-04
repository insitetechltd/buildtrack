-- 007_task_read_status_and_stars.sql

create table public.task_read_status (
  user_id uuid not null references public.users (id) on delete cascade,
  task_id uuid not null references public.tasks (id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (user_id, task_id)
);

create index idx_task_read_status_task on public.task_read_status (task_id);

create table public.task_stars (
  user_id uuid not null references public.users (id) on delete cascade,
  task_id uuid not null references public.tasks (id) on delete cascade,
  starred_at timestamptz not null default now(),
  primary key (user_id, task_id)
);

create index idx_task_stars_task on public.task_stars (task_id);

alter table public.task_read_status enable row level security;
alter table public.task_stars enable row level security;

revoke all on table public.task_read_status from anon;
revoke all on table public.task_stars from anon;
grant select, insert, update, delete on table public.task_read_status to authenticated, service_role;
grant select, insert, update, delete on table public.task_stars to authenticated, service_role;

create policy task_read_status_self
  on public.task_read_status for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy task_stars_self
  on public.task_stars for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
