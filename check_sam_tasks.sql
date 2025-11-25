-- Query to check how many tasks exist in the database for Sam
-- This query finds Sam's user ID and counts all tasks assigned to Sam

-- Step 1: Find Sam's user ID
SELECT 
    id,
    name,
    email,
    phone
FROM users
WHERE LOWER(name) LIKE '%sam%'
   OR LOWER(email) LIKE '%sam%'
ORDER BY name;

-- Step 2: Count tasks assigned to Sam (replace 'SAM_USER_ID' with actual ID from Step 1)
-- Option A: If you know Sam's user ID, use this query directly:
/*
SELECT 
    COUNT(*) as total_tasks_for_sam,
    COUNT(CASE WHEN cancelled_at IS NULL THEN 1 END) as active_tasks,
    COUNT(CASE WHEN cancelled_at IS NOT NULL THEN 1 END) as cancelled_tasks
FROM tasks
WHERE 'SAM_USER_ID' = ANY(assigned_to);
*/

-- Option B: Combined query that finds Sam and counts their tasks in one go
WITH sam_user AS (
    SELECT id as sam_id, name as sam_name
    FROM users
    WHERE LOWER(name) LIKE '%sam%'
       OR LOWER(email) LIKE '%sam%'
    LIMIT 1
)
SELECT 
    su.sam_id,
    su.sam_name,
    COUNT(t.id) as total_tasks,
    COUNT(CASE WHEN t.cancelled_at IS NULL THEN 1 END) as active_tasks,
    COUNT(CASE WHEN t.cancelled_at IS NOT NULL THEN 1 END) as cancelled_tasks,
    COUNT(CASE WHEN t.accepted = true AND t.accepted_by = su.sam_id THEN 1 END) as accepted_by_sam,
    COUNT(CASE WHEN t.accepted = false OR t.accepted_by IS NULL OR t.accepted_by != su.sam_id THEN 1 END) as not_accepted_by_sam,
    COUNT(CASE WHEN t.completion_percentage = 100 THEN 1 END) as completed_tasks,
    COUNT(CASE WHEN t.completion_percentage < 100 THEN 1 END) as in_progress_tasks
FROM sam_user su
LEFT JOIN tasks t ON su.sam_id = ANY(t.assigned_to)
GROUP BY su.sam_id, su.sam_name;

-- Step 3: Detailed list of all tasks assigned to Sam
WITH sam_user AS (
    SELECT id as sam_id, name as sam_name
    FROM users
    WHERE LOWER(name) LIKE '%sam%'
       OR LOWER(email) LIKE '%sam%'
    LIMIT 1
)
SELECT 
    t.id,
    t.title,
    t.assigned_to,
    t.assigned_by,
    t.accepted,
    t.accepted_by,
    t.accepted_at,
    t.current_status,
    t.completion_percentage,
    t.ready_for_review,
    t.review_accepted,
    t.cancelled_at,
    t.created_at,
    t.updated_at,
    -- Check if Sam has accepted (for multi-user assignments)
    CASE 
        WHEN t.accepted = true AND t.accepted_by = su.sam_id THEN 'Yes'
        ELSE 'No'
    END as sam_has_accepted,
    -- Check if task is in Sam's assigned_to array
    CASE 
        WHEN su.sam_id = ANY(t.assigned_to) THEN 'Yes'
        ELSE 'No'
    END as is_assigned_to_sam
FROM sam_user su
LEFT JOIN tasks t ON su.sam_id = ANY(t.assigned_to)
ORDER BY t.created_at DESC;

