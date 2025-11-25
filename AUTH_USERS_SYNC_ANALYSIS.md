# Auth.users and Users Table Sync Analysis

## Current Sync Mechanism

### How It Works Now

The synchronization between `auth.users` (Supabase Auth) and the `users` table (application data) is **manually handled in application code** during registration:

**Location**: `src/state/authStore.supabase.ts` (lines 220-310)

**Process**:
1. User registers via `supabase.auth.signUp()` → Creates record in `auth.users`
2. Application code then manually inserts into `users` table using the same `id`:
   ```typescript
   const { error: userError } = await supabase
     .from('users')
     .insert({
       id: authData.user.id,  // Uses the same ID from auth.users
       name: data.name,
       email: data.email || `${data.phone}@buildtrack.local`,
       phone: data.phone,
       company_id: data.companyId,
       position: data.position,
       role: data.role || 'worker',
       is_pending: data.isPending ?? false,
     });
   ```

### Problems with Current Approach

1. **No Automatic Sync**: If registration fails after creating `auth.users` but before creating `users` record, they get out of sync
2. **Manual Creation Bypass**: If a user is created directly in `auth.users` (via Supabase Dashboard), no corresponding `users` record is created
3. **Deletion Mismatch**: If a user is deleted from `auth.users`, the `users` record might remain
4. **Race Conditions**: If multiple registration attempts happen simultaneously, sync can fail
5. **No Update Sync**: Changes to `auth.users` (like email updates) don't automatically sync to `users` table

## Recommended Solution: Database Trigger

The best practice is to use a **PostgreSQL trigger** that automatically creates a `users` record whenever a new user is created in `auth.users`.

### Benefits

- ✅ **Automatic**: No manual code needed
- ✅ **Reliable**: Runs at database level, can't be bypassed
- ✅ **Atomic**: Part of the same transaction
- ✅ **Consistent**: Always creates `users` record when `auth.users` record is created

### Implementation

Create a database trigger function that:
1. Listens for `INSERT` events on `auth.users`
2. Automatically creates a corresponding record in `users` table
3. Uses the user metadata from `auth.users.raw_user_meta_data`

## Migration Script

Here's the SQL to create the trigger:

```sql
-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (
    id,
    name,
    email,
    phone,
    company_id,
    position,
    role,
    is_pending,
    approved_by,
    approved_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Unknown'),
    COALESCE(NEW.email, NEW.raw_user_meta_data->>'phone' || '@buildtrack.local'),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    COALESCE((NEW.raw_user_meta_data->>'company_id')::uuid, NULL),
    COALESCE(NEW.raw_user_meta_data->>'position', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'worker'),
    COALESCE((NEW.raw_user_meta_data->>'is_pending')::boolean, false),
    CASE 
      WHEN (NEW.raw_user_meta_data->>'is_pending')::boolean = false THEN NEW.id
      ELSE NULL
    END,
    CASE 
      WHEN (NEW.raw_user_meta_data->>'is_pending')::boolean = false THEN NOW()
      ELSE NULL
    END
  )
  ON CONFLICT (id) DO NOTHING; -- Prevent duplicate inserts
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

## Alternative: Update Existing Registration Code

If you prefer to keep the application-level sync, you should:

1. **Add Transaction Support**: Wrap both operations in a transaction
2. **Add Rollback**: If `users` insert fails, delete the `auth.users` record
3. **Add Retry Logic**: Retry failed syncs
4. **Add Monitoring**: Log sync failures for manual intervention

## Checking for Sync Issues

To find users that are out of sync:

```sql
-- Find users in auth.users but not in users table
SELECT 
  au.id,
  au.email,
  au.raw_user_meta_data->>'name' as name,
  au.created_at
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.id
WHERE u.id IS NULL;

-- Find users in users table but not in auth.users
SELECT 
  u.id,
  u.email,
  u.name,
  u.created_at
FROM public.users u
LEFT JOIN auth.users au ON u.id = au.id
WHERE au.id IS NULL;
```

## Fixing Out-of-Sync Users

### Option 1: Manual Fix (One-off)

For existing out-of-sync users, you can manually create the missing records:

```sql
-- Create users table records for auth.users that don't have them
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
  COALESCE((au.raw_user_meta_data->>'company_id')::uuid, NULL),
  COALESCE(au.raw_user_meta_data->>'position', ''),
  COALESCE(au.raw_user_meta_data->>'role', 'worker'),
  COALESCE((au.raw_user_meta_data->>'is_pending')::boolean, false)
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.id
WHERE u.id IS NULL
ON CONFLICT (id) DO NOTHING;
```

### Option 2: Clean Up Orphaned Records

Remove `users` records that don't have corresponding `auth.users`:

```sql
-- Delete users table records that don't have auth.users
DELETE FROM public.users
WHERE id NOT IN (SELECT id FROM auth.users);
```

## Recommendations

1. **Implement Database Trigger**: Use the trigger approach for automatic, reliable sync
2. **Update Application Code**: After implementing trigger, you can simplify registration code (remove manual `users` insert, but keep it as a fallback)
3. **Add Monitoring**: Set up alerts for sync failures
4. **Regular Audits**: Periodically check for sync issues using the SQL queries above

## Current Status

- ❌ **No database trigger exists**
- ✅ **Manual sync in application code** (during registration only)
- ❌ **No automatic sync for updates or deletions**
- ❌ **No sync for users created via Supabase Dashboard**

## Next Steps

1. Review the trigger SQL above
2. Test in a development environment
3. Apply to production database
4. Update application code to handle trigger-created users
5. Run sync check queries to identify and fix existing issues


