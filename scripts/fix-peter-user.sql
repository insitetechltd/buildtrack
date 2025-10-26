-- Fix Peter user email from dennis@buildtrack.com to peter@buildtrack.com
-- Run this in Supabase SQL Editor

BEGIN;

-- Step 1: Get the auth user ID for dennis@buildtrack.com
DO $$
DECLARE
  auth_user_id UUID;
  db_user_id UUID;
BEGIN
  -- Find the auth user
  SELECT id INTO auth_user_id
  FROM auth.users
  WHERE email = 'dennis@buildtrack.com';
  
  IF auth_user_id IS NULL THEN
    RAISE NOTICE 'No auth user found with email dennis@buildtrack.com';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Found auth user ID: %', auth_user_id;
  
  -- Find the database user
  SELECT id INTO db_user_id
  FROM users
  WHERE email = 'dennis@buildtrack.com';
  
  IF db_user_id IS NULL THEN
    RAISE NOTICE 'No database user found with email dennis@buildtrack.com';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Found database user ID: %', db_user_id;
  
  -- Step 2: Update the email in auth.users (if possible via SQL)
  -- Note: Supabase auth.users table might be read-only via SQL
  -- You may need to do this via Supabase Admin API
  UPDATE auth.users
  SET email = 'peter@buildtrack.com',
      raw_user_meta_data = jsonb_set(
        COALESCE(raw_user_meta_data, '{}'::jsonb),
        '{email}',
        '"peter@buildtrack.com"'
      )
  WHERE id = auth_user_id;
  
  RAISE NOTICE 'Updated auth.users email to peter@buildtrack.com';
  
  -- Step 3: Update the email in users table
  UPDATE users
  SET email = 'peter@buildtrack.com'
  WHERE id = db_user_id;
  
  RAISE NOTICE 'Updated users table email to peter@buildtrack.com';
  
  -- Step 4: Ensure name is 'Peter' (not 'Dennis')
  UPDATE users
  SET name = 'Peter'
  WHERE id = db_user_id AND name != 'Peter';
  
  RAISE NOTICE 'Ensured name is Peter';
  
END $$;

COMMIT;

-- Verify the changes
SELECT 'auth.users' as table_name, email, raw_user_meta_data->>'name' as name
FROM auth.users
WHERE email = 'peter@buildtrack.com';

SELECT 'users' as table_name, email, name, role, position
FROM users
WHERE email = 'peter@buildtrack.com';

-- Also check if dennis@buildtrack.com still exists
SELECT 'OLD EMAIL CHECK' as check_type, email, name
FROM users
WHERE email = 'dennis@buildtrack.com';

