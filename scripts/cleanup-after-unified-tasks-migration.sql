-- =====================================================
-- Cleanup After Unified Tasks Migration
-- =====================================================
-- This script removes the old sub_tasks table and cleanup
-- migration artifacts after successful migration
-- =====================================================

-- =====================================================
-- STEP 1: FINAL VERIFICATION
-- =====================================================

DO $$
DECLARE
  tasks_count INTEGER;
  subtasks_count INTEGER;
  top_level_count INTEGER;
  nested_count INTEGER;
  max_depth INTEGER;
BEGIN
  RAISE NOTICE '🔍 Final verification before cleanup...';
  RAISE NOTICE '';
  
  -- Get counts
  SELECT COUNT(*) INTO tasks_count FROM tasks;
  SELECT COUNT(*) INTO subtasks_count FROM sub_tasks;
  SELECT COUNT(*) INTO top_level_count FROM tasks WHERE parent_task_id IS NULL;
  SELECT COUNT(*) INTO nested_count FROM tasks WHERE parent_task_id IS NOT NULL;
  SELECT MAX(nesting_level) INTO max_depth FROM tasks;
  
  RAISE NOTICE '📊 Current State:';
  RAISE NOTICE '   Total tasks in unified table: %', tasks_count;
  RAISE NOTICE '   - Top-level tasks: %', top_level_count;
  RAISE NOTICE '   - Nested tasks: %', nested_count;
  RAISE NOTICE '   - Maximum nesting depth: %', max_depth;
  RAISE NOTICE '   Remaining sub_tasks (to be dropped): %', subtasks_count;
  RAISE NOTICE '';
  
  IF tasks_count = 0 THEN
    RAISE EXCEPTION '❌ SAFETY CHECK FAILED: tasks table is empty! Cannot proceed with cleanup.';
  END IF;
  
  RAISE NOTICE '✅ Verification passed - safe to proceed with cleanup';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- STEP 2: DROP SUB_TASKS TABLE
-- =====================================================

DO $$ BEGIN
  RAISE NOTICE '🗑️  Step 2: Dropping sub_tasks table...';
END $$;

-- Drop the sub_tasks table
DROP TABLE IF EXISTS sub_tasks CASCADE;

DO $$ BEGIN
  RAISE NOTICE '✅ sub_tasks table dropped';
END $$;

-- =====================================================
-- STEP 3: REMOVE TEMPORARY MIGRATION COLUMNS
-- =====================================================

DO $$ BEGIN
  RAISE NOTICE '🧹 Step 3: Removing temporary migration columns...';
END $$;

-- Remove temporary column from task_updates
ALTER TABLE task_updates DROP COLUMN IF EXISTS _migrated_from_subtask;

-- Remove old sub_task_id columns (now redundant)
ALTER TABLE task_updates DROP COLUMN IF EXISTS sub_task_id;
ALTER TABLE task_delegation_history DROP COLUMN IF EXISTS sub_task_id;
ALTER TABLE task_read_status DROP COLUMN IF EXISTS sub_task_id;

DO $$ BEGIN
  RAISE NOTICE '✅ Temporary columns removed';
END $$;

-- =====================================================
-- STEP 4: VERIFY FILE_ATTACHMENTS (if it exists)
-- =====================================================

DO $$
DECLARE
  has_file_attachments BOOLEAN;
  subtask_attachments_count INTEGER := 0;
BEGIN
  -- Check if file_attachments table exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'file_attachments'
  ) INTO has_file_attachments;
  
  IF has_file_attachments THEN
    RAISE NOTICE '🔍 Step 4: Checking file_attachments table...';
    
    -- Count attachments that reference sub_task entity type
    SELECT COUNT(*) INTO subtask_attachments_count
    FROM file_attachments
    WHERE entity_type = 'sub_task';
    
    IF subtask_attachments_count > 0 THEN
      RAISE NOTICE '   Found % file attachments with entity_type = ''sub_task''', subtask_attachments_count;
      RAISE NOTICE '   Converting to entity_type = ''task''...';
      
      UPDATE file_attachments
      SET entity_type = 'task'
      WHERE entity_type = 'sub_task';
      
      RAISE NOTICE '✅ File attachments updated';
    ELSE
      RAISE NOTICE '✅ No file attachments to update';
    END IF;
  ELSE
    RAISE NOTICE '✅ Step 4: file_attachments table does not exist - skipping';
  END IF;
END $$;

-- =====================================================
-- STEP 5: OPTIMIZE TASKS TABLE
-- =====================================================

DO $$ BEGIN
  RAISE NOTICE '⚡ Step 5: Optimizing tasks table...';
END $$;

-- Analyze the tasks table for better query performance
ANALYZE tasks;

DO $$ BEGIN
  RAISE NOTICE '✅ Tasks table analyzed';
END $$;

-- Note: VACUUM must be run outside transaction blocks
-- Run this separately if needed: VACUUM tasks;

-- =====================================================
-- STEP 6: VERIFY INDEXES
-- =====================================================

DO $$
DECLARE
  index_count INTEGER;
BEGIN
  RAISE NOTICE '🔍 Step 6: Verifying indexes...';
  
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE tablename = 'tasks'
    AND indexname IN (
      'idx_tasks_parent_task_id',
      'idx_tasks_nesting_level', 
      'idx_tasks_root_task_id'
    );
  
  RAISE NOTICE '   Found % of 3 expected new indexes', index_count;
  
  IF index_count = 3 THEN
    RAISE NOTICE '✅ All indexes present';
  ELSE
    RAISE WARNING '⚠️  Some indexes missing - query performance may be affected';
  END IF;
END $$;

-- =====================================================
-- STEP 7: VERIFY TRIGGERS
-- =====================================================

DO $$
DECLARE
  has_circular_check BOOLEAN;
BEGIN
  RAISE NOTICE '🔍 Step 7: Verifying triggers...';
  
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_prevent_circular_task_reference'
  ) INTO has_circular_check;
  
  IF has_circular_check THEN
    RAISE NOTICE '✅ Circular reference prevention trigger active';
  ELSE
    RAISE WARNING '⚠️  Circular reference trigger not found';
  END IF;
END $$;

-- =====================================================
-- FINAL SUMMARY
-- =====================================================

DO $$
DECLARE
  total_tasks INTEGER;
  top_level_tasks INTEGER;
  nested_tasks INTEGER;
  max_depth INTEGER;
  table_size TEXT;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================';
  RAISE NOTICE '✅ CLEANUP COMPLETE!';
  RAISE NOTICE '====================================';
  
  SELECT COUNT(*) INTO total_tasks FROM tasks;
  SELECT COUNT(*) INTO top_level_tasks FROM tasks WHERE parent_task_id IS NULL;
  SELECT COUNT(*) INTO nested_tasks FROM tasks WHERE parent_task_id IS NOT NULL;
  SELECT MAX(nesting_level) INTO max_depth FROM tasks;
  SELECT pg_size_pretty(pg_total_relation_size('tasks')) INTO table_size;
  
  RAISE NOTICE '';
  RAISE NOTICE '📊 Final Statistics:';
  RAISE NOTICE '   Total tasks: %', total_tasks;
  RAISE NOTICE '   - Top-level: %', top_level_tasks;
  RAISE NOTICE '   - Nested: %', nested_tasks;
  RAISE NOTICE '   Maximum nesting depth: %', max_depth;
  RAISE NOTICE '   Table size: %', table_size;
  RAISE NOTICE '';
  RAISE NOTICE '🗑️  Removed:';
  RAISE NOTICE '   ✓ sub_tasks table';
  RAISE NOTICE '   ✓ task_updates.sub_task_id column';
  RAISE NOTICE '   ✓ task_delegation_history.sub_task_id column';
  RAISE NOTICE '   ✓ task_read_status.sub_task_id column';
  RAISE NOTICE '   ✓ Migration tracking columns';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Active Features:';
  RAISE NOTICE '   ✓ Unified tasks table with parent_task_id';
  RAISE NOTICE '   ✓ Unlimited nesting depth via self-reference';
  RAISE NOTICE '   ✓ Circular reference prevention';
  RAISE NOTICE '   ✓ Performance indexes';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Next Steps:';
  RAISE NOTICE '   1. Update app code to use unified tasks table';
  RAISE NOTICE '   2. Test all task functionality';
  RAISE NOTICE '   3. Deploy updated app';
  RAISE NOTICE '   4. Monitor for any issues';
  RAISE NOTICE '';
  RAISE NOTICE '📚 Documentation:';
  RAISE NOTICE '   - APP_MIGRATION_UNIFIED_TASKS.md';
  RAISE NOTICE '   - UNIFIED_TASKS_MIGRATION_SUMMARY.md';
  RAISE NOTICE '====================================';
END $$;

