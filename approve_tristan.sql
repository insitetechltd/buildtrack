-- ============================================
-- Approve Tristan (New User)
-- ============================================

-- OPTION 1: If is_pending column EXISTS
-- Run this to approve Tristan
/*
UPDATE users
SET 
  is_pending = false,
  approved_by = (SELECT id FROM users WHERE role = 'admin' LIMIT 1),
  approved_at = NOW()
WHERE name ILIKE '%tristan%'
AND is_pending = true;

-- Verify
SELECT id, name, email, is_pending, approved_at
FROM users
WHERE name ILIKE '%tristan%';
*/

-- OPTION 2: If is_pending column DOESN'T EXIST
-- First, add the approval columns
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_pending BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Set all existing users as approved
UPDATE users 
SET 
  is_pending = false,
  approved_at = created_at
WHERE is_pending IS NULL OR is_pending = true;

-- Now check if Tristan exists
SELECT 
  id,
  name,
  email,
  phone,
  role,
  company_id,
  is_pending,
  created_at
FROM users
WHERE name ILIKE '%tristan%'
ORDER BY created_at DESC;

-- If Tristan shows is_pending = true, approve them:
/*
UPDATE users
SET 
  is_pending = false,
  approved_by = (SELECT id FROM users WHERE role = 'admin' LIMIT 1),
  approved_at = NOW()
WHERE name ILIKE '%tristan%';
*/

