-- =====================================================
-- Summary Comparison: auth.users vs users table
-- =====================================================
-- This script provides comprehensive comparison between
-- auth.users (Supabase Auth) and users (application data)
--
-- Run this in Supabase SQL Editor to see sync status
-- =====================================================

-- =====================================================
-- 1. COMPLETE COMPARISON TABLE
-- =====================================================
-- Shows all users from both tables side-by-side
-- with sync status indicators

SELECT 
  -- Identification
  COALESCE(au.id, u.id) as user_id,
  
  -- Sync Status
  CASE 
    WHEN au.id IS NOT NULL AND u.id IS NOT NULL THEN '✅ SYNCED'
    WHEN au.id IS NOT NULL AND u.id IS NULL THEN '⚠️ AUTH ONLY'
    WHEN au.id IS NULL AND u.id IS NOT NULL THEN '❌ ORPHANED'
    ELSE 'UNKNOWN'
  END as sync_status,
  
  -- Auth.users data
  au.email as auth_email,
  au.phone as auth_phone,
  au.email_confirmed_at IS NOT NULL as auth_email_confirmed,
  au.created_at as auth_created_at,
  au.last_sign_in_at as auth_last_sign_in,
  au.raw_user_meta_data->>'name' as auth_metadata_name,
  au.raw_user_meta_data->>'role' as auth_metadata_role,
  au.raw_user_meta_data->>'company_id' as auth_metadata_company_id,
  
  -- Users table data
  u.email as users_email,
  u.phone as users_phone,
  u.name as users_name,
  u.role as users_role,
  u.company_id as users_company_id,
  u.position as users_position,
  u.is_pending as users_is_pending,
  u.approved_by as users_approved_by,
  u.approved_at as users_approved_at,
  u.created_at as users_created_at,
  
  -- Comparison flags
  CASE WHEN au.email != u.email THEN '⚠️' ELSE '✅' END as email_match,
  CASE WHEN au.phone != u.phone THEN '⚠️' ELSE '✅' END as phone_match,
  CASE WHEN (au.raw_user_meta_data->>'name') != u.name THEN '⚠️' ELSE '✅' END as name_match,
  CASE WHEN (au.raw_user_meta_data->>'role') != u.role THEN '⚠️' ELSE '✅' END as role_match

FROM auth.users au
FULL OUTER JOIN public.users u ON au.id = u.id

ORDER BY 
  CASE 
    WHEN au.id IS NOT NULL AND u.id IS NOT NULL THEN 1
    WHEN au.id IS NOT NULL AND u.id IS NULL THEN 2
    WHEN au.id IS NULL AND u.id IS NOT NULL THEN 3
    ELSE 4
  END,
  COALESCE(au.created_at, u.created_at) DESC;

-- =====================================================
-- 2. SUMMARY STATISTICS
-- =====================================================
-- Quick overview of sync status

SELECT 
  'Total in auth.users' as metric,
  COUNT(*)::text as count
FROM auth.users

UNION ALL

SELECT 
  'Total in users table' as metric,
  COUNT(*)::text as count
FROM public.users

UNION ALL

SELECT 
  'Synced (in both)' as metric,
  COUNT(*)::text as count
FROM auth.users au
INNER JOIN public.users u ON au.id = u.id

UNION ALL

SELECT 
  'Auth only (missing from users)' as metric,
  COUNT(*)::text as count
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.id
WHERE u.id IS NULL

UNION ALL

SELECT 
  'Orphaned (missing from auth)' as metric,
  COUNT(*)::text as count
FROM public.users u
LEFT JOIN auth.users au ON u.id = au.id
WHERE au.id IS NULL

UNION ALL

SELECT 
  'Email mismatches' as metric,
  COUNT(*)::text as count
FROM auth.users au
INNER JOIN public.users u ON au.id = u.id
WHERE au.email != u.email OR (au.email IS NULL AND u.email IS NOT NULL) OR (au.email IS NOT NULL AND u.email IS NULL)

UNION ALL

SELECT 
  'Phone mismatches' as metric,
  COUNT(*)::text as count
FROM auth.users au
INNER JOIN public.users u ON au.id = u.id
WHERE COALESCE(au.phone, '') != COALESCE(u.phone, '');

-- =====================================================
-- 3. USERS IN auth.users BUT NOT IN users TABLE
-- =====================================================
-- These need to be synced to users table

SELECT 
  au.id,
  au.email,
  au.phone,
  au.raw_user_meta_data->>'name' as name,
  au.raw_user_meta_data->>'role' as role,
  au.raw_user_meta_data->>'company_id' as company_id,
  au.email_confirmed_at IS NOT NULL as email_confirmed,
  au.created_at,
  au.last_sign_in_at,
  '⚠️ Missing from users table' as issue
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.id
WHERE u.id IS NULL
ORDER BY au.created_at DESC;

-- =====================================================
-- 4. USERS IN users TABLE BUT NOT IN auth.users
-- =====================================================
-- These are orphaned records (shouldn't exist)

SELECT 
  u.id,
  u.email,
  u.phone,
  u.name,
  u.role,
  u.company_id,
  u.is_pending,
  u.created_at,
  '❌ Orphaned - no auth.users record' as issue
FROM public.users u
LEFT JOIN auth.users au ON u.id = au.id
WHERE au.id IS NULL
ORDER BY u.created_at DESC;

-- =====================================================
-- 5. SYNCED USERS WITH DATA MISMATCHES
-- =====================================================
-- Users in both tables but with different data

SELECT 
  au.id,
  au.email as auth_email,
  u.email as users_email,
  au.phone as auth_phone,
  u.phone as users_phone,
  au.raw_user_meta_data->>'name' as auth_name,
  u.name as users_name,
  au.raw_user_meta_data->>'role' as auth_role,
  u.role as users_role,
  CASE 
    WHEN au.email != u.email THEN 'Email mismatch'
    WHEN COALESCE(au.phone, '') != COALESCE(u.phone, '') THEN 'Phone mismatch'
    WHEN (au.raw_user_meta_data->>'name') != u.name THEN 'Name mismatch'
    WHEN (au.raw_user_meta_data->>'role') != u.role THEN 'Role mismatch'
    ELSE 'Other mismatch'
  END as mismatch_type
FROM auth.users au
INNER JOIN public.users u ON au.id = u.id
WHERE 
  au.email != u.email 
  OR COALESCE(au.phone, '') != COALESCE(u.phone, '')
  OR (au.raw_user_meta_data->>'name') != u.name
  OR (au.raw_user_meta_data->>'role') != u.role
ORDER BY au.created_at DESC;

-- =====================================================
-- 6. DETAILED USER LIST (ALL FIELDS)
-- =====================================================
-- Comprehensive view of all users with all fields

SELECT 
  -- IDs
  COALESCE(au.id, u.id) as user_id,
  
  -- Sync Status
  CASE 
    WHEN au.id IS NOT NULL AND u.id IS NOT NULL THEN 'SYNCED'
    WHEN au.id IS NOT NULL AND u.id IS NULL THEN 'AUTH_ONLY'
    WHEN au.id IS NULL AND u.id IS NOT NULL THEN 'ORPHANED'
  END as status,
  
  -- Contact Info
  COALESCE(u.email, au.email) as email,
  COALESCE(u.phone, au.phone) as phone,
  
  -- User Info
  u.name,
  u.position,
  COALESCE(u.role, au.raw_user_meta_data->>'role', 'worker') as role,
  
  -- Company
  u.company_id,
  c.name as company_name,
  
  -- Approval Status
  COALESCE(u.is_pending, false) as is_pending,
  u.approved_by,
  u.approved_at,
  
  -- Auth Status
  au.email_confirmed_at IS NOT NULL as email_confirmed,
  au.created_at as auth_created,
  au.last_sign_in_at as last_sign_in,
  u.created_at as user_created,
  
  -- Metadata
  au.raw_user_meta_data as auth_metadata

FROM auth.users au
FULL OUTER JOIN public.users u ON au.id = u.id
LEFT JOIN public.companies c ON u.company_id = c.id

ORDER BY 
  CASE 
    WHEN au.id IS NOT NULL AND u.id IS NOT NULL THEN 1
    WHEN au.id IS NOT NULL AND u.id IS NULL THEN 2
    WHEN au.id IS NULL AND u.id IS NOT NULL THEN 3
  END,
  COALESCE(au.created_at, u.created_at) DESC;

-- =====================================================
-- 7. QUICK SYNC CHECK FOR SPECIFIC USER
-- =====================================================
-- Replace 'admin@buildtrack.com' with any email

-- SELECT 
--   'auth.users' as source,
--   au.id,
--   au.email,
--   au.phone,
--   au.raw_user_meta_data->>'name' as name,
--   au.created_at
-- FROM auth.users au
-- WHERE au.email = 'admin@buildtrack.com'
-- 
-- UNION ALL
-- 
-- SELECT 
--   'users table' as source,
--   u.id,
--   u.email,
--   u.phone,
--   u.name,
--   u.created_at
-- FROM public.users u
-- WHERE u.email = 'admin@buildtrack.com';


