-- Migration: Add redesign metadata fields to tasks table
-- Description: Adds assignee split fields, lightweight container metadata, and tags
-- Date: 2026-07-07

-- ============================================================================
-- REDESIGN ASSIGNMENT METADATA
-- ============================================================================

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS primary_assignee_id TEXT;

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS delegated_user_ids TEXT[] DEFAULT ARRAY[]::TEXT[];

CREATE INDEX IF NOT EXISTS idx_tasks_primary_assignee_id ON tasks(primary_assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_delegated_user_ids ON tasks USING GIN(delegated_user_ids);

COMMENT ON COLUMN tasks.primary_assignee_id IS 'Primary assignee for redesign-safe owner presentation. Kept as text for compatibility with existing runtime identifier normalization.';
COMMENT ON COLUMN tasks.delegated_user_ids IS 'Additional delegated assignee identifiers for redesign-safe ownership presentation.';

-- ============================================================================
-- REDESIGN LOCATION / GROUPING METADATA
-- ============================================================================

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS container_id TEXT;

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS sub_container_id TEXT;

CREATE INDEX IF NOT EXISTS idx_tasks_container_id ON tasks(container_id);
CREATE INDEX IF NOT EXISTS idx_tasks_sub_container_id ON tasks(sub_container_id);

COMMENT ON COLUMN tasks.container_id IS 'Optional lightweight container or area label used by redesign task grouping and location chips.';
COMMENT ON COLUMN tasks.sub_container_id IS 'Optional nested container label used by redesign task grouping and location chips.';

-- ============================================================================
-- REDESIGN TAG METADATA
-- ============================================================================

ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT ARRAY[]::TEXT[];

CREATE INDEX IF NOT EXISTS idx_tasks_tags ON tasks USING GIN(tags);

COMMENT ON COLUMN tasks.tags IS 'Flexible task metadata tags used by redesign filters, emphasis states, and lightweight categorization.';

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'tasks'
  AND column_name IN (
    'primary_assignee_id',
    'delegated_user_ids',
    'container_id',
    'sub_container_id',
    'tags'
  )
ORDER BY column_name;
