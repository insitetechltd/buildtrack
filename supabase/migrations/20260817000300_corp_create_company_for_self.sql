-- Corp RC: authenticated founder bootstraps their own company after signUp.
-- Fixes Register-era chicken-egg (company INSERT as anon blocked by 02a).
-- Dual-path: live tenants may use `role`; greenfield uses `system_permission`.
--
-- LIVE APPLY: Human Gate (schema + auth). Do not apply until GO.
-- Idempotent.

CREATE OR REPLACE FUNCTION public.create_company_for_self(
  company_name text,
  company_type text DEFAULT 'general_contractor'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  existing_company_id uuid;
  new_company_id uuid;
  has_role boolean;
  has_system_permission boolean;
  safe_type text;
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

  IF has_role AND has_system_permission THEN
    EXECUTE $q$
      UPDATE public.users
      SET
        company_id = $1,
        role = 'admin',
        system_permission = 'admin',
        is_pending = false,
        updated_at = now()
      WHERE id = $2
    $q$ USING new_company_id, uid;
  ELSIF has_role THEN
    EXECUTE $q$
      UPDATE public.users
      SET
        company_id = $1,
        role = 'admin',
        is_pending = false,
        updated_at = now()
      WHERE id = $2
    $q$ USING new_company_id, uid;
  ELSIF has_system_permission THEN
    EXECUTE $q$
      UPDATE public.users
      SET
        company_id = $1,
        system_permission = 'admin',
        is_pending = false,
        updated_at = now()
      WHERE id = $2
    $q$ USING new_company_id, uid;
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
