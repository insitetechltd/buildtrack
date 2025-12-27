-- Find all self-assigned tasks for Den
-- A self-assigned task is one where Den is both the creator (assigned_by) 
-- and the assignee (in assigned_to array)

-- First, get Den's user ID(s)
WITH den_users AS (
  SELECT id, name, phone, email
  FROM users
  WHERE LOWER(name) LIKE '%den%'
)
-- Find all tasks where Den is both assigned_by and in assigned_to
SELECT 
  t.id,
  t.title,
  t.description,
  t.current_status,
  t.completion_percentage,
  t.assigned_by,
  t.assigned_to,
  t.project_id,
  t.created_at,
  t.updated_at,
  t.accepted,
  t.accepted_by,
  t.accepted_at,
  t.deleted_at,
  t.archived_at,
  t.cancelled_at,
  -- Check if task is truly self-assigned (Den is the only assignee)
  CASE 
    WHEN array_length(t.assigned_to, 1) = 1 AND t.assigned_to[1] = t.assigned_by THEN 'Yes - Only Den'
    WHEN t.assigned_by = ANY(t.assigned_to) THEN 'Yes - Den + Others'
    ELSE 'No'
  END as is_self_assigned,
  -- Get Den's user info
  du.name as den_name,
  du.id as den_user_id
FROM tasks t
CROSS JOIN den_users du
WHERE 
  -- Den is the creator
  t.assigned_by = du.id
  -- AND Den is in the assigned_to array
  AND du.id = ANY(t.assigned_to)
  -- Exclude deleted, archived, and cancelled tasks
  AND t.deleted_at IS NULL
  AND t.archived_at IS NULL
  AND t.cancelled_at IS NULL
ORDER BY t.created_at DESC;

-- Summary: Count self-assigned tasks for Den
SELECT 
  COUNT(*) as total_self_assigned_tasks,
  COUNT(CASE WHEN array_length(t.assigned_to, 1) = 1 THEN 1 END) as only_den_assigned,
  COUNT(CASE WHEN array_length(t.assigned_to, 1) > 1 THEN 1 END) as den_plus_others,
  COUNT(CASE WHEN t.current_status = 'new' THEN 1 END) as status_new,
  COUNT(CASE WHEN t.current_status = 'in_progress' THEN 1 END) as status_in_progress,
  COUNT(CASE WHEN t.current_status = 'accepted' THEN 1 END) as status_accepted,
  COUNT(CASE WHEN t.current_status = 'approved' THEN 1 END) as status_approved,
  COUNT(CASE WHEN t.completion_percentage = 100 THEN 1 END) as completed_100_percent
FROM tasks t
CROSS JOIN (
  SELECT id FROM users WHERE LOWER(name) LIKE '%den%'
) du
WHERE 
  t.assigned_by = du.id
  AND du.id = ANY(t.assigned_to)
  AND t.deleted_at IS NULL
  AND t.archived_at IS NULL
  AND t.cancelled_at IS NULL;

