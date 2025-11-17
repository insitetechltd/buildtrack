-- ============================================
-- Check and Set Pending Status for Herman and Tristan
-- ============================================

-- STEP 1: Check current status of all users
SELECT 
  id,
  name,
  email,
  role,
  company_id,
  is_pending,
  approved_at,
  created_at
FROM users
ORDER BY created_at DESC;

-- STEP 2: Check if is_pending column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name = 'is_pending';

-- STEP 3: If column doesn't exist, add it
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_pending BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- STEP 4: Set Herman and Tristan as pending (if they should be)
-- Adjust this based on your business logic
-- Option A: Set specific users as pending by name
UPDATE users
SET is_pending = true
WHERE name IN ('Herman', 'Tristan')
AND is_pending IS NOT true;

-- STEP 5: Verify the update
SELECT 
  id,
  name,
  email,
  role,
  is_pending,
  approved_at
FROM users
WHERE name IN ('Herman', 'Tristan', 'Admin Tristan');

-- STEP 6: If you want to approve them instead
/*
UPDATE users
SET 
  is_pending = false,
  approved_by = (SELECT id FROM users WHERE role = 'admin' LIMIT 1),
  approved_at = NOW()
WHERE name IN ('Herman', 'Tristan');
*/

-- ============================================
-- EXPLANATION
-- ============================================
-- Herman and Tristan should show Approve/Reject buttons if:
-- 1. They have is_pending = true in the database
-- 2. They are not admins
-- 3. They joined an existing company (not created a new one)
--
-- Admin Tristan should NOT have Approve/Reject buttons because:
-- 1. They are an admin
-- 2. OR they have is_pending = false (already approved)
-- ============================================

