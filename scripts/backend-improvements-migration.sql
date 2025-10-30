-- =====================================================
-- BuildTrack Backend Improvements Migration
-- =====================================================
-- Run this in Supabase SQL Editor
-- This adds database-side business logic, security, and performance improvements
-- Estimated runtime: 30-60 seconds
-- =====================================================

-- =====================================================
-- PART 1: Add Missing Columns (if not already present)
-- =====================================================

-- Add review workflow columns to tasks
DO $$ 
BEGIN
  -- ready_for_review
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='tasks' AND column_name='ready_for_review'
  ) THEN
    ALTER TABLE tasks ADD COLUMN ready_for_review BOOLEAN DEFAULT false;
  END IF;

  -- review_accepted
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='tasks' AND column_name='review_accepted'
  ) THEN
    ALTER TABLE tasks ADD COLUMN review_accepted BOOLEAN;
  END IF;

  -- reviewed_by
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='tasks' AND column_name='reviewed_by'
  ) THEN
    ALTER TABLE tasks ADD COLUMN reviewed_by UUID REFERENCES users(id);
  END IF;

  -- reviewed_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='tasks' AND column_name='reviewed_at'
  ) THEN
    ALTER TABLE tasks ADD COLUMN reviewed_at TIMESTAMPTZ;
  END IF;

  -- starred_by_users (for "Today's Tasks")
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='tasks' AND column_name='starred_by_users'
  ) THEN
    ALTER TABLE tasks ADD COLUMN starred_by_users UUID[] DEFAULT '{}';
  END IF;

  -- company_id for data isolation
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='tasks' AND column_name='company_id'
  ) THEN
    ALTER TABLE tasks ADD COLUMN company_id UUID REFERENCES companies(id);
    -- Populate from project's company_id
    UPDATE tasks SET company_id = (
      SELECT company_id FROM projects WHERE projects.id = tasks.project_id
    );
  END IF;
END $$;

-- Add same review columns to sub_tasks
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='sub_tasks' AND column_name='ready_for_review'
  ) THEN
    ALTER TABLE sub_tasks ADD COLUMN ready_for_review BOOLEAN DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='sub_tasks' AND column_name='review_accepted'
  ) THEN
    ALTER TABLE sub_tasks ADD COLUMN review_accepted BOOLEAN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='sub_tasks' AND column_name='reviewed_by'
  ) THEN
    ALTER TABLE sub_tasks ADD COLUMN reviewed_by UUID REFERENCES users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='sub_tasks' AND column_name='reviewed_at'
  ) THEN
    ALTER TABLE sub_tasks ADD COLUMN reviewed_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='sub_tasks' AND column_name='starred_by_users'
  ) THEN
    ALTER TABLE sub_tasks ADD COLUMN starred_by_users UUID[] DEFAULT '{}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name='sub_tasks' AND column_name='company_id'
  ) THEN
    ALTER TABLE sub_tasks ADD COLUMN company_id UUID REFERENCES companies(id);
    UPDATE sub_tasks SET company_id = (
      SELECT company_id FROM projects WHERE projects.id = sub_tasks.project_id
    );
  END IF;
END $$;

-- =====================================================
-- PART 2: Business Logic Triggers
-- =====================================================

-- Trigger 1: Auto-accept self-assigned tasks when completed
CREATE OR REPLACE FUNCTION auto_accept_self_assigned_tasks()
RETURNS TRIGGER AS $$
BEGIN
  -- Only auto-accept if:
  -- 1. Task is marked as 100% complete
  -- 2. Task is assigned to only one person (the creator)
  -- 3. Not already accepted
  IF NEW.completion_percentage = 100 
     AND NEW.review_accepted IS DISTINCT FROM true
     AND array_length(NEW.assigned_to, 1) = 1
     AND NEW.assigned_by = NEW.assigned_to[1] 
  THEN
    NEW.review_accepted := true;
    NEW.reviewed_by := NEW.assigned_by;
    NEW.reviewed_at := NOW();
    NEW.current_status := 'completed';
    
    RAISE NOTICE 'Auto-accepted self-assigned task: %', NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_accept_self_assigned ON tasks;
CREATE TRIGGER trg_auto_accept_self_assigned
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION auto_accept_self_assigned_tasks();

-- Same trigger for sub_tasks
DROP TRIGGER IF EXISTS trg_auto_accept_self_assigned_subtask ON sub_tasks;
CREATE TRIGGER trg_auto_accept_self_assigned_subtask
  BEFORE UPDATE ON sub_tasks
  FOR EACH ROW
  EXECUTE FUNCTION auto_accept_self_assigned_tasks();

-- Trigger 2: Prevent deleting last admin in a company
CREATE OR REPLACE FUNCTION prevent_last_admin_deletion()
RETURNS TRIGGER AS $$
DECLARE
  remaining_admins INTEGER;
BEGIN
  -- Only check if deleting an admin
  IF OLD.role = 'admin' THEN
    -- Count remaining admins in this company
    SELECT COUNT(*) INTO remaining_admins
    FROM users
    WHERE company_id = OLD.company_id
      AND role = 'admin'
      AND id <> OLD.id;
    
    IF remaining_admins = 0 THEN
      RAISE EXCEPTION 'Cannot delete last admin in company. Company must have at least one admin user.';
    END IF;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_last_admin_deletion ON users;
CREATE TRIGGER trg_prevent_last_admin_deletion
  BEFORE DELETE ON users
  FOR EACH ROW
  EXECUTE FUNCTION prevent_last_admin_deletion();

-- Trigger 3: Prevent changing last admin's role to non-admin
CREATE OR REPLACE FUNCTION prevent_last_admin_role_change()
RETURNS TRIGGER AS $$
DECLARE
  remaining_admins INTEGER;
BEGIN
  -- Check if changing FROM admin TO something else
  IF OLD.role = 'admin' AND NEW.role <> 'admin' THEN
    -- Count remaining admins after this change
    SELECT COUNT(*) INTO remaining_admins
    FROM users
    WHERE company_id = OLD.company_id
      AND role = 'admin'
      AND id <> OLD.id;
    
    IF remaining_admins = 0 THEN
      RAISE EXCEPTION 'Cannot change role of last admin. Company must have at least one admin user.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_last_admin_role_change ON users;
CREATE TRIGGER trg_prevent_last_admin_role_change
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION prevent_last_admin_role_change();

-- Trigger 4: Auto-update task.updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tasks_updated_at ON tasks;
CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_sub_tasks_updated_at ON sub_tasks;
CREATE TRIGGER trg_sub_tasks_updated_at
  BEFORE UPDATE ON sub_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_projects_updated_at ON projects;
CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_timestamp();

-- =====================================================
-- PART 3: Stronger RLS Policies
-- =====================================================

-- Drop old basic policies (will be replaced with stronger ones)
DROP POLICY IF EXISTS "Users can view their company" ON companies;
DROP POLICY IF EXISTS "Users can view company users" ON users;
DROP POLICY IF EXISTS "Users can view assigned projects" ON projects;
DROP POLICY IF EXISTS "Users can view company assignments" ON user_project_assignments;

-- Company Policies
CREATE POLICY "company_select_own" ON companies
  FOR SELECT USING (
    id = (SELECT company_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "company_update_admins_only" ON companies
  FOR UPDATE USING (
    id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- User Policies
CREATE POLICY "users_select_same_company" ON users
  FOR SELECT USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "users_insert_admins_only" ON users
  FOR INSERT WITH CHECK (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "users_update_admins_only" ON users
  FOR UPDATE USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "users_delete_admins_only" ON users
  FOR DELETE USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    -- Note: Last admin deletion is prevented by trigger
  );

-- Project Policies
CREATE POLICY "projects_select_same_company" ON projects
  FOR SELECT USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    OR id IN (
      SELECT project_id FROM user_project_assignments 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

CREATE POLICY "projects_insert_managers_and_admins" ON projects
  FOR INSERT WITH CHECK (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
        AND role IN ('admin', 'manager')
    )
  );

CREATE POLICY "projects_update_managers_and_admins" ON projects
  FOR UPDATE USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
        AND role IN ('admin', 'manager')
    )
  );

-- Task Policies
CREATE POLICY "tasks_select_same_company" ON tasks
  FOR SELECT USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "tasks_insert_same_company" ON tasks
  FOR INSERT WITH CHECK (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "tasks_update_same_company" ON tasks
  FOR UPDATE USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "tasks_delete_creator_only" ON tasks
  FOR DELETE USING (
    assigned_by = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Sub-tasks Policies (mirror tasks)
CREATE POLICY "subtasks_select_same_company" ON sub_tasks
  FOR SELECT USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "subtasks_insert_same_company" ON sub_tasks
  FOR INSERT WITH CHECK (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "subtasks_update_same_company" ON sub_tasks
  FOR UPDATE USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- Task Updates Policies
CREATE POLICY "task_updates_select_same_company" ON task_updates
  FOR SELECT USING (
    task_id IN (
      SELECT id FROM tasks WHERE company_id = (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "task_updates_insert_same_company" ON task_updates
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND task_id IN (
      SELECT id FROM tasks WHERE company_id = (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- User Project Assignments Policies
CREATE POLICY "assignments_select_same_company" ON user_project_assignments
  FOR SELECT USING (
    user_id IN (
      SELECT id FROM users WHERE company_id = (
        SELECT company_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "assignments_insert_managers_admins" ON user_project_assignments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
        AND role IN ('admin', 'manager')
        AND company_id = (SELECT company_id FROM users WHERE user_id = user_project_assignments.user_id)
    )
  );

-- =====================================================
-- PART 4: Performance - Database Views (camelCase)
-- =====================================================

-- Tasks view with camelCase fields
CREATE OR REPLACE VIEW tasks_api AS
SELECT 
  id,
  project_id                  AS "projectId",
  title,
  description,
  priority,
  category,
  due_date                    AS "dueDate",
  current_status              AS "currentStatus",
  completion_percentage       AS "completionPercentage",
  assigned_to                 AS "assignedTo",
  assigned_by                 AS "assignedBy",
  location,
  attachments,
  accepted,
  decline_reason              AS "declineReason",
  ready_for_review            AS "readyForReview",
  review_accepted             AS "reviewAccepted",
  reviewed_by                 AS "reviewedBy",
  reviewed_at                 AS "reviewedAt",
  starred_by_users            AS "starredByUsers",
  company_id                  AS "companyId",
  created_at                  AS "createdAt",
  updated_at                  AS "updatedAt"
FROM tasks;

-- Sub-tasks view with camelCase fields
CREATE OR REPLACE VIEW sub_tasks_api AS
SELECT 
  id,
  parent_task_id              AS "parentTaskId",
  parent_sub_task_id          AS "parentSubTaskId",
  project_id                  AS "projectId",
  title,
  description,
  priority,
  category,
  due_date                    AS "dueDate",
  current_status              AS "currentStatus",
  completion_percentage       AS "completionPercentage",
  assigned_to                 AS "assignedTo",
  assigned_by                 AS "assignedBy",
  location,
  attachments,
  accepted,
  decline_reason              AS "declineReason",
  ready_for_review            AS "readyForReview",
  review_accepted             AS "reviewAccepted",
  reviewed_by                 AS "reviewedBy",
  reviewed_at                 AS "reviewedAt",
  starred_by_users            AS "starredByUsers",
  company_id                  AS "companyId",
  created_at                  AS "createdAt",
  updated_at                  AS "updatedAt"
FROM sub_tasks;

-- Task updates view with camelCase fields
CREATE OR REPLACE VIEW task_updates_api AS
SELECT 
  id,
  task_id                     AS "taskId",
  sub_task_id                 AS "subTaskId",
  user_id                     AS "userId",
  description,
  photos,
  completion_percentage       AS "completionPercentage",
  status,
  timestamp
FROM task_updates;

-- Projects view with camelCase fields
CREATE OR REPLACE VIEW projects_api AS
SELECT 
  id,
  name,
  description,
  status,
  start_date                  AS "startDate",
  end_date                    AS "endDate",
  budget,
  location,
  client_info                 AS "clientInfo",
  created_by                  AS "createdBy",
  company_id                  AS "companyId",
  created_at                  AS "createdAt",
  updated_at                  AS "updatedAt"
FROM projects;

-- Users view with camelCase fields
CREATE OR REPLACE VIEW users_api AS
SELECT 
  id,
  email,
  name,
  role,
  company_id                  AS "companyId",
  position,
  phone,
  created_at                  AS "createdAt"
FROM users;

-- =====================================================
-- PART 5: Performance - RPC Functions
-- =====================================================

-- RPC: Get all tasks with nested subtasks and updates (1 query instead of 3+)
CREATE OR REPLACE FUNCTION get_tasks_with_nested_data()
RETURNS TABLE (
  id UUID,
  "projectId" UUID,
  title TEXT,
  description TEXT,
  priority TEXT,
  category TEXT,
  "dueDate" TIMESTAMPTZ,
  "currentStatus" TEXT,
  "completionPercentage" INTEGER,
  "assignedTo" UUID[],
  "assignedBy" UUID,
  location JSONB,
  attachments TEXT[],
  accepted BOOLEAN,
  "declineReason" TEXT,
  "readyForReview" BOOLEAN,
  "reviewAccepted" BOOLEAN,
  "reviewedBy" UUID,
  "reviewedAt" TIMESTAMPTZ,
  "starredByUsers" UUID[],
  "companyId" UUID,
  "createdAt" TIMESTAMPTZ,
  "updatedAt" TIMESTAMPTZ,
  subtasks JSONB,
  updates JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.project_id,
    t.title,
    t.description,
    t.priority,
    t.category,
    t.due_date,
    t.current_status,
    t.completion_percentage,
    t.assigned_to,
    t.assigned_by,
    t.location,
    t.attachments,
    t.accepted,
    t.decline_reason,
    t.ready_for_review,
    t.review_accepted,
    t.reviewed_by,
    t.reviewed_at,
    t.starred_by_users,
    t.company_id,
    t.created_at,
    t.updated_at,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', st.id,
            'parentTaskId', st.parent_task_id,
            'parentSubTaskId', st.parent_sub_task_id,
            'projectId', st.project_id,
            'title', st.title,
            'description', st.description,
            'priority', st.priority,
            'category', st.category,
            'dueDate', st.due_date,
            'currentStatus', st.current_status,
            'completionPercentage', st.completion_percentage,
            'assignedTo', st.assigned_to,
            'assignedBy', st.assigned_by,
            'location', st.location,
            'attachments', st.attachments,
            'accepted', st.accepted,
            'declineReason', st.decline_reason,
            'readyForReview', st.ready_for_review,
            'reviewAccepted', st.review_accepted,
            'reviewedBy', st.reviewed_by,
            'reviewedAt', st.reviewed_at,
            'starredByUsers', st.starred_by_users,
            'createdAt', st.created_at,
            'updatedAt', st.updated_at
          ) ORDER BY st.created_at
        )
        FROM sub_tasks st
        WHERE st.parent_task_id = t.id
      ), '[]'::jsonb
    ) AS subtasks,
    COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', tu.id,
            'taskId', tu.task_id,
            'subTaskId', tu.sub_task_id,
            'userId', tu.user_id,
            'description', tu.description,
            'photos', tu.photos,
            'completionPercentage', tu.completion_percentage,
            'status', tu.status,
            'timestamp', tu.timestamp
          ) ORDER BY tu.timestamp DESC
        )
        FROM task_updates tu
        WHERE tu.task_id = t.id
      ), '[]'::jsonb
    ) AS updates
  FROM tasks t
  WHERE t.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  ORDER BY t.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- RPC: Get task by ID with all nested data
CREATE OR REPLACE FUNCTION get_task_by_id(task_id UUID)
RETURNS TABLE (
  id UUID,
  "projectId" UUID,
  title TEXT,
  description TEXT,
  priority TEXT,
  category TEXT,
  "dueDate" TIMESTAMPTZ,
  "currentStatus" TEXT,
  "completionPercentage" INTEGER,
  "assignedTo" UUID[],
  "assignedBy" UUID,
  location JSONB,
  attachments TEXT[],
  accepted BOOLEAN,
  "declineReason" TEXT,
  "readyForReview" BOOLEAN,
  "reviewAccepted" BOOLEAN,
  "reviewedBy" UUID,
  "reviewedAt" TIMESTAMPTZ,
  "starredByUsers" UUID[],
  "companyId" UUID,
  "createdAt" TIMESTAMPTZ,
  "updatedAt" TIMESTAMPTZ,
  subtasks JSONB,
  updates JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM get_tasks_with_nested_data()
  WHERE id = task_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- =====================================================
-- PART 6: Indexes for Better Performance
-- =====================================================

-- Add indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_tasks_company_id ON tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_tasks_ready_for_review ON tasks(ready_for_review) WHERE ready_for_review = true;
CREATE INDEX IF NOT EXISTS idx_tasks_review_accepted ON tasks(review_accepted) WHERE review_accepted = true;
CREATE INDEX IF NOT EXISTS idx_tasks_starred ON tasks USING GIN(starred_by_users) WHERE starred_by_users IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sub_tasks_company_id ON sub_tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_sub_tasks_parent_task ON sub_tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_projects_company_id ON projects(company_id);

-- =====================================================
-- VERIFICATION & COMPLETION
-- =====================================================

-- Test that triggers work
DO $$
DECLARE
  test_result TEXT;
BEGIN
  -- Verify auto-accept trigger exists
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trg_auto_accept_self_assigned'
  ) THEN
    RAISE NOTICE '✅ Auto-accept trigger created successfully';
  ELSE
    RAISE WARNING '❌ Auto-accept trigger not found';
  END IF;

  -- Verify last admin protection trigger exists
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'trg_prevent_last_admin_deletion'
  ) THEN
    RAISE NOTICE '✅ Last admin protection trigger created successfully';
  ELSE
    RAISE WARNING '❌ Last admin protection trigger not found';
  END IF;

  -- Verify RPC function exists
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'get_tasks_with_nested_data'
  ) THEN
    RAISE NOTICE '✅ get_tasks_with_nested_data RPC created successfully';
  ELSE
    RAISE WARNING '❌ get_tasks_with_nested_data RPC not found';
  END IF;

  -- Verify views exist
  IF EXISTS (
    SELECT 1 FROM pg_views 
    WHERE viewname = 'tasks_api'
  ) THEN
    RAISE NOTICE '✅ tasks_api view created successfully';
  ELSE
    RAISE WARNING '❌ tasks_api view not found';
  END IF;

  RAISE NOTICE '====================================';
  RAISE NOTICE '✅ MIGRATION COMPLETE!';
  RAISE NOTICE '====================================';
  RAISE NOTICE 'Added:';
  RAISE NOTICE '  - Review workflow columns';
  RAISE NOTICE '  - 4 business logic triggers';
  RAISE NOTICE '  - Enhanced RLS policies';
  RAISE NOTICE '  - 5 API views with camelCase';
  RAISE NOTICE '  - 2 RPC functions';
  RAISE NOTICE '  - Performance indexes';
  RAISE NOTICE '====================================';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. Update app to use RPC functions (optional)';
  RAISE NOTICE '  2. Remove client-side business logic (optional)';
  RAISE NOTICE '  3. Test with your app';
  RAISE NOTICE '====================================';
END $$;

