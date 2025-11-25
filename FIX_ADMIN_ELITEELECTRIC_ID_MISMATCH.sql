-- Fix User ID Mismatch for admin@eliteelectric.com
-- Old ID: 55555555-5555-5555-5555-555555555555
-- New ID: 8932a934-0942-43f0-93e7-8f358ed7fce3
--
-- This script updates all foreign key references and fixes the user ID mismatch
-- that prevents login from working.

BEGIN;

-- Step 1: Temporarily rename the old user's email to avoid duplicate key constraint
-- This allows us to insert the new user record with the correct email
UPDATE users 
SET email = 'admin@eliteelectric.com.old_' || id::text
WHERE id = '55555555-5555-5555-5555-555555555555'::uuid;

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
  '8932a934-0942-43f0-93e7-8f358ed7fce3'::uuid,
  'admin@eliteelectric.com',
  '5555-0105',
  'Mike Johnson',
  'admin',
  'd89378c4-939f-4ae9-a4e2-97d366ccb82a'::uuid,
  'Operations Manager',
  false,
  NULL,
  NULL,
  '2025-10-21T06:13:46.982+00:00'
);

-- Step 3: Now update all foreign key references (user must exist first)
-- Update projects.created_by
UPDATE projects 
SET created_by = '8932a934-0942-43f0-93e7-8f358ed7fce3'::uuid 
WHERE created_by = '55555555-5555-5555-5555-555555555555'::uuid;

-- Update tasks.assigned_by
UPDATE tasks 
SET assigned_by = '8932a934-0942-43f0-93e7-8f358ed7fce3'::uuid 
WHERE assigned_by = '55555555-5555-5555-5555-555555555555'::uuid;

-- Update tasks.assigned_to (array field - requires special handling)
-- Note: This updates the array, replacing the old ID with the new ID
UPDATE tasks 
SET assigned_to = array_replace(assigned_to, '55555555-5555-5555-5555-555555555555'::uuid, '8932a934-0942-43f0-93e7-8f358ed7fce3'::uuid)
WHERE '55555555-5555-5555-5555-555555555555'::uuid = ANY(assigned_to);

-- Update tasks.accepted_by
UPDATE tasks 
SET accepted_by = '8932a934-0942-43f0-93e7-8f358ed7fce3'::uuid 
WHERE accepted_by = '55555555-5555-5555-5555-555555555555'::uuid;

-- Update tasks.reviewed_by
UPDATE tasks 
SET reviewed_by = '8932a934-0942-43f0-93e7-8f358ed7fce3'::uuid 
WHERE reviewed_by = '55555555-5555-5555-5555-555555555555'::uuid;

-- Update user_project_assignments.user_id
UPDATE user_project_assignments 
SET user_id = '8932a934-0942-43f0-93e7-8f358ed7fce3'::uuid 
WHERE user_id = '55555555-5555-5555-5555-555555555555'::uuid;

-- Update users.approved_by
UPDATE users 
SET approved_by = '8932a934-0942-43f0-93e7-8f358ed7fce3'::uuid 
WHERE approved_by = '55555555-5555-5555-5555-555555555555'::uuid;

-- Step 4: Finally, delete the old user record (after all foreign keys are updated)
DELETE FROM users 
WHERE id = '55555555-5555-5555-5555-555555555555'::uuid;

COMMIT;

-- Verify the fix
SELECT 
  'Verification' as check_type,
  u.id,
  u.email,
  u.name,
  CASE 
    WHEN u.id = '8932a934-0942-43f0-93e7-8f358ed7fce3'::uuid THEN '✅ ID MATCHES'
    ELSE '❌ ID MISMATCH'
  END as id_status
FROM users u
WHERE u.email = 'admin@eliteelectric.com';


