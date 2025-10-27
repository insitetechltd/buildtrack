-- Mark all WIP tasks as accepted by assignees
-- This script updates tasks that are:
-- 1. Currently in WIP (accepted = false or null, completion < 100%, not rejected)
-- 2. Assigned to users
-- 3. Not already accepted

BEGIN;

-- Update parent tasks that are in WIP but not accepted
UPDATE tasks
SET 
  accepted = true,
  accepted_by = (
    -- Use the first assignee that exists in users table
    SELECT u.id
    FROM unnest(assigned_to) AS assignee_id
    JOIN users u ON u.id = assignee_id
    LIMIT 1
  ),
  accepted_at = NOW()
WHERE 
  -- Task is not rejected
  current_status != 'rejected'
  -- Task is incomplete (< 100%)
  AND completion_percentage < 100
  -- Task is not already accepted
  AND (accepted IS NULL OR accepted = false)
  -- Task has assignees
  AND assigned_to IS NOT NULL 
  AND array_length(assigned_to, 1) > 0
  -- At least one assignee exists in users table
  AND EXISTS (
    SELECT 1 FROM users 
    WHERE id = ANY(assigned_to)
  )
;

-- Update subtasks that are in WIP but not accepted
UPDATE sub_tasks
SET 
  accepted = true,
  accepted_by = (
    -- Use the first assignee that exists in users table
    SELECT u.id
    FROM unnest(assigned_to) AS assignee_id
    JOIN users u ON u.id = assignee_id
    LIMIT 1
  ),
  accepted_at = NOW()
WHERE 
  -- Subtask is not rejected
  current_status != 'rejected'
  -- Subtask is incomplete (< 100%)
  AND completion_percentage < 100
  -- Subtask is not already accepted
  AND (accepted IS NULL OR accepted = false)
  -- Subtask has assignees
  AND assigned_to IS NOT NULL 
  AND array_length(assigned_to, 1) > 0
  -- At least one assignee exists in users table
  AND EXISTS (
    SELECT 1 FROM users 
    WHERE id = ANY(assigned_to)
  )
;

-- Show summary of changes
SELECT 
  'Parent Tasks Updated' as category,
  COUNT(*) as count
FROM tasks
WHERE 
  current_status != 'rejected'
  AND completion_percentage < 100
  AND accepted = true
  AND accepted_at >= NOW() - INTERVAL '1 minute'
UNION ALL
SELECT 
  'SubTasks Updated' as category,
  COUNT(*) as count
FROM sub_tasks
WHERE 
  current_status != 'rejected'
  AND completion_percentage < 100
  AND accepted = true
  AND accepted_at >= NOW() - INTERVAL '1 minute'
;

COMMIT;

