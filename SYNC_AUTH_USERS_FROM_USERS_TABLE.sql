-- ============================================================================
-- SYNC AUTH.USERS FROM USERS TABLE (Source of Truth)
-- ============================================================================
-- 
-- PURPOSE: Use the public.users table as the definitive source of truth
--          to validate and fix records in auth.users
--
-- SAFETY: This script is READ-HEAVY with explicit update steps
--         Review all reports before running any UPDATE queries
--
-- USAGE:
--   1. Run each section in order
--   2. Review the diagnostic reports
--   3. Uncomment and run UPDATE queries only if needed
--   4. Verify changes after each update
-- ============================================================================

\echo '============================================================================'
\echo 'SYNC AUTH.USERS FROM USERS TABLE - DIAGNOSTIC AND REPAIR SCRIPT'
\echo '============================================================================'
\echo ''

-- ============================================================================
-- SECTION 1: COMPREHENSIVE DIAGNOSTICS
-- ============================================================================

\echo '📊 SECTION 1: COMPREHENSIVE DIAGNOSTICS'
\echo '----------------------------------------'
\echo ''

-- 1.1 OVERALL SYNC STATUS
\echo '1.1 Overall Sync Status:'
SELECT 
  '📈 OVERALL STATS' as report_section,
  COUNT(DISTINCT u.id) as users_table_count,
  COUNT(DISTINCT au.id) as auth_users_count,
  COUNT(DISTINCT CASE WHEN au.id IS NOT NULL THEN u.id END) as synced_count,
  COUNT(DISTINCT CASE WHEN au.id IS NULL THEN u.id END) as missing_from_auth,
  COUNT(DISTINCT CASE WHEN u.id IS NULL THEN au.id END) as orphaned_in_auth,
  ROUND(
    100.0 * COUNT(DISTINCT CASE WHEN au.id IS NOT NULL THEN u.id END) / 
    NULLIF(COUNT(DISTINCT u.id), 0), 
    2
  ) as sync_percentage
FROM public.users u
FULL OUTER JOIN auth.users au ON u.id = au.id;

\echo ''

-- 1.2 IDENTIFY ALL SYNC ISSUES
\echo '1.2 All Sync Issues Found:'
SELECT 
  '🔍 ISSUE DETAILS' as report_section,
  u.id as user_id,
  u.name as users_name,
  u.email as users_email,
  u.phone as users_phone,
  u.role as users_role,
  u.company_id as users_company_id,
  u.is_pending as users_is_pending,
  au.email as auth_email,
  au.phone as auth_phone,
  au.raw_user_meta_data->>'name' as auth_name,
  au.raw_user_meta_data->>'role' as auth_role,
  au.email_confirmed_at IS NOT NULL as auth_email_confirmed,
  CASE 
    WHEN au.id IS NULL THEN '❌ MISSING FROM AUTH.USERS'
    WHEN au.email != u.email THEN '⚠️  EMAIL MISMATCH'
    WHEN COALESCE(au.phone, '') != COALESCE(u.phone, '') THEN '⚠️  PHONE MISMATCH'
    WHEN COALESCE(au.raw_user_meta_data->>'name', '') != COALESCE(u.name, '') THEN '⚠️  NAME MISMATCH'
    WHEN COALESCE(au.raw_user_meta_data->>'role', '') != COALESCE(u.role, '') THEN '⚠️  ROLE MISMATCH'
    WHEN COALESCE(au.raw_user_meta_data->>'company_id', '') != COALESCE(u.company_id::text, '') THEN '⚠️  COMPANY MISMATCH'
    WHEN COALESCE(au.raw_user_meta_data->>'position', '') != COALESCE(u.position, '') THEN '⚠️  POSITION MISMATCH'
    WHEN COALESCE((au.raw_user_meta_data->>'is_pending')::boolean, false) != COALESCE(u.is_pending, false) THEN '⚠️  PENDING STATUS MISMATCH'
    ELSE '✅ OK'
  END as issue_type,
  u.created_at as users_created_at
FROM public.users u
LEFT JOIN auth.users au ON u.id = au.id
WHERE 
  au.id IS NULL
  OR au.email != u.email
  OR COALESCE(au.phone, '') != COALESCE(u.phone, '')
  OR COALESCE(au.raw_user_meta_data->>'name', '') != COALESCE(u.name, '')
  OR COALESCE(au.raw_user_meta_data->>'role', '') != COALESCE(u.role, '')
  OR COALESCE(au.raw_user_meta_data->>'company_id', '') != COALESCE(u.company_id::text, '')
  OR COALESCE(au.raw_user_meta_data->>'position', '') != COALESCE(u.position, '')
  OR COALESCE((au.raw_user_meta_data->>'is_pending')::boolean, false) != COALESCE(u.is_pending, false)
ORDER BY 
  CASE 
    WHEN au.id IS NULL THEN 1
    ELSE 2
  END,
  u.created_at DESC;

\echo ''

-- 1.3 CHECK FOR DUPLICATE PHONES (CRITICAL - CAN BREAK SYNC)
\echo '1.3 Duplicate Phone Numbers (Will Block Sync):'
SELECT 
  '📱 DUPLICATE PHONES' as report_section,
  u.phone,
  COUNT(*) as duplicate_count,
  STRING_AGG(u.id::text, ', ' ORDER BY u.created_at) as user_ids,
  STRING_AGG(u.name, ', ' ORDER BY u.created_at) as names,
  STRING_AGG(u.email, ', ' ORDER BY u.created_at) as emails,
  MIN(u.created_at) as oldest_user_created,
  MAX(u.created_at) as newest_user_created
FROM public.users u
WHERE u.phone IS NOT NULL AND u.phone != ''
GROUP BY u.phone
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC, u.phone;

\echo ''

-- 1.4 CHECK FOR DUPLICATE EMAILS (CRITICAL)
\echo '1.4 Duplicate Emails (Will Block Sync):'
SELECT 
  '📧 DUPLICATE EMAILS' as report_section,
  u.email,
  COUNT(*) as duplicate_count,
  STRING_AGG(u.id::text, ', ' ORDER BY u.created_at) as user_ids,
  STRING_AGG(u.name, ', ' ORDER BY u.created_at) as names,
  MIN(u.created_at) as oldest_user_created,
  MAX(u.created_at) as newest_user_created
FROM public.users u
WHERE u.email IS NOT NULL AND u.email != ''
GROUP BY u.email
HAVING COUNT(*) > 1
ORDER BY COUNT(*) DESC, u.email;

\echo ''

-- 1.5 ORPHANED RECORDS IN AUTH.USERS (Users in auth but not in users table)
\echo '1.5 Orphaned Records in auth.users (Not in users table):'
SELECT 
  '👻 ORPHANED AUTH RECORDS' as report_section,
  au.id,
  au.email,
  au.phone,
  au.raw_user_meta_data->>'name' as name,
  au.raw_user_meta_data->>'role' as role,
  au.created_at,
  au.last_sign_in_at,
  'Consider adding to users table or deleting from auth' as recommendation
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.id
WHERE u.id IS NULL
ORDER BY au.created_at DESC;

\echo ''

-- 1.6 PENDING USERS STATUS
\echo '1.6 Pending Users Status Check:'
SELECT 
  '⏳ PENDING USERS' as report_section,
  u.id,
  u.name,
  u.email,
  u.is_pending as users_is_pending,
  COALESCE((au.raw_user_meta_data->>'is_pending')::boolean, false) as auth_is_pending,
  CASE 
    WHEN u.is_pending = true AND COALESCE((au.raw_user_meta_data->>'is_pending')::boolean, false) = false 
      THEN '⚠️  Auth shows approved but users shows pending'
    WHEN u.is_pending = false AND COALESCE((au.raw_user_meta_data->>'is_pending')::boolean, false) = true 
      THEN '⚠️  Users shows approved but auth shows pending'
    ELSE '✅ Status matches'
  END as status_check,
  u.approved_at,
  u.approved_by
FROM public.users u
LEFT JOIN auth.users au ON u.id = au.id
WHERE u.is_pending = true
   OR COALESCE((au.raw_user_meta_data->>'is_pending')::boolean, false) = true
ORDER BY u.created_at DESC;

\echo ''

-- ============================================================================
-- SECTION 2: FIELD-BY-FIELD COMPARISON
-- ============================================================================

\echo '📋 SECTION 2: FIELD-BY-FIELD COMPARISON'
\echo '----------------------------------------'
\echo ''

-- 2.1 EMAIL MISMATCHES
\echo '2.1 Email Mismatches:'
SELECT 
  '📧 EMAIL MISMATCH' as issue,
  u.id,
  u.name,
  u.email as correct_email_from_users,
  au.email as incorrect_email_in_auth,
  'UPDATE REQUIRED' as action
FROM public.users u
INNER JOIN auth.users au ON u.id = au.id
WHERE au.email != u.email
ORDER BY u.created_at DESC;

\echo ''

-- 2.2 PHONE MISMATCHES
\echo '2.2 Phone Number Mismatches:'
SELECT 
  '📱 PHONE MISMATCH' as issue,
  u.id,
  u.name,
  u.email,
  u.phone as correct_phone_from_users,
  au.phone as incorrect_phone_in_auth,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM auth.users au2 
      WHERE au2.phone = u.phone AND au2.id != u.id
    ) THEN '⚠️  BLOCKED - Phone already exists for another user'
    ELSE '✅ Can update'
  END as update_status
FROM public.users u
INNER JOIN auth.users au ON u.id = au.id
WHERE COALESCE(au.phone, '') != COALESCE(u.phone, '')
ORDER BY u.created_at DESC;

\echo ''

-- 2.3 METADATA MISMATCHES (Name, Role, Company, Position)
\echo '2.3 Metadata Mismatches:'
SELECT 
  '🏷️  METADATA MISMATCH' as issue,
  u.id,
  u.email,
  u.name as correct_name,
  au.raw_user_meta_data->>'name' as auth_name,
  u.role as correct_role,
  au.raw_user_meta_data->>'role' as auth_role,
  u.company_id::text as correct_company_id,
  au.raw_user_meta_data->>'company_id' as auth_company_id,
  u.position as correct_position,
  au.raw_user_meta_data->>'position' as auth_position,
  'METADATA UPDATE REQUIRED' as action
FROM public.users u
INNER JOIN auth.users au ON u.id = au.id
WHERE 
  COALESCE(au.raw_user_meta_data->>'name', '') != COALESCE(u.name, '')
  OR COALESCE(au.raw_user_meta_data->>'role', '') != COALESCE(u.role, '')
  OR COALESCE(au.raw_user_meta_data->>'company_id', '') != COALESCE(u.company_id::text, '')
  OR COALESCE(au.raw_user_meta_data->>'position', '') != COALESCE(u.position, '')
ORDER BY u.created_at DESC;

\echo ''

-- ============================================================================
-- SECTION 3: AUTOMATED FIXES
-- ============================================================================

\echo '🔧 SECTION 3: AUTOMATED FIXES'
\echo '------------------------------'
\echo ''
\echo '⚠️  WARNING: Review diagnostics above before running these updates!'
\echo ''

-- 3.1 FIX: Update auth.users to match users table
\echo '3.1 Preparing to sync auth.users from users table...'
\echo 'NOTE: This query is commented out for safety. Uncomment to run.'
\echo ''

/*
-- UNCOMMENT THIS BLOCK TO RUN THE SYNC
BEGIN;

-- Step 3.1.1: Update email, phone, and all metadata in auth.users
UPDATE auth.users au
SET 
  -- Update email (always from users table)
  email = u.email,
  
  -- Update phone (only if it won't create a duplicate)
  phone = CASE 
    WHEN u.phone IS NOT NULL AND u.phone != '' 
         AND NOT EXISTS (
           SELECT 1 FROM auth.users au2 
           WHERE au2.phone = u.phone 
           AND au2.id != au.id
         )
    THEN u.phone
    ELSE au.phone -- Keep existing phone if update would create duplicate
  END,
  
  -- Update all metadata fields
  raw_user_meta_data = jsonb_build_object(
    'name', COALESCE(u.name, ''),
    'role', COALESCE(u.role, 'worker'),
    'company_id', COALESCE(u.company_id::text, ''),
    'position', COALESCE(u.position, ''),
    'is_pending', COALESCE(u.is_pending, false),
    'approved_by', COALESCE(u.approved_by::text, ''),
    'approved_at', COALESCE(u.approved_at::text, '')
  ),
  
  -- Update modified timestamp
  updated_at = NOW()
  
FROM public.users u
WHERE au.id = u.id
  -- Only update records that have differences
  AND (
    au.email != u.email
    OR COALESCE(au.phone, '') != COALESCE(u.phone, '') 
    OR COALESCE(au.raw_user_meta_data->>'name', '') != COALESCE(u.name, '')
    OR COALESCE(au.raw_user_meta_data->>'role', '') != COALESCE(u.role, '')
    OR COALESCE(au.raw_user_meta_data->>'company_id', '') != COALESCE(u.company_id::text, '')
    OR COALESCE(au.raw_user_meta_data->>'position', '') != COALESCE(u.position, '')
    OR COALESCE((au.raw_user_meta_data->>'is_pending')::boolean, false) != COALESCE(u.is_pending, false)
  );

-- Show what was updated
SELECT 
  '✅ SYNC COMPLETED' as status,
  COUNT(*) as records_updated
FROM auth.users au
INNER JOIN public.users u ON au.id = u.id;

COMMIT;

\echo '✅ Sync completed successfully!'
\echo ''
*/

-- 3.2 FIX: Handle duplicate phones before sync
\echo '3.2 Handle Duplicate Phones (Manual resolution required):'
\echo 'For users with duplicate phones, you must:'
\echo '  1. Decide which user should keep the phone number'
\echo '  2. Set the other users phone to NULL or a different number'
\echo '  3. Then re-run the sync'
\echo ''
\echo 'Example SQL to clear duplicate phone:'
\echo '  UPDATE public.users SET phone = NULL WHERE id = ''<user-id-to-clear>'';'
\echo ''

-- 3.3 FIX: Create missing users records from auth.users
\echo '3.3 Create users table records for orphaned auth.users:'
\echo 'NOTE: This query is commented out for safety. Uncomment to run.'
\echo ''

/*
-- UNCOMMENT THIS BLOCK TO CREATE MISSING USER RECORDS
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
  approved_at,
  created_at
)
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data->>'name', 'Unknown User'),
  COALESCE(au.email, au.phone || '@buildtrack.local'),
  COALESCE(au.phone, ''),
  COALESCE((au.raw_user_meta_data->>'company_id')::uuid, NULL),
  COALESCE(au.raw_user_meta_data->>'position', ''),
  COALESCE(au.raw_user_meta_data->>'role', 'worker'),
  COALESCE((au.raw_user_meta_data->>'is_pending')::boolean, false),
  COALESCE((au.raw_user_meta_data->>'approved_by')::uuid, NULL),
  CASE 
    WHEN COALESCE((au.raw_user_meta_data->>'approved_at')::timestamptz, NULL) IS NOT NULL 
    THEN (au.raw_user_meta_data->>'approved_at')::timestamptz
    WHEN COALESCE((au.raw_user_meta_data->>'is_pending')::boolean, false) = false 
    THEN au.created_at
    ELSE NULL
  END,
  au.created_at
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.id
WHERE u.id IS NULL
ON CONFLICT (id) DO NOTHING;

\echo '✅ Missing users records created!'
\echo ''
*/

-- ============================================================================
-- SECTION 4: POST-UPDATE VERIFICATION
-- ============================================================================

\echo '✔️  SECTION 4: VERIFICATION QUERIES'
\echo '-----------------------------------'
\echo 'Run these AFTER making updates to verify sync'
\echo ''

-- 4.1 VERIFY: Check sync status after updates
\echo '4.1 Verify Sync Status (Run after updates):'
SELECT 
  '✔️  VERIFICATION' as check_type,
  u.id,
  u.name,
  u.email as users_email,
  au.email as auth_email,
  CASE WHEN au.email = u.email THEN '✅' ELSE '❌' END as email_match,
  u.phone as users_phone,
  au.phone as auth_phone,
  CASE WHEN COALESCE(au.phone, '') = COALESCE(u.phone, '') THEN '✅' ELSE '❌' END as phone_match,
  u.name as users_name,
  au.raw_user_meta_data->>'name' as auth_name,
  CASE WHEN (au.raw_user_meta_data->>'name') = u.name THEN '✅' ELSE '❌' END as name_match,
  u.role as users_role,
  au.raw_user_meta_data->>'role' as auth_role,
  CASE WHEN (au.raw_user_meta_data->>'role') = u.role THEN '✅' ELSE '❌' END as role_match,
  CASE 
    WHEN au.email = u.email 
     AND COALESCE(au.phone, '') = COALESCE(u.phone, '')
     AND (au.raw_user_meta_data->>'name') = u.name
     AND (au.raw_user_meta_data->>'role') = u.role
     AND COALESCE(au.raw_user_meta_data->>'company_id', '') = COALESCE(u.company_id::text, '')
    THEN '✅ FULLY SYNCED'
    ELSE '⚠️  STILL OUT OF SYNC'
  END as overall_status
FROM public.users u
INNER JOIN auth.users au ON u.id = au.id
ORDER BY 
  CASE 
    WHEN au.email = u.email 
     AND COALESCE(au.phone, '') = COALESCE(u.phone, '')
     AND (au.raw_user_meta_data->>'name') = u.name
    THEN 2
    ELSE 1
  END,
  u.email;

\echo ''

-- 4.2 VERIFY: Final sync percentage
\echo '4.2 Final Sync Statistics:'
SELECT 
  '📊 FINAL STATS' as report,
  COUNT(DISTINCT u.id) as total_users,
  COUNT(DISTINCT CASE 
    WHEN au.id IS NOT NULL 
     AND au.email = u.email 
     AND COALESCE(au.phone, '') = COALESCE(u.phone, '')
     AND (au.raw_user_meta_data->>'name') = u.name
     AND (au.raw_user_meta_data->>'role') = u.role
    THEN u.id 
  END) as fully_synced,
  COUNT(DISTINCT CASE 
    WHEN au.id IS NULL 
      OR au.email != u.email 
      OR COALESCE(au.phone, '') != COALESCE(u.phone, '')
      OR (au.raw_user_meta_data->>'name') != u.name
      OR (au.raw_user_meta_data->>'role') != u.role
    THEN u.id 
  END) as still_out_of_sync,
  ROUND(
    100.0 * COUNT(DISTINCT CASE 
      WHEN au.id IS NOT NULL 
       AND au.email = u.email 
       AND COALESCE(au.phone, '') = COALESCE(u.phone, '')
       AND (au.raw_user_meta_data->>'name') = u.name
       AND (au.raw_user_meta_data->>'role') = u.role
      THEN u.id 
    END) / NULLIF(COUNT(DISTINCT u.id), 0),
    2
  ) || '%' as sync_percentage
FROM public.users u
LEFT JOIN auth.users au ON u.id = au.id;

\echo ''
\echo '============================================================================'
\echo 'SCRIPT COMPLETED'
\echo '============================================================================'
\echo ''
\echo '📝 NEXT STEPS:'
\echo '  1. Review all diagnostic reports above'
\echo '  2. Resolve any duplicate phones/emails manually'
\echo '  3. Uncomment Section 3.1 to run the sync'
\echo '  4. Run Section 4 verification queries'
\echo '  5. Address any remaining issues'
\echo ''
\echo '⚠️  IMPORTANT NOTES:'
\echo '  • Auth.users records cannot be created via SQL (use Supabase Admin API)'
\echo '  • Duplicate phones will block sync - resolve manually first'
\echo '  • Always backup before running updates in production'
\echo '  • Test in development environment first'
\echo ''
\echo '============================================================================'


