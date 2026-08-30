-- M-OPS-03 Phase 1b — platform_owners allowlist (DEV Human Gate apply only).
-- SoT for Edge owner auth. Client platformSuperusers.ts remains UI gate only.

create table if not exists public.platform_owners (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  note text
);

comment on table public.platform_owners is
  'Platform operators for hq / owner Edge. Not a jobsite role.';

alter table public.platform_owners enable row level security;

-- No authenticated writes. Owners may SELECT self (optional). Service role bypasses RLS.
drop policy if exists platform_owners_select_self on public.platform_owners;
create policy platform_owners_select_self
  on public.platform_owners
  for select
  to authenticated
  using (user_id = auth.uid());

revoke all on table public.platform_owners from anon;
grant select on table public.platform_owners to authenticated;
grant all on table public.platform_owners to service_role;

-- SECURITY DEFINER helper: Edge may call with service role + explicit uid
-- (auth.uid() is NULL under service_role — never rely on it from Edge admin client).
create or replace function public.is_platform_owner(p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.platform_owners po where po.user_id = p_uid
  );
$$;

revoke all on function public.is_platform_owner(uuid) from public;
grant execute on function public.is_platform_owner(uuid) to service_role;
grant execute on function public.is_platform_owner(uuid) to authenticated;

-- Seed Tristan (fail-closed committed owner)
insert into public.platform_owners (user_id, note)
values (
  '006fe339-c4c6-456f-965a-2a9ff47d35de',
  'M-OPS-03 Phase 1b seed'
)
on conflict (user_id) do nothing;
