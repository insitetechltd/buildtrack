-- M-AUTHZ-RC / seat law correction (2026-08-25):
-- CA (company admin) is company authority, NOT a PM seat by default.
-- Default deployable seat for CA = Worker. Upgrade to PM via users.deployable_seat='pm'
-- (subject to pm_seats entitlement), same as other PM upgrades.
--
-- HUMAN GATE: do NOT apply live without explicit GO.
-- Revises 20260825000200_seat_ca_consumes_pm.sql.

-- 1) Optional override: CA can hold a PM deployable seat while remaining admin.
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS deployable_seat text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_deployable_seat_allowed'
      AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_deployable_seat_allowed
      CHECK (deployable_seat IS NULL OR deployable_seat IN ('pm', 'worker'));
  END IF;
END
$$;

COMMENT ON COLUMN public.users.deployable_seat IS
  'Optional PM/Worker seat override. NULL = derive from role (CA→worker, supervisor→pm). CA upgraded to PM sets pm.';

-- 2) Flip seat_class_rules: CA consumes worker seat (not PM, not exempt).
UPDATE public.seat_class_rules
SET
  consumes_pm_seats = false,
  consumes_worker_seats = true,
  is_seat_exempt = false,
  notes = 'Company admin — company authority; default deployable seat = worker (not PM)'
WHERE role_key IN ('admin', 'company_admin');

-- 3) user_seat_contribution: honor deployable_seat override; CA fallback → worker.
CREATE OR REPLACE FUNCTION public.user_seat_contribution(
  p_role text,
  p_is_active boolean,
  p_deployable_seat text
)
RETURNS TABLE (pm_seats integer, worker_seats integer)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text := lower(coalesce(p_role, ''));
  v_deploy text := lower(coalesce(p_deployable_seat, ''));
  v_consumes_pm boolean;
  v_consumes_worker boolean;
  v_exempt boolean;
BEGIN
  pm_seats := 0;
  worker_seats := 0;

  IF p_is_active IS FALSE THEN
    RETURN NEXT;
    RETURN;
  END IF;

  -- Explicit deployable seat wins (CA upgraded to PM, or forced worker).
  IF v_deploy = 'pm' THEN
    pm_seats := 1;
    RETURN NEXT;
    RETURN;
  END IF;
  IF v_deploy = 'worker' THEN
    worker_seats := 1;
    RETURN NEXT;
    RETURN;
  END IF;

  IF v_role = '' THEN
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT
    scr.consumes_pm_seats,
    scr.consumes_worker_seats,
    scr.is_seat_exempt
  INTO v_consumes_pm, v_consumes_worker, v_exempt
  FROM public.seat_class_rules scr
  WHERE scr.role_key = v_role;

  IF FOUND THEN
    IF coalesce(v_exempt, false) THEN
      RETURN NEXT;
      RETURN;
    END IF;
    IF coalesce(v_consumes_pm, false) THEN
      pm_seats := 1;
    ELSIF coalesce(v_consumes_worker, false) THEN
      worker_seats := 1;
    END IF;
    RETURN NEXT;
    RETURN;
  END IF;

  -- Fallback when rule row missing (align with invite-user + app seatUsage).
  IF v_role IN ('manager', 'supervisor') THEN
    pm_seats := 1;
  ELSE
    -- admin / company_admin / worker / member / foreman → worker
    worker_seats := 1;
  END IF;
  RETURN NEXT;
END;
$$;

-- Compatibility wrapper (2-arg) for callers that have not passed deployable_seat yet.
CREATE OR REPLACE FUNCTION public.user_seat_contribution(
  p_role text,
  p_is_active boolean
)
RETURNS TABLE (pm_seats integer, worker_seats integer)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM public.user_seat_contribution(p_role, p_is_active, NULL);
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_company_seat_limits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_limits record;
  v_self record;
  v_others_pm integer := 0;
  v_others_worker integer := 0;
  v_row record;
  v_contrib record;
  v_old_role text;
  v_old_active boolean;
  v_old_deploy text;
  v_new_role text;
  v_new_active boolean;
  v_new_deploy text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  v_company_id := NEW.company_id;
  IF v_company_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_new_role := NEW.role;
  v_new_active := COALESCE(NEW.is_active, true);
  v_new_deploy := NEW.deployable_seat;

  IF TG_OP = 'UPDATE' THEN
    v_old_role := OLD.role;
    v_old_active := COALESCE(OLD.is_active, true);
    v_old_deploy := OLD.deployable_seat;
    -- No seat footprint change → skip (allows edits while already over-cap).
    IF v_old_role IS NOT DISTINCT FROM v_new_role
       AND v_old_active IS NOT DISTINCT FROM v_new_active
       AND v_old_deploy IS NOT DISTINCT FROM v_new_deploy
       AND OLD.company_id IS NOT DISTINCT FROM NEW.company_id THEN
      RETURN NEW;
    END IF;
  END IF;

  SELECT * INTO v_self
  FROM public.user_seat_contribution(v_new_role, v_new_active, v_new_deploy);

  -- Soft-inactive / non-consuming role: always allowed.
  IF COALESCE(v_self.pm_seats, 0) = 0 AND COALESCE(v_self.worker_seats, 0) = 0 THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_limits
  FROM public.company_seat_limits(v_company_id);

  FOR v_row IN
    SELECT
      u.role,
      COALESCE(u.is_active, true) AS is_active,
      u.deployable_seat
    FROM public.users u
    WHERE u.company_id = v_company_id
      AND u.id IS DISTINCT FROM NEW.id
  LOOP
    SELECT * INTO v_contrib
    FROM public.user_seat_contribution(v_row.role, v_row.is_active, v_row.deployable_seat);
    v_others_pm := v_others_pm + COALESCE(v_contrib.pm_seats, 0);
    v_others_worker := v_others_worker + COALESCE(v_contrib.worker_seats, 0);
  END LOOP;

  IF v_others_pm + COALESCE(v_self.pm_seats, 0) > COALESCE(v_limits.pm_seat_limit, 0) THEN
    RAISE EXCEPTION 'pm_seat_limit: PM seat limit reached (%/%). Add a PM seat or free a seat before assigning this role.',
      v_others_pm + COALESCE(v_self.pm_seats, 0),
      COALESCE(v_limits.pm_seat_limit, 0)
      USING ERRCODE = 'check_violation';
  END IF;

  IF v_others_worker + COALESCE(v_self.worker_seats, 0) > COALESCE(v_limits.worker_seat_limit, 0) THEN
    RAISE EXCEPTION 'worker_seat_limit: Worker seat limit reached (%/%). Add a worker pack or free a seat before assigning this role.',
      v_others_worker + COALESCE(v_self.worker_seats, 0),
      COALESCE(v_limits.worker_seat_limit, 0)
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_users_enforce_company_seat_limits ON public.users;
CREATE TRIGGER trg_users_enforce_company_seat_limits
  BEFORE INSERT OR UPDATE OF role, is_active, company_id, deployable_seat
  ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_company_seat_limits();

COMMENT ON FUNCTION public.enforce_company_seat_limits() IS
  'Hard seat gate: reject INSERT/UPDATE that would exceed company_entitlements PM/worker limits. CA defaults to worker seat.';

-- Backfill: leave deployable_seat NULL so CA→worker via seat_class_rules.
-- Existing CAs previously counted as PM seats now count as worker (no row rewrite needed).
