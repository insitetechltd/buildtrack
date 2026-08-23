-- Repair legacy tenants where public.users.updated_at was dropped but
-- users_set_updated_at still calls set_updated_at() (blocks ALL user UPDATEs,
-- including invite must_set_password and invite_sign_in_link persistence).
-- Idempotent. Safe on greenfield and live.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Defensive helper: skip when a table row type has no updated_at column.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF to_jsonb(NEW) ? 'updated_at' THEN
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;
