-- Fix auth.users Records Using users Table as Source
-- This script uses the users table as the definitive guide to fix/update records in auth.users

-- STEP 1: IDENTIFY ISSUES - See what needs to be fixed
SELECT 
  'ISSUES FOUND' as section,
  u.id,
  u.email as users_email,
  au.email as auth_email,
  u.phone as users_phone,
  au.phone as auth_phone,
  u.name as users_name,
  au.raw_user_meta_data->>'name' as auth_metadata_name,
  CASE 
    WHEN au.id IS NULL THEN 'MISSING FROM AUTH.USERS'
    WHEN au.email != u.email THEN 'EMAIL MISMATCH'
    WHEN COALESCE(au.phone, '') != COALESCE(u.phone, '') THEN 'PHONE MISMATCH'
    WHEN (au.raw_user_meta_data->>'name') != u.name THEN 'NAME MISMATCH'
    WHEN (au.raw_user_meta_data->>'role') != u.role THEN 'ROLE MISMATCH'
    ELSE 'OK'
  END as issue_type
FROM public.users u
LEFT JOIN auth.users au ON u.id = au.id
WHERE 
  au.id IS NULL
  OR au.email != u.email
  OR COALESCE(au.phone, '') != COALESCE(u.phone, '')
  OR (au.raw_user_meta_data->>'name') != u.name
  OR (au.raw_user_meta_data->>'role') != u.role
ORDER BY 
  CASE 
    WHEN au.id IS NULL THEN 1
    ELSE 2
  END,
  u.email;

-- STEP 1.5: CHECK FOR DUPLICATE PHONE NUMBERS
-- Run this BEFORE Step 2 to identify duplicate phone numbers
SELECT 
  'DUPLICATE PHONE NUMBERS' as section,
  u.phone,
  COUNT(*) as duplicate_count,
  STRING_AGG(u.id::text, ', ') as user_ids,
  STRING_AGG(u.email, ', ') as emails
FROM public.users u
WHERE u.phone IS NOT NULL AND u.phone != ''
GROUP BY u.phone
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC;

-- STEP 2: UPDATE ALL FIELDS IN AUTH.USERS TO MATCH USERS TABLE
-- NOTE: This will skip phone updates if phone already exists for another user
UPDATE auth.users au
SET 
  email = COALESCE(u.email, au.email),
  phone = CASE 
    -- Only update phone if it doesn't already exist for another user in auth.users
    WHEN u.phone IS NOT NULL AND u.phone != '' 
         AND NOT EXISTS (
           SELECT 1 FROM auth.users au2 
           WHERE au2.phone = u.phone 
           AND au2.id != au.id
         )
    THEN u.phone
    ELSE au.phone
  END,
  raw_user_meta_data = COALESCE(
    jsonb_build_object(
      'name', u.name,
      'role', u.role,
      'company_id', u.company_id::text,
      'position', u.position,
      'is_pending', u.is_pending,
      'approved_by', u.approved_by::text,
      'approved_at', u.approved_at
    ),
    au.raw_user_meta_data
  )
FROM public.users u
WHERE au.id = u.id
  AND (
    au.email != COALESCE(u.email, au.email)
    OR (COALESCE(au.phone, '') != COALESCE(u.phone, '') 
        AND u.phone IS NOT NULL 
        AND u.phone != ''
        AND NOT EXISTS (
          SELECT 1 FROM auth.users au2 
          WHERE au2.phone = u.phone 
          AND au2.id != au.id
        ))
    OR (au.raw_user_meta_data->>'name') != u.name
    OR (au.raw_user_meta_data->>'role') != u.role
    OR (au.raw_user_meta_data->>'company_id') != u.company_id::text
    OR (au.raw_user_meta_data->>'position') != u.position
    OR COALESCE((au.raw_user_meta_data->>'is_pending')::boolean, false) != u.is_pending
  );

-- STEP 3: VERIFY FIXES - Check if fixes were applied successfully
SELECT 
  'VERIFICATION' as section,
  u.id,
  u.email as users_email,
  au.email as auth_email,
  CASE WHEN au.email = u.email THEN 'MATCH' ELSE 'MISMATCH' END as email_match,
  u.phone as users_phone,
  au.phone as auth_phone,
  CASE WHEN COALESCE(au.phone, '') = COALESCE(u.phone, '') THEN 'MATCH' ELSE 'MISMATCH' END as phone_match,
  u.name as users_name,
  au.raw_user_meta_data->>'name' as auth_name,
  CASE WHEN (au.raw_user_meta_data->>'name') = u.name THEN 'MATCH' ELSE 'MISMATCH' END as name_match
FROM public.users u
INNER JOIN auth.users au ON u.id = au.id
ORDER BY u.email;

-- STEP 4: FIND USERS MISSING FROM AUTH.USERS
-- NOTE: Cannot create auth.users records via SQL - must use Supabase Admin API
SELECT 
  'MISSING FROM AUTH.USERS' as section,
  u.id,
  u.email,
  u.phone,
  u.name,
  u.role,
  u.company_id,
  'Cannot create auth.users via SQL - use Admin API' as action_required
FROM public.users u
LEFT JOIN auth.users au ON u.id = au.id
WHERE au.id IS NULL
ORDER BY u.created_at DESC;

-- STEP 5: SUMMARY REPORT
SELECT 
  'SUMMARY' as report_type,
  COUNT(DISTINCT u.id) as total_users_in_users_table,
  COUNT(DISTINCT au.id) as total_users_in_auth_users,
  COUNT(DISTINCT CASE WHEN au.id IS NOT NULL THEN u.id END) as synced_users,
  COUNT(DISTINCT CASE WHEN au.id IS NULL THEN u.id END) as missing_from_auth,
  COUNT(DISTINCT CASE WHEN au.id IS NOT NULL AND au.email != u.email THEN u.id END) as email_mismatches,
  COUNT(DISTINCT CASE WHEN au.id IS NOT NULL AND COALESCE(au.phone, '') != COALESCE(u.phone, '') THEN u.id END) as phone_mismatches
FROM public.users u
FULL OUTER JOIN auth.users au ON u.id = au.id;
