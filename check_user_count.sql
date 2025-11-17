-- ============================================
-- Check User Count in Database
-- ============================================

-- Total user count
SELECT COUNT(*) as total_users FROM users;

-- User count by role
SELECT 
  role,
  COUNT(*) as count
FROM users
GROUP BY role
ORDER BY count DESC;

-- User count by company
SELECT 
  c.name as company_name,
  COUNT(u.id) as user_count
FROM companies c
LEFT JOIN users u ON u.company_id = c.id
GROUP BY c.id, c.name
ORDER BY user_count DESC;

-- User count by approval status
SELECT 
  CASE 
    WHEN is_pending = true THEN 'Pending Approval'
    WHEN is_pending = false OR is_pending IS NULL THEN 'Approved'
    ELSE 'Unknown'
  END as status,
  COUNT(*) as count
FROM users
GROUP BY is_pending
ORDER BY count DESC;

-- Detailed user list
SELECT 
  id,
  name,
  email,
  phone,
  role,
  position,
  is_pending,
  created_at
FROM users
ORDER BY created_at DESC;

-- Summary
SELECT 
  (SELECT COUNT(*) FROM users) as total_users,
  (SELECT COUNT(*) FROM users WHERE role = 'admin') as admins,
  (SELECT COUNT(*) FROM users WHERE role = 'manager') as managers,
  (SELECT COUNT(*) FROM users WHERE role = 'worker') as workers,
  (SELECT COUNT(*) FROM users WHERE is_pending = true) as pending_approval;

