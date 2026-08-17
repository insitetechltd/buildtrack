-- Corp RC: invitees must choose a password after first magic-link sign-in.
-- LIVE APPLY: Human Gate (schema). Idempotent.
-- Create Company owners stay false (column default). Invite-user sets true on NEW create only.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS must_set_password boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.users.must_set_password IS
  'True until an invited user chooses their own password after first sign-in. Default false for Create Company and existing accounts.';
