-- Check for duplicate Den users in the users table
-- This will help identify if there are multiple user records for Den
-- which could cause ID mismatches when self-assigning tasks

-- Find all users with "Den" in their name (case-insensitive)
SELECT 
  id,
  name,
  phone,
  email,
  company_id,
  role,
  created_at,
  is_pending,
  approved_by,
  approved_at
FROM users
WHERE LOWER(name) LIKE '%den%'
ORDER BY created_at DESC;

-- Count how many Den users exist
SELECT 
  COUNT(*) as den_user_count,
  COUNT(DISTINCT phone) as unique_phone_count,
  COUNT(DISTINCT email) as unique_email_count,
  COUNT(DISTINCT company_id) as unique_company_count
FROM users
WHERE LOWER(name) LIKE '%den%';

-- Check for exact "Den" matches
SELECT 
  id,
  name,
  phone,
  email,
  company_id,
  role,
  created_at
FROM users
WHERE LOWER(TRIM(name)) = 'den'
ORDER BY created_at DESC;

-- Check for users with similar names that might be Den
SELECT 
  id,
  name,
  phone,
  email,
  company_id,
  role,
  created_at
FROM users
WHERE 
  LOWER(name) LIKE 'den%' OR
  LOWER(name) LIKE '%den%' OR
  LOWER(name) = 'dennis'
ORDER BY created_at DESC;

