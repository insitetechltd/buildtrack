-- 008_project_locations_and_files.sql

create table public.project_locations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  label text not null,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_locations_label_not_blank check (btrim(label) <> '')
);

create unique index idx_project_locations_project_label_unique
  on public.project_locations (
    project_id,
    lower(regexp_replace(btrim(label), '\s+', ' ', 'g'))
  );

create index idx_project_locations_project_id
  on public.project_locations (project_id);

create trigger project_locations_set_updated_at
  before update on public.project_locations
  for each row execute function public.set_updated_at();

alter table public.tasks
  add constraint tasks_project_location_fkey
  foreign key (project_location_id)
  references public.project_locations (id)
  on delete set null;

create table public.task_files (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks (id) on delete cascade,
  activity_id uuid references public.task_activities (id) on delete set null,
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  created_by uuid references public.users (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint task_files_path_not_blank check (btrim(storage_path) <> '')
);

create index idx_task_files_task on public.task_files (task_id);
create index idx_task_files_activity on public.task_files (activity_id);

alter table public.project_locations enable row level security;
alter table public.task_files enable row level security;

revoke all on table public.project_locations from anon;
revoke all on table public.task_files from anon;
grant select, insert, update, delete on table public.project_locations to authenticated, service_role;
grant select, insert, delete on table public.task_files to authenticated, service_role;
grant select, insert, update, delete on table public.task_files to service_role;

create policy project_locations_select
  on public.project_locations for select to authenticated
  using (
    public.user_has_project_access(auth.uid(), project_id)
    or public.user_system_permission(auth.uid()) = 'admin'
  );

create policy project_locations_insert
  on public.project_locations for insert to authenticated
  with check (
    public.user_has_project_access(auth.uid(), project_id)
    and not public.user_is_pending(auth.uid())
  );

create policy project_locations_update
  on public.project_locations for update to authenticated
  using (
    created_by = auth.uid()
    or public.user_system_permission(auth.uid()) = 'admin'
  )
  with check (
    created_by = auth.uid()
    or public.user_system_permission(auth.uid()) = 'admin'
  );

create policy project_locations_delete
  on public.project_locations for delete to authenticated
  using (
    created_by = auth.uid()
    or public.user_system_permission(auth.uid()) = 'admin'
  );

create policy task_files_select
  on public.task_files for select to authenticated
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

create policy task_files_insert
  on public.task_files for insert to authenticated
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from public.tasks t
      where t.id = task_id
        and public.user_has_project_access(auth.uid(), t.project_id)
        and not public.user_is_pending(auth.uid())
    )
  );

create policy task_files_delete
  on public.task_files for delete to authenticated
  using (
    created_by = auth.uid()
    or public.user_system_permission(auth.uid()) = 'admin'
  );
