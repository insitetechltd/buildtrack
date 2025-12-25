-- Migration: Fix current_status constraint and purge all existing tasks
-- This fixes the error: "new row for relation "tasks" violates check constraint "tasks_current_status_check""
--
-- IMPORTANT: This will DELETE ALL EXISTING TASKS - no backward compatibility needed

-- ============================================================================
-- STEP 1: Delete all existing tasks and related data
-- ============================================================================
-- Delete all task activities first (due to foreign key constraints)
DELETE FROM task_activities;

-- Delete all task status history
DELETE FROM task_status_history;

-- Delete all task edit history
DELETE FROM task_edit_history;

-- Finally, delete all tasks
DELETE FROM tasks;

-- Verify deletion
DO $$
DECLARE
  task_count INTEGER;
  activity_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO task_count FROM tasks;
  SELECT COUNT(*) INTO activity_count FROM task_activities;
  
  IF task_count > 0 THEN
    RAISE EXCEPTION 'Tasks were not fully deleted. Count: %', task_count;
  ELSIF activity_count > 0 THEN
    RAISE EXCEPTION 'Task activities were not fully deleted. Count: %', activity_count;
  ELSE
    RAISE NOTICE 'All tasks and related data successfully purged. Starting fresh.';
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Drop the existing constraint
-- ============================================================================
ALTER TABLE tasks 
DROP CONSTRAINT IF EXISTS tasks_current_status_check;

-- ============================================================================
-- STEP 3: Recreate the constraint with only the unified status values
-- ============================================================================
-- Add the constraint with only the status values from the unified status system
ALTER TABLE tasks
ADD CONSTRAINT tasks_current_status_check 
CHECK (current_status IN (
  'new',
  'declined',
  'accepted',
  'in_progress',
  'submitted_for_review',
  'approved',
  'rejected',
  'cancelled'
));

-- ============================================================================
-- STEP 4: Verify the constraint
-- ============================================================================
-- Check that the constraint exists and allows "new"
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'tasks'::regclass
  AND conname = 'tasks_current_status_check';

-- ============================================================================
-- NOTES:
-- ============================================================================
-- 1. All existing tasks have been purged - starting fresh
-- 2. The constraint now only includes unified status values (no "not_started")
-- 3. New tasks should be created with current_status = "new" to appear in inbox/outbox filters
-- 4. No backward compatibility - clean slate for the new system

