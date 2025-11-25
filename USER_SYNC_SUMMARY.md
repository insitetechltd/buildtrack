# User Sync Summary - How to Use

## Overview

The `COMPARE_AUTH_USERS_TABLE.sql` file contains SQL queries to compare `auth.users` and `users` table and identify sync issues.

## How to Run

1. **Open Supabase Dashboard**
   - Go to your Supabase project
   - Navigate to **SQL Editor**

2. **Run the Queries**
   - Copy and paste each query section
   - Click **Run** to execute
   - Review the results

## Query Sections

### 1. Complete Comparison Table
**Purpose**: Side-by-side comparison of all users with sync status

**Shows**:
- ✅ SYNCED - User exists in both tables
- ⚠️ AUTH ONLY - User in auth.users but not in users table
- ❌ ORPHANED - User in users table but not in auth.users
- Data mismatches (email, phone, name, role differences)

**Use Case**: Get a complete overview of all users and their sync status

### 2. Summary Statistics
**Purpose**: Quick count of sync status

**Shows**:
- Total users in each table
- Number of synced users
- Number of users needing sync
- Number of data mismatches

**Use Case**: Quick health check of sync status

### 3. Users Missing from users Table
**Purpose**: Find users in auth.users that need to be synced

**Shows**: All users in auth.users that don't have a corresponding users table record

**Use Case**: Identify users that need to be added to users table

### 4. Orphaned Users
**Purpose**: Find users in users table without auth.users record

**Shows**: All users in users table that don't have a corresponding auth.users record

**Use Case**: Identify orphaned records that should be cleaned up

### 5. Data Mismatches
**Purpose**: Find users with conflicting data between tables

**Shows**: Users that exist in both tables but have different email, phone, name, or role

**Use Case**: Identify data inconsistencies that need to be resolved

### 6. Detailed User List
**Purpose**: Comprehensive view with all fields

**Shows**: All users with complete information from both tables, including company info

**Use Case**: Detailed analysis of all users

### 7. Quick Sync Check
**Purpose**: Check sync status for a specific user

**Shows**: Both auth.users and users table records for a specific email

**Use Case**: Troubleshoot login issues for a specific user

## Interpreting Results

### ✅ SYNCED
- User exists in both tables
- Should work correctly for login
- May still have data mismatches (check email_match, phone_match, etc.)

### ⚠️ AUTH ONLY
- User can authenticate but won't have app data
- Login may fail or user data will be missing
- **Fix**: Create users table record (see below)

### ❌ ORPHANED
- User record exists but can't authenticate
- Shouldn't normally exist
- **Fix**: Delete from users table or create auth.users record

## Fixing Sync Issues

### Fix: Create users table record for auth.users user

```sql
-- Replace with actual values from auth.users
INSERT INTO public.users (
  id,
  name,
  email,
  phone,
  company_id,
  position,
  role,
  is_pending
)
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data->>'name', 'Unknown'),
  COALESCE(au.email, au.raw_user_meta_data->>'phone' || '@buildtrack.local'),
  COALESCE(au.raw_user_meta_data->>'phone', ''),
  CASE 
    WHEN au.raw_user_meta_data->>'company_id' IS NOT NULL 
    THEN (au.raw_user_meta_data->>'company_id')::uuid
    ELSE NULL
  END,
  COALESCE(au.raw_user_meta_data->>'position', ''),
  COALESCE(au.raw_user_meta_data->>'role', 'worker'),
  COALESCE((au.raw_user_meta_data->>'is_pending')::boolean, false)
FROM auth.users au
WHERE au.id = 'USER_ID_HERE'  -- Replace with actual user ID
ON CONFLICT (id) DO NOTHING;
```

### Fix: Delete orphaned users table record

```sql
-- Only delete if you're sure the auth.users record doesn't exist
DELETE FROM public.users
WHERE id = 'USER_ID_HERE'  -- Replace with actual user ID
AND id NOT IN (SELECT id FROM auth.users);
```

### Fix: Resolve data mismatches

```sql
-- Update users table to match auth.users
UPDATE public.users u
SET 
  email = au.email,
  phone = COALESCE(au.phone, u.phone),
  name = COALESCE(au.raw_user_meta_data->>'name', u.name)
FROM auth.users au
WHERE u.id = au.id
AND (u.email != au.email OR COALESCE(u.phone, '') != COALESCE(au.phone, ''));
```

## Best Practices

1. **Run Summary Statistics First**: Get a quick overview
2. **Review Complete Comparison**: See all users and their status
3. **Fix Critical Issues**: Address AUTH ONLY users first (they can't use the app)
4. **Clean Up Orphans**: Remove orphaned records
5. **Resolve Mismatches**: Fix data inconsistencies
6. **Set Up Trigger**: Use `SYNC_AUTH_USERS_TRIGGER.sql` to prevent future issues

## Example Workflow

1. Run **Summary Statistics** → See 5 users need sync
2. Run **Users Missing from users Table** → See which 5 users
3. Run **Fix: Create users table record** for each user
4. Run **Summary Statistics** again → Verify all synced
5. Run **Data Mismatches** → Check for any remaining issues

## Notes

- The `id` field is the linking field (same UUID in both tables)
- No foreign key constraint exists (Supabase doesn't allow FKs to auth.users)
- Email and phone may differ if user updated one but not the other
- The trigger in `SYNC_AUTH_USERS_TRIGGER.sql` will prevent future sync issues


