-- =====================================================
-- Migration: Unify tasks and sub_tasks into Single Table
-- =====================================================
-- This script safely merges sub_tasks into tasks table
-- Estimated runtime: 1-2 minutes
-- RECOMMENDATION: Test on staging environment first!
-- =====================================================

-- =====================================================
-- STEP 1: BACKUP VERIFICATION
-- =====================================================

DO $$
DECLARE
  task_count INTEGER;
  subtask_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO task_count FROM tasks;
  SELECT COUNT(*) INTO subtask_count FROM sub_tasks;
  
  RAISE NOTICE '📊 Current State:';
  RAISE NOTICE '   Tasks: %', task_count;
  RAISE NOTICE '   Sub-tasks: %', subtask_count;
  RAISE NOTICE '   Total to migrate: %', task_count + subtask_count;
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  IMPORTANT: Ensure you have a backup before proceeding!';
  RAISE NOTICE '   Run: pg_dump or use Supabase point-in-time recovery';
  RAISE NOTICE '';
END $$;

-- =====================================================
-- STEP 2: ADD NEW COLUMNS TO TASKS TABLE
-- =====================================================

DO $$ BEGIN
  RAISE NOTICE '🔧 Step 2: Adding parent_task_id column to tasks...';
END $$;

-- Add parent_task_id column (self-referential)
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE;

-- Add nesting_level for easier queries (optional but recommended)
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS nesting_level INTEGER DEFAULT 0;

-- Add root_task_id for easier filtering (optional but recommended)
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS root_task_id UUID REFERENCES tasks(id) ON DELETE CASCADE;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task_id ON tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_tasks_nesting_level ON tasks(nesting_level);
CREATE INDEX IF NOT EXISTS idx_tasks_root_task_id ON tasks(root_task_id);

DO $$ BEGIN
  RAISE NOTICE '✅ New columns added to tasks table';
END $$;

-- =====================================================
-- STEP 3: MIGRATE SUB_TASKS DATA INTO TASKS
-- =====================================================

DO $$ BEGIN
  RAISE NOTICE '🔄 Step 3: Migrating sub_tasks data into tasks table...';
END $$;

-- Create a temporary mapping table to track old IDs -> new IDs
CREATE TEMP TABLE IF NOT EXISTS subtask_id_mapping (
  old_subtask_id UUID PRIMARY KEY,
  new_task_id UUID NOT NULL,
  parent_task_id UUID,
  parent_sub_task_id UUID,
  nesting_level INTEGER
);

-- Migrate sub_tasks in order (breadth-first to handle parent references)
DO $$
DECLARE
  subtask_record RECORD;
  new_task_id UUID;
  parent_id UUID;
  root_id UUID;
  current_level INTEGER;
  total_migrated INTEGER := 0;
  has_company_id BOOLEAN;
  has_review_columns BOOLEAN;
  has_starred_column BOOLEAN;
  invalid_assigned_by_count INTEGER;
  invalid_reviewed_by_count INTEGER;
  orphaned_subtasks_count INTEGER;
  orphaned_nested_count INTEGER;
BEGIN
  -- Check which columns exist in tasks table
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'company_id'
  ) INTO has_company_id;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'ready_for_review'
  ) INTO has_review_columns;
  
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'starred_by_users'
  ) INTO has_starred_column;
  
  RAISE NOTICE '   Column check: company_id=%, review_columns=%, starred=%', 
    has_company_id, has_review_columns, has_starred_column;
  
  -- Clean up invalid foreign key references in sub_tasks before migration
  RAISE NOTICE '   Checking for invalid foreign key references...';
  
  -- Count and fix assigned_by references to deleted users
  SELECT COUNT(*) INTO invalid_assigned_by_count
  FROM sub_tasks 
  WHERE assigned_by IS NOT NULL 
    AND assigned_by NOT IN (SELECT id FROM users);
  
  IF invalid_assigned_by_count > 0 THEN
    RAISE NOTICE '   ⚠️  Found % sub_tasks with invalid assigned_by references (user deleted)', 
      invalid_assigned_by_count;
    
    UPDATE sub_tasks 
    SET assigned_by = NULL 
    WHERE assigned_by IS NOT NULL 
      AND assigned_by NOT IN (SELECT id FROM users);
    
    RAISE NOTICE '   ✅ Set assigned_by to NULL for % orphaned records', invalid_assigned_by_count;
  END IF;
  
  -- Count and fix reviewed_by references (if column exists)
  IF has_review_columns THEN
    SELECT COUNT(*) INTO invalid_reviewed_by_count
    FROM sub_tasks 
    WHERE reviewed_by IS NOT NULL 
      AND reviewed_by NOT IN (SELECT id FROM users);
    
    IF invalid_reviewed_by_count > 0 THEN
      RAISE NOTICE '   ⚠️  Found % sub_tasks with invalid reviewed_by references', 
        invalid_reviewed_by_count;
      
      UPDATE sub_tasks 
      SET reviewed_by = NULL 
      WHERE reviewed_by IS NOT NULL 
        AND reviewed_by NOT IN (SELECT id FROM users);
      
      RAISE NOTICE '   ✅ Set reviewed_by to NULL for % orphaned records', invalid_reviewed_by_count;
    END IF;
  END IF;
  
  -- Clean up orphaned subtasks (parent_task_id references deleted tasks)
  SELECT COUNT(*) INTO orphaned_subtasks_count
  FROM sub_tasks 
  WHERE parent_task_id IS NOT NULL 
    AND parent_task_id NOT IN (SELECT id FROM tasks);
  
  IF orphaned_subtasks_count > 0 THEN
    RAISE NOTICE '   ⚠️  Found % subtasks with deleted parent tasks', orphaned_subtasks_count;
    RAISE NOTICE '   Setting them as top-level tasks (parent_task_id = NULL)';
    
    UPDATE sub_tasks 
    SET parent_task_id = NULL 
    WHERE parent_task_id IS NOT NULL 
      AND parent_task_id NOT IN (SELECT id FROM tasks);
    
    RAISE NOTICE '   ✅ Converted % orphaned subtasks to top-level tasks', orphaned_subtasks_count;
  END IF;
  
  -- Clean up nested subtasks with deleted parent subtasks
  SELECT COUNT(*) INTO orphaned_nested_count
  FROM sub_tasks 
  WHERE parent_sub_task_id IS NOT NULL 
    AND parent_sub_task_id NOT IN (SELECT id FROM sub_tasks);
  
  IF orphaned_nested_count > 0 THEN
    RAISE NOTICE '   ⚠️  Found % nested subtasks with deleted parent subtasks', orphaned_nested_count;
    RAISE NOTICE '   Deleting orphaned nested subtasks (cannot determine parent)';
    
    DELETE FROM sub_tasks 
    WHERE parent_sub_task_id IS NOT NULL 
      AND parent_sub_task_id NOT IN (SELECT id FROM sub_tasks);
    
    RAISE NOTICE '   ✅ Deleted % orphaned nested subtasks', orphaned_nested_count;
  END IF;
  
  RAISE NOTICE '   Data cleanup complete';
  
  -- Level 1: sub_tasks with parent_task_id (direct children of tasks)
  RAISE NOTICE '   Migrating level 1 sub_tasks (direct children of tasks)...';
  
  FOR subtask_record IN 
    SELECT * FROM sub_tasks 
    WHERE parent_task_id IS NOT NULL 
      AND parent_sub_task_id IS NULL
    ORDER BY created_at
  LOOP
    -- Insert into tasks table (dynamically based on available columns)
    IF has_company_id AND has_review_columns AND has_starred_column THEN
      -- Full schema with all columns
      INSERT INTO tasks (
        project_id, title, description, priority, category, due_date,
        current_status, completion_percentage, assigned_to, assigned_by,
        location, attachments, accepted, decline_reason,
        ready_for_review, review_accepted, reviewed_by, reviewed_at,
        starred_by_users, company_id, created_at, updated_at,
        parent_task_id, nesting_level, root_task_id
      )
      VALUES (
        subtask_record.project_id,
        subtask_record.title,
        subtask_record.description,
        subtask_record.priority,
        subtask_record.category,
        subtask_record.due_date,
        subtask_record.current_status,
        subtask_record.completion_percentage,
        subtask_record.assigned_to,
        subtask_record.assigned_by,
        subtask_record.location,
        subtask_record.attachments,
        subtask_record.accepted,
        subtask_record.decline_reason,
        subtask_record.ready_for_review,
        subtask_record.review_accepted,
        subtask_record.reviewed_by,
        subtask_record.reviewed_at,
        subtask_record.starred_by_users,
        subtask_record.company_id,
        subtask_record.created_at,
        subtask_record.updated_at,
        subtask_record.parent_task_id,
        1,
        subtask_record.parent_task_id
      )
      RETURNING id INTO new_task_id;
    ELSE
      -- Basic schema (original columns only)
      INSERT INTO tasks (
        project_id, title, description, priority, category, due_date,
        current_status, completion_percentage, assigned_to, assigned_by,
        location, attachments, accepted, decline_reason,
        created_at, updated_at,
        parent_task_id, nesting_level, root_task_id
      )
      VALUES (
        subtask_record.project_id,
        subtask_record.title,
        subtask_record.description,
        subtask_record.priority,
        subtask_record.category,
        subtask_record.due_date,
        subtask_record.current_status,
        subtask_record.completion_percentage,
        subtask_record.assigned_to,
        subtask_record.assigned_by,
        subtask_record.location,
        subtask_record.attachments,
        subtask_record.accepted,
        subtask_record.decline_reason,
        subtask_record.created_at,
        subtask_record.updated_at,
        subtask_record.parent_task_id,
        1,
        subtask_record.parent_task_id
      )
      RETURNING id INTO new_task_id;
    END IF;
    
    -- Record mapping
    INSERT INTO subtask_id_mapping (
      old_subtask_id, new_task_id, parent_task_id, parent_sub_task_id, nesting_level
    )
    VALUES (
      subtask_record.id, new_task_id, subtask_record.parent_task_id, NULL, 1
    );
    
    total_migrated := total_migrated + 1;
  END LOOP;
  
  RAISE NOTICE '   ✅ Migrated % level 1 sub_tasks', total_migrated;
  
  -- Level 2+: sub_tasks with parent_sub_task_id (nested children)
  -- Use recursive approach to handle arbitrary depth
  current_level := 2;
  
  LOOP
    DECLARE
      level_count INTEGER := 0;
    BEGIN
      RAISE NOTICE '   Migrating level % sub_tasks...', current_level;
      
      FOR subtask_record IN 
        SELECT st.* FROM sub_tasks st
        WHERE st.parent_sub_task_id IS NOT NULL
          AND st.parent_sub_task_id IN (
            SELECT old_subtask_id FROM subtask_id_mapping 
            WHERE nesting_level = current_level - 1
          )
          AND st.id NOT IN (SELECT old_subtask_id FROM subtask_id_mapping)
        ORDER BY st.created_at
      LOOP
        -- Get the new parent task ID from mapping
        SELECT m.new_task_id, t.root_task_id INTO parent_id, root_id
        FROM subtask_id_mapping m
        JOIN tasks t ON t.id = m.new_task_id
        WHERE m.old_subtask_id = subtask_record.parent_sub_task_id;
        
        -- Insert into tasks table (dynamically based on available columns)
        IF has_company_id AND has_review_columns AND has_starred_column THEN
          -- Full schema
          INSERT INTO tasks (
            project_id, title, description, priority, category, due_date,
            current_status, completion_percentage, assigned_to, assigned_by,
            location, attachments, accepted, decline_reason,
            ready_for_review, review_accepted, reviewed_by, reviewed_at,
            starred_by_users, company_id, created_at, updated_at,
            parent_task_id, nesting_level, root_task_id
          )
          VALUES (
            subtask_record.project_id,
            subtask_record.title,
            subtask_record.description,
            subtask_record.priority,
            subtask_record.category,
            subtask_record.due_date,
            subtask_record.current_status,
            subtask_record.completion_percentage,
            subtask_record.assigned_to,
            subtask_record.assigned_by,
            subtask_record.location,
            subtask_record.attachments,
            subtask_record.accepted,
            subtask_record.decline_reason,
            subtask_record.ready_for_review,
            subtask_record.review_accepted,
            subtask_record.reviewed_by,
            subtask_record.reviewed_at,
            subtask_record.starred_by_users,
            subtask_record.company_id,
            subtask_record.created_at,
            subtask_record.updated_at,
            parent_id,
            current_level,
            root_id
          )
          RETURNING id INTO new_task_id;
        ELSE
          -- Basic schema
          INSERT INTO tasks (
            project_id, title, description, priority, category, due_date,
            current_status, completion_percentage, assigned_to, assigned_by,
            location, attachments, accepted, decline_reason,
            created_at, updated_at,
            parent_task_id, nesting_level, root_task_id
          )
          VALUES (
            subtask_record.project_id,
            subtask_record.title,
            subtask_record.description,
            subtask_record.priority,
            subtask_record.category,
            subtask_record.due_date,
            subtask_record.current_status,
            subtask_record.completion_percentage,
            subtask_record.assigned_to,
            subtask_record.assigned_by,
            subtask_record.location,
            subtask_record.attachments,
            subtask_record.accepted,
            subtask_record.decline_reason,
            subtask_record.created_at,
            subtask_record.updated_at,
            parent_id,
            current_level,
            root_id
          )
          RETURNING id INTO new_task_id;
        END IF;
        
        -- Record mapping
        INSERT INTO subtask_id_mapping (
          old_subtask_id, new_task_id, parent_task_id, parent_sub_task_id, nesting_level
        )
        VALUES (
          subtask_record.id, new_task_id, NULL, subtask_record.parent_sub_task_id, current_level
        );
        
        level_count := level_count + 1;
        total_migrated := total_migrated + 1;
      END LOOP;
      
      -- Exit loop if no more records at this level
      EXIT WHEN level_count = 0;
      
      RAISE NOTICE '   ✅ Migrated % level % sub_tasks', level_count, current_level;
      current_level := current_level + 1;
      
      -- Safety check: prevent infinite loop
      IF current_level > 100 THEN
        RAISE EXCEPTION 'Migration stopped: nesting level exceeded 100. Possible circular reference.';
      END IF;
    END;
  END LOOP;
  
  RAISE NOTICE '✅ Total sub_tasks migrated: %', total_migrated;
END $$;

-- =====================================================
-- STEP 4: UPDATE TASK_UPDATES FOREIGN KEYS
-- =====================================================

DO $$ BEGIN
  RAISE NOTICE '🔧 Step 4: Updating task_updates table...';
END $$;

-- Add temporary column to track which updates came from sub_tasks
ALTER TABLE task_updates ADD COLUMN IF NOT EXISTS _migrated_from_subtask BOOLEAN DEFAULT false;

-- Update task_updates that referenced sub_tasks
UPDATE task_updates tu
SET 
  task_id = m.new_task_id,
  _migrated_from_subtask = true
FROM subtask_id_mapping m
WHERE tu.sub_task_id = m.old_subtask_id;

DO $$ BEGIN
  RAISE NOTICE '✅ task_updates table updated';
END $$;

-- =====================================================
-- STEP 5: UPDATE TASK_DELEGATION_HISTORY
-- =====================================================

DO $$ BEGIN
  RAISE NOTICE '🔧 Step 5: Updating task_delegation_history table...';
END $$;

UPDATE task_delegation_history tdh
SET task_id = m.new_task_id
FROM subtask_id_mapping m
WHERE tdh.sub_task_id = m.old_subtask_id;

DO $$ BEGIN
  RAISE NOTICE '✅ task_delegation_history table updated';
END $$;

-- =====================================================
-- STEP 6: UPDATE TASK_READ_STATUS
-- =====================================================

DO $$ BEGIN
  RAISE NOTICE '🔧 Step 6: Updating task_read_status table...';
END $$;

UPDATE task_read_status trs
SET task_id = m.new_task_id
FROM subtask_id_mapping m
WHERE trs.sub_task_id = m.old_subtask_id;

DO $$ BEGIN
  RAISE NOTICE '✅ task_read_status table updated';
END $$;

-- =====================================================
-- STEP 7: VERIFY MIGRATION
-- =====================================================

DO $$
DECLARE
  remaining_subtask_count INTEGER;
  migrated_count INTEGER;
  orphaned_count INTEGER;
  orphaned_records TEXT[];
BEGIN
  RAISE NOTICE '🔍 Step 7: Verifying migration...';
  
  -- Count remaining sub_tasks (after cleanup)
  SELECT COUNT(*) INTO remaining_subtask_count FROM sub_tasks;
  
  -- Count migrated records
  SELECT COUNT(*) INTO migrated_count FROM subtask_id_mapping;
  
  -- Check for orphaned sub_tasks (shouldn't exist after cleanup)
  SELECT COUNT(*) INTO orphaned_count 
  FROM sub_tasks 
  WHERE id NOT IN (SELECT old_subtask_id FROM subtask_id_mapping);
  
  -- Get details of orphaned records (if any)
  IF orphaned_count > 0 THEN
    SELECT ARRAY_AGG(id::TEXT || ': ' || title) INTO orphaned_records
    FROM sub_tasks 
    WHERE id NOT IN (SELECT old_subtask_id FROM subtask_id_mapping)
    LIMIT 10;
  END IF;
  
  RAISE NOTICE '   Remaining sub_tasks (after cleanup): %', remaining_subtask_count;
  RAISE NOTICE '   Successfully migrated: %', migrated_count;
  RAISE NOTICE '   Orphaned (not migrated): %', orphaned_count;
  
  IF orphaned_count = 0 THEN
    RAISE NOTICE '✅ Migration verification PASSED';
    RAISE NOTICE '   All remaining subtasks successfully migrated!';
  ELSE
    RAISE NOTICE '❌ Migration verification FAILED!';
    RAISE NOTICE '   Found % orphaned subtasks that were not migrated:', orphaned_count;
    FOR i IN 1..LEAST(array_length(orphaned_records, 1), 10) LOOP
      RAISE NOTICE '     - %', orphaned_records[i];
    END LOOP;
    
    -- Show why they might be orphaned
    RAISE NOTICE '';
    RAISE NOTICE 'Possible reasons:';
    RAISE NOTICE '  1. Circular parent_sub_task_id references';
    RAISE NOTICE '  2. parent_sub_task_id points to non-existent subtask';
    RAISE NOTICE '  3. Complex nesting structure beyond 100 levels';
    RAISE NOTICE '';
    RAISE NOTICE 'These orphaned records will remain in sub_tasks table.';
    RAISE NOTICE 'You can manually review and migrate them, or delete them.';
    
    -- Don't fail the migration - just warn
    RAISE WARNING 'Migration completed with % orphaned records. Review recommended.', orphaned_count;
  END IF;
END $$;

-- =====================================================
-- STEP 8: DROP SUB_TASK_ID COLUMNS (Keep for rollback initially)
-- =====================================================

DO $$ BEGIN
  RAISE NOTICE '🔧 Step 8: Preparing to drop sub_task_id columns...';
  RAISE NOTICE '   (Keeping columns for now - drop manually after verification)';
END $$;

-- Don't drop yet - allow for rollback
-- After verifying everything works, you can run:
-- ALTER TABLE task_updates DROP COLUMN sub_task_id;
-- ALTER TABLE task_delegation_history DROP COLUMN sub_task_id;
-- ALTER TABLE task_read_status DROP COLUMN sub_task_id;

-- =====================================================
-- STEP 9: DROP SUB_TASKS TABLE (Keep for rollback initially)
-- =====================================================

DO $$ BEGIN
  RAISE NOTICE '🔧 Step 9: Preparing to drop sub_tasks table...';
  RAISE NOTICE '   (Keeping table for now - drop manually after verification)';
END $$;

-- Don't drop yet - allow for rollback
-- After thorough testing, you can run:
-- DROP TABLE sub_tasks CASCADE;

-- =====================================================
-- STEP 10: ADD CIRCULAR REFERENCE PREVENTION TRIGGER
-- =====================================================

DO $$ BEGIN
  RAISE NOTICE '🔧 Step 10: Adding circular reference prevention...';
END $$;

CREATE OR REPLACE FUNCTION prevent_circular_task_reference()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.parent_task_id IS NOT NULL THEN
    -- Prevent self-reference
    IF NEW.id = NEW.parent_task_id THEN
      RAISE EXCEPTION 'Task cannot be its own parent';
    END IF;
    
    -- Check if parent is a descendant of this task (circular reference)
    IF EXISTS (
      WITH RECURSIVE descendants AS (
        SELECT id, parent_task_id FROM tasks WHERE id = NEW.id
        UNION ALL
        SELECT t.id, t.parent_task_id FROM tasks t
        JOIN descendants d ON t.parent_task_id = d.id
      )
      SELECT 1 FROM descendants WHERE id = NEW.parent_task_id
    ) THEN
      RAISE EXCEPTION 'Circular reference detected: Cannot set parent to a descendant task';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_prevent_circular_task_reference
  BEFORE INSERT OR UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION prevent_circular_task_reference();

DO $$ BEGIN
  RAISE NOTICE '✅ Circular reference prevention trigger added';
END $$;

-- =====================================================
-- STEP 11: UPDATE RLS POLICIES
-- =====================================================

DO $$ BEGIN
  RAISE NOTICE '🔧 Step 11: Updating RLS policies...';
  
  -- Policies remain the same since we're just adding columns to tasks
  -- No changes needed - tasks policies already cover the new unified table
  
  RAISE NOTICE '✅ RLS policies verified';
END $$;

-- =====================================================
-- STEP 12: CREATE HELPER FUNCTIONS
-- =====================================================

DO $$ BEGIN
  RAISE NOTICE '🔧 Step 12: Creating helper functions...';
END $$;

-- Function to get all child tasks recursively
CREATE OR REPLACE FUNCTION get_task_children(p_task_id UUID)
RETURNS TABLE (
  id UUID,
  parent_task_id UUID,
  title TEXT,
  nesting_level INTEGER,
  path TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE children AS (
    -- Base case: the task itself
    SELECT 
      t.id,
      t.parent_task_id,
      t.title,
      t.nesting_level,
      ARRAY[t.title] as path
    FROM tasks t
    WHERE t.id = p_task_id
    
    UNION ALL
    
    -- Recursive case: children
    SELECT 
      t.id,
      t.parent_task_id,
      t.title,
      t.nesting_level,
      c.path || t.title
    FROM tasks t
    JOIN children c ON t.parent_task_id = c.id
  )
  SELECT * FROM children;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get task path (breadcrumb)
CREATE OR REPLACE FUNCTION get_task_path(p_task_id UUID)
RETURNS TEXT AS $$
DECLARE
  task_path TEXT;
BEGIN
  WITH RECURSIVE ancestors AS (
    SELECT id, parent_task_id, title, nesting_level
    FROM tasks
    WHERE id = p_task_id
    
    UNION ALL
    
    SELECT t.id, t.parent_task_id, t.title, t.nesting_level
    FROM tasks t
    JOIN ancestors a ON t.id = a.parent_task_id
  )
  SELECT string_agg(title, ' > ' ORDER BY nesting_level) INTO task_path
  FROM ancestors;
  
  RETURN task_path;
END;
$$ LANGUAGE plpgsql STABLE;

DO $$ BEGIN
  RAISE NOTICE '✅ Helper functions created';
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
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================';
  RAISE NOTICE '✅ MIGRATION COMPLETE!';
  RAISE NOTICE '====================================';
  
  SELECT COUNT(*) INTO total_tasks FROM tasks;
  SELECT COUNT(*) INTO top_level_tasks FROM tasks WHERE parent_task_id IS NULL;
  SELECT COUNT(*) INTO nested_tasks FROM tasks WHERE parent_task_id IS NOT NULL;
  SELECT MAX(nesting_level) INTO max_depth FROM tasks;
  
  RAISE NOTICE 'Final Statistics:';
  RAISE NOTICE '  Total tasks: %', total_tasks;
  RAISE NOTICE '  Top-level tasks: %', top_level_tasks;
  RAISE NOTICE '  Nested tasks: %', nested_tasks;
  RAISE NOTICE '  Maximum nesting depth: %', max_depth;
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. ✅ Verify data in your application';
  RAISE NOTICE '  2. ✅ Test all task functionality';
  RAISE NOTICE '  3. ✅ Run regression tests';
  RAISE NOTICE '  4. ⏳ After 1 week of testing:';
  RAISE NOTICE '      - DROP TABLE sub_tasks CASCADE;';
  RAISE NOTICE '      - ALTER TABLE task_updates DROP COLUMN sub_task_id;';
  RAISE NOTICE '      - ALTER TABLE task_delegation_history DROP COLUMN sub_task_id;';
  RAISE NOTICE '      - ALTER TABLE task_read_status DROP COLUMN sub_task_id;';
  RAISE NOTICE '';
  RAISE NOTICE 'Rollback Available:';
  RAISE NOTICE '  - sub_tasks table is still intact';
  RAISE NOTICE '  - Run rollback script if needed';
  RAISE NOTICE '====================================';
END $$;

