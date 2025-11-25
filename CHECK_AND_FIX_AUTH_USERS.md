# Check and Fix auth.users Script

## Overview

This script uses the `users` table as the source of truth to check and fix records in `auth.users`. It identifies mismatches, updates existing records, and creates missing auth.users records.

## Features

- ✅ **Comprehensive Checking**: Identifies all types of mismatches between users table and auth.users
- ✅ **Automatic Fixes**: Updates existing records and creates missing ones
- ✅ **Detailed Reporting**: Provides clear summaries and detailed issue reports
- ✅ **Dry Run Mode**: Check issues without making changes
- ✅ **Safe Operations**: Handles duplicate phones, ID mismatches, and other edge cases

## Prerequisites

1. **Environment Variables**: Ensure your `.env` file contains:
   ```bash
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

2. **Service Role Key**: Get it from Supabase Dashboard → Settings → API → `service_role` key

   ⚠️ **WARNING**: The service role key bypasses Row Level Security. Never commit it to version control!

## Usage

### Basic Usage (Check and Fix)

```bash
node check_and_fix_auth_users.js
```

This will:
1. Check for all issues between users table and auth.users
2. Fix mismatches by updating auth.users records
3. Create missing auth.users records
4. Verify fixes were applied correctly

### Check Only (Dry Run)

```bash
node check_and_fix_auth_users.js --check-only
# or
node check_and_fix_auth_users.js --dry-run
```

This will only check for issues without making any changes. Useful for:
- Auditing current state
- Previewing what would be fixed
- Verifying sync status

### Fix Only (Skip Checks)

```bash
node check_and_fix_auth_users.js --fix-only
```

This skips the detailed check phase and goes straight to fixing. Useful when you already know there are issues.

## What It Checks

The script checks for the following mismatches:

1. **Missing Records**: Users in `users` table but not in `auth.users`
2. **Email Mismatches**: Different email addresses
3. **Phone Mismatches**: Different phone numbers
4. **Name Mismatches**: Different names in metadata
5. **Role Mismatches**: Different roles
6. **Metadata Mismatches**: 
   - `company_id`
   - `position`
   - `is_pending`
   - `approved_by`
   - `approved_at`
7. **Duplicate Phones**: Multiple users with the same phone number
8. **ID Mismatches**: Users that exist but with different IDs

## What It Fixes

### Updates Existing Records

For users that exist in both tables but have mismatches, the script updates:
- `email` → Matches users table
- `phone` → **Converts to E.164 format** (e.g., `55511111` → `+85255511111`) - Required by Supabase Auth
  - Converts 8-digit Hong Kong numbers to E.164 format automatically
  - Skips if phone already exists for another user
  - Keeps existing phone if conversion fails
- `user_metadata.name` → Matches users table
- `user_metadata.role` → Matches users table
- `user_metadata.company_id` → Matches users table
- `user_metadata.position` → Matches users table
- `user_metadata.is_pending` → Matches users table
- `user_metadata.approved_by` → Matches users table
- `user_metadata.approved_at` → Matches users table

### Creates Missing Records

For users that exist in `users` table but not in `auth.users`, the script:
- Creates new auth.users record with the same ID
- Sets email from users table
- **Converts phone to E.164 format** (e.g., `55511111` → `+85255511111`) - Required by Supabase Auth
  - Converts 8-digit Hong Kong numbers to E.164 format automatically
  - Creates user without phone if conversion fails
- Copies all metadata from users table
- Sets password to "testing" (users should change after first login)
- Auto-confirms email

## Output

The script provides detailed output:

### Check Phase
```
=== STEP 1: CHECKING FOR ISSUES ===

📋 Fetching users from public.users table...
✅ Found 25 users in public.users table.
📋 Fetching auth.users records...
✅ Found 23 auth.users records.

📊 ISSUE SUMMARY:
   Total users in users table: 25
   Total users in auth.users: 23
   Missing from auth.users: 2
   Email mismatches: 3
   Phone mismatches: 1
   ...
```

### Fix Phase
```
=== STEP 2: FIXING ISSUES ===

🔄 Updating: user@example.com (ID: abc123...)
   ✅ Updated successfully

➕ Creating: newuser@example.com (ID: def456...)
   ✅ Created successfully
   ✅ Password set to "testing"
```

### Summary
```
╔════════════════════════════════════════════════════════════╗
║  FINAL SUMMARY                                               ║
╚════════════════════════════════════════════════════════════╝

📊 CHECK RESULTS:
   Total users: 25
   Missing from auth: 2
   Email mismatches: 3
   ...

🔧 FIX RESULTS:
   Updated: 4
   Created: 2
   Skipped: 0
   Errors: 0
```

## Limitations

### Cannot Fix via Script

1. **ID Mismatches**: If a user exists in both tables but with different IDs, this requires manual intervention (merge or delete one)

2. **Duplicate Phones**: If multiple users have the same phone number, the script will skip updating phone to avoid conflicts

3. **Password Changes**: The script sets new users' passwords to "testing" but cannot change existing passwords (use `reset_all_passwords.js` for that)

### Requires Manual Intervention

- Users with ID mismatches (found by email/phone but different ID)
- Orphaned auth.users records (exist in auth.users but not in users table) - use SQL to clean up
- Complex merge scenarios

## Examples

### Example 1: Regular Sync Check

```bash
# Check current status
node check_and_fix_auth_users.js --check-only

# If issues found, fix them
node check_and_fix_auth_users.js
```

### Example 2: After Bulk Import

```bash
# After importing users, sync auth.users
node check_and_fix_auth_users.js
```

### Example 3: Verify After Manual Changes

```bash
# Check if manual changes are in sync
node check_and_fix_auth_users.js --check-only
```

## Troubleshooting

### Error: "Supabase credentials not found"

**Solution**: Ensure your `.env` file contains:
- `EXPO_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### Error: "permission denied"

**Solution**: Make sure you're using the **service_role** key, not the anon key. The service_role key is found in Supabase Dashboard → Settings → API.

### Error: "rate limit exceeded"

**Solution**: The script includes delays between operations, but if you have many users, you may need to run it in smaller batches or increase delays.

### Users Created But Can't Login

**Solution**: 
1. New users are created with password "testing"
2. They should change their password after first login
3. If login still fails, check email confirmation status

### Phone Number Conflicts

**Solution**: If multiple users have the same phone number:
1. The script will skip updating phones to avoid conflicts
2. Fix duplicate phones in the users table first
3. Then re-run the script

### Invalid Phone Number Format

**Solution**: The script automatically converts phone numbers to E.164 format:
- 8-digit numbers (e.g., `55511111`) → `+85255511111`
- Already E.164 format → Kept as-is
- Invalid formats → Skipped (keeps existing phone or creates without phone)

If you see "Invalid phone number format" errors:
1. Check the phone numbers in your users table
2. Ensure they're valid 8-digit Hong Kong numbers
3. The script will warn about phones that can't be converted

## Related Scripts

- `rebuild_auth_users_from_users.js` - Similar functionality, different approach
- `reset_all_passwords.js` - Reset passwords for all users
- `FIX_AUTH_USERS_FROM_USERS_TABLE.sql` - SQL-only approach (can't create users)

## Best Practices

1. **Run in Check Mode First**: Always run `--check-only` first to see what will be changed
2. **Backup First**: Consider backing up your database before running fixes
3. **Test in Dev**: Test the script in a development environment first
4. **Monitor Output**: Review the detailed output to catch any unexpected issues
5. **Regular Checks**: Run `--check-only` regularly to catch sync issues early

## Integration with Other Tools

This script complements:
- **SQL Scripts**: Use `FIX_AUTH_USERS_FROM_USERS_TABLE.sql` for SQL-only updates
- **Database Triggers**: Use `SYNC_AUTH_USERS_TRIGGER.sql` to prevent future sync issues
- **Password Reset**: Use `reset_all_passwords.js` to reset passwords after creating users

## Next Steps After Running

1. **Verify Login**: Test logging in with fixed/created users
2. **Set Up Trigger**: Implement `SYNC_AUTH_USERS_TRIGGER.sql` to prevent future issues
3. **Monitor**: Set up regular checks to catch sync issues early
4. **Document**: Document any manual interventions needed

