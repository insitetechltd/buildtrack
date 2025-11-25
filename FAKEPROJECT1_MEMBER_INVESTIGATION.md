# fakeproject1 Member Count Investigation

**Issue:** The project detail page shows 4 team members in the count, but only 3 are visible when scrolling down.

**Project:** fakeproject1  
**Expected Count:** 4  
**Visible Count:** 3  
**Missing:** 1 member

---

## Problem Analysis

### What the App Shows:

```
┌─────────────────────────────┐
│  Team Members               │
│         4                   │  ← Count from getProjectStats()
└─────────────────────────────┘

Team Members List:
1. Admin Tristan (Worker)
2. [Member 2]
3. [Member 3]
                                 ← 4th member is missing!
```

### Why This Happens:

There's a discrepancy between:
1. **How members are COUNTED** - Uses `getProjectStats()` which counts ALL assignments
2. **How members are DISPLAYED** - Filters out duplicates and invalid users

---

## Possible Causes

### 1. Duplicate Assignment ⚠️
The same user was assigned to the project multiple times:
- Database has 2 assignment records for one user
- Count includes both (4 total)
- Display shows only 1 instance (3 visible)

### 2. Orphaned Assignment ❌
A user was deleted but their assignment remains:
- Database has an assignment for a non-existent user
- Count includes the orphaned assignment (4 total)
- Display filters it out (3 visible)

### 3. Inactive Assignment 💤
An assignment is marked as `is_active = false`:
- Database has an inactive assignment
- Count might include it (4 total)
- Display filters it out (3 visible)

---

## Investigation Steps

### Step 1: Run the SQL Query

I've created a comprehensive SQL query file: `check_fakeproject1_members.sql`

**To run it:**
1. Open your Supabase dashboard
2. Go to SQL Editor
3. Copy and paste the contents of `check_fakeproject1_members.sql`
4. Execute the query

**What it will show:**
- All assignments in the database (including duplicates)
- Duplicate assignments grouped by user
- Orphaned assignments (user doesn't exist)
- Unique users that should be displayed
- Summary statistics

### Step 2: Check Console Logs

When you view the project detail page, check the console for these logs:

```javascript
Project <id> - All assignments: [4 items]
Project <id> - Valid assignments: [3 or 4 items]
Project <id> - Unique assignments: [3 items]
```

The difference will tell you what's being filtered out.

### Step 3: Check the Data

Look at the query results to identify:

**Query 2 Results:** All assignments
- Should show 4 rows
- Check the "status" column for any ❌ or ⚠️ markers

**Query 3 Results:** Duplicate assignments
- If this returns any rows, you have duplicates
- Shows which user is assigned multiple times

**Query 4 Results:** Unique users (what should display)
- Should show exactly 3 rows
- These are the members you see in the app

**Query 6 Results:** Orphaned assignments
- If this returns any rows, you have deleted users still assigned
- Shows the missing user_id

---

## Expected SQL Results

### Scenario A: Duplicate Assignment

**Query 2 (All assignments):**
```
assignment_id | user_id | user_name      | status
--------------+---------+----------------+--------
1             | user-1  | Admin Tristan  | ✅ VALID
2             | user-2  | Member 2       | ✅ VALID
3             | user-3  | Member 3       | ✅ VALID
4             | user-2  | Member 2       | ✅ VALID  ← DUPLICATE!
```

**Query 3 (Duplicates):**
```
user_id | assignment_count | assignment_ids
--------+------------------+---------------
user-2  | 2                | 2, 4
```

**Action:** Remove the duplicate assignment

### Scenario B: Orphaned Assignment

**Query 2 (All assignments):**
```
assignment_id | user_id    | user_name      | status
--------------+------------+----------------+------------------------
1             | user-1     | Admin Tristan  | ✅ VALID
2             | user-2     | Member 2       | ✅ VALID
3             | user-3     | Member 3       | ✅ VALID
4             | deleted-id | NULL           | ❌ USER NOT FOUND
```

**Query 6 (Orphaned):**
```
assignment_id | missing_user_id | issue
--------------+-----------------+-------------------------
4             | deleted-id      | ❌ USER DELETED OR MISSING
```

**Action:** Delete the orphaned assignment

### Scenario C: Inactive Assignment

**Query 2 (All assignments):**
```
assignment_id | user_id | user_name      | is_active | status
--------------+---------+----------------+-----------+--------------------
1             | user-1  | Admin Tristan  | true      | ✅ VALID
2             | user-2  | Member 2       | true      | ✅ VALID
3             | user-3  | Member 3       | true      | ✅ VALID
4             | user-4  | Member 4       | false     | ⚠️ INACTIVE ASSIGNMENT
```

**Action:** Either activate or delete the inactive assignment

---

## Solutions

### Solution 1: Remove Duplicate Assignments

If Query 3 shows duplicates:

```sql
-- Remove duplicate assignments for fakeproject1 (keep most recent)
DELETE FROM user_project_assignments
WHERE id IN (
  SELECT id
  FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY user_id, project_id 
        ORDER BY assigned_at DESC
      ) as rn
    FROM user_project_assignments
    WHERE project_id = (SELECT id FROM projects WHERE name = 'fakeproject1' LIMIT 1)
  ) t
  WHERE rn > 1
);
```

### Solution 2: Remove Orphaned Assignments

If Query 6 shows orphaned assignments:

```sql
-- Remove assignments where user no longer exists
DELETE FROM user_project_assignments
WHERE project_id = (SELECT id FROM projects WHERE name = 'fakeproject1' LIMIT 1)
  AND user_id NOT IN (SELECT id FROM users);
```

### Solution 3: Remove Inactive Assignments

If you want to clean up inactive assignments:

```sql
-- Remove inactive assignments
DELETE FROM user_project_assignments
WHERE project_id = (SELECT id FROM projects WHERE name = 'fakeproject1' LIMIT 1)
  AND is_active = false;
```

### Solution 4: Use App's Cleanup Function

The app has a built-in cleanup function that runs automatically:

**Location:** `src/screens/ProjectDetailScreen.tsx` lines 58-65

```typescript
React.useEffect(() => {
  if (user?.companyId && projectId) {
    // First cleanup any duplicates, then fetch fresh data
    cleanupDuplicateAssignments(projectId).then(() => {
      fetchProjectUserAssignments(projectId);
    });
  }
}, [projectId, user?.companyId, fetchProjectUserAssignments, cleanupDuplicateAssignments]);
```

This should remove duplicates automatically when you view the project.

---

## How to List All Users

### Method 1: Using SQL (Most Accurate)

Run Query 7 from `check_fakeproject1_members.sql`:

```sql
SELECT 
  ROW_NUMBER() OVER (ORDER BY upa.assigned_at DESC) as "#",
  u.name as "User Name",
  u.email as "Email",
  upa.category as "Project Role",
  u.role as "System Role",
  u.position as "Position",
  upa.assigned_at as "Assigned Date",
  CASE 
    WHEN upa.category = 'lead_project_manager' THEN 'Yes'
    ELSE 'No'
  END as "Is Lead PM"
FROM (
  SELECT DISTINCT ON (user_id) *
  FROM user_project_assignments
  WHERE project_id = (SELECT id FROM projects WHERE name = 'fakeproject1' LIMIT 1)
    AND is_active = true
  ORDER BY user_id, assigned_at DESC
) upa
INNER JOIN users u ON upa.user_id = u.id
ORDER BY upa.assigned_at DESC;
```

This will show you the exact 3 users that should be displayed.

### Method 2: Check Console Logs

View the project in the app and check the console for:

```
Project <id> - Unique assignments: [
  { userId: 'xxx', name: 'Admin Tristan', category: 'worker' },
  { userId: 'yyy', name: 'Member 2', category: 'worker' },
  { userId: 'zzz', name: 'Member 3', category: 'worker' }
]
```

---

## Next Steps

1. **Run the SQL query** (`check_fakeproject1_members.sql`) to identify the issue
2. **Review the results** to see which scenario applies (duplicate, orphaned, or inactive)
3. **Apply the appropriate solution** to clean up the data
4. **Refresh the app** to see the corrected count

---

## Prevention

To prevent this issue in the future:

### 1. Add Database Constraint

```sql
-- Prevent duplicate assignments
ALTER TABLE user_project_assignments
ADD CONSTRAINT unique_user_project_assignment 
UNIQUE (user_id, project_id);
```

**Note:** Clean up existing duplicates before adding this constraint.

### 2. Add Foreign Key Constraint

```sql
-- Prevent orphaned assignments (auto-delete when user is deleted)
ALTER TABLE user_project_assignments
DROP CONSTRAINT IF EXISTS user_project_assignments_user_id_fkey;

ALTER TABLE user_project_assignments
ADD CONSTRAINT user_project_assignments_user_id_fkey
FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
```

---

## Summary

**Current State:**
- Count shows: 4 members
- Display shows: 3 members
- Missing: 1 member (likely duplicate or orphaned)

**Action Required:**
1. Run `check_fakeproject1_members.sql` to identify the issue
2. Review the results
3. Apply the appropriate cleanup solution
4. Verify the count matches the display

**Files Created:**
- ✅ `check_fakeproject1_members.sql` - Comprehensive SQL investigation query
- ✅ `FAKEPROJECT1_MEMBER_INVESTIGATION.md` - This documentation

Once you run the SQL query, you'll be able to see exactly which 4 users are assigned and identify which one is causing the discrepancy.

