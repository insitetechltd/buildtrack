-- Migration: Add Task Edit History and Notification Fields
-- This migration adds support for tracking task edits after acceptance

-- 1. Create task_edit_history table
CREATE TABLE IF NOT EXISTS task_edit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  edited_by UUID NOT NULL REFERENCES users(id),
  edited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Changed fields (JSONB for flexibility)
  changes JSONB NOT NULL,
  -- Example structure:
  -- {
  --   "title": { "old": "Fix roof leak", "new": "Fix roof leak and gutter" },
  --   "dueDate": { "old": "2024-12-31", "new": "2025-01-15" },
  --   "priority": { "old": "medium", "new": "high" },
  --   "description": { "old": "...", "new": "..." }
  -- }
  
  -- Reason for edit (optional, but recommended for accountability)
  edit_reason TEXT,
  
  -- Notification status
  notifications_sent BOOLEAN DEFAULT FALSE,
  notified_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_task_edit_history_task_id ON task_edit_history(task_id);
CREATE INDEX IF NOT EXISTS idx_task_edit_history_edited_at ON task_edit_history(edited_at DESC);
CREATE INDEX IF NOT EXISTS idx_task_edit_history_edited_by ON task_edit_history(edited_by);

-- 2. Add notification fields to tasks table
ALTER TABLE tasks 
  ADD COLUMN IF NOT EXISTS has_unread_changes BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMP WITH TIME ZONE;

-- Create index for filtering tasks with unread changes
CREATE INDEX IF NOT EXISTS idx_tasks_has_unread_changes ON tasks(has_unread_changes) WHERE has_unread_changes = TRUE;

-- 3. Add RLS (Row Level Security) policies if needed
-- Adjust based on your security requirements

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT ON task_edit_history TO authenticated;
-- GRANT UPDATE ON tasks TO authenticated;

-- Notes:
-- - The changes JSONB field stores field-by-field changes
-- - edit_reason is optional but recommended for accountability
-- - notifications_sent tracks whether assignees were notified
-- - has_unread_changes flag helps assignees see which tasks were edited
-- - last_edited_at helps with sorting and filtering recently edited tasks

