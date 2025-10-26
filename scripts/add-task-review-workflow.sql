-- Add Review Workflow to Tasks
-- Run this in Supabase SQL Editor

BEGIN;

-- Add review workflow columns to tasks table
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS ready_for_review BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS review_accepted BOOLEAN;

-- Add review workflow columns to sub_tasks table
ALTER TABLE sub_tasks
ADD COLUMN IF NOT EXISTS ready_for_review BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS review_accepted BOOLEAN;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_ready_for_review ON tasks(ready_for_review) WHERE ready_for_review = TRUE;
CREATE INDEX IF NOT EXISTS idx_tasks_reviewed_by ON tasks(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_sub_tasks_ready_for_review ON sub_tasks(ready_for_review) WHERE ready_for_review = TRUE;
CREATE INDEX IF NOT EXISTS idx_sub_tasks_reviewed_by ON sub_tasks(reviewed_by);

COMMIT;

-- Verify the changes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'tasks' 
AND column_name IN ('ready_for_review', 'reviewed_by', 'reviewed_at', 'review_accepted')
ORDER BY ordinal_position;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'sub_tasks' 
AND column_name IN ('ready_for_review', 'reviewed_by', 'reviewed_at', 'review_accepted')
ORDER BY ordinal_position;

