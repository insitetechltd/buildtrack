-- Migration: Add archive and delete (soft delete) functionality to tasks table
-- Description: Adds archived_at, archived_by, deleted_at, and deleted_by columns
-- Date: 2025-01-XX

-- ============================================================================
-- ARCHIVE COLUMNS (soft delete for completed/approved tasks)
-- ============================================================================

-- Add archived_at column (timestamp when task was archived, NULL if not archived)
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Add archived_by column (user ID who archived the task)
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES users(id);

-- Add index on archived_at for efficient filtering
CREATE INDEX IF NOT EXISTS idx_tasks_archived_at ON tasks(archived_at) WHERE archived_at IS NOT NULL;

-- Add comments to archive columns
COMMENT ON COLUMN tasks.archived_at IS 'Timestamp when task was archived (NULL if not archived). Archived tasks are hidden from normal views.';
COMMENT ON COLUMN tasks.archived_by IS 'User ID who archived the task. Both assigner and assignee can archive approved tasks.';

-- ============================================================================
-- DELETE COLUMNS (soft delete for audit trail - only assigner can delete)
-- ============================================================================

-- Add deleted_at column (timestamp when task was deleted, NULL if not deleted)
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Add deleted_by column (user ID who deleted the task - only assigner can delete)
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES users(id);

-- Add index on deleted_at for efficient filtering
CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at ON tasks(deleted_at) WHERE deleted_at IS NOT NULL;

-- Add comments to delete columns
COMMENT ON COLUMN tasks.deleted_at IS 'Timestamp when task was deleted (NULL if not deleted). Deleted tasks remain in database for audit trail but are hidden from all views.';
COMMENT ON COLUMN tasks.deleted_by IS 'User ID who deleted the task. Only the task assigner can delete tasks.';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Verify all columns were added
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'tasks' 
    AND column_name IN ('archived_at', 'archived_by', 'deleted_at', 'deleted_by')
ORDER BY column_name;

