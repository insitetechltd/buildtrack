-- Migration: Add billing_status column to tasks table
-- This migration adds a billing_status field to track whether tasks are billable, not billable, or billed

-- Add billing_status column to tasks table
-- Values: 'billable', 'non_billable', 'billed' (defaults to 'non_billable')
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS billing_status TEXT
DEFAULT 'non_billable'
CHECK (billing_status IN ('billable', 'non_billable', 'billed'));

-- Update existing tasks to have 'non_billable' as default
UPDATE tasks SET billing_status = 'non_billable' WHERE billing_status IS NULL;

-- Make the column NOT NULL after setting defaults
ALTER TABLE tasks
ALTER COLUMN billing_status SET NOT NULL;

-- Add a comment to document the column
COMMENT ON COLUMN tasks.billing_status IS 'Billing status of the task: billable, non_billable, or billed (defaults to non_billable)';

-- Optional: Create an index if you plan to filter by billing status frequently
-- CREATE INDEX IF NOT EXISTS idx_tasks_billing_status ON tasks(billing_status);

-- Verify the column was added
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'tasks' 
  AND column_name = 'billing_status';

