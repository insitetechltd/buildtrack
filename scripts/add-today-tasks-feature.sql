-- ============================================
-- Add "Today's Tasks" Feature
-- ============================================
-- Allows users to star tasks they're working on today
-- Each user can have their own starred tasks

-- Add starred_by_users column to tasks table
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS starred_by_users UUID[] DEFAULT '{}';

-- Add starred_by_users column to sub_tasks table
ALTER TABLE sub_tasks
ADD COLUMN IF NOT EXISTS starred_by_users UUID[] DEFAULT '{}';

-- Add index for better performance when querying starred tasks
CREATE INDEX IF NOT EXISTS idx_tasks_starred_by_users
ON tasks USING GIN (starred_by_users);

CREATE INDEX IF NOT EXISTS idx_sub_tasks_starred_by_users
ON sub_tasks USING GIN (starred_by_users);

-- ============================================
-- Verification Query
-- ============================================

-- Check if column was added successfully
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'tasks' 
AND column_name = 'starred_by_users';

-- ============================================
-- Usage Example
-- ============================================

/*
-- Star a task for user (add user ID to array)
UPDATE tasks
SET starred_by_users = array_append(starred_by_users, 'user-id-here')
WHERE id = 'task-id-here'
AND NOT ('user-id-here' = ANY(starred_by_users)); -- Don't add if already starred

-- Unstar a task for user (remove user ID from array)
UPDATE tasks
SET starred_by_users = array_remove(starred_by_users, 'user-id-here')
WHERE id = 'task-id-here';

-- Get all tasks starred by a specific user
SELECT * FROM tasks
WHERE 'user-id-here' = ANY(starred_by_users)
AND deleted_at IS NULL;
*/

-- ============================================
-- MIGRATION COMPLETE! ✅
-- ============================================

