# Login Lookup Fields Summary

## Quick Answer

**Fields used for login identification:**

1. **For Email Login**: `email` field in `auth.users` table
2. **For Phone Login**: `phone` field in `users` table → then `email` field in `auth.users`
3. **For User Data**: `id` field (UUID) in `users` table (after authentication)

## Detailed Breakdown

### Email Login Flow

```
User Input: "admin@buildtrack.com"
    ↓
Step 1: Lookup in auth.users by email
    Table: auth.users
    Field: email
    Query: WHERE email = 'admin@buildtrack.com'
    ↓
Step 2: Authenticate with password
    Table: auth.users
    Field: email + password
    ↓
Step 3: Fetch user data by ID
    Table: users
    Field: id (UUID from auth.users)
    Query: WHERE id = <auth_user_id>
```

**Fields Used**:
- `auth.users.email` - Primary lookup for authentication
- `users.id` - Secondary lookup for user profile data

### Phone Login Flow

```
User Input: "12345678"
    ↓
Step 1: Lookup email from users table by phone
    Table: users
    Field: phone
    Query: WHERE phone = '12345678'
    Returns: email
    ↓
Step 2: Use returned email to lookup in auth.users
    Table: auth.users
    Field: email
    Query: WHERE email = <returned_email>
    ↓
Step 3: Authenticate with password
    Table: auth.users
    Field: email + password
    ↓
Step 4: Fetch user data by ID
    Table: users
    Field: id (UUID from auth.users)
    Query: WHERE id = <auth_user_id>
```

**Fields Used**:
- `users.phone` - Initial lookup to get email
- `users.email` - Retrieved from phone lookup
- `auth.users.email` - Primary lookup for authentication
- `users.id` - Secondary lookup for user profile data

## Critical Lookup Points

| Lookup Step | Table | Field | Purpose | Failure Impact |
|-------------|-------|-------|---------|----------------|
| **Email Login** |
| 1. Auth | `auth.users` | `email` | Find user for authentication | ❌ Login fails |
| 2. User Data | `users` | `id` | Get user profile | ❌ Login fails |
| **Phone Login** |
| 1. Phone → Email | `users` | `phone` | Get email from phone | ❌ Login fails |
| 2. Auth | `auth.users` | `email` | Find user for authentication | ❌ Login fails |
| 3. User Data | `users` | `id` | Get user profile | ❌ Login fails |

## Common Failure Scenarios

### ❌ Failure 1: User Not in `users` Table
**Symptom**: "Error fetching user data" or "Phone number not found"

**Cause**: User exists in `auth.users` but not in `users` table

**Lookup Failing**: `users.id` lookup (Step 3/4)

**Fix**: Create user record in `users` table with matching `id`

### ❌ Failure 2: Email Mismatch
**Symptom**: "Invalid login credentials" when using phone login

**Cause**: Phone exists in `users` table, but email doesn't match `auth.users`

**Lookup Failing**: `auth.users.email` lookup (Step 2)

**Fix**: Ensure email in `users` table matches email in `auth.users`

### ❌ Failure 3: Phone Not Found
**Symptom**: "Phone number not found or has no email"

**Cause**: Phone number doesn't exist in `users` table

**Lookup Failing**: `users.phone` lookup (Step 1)

**Fix**: Add phone number to `users` table or use email login

### ❌ Failure 4: Wrong Password
**Symptom**: "Invalid login credentials"

**Cause**: Password doesn't match

**Lookup Failing**: Password verification in `auth.users`

**Fix**: Reset password using `reset_single_user_password.js`

## For `admin@buildtrack.com` Specifically

### Check These Fields:

1. **`auth.users.email`** = `'admin@buildtrack.com'` ✅ Must exist
2. **`auth.users` password** = `'testing'` ✅ Must match
3. **`users.id`** = Same UUID as `auth.users.id` ✅ Must match
4. **`users.email`** = `'admin@buildtrack.com'` ✅ Should match (optional)
5. **`users.is_pending`** = `false` ✅ Must be false

### Diagnostic Query:

```sql
-- Check all lookup fields for admin@buildtrack.com
SELECT 
  'auth.users' as source,
  au.id,
  au.email,  -- ← Used for authentication
  au.email_confirmed_at IS NOT NULL as confirmed
FROM auth.users au
WHERE au.email = 'admin@buildtrack.com'

UNION ALL

SELECT 
  'users table' as source,
  u.id,  -- ← Used to fetch user data after auth
  u.email,
  u.is_pending as confirmed
FROM public.users u
WHERE u.email = 'admin@buildtrack.com' OR u.id IN (
  SELECT id FROM auth.users WHERE email = 'admin@buildtrack.com'
);
```

## Key Insight

**The login process requires successful lookups in this order:**

1. **Email Login**:
   - ✅ `auth.users.email` → Authenticate
   - ✅ `users.id` → Get user data

2. **Phone Login**:
   - ✅ `users.phone` → Get email
   - ✅ `auth.users.email` → Authenticate  
   - ✅ `users.id` → Get user data

**If ANY lookup fails, the entire login fails.**

The most common issue is the **final lookup** (`users.id`) failing because the user doesn't exist in the `users` table even though they authenticated successfully in `auth.users`.


