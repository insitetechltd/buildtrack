-- Migration: Add "commercial" to tasks.category check constraint
-- This fixes the error: "new row for relation "tasks" violates check constraint "tasks_category_check""

-- Step 1: Drop the existing check constraint
ALTER TABLE tasks 
DROP CONSTRAINT IF EXISTS tasks_category_check;

-- Step 2: Add the updated check constraint with "commercial" included
ALTER TABLE tasks 
ADD CONSTRAINT tasks_category_check 
CHECK (category IN ('safety', 'electrical', 'plumbing', 'structural', 'general', 'materials', 'commercial'));

-- Verify the constraint
-- You can run this query to verify:
-- SELECT conname, pg_get_constraintdef(oid) 
-- FROM pg_constraint 
-- WHERE conrelid = 'tasks'::regclass 
-- AND conname = 'tasks_category_check';


