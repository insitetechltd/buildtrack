-- S5 / AZ-03 — Last company admin demote/deactivate guard
-- Prevents locking a company with zero active admins.
-- service_role / SQL console (auth.uid() IS NULL) bypasses for ops + probe cleanup.
-- Idempotent.

CREATE OR REPLACE FUNCTION public.guard_users_last_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := auth.uid();
  was_admin boolean := false;
  stays_admin boolean := false;
  other_admins int := 0;
  company uuid;
BEGIN
  -- Ops / service_role bypass (matches role-write guard convention).
  IF actor IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF TG_OP = 'DELETE' THEN
    company := OLD.company_id;
    was_admin := (
      lower(coalesce(OLD.system_permission, '')) = 'admin'
      AND coalesce(OLD.is_active, true) = true
      AND coalesce(OLD.is_pending, false) = false
    );
    IF NOT was_admin OR company IS NULL THEN
      RETURN OLD;
    END IF;
    SELECT count(*)::int INTO other_admins
    FROM public.users u
    WHERE u.company_id = company
      AND u.id IS DISTINCT FROM OLD.id
      AND lower(coalesce(u.system_permission, '')) = 'admin'
      AND coalesce(u.is_active, true) = true
      AND coalesce(u.is_pending, false) = false
      AND u.deleted_at IS NULL;
    IF other_admins = 0 THEN
      RAISE EXCEPTION 'cannot remove the last company admin'
        USING ERRCODE = '42501';
    END IF;
    RETURN OLD;
  END IF;

  -- UPDATE
  company := coalesce(NEW.company_id, OLD.company_id);
  was_admin := (
    lower(coalesce(OLD.system_permission, '')) = 'admin'
    AND coalesce(OLD.is_active, true) = true
    AND coalesce(OLD.is_pending, false) = false
    AND OLD.deleted_at IS NULL
  );
  stays_admin := (
    lower(coalesce(NEW.system_permission, '')) = 'admin'
    AND coalesce(NEW.is_active, true) = true
    AND coalesce(NEW.is_pending, false) = false
    AND NEW.deleted_at IS NULL
  );

  IF NOT was_admin OR stays_admin OR company IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT count(*)::int INTO other_admins
  FROM public.users u
  WHERE u.company_id = company
    AND u.id IS DISTINCT FROM OLD.id
    AND lower(coalesce(u.system_permission, '')) = 'admin'
    AND coalesce(u.is_active, true) = true
    AND coalesce(u.is_pending, false) = false
    AND u.deleted_at IS NULL;

  IF other_admins = 0 THEN
    RAISE EXCEPTION 'cannot demote or deactivate the last company admin'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS users_guard_last_admin ON public.users;
CREATE TRIGGER users_guard_last_admin
  BEFORE UPDATE OR DELETE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_users_last_admin();

REVOKE ALL ON FUNCTION public.guard_users_last_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.guard_users_last_admin() TO authenticated, service_role;
