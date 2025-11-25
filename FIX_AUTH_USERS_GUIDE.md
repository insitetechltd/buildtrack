# Fix auth.users Records Using users Table

## Overview

This script fixes records in `auth.users` by using the `users` table as the definitive source of truth.

## How to Use

1. **Open Supabase SQL Editor**
   - Go to your Supabase Dashboard
   - Navigate to **SQL Editor**

2. **Run the Script**
   - Copy the contents of `FIX_AUTH_USERS_FROM_USERS_TABLE.sql`
   - Paste into SQL Editor
   - Click **Run**

## What It Does

### Step 1: Identify Issues
Shows all users with mismatches between `users` table and `auth.users`:
- Missing from auth.users
- Email mismatches
- Phone mismatches
- Name mismatches
- Role mismatches

### Step 2: Update auth.users
Updates all fields in `auth.users` to match `users` table:
- `email` - Updates to match users table
- `phone` - Updates to match users table
- `raw_user_meta_data` - Updates name, role, company_id, position, is_pending

### Step 3: Verify Fixes
Shows verification that fixes were applied correctly.

### Step 4: Find Missing Users
Lists users that exist in `users` table but NOT in `auth.users`.
**Note**: These cannot be created via SQL - must use Supabase Admin API.

### Step 5: Summary Report
Shows overall statistics of sync status.

## Important Notes

### What Can Be Fixed via SQL:
- ✅ Email in auth.users
- ✅ Phone in auth.users
- ✅ User metadata (name, role, company_id, etc.)

### What Cannot Be Fixed via SQL:
- ❌ Password (must use Admin API)
- ❌ Creating new auth.users records (must use Admin API)
- ❌ Email confirmation status (must use Admin API)

### For Missing auth.users Records:

If a user exists in `users` table but not in `auth.users`, you need to:

1. **Use Supabase Admin API** (recommended):
   ```bash
   node create_missing_auth_user.js <user_id>
   ```

2. **Or use Supabase Dashboard**:
   - Go to Authentication → Users
   - Click "Add User"
   - Enter email and set password
   - The trigger will create the users table record (if trigger is set up)

## Running Individual Steps

You can run each step separately:

### Just See Issues (No Updates):
```sql
-- Run only Step 1
SELECT 
  u.id,
  u.email as users_email,
  au.email as auth_email,
  CASE 
    WHEN au.id IS NULL THEN 'MISSING FROM AUTH.USERS'
    WHEN au.email != u.email THEN 'EMAIL MISMATCH'
    ELSE 'OK'
  END as issue_type
FROM public.users u
LEFT JOIN auth.users au ON u.id = au.id
WHERE au.id IS NULL OR au.email != u.email;
```

### Just Update (No Verification):
```sql
-- Run only Step 2
UPDATE auth.users au
SET 
  email = COALESCE(u.email, au.email),
  phone = COALESCE(u.phone, au.phone),
  raw_user_meta_data = jsonb_build_object(
    'name', u.name,
    'role', u.role,
    'company_id', u.company_id::text,
    'position', u.position,
    'is_pending', u.is_pending
  )
FROM public.users u
WHERE au.id = u.id;
```

## Troubleshooting

### Error: "permission denied for table auth.users"
- You need to use the **service role key** (admin access)
- Regular anon key doesn't have permission to update auth.users
- Use Supabase Dashboard SQL Editor (has admin access) or use Admin API

### Error: "syntax error"
- Make sure you're running in Supabase SQL Editor
- Some SQL clients don't support all PostgreSQL features
- Try running one step at a time

### Updates Not Working
- Check if you have the correct permissions
- Verify the WHERE clause is matching records
- Run Step 1 first to see what will be updated

## Expected Results

After running the script:
- ✅ All synced users should have matching email, phone, and metadata
- ✅ Summary report should show 0 email_mismatches and phone_mismatches
- ⚠️ Users missing from auth.users will still be listed (need Admin API to create)

## Next Steps

1. **Run the fix script** → Updates auth.users to match users table
2. **Check for missing users** → Use Admin API to create missing auth.users records
3. **Set up trigger** → Use `SYNC_AUTH_USERS_TRIGGER.sql` to prevent future issues
4. **Test login** → Try logging in with fixed users


