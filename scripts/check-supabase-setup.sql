-- ============================================
-- Complete Supabase Setup Verification
-- ============================================
-- This script checks your entire Supabase configuration
-- for the photo upload system
-- 
-- Run this in Supabase SQL Editor to see current state

-- ============================================
-- PART 1: STORAGE BUCKETS
-- ============================================

\echo '=========================================='
\echo 'PART 1: STORAGE BUCKETS'
\echo '=========================================='

-- Check all storage buckets
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at
FROM storage.buckets
ORDER BY name;

-- Expected:
-- name: buildtrack-files
-- public: true
-- file_size_limit: 52428800 (50MB)

-- ============================================
-- PART 2: STORAGE RLS POLICIES
-- ============================================

\echo ''
\echo '=========================================='
\echo 'PART 2: STORAGE.OBJECTS RLS POLICIES'
\echo '=========================================='

-- Check if RLS is enabled on storage.objects
SELECT 
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'storage' 
  AND tablename = 'objects';

-- List all RLS policies on storage.objects
SELECT 
  policyname,
  cmd AS operation,
  roles,
  qual AS using_clause,
  with_check AS with_check_clause
FROM pg_policies
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
ORDER BY cmd, policyname;

-- Expected: Should see policies allowing INSERT and SELECT for authenticated users

-- ============================================
-- PART 3: DATABASE TABLES
-- ============================================

\echo ''
\echo '=========================================='
\echo 'PART 3: DATABASE TABLES'
\echo '=========================================='

-- Check if file_attachments exists
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'file_attachments';

-- Expected: 0 rows (table should be dropped)

-- Check tasks table has attachments column
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'tasks'
  AND column_name = 'attachments';

-- Expected: attachments | ARRAY or text[] | YES

-- Check task_updates table has photos column
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'task_updates'
  AND column_name = 'photos';

-- Expected: photos | ARRAY or text[] | YES

-- ============================================
-- PART 4: CURRENT USER CONTEXT
-- ============================================

\echo ''
\echo '=========================================='
\echo 'PART 4: CURRENT USER AUTHENTICATION'
\echo '=========================================='

-- Check current authenticated user
SELECT 
  auth.uid() AS current_user_id,
  auth.role() AS current_role;

-- Expected: 
-- current_user_id: [your user UUID]
-- current_role: authenticated

-- Check user details
SELECT 
  id,
  email,
  company_id,
  role,
  created_at
FROM users
WHERE id = auth.uid();

-- Expected: Should show your user info with company_id

-- ============================================
-- PART 5: STORAGE BUCKET PERMISSIONS
-- ============================================

\echo ''
\echo '=========================================='
\echo 'PART 5: BUCKET-LEVEL PERMISSIONS'
\echo '=========================================='

-- Check if there are any bucket-level policies
SELECT 
  id,
  name,
  public,
  avif_autodetection,
  owner
FROM storage.buckets
WHERE name = 'buildtrack-files';

-- ============================================
-- PART 6: TEST UPLOAD SIMULATION
-- ============================================

\echo ''
\echo '=========================================='
\echo 'PART 6: SIMULATED UPLOAD TEST'
\echo '=========================================='

-- Simulate what would happen during upload
-- This checks if the INSERT would succeed

-- Check 1: Can we create a row in storage.objects?
EXPLAIN (VERBOSE, COSTS OFF)
INSERT INTO storage.objects (
  bucket_id,
  name,
  owner,
  metadata
) VALUES (
  'buildtrack-files',
  'test-company/tasks/test-task/test.jpg',
  auth.uid(),
  '{"mimetype": "image/jpeg", "size": 1000}'::jsonb
);

-- Note: EXPLAIN doesn't actually insert, just shows the plan

-- ============================================
-- PART 7: STORAGE FUNCTIONS
-- ============================================

\echo ''
\echo '=========================================='
\echo 'PART 7: STORAGE HELPER FUNCTIONS'
\echo '=========================================='

-- Check for any custom functions related to storage
SELECT 
  routine_name,
  routine_type,
  data_type AS return_type
FROM information_schema.routines
WHERE routine_schema = 'storage'
  AND routine_type = 'FUNCTION'
ORDER BY routine_name;

-- ============================================
-- PART 8: TRIGGERS
-- ============================================

\echo ''
\echo '=========================================='
\echo 'PART 8: STORAGE TRIGGERS'
\echo '=========================================='

-- Check for triggers on storage.objects
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing,
  action_orientation
FROM information_schema.triggers
WHERE event_object_schema = 'storage'
  AND event_object_table = 'objects'
ORDER BY trigger_name;

-- ============================================
-- SUMMARY
-- ============================================

\echo ''
\echo '=========================================='
\echo 'SUMMARY - What to Look For'
\echo '=========================================='
\echo ''
\echo 'Part 1: buildtrack-files bucket should be PUBLIC: true'
\echo 'Part 2: Should have INSERT and SELECT policies for authenticated users'
\echo 'Part 3: file_attachments should NOT exist (dropped)'
\echo 'Part 4: auth.uid() should return your user UUID'
\echo 'Part 5: Bucket should be public with no special owner restrictions'
\echo 'Part 6: INSERT plan should succeed (no RLS errors)'
\echo 'Part 7: No unexpected storage functions interfering'
\echo 'Part 8: No unexpected triggers blocking inserts'
\echo ''

