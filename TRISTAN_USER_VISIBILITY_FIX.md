# Tristan User Visibility Fix

## 🔍 Problem
New user "Tristan of Insite Tech" signed up but is not visible from the admin account.

## 🎯 Root Cause
The user approval system was implemented in the app code, but the database doesn't have the required `is_pending` column yet. This means:
1. Tristan was created as a pending user in the app
2. But the database doesn't track pending status
3. Admin screen can't find pending users

## ✅ Solution

### Step 1: Add Database Columns
Run this SQL in Supabase SQL Editor:

```sql
-- Add approval columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_pending BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Set all existing users as approved (including Tristan)
UPDATE users 
SET 
  is_pending = false,
  approved_at = COALESCE(approved_at, created_at)
WHERE is_pending IS NULL OR is_pending = true;
```

### Step 2: Verify Tristan is Now Visible
```sql
-- Check Tristan's status
SELECT 
  id,
  name,
  email,
  role,
  company_id,
  is_pending,
  approved_at,
  created_at
FROM users
WHERE name ILIKE '%tristan%';
```

### Step 3: Access Pending Users Screen in App

**For Future Pending Users:**

1. **Login as Admin**
2. **Tap Profile Icon** (top right)
3. **Look for "Pending Approvals"** menu item
   - Will show a red badge with count of pending users
4. **Tap "Pending Approvals"**
5. **Approve or Reject** pending users

## 🎨 What You'll See

### Profile Screen (Admin Only)
```
Settings
┌─────────────────────────────────────┐
│ 👥 Pending Approvals          🔴 2  │
│ 🌐 Language              English >  │
│ ☀️  Theme               Light Mode > │
│ 🔄 Reload Data                    > │
└─────────────────────────────────────┘
```

### Pending Users Screen
```
Pending User Approvals
┌─────────────────────────────────────┐
│ John Doe                            │
│ john@example.com                    │
│ (555) 123-4567                      │
│ Position: Foreman                   │
│                                     │
│ [✅ Approve]  [❌ Reject]           │
└─────────────────────────────────────┘
```

## 📊 Current Status

### Before Fix
- ❌ Tristan registered but not visible
- ❌ Database missing `is_pending` column
- ❌ Admin can't see pending users

### After Fix
- ✅ Database has approval columns
- ✅ Tristan marked as approved
- ✅ Tristan visible and can log in
- ✅ Admin can access "Pending Approvals" screen
- ✅ Future users will appear in pending list

## 🔄 How It Works Going Forward

### New User Joins Existing Company
1. User registers and selects "Join Existing"
2. User is created with `is_pending = true`
3. User **cannot log in** yet
4. Admin sees red badge on Profile screen
5. Admin opens "Pending Approvals"
6. Admin clicks "Approve"
7. User can now log in

### New User Creates New Company
1. User registers and selects "Create New"
2. User is created with `is_pending = false`
3. User becomes company admin
4. User can log in immediately

## 🗂️ Files Updated

### Navigation
- ✅ `src/navigation/AppNavigator.tsx`
  - Added `PendingUsersScreen` to Profile stack
  - Added navigation prop to ProfileScreen

### Profile Screen
- ✅ `src/screens/ProfileScreen.tsx`
  - Added "Pending Approvals" menu item (admin only)
  - Shows red badge with pending count
  - Added navigation to PendingUsersScreen

### Menu Component
- ✅ Updated `MenuOption` component
  - Added badge support
  - Red circular badge with count
  - Shows "99+" for counts over 99

## 📝 Quick Reference

### SQL to Check User Status
```sql
-- Count users by status
SELECT 
  is_pending,
  COUNT(*) as count
FROM users
GROUP BY is_pending;

-- List all users with status
SELECT 
  name,
  email,
  role,
  is_pending,
  approved_at
FROM users
ORDER BY created_at DESC;
```

### SQL to Manually Approve User
```sql
UPDATE users
SET 
  is_pending = false,
  approved_by = (SELECT id FROM users WHERE role = 'admin' LIMIT 1),
  approved_at = NOW()
WHERE name ILIKE '%tristan%';
```

## 🎯 Next Steps

1. ✅ Run the database migration SQL
2. ✅ Verify Tristan appears in user list
3. ✅ Test the "Pending Approvals" screen
4. ✅ Try registering a new test user
5. ✅ Verify new user appears in pending list
6. ✅ Test approve/reject functionality

## 📚 Related Documentation

- **`USER_APPROVAL_WORKFLOW.md`** - Complete workflow documentation
- **`COMPANY_SELECTION_FEATURE.md`** - Company selection feature details
- **`approve_tristan.sql`** - SQL script to approve Tristan

## 🐛 Troubleshooting

### Issue: Still can't see pending users after migration
**Solution:** 
1. Pull to refresh on Profile screen
2. Log out and log back in
3. Check that you're logged in as admin

### Issue: Badge not showing
**Solution:**
1. Verify users have `is_pending = true` in database
2. Check that user's `company_id` matches admin's `company_id`
3. Restart the app

### Issue: Navigation not working
**Solution:**
1. Reload JS in Expo: Press `r` in terminal
2. Clear cache: `npm start -- --clear`
3. Rebuild app if necessary

---

**Status:** ✅ Ready to test after running database migration
**Last Updated:** November 16, 2025

