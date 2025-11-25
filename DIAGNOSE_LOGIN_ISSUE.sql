-- Diagnostic Query for Login Issues
-- Run this for a specific user to identify login problems
-- 
-- INSTRUCTIONS:
-- Replace 'admin@buildtrack.com' with the user's email in ALL queries below
-- Or search and replace: Find 'admin@buildtrack.com' and replace with your email

-- =====================================================
-- STEP 1: SUMMARY CHECKS (Run this first)
-- =====================================================

-- 1. CHECK AUTH.USERS
SELECT 
  '1. AUTH.USERS CHECK' as check_type,
  CASE 
    WHEN COUNT(*) = 0 THEN 'USER NOT FOUND'
    WHEN COUNT(*) > 1 THEN 'MULTIPLE USERS FOUND'
    ELSE 'USER EXISTS'
  END as status,
  COUNT(*) as count
FROM auth.users
WHERE email = 'admin@buildtrack.com'

UNION ALL

-- 2. CHECK USERS TABLE
SELECT 
  '2. USERS TABLE CHECK' as check_type,
  CASE 
    WHEN COUNT(*) = 0 THEN 'USER NOT FOUND'
    WHEN COUNT(*) > 1 THEN 'MULTIPLE USERS FOUND'
    ELSE 'USER EXISTS'
  END as status,
  COUNT(*) as count
FROM public.users
WHERE email = 'admin@buildtrack.com'

UNION ALL

-- 3. CHECK ID MATCH
SELECT 
  '3. ID MATCH CHECK' as check_type,
  CASE 
    WHEN COUNT(*) = 0 THEN 'NO MATCH (SYNC ISSUE)'
    WHEN COUNT(*) = 1 AND COUNT(DISTINCT au.id) = 1 AND COUNT(DISTINCT u.id) = 1 AND MAX(au.id) = MAX(u.id) THEN 'IDs MATCH'
    ELSE 'ID MISMATCH'
  END as status,
  COUNT(*) as count
FROM auth.users au
INNER JOIN public.users u ON au.email = u.email
WHERE au.email = 'admin@buildtrack.com'

UNION ALL

-- 4. CHECK EMAIL MATCH
SELECT 
  '4. EMAIL MATCH CHECK' as check_type,
  CASE 
    WHEN COUNT(*) = 0 THEN 'NO MATCH'
    WHEN COUNT(*) = 1 AND MAX(au.email) = MAX(u.email) THEN 'EMAILS MATCH'
    ELSE 'EMAIL MISMATCH'
  END as status,
  COUNT(*) as count
FROM auth.users au
INNER JOIN public.users u ON au.id = u.id
WHERE au.email = 'admin@buildtrack.com'

UNION ALL

-- 5. CHECK PENDING STATUS
SELECT 
  '5. PENDING STATUS CHECK' as check_type,
  CASE 
    WHEN COUNT(*) = 0 THEN 'USER NOT FOUND'
    WHEN COUNT(*) > 0 AND BOOL_OR(u.is_pending = true) THEN 'USER PENDING APPROVAL'
    ELSE 'USER APPROVED'
  END as status,
  COUNT(*) as count
FROM public.users u
WHERE u.email = 'admin@buildtrack.com'

UNION ALL

-- 6. CHECK EMAIL CONFIRMED
SELECT 
  '6. EMAIL CONFIRMED CHECK' as check_type,
  CASE 
    WHEN COUNT(*) = 0 THEN 'USER NOT FOUND'
    WHEN COUNT(*) > 0 AND BOOL_OR(au.email_confirmed_at IS NULL) THEN 'EMAIL NOT CONFIRMED'
    ELSE 'EMAIL CONFIRMED'
  END as status,
  COUNT(*) as count
FROM auth.users au
WHERE au.email = 'admin@buildtrack.com';

-- =====================================================
-- STEP 2: DETAILED USER INFORMATION
-- =====================================================

-- Auth.users details
SELECT 
  'AUTH.USERS DETAILS' as source,
  au.id,
  au.email,
  au.phone,
  au.email_confirmed_at IS NOT NULL as email_confirmed,
  au.created_at,
  au.last_sign_in_at,
  au.raw_user_meta_data->>'name' as metadata_name,
  au.raw_user_meta_data->>'role' as metadata_role
FROM auth.users au
WHERE au.email = 'admin@buildtrack.com';

-- Users table details
SELECT 
  'USERS TABLE DETAILS' as source,
  u.id,
  u.email,
  u.phone,
  u.name,
  u.role,
  u.company_id,
  u.is_pending,
  u.approved_by,
  u.approved_at,
  u.created_at
FROM public.users u
WHERE u.email = 'admin@buildtrack.com';

-- =====================================================
-- STEP 3: SYNC STATUS
-- =====================================================
SELECT 
  CASE 
    WHEN au.id IS NULL THEN 'IN USERS TABLE ONLY (ORPHANED)'
    WHEN u.id IS NULL THEN 'IN AUTH.USERS ONLY (MISSING FROM USERS)'
    WHEN au.id = u.id THEN 'SYNCED'
    ELSE 'ID MISMATCH'
  END as sync_status,
  au.id as auth_id,
  u.id as users_id,
  au.email as auth_email,
  u.email as users_email,
  au.phone as auth_phone,
  u.phone as users_phone
FROM auth.users au
FULL OUTER JOIN public.users u ON au.id = u.id
WHERE au.email = 'admin@buildtrack.com' OR u.email = 'admin@buildtrack.com';

-- =====================================================
-- STEP 4: PHONE LOGIN CHECK
-- =====================================================
SELECT 
  'PHONE LOGIN CHECK' as check_type,
  u.phone,
  u.email,
  CASE 
    WHEN u.phone IS NULL OR u.phone = '' THEN 'NO PHONE NUMBER'
    WHEN u.email IS NULL OR u.email = '' THEN 'NO EMAIL (CANNOT LOGIN WITH PHONE)'
    ELSE 'PHONE LOGIN POSSIBLE'
  END as phone_login_status
FROM public.users u
WHERE u.email = 'admin@buildtrack.com';
