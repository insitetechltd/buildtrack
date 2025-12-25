-- Migration: Unified Task Status System
-- This migration implements the new unified status system that replaces
-- currentStatus, accepted, readyForReview, and reviewAccepted with a single status field
--
-- IMPORTANT: This migration will DELETE ALL EXISTING TASKS as per design decision
-- to start fresh with the new system (no backward compatibility needed)

-- ============================================================================
-- STEP 1: Create task_status_history table
-- ============================================================================
-- This table tracks all status changes for complete audit trail
CREATE TABLE IF NOT EXISTS task_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  changed_by UUID NOT NULL REFERENCES users(id),
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  reason TEXT, -- Optional reason (for declined/rejected)
  notes TEXT, -- Optional additional notes
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_task_status_history_task_id ON task_status_history(task_id);
CREATE INDEX IF NOT EXISTS idx_task_status_history_changed_at ON task_status_history(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_status_history_changed_by ON task_status_history(changed_by);
CREATE INDEX IF NOT EXISTS idx_task_status_history_to_status ON task_status_history(to_status);

-- Add comment to document the table
COMMENT ON TABLE task_status_history IS 'Tracks all status changes for tasks - complete audit trail kept forever';

-- ============================================================================
-- STEP 2: Add new status-related columns to tasks table
-- ============================================================================

-- Add the new unified status field
-- Values: 'new', 'declined', 'accepted', 'in_progress', 'submitted_for_review', 'approved', 'rejected', 'cancelled'
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS status TEXT
DEFAULT 'new'
CHECK (status IN ('new', 'declined', 'accepted', 'in_progress', 'submitted_for_review', 'approved', 'rejected', 'cancelled'));

-- Add declined_reason field (renamed from decline_reason for consistency)
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS declined_reason TEXT;

-- Add rejected_reason field (new field for review rejection reasons)
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS rejected_reason TEXT;

-- Make status NOT NULL after setting defaults
ALTER TABLE tasks
ALTER COLUMN status SET NOT NULL;

-- Add comments to document the columns
COMMENT ON COLUMN tasks.status IS 'Unified task status: new, declined, accepted, in_progress, submitted_for_review, approved, rejected, or cancelled';
COMMENT ON COLUMN tasks.declined_reason IS 'Reason when task status is declined (by assignee)';
COMMENT ON COLUMN tasks.rejected_reason IS 'Reason when task status is rejected (by reviewer)';

-- Create index on status for faster filtering
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

-- ============================================================================
-- STEP 3: Delete all existing tasks
-- ============================================================================
-- As per design decision: purge all old tasks to start fresh
-- This ensures no legacy data remains and the new system is clean

-- Delete all task status history first (if any exists, due to CASCADE)
-- Then delete all tasks
DELETE FROM tasks;

-- Verify deletion
DO $$
DECLARE
  task_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO task_count FROM tasks;
  IF task_count > 0 THEN
    RAISE EXCEPTION 'Tasks were not fully deleted. Count: %', task_count;
  ELSE
    RAISE NOTICE 'All tasks successfully deleted. Starting fresh with new status system.';
  END IF;
END $$;

-- ============================================================================
-- STEP 4: Optional - Drop old status-related columns
-- ============================================================================
-- Uncomment these lines if you want to remove the old columns entirely
-- Note: Keeping them commented allows for a gradual migration if needed

-- ALTER TABLE tasks DROP COLUMN IF EXISTS current_status;
-- ALTER TABLE tasks DROP COLUMN IF EXISTS accepted;
-- ALTER TABLE tasks DROP COLUMN IF EXISTS ready_for_review;
-- ALTER TABLE tasks DROP COLUMN IF EXISTS review_accepted;
-- ALTER TABLE tasks DROP COLUMN IF EXISTS decline_reason; -- Old name, replaced by declined_reason

-- ============================================================================
-- STEP 5: Create function to log status changes
-- ============================================================================
-- This function can be called to automatically log status changes
CREATE OR REPLACE FUNCTION log_task_status_change(
  p_task_id UUID,
  p_from_status TEXT,
  p_to_status TEXT,
  p_changed_by UUID,
  p_reason TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_history_id UUID;
BEGIN
  INSERT INTO task_status_history (
    task_id,
    from_status,
    to_status,
    changed_by,
    changed_at,
    reason,
    notes
  ) VALUES (
    p_task_id,
    p_from_status,
    p_to_status,
    p_changed_by,
    NOW(),
    p_reason,
    p_notes
  ) RETURNING id INTO v_history_id;
  
  RETURN v_history_id;
END;
$$ LANGUAGE plpgsql;

-- Add comment to document the function
COMMENT ON FUNCTION log_task_status_change IS 'Logs a status change to task_status_history table';

-- ============================================================================
-- STEP 6: Create trigger to auto-log status changes (optional)
-- ============================================================================
-- This trigger automatically logs status changes when the status field is updated
-- Uncomment if you want automatic logging on every status update

-- CREATE OR REPLACE FUNCTION auto_log_status_change()
-- RETURNS TRIGGER AS $$
-- BEGIN
--   -- Only log if status actually changed
--   IF OLD.status IS DISTINCT FROM NEW.status THEN
--     PERFORM log_task_status_change(
--       NEW.id,
--       OLD.status,
--       NEW.status,
--       NEW.assigned_by, -- Default to task creator, can be overridden in application
--       CASE 
--         WHEN NEW.status = 'declined' THEN NEW.declined_reason
--         WHEN NEW.status = 'rejected' THEN NEW.rejected_reason
--         ELSE NULL
--       END
--     );
--   END IF;
--   RETURN NEW;
-- END;
-- $$ LANGUAGE plpgsql;

-- CREATE TRIGGER task_status_change_trigger
--   AFTER UPDATE OF status ON tasks
--   FOR EACH ROW
--   WHEN (OLD.status IS DISTINCT FROM NEW.status)
--   EXECUTE FUNCTION auto_log_status_change();

-- ============================================================================
-- STEP 7: Verify migration
-- ============================================================================
-- Check that new columns exist
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'tasks' 
  AND column_name IN ('status', 'declined_reason', 'rejected_reason')
ORDER BY column_name;

-- Check that task_status_history table exists
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'task_status_history'
ORDER BY ordinal_position;

-- ============================================================================
-- NOTES:
-- ============================================================================
-- 1. All existing tasks have been deleted - start fresh
-- 2. New status field replaces: currentStatus, accepted, readyForReview, reviewAccepted
-- 3. Status history is tracked in task_status_history table (kept forever)
-- 4. Old columns are kept but deprecated (uncomment STEP 4 to remove them)
-- 5. Application code should use log_task_status_change() function or call it directly
-- 6. Self-assigned tasks should auto-transition from 'new' → 'in_progress' in application code
-- 7. Multiple assignees: decline affects only one assignee (handled in application logic)



