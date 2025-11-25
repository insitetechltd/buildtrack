# Data Reset Guide for Testing

This guide explains how to reset all data in your BuildTrack app for testing purposes.

## Overview

Your app stores data in two places:
1. **Supabase Database** (Backend) - The source of truth
2. **AsyncStorage** (Local Device) - Cached data for offline access

## ✅ New Developer Settings Screen

I've created a **Developer Settings** screen that gives you easy access to reset tools directly in the app!

### How to Access

1. Open the app
2. Go to **Profile** (tap your avatar in the Dashboard)
3. Scroll down to the **Developer** section
4. Tap **Developer Settings**

### Available Tools

#### 📊 Data Statistics
- View counts of cached tasks, projects, users, and companies
- See exactly what's stored locally

#### 🔄 Sync Actions
- **Force Sync All Data** - Re-fetch everything from Supabase without clearing cache
- Useful when you want to refresh data without logging out

#### 🗑️ Clear Cache (Selective)
- **Clear Task Cache** - Remove cached tasks only, then re-sync from Supabase
- **Clear Project Cache** - Remove cached projects only, then re-sync
- **Clear User Cache** - Remove cached users only, then re-sync
- These keep you logged in and only clear specific data

#### 🔍 Debug Tools
- **View Storage Keys** - See all AsyncStorage keys currently stored
- Useful for debugging what's cached

#### ⚠️ Danger Zone
- **Clear All Local Data & Logout** - Nuclear option!
  - Wipes ALL local AsyncStorage data
  - Logs you out completely
  - Forces you to login again
  - **Does NOT affect Supabase database**
  - All data will be re-downloaded on next login

## 📋 Testing Workflows

### Scenario 1: Quick Data Refresh
**Use Case:** You updated data in Supabase and want to see changes immediately

1. Go to Developer Settings
2. Tap **Force Sync All Data**
3. Done! Data refreshed without logout

### Scenario 2: Clear Specific Cache
**Use Case:** Tasks seem out of sync, but projects are fine

1. Go to Developer Settings
2. Tap **Clear Task Cache**
3. Tasks will be cleared and re-synced from Supabase
4. You stay logged in

### Scenario 3: Complete Fresh Start
**Use Case:** Starting a new test cycle, want completely clean slate

1. Go to Developer Settings
2. Scroll to **Danger Zone**
3. Tap **Clear All Local Data & Logout**
4. Confirm the action
5. App will logout and clear everything
6. Login again with your credentials
7. All data will be fresh from Supabase

### Scenario 4: Reset Backend Data (Supabase)
**Use Case:** You want to clear the actual database, not just local cache

**Option A: Via Supabase Dashboard**
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Run these commands:

```sql
-- Clear all data (keeps table structure)
TRUNCATE TABLE task_updates CASCADE;
TRUNCATE TABLE task_read_status CASCADE;
TRUNCATE TABLE tasks CASCADE;
TRUNCATE TABLE user_project_assignments CASCADE;
TRUNCATE TABLE projects CASCADE;
TRUNCATE TABLE users CASCADE;
TRUNCATE TABLE companies CASCADE;

-- Or selectively keep certain data
-- Example: Keep companies and admin users
DELETE FROM task_updates;
DELETE FROM task_read_status;
DELETE FROM tasks;
DELETE FROM user_project_assignments;
DELETE FROM projects;
DELETE FROM users WHERE role != 'admin'; -- Keep admins
```

4. In the app, use Developer Settings → **Clear All Local Data & Logout**
5. Login again to start fresh

**Option B: Via Supabase Table Editor**
1. Go to Supabase Dashboard → Table Editor
2. Select each table
3. Delete rows manually or use filters
4. In the app, use Developer Settings → **Clear All Local Data & Logout**

## 🎯 Recommended Testing Procedure

For a complete reset and fresh testing session:

### Step 1: Clear Backend (if needed)
```sql
-- In Supabase SQL Editor
TRUNCATE TABLE task_updates CASCADE;
TRUNCATE TABLE task_read_status CASCADE;
TRUNCATE TABLE tasks CASCADE;
TRUNCATE TABLE user_project_assignments CASCADE;
TRUNCATE TABLE projects CASCADE;
-- Keep users and companies if you want to reuse accounts
```

### Step 2: Clear Local Data
1. Open BuildTrack app
2. Profile → Developer Settings
3. Tap **Clear All Local Data & Logout**
4. Confirm

### Step 3: Start Fresh
1. Login with your test account
2. Create new projects, tasks, etc.
3. Test your workflows

## 📝 Important Notes

### What Gets Cleared
- ✅ Local cache (AsyncStorage)
- ✅ Tasks, projects, users, companies (cached)
- ✅ Authentication state (you'll be logged out)
- ✅ Project selections, filters, preferences

### What Doesn't Get Cleared
- ❌ Supabase database (unless you manually clear it)
- ❌ User accounts in Supabase
- ❌ App installation

### Data Sync Behavior
- When you login after clearing, all data is re-downloaded from Supabase
- If Supabase has data, it will appear in the app
- If Supabase is empty, the app will be empty too

## 🔧 Technical Details

### AsyncStorage Keys Used
The app stores data in these keys:
- `buildtrack-auth` - Authentication state
- `buildtrack-tasks` - Tasks cache
- `buildtrack-users` - Users cache  
- `buildtrack-projects` - Projects cache
- `buildtrack-companies` - Companies cache
- `buildtrack-project-filter` - Project selection and filters
- `buildtrack-theme` - Dark/light mode preference
- `buildtrack-language` - Language preference

### Cache Behavior
- **Persistent**: Data persists across app restarts
- **Zustand Persist**: Uses Zustand middleware to sync state with AsyncStorage
- **Optimistic Updates**: Some actions update local cache immediately, then sync to backend

## 🚨 Troubleshooting

### "Data not updating after clearing cache"
- Make sure you're connected to the internet
- Check Supabase connection status in Profile screen
- Try **Force Sync All Data** after clearing

### "App crashes after clearing data"
- This shouldn't happen, but if it does:
- Force close the app
- Reopen and try again
- If persistent, delete and reinstall the app

### "Can't login after clearing data"
- Make sure your user account still exists in Supabase
- Check if you're using the correct credentials
- Verify Supabase connection

### "Old data still showing"
- Try logging out and back in
- Use **Clear All Local Data & Logout** instead of selective clears
- Check if data was actually deleted from Supabase

## 📱 Quick Reference

| Action | Keeps Login | Affects Supabase | Use When |
|--------|-------------|------------------|----------|
| Force Sync All | ✅ Yes | ❌ No | Quick refresh needed |
| Clear Task Cache | ✅ Yes | ❌ No | Tasks out of sync |
| Clear Project Cache | ✅ Yes | ❌ No | Projects out of sync |
| Clear User Cache | ✅ Yes | ❌ No | Users out of sync |
| Clear All & Logout | ❌ No | ❌ No | Complete fresh start |
| Supabase SQL Clear | N/A | ✅ Yes | Reset backend data |

## 🎉 That's It!

You now have complete control over your test data. The Developer Settings screen makes it easy to reset and refresh data without leaving the app.

For any issues or questions, check the troubleshooting section or contact the development team.

---

**Last Updated:** November 15, 2024
**Version:** 1.0


