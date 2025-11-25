-- ============================================
-- Check all users assigned to fakeproject1
-- ============================================

-- Step 1: Get the project details
SELECT 
  id as project_id,
  name,
  description,
  status,
  company_id,
  created_by,
  created_at
FROM projects
WHERE name = 'fakeproject1';

-- Step 2: Get ALL assignments for this project (including duplicates and orphaned)
SELECT 
  upa.id as assignment_id,
  upa.user_id,
  upa.project_id,
  upa.category as project_role,
  upa.is_active,
  upa.assigned_at,
  upa.assigned_by,
  u.name as user_name,
  u.email as user_email,
  u.role as user_system_role,
  u.position as user_position,
  u.company_id as user_company_id,
  CASE 
    WHEN u.id IS NULL THEN '❌ USER NOT FOUND (ORPHANED)'
    WHEN upa.is_active = false THEN '⚠️ INACTIVE ASSIGNMENT'
    ELSE '✅ VALID'
  END as status
FROM user_project_assignments upa
LEFT JOIN users u ON upa.user_id = u.id
WHERE upa.project_id = (SELECT id FROM projects WHERE name = 'fakeproject1' LIMIT 1)
ORDER BY upa.assigned_at DESC;

-- Step 3: Check for duplicate assignments (same user assigned multiple times)
SELECT 
  user_id,
  COUNT(*) as assignment_count,
  STRING_AGG(id::text, ', ' ORDER BY assigned_at DESC) as assignment_ids,
  STRING_AGG(assigned_at::text, ', ' ORDER BY assigned_at DESC) as assigned_dates,
  STRING_AGG(category::text, ', ' ORDER BY assigned_at DESC) as categories
FROM user_project_assignments
WHERE project_id = (SELECT id FROM projects WHERE name = 'fakeproject1' LIMIT 1)
GROUP BY user_id
HAVING COUNT(*) > 1;

-- Step 4: Get UNIQUE users that SHOULD be displayed (app logic)
SELECT DISTINCT ON (u.id)
  u.id as user_id,
  u.name,
  u.email,
  u.role as system_role,
  u.position,
  upa.category as project_role,
  upa.assigned_at,
  upa.is_active,
  CASE 
    WHEN upa.category = 'lead_project_manager' THEN '⭐ Lead PM'
    WHEN upa.category = 'project_manager' THEN '👔 Project Manager'
    WHEN upa.category = 'worker' THEN '👷 Worker'
    WHEN upa.category = 'contractor' THEN '🔧 Contractor'
    ELSE upa.category
  END as role_display
FROM user_project_assignments upa
INNER JOIN users u ON upa.user_id = u.id
WHERE upa.project_id = (SELECT id FROM projects WHERE name = 'fakeproject1' LIMIT 1)
  AND upa.is_active = true
ORDER BY u.id, upa.assigned_at DESC;

-- Step 5: Summary statistics
SELECT 
  'SUMMARY' as info,
  COUNT(*) as total_assignments_in_db,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(*) - COUNT(DISTINCT user_id) as duplicate_assignments,
  COUNT(CASE WHEN is_active = true THEN 1 END) as active_assignments,
  COUNT(CASE WHEN is_active = false THEN 1 END) as inactive_assignments
FROM user_project_assignments
WHERE project_id = (SELECT id FROM projects WHERE name = 'fakeproject1' LIMIT 1);

-- Step 6: Check for orphaned assignments (user doesn't exist)
SELECT 
  upa.id as assignment_id,
  upa.user_id as missing_user_id,
  upa.category,
  upa.assigned_at,
  '❌ USER DELETED OR MISSING' as issue
FROM user_project_assignments upa
LEFT JOIN users u ON upa.user_id = u.id
WHERE upa.project_id = (SELECT id FROM projects WHERE name = 'fakeproject1' LIMIT 1)
  AND u.id IS NULL;

-- Step 7: List all users with their assignment details (what app should show)
SELECT 
  ROW_NUMBER() OVER (ORDER BY upa.assigned_at DESC) as display_order,
  u.name as "User Name",
  u.email as "Email",
  upa.category as "Project Role",
  u.role as "System Role",
  u.position as "Position",
  upa.assigned_at as "Assigned Date",
  CASE 
    WHEN upa.category = 'lead_project_manager' THEN 'Yes'
    ELSE 'No'
  END as "Is Lead PM"
FROM (
  SELECT DISTINCT ON (user_id) *
  FROM user_project_assignments
  WHERE project_id = (SELECT id FROM projects WHERE name = 'fakeproject1' LIMIT 1)
    AND is_active = true
  ORDER BY user_id, assigned_at DESC
) upa
INNER JOIN users u ON upa.user_id = u.id
ORDER BY upa.assigned_at DESC;

