-- ============================================
-- Fix File Attachments RLS Policy
-- ============================================
-- This fixes the "new row violates row-level security policy" error
-- when uploading photos
--
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. CHECK IF TABLE EXISTS
-- ============================================

-- Check if file_attachments table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'file_attachments'
);

-- ============================================
-- 2. DROP EXISTING RLS POLICIES (if too restrictive)
-- ============================================

-- Drop all existing policies on file_attachments
DROP POLICY IF EXISTS "Users can insert their own files" ON file_attachments;
DROP POLICY IF EXISTS "Users can view their company files" ON file_attachments;
DROP POLICY IF EXISTS "Users can update their own files" ON file_attachments;
DROP POLICY IF EXISTS "Users can delete their own files" ON file_attachments;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON file_attachments;
DROP POLICY IF EXISTS "Enable read for authenticated users" ON file_attachments;

-- ============================================
-- 3. CREATE NEW RLS POLICIES (PERMISSIVE)
-- ============================================

-- Enable RLS
ALTER TABLE file_attachments ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow authenticated users to INSERT files for their company
CREATE POLICY "Users can upload files for their company"
ON file_attachments
FOR INSERT
TO authenticated
WITH CHECK (
  company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  )
);

-- Policy 2: Allow users to VIEW files from their company
CREATE POLICY "Users can view their company files"
ON file_attachments
FOR SELECT
TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  )
);

-- Policy 3: Allow users to UPDATE their own uploaded files
CREATE POLICY "Users can update their own files"
ON file_attachments
FOR UPDATE
TO authenticated
USING (uploaded_by = auth.uid())
WITH CHECK (uploaded_by = auth.uid());

-- Policy 4: Allow users to soft-DELETE their own files
CREATE POLICY "Users can delete their own files"
ON file_attachments
FOR UPDATE
TO authenticated
USING (uploaded_by = auth.uid())
WITH CHECK (deleted_by = auth.uid());

-- ============================================
-- 4. VERIFY POLICIES
-- ============================================

-- List all policies for file_attachments
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
WHERE tablename = 'file_attachments';

-- ============================================
-- 5. ALTERNATIVE: DISABLE RLS (if not using the table)
-- ============================================

-- If you're NOT using the file_attachments table for metadata,
-- you can just disable RLS entirely:

-- ALTER TABLE file_attachments DISABLE ROW LEVEL SECURITY;

-- Note: Only do this if you're storing URLs directly in tasks.attachments
-- and not using the file_attachments table at all.

-- ============================================
-- 6. CHECK CURRENT USER PERMISSIONS
-- ============================================

-- Verify the current user has proper role
SELECT 
  id,
  email,
  company_id,
  role
FROM users
WHERE id = auth.uid();

-- ============================================
-- TROUBLESHOOTING
-- ============================================

/*
If the error persists:

1. Check if auth.uid() returns a value:
   SELECT auth.uid();
   
2. Check if user has company_id:
   SELECT id, company_id FROM users WHERE id = auth.uid();
   
3. Check if file_attachments table has the correct columns:
   \d file_attachments
   
4. Test insert manually:
   INSERT INTO file_attachments (
     file_name, file_type, file_size, mime_type,
     storage_path, public_url,
     entity_type, entity_id,
     uploaded_by, company_id
   ) VALUES (
     'test.jpg', 'image', 1000, 'image/jpeg',
     'test/path/test.jpg', 'https://test.url',
     'task', 'test-uuid',
     auth.uid(), 
     (SELECT company_id FROM users WHERE id = auth.uid())
   );
*/

