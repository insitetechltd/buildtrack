-- ============================================
-- Check for Pending Users (including new signups)
-- ============================================

-- 1. Check if is_pending column exists
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('is_pending', 'approved_by', 'approved_at');

-- 2. Find the new user "Tristan"
SELECT 
  id,
  name,
  email,
  phone,
  role,
  company_id,
  created_at
FROM users
WHERE name ILIKE '%tristan%'
ORDER BY created_at DESC;

-- 3. Check all recent users (last 24 hours)
SELECT 
  id,
  name,
  email,
  phone,
  role,
  company_id,
  created_at
FROM users
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- 4. If is_pending column exists, check pending users
-- (This will error if column doesn't exist - that's OK)
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
WHERE is_pending = true
ORDER BY created_at DESC;

-- 5. Get company info for "Insite Tech"
SELECT 
  id,
  name,
  type,
  created_at
FROM companies
WHERE name ILIKE '%insite%'
ORDER BY created_at DESC;

-- 6. Count users by company
SELECT 
  c.name as company_name,
  COUNT(u.id) as user_count
FROM companies c
LEFT JOIN users u ON u.company_id = c.id
GROUP BY c.id, c.name
ORDER BY user_count DESC;

