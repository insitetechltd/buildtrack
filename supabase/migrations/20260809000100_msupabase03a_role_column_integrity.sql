-- M-SUPABASE-03a Phase A — role column integrity CHECK + normalize + role-write guard
-- ROLLOUT: artefacts only. NO LIVE PRODUCTION APPLY without explicit written Human GO:
--   "you have GO for M-SUPABASE-03a live apply"
-- Parity / sandbox apply is allowed for Schema Review proof.
--
-- Target vocabulary (F-004 / ROADMAP 13.3):
--   public.users.role ∈ (worker, member, foreman, supervisor, company_admin, admin)
--   when column exists (live tenant uses `role`; greenfield uses `system_permission`)
--   public.users.system_permission ∈ (admin, manager, member) when column exists
--   user_project_assignments.project_role already constrained in greenfield;
--     legacy category / assignment_category get matching CHECKs if present.
--
-- Idempotent: probes information_schema; ADD CONSTRAINT only when missing;
--   backfill only rewrites known stray aliases.

-- ---------------------------------------------------------------------------
-- 1) Normalize stray public.users.role values (when column exists)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'role'
  ) THEN
    UPDATE public.users
    SET role = CASE lower(btrim(role))
      WHEN 'worker' THEN 'worker'
      WHEN 'member' THEN 'member'
      WHEN 'foreman' THEN 'foreman'
      WHEN 'supervisor' THEN 'supervisor'
      WHEN 'company_admin' THEN 'company_admin'
      WHEN 'admin' THEN 'admin'
      WHEN 'manager' THEN 'supervisor' -- app SystemPermission → DB CHECK vocabulary
      ELSE 'worker'
    END
    WHERE role IS NULL
       OR btrim(role) = ''
       OR lower(btrim(role)) NOT IN (
         'worker', 'member', 'foreman', 'supervisor', 'company_admin', 'admin'
       );
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- 2) CHECK on public.users.role (when column exists)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'role'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_role_allowed_values'
      AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_role_allowed_values
      CHECK (
        role IS NULL
        OR role IN (
          'worker',
          'member',
          'foreman',
          'supervisor',
          'company_admin',
          'admin'
        )
      );
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- 3) Ensure system_permission CHECK (greenfield / dual-column tenants)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'system_permission'
  ) THEN
    UPDATE public.users
    SET system_permission = CASE lower(btrim(system_permission))
      WHEN 'admin' THEN 'admin'
      WHEN 'manager' THEN 'manager'
      WHEN 'member' THEN 'member'
      WHEN 'worker' THEN 'member'
      WHEN 'company_admin' THEN 'admin'
      WHEN 'supervisor' THEN 'manager'
      WHEN 'foreman' THEN 'manager'
      ELSE 'member'
    END
    WHERE system_permission IS NULL
       OR btrim(system_permission) = ''
       OR lower(btrim(system_permission)) NOT IN ('admin', 'manager', 'member');

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'users_system_permission_allowed_values'
        AND conrelid = 'public.users'::regclass
    ) THEN
      ALTER TABLE public.users
        ADD CONSTRAINT users_system_permission_allowed_values
        CHECK (system_permission IN ('admin', 'manager', 'member'));
    END IF;
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- 4) user_project_assignments legacy category / assignment_category CHECKs
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  col_name text;
BEGIN
  FOREACH col_name IN ARRAY ARRAY['category', 'assignment_category']
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'user_project_assignments'
        AND column_name = col_name
    ) THEN
      EXECUTE format(
        $sql$
          UPDATE public.user_project_assignments
          SET %1$I = CASE lower(btrim(%1$I))
            WHEN 'lead_project_manager' THEN 'lead_project_manager'
            WHEN 'contractor' THEN 'contractor'
            WHEN 'subcontractor' THEN 'subcontractor'
            WHEN 'inspector' THEN 'inspector'
            WHEN 'architect' THEN 'architect'
            WHEN 'engineer' THEN 'engineer'
            WHEN 'worker' THEN 'worker'
            WHEN 'foreman' THEN 'foreman'
            ELSE 'worker'
          END
          WHERE %1$I IS NULL
             OR btrim(%1$I) = ''
             OR lower(btrim(%1$I)) NOT IN (
               'lead_project_manager','contractor','subcontractor','inspector',
               'architect','engineer','worker','foreman'
             )
        $sql$,
        col_name
      );

      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = format('upa_%s_allowed_values', col_name)
          AND conrelid = 'public.user_project_assignments'::regclass
      ) THEN
        EXECUTE format(
          $sql$
            ALTER TABLE public.user_project_assignments
              ADD CONSTRAINT %I
              CHECK (
                %I IS NULL
                OR %I IN (
                  'lead_project_manager','contractor','subcontractor','inspector',
                  'architect','engineer','worker','foreman'
                )
              )
          $sql$,
          format('upa_%s_allowed_values', col_name),
          col_name,
          col_name
        );
      END IF;
    END IF;
  END LOOP;
END
$$;

-- ---------------------------------------------------------------------------
-- 5) Trigger: non–company-admin cannot change role / system_permission
-- ---------------------------------------------------------------------------
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

DROP TRIGGER IF EXISTS users_guard_role_column_writes ON public.users;
CREATE TRIGGER users_guard_role_column_writes
  BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_users_role_column_writes();

-- Close gate (parity): INSERT/UPDATE with invalid role string → check_violation;
-- authenticated non-admin UPDATE of role → 42501.
