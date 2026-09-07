-- Issue triage status + activity types (report → reply / promote / resolve).
-- Widens CHECKs so app can insert status='reported' and close as 'resolved'.
-- Keeps legacy 'dismissed' if any rows already used it.
-- Human Gate: apply via scripts/supabase/apply-sql-file.sh on DEV (then PROD).

BEGIN;

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check
CHECK (status IN (
  'reported',
  'resolved',
  'new',
  'not_started',
  'assigned',
  'received',
  'declined',
  'accepted',
  'in_progress',
  'wip',
  'submitted_for_review',
  'reviewing',
  'approved',
  'completed',
  'done',
  'rejected',
  'cancelled',
  'dismissed'
));

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_current_status_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_current_status_check
CHECK (current_status IN (
  'reported',
  'resolved',
  'new',
  'not_started',
  'assigned',
  'received',
  'declined',
  'accepted',
  'in_progress',
  'wip',
  'submitted_for_review',
  'reviewing',
  'approved',
  'completed',
  'done',
  'rejected',
  'cancelled',
  'dismissed'
));

-- Drop whichever activity_type CHECK name exists on hosted projects.
ALTER TABLE task_activities DROP CONSTRAINT IF EXISTS task_activities_activity_type_check;
ALTER TABLE task_activities DROP CONSTRAINT IF EXISTS valid_activity_type;

ALTER TABLE task_activities
  ADD CONSTRAINT task_activities_activity_type_check
  CHECK (activity_type IN (
    'progress_update',
    'status_change',
    'metadata_edit',
    'assignment',
    'creation',
    'cancellation',
    'review_submission',
    'review_acceptance',
    'review_rejection',
    'assigner_comment',
    'delegation_added',
    'delegation_removed',
    'photo_batch_attached',
    'draft_completed',
    'issue_reported',
    'triaged_to_task',
    'issue_dismissed',
    'issue_resolved'
  ));

COMMIT;
