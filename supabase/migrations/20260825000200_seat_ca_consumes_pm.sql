-- M-BILL / User Management: company admin consumes a PM seat (not exempt).
-- Product GO 2026-08-25: seat entitlements include CA.
-- Pending invites already hold seats via invite-user count change (is_pending counted).
--
-- SUPERSEDED by 20260825000500_seat_ca_default_worker.sql (CA → worker seat default).
-- Keep this file for sequential migration history; do not re-apply in isolation.
UPDATE public.seat_class_rules
SET
  consumes_pm_seats = true,
  consumes_worker_seats = false,
  is_seat_exempt = false,
  notes = 'Company admin — consumes PM seat (CA included in entitlement)'
WHERE role_key IN ('admin', 'company_admin');
