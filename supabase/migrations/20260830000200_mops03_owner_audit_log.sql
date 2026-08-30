-- M-OPS-03 Phase 1d — owner mutation audit log (DEV Human Gate apply only).
-- actor_user_id → auth.users (platform owners may not exist in public.users).

create table if not exists public.owner_audit_log (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  actor_user_id uuid references auth.users (id) on delete set null,
  action text not null,
  company_id uuid,
  target_user_id uuid,
  payload jsonb not null default '{}'::jsonb
);

create index if not exists owner_audit_log_occurred_at_idx
  on public.owner_audit_log (occurred_at desc);

create index if not exists owner_audit_log_company_id_idx
  on public.owner_audit_log (company_id)
  where company_id is not null;

comment on table public.owner_audit_log is
  'hq owner mutations: createUser / deactivateUser / future overrides. No secrets.';

alter table public.owner_audit_log enable row level security;

-- No client writes. Authenticated owners may SELECT (optional read in later UI).
drop policy if exists owner_audit_log_select_owners on public.owner_audit_log;
create policy owner_audit_log_select_owners
  on public.owner_audit_log
  for select
  to authenticated
  using (public.is_platform_owner(auth.uid()));

revoke all on table public.owner_audit_log from anon;
grant select on table public.owner_audit_log to authenticated;
grant all on table public.owner_audit_log to service_role;
