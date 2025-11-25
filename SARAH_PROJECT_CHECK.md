# Sarah's Project Assignment Check

**Query:** Check if there are any projects assigned to Sarah

---

## SQL Query Created

I've created `check_sarah_projects.sql` which contains 7 comprehensive queries to check Sarah's project assignments.

### What the Query Will Show:

#### Query 1: Find Sarah's User Record
- User ID
- Name, Email, Phone
- System Role (admin/manager/worker)
- Position
- Company
- Account status (pending/approved)

#### Query 2: All Project Assignments
- Complete list of all projects Sarah is assigned to
- Project names and descriptions
- Project status (active/planning/completed)
- Sarah's role on each project (lead_project_manager/worker/contractor)
- When she was assigned
- Who assigned her

#### Query 3: Project Count Summary
- Total number of projects
- Active assignments
- Projects by status (active/planning/completed)

#### Query 4: Detailed Project List
- Full details of each project
- Project location, dates, budget
- Client information
- Sarah's role on the project
- Company and creator information

#### Query 5: Lead PM Projects
- Check if Sarah is a Lead PM on any projects
- Shows which projects she leads

#### Query 6: All Users Named Sarah
- In case there are multiple users with "Sarah" in their name
- Shows all matching users

#### Query 7: Summary Statistics
- Total active projects
- Breakdown by project role:
  - Lead PM projects
  - Project Manager projects
  - Worker projects
  - Contractor projects

---

## How to Run the Query

### Method 1: Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Go to your Supabase project
   - Navigate to SQL Editor

2. **Copy and Paste**
   - Open `check_sarah_projects.sql`
   - Copy all the contents
   - Paste into SQL Editor

3. **Execute**
   - Click "Run" or press Cmd/Ctrl + Enter
   - Review the results from all 7 queries

### Method 2: Command Line (Alternative)

```bash
# Using psql
psql -h your-supabase-host \
     -U postgres \
     -d postgres \
     -f check_sarah_projects.sql
```

---

## Expected Results

### If Sarah Has Projects:

**Query 1 - User Record:**
```
user_id    | name         | email                  | role    | position
-----------+--------------+------------------------+---------+------------------
sarah-123  | Sarah Worker | worker@buildtrack.com  | worker  | Construction Worker
```

**Query 2 - Project Assignments:**
```
user_name    | project_name      | project_role | is_active | assigned_at
-------------+-------------------+--------------+-----------+-------------
Sarah Worker | fakeproject1      | worker       | true      | 2025-11-15
Sarah Worker | Office Building   | contractor   | true      | 2025-11-10
```

**Query 3 - Count Summary:**
```
user_name    | total_projects | active_assignments | active_projects
-------------+----------------+--------------------+----------------
Sarah Worker | 2              | 2                  | 2
```

**Query 7 - Role Summary:**
```
name         | total_active_projects | worker_projects | contractor_projects
-------------+-----------------------+-----------------+--------------------
Sarah Worker | 2                     | 1               | 1
```

### If Sarah Has NO Projects:

**Query 1 - User Record:**
```
user_id    | name         | email                  | role    | position
-----------+--------------+------------------------+---------+------------------
sarah-123  | Sarah Worker | worker@buildtrack.com  | worker  | Construction Worker
```

**Query 2 - Project Assignments:**
```
(0 rows)
```

**Query 3 - Count Summary:**
```
user_name    | total_projects | active_assignments | active_projects
-------------+----------------+--------------------+----------------
Sarah Worker | 0              | 0                  | 0
```

### If Sarah Doesn't Exist:

**All Queries:**
```
(0 rows)
```

---

## Possible Sarah Users

Based on the codebase, there might be:

### 1. Sarah Worker (Mock Data)
```typescript
{
  id: "2",
  email: "worker@buildtrack.com",
  name: "Sarah Worker",
  role: "worker",
  companyId: "comp-1",
  position: "Construction Worker"
}
```

### 2. Sarah Johnson (Test Data)
```typescript
{
  id: "sarah-123",
  name: "Sarah Johnson",
  email: "sarah@buildtrack.com",
  role: "manager",
  position: "Senior Construction Manager"
}
```

### 3. Other Sarah Users
- The query will find any user with "Sarah" in their name or email
- Query 6 will list all matching users

---

## What to Look For

### ✅ Sarah Has Projects:
- Query 2 will show rows with project names
- Query 3 will show total_projects > 0
- Query 4 will show detailed project information

### ❌ Sarah Has NO Projects:
- Query 2 will return 0 rows
- Query 3 will show total_projects = 0
- Query 4 will return 0 rows

### ⚠️ Sarah Doesn't Exist:
- Query 1 will return 0 rows
- All other queries will return 0 rows
- Need to create Sarah's user account first

---

## Next Steps Based on Results

### If Sarah Has Projects:
1. Review the project list from Query 4
2. Check her role on each project (Query 2)
3. Verify if she's a Lead PM on any (Query 5)

### If Sarah Has NO Projects:
1. Verify Sarah's user account exists (Query 1)
2. Check if she needs to be assigned to projects
3. Use the app's "Add Member" feature to assign her

### If Sarah Doesn't Exist:
1. Create Sarah's user account
2. Set her role and position
3. Assign her to projects as needed

---

## Quick Reference

### To Assign Sarah to a Project:

**Via SQL:**
```sql
-- Get Sarah's user ID
SELECT id FROM users WHERE name ILIKE '%sarah%';

-- Get project ID
SELECT id FROM projects WHERE name = 'your-project-name';

-- Assign Sarah to project
INSERT INTO user_project_assignments (
  user_id,
  project_id,
  category,
  is_active,
  assigned_at,
  assigned_by
) VALUES (
  'sarah-user-id',
  'project-id',
  'worker',  -- or 'contractor', 'project_manager', 'lead_project_manager'
  true,
  NOW(),
  'admin-user-id'
);
```

**Via App:**
1. Navigate to the project
2. Click "Add Member"
3. Search for "Sarah"
4. Select her and click "Add"

---

## Summary

**File Created:** `check_sarah_projects.sql`

**What It Does:**
- ✅ Finds Sarah's user account
- ✅ Lists all her project assignments
- ✅ Shows project details
- ✅ Counts projects by status and role
- ✅ Identifies if she's a Lead PM

**How to Use:**
1. Open Supabase SQL Editor
2. Copy and paste the query
3. Execute it
4. Review the 7 result sets

**Expected Output:**
- If Sarah has projects: You'll see project names, roles, and details
- If Sarah has no projects: Queries will return 0 rows (except user record)
- If Sarah doesn't exist: All queries return 0 rows

Run the query and share the results to see Sarah's exact project assignments!

