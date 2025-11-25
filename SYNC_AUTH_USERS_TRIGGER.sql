-- =====================================================
-- Database Trigger to Sync auth.users with users table
-- =====================================================
-- This trigger automatically creates a users table record
-- whenever a new user is created in auth.users
--
-- Benefits:
-- - Automatic sync (no manual code needed)
-- - Reliable (runs at database level)
-- - Atomic (part of same transaction)
-- - Can't be bypassed
--
-- =====================================================

-- Step 1: Create the trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into users table using data from auth.users
  INSERT INTO public.users (
    id,
    name,
    email,
    phone,
    company_id,
    position,
    role,
    is_pending,
    approved_by,
    approved_at
  )
  VALUES (
    NEW.id,  -- Use the same ID from auth.users
    COALESCE(NEW.raw_user_meta_data->>'name', 'Unknown'),
    COALESCE(NEW.email, COALESCE(NEW.raw_user_meta_data->>'phone', '') || '@buildtrack.local'),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    CASE 
      WHEN NEW.raw_user_meta_data->>'company_id' IS NOT NULL 
      THEN (NEW.raw_user_meta_data->>'company_id')::uuid
      ELSE NULL
    END,
    COALESCE(NEW.raw_user_meta_data->>'position', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'worker'),
    COALESCE((NEW.raw_user_meta_data->>'is_pending')::boolean, false),
    -- Auto-approve if not pending
    CASE 
      WHEN COALESCE((NEW.raw_user_meta_data->>'is_pending')::boolean, false) = false 
      THEN NEW.id
      ELSE NULL
    END,
    CASE 
      WHEN COALESCE((NEW.raw_user_meta_data->>'is_pending')::boolean, false) = false 
      THEN NOW()
      ELSE NULL
    END
  )
  ON CONFLICT (id) DO NOTHING;  -- Prevent duplicate inserts if trigger fires multiple times
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Create the trigger
-- This will fire AFTER a new user is inserted into auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 3: Verify the trigger was created
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- =====================================================
-- Optional: Fix existing out-of-sync users
-- =====================================================
-- Run this AFTER creating the trigger to fix any existing
-- users that are in auth.users but not in users table

-- INSERT INTO public.users (
--   id,
--   name,
--   email,
--   phone,
--   company_id,
--   position,
--   role,
--   is_pending,
--   approved_by,
--   approved_at
-- )
-- SELECT 
--   au.id,
--   COALESCE(au.raw_user_meta_data->>'name', 'Unknown'),
--   COALESCE(au.email, COALESCE(au.raw_user_meta_data->>'phone', '') || '@buildtrack.local'),
--   COALESCE(au.raw_user_meta_data->>'phone', ''),
--   CASE 
--     WHEN au.raw_user_meta_data->>'company_id' IS NOT NULL 
--     THEN (au.raw_user_meta_data->>'company_id')::uuid
--     ELSE NULL
--   END,
--   COALESCE(au.raw_user_meta_data->>'position', ''),
--   COALESCE(au.raw_user_meta_data->>'role', 'worker'),
--   COALESCE((au.raw_user_meta_data->>'is_pending')::boolean, false),
--   CASE 
--     WHEN COALESCE((au.raw_user_meta_data->>'is_pending')::boolean, false) = false 
--     THEN au.id
--     ELSE NULL
--   END,
--   CASE 
--     WHEN COALESCE((au.raw_user_meta_data->>'is_pending')::boolean, false) = false 
--     THEN au.created_at
--     ELSE NULL
--   END
-- FROM auth.users au
-- LEFT JOIN public.users u ON au.id = u.id
-- WHERE u.id IS NULL
-- ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- Check for sync issues
-- =====================================================

-- Find users in auth.users but not in users table
-- SELECT 
--   au.id,
--   au.email,
--   au.raw_user_meta_data->>'name' as name,
--   au.created_at
-- FROM auth.users au
-- LEFT JOIN public.users u ON au.id = u.id
-- WHERE u.id IS NULL;

-- Find users in users table but not in auth.users
-- SELECT 
--   u.id,
--   u.email,
--   u.name,
--   u.created_at
-- FROM public.users u
-- LEFT JOIN auth.users au ON u.id = au.id
-- WHERE au.id IS NULL;


