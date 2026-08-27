-- Fix: new-company founding CA rejected by seat trigger when company_entitlements missing.
--
-- Root cause: 20260825000300 company_seat_limits fails closed at 0/0 with no entitlements
-- row. create_company_for_self INSERTs companies then UPDATEs users.company_id → trigger
-- rejects admin before Stripe webhook can provision entitlements
-- (CA defaults to 1 worker seat under Starter 1 PM / 5 workers).
--
-- Fix:
-- 1) AFTER INSERT on companies → Starter-default entitlements (1 PM / 5 workers).
-- 2) company_seat_limits missing row → same Starter defaults (safety net).
-- 3) Backfill any companies still lacking an entitlements row.

CREATE OR REPLACE FUNCTION public.company_seat_limits(p_company_id uuid)
RETURNS TABLE (pm_seat_limit integer, worker_seat_limit integer)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pm integer;
  v_worker integer;
  v_snap jsonb;
  v_pm_snap numeric;
  v_worker_snap numeric;
BEGIN
  SELECT
    ce.pm_seat_limit,
    ce.worker_seat_limit,
    ce.entitlements_snapshot
  INTO v_pm, v_worker, v_snap
  FROM public.company_entitlements ce
  WHERE ce.company_id = p_company_id;

  IF NOT FOUND THEN
    -- Pre-checkout / orphan company: Starter seat meters (product law 1 PM + 5 workers).
    pm_seat_limit := 1;
    worker_seat_limit := 5;
    RETURN NEXT;
    RETURN;
  END IF;

  v_pm_snap := NULLIF(v_snap #>> '{meters,pm_seats}', '')::numeric;
  v_worker_snap := NULLIF(v_snap #>> '{meters,worker_seats}', '')::numeric;

  pm_seat_limit := COALESCE(v_pm_snap::integer, v_pm, 1);
  worker_seat_limit := COALESCE(v_worker_snap::integer, v_worker, 5);
  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.company_seat_limits(uuid) IS
  'Seat caps from company_entitlements; missing row → Starter defaults (1 PM / 5 workers).';

CREATE OR REPLACE FUNCTION public.bootstrap_company_starter_entitlements()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_snapshot jsonb;
BEGIN
  v_snapshot := jsonb_build_object(
    'billing_phase', 'trial',
    'trial_discount_model', 'pre_checkout_bootstrap',
    'meters', jsonb_build_object(
      'pm_seats', 1,
      'worker_seats', 5,
      'projects', 1,
      'entries_trial_total', 100,
      'storage_bytes', 5368709120
    )
  );

  INSERT INTO public.company_entitlements (
    company_id,
    pm_seat_limit,
    worker_seat_limit,
    project_limit,
    entries_limit,
    entries_limit_kind,
    storage_limit_bytes,
    subscription_status,
    billing_phase,
    entitlements_snapshot,
    snapshot_locked_at
  )
  VALUES (
    NEW.id,
    1,
    5,
    1,
    100,
    'trial_total',
    5368709120,
    'trialing',
    'trial',
    v_snapshot,
    now()
  )
  ON CONFLICT (company_id) DO NOTHING;

  -- Skip company_subscriptions here: locked_plan_price_id is NOT NULL and is
  -- set at Stripe checkout. Seat enforcement only needs company_entitlements.

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'company_entitlement_revisions'
  ) THEN
    INSERT INTO public.company_entitlement_revisions (
      company_id,
      billing_phase,
      source,
      entitlements_snapshot
    )
    SELECT
      NEW.id,
      'trial',
      'signup',
      v_snapshot
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.company_entitlement_revisions r
      WHERE r.company_id = NEW.id
        AND r.source = 'signup'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_companies_bootstrap_starter_entitlements ON public.companies;
CREATE TRIGGER trg_companies_bootstrap_starter_entitlements
  AFTER INSERT ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.bootstrap_company_starter_entitlements();

COMMENT ON FUNCTION public.bootstrap_company_starter_entitlements() IS
  'On company create, provision Starter seat entitlements so founding CA can attach before Stripe checkout.';

-- Backfill companies that already exist without entitlements (created after hard seat gate).
INSERT INTO public.company_entitlements (
  company_id,
  pm_seat_limit,
  worker_seat_limit,
  project_limit,
  entries_limit,
  entries_limit_kind,
  storage_limit_bytes,
  subscription_status,
  billing_phase,
  entitlements_snapshot,
  snapshot_locked_at
)
SELECT
  c.id,
  1,
  5,
  1,
  100,
  'trial_total',
  5368709120,
  'trialing',
  'trial',
  jsonb_build_object(
    'billing_phase', 'trial',
    'trial_discount_model', 'pre_checkout_bootstrap',
    'meters', jsonb_build_object(
      'pm_seats', 1,
      'worker_seats', 5,
      'projects', 1,
      'entries_trial_total', 100,
      'storage_bytes', 5368709120
    )
  ),
  now()
FROM public.companies c
WHERE NOT EXISTS (
  SELECT 1 FROM public.company_entitlements ce WHERE ce.company_id = c.id
)
ON CONFLICT (company_id) DO NOTHING;
