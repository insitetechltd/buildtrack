# Troubleshooting Login Issues

## Problem: Can't log in with `admin@buildtrack.com` using password "testing"

### Quick Fix: Reset Password for Specific User

Run the single-user password reset script:

```bash
cd "/Volumes/KooDrive/Insite App"
node reset_single_user_password.js admin@buildtrack.com
```

This will:
1. Find the user in `auth.users`
2. Check if they exist in `users` table (sync check)
3. Reset their password to "testing"
4. Show detailed information about the user

### Common Issues and Solutions

#### 1. Password Not Reset Yet

**Symptom**: Login fails with "Invalid credentials"

**Solution**: Run the password reset script
```bash
# Reset all passwords
node reset_all_passwords.js

# OR reset just this user
node reset_single_user_password.js admin@buildtrack.com
```

#### 2. User Not in `auth.users`

**Symptom**: User doesn't exist in Supabase Auth

**Check**:
```bash
node reset_single_user_password.js admin@buildtrack.com
# Will show "User not found" if they don't exist
```

**Solution**: 
- User may need to register first
- Or create user via Supabase Dashboard → Authentication → Users → Add User

#### 3. User Not in `users` Table (Sync Issue)

**Symptom**: User exists in `auth.users` but login fails or user data is missing

**Check**: The reset script will warn you if this is the case

**Solution**: 
- Run the sync trigger SQL (see `SYNC_AUTH_USERS_TRIGGER.sql`)
- Or manually create the `users` record:
  ```sql
  INSERT INTO public.users (
    id,
    name,
    email,
    phone,
    company_id,
    role,
    is_pending
  )
  SELECT 
    au.id,
    COALESCE(au.raw_user_meta_data->>'name', 'Admin'),
    au.email,
    COALESCE(au.raw_user_meta_data->>'phone', ''),
    COALESCE((au.raw_user_meta_data->>'company_id')::uuid, NULL),
    COALESCE(au.raw_user_meta_data->>'role', 'admin'),
    false
  FROM auth.users au
  WHERE au.email = 'admin@buildtrack.com'
  ON CONFLICT (id) DO NOTHING;
  ```

#### 4. User Pending Approval

**Symptom**: Login succeeds but user is immediately logged out, or shows "Approval Pending"

**Check**: The reset script will show if `is_pending: true`

**Solution**: Approve the user:
```sql
UPDATE public.users
SET is_pending = false,
    approved_by = id,
    approved_at = NOW()
WHERE email = 'admin@buildtrack.com';
```

#### 5. Email Not Confirmed

**Symptom**: Login fails or requires email confirmation

**Check**: The reset script will show `Confirmed: No` if email is not confirmed

**Solution**: Confirm email via Supabase Dashboard or:
```sql
-- This requires service role key - use Supabase Dashboard instead
-- Go to Authentication → Users → Find user → Confirm Email
```

#### 6. Wrong Email Format

**Symptom**: User not found

**Check**: 
- Make sure email is exactly `admin@buildtrack.com` (case-sensitive in some cases)
- Check for typos
- Try using phone number if available

**Solution**: Use the exact email as stored in database

### Step-by-Step Troubleshooting

1. **Check if user exists**:
   ```bash
   node reset_single_user_password.js admin@buildtrack.com
   ```

2. **If user not found**:
   - Check Supabase Dashboard → Authentication → Users
   - Verify email spelling
   - User may need to register

3. **If user exists but login fails**:
   - Run password reset script
   - Check console logs for specific error messages
   - Verify password is "testing" (not "password123" or other)

4. **If login succeeds but user data missing**:
   - Check sync between `auth.users` and `users` table
   - Run sync trigger SQL
   - Manually create `users` record if needed

5. **If user is pending approval**:
   - Approve user in database or via admin interface
   - Check `is_pending` flag

### Manual Password Reset via Supabase Dashboard

1. Go to Supabase Dashboard
2. Navigate to **Authentication** → **Users**
3. Find `admin@buildtrack.com`
4. Click on the user
5. Click **"Reset Password"** or **"Update User"**
6. Set password to: `testing`
7. Save

### Verify Login

After resetting password:

1. **Try quick login shortcut**:
   - Tap "BuildTrack: Alex Administrator" button
   - Should log in automatically

2. **Try manual login**:
   - Email: `admin@buildtrack.com`
   - Password: `testing`

3. **Check console logs**:
   - Look for error messages
   - Check for "Login attempt" logs
   - Verify user data is loaded

### Still Not Working?

1. **Check environment variables**:
   - Ensure `.env` has correct Supabase credentials
   - Verify `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`

2. **Check network connection**:
   - Ensure device can reach Supabase
   - Check for firewall/proxy issues

3. **Check app logs**:
   - Look for specific error messages
   - Check if Supabase client is initialized

4. **Try different user**:
   - Test with another admin account
   - Verify if issue is user-specific or app-wide

### Quick Reference

```bash
# Reset all passwords
node reset_all_passwords.js

# Reset single user password
node reset_single_user_password.js admin@buildtrack.com

# Check user exists
node reset_single_user_password.js admin@buildtrack.com
```

### Files

- `reset_all_passwords.js` - Reset all user passwords
- `reset_single_user_password.js` - Reset single user password (NEW)
- `SYNC_AUTH_USERS_TRIGGER.sql` - Database trigger for auto-sync
- `AUTH_USERS_SYNC_ANALYSIS.md` - Detailed sync analysis


