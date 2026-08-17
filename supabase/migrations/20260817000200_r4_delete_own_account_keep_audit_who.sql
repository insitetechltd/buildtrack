-- R4 follow-up: Apple 5.1.1(v) account deletion without erasing jobsite "who".
--
-- Do NOT DELETE auth.users / public.users. Those FKs CASCADE into task_activities
-- (user_id) and SET NULL on tasks.accepted_by / reviewed_by / assigned_by.
-- Instead: strip login + contact PII, ban Auth, keep public.users.id + name so
-- history still resolves the actor. Live assignment / project membership is removed.
--
-- LIVE APPLY: Human Gate (schema + auth). Replaces 20260817000100 function.
-- Idempotent.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE OR REPLACE FUNCTION public.delete_own_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  uid uuid := auth.uid();
  tombstone_email text;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = uid) THEN
    RAISE EXCEPTION 'account_not_found' USING ERRCODE = '02000';
  END IF;

  tombstone_email := 'deleted-' || uid::text || '@invalid.local';

  -- Keep id + name + company_id (RLS + actor lookup). Strip contact PII.
  UPDATE public.users
  SET
    email = tombstone_email,
    phone = '',
    last_selected_project_id = NULL,
    deleted_at = COALESCE(deleted_at, now())
  WHERE id = uid;

  DELETE FROM public.task_assignments WHERE user_id = uid;
  DELETE FROM public.user_project_assignments WHERE user_id = uid;
  DELETE FROM public.task_read_status WHERE user_id = uid;
  DELETE FROM public.task_stars WHERE user_id = uid;

  UPDATE public.tasks
  SET primary_assignee_id = NULL
  WHERE primary_assignee_id = uid::text;

  UPDATE public.tasks
  SET delegated_user_ids = array_remove(delegated_user_ids, uid::text)
  WHERE delegated_user_ids IS NOT NULL
    AND uid::text = ANY (delegated_user_ids);

  -- Destroy login without deleting the Auth PK (keeps users.id FK).
  DELETE FROM auth.identities WHERE user_id = uid;
  DELETE FROM auth.sessions WHERE user_id = uid;
  DELETE FROM auth.refresh_tokens WHERE user_id = uid;

  UPDATE auth.users
  SET
    email = tombstone_email,
    phone = NULL,
    encrypted_password = 'DELETED',
    email_confirmed_at = NULL,
    phone_confirmed_at = NULL,
    banned_until = 'infinity',
    raw_user_meta_data = jsonb_build_object('deleted', true),
    updated_at = now()
  WHERE id = uid;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_own_account() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_own_account() TO authenticated;
