# SQL Migration Summary: Task Activities Unification

## Overview

This migration creates a unified `task_activities` table that combines:
- `task_updates` (progress updates, photos, status changes)
- `task_status_history` (status transitions)
- `task_edit_history` (metadata edits)

## SQL File

The complete migration SQL is in: **`TASK_ACTIVITIES_UNIFICATION_MIGRATION.sql`**

## Key SQL Components

### 1. Create Table

```sql
CREATE TABLE task_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  activity_type TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  data JSONB NOT NULL,
  description TEXT,
  completion_percentage INTEGER,
  status TEXT,
  notifications_sent BOOLEAN DEFAULT FALSE,
  notified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

### 2. Indexes

```sql
CREATE INDEX idx_task_activities_task_id ON task_activities(task_id);
CREATE INDEX idx_task_activities_timestamp ON task_activities(timestamp DESC);
CREATE INDEX idx_task_activities_type ON task_activities(activity_type);
CREATE INDEX idx_task_activities_user_id ON task_activities(user_id);
CREATE INDEX idx_task_activities_task_timestamp ON task_activities(task_id, timestamp DESC);
```

### 3. Migrate Data

The migration includes three INSERT statements:

**From `task_updates`:**
- Converts to `progress_update` or `status_change` based on description
- Preserves photos, completion percentage, status

**From `task_status_history`:**
- Converts to `status_change`
- Merges with `task_updates` data if available (to get description)
- Preserves from/to status, reason, notes

**From `task_edit_history`:**
- Converts to `metadata_edit`
- Preserves changes JSONB, edit reason, notification status

### 4. Helper Function

```sql
CREATE FUNCTION log_task_activity(
  p_task_id UUID,
  p_user_id UUID,
  p_activity_type TEXT,
  p_data JSONB,
  p_description TEXT DEFAULT NULL,
  p_completion_percentage INTEGER DEFAULT NULL,
  p_status TEXT DEFAULT NULL
) RETURNS UUID
```

## How to Run

1. **Review the SQL file** - `TASK_ACTIVITIES_UNIFICATION_MIGRATION.sql`
2. **Backup your database** - Always backup before migrations
3. **Run in Supabase SQL Editor** or via psql:
   ```bash
   psql -d your_database -f TASK_ACTIVITIES_UNIFICATION_MIGRATION.sql
   ```
4. **Verify migration** - Run the verification queries at the end of the SQL file
5. **Check counts** - Ensure all records migrated correctly

## Verification Queries

After running the migration, use these to verify:

```sql
-- Check total counts
SELECT 'task_updates' as source, COUNT(*) FROM task_updates
UNION ALL
SELECT 'task_status_history', COUNT(*) FROM task_status_history
UNION ALL
SELECT 'task_edit_history', COUNT(*) FROM task_edit_history
UNION ALL
SELECT 'task_activities', COUNT(*) FROM task_activities;

-- Check activity type distribution
SELECT activity_type, COUNT(*) 
FROM task_activities 
GROUP BY activity_type;
```

## Safety Features

✅ **Non-breaking** - Old tables kept during transition
✅ **Deduplication** - Prevents duplicate entries
✅ **Data preservation** - All data migrated, nothing lost
✅ **Rollback ready** - Can revert if needed
✅ **Verification queries** - Built-in checks

## Next Steps After Migration

1. Update application code to use `task_activities`
2. Test thoroughly
3. Monitor for 1-2 weeks
4. Then optionally drop old tables (or keep as backup)



