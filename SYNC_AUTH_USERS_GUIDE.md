# Sync auth.users from users Table - Complete Guide

## 📋 Overview

This guide helps you maintain synchronization between the `public.users` table (source of truth) and the `auth.users` table (Supabase authentication).

## 🎯 When to Use This Script

Use the sync script when:

- 👤 Users can't log in despite being in the `users` table
- 🔄 You've manually updated user data in the `users` table
- 🐛 User information shows incorrectly in the app
- 🔍 You suspect sync issues between tables
- 🆕 After bulk user imports or migrations
- 📊 Regular maintenance/audits

## 🚀 Quick Start

### Step 1: Run Diagnostics Only

```bash
# Copy the script to a safe location
cp SYNC_AUTH_USERS_FROM_USERS_TABLE.sql ~/Desktop/sync_script_backup.sql

# Open Supabase SQL Editor
# https://supabase.com/dashboard/project/YOUR_PROJECT/sql

# Paste and run the script
# It will show diagnostics WITHOUT making changes
```

### Step 2: Review Reports

The script produces 6 diagnostic reports:

1. **Overall Sync Status** - High-level statistics
2. **All Sync Issues** - Detailed list of problems
3. **Duplicate Phones** - Phones used by multiple users
4. **Duplicate Emails** - Emails used by multiple users
5. **Orphaned Records** - Users in auth but not in users table
6. **Pending Users Status** - Approval status mismatches

### Step 3: Fix Issues

After reviewing diagnostics:

1. **Resolve duplicates manually** (if any)
2. **Uncomment the sync query** in Section 3.1
3. **Run the sync**
4. **Run verification queries** in Section 4

## 📖 Detailed Usage

### Running the Full Script

#### Option A: In Supabase SQL Editor (Recommended)

```sql
-- 1. Open Supabase Dashboard > SQL Editor
-- 2. Create new query
-- 3. Paste entire contents of SYNC_AUTH_USERS_FROM_USERS_TABLE.sql
-- 4. Click "Run"
```

#### Option B: Via psql Command Line

```bash
# If you have direct PostgreSQL access
psql -h your-db-host -U postgres -d your-database -f SYNC_AUTH_USERS_FROM_USERS_TABLE.sql
```

### Understanding the Reports

#### Report 1.1: Overall Sync Status

```
📈 OVERALL STATS
users_table_count: 25      # Total users in users table
auth_users_count: 24       # Total users in auth.users
synced_count: 23           # Users present in both tables
missing_from_auth: 2       # Users in users but not in auth
orphaned_in_auth: 1        # Users in auth but not in users
sync_percentage: 92.00     # Percentage in sync
```

**What to look for:**
- ✅ `sync_percentage` should be close to 100%
- ⚠️ `missing_from_auth` means users can't log in
- 👻 `orphaned_in_auth` means old/deleted users still in auth

#### Report 1.2: All Sync Issues

Shows each user with sync problems:

```
🔍 ISSUE DETAILS
user_id: abc-123
users_name: John Doe
users_email: john@example.com
auth_email: john.old@example.com
issue_type: ⚠️ EMAIL MISMATCH
```

**Issue Types:**
- ❌ `MISSING FROM AUTH.USERS` - Most critical, user can't log in
- ⚠️ `EMAIL MISMATCH` - Login will fail or use wrong email
- ⚠️ `PHONE MISMATCH` - Phone login won't work
- ⚠️ `NAME MISMATCH` - Display name incorrect
- ⚠️ `ROLE MISMATCH` - Permissions may be wrong
- ⚠️ `COMPANY MISMATCH` - User might see wrong data
- ⚠️ `POSITION MISMATCH` - Display info incorrect
- ⚠️ `PENDING STATUS MISMATCH` - Approval status wrong

#### Report 1.3: Duplicate Phone Numbers

```
📱 DUPLICATE PHONES
phone: +1234567890
duplicate_count: 2
names: John Doe, Jane Smith
```

**Action Required:**
You MUST resolve duplicates before syncing. Choose one:

```sql
-- Option 1: Clear phone from one user
UPDATE public.users 
SET phone = NULL 
WHERE id = 'user-id-to-clear';

-- Option 2: Change phone number
UPDATE public.users 
SET phone = '+1234567891' 
WHERE id = 'user-id-to-change';

-- Option 3: Delete duplicate user (if it's a mistake)
DELETE FROM public.users 
WHERE id = 'duplicate-user-id';
```

#### Report 1.4: Duplicate Emails

Similar to duplicate phones - MUST be resolved manually.

#### Report 1.5: Orphaned Records

Users in `auth.users` but not in `users` table.

**Options:**
1. **Add to users table** (if they should exist):
   ```sql
   -- Uncomment Section 3.3 in the script
   ```

2. **Delete from auth** (if they're old/invalid):
   ```sql
   -- ⚠️ CAUTION: This permanently deletes auth records
   DELETE FROM auth.users WHERE id = 'orphaned-user-id';
   ```

#### Report 1.6: Pending Users Status

Shows approval status mismatches:

```
⏳ PENDING USERS
name: New User
users_is_pending: true
auth_is_pending: false
status_check: ⚠️ Auth shows approved but users shows pending
```

### Running the Sync (Section 3)

After reviewing diagnostics and resolving duplicates:

#### Step 1: Locate Section 3.1

Find this block in the script:

```sql
/*
-- UNCOMMENT THIS BLOCK TO RUN THE SYNC
BEGIN;

UPDATE auth.users au
SET 
  email = u.email,
  ...
```

#### Step 2: Uncomment

Remove the `/*` and `*/` to enable:

```sql
-- UNCOMMENT THIS BLOCK TO RUN THE SYNC
BEGIN;

UPDATE auth.users au
SET 
  email = u.email,
  ...
```

#### Step 3: Run

Execute the script again. The sync will:

1. ✅ Update emails to match users table
2. ✅ Update phones (if no duplicates)
3. ✅ Update all metadata (name, role, company, etc.)
4. ✅ Update pending status
5. ✅ Show count of updated records

#### Step 4: Verify

The script automatically runs verification queries after sync.

### Verification (Section 4)

After syncing, review:

#### Report 4.1: Detailed Verification

Shows each user with match/mismatch indicators:

```
✔️ VERIFICATION
name: John Doe
email_match: ✅
phone_match: ✅
name_match: ✅
role_match: ✅
overall_status: ✅ FULLY SYNCED
```

#### Report 4.2: Final Statistics

```
📊 FINAL STATS
total_users: 25
fully_synced: 25
still_out_of_sync: 0
sync_percentage: 100.00%
```

**Goal:** `sync_percentage` should be 100%

## 🔧 Common Scenarios

### Scenario 1: User Can't Log In

**Symptoms:**
- User exists in `users` table
- User gets "Invalid credentials" error
- User is not pending

**Diagnosis:**
```sql
-- Check if user exists in auth.users
SELECT 
  u.email,
  u.name,
  CASE WHEN au.id IS NULL THEN 'MISSING FROM AUTH' ELSE 'EXISTS' END as auth_status
FROM public.users u
LEFT JOIN auth.users au ON u.id = au.id
WHERE u.email = 'problem-user@example.com';
```

**Solution:**
If `MISSING FROM AUTH`, user must be created via Supabase Admin API (cannot be done via SQL). Contact system admin or:

1. Delete user from `users` table
2. Have user re-register through the app

### Scenario 2: User Info Incorrect in App

**Symptoms:**
- User can log in
- Name, role, or company shows incorrectly

**Solution:**
1. Update `users` table with correct info
2. Run sync script
3. User must log out and log back in

```sql
-- Fix user info
UPDATE public.users
SET 
  name = 'Correct Name',
  role = 'manager',
  position = 'Project Manager'
WHERE email = 'user@example.com';

-- Then run sync script
```

### Scenario 3: Duplicate Phone Numbers

**Symptoms:**
- Sync script reports duplicate phones
- Phone updates fail

**Solution:**

```sql
-- Step 1: Find duplicates
SELECT phone, STRING_AGG(name, ', ') as users, COUNT(*)
FROM public.users
WHERE phone IS NOT NULL
GROUP BY phone
HAVING COUNT(*) > 1;

-- Step 2: Decide which user keeps the phone
-- Option A: Clear phone from older user
UPDATE public.users
SET phone = NULL
WHERE phone = '+1234567890'
  AND created_at < (
    SELECT MAX(created_at) 
    FROM public.users 
    WHERE phone = '+1234567890'
  );

-- Option B: Assign different phone numbers
UPDATE public.users
SET phone = '+1234567891'
WHERE id = 'user-to-change';
```

### Scenario 4: Bulk User Import

After importing users to `users` table:

```sql
-- Step 1: Check how many need sync
SELECT COUNT(*) as users_needing_auth
FROM public.users u
LEFT JOIN auth.users au ON u.id = au.id
WHERE au.id IS NULL;

-- Step 2: For these users, you'll need to:
-- Option A: Have them register through the app
-- Option B: Use Supabase Admin API to create auth records
-- Option C: Use the handle_new_user trigger (see below)
```

### Scenario 5: Regular Maintenance

Run monthly to catch drift:

```sql
-- Quick health check
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN au.id IS NULL THEN 1 END) as missing_from_auth,
  COUNT(CASE WHEN au.email != u.email THEN 1 END) as email_mismatches,
  ROUND(100.0 * COUNT(CASE WHEN au.id IS NOT NULL THEN 1 END) / COUNT(*), 2) as sync_pct
FROM public.users u
LEFT JOIN auth.users au ON u.id = au.id;
```

## 🛡️ Safety Features

The script includes multiple safety features:

### 1. Read-First Approach
- All UPDATE statements are commented out by default
- You must explicitly uncomment to run changes

### 2. Duplicate Protection
- Prevents phone updates if number already exists
- Shows detailed duplicate reports before sync

### 3. Transaction Support
- Uses `BEGIN` and `COMMIT` for rollback capability
- If error occurs, changes are rolled back

### 4. Verification Built-In
- Automatically shows verification after updates
- Easy to spot remaining issues

### 5. Detailed Logging
- Every change is logged
- Shows exactly what was updated

## ⚠️ Important Limitations

### Cannot Create auth.users via SQL

**Problem:** Users in `users` table but missing from `auth.users` cannot be created via SQL.

**Why:** Supabase `auth.users` requires:
- Password hashes
- JWT tokens
- Special authentication fields
- Only accessible via Supabase Admin API

**Solutions:**

#### Option 1: User Re-registers
```sql
-- Delete from users table
DELETE FROM public.users WHERE id = 'user-id';

-- Have user register again through app
```

#### Option 2: Implement Trigger (Recommended)

Create a trigger to auto-sync when users register:

```sql
-- Create sync function
CREATE OR REPLACE FUNCTION public.sync_user_to_auth()
RETURNS TRIGGER AS $$
BEGIN
  -- When a user is updated in users table,
  -- also update their auth.users record
  UPDATE auth.users
  SET 
    email = NEW.email,
    raw_user_meta_data = jsonb_build_object(
      'name', NEW.name,
      'role', NEW.role,
      'company_id', NEW.company_id::text,
      'position', NEW.position,
      'is_pending', NEW.is_pending
    )
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER on_user_updated
  AFTER UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_user_to_auth();
```

## 📊 Monitoring & Alerts

### Set Up Regular Checks

Create a saved query in Supabase to monitor sync health:

```sql
-- Save this as "Daily Sync Health Check"
SELECT 
  NOW() as check_time,
  COUNT(*) as total_users,
  COUNT(CASE WHEN au.id IS NULL THEN 1 END) as missing_from_auth,
  COUNT(CASE WHEN au.email != u.email THEN 1 END) as email_mismatches,
  COUNT(CASE WHEN u.is_pending = true THEN 1 END) as pending_users,
  ROUND(100.0 * COUNT(CASE WHEN au.id IS NOT NULL AND au.email = u.email THEN 1 END) / COUNT(*), 2) as sync_percentage
FROM public.users u
LEFT JOIN auth.users au ON u.id = au.id;
```

### Alert Conditions

Set up alerts if:
- `sync_percentage` drops below 95%
- `missing_from_auth` > 0
- `email_mismatches` > 0

## 🐛 Troubleshooting

### Issue: Script won't run

**Error:** "permission denied for schema auth"

**Solution:** Run as superuser or service_role:
```sql
-- Grant permissions (run once)
GRANT USAGE ON SCHEMA auth TO postgres;
GRANT SELECT, UPDATE ON auth.users TO postgres;
```

### Issue: Phone update fails

**Error:** "duplicate key value violates unique constraint"

**Cause:** Another user already has that phone number

**Solution:** See "Scenario 3: Duplicate Phone Numbers" above

### Issue: Changes not showing in app

**Cause:** App caches user data

**Solution:**
1. User must log out
2. User must log back in
3. Or: Reload app data

### Issue: Sync shows 100% but user can't log in

**Possible Causes:**
1. User is pending approval
2. Email not confirmed
3. Account disabled
4. Wrong password

**Diagnosis:**
```sql
SELECT 
  u.email,
  u.is_pending,
  au.email_confirmed_at IS NOT NULL as email_confirmed,
  au.banned_until,
  au.deleted_at
FROM public.users u
LEFT JOIN auth.users au ON u.id = au.id
WHERE u.email = 'problem-user@example.com';
```

## 📚 Related Documentation

- `FIX_AUTH_USERS_FROM_USERS_TABLE.sql` - Original fix script
- `DIAGNOSE_LOGIN_ISSUE.sql` - User-specific login diagnostics
- `AUTH_USERS_SYNC_ANALYSIS.md` - Deep dive into sync architecture
- `TROUBLESHOOT_LOGIN.md` - Login problem resolution guide
- `RESET_PASSWORDS_README.md` - Password reset procedures

## 🎯 Best Practices

### 1. Always Test in Development First
```sql
-- Create a test user
INSERT INTO public.users (id, email, name, role, company_id)
VALUES (gen_random_uuid(), 'test@example.com', 'Test User', 'worker', 'some-company-id');

-- Run sync script
-- Verify results
-- Then run in production
```

### 2. Backup Before Major Syncs
```bash
# Backup users table
pg_dump -h your-host -U postgres -d your-db -t public.users > users_backup.sql

# Backup auth.users (if you have access)
pg_dump -h your-host -U postgres -d your-db -t auth.users > auth_users_backup.sql
```

### 3. Schedule Regular Audits
- Run diagnostics weekly
- Run sync monthly (or as needed)
- Review logs for patterns

### 4. Document Manual Changes
When manually fixing issues:
```sql
-- Always add a comment explaining why
-- Example: Resolving duplicate phone from support ticket #123
UPDATE public.users SET phone = NULL WHERE id = 'user-id';
```

### 5. Communicate with Users
- Notify users before major syncs
- Tell users to log out/in after sync
- Have support ready for login issues

## 📞 Support

If you encounter issues:

1. **Check diagnostics first** - Run Section 1 reports
2. **Review this guide** - Check common scenarios
3. **Check related docs** - See "Related Documentation" section
4. **Create issue** - Document the problem with diagnostic output

## ✅ Checklist

Before running sync:
- [ ] Backed up database
- [ ] Ran diagnostics (Section 1)
- [ ] Resolved all duplicate phones/emails
- [ ] Reviewed sync query (Section 3.1)
- [ ] Tested in development (if possible)
- [ ] Notified relevant users
- [ ] Have rollback plan ready

After running sync:
- [ ] Ran verification (Section 4)
- [ ] Checked sync percentage (should be 100%)
- [ ] Tested login with sample user
- [ ] Verified app shows correct data
- [ ] Documented any remaining issues

---

**Last Updated:** November 18, 2024
**Version:** 1.0
**Maintained By:** Development Team


