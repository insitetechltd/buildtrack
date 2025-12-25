-- Migration: Unified Task Activities System
-- This migration unifies task_updates, task_status_history, and task_edit_history
-- into a single task_activities table for a complete, chronological activity log
--
-- IMPORTANT: This is a non-breaking migration - old tables are kept during transition

-- ============================================================================
-- STEP 1: Create task_activities table
-- ============================================================================
CREATE TABLE IF NOT EXISTS task_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  activity_type TEXT NOT NULL,
  -- Activity types: 'progress_update', 'status_change', 'metadata_edit', 
  -- 'assignment', 'creation', 'cancellation', 'review_submission', 
  -- 'review_acceptance', 'review_rejection'
  
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Activity-specific data (flexible JSONB)
  data JSONB NOT NULL,
  -- Structure varies by activity_type (see documentation in PROGRESS_LOG_UNIFICATION_PLAN.md)
  
  -- Common fields for all activities
  description TEXT, -- Human-readable description (for display)
  completion_percentage INTEGER, -- Snapshot at time of activity (0-100)
  status TEXT, -- Snapshot at time of activity
  
  -- Notification tracking (for metadata edits)
  notifications_sent BOOLEAN DEFAULT FALSE,
  notified_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_activity_type CHECK (activity_type IN (
    'progress_update',
    'status_change',
    'metadata_edit',
    'assignment',
    'creation',
    'cancellation',
    'review_submission',
    'review_acceptance',
    'review_rejection'
  )),
  CONSTRAINT valid_completion_percentage CHECK (
    completion_percentage IS NULL OR (completion_percentage >= 0 AND completion_percentage <= 100)
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_task_activities_task_id ON task_activities(task_id);
CREATE INDEX IF NOT EXISTS idx_task_activities_timestamp ON task_activities(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_task_activities_type ON task_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_task_activities_user_id ON task_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_task_activities_task_timestamp ON task_activities(task_id, timestamp DESC);

-- Add comment to document the table
COMMENT ON TABLE task_activities IS 'Unified activity log for all task changes - replaces task_updates, task_status_history, and task_edit_history';
COMMENT ON COLUMN task_activities.activity_type IS 'Type of activity: progress_update, status_change, metadata_edit, assignment, creation, cancellation, review_submission, review_acceptance, review_rejection';
COMMENT ON COLUMN task_activities.data IS 'Activity-specific data in JSONB format - structure varies by activity_type';

-- ============================================================================
-- STEP 2: Migrate existing task_updates records
-- ============================================================================
-- Migrate progress updates and status changes from task_updates
-- Only migrate records where the task still exists (handle orphaned records)
INSERT INTO task_activities (
  task_id,
  user_id,
  activity_type,
  timestamp,
  data,
  description,
  completion_percentage,
  status
)
SELECT 
  tu.task_id,
  tu.user_id,
  CASE 
    -- If description indicates a status change, mark as status_change
    WHEN tu.description ILIKE '%created%' OR tu.description ILIKE '%assigned%' OR 
         tu.description ILIKE '%accepted%' OR tu.description ILIKE '%declined%' OR
         tu.description ILIKE '%cancelled%' OR tu.description ILIKE '%submitted%' OR
         tu.description ILIKE '%rejected%' OR tu.description ILIKE '%accepted completion%'
    THEN 'status_change'
    ELSE 'progress_update'
  END as activity_type,
  tu.timestamp,
  jsonb_build_object(
    'description', tu.description,
    'photos', COALESCE(tu.photos, ARRAY[]::TEXT[]),
    'completionPercentage', tu.completion_percentage,
    'status', tu.status
  ) as data,
  tu.description,
  tu.completion_percentage,
  tu.status
FROM task_updates tu
INNER JOIN tasks t ON t.id = tu.task_id  -- Only migrate if task exists
WHERE NOT EXISTS (
  -- Avoid duplicates if already migrated
  SELECT 1 FROM task_activities ta 
  WHERE ta.task_id = tu.task_id 
    AND ta.timestamp = tu.timestamp
    AND ta.user_id = tu.user_id
);

-- ============================================================================
-- STEP 3: Migrate existing task_status_history records
-- ============================================================================
-- Migrate status changes from task_status_history
-- Merge with task_updates data if available (to get description)
-- Only migrate records where the task still exists (handle orphaned records)
INSERT INTO task_activities (
  task_id,
  user_id,
  activity_type,
  timestamp,
  data,
  description,
  status
)
SELECT 
  tsh.task_id,
  tsh.changed_by as user_id,
  'status_change' as activity_type,
  tsh.changed_at as timestamp,
  jsonb_build_object(
    'fromStatus', tsh.from_status,
    'toStatus', tsh.to_status,
    'reason', tsh.reason,
    'notes', tsh.notes
  ) as data,
  COALESCE(
    -- Try to get description from task_updates if available
    (SELECT tu.description 
     FROM task_updates tu 
     WHERE tu.task_id = tsh.task_id 
       AND tu.user_id = tsh.changed_by
       AND ABS(EXTRACT(EPOCH FROM (tu.timestamp - tsh.changed_at))) < 5 -- Within 5 seconds
     LIMIT 1),
    -- Fallback to generated description
    'Status changed from ' || tsh.from_status || ' to ' || tsh.to_status ||
    CASE WHEN tsh.reason IS NOT NULL THEN ' - ' || tsh.reason ELSE '' END
  ) as description,
  tsh.to_status as status
FROM task_status_history tsh
INNER JOIN tasks t ON t.id = tsh.task_id  -- Only migrate if task exists
WHERE NOT EXISTS (
  -- Avoid duplicates - check if this status change was already migrated from task_updates
  SELECT 1 FROM task_activities ta 
  WHERE ta.task_id = tsh.task_id 
    AND ta.activity_type = 'status_change'
    AND ABS(EXTRACT(EPOCH FROM (ta.timestamp - tsh.changed_at))) < 5 -- Within 5 seconds
    AND ta.user_id = tsh.changed_by
);

-- ============================================================================
-- STEP 4: Migrate existing task_edit_history records
-- ============================================================================
-- Migrate metadata edits from task_edit_history
-- Only migrate records where the task still exists (handle orphaned records)
INSERT INTO task_activities (
  task_id,
  user_id,
  activity_type,
  timestamp,
  data,
  description,
  notifications_sent,
  notified_at
)
SELECT 
  teh.task_id,
  teh.edited_by as user_id,
  'metadata_edit' as activity_type,
  teh.edited_at as timestamp,
  jsonb_build_object(
    'changes', teh.changes,
    'editReason', teh.edit_reason
  ) as data,
  COALESCE(
    teh.edit_reason,
    'Task metadata edited'
  ) as description,
  teh.notifications_sent,
  teh.notified_at
FROM task_edit_history teh
INNER JOIN tasks t ON t.id = teh.task_id  -- Only migrate if task exists
WHERE NOT EXISTS (
  -- Avoid duplicates if already migrated
  SELECT 1 FROM task_activities ta 
  WHERE ta.task_id = teh.task_id 
    AND ta.timestamp = teh.edited_at
    AND ta.user_id = teh.edited_by
);

-- ============================================================================
-- STEP 5: Create helper function to log activities
-- ============================================================================
CREATE OR REPLACE FUNCTION log_task_activity(
  p_task_id UUID,
  p_user_id UUID,
  p_activity_type TEXT,
  p_data JSONB,
  p_description TEXT DEFAULT NULL,
  p_completion_percentage INTEGER DEFAULT NULL,
  p_status TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_activity_id UUID;
BEGIN
  INSERT INTO task_activities (
    task_id,
    user_id,
    activity_type,
    timestamp,
    data,
    description,
    completion_percentage,
    status
  )
  VALUES (
    p_task_id,
    p_user_id,
    p_activity_type,
    NOW(),
    p_data,
    p_description,
    p_completion_percentage,
    p_status
  )
  RETURNING id INTO v_activity_id;
  
  RETURN v_activity_id;
END;
$$;

COMMENT ON FUNCTION log_task_activity IS 'Helper function to log task activities - use this instead of direct inserts';

-- ============================================================================
-- STEP 6: Check for orphaned records (before migration)
-- ============================================================================
-- These queries help identify orphaned records that won't be migrated
-- (records referencing tasks that no longer exist)

-- Orphaned task_updates
SELECT 
  'task_updates' as source_table,
  COUNT(*) as orphaned_count
FROM task_updates tu
LEFT JOIN tasks t ON t.id = tu.task_id
WHERE t.id IS NULL;

-- Orphaned task_status_history
SELECT 
  'task_status_history' as source_table,
  COUNT(*) as orphaned_count
FROM task_status_history tsh
LEFT JOIN tasks t ON t.id = tsh.task_id
WHERE t.id IS NULL;

-- Orphaned task_edit_history
SELECT 
  'task_edit_history' as source_table,
  COUNT(*) as orphaned_count
FROM task_edit_history teh
LEFT JOIN tasks t ON t.id = teh.task_id
WHERE t.id IS NULL;

-- ============================================================================
-- STEP 7: Verification queries
-- ============================================================================
-- Run these to verify the migration

-- Check total counts
SELECT 
  'task_updates' as source_table,
  COUNT(*) as record_count
FROM task_updates
UNION ALL
SELECT 
  'task_status_history' as source_table,
  COUNT(*) as record_count
FROM task_status_history
UNION ALL
SELECT 
  'task_edit_history' as source_table,
  COUNT(*) as record_count
FROM task_edit_history
UNION ALL
SELECT 
  'task_activities' as source_table,
  COUNT(*) as record_count
FROM task_activities;

-- Check activity type distribution
SELECT 
  activity_type,
  COUNT(*) as count
FROM task_activities
GROUP BY activity_type
ORDER BY count DESC;

-- Check for any tasks with activities
SELECT 
  t.id as task_id,
  t.title,
  COUNT(ta.id) as activity_count
FROM tasks t
LEFT JOIN task_activities ta ON ta.task_id = t.id
GROUP BY t.id, t.title
HAVING COUNT(ta.id) > 0
ORDER BY activity_count DESC
LIMIT 10;

-- ============================================================================
-- NOTES:
-- ============================================================================
-- 1. Old tables (task_updates, task_status_history, task_edit_history) are kept
--    during the transition period for safety and rollback capability
--
-- 2. After verification period (1-2 weeks), you can:
--    - Drop the old tables if everything works
--    - Or keep them as read-only backup
--
-- 3. Application code should be updated to:
--    - Write to task_activities instead of old tables
--    - Read from task_activities for unified timeline
--    - Remove references to old tables after verification
--
-- 4. The migration handles deduplication by checking timestamps and user_ids
--    to avoid creating duplicate entries for the same event
--
-- 5. Status changes that exist in both task_updates and task_status_history
--    are merged, preferring the description from task_updates
--
-- 6. Orphaned records (referencing deleted tasks) are automatically skipped
--    using INNER JOIN with tasks table - only existing tasks are migrated.
--    Check STEP 6 queries to see how many orphaned records exist before migration.

