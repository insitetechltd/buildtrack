-- ============================================
-- Check all projects assigned to Sarah
-- ============================================

-- Step 1: Find Sarah's user record
SELECT 
  id as user_id,
  name,
  email,
  phone,
  role as system_role,
  position,
  company_id,
  created_at,
  is_pending,
  approved_at
FROM users
WHERE name ILIKE '%sarah%'
   OR email ILIKE '%sarah%';

-- Step 2: Get all project assignments for Sarah
SELECT 
  u.id as user_id,
  u.name as user_name,
  u.email,
  u.role as system_role,
  upa.id as assignment_id,
  upa.project_id,
  p.name as project_name,
  p.description as project_description,
  p.status as project_status,
  upa.category as project_role,
  upa.is_active,
  upa.assigned_at,
  upa.assigned_by,
  assigned_by_user.name as assigned_by_name
FROM users u
LEFT JOIN user_project_assignments upa ON u.id = upa.user_id
LEFT JOIN projects p ON upa.project_id = p.id
LEFT JOIN users assigned_by_user ON upa.assigned_by = assigned_by_user.id
WHERE u.name ILIKE '%sarah%'
   OR u.email ILIKE '%sarah%'
ORDER BY upa.assigned_at DESC;

-- Step 3: Count Sarah's projects
SELECT 
  u.name as user_name,
  COUNT(DISTINCT upa.project_id) as total_projects,
  COUNT(DISTINCT CASE WHEN upa.is_active = true THEN upa.project_id END) as active_assignments,
  COUNT(DISTINCT CASE WHEN p.status = 'active' THEN p.id END) as active_projects,
  COUNT(DISTINCT CASE WHEN p.status = 'planning' THEN p.id END) as planning_projects,
  COUNT(DISTINCT CASE WHEN p.status = 'completed' THEN p.id END) as completed_projects
FROM users u
LEFT JOIN user_project_assignments upa ON u.id = upa.user_id
LEFT JOIN projects p ON upa.project_id = p.id
WHERE u.name ILIKE '%sarah%'
   OR u.email ILIKE '%sarah%'
GROUP BY u.id, u.name;

-- Step 4: Get detailed project list for Sarah
SELECT 
  p.id as project_id,
  p.name as project_name,
  p.description,
  p.status,
  p.location,
  p.start_date,
  p.end_date,
  p.budget,
  p.client_info->>'name' as client_name,
  upa.category as sarah_role_on_project,
  upa.is_active as assignment_active,
  upa.assigned_at,
  c.name as company_name,
  created_by_user.name as created_by_name
FROM users u
INNER JOIN user_project_assignments upa ON u.id = upa.user_id
INNER JOIN projects p ON upa.project_id = p.id
LEFT JOIN companies c ON p.company_id = c.id
LEFT JOIN users created_by_user ON p.created_by = created_by_user.id
WHERE (u.name ILIKE '%sarah%' OR u.email ILIKE '%sarah%')
  AND upa.is_active = true
ORDER BY upa.assigned_at DESC;

-- Step 5: Check if Sarah is a Lead PM on any projects
SELECT 
  u.name as user_name,
  p.name as project_name,
  upa.category as role,
  upa.assigned_at
FROM users u
INNER JOIN user_project_assignments upa ON u.id = upa.user_id
INNER JOIN projects p ON upa.project_id = p.id
WHERE (u.name ILIKE '%sarah%' OR u.email ILIKE '%sarah%')
  AND upa.category = 'lead_project_manager'
  AND upa.is_active = true;

-- Step 6: Get all users named Sarah (in case there are multiple)
SELECT 
  id,
  name,
  email,
  phone,
  role,
  position,
  company_id,
  (SELECT name FROM companies WHERE id = users.company_id) as company_name,
  is_pending,
  created_at
FROM users
WHERE name ILIKE '%sarah%'
   OR email ILIKE '%sarah%'
ORDER BY created_at DESC;

-- Step 7: Summary for Sarah
SELECT 
  'SUMMARY FOR SARAH' as info,
  u.id as user_id,
  u.name,
  u.email,
  u.role as system_role,
  u.position,
  (SELECT name FROM companies WHERE id = u.company_id) as company,
  COUNT(DISTINCT upa.project_id) FILTER (WHERE upa.is_active = true) as total_active_projects,
  COUNT(DISTINCT CASE WHEN upa.category = 'lead_project_manager' THEN upa.project_id END) as lead_pm_projects,
  COUNT(DISTINCT CASE WHEN upa.category = 'project_manager' THEN upa.project_id END) as pm_projects,
  COUNT(DISTINCT CASE WHEN upa.category = 'worker' THEN upa.project_id END) as worker_projects,
  COUNT(DISTINCT CASE WHEN upa.category = 'contractor' THEN upa.project_id END) as contractor_projects
FROM users u
LEFT JOIN user_project_assignments upa ON u.id = upa.user_id
WHERE u.name ILIKE '%sarah%'
   OR u.email ILIKE '%sarah%'
GROUP BY u.id, u.name, u.email, u.role, u.position, u.company_id;

