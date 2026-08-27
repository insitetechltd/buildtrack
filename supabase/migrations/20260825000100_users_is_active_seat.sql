-- Soft-inactive company seats (M-AUTHZ-RC User Management).
-- Does NOT delete auth/public users. Inactive users do not consume PM/worker seats.
-- LIVE APPLY: Human Gate for schema — operator GO implied by product ask 2026-08-25.
-- Idempotent.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.users.is_active IS
  'When false, seat is vacated for billing/invite caps; profile retained (not deleted).';
