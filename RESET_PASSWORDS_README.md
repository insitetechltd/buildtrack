# Reset All User Passwords to "testing"

This guide explains how to reset all user passwords to "testing" in your Supabase database.

## ⚠️ WARNING

This will change **ALL** user passwords to "testing". Make sure this is what you want before proceeding!

## Methods

### Method 1: Using Node.js Script (Recommended)

This is the easiest and safest method.

#### Prerequisites
1. Node.js installed
2. Supabase Service Role Key (Admin key)

#### Steps

1. **Install dependencies:**
   ```bash
   npm install @supabase/supabase-js dotenv
   ```
   
   Note: `dotenv` is needed to load your existing `.env` file

2. **Add Service Role Key to your `.env` file:**
   
   Your `.env` file already has:
   - `EXPO_PUBLIC_SUPABASE_URL` ✅ (already exists)
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY` ✅ (already exists)
   
   You need to **add** the service role key:
   ```
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```
   
   **How to get the Service Role Key:**
   - Go to Supabase Dashboard
   - Navigate to **Settings** → **API**
   - Find the **"service_role"** key (NOT the anon key)
   - Copy it and add to your `.env` file
   - ⚠️ **Keep this key secret!** It has admin access and should never be committed to git

3. **Run the script:**
   ```bash
   node reset_all_passwords.js
   ```
   
   The script will automatically:
   - Load your existing `EXPO_PUBLIC_SUPABASE_URL` from `.env`
   - Use the `SUPABASE_SERVICE_ROLE_KEY` you just added
   - Validate that both are present before running

5. **Verify:**
   - Try logging in with any user account using password "testing"
   - All users should now be able to log in with this password

---

### Method 2: Using Supabase Dashboard (Manual)

This method is slower but doesn't require code.

1. Go to Supabase Dashboard
2. Navigate to **Authentication** > **Users**
3. For each user:
   - Click on the user
   - Click "Reset Password" or "Update User"
   - Set password to "testing"
   - Save

---

### Method 3: Using Supabase CLI

If you have Supabase CLI set up:

1. Create a migration file or use the SQL editor
2. Note: Direct SQL updates to `auth.users` encrypted_password are complex
3. Better to use the Admin API method above

---

### Method 4: Using Supabase SQL Editor (Not Recommended)

Direct SQL updates require knowing the exact bcrypt hash format, which is complex and error-prone. The Node.js script method is much safer.

---

## Troubleshooting

### Error: "Invalid API key"
- Make sure you're using the **service_role** key, not the **anon** key
- The service_role key is found in Settings > API > service_role

### Error: "Permission denied"
- You must use the service_role key (admin key)
- The anon key doesn't have permission to update user passwords

### Error: "Rate limit exceeded"
- The script includes a small delay between updates
- If you still get rate limits, increase the delay in the script (line with `setTimeout`)

### Some users failed to update
- Check the error messages in the console
- Some users might be deleted or have special status
- Re-run the script - it will skip already updated users

---

## Security Notes

1. **After resetting passwords:**
   - Inform all users that their passwords have been reset
   - Encourage them to change their passwords immediately
   - Consider requiring password change on next login

2. **Service Role Key:**
   - Never commit the service_role key to version control
   - Never expose it in client-side code
   - Only use it in secure server-side scripts

3. **Testing Environment:**
   - This is typically done in development/testing environments
   - Be very careful if running in production

---

## Verification

After running the script, verify by:

1. **Check console output:**
   - Should show "Successfully updated: X user(s)"
   - No errors should appear

2. **Test login:**
   - Try logging in with any user account
   - Use password: "testing"
   - Should successfully log in

3. **Check user count:**
   - The script will show how many users were found
   - Compare with your expected user count

---

## Files

- `reset_all_passwords.js` - Node.js script to reset passwords
- `RESET_ALL_PASSWORTS.sql` - SQL queries (for reference, not recommended for direct use)

