-- Add accepted_at and accepted_by columns to tasks and sub_tasks tables
-- Run this in Supabase SQL Editor

BEGIN;

-- Add columns to tasks table
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS accepted_by UUID REFERENCES users(id);

-- Add columns to sub_tasks table
ALTER TABLE sub_tasks
ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS accepted_by UUID REFERENCES users(id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_accepted_by ON tasks(accepted_by);
CREATE INDEX IF NOT EXISTS idx_tasks_accepted_at ON tasks(accepted_at);
CREATE INDEX IF NOT EXISTS idx_sub_tasks_accepted_by ON sub_tasks(accepted_by);
CREATE INDEX IF NOT EXISTS idx_sub_tasks_accepted_at ON sub_tasks(accepted_at);

COMMIT;

-- Verify the changes
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'tasks' 
AND column_name IN ('accepted_at', 'accepted_by')
ORDER BY ordinal_position;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'sub_tasks' 
AND column_name IN ('accepted_at', 'accepted_by')
ORDER BY ordinal_position;

