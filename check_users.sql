-- ============================================
-- Check User Roles in Database
-- ============================================

-- 1. Count users by role
SELECT 
  role,
  COUNT(*) as user_count
FROM users
GROUP BY role
ORDER BY user_count DESC;

-- 2. List all users with their roles
SELECT 
  id,
  name,
  email,
  phone,
  role,
  position,
  company_id,
  is_pending,
  created_at
FROM users
ORDER BY role, name;

-- 3. Check if role column exists and its data type
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name = 'role';

-- 4. Check for NULL or unexpected role values
SELECT 
  role,
  COUNT(*) as count,
  ARRAY_AGG(name) as user_names
FROM users
GROUP BY role
ORDER BY count DESC;

-- 5. Specific check: Are there really only admins?
SELECT 
  CASE 
    WHEN role = 'admin' THEN 'Admin Users'
    WHEN role = 'manager' THEN 'Manager Users'
    WHEN role = 'worker' THEN 'Worker Users'
    ELSE 'Other/Unknown Role'
  END as role_category,
  COUNT(*) as count
FROM users
GROUP BY role_category;

