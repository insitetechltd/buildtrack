-- Fix Duplicate Phone Numbers
-- This script helps identify and fix duplicate phone numbers that prevent auth.users updates

-- STEP 1: FIND DUPLICATE PHONE NUMBERS IN USERS TABLE
SELECT 
  'DUPLICATE PHONES IN USERS TABLE' as section,
  u.phone,
  COUNT(*) as duplicate_count,
  STRING_AGG(u.id::text, ', ') as user_ids,
  STRING_AGG(u.email, ', ') as emails,
  STRING_AGG(u.name, ', ') as names
FROM public.users u
WHERE u.phone IS NOT NULL AND u.phone != ''
GROUP BY u.phone
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;

-- STEP 2: FIND DUPLICATE PHONE NUMBERS IN AUTH.USERS
SELECT 
  'DUPLICATE PHONES IN AUTH.USERS' as section,
  au.phone,
  COUNT(*) as duplicate_count,
  STRING_AGG(au.id::text, ', ') as user_ids,
  STRING_AGG(au.email, ', ') as emails
FROM auth.users au
WHERE au.phone IS NOT NULL AND au.phone != ''
GROUP BY au.phone
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;

-- STEP 3: FIND PHONE CONFLICTS BETWEEN TABLES
-- Shows phones that exist in users table but conflict with auth.users
SELECT 
  'PHONE CONFLICTS' as section,
  u.phone,
  u.id as users_id,
  u.email as users_email,
  au.id as auth_id,
  au.email as auth_email,
  CASE 
    WHEN u.id = au.id THEN 'SAME USER - OK'
    ELSE 'DIFFERENT USERS - CONFLICT'
  END as conflict_type
FROM public.users u
INNER JOIN auth.users au ON u.phone = au.phone
WHERE u.phone IS NOT NULL 
  AND u.phone != ''
  AND u.id != au.id;

-- STEP 4: FIX DUPLICATE PHONES IN USERS TABLE
-- This will set phone to NULL for duplicate entries (keeping the first one)
-- WARNING: Review the results of Step 1 before running this

-- UPDATE public.users u
-- SET phone = NULL
-- WHERE u.id IN (
--   SELECT u2.id
--   FROM public.users u2
--   WHERE u2.phone IS NOT NULL 
--     AND u2.phone != ''
--     AND u2.phone = u.phone
--     AND u2.id NOT IN (
--       SELECT MIN(u3.id)
--       FROM public.users u3
--       WHERE u3.phone = u2.phone
--       GROUP BY u3.phone
--     )
-- );

-- STEP 5: VERIFY NO DUPLICATES REMAIN
SELECT 
  'VERIFICATION - DUPLICATES REMAINING' as section,
  COUNT(*) as duplicate_count
FROM (
  SELECT u.phone
  FROM public.users u
  WHERE u.phone IS NOT NULL AND u.phone != ''
  GROUP BY u.phone
  HAVING COUNT(*) > 1
) duplicates;


