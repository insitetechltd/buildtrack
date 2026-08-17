-- R4 / Apple 5.1.1(v): authenticated user may delete their own Auth account in-app.
-- SUPERSEDED by 20260817000200_r4_delete_own_account_keep_audit_who.sql
-- The first live apply deleted auth.users, which CASCADE-deleted public.users and
-- task_activities (ON DELETE CASCADE) and SET NULL on accepted_by / reviewed_by.
-- 002 keeps a name stub on public.users so jobsite history still has "who".
--
-- LIVE APPLY: Human Gate (schema + auth). Do not apply 001 alone on a new tenant.
-- Idempotent.

CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  DELETE FROM auth.users WHERE id = uid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'account_not_found' USING ERRCODE = '02000';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_own_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;
