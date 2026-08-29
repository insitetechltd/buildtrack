-- Strict company seat enforcement on users INSERT/UPDATE.
-- Rejects any write that would leave active seat holders over company_entitlements.
-- Soft-inactive (is_active = false) frees seats. Pending invites still hold seats.

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
    -- Superseded by 20260825000400: Starter defaults (1/5) so founding CA can bootstrap.
    -- Kept here for sequential apply continuity; 004 replaces this function.
    pm_seat_limit := 1;
    worker_seat_limit := 5;
    RETURN NEXT;
    RETURN;
  END IF;

  v_pm_snap := NULLIF(v_snap #>> '{meters,pm_seats}', '')::numeric;
  v_worker_snap := NULLIF(v_snap #>> '{meters,worker_seats}', '')::numeric;

  pm_seat_limit := COALESCE(v_pm_snap::integer, v_pm, 0);
  worker_seat_limit := COALESCE(v_worker_snap::integer, v_worker, 0);
  RETURN NEXT;
END;
$$;

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
DECLARE
  v_role text := lower(coalesce(p_role, ''));
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

  -- Fallback when rule row missing (align with invite-user edge).
  IF v_role IN ('admin', 'company_admin', 'manager', 'supervisor') THEN
    pm_seats := 1;
  ELSE
    worker_seats := 1;
  END IF;
  RETURN NEXT;
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
  v_new_role text;
  v_new_active boolean;
  v_new jsonb;
  v_old jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  v_company_id := NEW.company_id;
  IF v_company_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Dual-path: live tenants use users.role; greenfield uses system_permission.
  v_new := to_jsonb(NEW);
  v_new_role := lower(coalesce(
    nullif(v_new->>'role', ''),
    CASE v_new->>'system_permission'
      WHEN 'admin' THEN 'admin'
      WHEN 'manager' THEN 'manager'
      WHEN 'member' THEN 'worker'
      ELSE v_new->>'system_permission'
    END,
    ''
  ));
  v_new_active := COALESCE(NEW.is_active, true);

  IF TG_OP = 'UPDATE' THEN
    v_old := to_jsonb(OLD);
    v_old_role := lower(coalesce(
      nullif(v_old->>'role', ''),
      CASE v_old->>'system_permission'
        WHEN 'admin' THEN 'admin'
        WHEN 'manager' THEN 'manager'
        WHEN 'member' THEN 'worker'
        ELSE v_old->>'system_permission'
      END,
      ''
    ));
    v_old_active := COALESCE(OLD.is_active, true);
    -- No seat footprint change → skip (allows edits while already over-cap).
    IF v_old_role IS NOT DISTINCT FROM v_new_role
       AND v_old_active IS NOT DISTINCT FROM v_new_active
       AND OLD.company_id IS NOT DISTINCT FROM NEW.company_id THEN
      RETURN NEW;
    END IF;
  END IF;

  SELECT * INTO v_self
  FROM public.user_seat_contribution(v_new_role, v_new_active);

  -- Soft-inactive / non-consuming role: always allowed.
  IF COALESCE(v_self.pm_seats, 0) = 0 AND COALESCE(v_self.worker_seats, 0) = 0 THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_limits
  FROM public.company_seat_limits(v_company_id);

  FOR v_row IN
    SELECT
      lower(coalesce(
        nullif(to_jsonb(u)->>'role', ''),
        CASE to_jsonb(u)->>'system_permission'
          WHEN 'admin' THEN 'admin'
          WHEN 'manager' THEN 'manager'
          WHEN 'member' THEN 'worker'
          ELSE to_jsonb(u)->>'system_permission'
        END,
        ''
      )) AS seat_role,
      COALESCE(u.is_active, true) AS is_active
    FROM public.users u
    WHERE u.company_id = v_company_id
      AND u.id IS DISTINCT FROM NEW.id
  LOOP
    SELECT * INTO v_contrib
    FROM public.user_seat_contribution(v_row.seat_role, v_row.is_active);
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
-- No UPDATE OF column list: greenfield has system_permission; live has role.
CREATE TRIGGER trg_users_enforce_company_seat_limits
  BEFORE INSERT OR UPDATE
  ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_company_seat_limits();

COMMENT ON FUNCTION public.enforce_company_seat_limits() IS
  'Hard seat gate: reject INSERT/UPDATE that would exceed company_entitlements PM/worker limits. Dual-path role|system_permission.';
