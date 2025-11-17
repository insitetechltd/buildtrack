-- ============================================
-- Check for Ghost Users in Supabase
-- ============================================
-- Ghost users are users that exist in one table but not the other

-- 1. Count users in both tables
SELECT 'users table' as location, COUNT(*) as count FROM users
UNION ALL
SELECT 'auth.users table' as location, COUNT(*) as count FROM auth.users;

-- 2. Find users in auth.users but NOT in users table (Ghost Auth Users)
SELECT 
  au.id,
  au.email,
  au.created_at as auth_created_at,
  au.last_sign_in_at,
  au.raw_user_meta_data,
  'EXISTS IN AUTH BUT NOT IN USERS TABLE' as status
FROM auth.users au
LEFT JOIN users u ON au.id = u.id
WHERE u.id IS NULL
ORDER BY au.created_at DESC;

-- 3. Find users in users table but NOT in auth.users (Ghost App Users)
SELECT 
  u.id,
  u.name,
  u.email,
  u.role,
  u.created_at,
  'EXISTS IN USERS TABLE BUT NOT IN AUTH' as status
FROM users u
LEFT JOIN auth.users au ON u.id = au.id
WHERE au.id IS NULL
ORDER BY u.created_at DESC;

-- 4. Compare counts and show discrepancy
WITH counts AS (
  SELECT 
    (SELECT COUNT(*) FROM auth.users) as auth_count,
    (SELECT COUNT(*) FROM users) as users_count
)
SELECT 
  auth_count,
  users_count,
  auth_count - users_count as difference,
  CASE 
    WHEN auth_count > users_count THEN 'More users in auth.users (ghost auth users exist)'
    WHEN users_count > auth_count THEN 'More users in users table (ghost app users exist)'
    ELSE 'Counts match - no ghost users'
  END as status
FROM counts;

-- 5. List ALL users from both tables side by side
SELECT 
  COALESCE(au.email, u.email) as email,
  COALESCE(u.name, au.raw_user_meta_data->>'name') as name,
  u.role,
  u.is_pending,
  CASE 
    WHEN au.id IS NOT NULL AND u.id IS NOT NULL THEN '✓ Both'
    WHEN au.id IS NOT NULL AND u.id IS NULL THEN '⚠️ Auth Only'
    WHEN au.id IS NULL AND u.id IS NOT NULL THEN '⚠️ Users Only'
  END as exists_in,
  au.id as auth_id,
  u.id as users_id
FROM auth.users au
FULL OUTER JOIN users u ON au.id = u.id
ORDER BY exists_in, email;

-- 6. Check for deleted/soft-deleted users in auth
SELECT 
  id,
  email,
  deleted_at,
  'SOFT DELETED IN AUTH' as status
FROM auth.users
WHERE deleted_at IS NOT NULL;

-- 7. Summary report
SELECT 
  'Total in auth.users' as metric,
  COUNT(*)::text as value
FROM auth.users
UNION ALL
SELECT 
  'Total in users table' as metric,
  COUNT(*)::text as value
FROM users
UNION ALL
SELECT 
  'Ghost auth users (in auth but not users)' as metric,
  COUNT(*)::text as value
FROM auth.users au
LEFT JOIN users u ON au.id = u.id
WHERE u.id IS NULL
UNION ALL
SELECT 
  'Ghost app users (in users but not auth)' as metric,
  COUNT(*)::text as value
FROM users u
LEFT JOIN auth.users au ON u.id = au.id
WHERE au.id IS NULL
UNION ALL
SELECT 
  'Soft deleted in auth' as metric,
  COUNT(*)::text as value
FROM auth.users
WHERE deleted_at IS NOT NULL;

