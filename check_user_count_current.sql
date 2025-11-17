-- ============================================
-- Check User Count - Current Database Schema
-- ============================================
-- This works with your current database (without is_pending column)

-- 1. TOTAL USER COUNT
SELECT COUNT(*) as total_users FROM users;

-- 2. USER COUNT BY ROLE
SELECT 
  role,
  COUNT(*) as count
FROM users
GROUP BY role
ORDER BY count DESC;

-- 3. USER COUNT BY COMPANY
SELECT 
  c.name as company_name,
  COUNT(u.id) as user_count
FROM companies c
LEFT JOIN users u ON u.company_id = c.id
GROUP BY c.id, c.name
ORDER BY user_count DESC;

-- 4. SUMMARY (without is_pending)
SELECT 
  (SELECT COUNT(*) FROM users) as total_users,
  (SELECT COUNT(*) FROM users WHERE role = 'admin') as admins,
  (SELECT COUNT(*) FROM users WHERE role = 'manager') as managers,
  (SELECT COUNT(*) FROM users WHERE role = 'worker') as workers;

-- 5. DETAILED USER LIST
SELECT 
  id,
  name,
  email,
  phone,
  role,
  position,
  company_id,
  created_at
FROM users
ORDER BY created_at DESC;

-- 6. CHECK WHAT COLUMNS EXIST
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
ORDER BY ordinal_position;

