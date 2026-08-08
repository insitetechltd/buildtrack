-- M-SUPABASE-02b: public.users.id → auth.users(id) FK NOT VALID + users_self_write
-- DO NOT VALIDATE CONSTRAINT in this milestone (deferred P2).
-- Idempotent.

do $$
begin
  if not exists (
    select 1
    from pg_constraint c
    join pg_class rel on rel.oid = c.conrelid
    join pg_namespace n on n.oid = rel.relnamespace
    where n.nspname = 'public'
      and rel.relname = 'users'
      and c.conname = 'users_id_fkey_auth_users'
  ) then
    alter table public.users
      add constraint users_id_fkey_auth_users
      foreign key (id) references auth.users (id)
      on delete cascade
      not valid;
  end if;
end
$$;

drop policy if exists users_self_write on public.users;
create policy users_self_write
  on public.users
  as permissive
  for insert
  to authenticated
  with check (id = auth.uid());
