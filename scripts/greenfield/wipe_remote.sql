-- Dangerous: resets application schema on a REMOTE sandbox.
-- Preserves auth schema; clears public + storage.objects for rebuild.

-- Cancel any leftover transaction noise
\set ON_ERROR_STOP on

-- Clear storage objects via SQL when allowed.
-- Bucket rows are removed via Storage API in apply_remote.sh (direct DELETE blocked).
do $$
begin
  truncate table storage.objects restart identity cascade;
exception
  when others then
    raise notice 'storage.objects truncate skipped: %', sqlerrm;
end
$$;

-- Wipe public (tables, views, functions, policies)
drop schema if exists public cascade;
create schema public;

grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on schema public to postgres, service_role;
grant all on schema public to authenticated;

alter default privileges in schema public
  grant all on tables to postgres, service_role;
alter default privileges in schema public
  grant all on sequences to postgres, service_role;
alter default privileges in schema public
  grant all on functions to postgres, service_role;

-- Allow PostgREST to see the schema
notify pgrst, 'reload schema';
