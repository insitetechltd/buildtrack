-- =====================================================
-- ROLLBACK: Unified Tasks Migration
-- =====================================================
-- Use this ONLY if the migration to unified tasks fails
-- This will restore the original two-table structure
-- =====================================================

-- ⚠️ WARNING: Only run this if you need to roll back!

DO $$ BEGIN
  RAISE NOTICE '⚠️  ROLLBACK STARTING...';
END $$;

-- Step 1: Verify sub_tasks table still exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'sub_tasks'
  ) THEN
    RAISE EXCEPTION 'Cannot rollback: sub_tasks table has been dropped!';
  END IF;
  RAISE NOTICE '✅ sub_tasks table found';
END $$;

-- Step 2: Restore task_updates sub_task_id references
DO $$ BEGIN
  RAISE NOTICE '🔄 Restoring task_updates.sub_task_id...';
END $$;

UPDATE task_updates
SET sub_task_id = task_id
WHERE _migrated_from_subtask = true;

DO $$ BEGIN
  RAISE NOTICE '✅ task_updates restored';
END $$;

-- Step 3: Remove new columns from tasks
DO $$ BEGIN
  RAISE NOTICE '🔄 Removing new columns from tasks...';
END $$;

ALTER TABLE tasks DROP COLUMN IF EXISTS parent_task_id CASCADE;
ALTER TABLE tasks DROP COLUMN IF EXISTS nesting_level CASCADE;
ALTER TABLE tasks DROP COLUMN IF EXISTS root_task_id CASCADE;

-- Drop new indexes
DROP INDEX IF EXISTS idx_tasks_parent_task_id;
DROP INDEX IF EXISTS idx_tasks_nesting_level;
DROP INDEX IF EXISTS idx_tasks_root_task_id;

DO $$ BEGIN
  RAISE NOTICE '✅ New columns removed';
END $$;

-- Step 4: Remove migrated tasks (those that came from sub_tasks)
DO $$ BEGIN
  RAISE NOTICE '🔄 Removing migrated tasks...';
  
  -- This is complex - ideally you should restore from backup instead
  -- But if you must, delete tasks that didn't exist before
  
  RAISE NOTICE '⚠️  Manual intervention required:';
  RAISE NOTICE '   Please restore from your backup taken before migration';
  RAISE NOTICE '   Or manually delete tasks that were migrated from sub_tasks';
END $$;

-- Step 5: Drop new triggers
DROP TRIGGER IF EXISTS trg_prevent_circular_task_reference ON tasks;
DROP FUNCTION IF EXISTS prevent_circular_task_reference();
DROP FUNCTION IF EXISTS get_task_children(UUID);
DROP FUNCTION IF EXISTS get_task_path(UUID);

DO $$ BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================';
  RAISE NOTICE '⚠️  ROLLBACK PARTIALLY COMPLETE';
  RAISE NOTICE '====================================';
  RAISE NOTICE 'Action Required:';
  RAISE NOTICE '  1. Restore from backup OR';
  RAISE NOTICE '  2. Manually verify data integrity';
  RAISE NOTICE '====================================';
END $$;

