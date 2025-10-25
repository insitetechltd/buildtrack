-- ============================================
-- BuildTrack File Attachments Migration
-- ============================================
-- Run this in Supabase SQL Editor to add file upload capabilities
-- Estimated execution time: < 1 minute

-- ============================================
-- 1. CREATE FILE ATTACHMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS file_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- File Information
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('image', 'document', 'video', 'other')),
  file_size INTEGER NOT NULL CHECK (file_size > 0 AND file_size <= 52428800), -- Max 50MB
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL UNIQUE,
  public_url TEXT NOT NULL,
  
  -- Entity Association (what this file is attached to)
  entity_type TEXT NOT NULL CHECK (entity_type IN ('task', 'sub_task', 'task_update', 'project', 'company_logo', 'company_banner', 'user_avatar')),
  entity_id UUID NOT NULL,
  
  -- Metadata
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Optional metadata
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Soft delete (for recovery)
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================
-- 2. CREATE INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_file_attachments_entity 
  ON file_attachments(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_file_attachments_company 
  ON file_attachments(company_id);

CREATE INDEX IF NOT EXISTS idx_file_attachments_uploaded_by 
  ON file_attachments(uploaded_by);

CREATE INDEX IF NOT EXISTS idx_file_attachments_created_at 
  ON file_attachments(created_at);

CREATE INDEX IF NOT EXISTS idx_file_attachments_deleted_at 
  ON file_attachments(deleted_at);

-- Composite index for common query pattern
CREATE INDEX IF NOT EXISTS idx_file_attachments_entity_not_deleted 
  ON file_attachments(entity_type, entity_id, company_id) 
  WHERE deleted_at IS NULL;

-- ============================================
-- 3. CREATE TRIGGERS
-- ============================================

-- Updated_at trigger (reuse existing function)
CREATE TRIGGER update_file_attachments_updated_at 
  BEFORE UPDATE ON file_attachments
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. FILE VALIDATION TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION validate_file_upload()
RETURNS TRIGGER AS $$
BEGIN
  -- Check file size (50MB max)
  IF NEW.file_size > 52428800 THEN
    RAISE EXCEPTION 'File size exceeds 50MB limit';
  END IF;
  
  -- Check MIME type whitelist
  IF NEW.mime_type NOT IN (
    -- Images
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif',
    -- Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    -- Spreadsheets
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    -- Text
    'text/plain',
    'text/csv',
    -- Compressed
    'application/zip',
    'application/x-zip-compressed'
  ) THEN
    RAISE EXCEPTION 'Invalid file type: %. Only images, PDFs, Office documents, and text files are allowed.', NEW.mime_type;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_file_before_insert
  BEFORE INSERT ON file_attachments
  FOR EACH ROW
  EXECUTE FUNCTION validate_file_upload();

-- ============================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS
ALTER TABLE file_attachments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view company files" ON file_attachments;
DROP POLICY IF EXISTS "Authenticated users can upload files" ON file_attachments;
DROP POLICY IF EXISTS "Users can update own files" ON file_attachments;
DROP POLICY IF EXISTS "Users can delete own files" ON file_attachments;

-- SELECT: Users can view files from their company (not deleted)
CREATE POLICY "Users can view company files" 
  ON file_attachments
  FOR SELECT 
  USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND deleted_at IS NULL
  );

-- INSERT: Authenticated users can upload files to their company
CREATE POLICY "Authenticated users can upload files" 
  ON file_attachments
  FOR INSERT 
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND uploaded_by = auth.uid()
  );

-- UPDATE: Users can update their own uploads or admins/managers can update any in their company
CREATE POLICY "Users can update own files" 
  ON file_attachments
  FOR UPDATE 
  USING (
    (uploaded_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND company_id = file_attachments.company_id
      AND role IN ('admin', 'manager')
    ))
    AND company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- DELETE: Only allow soft deletes via UPDATE
-- Hard deletes should be done via admin functions only
CREATE POLICY "Users can soft delete own files" 
  ON file_attachments
  FOR UPDATE 
  USING (
    (uploaded_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND company_id = file_attachments.company_id
      AND role = 'admin'
    ))
    AND company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- ============================================
-- 6. UTILITY FUNCTIONS
-- ============================================

-- Function to get file statistics for a company
CREATE OR REPLACE FUNCTION get_file_statistics(p_company_id UUID)
RETURNS TABLE(
  total_files BIGINT,
  total_size_bytes BIGINT,
  total_size_mb NUMERIC,
  images_count BIGINT,
  documents_count BIGINT,
  videos_count BIGINT,
  other_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_files,
    COALESCE(SUM(file_size), 0)::BIGINT as total_size_bytes,
    ROUND(COALESCE(SUM(file_size), 0) / 1048576.0, 2) as total_size_mb,
    COUNT(*) FILTER (WHERE file_type = 'image')::BIGINT as images_count,
    COUNT(*) FILTER (WHERE file_type = 'document')::BIGINT as documents_count,
    COUNT(*) FILTER (WHERE file_type = 'video')::BIGINT as videos_count,
    COUNT(*) FILTER (WHERE file_type = 'other')::BIGINT as other_count
  FROM file_attachments
  WHERE company_id = p_company_id
    AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to cleanup old soft-deleted files (run periodically)
CREATE OR REPLACE FUNCTION cleanup_deleted_files(days_old INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM file_attachments
  WHERE deleted_at IS NOT NULL
    AND deleted_at < NOW() - INTERVAL '1 day' * days_old;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. STORAGE BUCKET SETUP INSTRUCTIONS
-- ============================================

-- NOTE: Storage buckets cannot be created via SQL.
-- You must create them manually in Supabase Dashboard → Storage

/*
MANUAL STEPS REQUIRED:

1. Create Storage Bucket: 'buildtrack-files'
   - Go to Supabase Dashboard → Storage → New Bucket
   - Name: buildtrack-files
   - Public: NO (private)
   - File size limit: 50MB
   - Allowed MIME types: Leave empty to use trigger validation

2. Create Storage Bucket: 'buildtrack-public'
   - Name: buildtrack-public
   - Public: YES
   - File size limit: 10MB
   - Use for: Company logos, banners

3. Apply Storage Policies (see file-storage-policies.sql)
*/

-- ============================================
-- 8. VERIFICATION QUERIES
-- ============================================

-- Verify table was created
SELECT 
  tablename, 
  schemaname 
FROM pg_tables 
WHERE tablename = 'file_attachments';

-- Verify indexes were created
SELECT 
  indexname, 
  indexdef 
FROM pg_indexes 
WHERE tablename = 'file_attachments';

-- Verify RLS is enabled
SELECT 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE tablename = 'file_attachments';

-- Verify policies were created
SELECT 
  policyname, 
  cmd 
FROM pg_policies 
WHERE tablename = 'file_attachments';

-- ============================================
-- MIGRATION COMPLETE! ✅
-- ============================================

-- Next steps:
-- 1. Create storage buckets manually (see instructions above)
-- 2. Apply storage policies (run file-storage-policies.sql)
-- 3. Test file upload from the app
-- 4. Monitor storage usage in Supabase Dashboard

