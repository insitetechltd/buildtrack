-- 001_extensions_and_helpers.sql
-- Extensions + shared updated_at trigger helper only.
-- RLS helpers that depend on tables are created in later migrations.

create extension if not exists pgcrypto with schema extensions;
create extension if not exists "uuid-ossp" with schema extensions;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
