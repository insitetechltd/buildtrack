# SQL Quick Reference: Task Activities Migration

## Essential SQL Commands

### 1. Create the Table (Core Structure)

```sql
CREATE TABLE task_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  activity_type TEXT NOT NULL CHECK (activity_type IN (
    'progress_update', 'status_change', 'metadata_edit', 'assignment',
    'creation', 'cancellation', 'review_submission', 'review_acceptance', 'review_rejection'
  )),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  data JSONB NOT NULL,
  description TEXT,
  completion_percentage INTEGER CHECK (completion_percentage IS NULL OR (completion_percentage >= 0 AND completion_percentage <= 100)),
  status TEXT,
  notifications_sent BOOLEAN DEFAULT FALSE,
  notified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

### 2. Create Indexes

```sql
CREATE INDEX idx_task_activities_task_id ON task_activities(task_id);
CREATE INDEX idx_task_activities_timestamp ON task_activities(timestamp DESC);
CREATE INDEX idx_task_activities_type ON task_activities(activity_type);
CREATE INDEX idx_task_activities_user_id ON task_activities(user_id);
CREATE INDEX idx_task_activities_task_timestamp ON task_activities(task_id, timestamp DESC);
```

### 3. Migrate Data from task_updates

```sql
INSERT INTO task_activities (task_id, user_id, activity_type, timestamp, data, description, completion_percentage, status)
SELECT 
  task_id, user_id,
  CASE 
    WHEN description ILIKE '%created%' OR description ILIKE '%assigned%' OR 
         description ILIKE '%accepted%' OR description ILIKE '%declined%' OR
         description ILIKE '%cancelled%' OR description ILIKE '%submitted%' OR
         description ILIKE '%rejected%' OR description ILIKE '%accepted completion%'
    THEN 'status_change'
    ELSE 'progress_update'
  END,
  timestamp,
  jsonb_build_object(
    'description', description,
    'photos', COALESCE(photos, ARRAY[]::TEXT[]),
    'completionPercentage', completion_percentage,
    'status', status
  ),
  description, completion_percentage, status
FROM task_updates
WHERE NOT EXISTS (
  SELECT 1 FROM task_activities ta 
  WHERE ta.task_id = task_updates.task_id 
    AND ta.timestamp = task_updates.timestamp
    AND ta.user_id = task_updates.user_id
);
```

### 4. Migrate Data from task_status_history

```sql
INSERT INTO task_activities (task_id, user_id, activity_type, timestamp, data, description, status)
SELECT 
  task_id, changed_by, 'status_change', changed_at,
  jsonb_build_object(
    'fromStatus', from_status,
    'toStatus', to_status,
    'reason', reason,
    'notes', notes
  ),
  COALESCE(
    (SELECT tu.description FROM task_updates tu 
     WHERE tu.task_id = tsh.task_id 
       AND tu.user_id = tsh.changed_by
       AND ABS(EXTRACT(EPOCH FROM (tu.timestamp - tsh.changed_at))) < 5
     LIMIT 1),
    'Status changed from ' || from_status || ' to ' || to_status ||
    CASE WHEN reason IS NOT NULL THEN ' - ' || reason ELSE '' END
  ),
  to_status
FROM task_status_history tsh
WHERE NOT EXISTS (
  SELECT 1 FROM task_activities ta 
  WHERE ta.task_id = tsh.task_id 
    AND ta.activity_type = 'status_change'
    AND ABS(EXTRACT(EPOCH FROM (ta.timestamp - tsh.changed_at))) < 5
    AND ta.user_id = tsh.changed_by
);
```

### 5. Migrate Data from task_edit_history

```sql
INSERT INTO task_activities (task_id, user_id, activity_type, timestamp, data, description, notifications_sent, notified_at)
SELECT 
  task_id, edited_by, 'metadata_edit', edited_at,
  jsonb_build_object('changes', changes, 'editReason', edit_reason),
  COALESCE(edit_reason, 'Task metadata edited'),
  notifications_sent, notified_at
FROM task_edit_history
WHERE NOT EXISTS (
  SELECT 1 FROM task_activities ta 
  WHERE ta.task_id = task_edit_history.task_id 
    AND ta.timestamp = task_edit_history.edited_at
    AND ta.user_id = task_edit_history.edited_by
);
```

### 6. Helper Function

```sql
CREATE OR REPLACE FUNCTION log_task_activity(
  p_task_id UUID,
  p_user_id UUID,
  p_activity_type TEXT,
  p_data JSONB,
  p_description TEXT DEFAULT NULL,
  p_completion_percentage INTEGER DEFAULT NULL,
  p_status TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_activity_id UUID;
BEGIN
  INSERT INTO task_activities (
    task_id, user_id, activity_type, timestamp, data,
    description, completion_percentage, status
  )
  VALUES (
    p_task_id, p_user_id, p_activity_type, NOW(), p_data,
    p_description, p_completion_percentage, p_status
  )
  RETURNING id INTO v_activity_id;
  RETURN v_activity_id;
END;
$$;
```

## Verification Queries

```sql
-- Count records in each table
SELECT 'task_updates' as source, COUNT(*) FROM task_updates
UNION ALL SELECT 'task_status_history', COUNT(*) FROM task_status_history
UNION ALL SELECT 'task_edit_history', COUNT(*) FROM task_edit_history
UNION ALL SELECT 'task_activities', COUNT(*) FROM task_activities;

-- Activity type distribution
SELECT activity_type, COUNT(*) 
FROM task_activities 
GROUP BY activity_type 
ORDER BY count DESC;
```

## Complete File

For the full migration with comments and error handling, see:
**`TASK_ACTIVITIES_UNIFICATION_MIGRATION.sql`**



