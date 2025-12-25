-- Migration: Add 'assigner_comment' activity type to task_activities table
-- This allows task assigners (creators) to add comments and photos as separate activity entries

-- ============================================================================
-- STEP 1: Update the constraint to include 'assigner_comment'
-- ============================================================================
-- Drop the existing constraint
ALTER TABLE task_activities 
DROP CONSTRAINT IF EXISTS valid_activity_type;

-- Recreate the constraint with the new activity type
ALTER TABLE task_activities
ADD CONSTRAINT valid_activity_type CHECK (activity_type IN (
  'progress_update',
  'status_change',
  'metadata_edit',
  'assignment',
  'creation',
  'cancellation',
  'review_submission',
  'review_acceptance',
  'review_rejection',
  'assigner_comment'
));

-- ============================================================================
-- STEP 2: Add comment to document the new activity type
-- ============================================================================
COMMENT ON COLUMN task_activities.activity_type IS 'Type of activity: progress_update, status_change, metadata_edit, assignment, creation, cancellation, review_submission, review_acceptance, review_rejection, assigner_comment';

-- ============================================================================
-- NOTES:
-- ============================================================================
-- 1. 'assigner_comment' is used for comments and photos added by the task creator (assigner)
-- 2. This is separate from 'progress_update' which is used by assignees to update task progress
-- 3. The data JSONB structure for assigner_comment:
--    {
--      "description": "Comment text",
--      "photos": ["url1", "url2", ...]
--    }
-- 4. No completion_percentage or status fields are set for assigner comments
-- 5. The description field should contain the comment text



