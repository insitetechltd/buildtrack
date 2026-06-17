-- Minimal Supabase sandbox bootstrap for Jest simulation scenarios A-F.
-- This is intentionally scoped to the runtime fields used by the app and tests.

create extension if not exists pgcrypto;

grant usage on schema public to anon, authenticated, service_role;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default 'general_contractor',
  description text,
  address text,
  phone text,
  email text,
  website text,
  logo text,
  tax_id text,
  license_number text,
  insurance_expiry timestamptz,
  banner jsonb,
  created_by uuid,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.users (
  id uuid primary key,
  name text not null,
  email text not null unique,
  phone text not null default '',
  company_id uuid references public.companies(id) on delete set null,
  position text not null default '',
  role text not null default 'worker',
  last_selected_project_id uuid,
  is_pending boolean not null default false,
  approved_by uuid references public.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  status text not null default 'active',
  start_date timestamptz not null default now(),
  end_date timestamptz,
  budget numeric,
  location text not null default '',
  client_info jsonb not null default '{}'::jsonb,
  created_by uuid not null references public.users(id) on delete cascade,
  company_id uuid references public.companies(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'users_last_selected_project_id_fkey'
      and conrelid = 'public.users'::regclass
  ) then
    alter table public.users
      add constraint users_last_selected_project_id_fkey
      foreign key (last_selected_project_id)
      references public.projects(id)
      on delete set null;
  end if;
end $$;

create table if not exists public.user_project_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  category text not null,
  assigned_at timestamptz not null default now(),
  assigned_by uuid not null references public.users(id) on delete cascade,
  is_active boolean not null default true,
  unique (user_id, project_id)
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  parent_task_id uuid references public.tasks(id) on delete cascade,
  nesting_level integer not null default 0,
  root_task_id uuid references public.tasks(id) on delete set null,
  title text not null,
  description text not null default '',
  task_reference text,
  billing_status text not null default 'non_billable'
    check (billing_status in ('billable', 'non_billable', 'billed')),
  priority text not null default 'medium',
  category text not null default 'general',
  due_date timestamptz,
  current_status text not null default 'new',
  status text not null default 'new',
  completion_percentage integer not null default 0,
  assigned_to uuid[] not null default '{}'::uuid[],
  assigned_by uuid not null references public.users(id) on delete cascade,
  original_assigned_by uuid references public.users(id) on delete set null,
  attachments text[] not null default '{}'::text[],
  accepted boolean not null default false,
  accepted_by uuid references public.users(id) on delete set null,
  accepted_at timestamptz,
  reviewed_by uuid references public.users(id) on delete set null,
  reviewed_at timestamptz,
  declined_reason text,
  rejected_reason text,
  starred_by_users uuid[] not null default '{}'::uuid[],
  cancelled_at timestamptz,
  cancelled_by uuid references public.users(id) on delete set null,
  archived_at timestamptz,
  archived_by uuid references public.users(id) on delete set null,
  deleted_at timestamptz,
  deleted_by uuid references public.users(id) on delete set null,
  has_unread_changes boolean not null default false,
  last_edited_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.task_activities (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  activity_type text not null,
  "timestamp" timestamptz not null default now(),
  data jsonb not null default '{}'::jsonb,
  description text not null default '',
  completion_percentage integer,
  status text,
  notifications_sent boolean,
  notified_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_projects_company_id on public.projects(company_id);
create index if not exists idx_assignments_user_active on public.user_project_assignments(user_id, is_active);
create index if not exists idx_tasks_project_id on public.tasks(project_id);
create index if not exists idx_tasks_assigned_by on public.tasks(assigned_by);
create index if not exists idx_task_activities_task_id on public.task_activities(task_id);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  if to_jsonb(new) ? 'updated_at' then
    new := jsonb_populate_record(new, jsonb_build_object('updated_at', now()));
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_companies_updated_at on public.companies;
create trigger set_companies_updated_at
before update on public.companies
for each row execute function public.set_updated_at();

drop trigger if exists set_users_updated_at on public.users;
create trigger set_users_updated_at
before update on public.users
for each row execute function public.set_updated_at();

drop trigger if exists set_projects_updated_at on public.projects;
create trigger set_projects_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

drop trigger if exists set_tasks_updated_at on public.tasks;
create trigger set_tasks_updated_at
before update on public.tasks
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (
    id,
    name,
    email,
    phone,
    company_id,
    position,
    role,
    is_pending,
    approved_by,
    approved_at
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'Unknown'),
    coalesce(new.email, coalesce(new.raw_user_meta_data->>'phone', '') || '@buildtrack.local'),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    case
      when new.raw_user_meta_data->>'company_id' is not null
      then (new.raw_user_meta_data->>'company_id')::uuid
      else null
    end,
    coalesce(new.raw_user_meta_data->>'position', ''),
    coalesce(new.raw_user_meta_data->>'role', 'worker'),
    coalesce((new.raw_user_meta_data->>'is_pending')::boolean, false),
    case
      when coalesce((new.raw_user_meta_data->>'is_pending')::boolean, false) = false
      then new.id
      else null
    end,
    case
      when coalesce((new.raw_user_meta_data->>'is_pending')::boolean, false) = false
      then now()
      else null
    end
  )
  on conflict (id) do nothing;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;
grant usage, select on all sequences in schema public to authenticated, anon;

alter table public.companies disable row level security;
alter table public.users disable row level security;
alter table public.projects disable row level security;
alter table public.user_project_assignments disable row level security;
alter table public.tasks disable row level security;
alter table public.task_activities disable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Sandbox uploads for authenticated users'
  ) then
    create policy "Sandbox uploads for authenticated users"
    on storage.objects
    for insert
    to authenticated
    with check (bucket_id = 'buildtrack-files');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Sandbox reads for authenticated users'
  ) then
    create policy "Sandbox reads for authenticated users"
    on storage.objects
    for select
    to authenticated
    using (bucket_id = 'buildtrack-files');
  end if;
end $$;
