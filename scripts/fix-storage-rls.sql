-- ============================================
-- Fix Storage RLS Policies
-- ============================================
-- This fixes RLS errors on storage.objects table
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. CHECK CURRENT STORAGE POLICIES
-- ============================================

-- List all policies on storage.objects
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
ORDER BY cmd, policyname;

-- ============================================
-- 2. DROP RESTRICTIVE POLICIES
-- ============================================

-- Drop any overly restrictive policies
DROP POLICY IF EXISTS "Authenticated users can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to their company folder" ON storage.objects;
DROP POLICY IF EXISTS "Give users authenticated access to folder" ON storage.objects;

-- ============================================
-- 3. CREATE PERMISSIVE UPLOAD POLICY
-- ============================================

-- Allow authenticated users to INSERT (upload) to buildtrack-files bucket
CREATE POLICY "Authenticated users can upload to buildtrack-files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'buildtrack-files'
);

-- Allow authenticated users to READ from buildtrack-files bucket
CREATE POLICY "Authenticated users can read from buildtrack-files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'buildtrack-files'
);

-- Allow users to UPDATE their own uploads
CREATE POLICY "Users can update their own uploads"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'buildtrack-files' 
  AND owner = auth.uid()
)
WITH CHECK (
  bucket_id = 'buildtrack-files' 
  AND owner = auth.uid()
);

-- Allow users to DELETE their own uploads
CREATE POLICY "Users can delete their own uploads"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'buildtrack-files' 
  AND owner = auth.uid()
);

-- ============================================
-- 4. VERIFY POLICIES WERE CREATED
-- ============================================

SELECT 
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%buildtrack-files%'
ORDER BY cmd;

-- ============================================
-- 5. TEST STORAGE ACCESS
-- ============================================

-- Check current user
SELECT 
  auth.uid() AS user_id,
  auth.role() AS user_role;

-- Check bucket exists and is public
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE name = 'buildtrack-files';

-- ============================================
-- ALTERNATIVE: DISABLE RLS ON STORAGE (NOT RECOMMENDED)
-- ============================================

-- Only use this as last resort - it disables all storage security
-- UNCOMMENT ONLY IF ABOVE DOESN'T WORK:

-- ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- ============================================
-- TROUBLESHOOTING
-- ============================================

/*
If still getting errors:

1. Check if user is authenticated:
   SELECT auth.uid();
   -- Should return a UUID, not null

2. Check bucket permissions:
   SELECT public FROM storage.buckets WHERE name = 'buildtrack-files';
   -- Should return true

3. Try uploading via SQL:
   INSERT INTO storage.objects (
     bucket_id, name, owner, metadata
   ) VALUES (
     'buildtrack-files', 
     'test/test.txt',
     auth.uid(),
     '{"mimetype": "text/plain", "size": 100}'::jsonb
   );
   
4. If that fails, check the exact error message
*/

