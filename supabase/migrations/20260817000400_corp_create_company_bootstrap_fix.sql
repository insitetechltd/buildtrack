-- Corp RC fix: create_company_for_self must survive chicken-egg RLS + role-write guard.
--
-- Root cause (2026-08-17 smoke): founder signed up as admin but company INSERT/UPDATE
-- aborted under authenticated RLS / guard_users_role_column_writes, leaving
-- users.company_id NULL and no companies row ("No company on this account").
--
-- Fix:
-- 1) Function runs with row_security = off (SECURITY DEFINER owner).
-- 2) Attach company_id without rewriting role when already admin.
-- 3) Role-write guard allows first-company self-bootstrap to admin.
--
-- LIVE APPLY: Human Gate. Idempotent.

CREATE OR REPLACE FUNCTION public.create_company_for_self(
  company_name text,
  company_type text DEFAULT 'general_contractor'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  uid uuid := auth.uid();
  existing_company_id uuid;
  new_company_id uuid;
  has_role boolean;
  has_system_permission boolean;
  safe_type text;
  current_role text;
  current_perm text;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '28000';
  END IF;

  IF company_name IS NULL OR btrim(company_name) = '' THEN
    RAISE EXCEPTION 'company_name_required' USING ERRCODE = '22023';
  END IF;

  safe_type := coalesce(nullif(btrim(company_type), ''), 'general_contractor');
  IF safe_type NOT IN (
    'general_contractor',
    'subcontractor',
    'owner',
    'architect',
    'engineer',
    'other'
  ) THEN
    RAISE EXCEPTION 'invalid_company_type' USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = uid) THEN
    RAISE EXCEPTION 'profile_not_found' USING ERRCODE = '02000';
  END IF;

  SELECT company_id INTO existing_company_id
  FROM public.users
  WHERE id = uid;

  IF existing_company_id IS NOT NULL THEN
    RETURN existing_company_id;
  END IF;

  INSERT INTO public.companies (name, type, created_by, is_active)
  VALUES (btrim(company_name), safe_type, uid, true)
  RETURNING id INTO new_company_id;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'role'
  ) INTO has_role;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'system_permission'
  ) INTO has_system_permission;

  IF has_role THEN
    EXECUTE 'SELECT role FROM public.users WHERE id = $1' INTO current_role USING uid;
  END IF;
  IF has_system_permission THEN
    EXECUTE 'SELECT system_permission FROM public.users WHERE id = $1' INTO current_perm USING uid;
  END IF;

  -- Single UPDATE: company attach + optional admin promote (role-guard bootstrap allows
  -- OLD.company_id IS NULL → NEW.company_id set with admin). Avoids a second role-only
  -- UPDATE that would fail the guard after company_id is already set.
  IF has_role AND has_system_permission THEN
    EXECUTE $q$
      UPDATE public.users
      SET
        company_id = $1,
        role = CASE
          WHEN lower(coalesce(role, '')) IN ('admin', 'company_admin') THEN role
          ELSE 'admin'
        END,
        system_permission = CASE
          WHEN coalesce(system_permission, '') = 'admin' THEN system_permission
          ELSE 'admin'
        END,
        is_pending = false,
        updated_at = now()
      WHERE id = $2
    $q$ USING new_company_id, uid;
  ELSIF has_role THEN
    IF lower(coalesce(current_role, '')) IN ('admin', 'company_admin') THEN
      EXECUTE $q$
        UPDATE public.users
        SET company_id = $1, is_pending = false, updated_at = now()
        WHERE id = $2
      $q$ USING new_company_id, uid;
    ELSE
      EXECUTE $q$
        UPDATE public.users
        SET company_id = $1, role = 'admin', is_pending = false, updated_at = now()
        WHERE id = $2
      $q$ USING new_company_id, uid;
    END IF;
  ELSIF has_system_permission THEN
    IF coalesce(current_perm, '') = 'admin' THEN
      EXECUTE $q$
        UPDATE public.users
        SET company_id = $1, is_pending = false, updated_at = now()
        WHERE id = $2
      $q$ USING new_company_id, uid;
    ELSE
      EXECUTE $q$
        UPDATE public.users
        SET company_id = $1, system_permission = 'admin', is_pending = false, updated_at = now()
        WHERE id = $2
      $q$ USING new_company_id, uid;
    END IF;
  ELSE
    UPDATE public.users
    SET
      company_id = new_company_id,
      is_pending = false,
      updated_at = now()
    WHERE id = uid;
  END IF;

  RETURN new_company_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_company_for_self(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_company_for_self(text, text) TO authenticated;

-- Allow founder to promote self to admin when attaching their first company.
CREATE OR REPLACE FUNCTION public.guard_users_role_column_writes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := auth.uid();
  role_changed boolean := false;
  perm_changed boolean := false;
  new_json jsonb := to_jsonb(NEW);
  old_json jsonb := CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE '{}'::jsonb END;
  new_role text := lower(coalesce(new_json->>'role', ''));
  new_perm text := coalesce(new_json->>'system_permission', '');
BEGIN
  -- service_role / SQL console (no jwt) bypasses
  IF actor IS NULL THEN
    RETURN NEW;
  END IF;

  IF new_json ? 'role' THEN
    role_changed := (new_json->>'role') IS DISTINCT FROM (old_json->>'role');
  END IF;
  IF new_json ? 'system_permission' THEN
    perm_changed := (new_json->>'system_permission') IS DISTINCT FROM (old_json->>'system_permission');
  END IF;

  IF NOT (role_changed OR perm_changed) THEN
    RETURN NEW;
  END IF;

  -- Self-insert (signup / profile bootstrap) may set initial role fields
  IF TG_OP = 'INSERT' AND NEW.id = actor THEN
    RETURN NEW;
  END IF;

  -- Founder bootstrap: first company attach may promote self to admin
  IF TG_OP = 'UPDATE'
     AND NEW.id = actor
     AND OLD.company_id IS NULL
     AND NEW.company_id IS NOT NULL
     AND (
       new_role IN ('admin', 'company_admin')
       OR new_perm = 'admin'
     )
  THEN
    RETURN NEW;
  END IF;

  IF public.user_system_permission(actor) = 'admin' THEN
    RETURN NEW;
  END IF;

  IF NEW.company_id IS NOT NULL
     AND public.user_is_company_admin(actor, NEW.company_id) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'role column writes require company_admin or admin'
    USING ERRCODE = '42501';
END;
$$;
