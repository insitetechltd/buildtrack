-- Fix User ID Mismatch for admin@buildtrack.com
-- Old ID: 33333333-3333-3333-3333-333333333333
-- New ID: 2017d3d3-39b4-4bc0-bbe6-4c1672b79652
--
-- This script updates all foreign key references and fixes the user ID mismatch
-- that prevents login from working.

BEGIN;

-- Step 1: Temporarily rename the old user's email to avoid duplicate key constraint
-- This allows us to insert the new user record with the correct email
UPDATE users 
SET email = 'admin@buildtrack.com.old_' || id::text
WHERE id = '33333333-3333-3333-3333-333333333333'::uuid;

-- Step 2: Insert the user record with correct ID (must exist before foreign keys can reference it)
INSERT INTO users (
  id,
  email,
  phone,
  name,
  role,
  company_id,
  position,
  is_pending,
  approved_by,
  approved_at,
  created_at
) VALUES (
  '2017d3d3-39b4-4bc0-bbe6-4c1672b79652'::uuid,
  'admin@buildtrack.com',
  '5555-0103',
  'Alex Administrator',
  'admin',
  '4abcba7d-e25a-403f-af39-9e36ee6395b1'::uuid,
  'System Administrator',
  false,
  NULL,
  NULL,
  '2025-10-21T06:13:46.982+00:00'
);

-- Step 3: Now update all foreign key references (user must exist first)
-- Update projects.created_by
UPDATE projects 
SET created_by = '2017d3d3-39b4-4bc0-bbe6-4c1672b79652'::uuid 
WHERE created_by = '33333333-3333-3333-3333-333333333333'::uuid;

-- Update tasks.assigned_by
UPDATE tasks 
SET assigned_by = '2017d3d3-39b4-4bc0-bbe6-4c1672b79652'::uuid 
WHERE assigned_by = '33333333-3333-3333-3333-333333333333'::uuid;

-- Update tasks.assigned_to (array field - requires special handling)
-- Note: This updates the array, replacing the old ID with the new ID
UPDATE tasks 
SET assigned_to = array_replace(assigned_to, '33333333-3333-3333-3333-333333333333'::uuid, '2017d3d3-39b4-4bc0-bbe6-4c1672b79652'::uuid)
WHERE '33333333-3333-3333-3333-333333333333'::uuid = ANY(assigned_to);

-- Update tasks.accepted_by
UPDATE tasks 
SET accepted_by = '2017d3d3-39b4-4bc0-bbe6-4c1672b79652'::uuid 
WHERE accepted_by = '33333333-3333-3333-3333-333333333333'::uuid;

-- Update tasks.reviewed_by
UPDATE tasks 
SET reviewed_by = '2017d3d3-39b4-4bc0-bbe6-4c1672b79652'::uuid 
WHERE reviewed_by = '33333333-3333-3333-3333-333333333333'::uuid;

-- Update user_project_assignments.user_id
UPDATE user_project_assignments 
SET user_id = '2017d3d3-39b4-4bc0-bbe6-4c1672b79652'::uuid 
WHERE user_id = '33333333-3333-3333-3333-333333333333'::uuid;

-- Update users.approved_by
UPDATE users 
SET approved_by = '2017d3d3-39b4-4bc0-bbe6-4c1672b79652'::uuid 
WHERE approved_by = '33333333-3333-3333-3333-333333333333'::uuid;

-- Step 4: Finally, delete the old user record (after all foreign keys are updated)
DELETE FROM users 
WHERE id = '33333333-3333-3333-3333-333333333333'::uuid;

COMMIT;

-- Verify the fix
SELECT 
  'Verification' as check_type,
  u.id,
  u.email,
  u.name,
  CASE 
    WHEN u.id = '2017d3d3-39b4-4bc0-bbe6-4c1672b79652'::uuid THEN '✅ ID MATCHES'
    ELSE '❌ ID MISMATCH'
  END as id_status
FROM users u
WHERE u.email = 'admin@buildtrack.com';

