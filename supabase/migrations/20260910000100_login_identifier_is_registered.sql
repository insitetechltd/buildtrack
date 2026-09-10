-- Public login gate: boolean-only existence check for email/phone.
-- Anon cannot SELECT public.users (M-SUPABASE-02a interim); this SECURITY DEFINER
-- RPC returns true/false only so Login can unlock password vs open web signup.
-- Does not return user ids, names, or company data.

create or replace function public.login_identifier_is_registered(p_identifier text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized text := lower(trim(coalesce(p_identifier, '')));
  raw_trim text := trim(coalesce(p_identifier, ''));
begin
  if normalized = '' then
    return false;
  end if;

  -- Email path
  if position('@' in normalized) > 0 then
    return exists (
      select 1
      from public.users u
      where u.email is not null
        and lower(trim(u.email)) = normalized
    );
  end if;

  -- Phone path (match trimmed raw; login already uses phone as typed)
  return exists (
    select 1
    from public.users u
    where u.phone is not null
      and trim(u.phone) = raw_trim
  );
end;
$$;

revoke all on function public.login_identifier_is_registered(text) from public;
grant execute on function public.login_identifier_is_registered(text) to anon, authenticated;

comment on function public.login_identifier_is_registered(text) is
  'Boolean-only login identifier existence check for email-first Login UX. No PII returned.';
