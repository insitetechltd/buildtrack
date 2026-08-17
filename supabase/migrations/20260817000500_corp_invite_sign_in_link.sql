-- Corp RC: persist latest invite share URL on the user until first sign-in.
-- LIVE APPLY: Human Gate (schema). Idempotent.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS invite_sign_in_link text;

COMMENT ON COLUMN public.users.invite_sign_in_link IS
  'HTTPS invite-open URL for first Taskr sign-in. Null after first login.';
