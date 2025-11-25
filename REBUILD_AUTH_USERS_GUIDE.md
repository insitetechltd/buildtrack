# Rebuild auth.users from users Table - Guide

## Overview

This guide explains how to rebuild the `auth.users` table from scratch using the `users` table as the source of truth. This is useful when:
- `auth.users` and `users` tables are out of sync
- Multiple users are missing from `auth.users`
- You want to ensure all users in `users` table have corresponding `auth.users` records

## Why Not SQL?

You **cannot** directly rebuild `auth.users` using SQL because:
1. **Encrypted Passwords**: `auth.users` stores encrypted passwords that can't be created via SQL
2. **Security Mechanisms**: Supabase Auth has triggers, constraints, and security policies
3. **Admin API Required**: Creating/updating auth users requires the Supabase Admin API

## Solution: Node.js Script

I've created a Node.js script (`rebuild_auth_users_from_users.js`) that uses the Supabase Admin API to:
- ✅ Update existing `auth.users` records to match `users` table
- ✅ Create missing `auth.users` records for users that don't exist
- ✅ Set all passwords to "testing" (users should change after first login)
- ✅ Sync email, phone, and metadata fields

## Prerequisites

1. **Node.js installed** (for running the script)
2. **Dependencies installed**:
   ```bash
   npm install @supabase/supabase-js dotenv
   ```
3. **Environment variables** in `.env`:
   ```env
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

## How to Get Service Role Key

1. Go to [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Go to **Settings** → **API**
4. Find **`service_role`** key (⚠️ Keep this secret!)
5. Copy it to your `.env` file as `SUPABASE_SERVICE_ROLE_KEY`

## Running the Script

### Step 1: Navigate to Project Directory

```bash
cd "/Volumes/KooDrive/Insite App"
```

### Step 2: Run the Script

```bash
node rebuild_auth_users_from_users.js
```

### Step 3: Review Output

The script will:
1. Fetch all users from `public.users` table
2. Check existing `auth.users` records
3. For each user:
   - **If exists in auth.users**: Update email, phone, and metadata
   - **If missing from auth.users**: Create new auth user with password "testing"
4. Display a summary of actions taken

## What the Script Does

### For Existing Users (in both tables):
- Updates `email` to match `users.email`
- Updates `phone` to match `users.phone` (skips if duplicate)
- Updates `user_metadata` (name, role, company_id, position, is_pending, etc.)
- **Does NOT change password** (unless you modify the script)

### For Missing Users (in users table only):
- Creates new `auth.users` record with same `id` as `users.id`
- Sets email/phone from `users` table
- Sets password to "testing"
- Sets `email_confirm: true` (auto-confirms email)
- Populates `user_metadata` from `users` table

## Important Notes

### ⚠️ Password Handling

- **Existing users**: Passwords are **NOT changed** by default
- **New users**: Passwords are set to "testing"
- **Recommendation**: After running the script, use `reset_all_passwords.js` to set all passwords to "testing"

### ⚠️ Duplicate Phone Numbers

If multiple users share the same phone number:
- The script will attempt to update all of them
- Supabase may reject updates that violate unique constraints
- **Solution**: Fix duplicate phones in `users` table first using `FIX_DUPLICATE_PHONES.sql`

### ⚠️ Email Conflicts

If a user's email already exists in `auth.users` for a different ID:
- The script will try to update, but Supabase may reject it
- **Solution**: Fix email conflicts in `users` table first

## Example Output

```
=== Rebuilding auth.users from users table ===

📋 Step 1: Fetching all users from public.users table...
✅ Found 15 users in public.users table.

📋 Step 2: Checking existing auth.users records...
✅ Found 12 existing auth.users records.

📋 Step 3: Processing users...

🔄 Updating auth.users for: admin@buildtrack.com (ID: abc-123)
   ✅ Updated successfully
➕ Creating auth.users for: newuser@example.com (ID: def-456)
   ✅ Created successfully (temp password set)
   ✅ Password set to "testing"

=== Summary ===
✅ Updated: 12 users
➕ Created: 3 users
⏭️  Skipped: 0 users
❌ Errors: 0 users

✅ Rebuild complete!
```

## Troubleshooting

### Error: "duplicate key value violates unique constraint"

**Cause**: Duplicate phone numbers or emails in `users` table

**Solution**:
1. Run `FIX_DUPLICATE_PHONES.sql` to identify duplicates
2. Fix duplicates in `users` table
3. Re-run the rebuild script

### Error: "Supabase credentials not found"

**Cause**: Missing environment variables

**Solution**:
1. Check `.env` file exists
2. Verify `EXPO_PUBLIC_SUPABASE_URL` is set
3. Verify `SUPABASE_SERVICE_ROLE_KEY` is set
4. Restart terminal/IDE to reload environment variables

### Error: "User already exists"

**Cause**: User exists in `auth.users` but with different ID

**Solution**:
1. Check `DIAGNOSE_LOGIN_ISSUE.sql` for the specific user
2. Manually fix the ID mismatch
3. Or delete the conflicting `auth.users` record (use with caution!)

## After Running the Script

1. **Test Login**: Try logging in with a few users using password "testing"
2. **Reset All Passwords** (optional):
   ```bash
   node reset_all_passwords.js
   ```
3. **Verify Sync**: Run `COMPARE_AUTH_USERS_TABLE.sql` to verify sync status
4. **Fix Remaining Issues**: Address any errors reported by the script

## Alternative: Incremental Approach

If you prefer to fix issues incrementally:

1. **First**: Run `FIX_AUTH_USERS_FROM_USERS_TABLE.sql` (Step 1, Step 1.5, Step 2) to update existing records
2. **Then**: Run `rebuild_auth_users_from_users.js` to create missing records
3. **Finally**: Run `reset_all_passwords.js` to standardize passwords

## Safety

- ✅ **Read-only for users table**: Script only reads from `users`, doesn't modify it
- ✅ **Idempotent**: Can be run multiple times safely
- ✅ **Non-destructive**: Updates existing records, doesn't delete anything
- ⚠️ **Password changes**: New users get "testing" password (existing users keep their passwords)

## Next Steps

After rebuilding `auth.users`:

1. ✅ Test login for a few users
2. ✅ Run `COMPARE_AUTH_USERS_TABLE.sql` to verify sync
3. ✅ Set up the database trigger (`SYNC_AUTH_USERS_TRIGGER.sql`) to prevent future sync issues
4. ✅ Have users change their passwords after first login


