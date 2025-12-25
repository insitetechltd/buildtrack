# Commercial Category Fix

## Issue
Creating a task with the "commercial" category fails with the error:
```
Error: new row for relation "tasks" violates check constraint "tasks_category_check"
```

## Root Cause
The database check constraint `tasks_category_check` on the `tasks` table doesn't include "commercial" as a valid category value. The constraint only allows: `'safety', 'electrical', 'plumbing', 'structural', 'general', 'materials'`.

## Solution

### 1. Database Migration
Run the SQL migration file `ADD_COMMERCIAL_CATEGORY_MIGRATION.sql` in your Supabase SQL editor:

```sql
-- Drop the existing check constraint
ALTER TABLE tasks 
DROP CONSTRAINT IF EXISTS tasks_category_check;

-- Add the updated check constraint with "commercial" included
ALTER TABLE tasks 
ADD CONSTRAINT tasks_category_check 
CHECK (category IN ('safety', 'electrical', 'plumbing', 'structural', 'general', 'materials', 'commercial'));
```

### 2. Icon Update
Changed the commercial category icon from `"business"` to `"cash"` (dollar sign icon) in `CreateTaskScreen.tsx`.

## Files Changed
- ✅ `src/screens/CreateTaskScreen.tsx` - Updated icon from "business" to "cash"
- ✅ `ADD_COMMERCIAL_CATEGORY_MIGRATION.sql` - Created migration script

## Next Steps
1. Run the SQL migration in Supabase dashboard (SQL Editor)
2. Verify the constraint by creating a test task with "commercial" category
3. The app should now allow creating tasks with the commercial category

## Verification Query
After running the migration, you can verify the constraint with:
```sql
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'tasks'::regclass 
AND conname = 'tasks_category_check';
```





