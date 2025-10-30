-- ============================================
-- Make Storage Bucket Public - CRITICAL FIX
-- ============================================
-- This script makes the buildtrack-files bucket public so that
-- photos uploaded on one device can be viewed on other devices.
-- 
-- Run this in Supabase SQL Editor
-- Estimated execution time: < 5 seconds

-- Make buildtrack-files bucket public
UPDATE storage.buckets 
SET public = true 
WHERE name = 'buildtrack-files';

-- Verify the change
SELECT 
  name, 
  public,
  file_size_limit,
  created_at
FROM storage.buckets 
WHERE name = 'buildtrack-files';

-- Expected result:
-- name               | public | file_size_limit | created_at
-- -------------------|--------|-----------------|------------
-- buildtrack-files   | true   | 52428800        | [timestamp]

-- If the bucket doesn't exist yet, create it:
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES (
--   'buildtrack-files',
--   'buildtrack-files', 
--   true,  -- PUBLIC
--   52428800,  -- 50MB limit
--   ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'video/mp4']
-- );

-- Note: Making the bucket public allows anyone with the URL to access files.
-- This is safe because:
-- 1. URLs contain unique IDs that are hard to guess
-- 2. Row-level security (RLS) on task_updates table controls who can see which task updates
-- 3. Only users with access to a task can see the update and its photo URLs

