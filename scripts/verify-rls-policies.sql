-- ============================================
-- Verify RLS Policies for file_attachments
-- ============================================
-- Run this to check if policies were applied correctly

-- 1. Check if table exists and has RLS enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE tablename = 'file_attachments';

-- 2. List all current policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd AS command,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
WHERE tablename = 'file_attachments'
ORDER BY cmd, policyname;

-- 3. Test if current user can insert
-- First check current user context
SELECT 
  auth.uid() AS current_user_id,
  u.email,
  u.company_id,
  u.role
FROM users u
WHERE u.id = auth.uid();

-- 4. Test insert (this will show the exact error if it fails)
-- UNCOMMENT to test:
/*
INSERT INTO file_attachments (
  file_name,
  file_type,
  file_size,
  mime_type,
  storage_path,
  public_url,
  entity_type,
  entity_id,
  uploaded_by,
  company_id
) VALUES (
  'test-rls.jpg',
  'image',
  1000,
  'image/jpeg',
  'test/rls/test.jpg',
  'https://test.url/test.jpg',
  'task',
  '00000000-0000-0000-0000-000000000000',
  auth.uid(),
  (SELECT company_id FROM users WHERE id = auth.uid())
);
*/

-- 5. If the above insert works, clean it up:
-- DELETE FROM file_attachments WHERE file_name = 'test-rls.jpg';

