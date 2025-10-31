# 🚨 CRITICAL: Supabase Egress Issue - Root Cause Analysis

## The Problem

Supabase reports egress (bandwidth out) has maxed out the free plan due to high usage.

## Root Cause Identified

### 🔴 Issue #1: AGGRESSIVE POLLING (CRITICAL)

**File**: `src/utils/DataRefreshManager.tsx` (Line 138)

```typescript
// Set up periodic polling (every 30 seconds) for real-time feel
refreshInterval = setInterval(() => {
  if (AppState.currentState === 'active' && user) {
    triggerRefresh();  // Fetches ALL data!
  }
}, 30000); // 30 seconds ❌ WAY TOO FREQUENT
```

**What happens every 30 seconds:**
1. Fetches ALL tasks from database
2. Fetches ALL subtasks
3. Fetches ALL task updates (with photos URLs!)
4. Fetches ALL projects
5. Fetches ALL users
6. Fetches ALL project assignments

### 🔴 Issue #2: DUPLICATE SYNC MANAGERS

You have **TWO** data sync managers running:

1. **DataRefreshManager** (AppNavigator.tsx:449)
   - Polling: Every 30 seconds ❌
   - Fetches: Everything
   
2. **DataSyncManager** (exists but maybe not active)
   - Polling: Every 3 minutes
   - Fetches: Everything

**If both are running**: Syncing even more frequently!

### 🔴 Issue #3: FETCHING ALL DATA EVERY TIME

**Current** (`taskStore.supabase.ts` lines 87-107):
```typescript
// Fetches EVERY task in the database!
const { data: tasksData } = await supabase
  .from('tasks')
  .select('*')  // ❌ No filters, no limits
  .order('created_at', { ascending: false });

// Fetches EVERY subtask!
const { data: subTasksData } = await supabase
  .from('sub_tasks')
  .select('*');  // ❌ All subtasks

// Fetches EVERY task update!
const { data: taskUpdatesData } = await supabase
  .from('task_updates')
  .select('*');  // ❌ All updates (including all photo URLs!)
```

**No filtering by:**
- ❌ Company
- ❌ Project
- ❌ Date range
- ❌ User
- ❌ Pagination

## Egress Calculation

### Scenario: Development with 3 Simulators

**Assumptions:**
- 50 tasks in database
- 100 subtasks (2 per task average)
- 200 task updates (4 per task average, with photo URLs)
- 10 projects
- 20 users
- 30 project assignments

**Data per sync:**
- Tasks: 50 × 2KB = 100KB
- Subtasks: 100 × 2KB = 200KB
- Task Updates: 200 × 1KB = 200KB (text + photo URLs)
- Projects: 10 × 1KB = 10KB
- Users: 20 × 0.5KB = 10KB
- Assignments: 30 × 0.3KB = 9KB

**Total per sync: ~530KB**

### Egress Per Hour (Development)

**With 30-second polling:**
- Syncs per hour: 120 (every 30 seconds)
- Egress per hour: 530KB × 120 = **63.6 MB/hour**

**Per day (8 hours of dev):**
- Egress per day: 63.6 MB × 8 = **509 MB/day**

**With 3 simulators running:**
- Egress per day: 509 MB × 3 = **1.5 GB/day!** 🚨

**Supabase Free Tier Limit:**
- **2 GB/month total egress**

**Your usage:**
- 1.5 GB/day × 20 dev days = **30 GB/month** 🔥
- **15x over the limit!**

## Additional Egress Sources

### Photo Uploads (Development Testing)
- Each photo: 2-5 MB (before compression)
- Testing 10 uploads/day = 20-50 MB/day
- **Minor impact** compared to polling

### Pull-to-Refresh
- Users manually refreshing
- Same ~530KB per refresh
- Infrequent - not the main issue

### Multiple Developers/Simulators
If you have:
- 3 simulators running simultaneously
- Each polls every 30 seconds
- All fetch complete dataset

**Egress multiplies by 3x!**

## 🎯 Immediate Fixes

### Fix #1: Change Polling Interval (CRITICAL)

**File**: `src/utils/DataRefreshManager.tsx` (Line 138)

**Change from:**
```typescript
}, 30000); // 30 seconds - WAY TOO AGGRESSIVE
```

**Change to:**
```typescript
}, 5 * 60 * 1000); // 5 minutes - much more reasonable
```

**Impact:**
- Before: 120 syncs/hour
- After: 12 syncs/hour
- **Egress reduction**: 90% ✅
- From 1.5 GB/day to 150 MB/day

### Fix #2: Add Company Filtering (CRITICAL)

**File**: `src/state/taskStore.supabase.ts` (Lines 87-90)

**Change from:**
```typescript
const { data: tasksData } = await supabase
  .from('tasks')
  .select('*')
  .order('created_at', { ascending: false});
```

**Change to:**
```typescript
const { data: tasksData } = await supabase
  .from('tasks')
  .select('*')
  .eq('company_id', user.companyId)  // ✅ Only fetch user's company data
  .order('created_at', { ascending: false});
```

**Do the same for:**
- sub_tasks
- task_updates
- projects
- users
- user_project_assignments

**Impact:**
- Multi-tenant database: Only fetch YOUR company's data
- If you have 1 of 10 companies: **90% egress reduction** ✅

### Fix #3: Disable One Sync Manager

You have both:
- DataRefreshManager (30 sec polling)
- DataSyncManager (3 min polling)

**Pick one!** Remove or disable the other.

**Recommendation**: Use DataSyncManager (3 min) instead of DataRefreshManager (30 sec)

**File**: `src/navigation/AppNavigator.tsx` (Line 449)

**Change from:**
```typescript
import { DataRefreshManager } from "../utils/DataRefreshManager";
```

**Change to:**
```typescript
import { DataSyncManager } from "../utils/DataSyncManager";
```

**And:**
```typescript
<DataRefreshManager />  // ❌ Remove this
<DataSyncManager />     // ✅ Use this instead (3 min interval)
```

**Impact:**
- Reduces sync frequency from 30s to 3min
- **Egress reduction**: 83% ✅

### Fix #4: Development Mode Check

**File**: `src/utils/DataRefreshManager.tsx` or `DataSyncManager.tsx`

Add check to disable in development:

```typescript
// At top of file
const IS_DEVELOPMENT = __DEV__;
const POLLING_INTERVAL = IS_DEVELOPMENT 
  ? 10 * 60 * 1000  // 10 minutes in dev
  : 3 * 60 * 1000;   // 3 minutes in prod
```

**Impact:**
- Slower polling during development
- Production users get faster updates
- **Dev egress reduction**: 70% ✅

## Combined Impact

Applying ALL fixes:

| Metric | Before | After | Reduction |
|--------|--------|-------|-----------|
| Polling interval | 30 sec | 5 min | 90% ✅ |
| Data per sync | 530KB | 53KB (company filter) | 90% ✅ |
| Sync managers | 2 | 1 | 50% ✅ |
| Dev mode | Same as prod | Slower | 70% ✅ |

**Overall egress reduction:**
- Before: 1.5 GB/day (3 simulators)
- After: ~15 MB/day
- **Total reduction: 99%** 🎉

## Quick Egress Wins

### Immediate (5 minutes)

1. Change polling from 30s to 5min
2. Remove duplicate sync manager
3. **Egress drops by 95%**

### This Week (30 minutes)

1. Add company_id filtering to all fetch queries
2. Only fetch user's company data
3. **Egress drops another 90%**

### Optional (1 hour)

1. Add development mode slower polling
2. Implement incremental sync (only changed data)
3. Add pagination for large datasets

## Other Egress Sources to Monitor

### Photo URLs in Task Updates

**Currently**: task_updates table includes photo URLs
- Each URL: ~100 bytes
- 200 updates × 3 photos = 60KB just in URLs
- Fetched every 30 seconds!

**Impact**: Minor, but adds up

**Solution**: Already included in company filtering

### User Avatars / Company Logos

If you add these in the future:
- Fetch from Storage each time
- Can cause high egress

**Prevention**: 
- Use CDN URLs
- Cache in app
- Don't refetch every sync

## Recommended Final Configuration

### DataSyncManager Settings

```typescript
// For Development
const POLLING_INTERVAL = 10 * 60 * 1000; // 10 minutes
const MIN_REFRESH_INTERVAL = 5000; // 5 seconds

// For Production  
const POLLING_INTERVAL = 3 * 60 * 1000; // 3 minutes
const MIN_REFRESH_INTERVAL = 2000; // 2 seconds
```

### Fetch Query Example

```typescript
// Always filter by company!
const { data: tasksData } = await supabase
  .from('tasks')
  .select('*')
  .eq('company_id', user.companyId)  // ✅ Critical!
  .order('created_at', { ascending: false })
  .limit(100);  // Optional: pagination
```

## Monitoring

Add logging to track egress:

```typescript
const logEgressEstimate = (dataSize: number) => {
  const estimatedKB = (JSON.stringify(data).length / 1024).toFixed(2);
  console.log(`📊 [Egress] Fetched ~${estimatedKB} KB`);
};
```

## Priority Actions

### 🚨 DO IMMEDIATELY (Stop the bleeding)

1. **Change polling to 5 minutes** (DataRefreshManager.tsx:138)
2. **Remove duplicate sync manager** (Use only one)
3. **Test egress drops**

### ⚠️ DO THIS WEEK (Permanent fix)

1. **Add company_id filters** to all fetchTasks/fetchProjects/fetchUsers
2. **Use RLS** to enforce filtering at database level
3. **Run the SQL migration** (includes RLS policies)

### 💡 DO NEXT MONTH (Optimization)

1. Implement incremental sync (only fetch changes)
2. Add pagination
3. Use the RPC function from migration (1 query vs 3+)

## Expected Results

### After Immediate Fixes
- Egress: 1.5 GB/day → 150 MB/day
- **Within free tier!** ✅

### After This Week Fixes
- Egress: 150 MB/day → 15 MB/day  
- **Comfortable margin** ✅

### After Next Month
- Egress: 15 MB/day → 5 MB/day
- **Optimal** ✅

## Development Best Practices

### During Development

1. **Use fewer simulators** (1-2 instead of 3)
2. **Close simulators when not testing**
3. **Disable polling during lunch/breaks**
4. **Use local mock data for UI work**

### Production

1. Keep 3-5 minute polling
2. Company filtering always on
3. Monitor egress in Supabase dashboard
4. Set up alerts for unusual usage

---

## Summary

**Root Cause**: Polling every 30 seconds, fetching all data, on multiple simulators

**Impact**: 15x over egress limit (30 GB/month vs 2 GB limit)

**Quick Fix**: Change polling to 5 minutes + remove duplicate manager = 95% reduction

**Permanent Fix**: Add company filtering + use RLS = 99% reduction

**Action Required**: Change 2 lines of code (polling interval + remove duplicate)

