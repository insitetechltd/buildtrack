-- ============================================
-- Database Migration: Company Selection & User Approval
-- ============================================
-- This migration adds support for:
-- 1. User approval workflow for joining companies
-- 2. Tracking approval status and approver
-- ============================================

-- Add approval columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_pending BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Add comments for documentation
COMMENT ON COLUMN users.is_pending IS 'True if user is waiting for admin approval to join company';
COMMENT ON COLUMN users.approved_by IS 'User ID of the admin who approved this user';
COMMENT ON COLUMN users.approved_at IS 'Timestamp when user was approved';

-- Create index for faster queries on pending users
CREATE INDEX IF NOT EXISTS idx_users_pending ON users(company_id, is_pending) WHERE is_pending = true;

-- Update existing users to be approved (backward compatibility)
UPDATE users 
SET is_pending = false,
    approved_at = created_at
WHERE is_pending IS NULL OR is_pending = true;

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================

-- Allow users to view pending users in their company (admin only)
CREATE POLICY "Admins can view pending users in their company"
ON users FOR SELECT
USING (
  auth.uid() IN (
    SELECT id FROM users 
    WHERE company_id = users.company_id 
    AND role = 'admin'
    AND is_pending = false
  )
);

-- Allow admins to update user approval status
CREATE POLICY "Admins can approve users in their company"
ON users FOR UPDATE
USING (
  auth.uid() IN (
    SELECT id FROM users 
    WHERE company_id = users.company_id 
    AND role = 'admin'
    AND is_pending = false
  )
)
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM users 
    WHERE company_id = users.company_id 
    AND role = 'admin'
    AND is_pending = false
  )
);

-- ============================================
-- Helper Functions
-- ============================================

-- Function to get pending user count for a company
CREATE OR REPLACE FUNCTION get_pending_user_count(company_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM users
    WHERE company_id = company_uuid
    AND is_pending = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to auto-approve first user of a new company
CREATE OR REPLACE FUNCTION auto_approve_first_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if this is the first user in the company
  IF NOT EXISTS (
    SELECT 1 FROM users 
    WHERE company_id = NEW.company_id 
    AND id != NEW.id
    AND is_pending = false
  ) THEN
    -- Auto-approve and make admin
    NEW.is_pending := false;
    NEW.role := 'admin';
    NEW.approved_by := NEW.id;
    NEW.approved_at := NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-approval
DROP TRIGGER IF EXISTS trigger_auto_approve_first_user ON users;
CREATE TRIGGER trigger_auto_approve_first_user
  BEFORE INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION auto_approve_first_user();

-- ============================================
-- Verification Queries
-- ============================================

-- Check if columns were added successfully
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('is_pending', 'approved_by', 'approved_at');

-- Check pending users count per company
SELECT 
  c.name as company_name,
  COUNT(*) FILTER (WHERE u.is_pending = true) as pending_users,
  COUNT(*) FILTER (WHERE u.is_pending = false) as approved_users,
  COUNT(*) as total_users
FROM companies c
LEFT JOIN users u ON u.company_id = c.id
GROUP BY c.id, c.name
ORDER BY pending_users DESC, c.name;

-- ============================================
-- Rollback (if needed)
-- ============================================

-- Uncomment to rollback changes:
/*
DROP TRIGGER IF EXISTS trigger_auto_approve_first_user ON users;
DROP FUNCTION IF EXISTS auto_approve_first_user();
DROP FUNCTION IF EXISTS get_pending_user_count(UUID);
DROP INDEX IF EXISTS idx_users_pending;
ALTER TABLE users DROP COLUMN IF EXISTS is_pending;
ALTER TABLE users DROP COLUMN IF EXISTS approved_by;
ALTER TABLE users DROP COLUMN IF EXISTS approved_at;
*/

