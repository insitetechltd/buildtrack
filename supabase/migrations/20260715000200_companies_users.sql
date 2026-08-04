-- 002_companies_users.sql

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default 'general_contractor'
    check (type in (
      'general_contractor',
      'subcontractor',
      'owner',
      'architect',
      'engineer',
      'other'
    )),
  description text,
  address text,
  phone text,
  email text,
  website text,
  logo text,
  created_by uuid,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text not null,
  phone text not null default '',
  company_id uuid references public.companies (id) on delete set null,
  position text not null default '',
  system_permission text not null default 'member'
    check (system_permission in ('admin', 'manager', 'member')),
  user_type text,
  last_selected_project_id uuid,
  is_pending boolean not null default false,
  approved_by uuid references public.users (id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_email_unique unique (email)
);

create unique index users_phone_unique_nonempty
  on public.users (phone)
  where phone <> '';

create trigger companies_set_updated_at
  before update on public.companies
  for each row execute function public.set_updated_at();

create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

create or replace function public.get_user_company_id(uid uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select company_id from public.users where id = uid;
$$;

create or replace function public.user_is_pending(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select is_pending from public.users where id = uid), true);
$$;

create or replace function public.user_system_permission(uid uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select system_permission from public.users where id = uid;
$$;

create or replace function public.user_is_company_admin(uid uuid, p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where u.id = uid
      and u.company_id = p_company_id
      and u.system_permission = 'admin'
      and coalesce(u.is_pending, false) = false
  );
$$;

revoke all on function public.get_user_company_id(uuid) from public;
revoke all on function public.user_is_pending(uuid) from public;
revoke all on function public.user_system_permission(uuid) from public;
revoke all on function public.user_is_company_admin(uuid, uuid) from public;
grant execute on function public.get_user_company_id(uuid) to authenticated, service_role;
grant execute on function public.user_is_pending(uuid) to authenticated, service_role;
grant execute on function public.user_system_permission(uuid) to authenticated, service_role;
grant execute on function public.user_is_company_admin(uuid, uuid) to authenticated, service_role;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (
    id,
    name,
    email,
    phone,
    company_id,
    position,
    system_permission,
    is_pending
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'Unknown'),
    coalesce(
      new.email,
      coalesce(new.raw_user_meta_data->>'phone', '') || '@buildtrack.local'
    ),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    case
      when new.raw_user_meta_data->>'company_id' is not null
        then (new.raw_user_meta_data->>'company_id')::uuid
      else null
    end,
    coalesce(new.raw_user_meta_data->>'position', ''),
    coalesce(new.raw_user_meta_data->>'system_permission', 'member'),
    coalesce((new.raw_user_meta_data->>'is_pending')::boolean, true)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

alter table public.companies enable row level security;
alter table public.users enable row level security;

revoke all on table public.companies from anon;
revoke all on table public.users from anon;
grant select, insert, update, delete on table public.companies to authenticated, service_role;
grant select, insert, update, delete on table public.users to authenticated, service_role;

create policy companies_select_members
  on public.companies for select to authenticated
  using (
    not public.user_is_pending(auth.uid())
    and (
      id = public.get_user_company_id(auth.uid())
      or public.user_system_permission(auth.uid()) = 'admin'
    )
  );

create policy companies_insert_admin
  on public.companies for insert to authenticated
  with check (public.user_system_permission(auth.uid()) = 'admin');

create policy companies_update_admin
  on public.companies for update to authenticated
  using (public.user_is_company_admin(auth.uid(), id))
  with check (public.user_is_company_admin(auth.uid(), id));

create policy companies_delete_admin
  on public.companies for delete to authenticated
  using (public.user_is_company_admin(auth.uid(), id));

create policy users_select_self_or_company
  on public.users for select to authenticated
  using (
    id = auth.uid()
    or (
      not public.user_is_pending(auth.uid())
      and company_id is not null
      and company_id = public.get_user_company_id(auth.uid())
    )
    or public.user_system_permission(auth.uid()) = 'admin'
  );

create policy users_update_self_or_admin
  on public.users for update to authenticated
  using (
    id = auth.uid()
    or public.user_system_permission(auth.uid()) = 'admin'
  )
  with check (
    id = auth.uid()
    or public.user_system_permission(auth.uid()) = 'admin'
  );

create policy users_insert_service_only
  on public.users for insert to service_role
  with check (true);
