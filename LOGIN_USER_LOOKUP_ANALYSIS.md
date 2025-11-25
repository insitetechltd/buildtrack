# Login User Lookup Analysis

## Login Flow Overview

The login process uses **multiple lookups** across different tables. Here's the complete flow:

## Step-by-Step Login Process

### Step 1: Input Detection
**Location**: `src/state/authStore.ts` lines 57-78

**Input**: User enters either:
- Email address (e.g., `admin@buildtrack.com`)
- Phone number (e.g., `12345678`)

**Detection Logic**:
```typescript
const phoneRegex = /^[\d\s\-\(\)\+]+$/;
const isPhoneNumber = phoneRegex.test(username.trim());
```

### Step 2: Phone Number Lookup (if phone entered)
**Location**: `src/state/authStore.ts` lines 62-78

**Query**: 
```typescript
// Lookup email from users table using phone
const { data: phoneUserData } = await supabase
  .from('users')
  .select('email')
  .eq('phone', username.trim())  // ← Uses 'phone' field
  .single();
```

**Fields Used**:
- **Table**: `users`
- **Lookup Field**: `phone`
- **Returns**: `email`

**Failure Points**:
- ❌ User not in `users` table → `phoneError` or `!phoneUserData`
- ❌ Phone number doesn't match → `phoneError`
- ❌ User has no email → `!phoneUserData.email`
- ❌ Phone format mismatch (spaces, dashes, etc.)

### Step 3: Supabase Auth Authentication
**Location**: `src/state/authStore.ts` lines 80-83

**Query**:
```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: email,  // ← Uses 'email' field from Step 2 or direct input
  password: password,
});
```

**Fields Used**:
- **Table**: `auth.users`
- **Lookup Field**: `email`
- **Authentication**: Password verification

**Failure Points**:
- ❌ Email not in `auth.users` → `error: "Invalid login credentials"`
- ❌ Wrong password → `error: "Invalid login credentials"`
- ❌ Email doesn't match between `users` table and `auth.users` → Auth fails

### Step 4: Fetch User Data from users Table
**Location**: `src/state/authStore.ts` lines 92-110

**Query**:
```typescript
// Fetch user details using user ID (from auth.users)
const { data: userData } = await supabase
  .from('users')
  .select('*')
  .eq('id', data.user.id)  // ← Uses 'id' field (UUID from auth.users)
  .single();
```

**Fields Used**:
- **Table**: `users`
- **Lookup Field**: `id` (UUID)
- **Source**: `data.user.id` from Step 3 (auth.users)

**Failure Points**:
- ❌ User not in `users` table → `userError` or `!userData`
- ❌ ID mismatch → User authenticated but can't find user data
- ❌ User is pending approval → Login blocked (line 117)

## Critical Lookup Fields Summary

| Step | Table | Lookup Field | Purpose | Failure Impact |
|------|-------|--------------|---------|----------------|
| 1 | N/A | `username` (input) | Detect email vs phone | N/A |
| 2 | `users` | `phone` | Get email for phone login | ❌ Login fails |
| 3 | `auth.users` | `email` | Authenticate user | ❌ Login fails |
| 4 | `users` | `id` (UUID) | Get user profile data | ❌ Login fails |

## Common Login Failure Scenarios

### Scenario 1: Phone Login - User Not in users Table
**Problem**: User enters phone number, but user doesn't exist in `users` table

**Flow**:
1. ✅ Phone detected
2. ❌ Query `users` table by `phone` → Not found
3. ❌ Login fails: "Phone number not found or has no email"

**Fix**: User must exist in `users` table with matching `phone` field

### Scenario 2: Email Login - User Not in auth.users
**Problem**: User enters email, but user doesn't exist in `auth.users`

**Flow**:
1. ✅ Email detected
2. ❌ `supabase.auth.signInWithPassword` → "Invalid login credentials"
3. ❌ Login fails

**Fix**: User must exist in `auth.users` with matching `email` and correct `password`

### Scenario 3: Auth Success but No users Table Record
**Problem**: User authenticates successfully but doesn't exist in `users` table

**Flow**:
1. ✅ Email detected
2. ✅ `supabase.auth.signInWithPassword` → Success
3. ❌ Query `users` table by `id` → Not found
4. ❌ Login fails: "Error fetching user data"

**Fix**: User must exist in `users` table with matching `id` (UUID)

### Scenario 4: Phone Login - Email Mismatch
**Problem**: Phone exists in `users` table, but email doesn't match `auth.users`

**Flow**:
1. ✅ Phone detected
2. ✅ Query `users` table by `phone` → Found email: `user@example.com`
3. ❌ `supabase.auth.signInWithPassword` with `user@example.com` → Not found in `auth.users`
4. ❌ Login fails: "Invalid login credentials"

**Fix**: Email in `users` table must match email in `auth.users`

### Scenario 5: User Pending Approval
**Problem**: User authenticates but is pending approval

**Flow**:
1. ✅ Email detected
2. ✅ `supabase.auth.signInWithPassword` → Success
3. ✅ Query `users` table by `id` → Found
4. ❌ Check `is_pending` → `true`
5. ❌ Login blocked: "PENDING_APPROVAL"

**Fix**: Approve user in `users` table (`is_pending = false`)

## For `admin@buildtrack.com` Specifically

### Check 1: Does user exist in `auth.users`?
```sql
SELECT id, email, phone, created_at, email_confirmed_at
FROM auth.users
WHERE email = 'admin@buildtrack.com';
```

**Expected**: Should return 1 row with the user's auth record

### Check 2: Does user exist in `users` table?
```sql
SELECT id, email, phone, name, role, is_pending
FROM public.users
WHERE email = 'admin@buildtrack.com';
```

**Expected**: Should return 1 row with the user's profile data

### Check 3: Do IDs match?
```sql
SELECT 
  au.id as auth_id,
  u.id as users_id,
  au.email as auth_email,
  u.email as users_email,
  CASE WHEN au.id = u.id THEN '✅ Match' ELSE '❌ Mismatch' END as id_match,
  CASE WHEN au.email = u.email THEN '✅ Match' ELSE '❌ Mismatch' END as email_match
FROM auth.users au
FULL OUTER JOIN public.users u ON au.email = u.email
WHERE au.email = 'admin@buildtrack.com' OR u.email = 'admin@buildtrack.com';
```

**Expected**: Both IDs should match (same UUID)

### Check 4: Is password correct?
- Password must be "testing" (if reset script was run)
- Password is stored in `auth.users` (encrypted, can't query directly)
- Use password reset script to verify: `node reset_single_user_password.js admin@buildtrack.com`

### Check 5: Is user pending approval?
```sql
SELECT id, email, name, is_pending, approved_by, approved_at
FROM public.users
WHERE email = 'admin@buildtrack.com';
```

**Expected**: `is_pending` should be `false` for admin users

## Diagnostic Queries

### Find All Login Issues for a User
```sql
-- Complete diagnostic for a specific email
SELECT 
  'auth.users' as source,
  au.id,
  au.email,
  au.phone,
  au.email_confirmed_at IS NOT NULL as email_confirmed,
  au.created_at
FROM auth.users au
WHERE au.email = 'admin@buildtrack.com'

UNION ALL

SELECT 
  'users table' as source,
  u.id,
  u.email,
  u.phone,
  u.is_pending as email_confirmed,  -- Using is_pending as placeholder
  u.created_at
FROM public.users u
WHERE u.email = 'admin@buildtrack.com';
```

### Check Phone Number Format Issues
```sql
-- Find users with phone number format mismatches
SELECT 
  u.id,
  u.email,
  u.phone,
  LENGTH(u.phone) as phone_length,
  REGEXP_REPLACE(u.phone, '[^0-9]', '', 'g') as phone_digits_only
FROM public.users u
WHERE u.phone IS NOT NULL
AND u.email = 'admin@buildtrack.com';
```

## Recommendations

1. **Always ensure both tables are synced**:
   - User must exist in both `auth.users` AND `users` table
   - IDs must match (same UUID)
   - Email should match (for email login)

2. **For phone login**:
   - Phone number must exist in `users` table
   - Phone number must have a corresponding email
   - That email must exist in `auth.users`

3. **For email login**:
   - Email must exist in `auth.users`
   - After auth, user must exist in `users` table with matching `id`

4. **Use the diagnostic script**:
   ```bash
   node reset_single_user_password.js admin@buildtrack.com
   ```
   This will show exactly where the lookup is failing.

## Key Takeaway

**The login process requires THREE successful lookups**:
1. ✅ Phone → Email lookup (if phone login) OR direct email
2. ✅ Email → Auth authentication (auth.users)
3. ✅ ID → User data lookup (users table)

**If ANY of these fail, login fails.**

The most common issue is **Step 3 failure**: User authenticates successfully but doesn't exist in `users` table (sync issue).


