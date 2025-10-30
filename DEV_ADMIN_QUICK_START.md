# Dev Admin - Quick Start Guide

## 🎯 What You Got

I've created a complete Dev Admin Interface with:

### 1. **Dev Admin Screen** ✅
- Full-featured admin interface for testing and database management
- Location: `src/screens/DevAdminScreen.tsx`
- Accessible from Admin Dashboard

### 2. **Multi-Database Support** ✅
- Switch between production, testing, staging, and custom environments
- Add/remove environments on the fly
- Persistent configuration across app restarts
- Location: `src/state/databaseConfigStore.ts`

### 3. **Testing Utilities** ✅
- Generate mock tasks (50 at a time)
- Cleanup test data
- Reset entire database
- Seed with sample data
- Run comprehensive test suite
- Health monitoring
- Location: `src/utils/databaseUtils.ts`

### 4. **Navigation Integration** ✅
- Added to Admin Dashboard as "Dev Admin Tools" card
- Protected: Admin role only
- Updated: `src/navigation/AppNavigator.tsx` & `src/screens/AdminDashboardScreen.tsx`

---

## 🚀 Quick Access

### To Access Dev Admin:
1. **Login as Admin**
2. Go to **Admin Dashboard**
3. Click **"Dev Admin Tools"** (red card with code icon)

### To Create Testing Database:
1. Create new Supabase project at [supabase.com](https://supabase.com)
2. Name it `buildtrack-testing`
3. Run SQL schema from `scripts/database-schema-with-roles.sql`
4. Get API credentials (URL + anon key)
5. In Dev Admin, tap "Add" in Database Environments
6. Enter credentials and switch to testing environment

---

## 🛠️ Key Features

### Environment Management
```
✓ Switch between databases instantly
✓ Add new environments (testing, staging, dev)
✓ Remove custom environments
✓ Visual indicator of active environment
✓ Production safety warnings
```

### Testing Tools
```
✓ Generate Mock Tasks - Create 50 test tasks
✓ Cleanup Mock Tasks - Remove all [TEST] tasks
✓ Reset Database - Clear ALL data (dangerous!)
✓ Seed Database - Add sample projects and tasks
✓ Run Tests - Execute full test suite
✓ Health Check - Get database statistics
```

### Safety Features
```
✓ Confirmation dialogs for destructive operations
✓ Production environment warnings
✓ Cannot delete production environment
✓ Cannot delete active environment
✓ Loading states and error handling
```

---

## 📊 What Each Tool Does

### 1. Generate Mock Tasks
**Use Case:** Need test data quickly  
**Action:** Creates 50 tasks with `[TEST]` prefix  
**Safe:** Yes - easy to identify and cleanup

### 2. Cleanup Mock Tasks
**Use Case:** Remove test data  
**Action:** Deletes all tasks with `[TEST]` prefix  
**Safe:** Yes - only removes mock data

### 3. Reset Database ⚠️
**Use Case:** Start completely fresh  
**Action:** Deletes tasks, projects, assignments  
**Safe:** NO - requires confirmation, cannot undo

### 4. Seed Database
**Use Case:** Create baseline data  
**Action:** Adds 3 projects + 30 tasks  
**Safe:** Yes - adds data, doesn't delete

### 5. Run Comprehensive Tests
**Use Case:** Verify system health  
**Action:** Tests connection, auth, queries  
**Safe:** Yes - read-only operations

### 6. Database Health Check
**Use Case:** Quick status check  
**Action:** Shows stats (users, projects, tasks, response time)  
**Safe:** Yes - read-only

---

## 📁 Files Created/Modified

### New Files:
- `src/screens/DevAdminScreen.tsx` - Main admin interface
- `src/state/databaseConfigStore.ts` - Environment management
- `src/utils/databaseUtils.ts` - Testing utilities
- `DEV_ADMIN_GUIDE.md` - Complete documentation
- `DEV_ADMIN_QUICK_START.md` - This file

### Modified Files:
- `src/api/supabase.ts` - Added dynamic client switching
- `src/navigation/AppNavigator.tsx` - Added DevAdmin route
- `src/screens/AdminDashboardScreen.tsx` - Added Dev Admin button

---

## 🎓 Common Workflows

### Daily Development
```bash
1. Switch to 'development' environment
2. Generate mock tasks for testing
3. Build your feature
4. Cleanup mock tasks when done
```

### Feature Testing
```bash
1. Switch to 'testing' environment
2. Reset database (clean slate)
3. Seed database (baseline data)
4. Test your feature
5. Run comprehensive tests
```

### Setting Up Testing Database
```bash
1. Create Supabase project (buildtrack-testing)
2. Run database schema SQL
3. Add environment in Dev Admin UI
4. Switch to testing environment
5. Seed database
6. Ready to test!
```

---

## ⚠️ Important Notes

### Production Safety
- **Always confirm** before operations on production
- **Red warning banner** shows when on production
- Consider disabling Dev Admin in production builds

### Data Safety
- **Reset Database** is destructive and permanent
- Always backup before major operations
- Use testing/staging for experiments

### Environment Setup
- Environments persist across app restarts
- Stored locally in AsyncStorage
- Not synced across devices
- Can be re-added if lost

---

## 🔧 Troubleshooting

### Can't see Dev Admin button
→ Make sure you're logged in as **admin** role

### Environment switch fails
→ Check URL and key are correct  
→ Verify Supabase project is active  
→ Check network connection

### Mock tasks not generating
→ Need at least 1 project first  
→ Try "Seed Database" first

### Tests failing
→ Check database schema is up to date  
→ Verify RLS policies configured  
→ Ensure authenticated

---

## 📖 Full Documentation

For complete details, see: **[DEV_ADMIN_GUIDE.md](DEV_ADMIN_GUIDE.md)**

Topics covered:
- Detailed API reference
- Security best practices
- Advanced workflows
- Troubleshooting guide
- Tips & tricks

---

## ✅ You're All Set!

**To get started:**
1. Open the app
2. Login as admin
3. Navigate to Dev Admin Tools
4. Add your testing environment
5. Start testing!

**Need help?** Check **DEV_ADMIN_GUIDE.md** for detailed documentation.

---

**Version:** 1.0.0  
**Created:** October 29, 2025


