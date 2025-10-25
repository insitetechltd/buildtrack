-- ============================================
-- Supabase Storage Policies for BuildTrack
-- ============================================
-- Run this AFTER creating the storage buckets in Supabase Dashboard
-- These policies control who can upload, view, and delete files

-- ============================================
-- BUCKET: buildtrack-files (Private)
-- ============================================

-- Policy 1: Users can upload to their company folder
CREATE POLICY "Users can upload to company folder"
ON storage.objects 
FOR INSERT
WITH CHECK (
  bucket_id = 'buildtrack-files'
  AND (storage.foldername(name))[1] = (
    SELECT company_id::text FROM public.users WHERE id = auth.uid()
  )
  AND auth.role() = 'authenticated'
);

-- Policy 2: Users can view their company's files
CREATE POLICY "Users can view company files"
ON storage.objects 
FOR SELECT
USING (
  bucket_id = 'buildtrack-files'
  AND (storage.foldername(name))[1] = (
    SELECT company_id::text FROM public.users WHERE id = auth.uid()
  )
);

-- Policy 3: Users can update/overwrite their own uploads
CREATE POLICY "Users can update own files"
ON storage.objects 
FOR UPDATE
USING (
  bucket_id = 'buildtrack-files'
  AND (storage.foldername(name))[1] = (
    SELECT company_id::text FROM public.users WHERE id = auth.uid()
  )
  AND (
    owner = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'manager')
    )
  )
);

-- Policy 4: Users can delete their own uploads (or admins can delete any)
CREATE POLICY "Users can delete own files"
ON storage.objects 
FOR DELETE
USING (
  bucket_id = 'buildtrack-files'
  AND (storage.foldername(name))[1] = (
    SELECT company_id::text FROM public.users WHERE id = auth.uid()
  )
  AND (
    owner = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role = 'admin'
      AND company_id::text = (storage.foldername(name))[1]
    )
  )
);

-- ============================================
-- BUCKET: buildtrack-public (Public)
-- ============================================

-- Policy 1: Anyone can view public files
CREATE POLICY "Public files are viewable by all"
ON storage.objects 
FOR SELECT
USING (
  bucket_id = 'buildtrack-public'
);

-- Policy 2: Authenticated users can upload to their company folder
CREATE POLICY "Authenticated users can upload public files"
ON storage.objects 
FOR INSERT
WITH CHECK (
  bucket_id = 'buildtrack-public'
  AND (storage.foldername(name))[1] = 'companies'
  AND (storage.foldername(name))[2] = (
    SELECT company_id::text FROM public.users WHERE id = auth.uid()
  )
  AND auth.role() = 'authenticated'
);

-- Policy 3: Users can update their company's public files
CREATE POLICY "Users can update company public files"
ON storage.objects 
FOR UPDATE
USING (
  bucket_id = 'buildtrack-public'
  AND (storage.foldername(name))[1] = 'companies'
  AND (storage.foldername(name))[2] = (
    SELECT company_id::text FROM public.users WHERE id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role IN ('admin', 'manager')
  )
);

-- Policy 4: Admins can delete their company's public files
CREATE POLICY "Admins can delete company public files"
ON storage.objects 
FOR DELETE
USING (
  bucket_id = 'buildtrack-public'
  AND (storage.foldername(name))[1] = 'companies'
  AND (storage.foldername(name))[2] = (
    SELECT company_id::text FROM public.users WHERE id = auth.uid()
  )
  AND EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
    AND role = 'admin'
  )
);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- View all storage policies
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
ORDER BY tablename, policyname;

-- Test query: Check if current user can access their company's folder
-- (Run this from an authenticated session)
SELECT 
  (storage.foldername('test-path'))[1] as first_folder,
  (SELECT company_id::text FROM public.users WHERE id = auth.uid()) as user_company_id,
  auth.uid() as current_user_id,
  auth.role() as current_role;

-- ============================================
-- TROUBLESHOOTING
-- ============================================

/*
If uploads fail with permission errors:

1. Check that the user is authenticated:
   SELECT auth.uid(), auth.role();

2. Check user's company_id:
   SELECT id, company_id FROM users WHERE id = auth.uid();

3. Verify bucket exists:
   SELECT name FROM storage.buckets;

4. Check policies are applied:
   SELECT * FROM pg_policies WHERE schemaname = 'storage';

5. Test folder path structure:
   -- Should be: {company_id}/tasks/{task_id}/filename.jpg
   SELECT storage.foldername('uuid-here/tasks/uuid-here/file.jpg');

6. Check storage bucket settings in Dashboard:
   - Supabase Dashboard → Storage → buildtrack-files → Settings
   - Ensure "Public" is OFF
   - Ensure file size limits are appropriate
*/

-- ============================================
-- STORAGE POLICIES APPLIED! ✅
-- ============================================

-- Next steps:
-- 1. Test file upload from your app
-- 2. Verify files appear in Supabase Dashboard → Storage
-- 3. Check file_attachments table for metadata
-- 4. Test cross-company access (should be blocked)
-- 5. Monitor storage usage

