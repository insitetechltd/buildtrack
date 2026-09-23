-- Issue triage status + activity types (report → reply / promote / resolve).
-- Widens CHECKs so app can insert status='reported' and close as 'resolved'.
-- Keeps legacy 'dismissed' if any rows already used it.
--
-- NEW schema (DEV≡PROD after 2026-09-15 restore): `tasks.current_status` is absent.
-- Skip that CHECK unless the column exists (pre-NEW tenants only).
-- Activity CHECK is a UNION of live hosted values (`photo_upload`, `delegation`)
-- plus app types (`issue_reported`, `triaged_to_task`, `issue_resolved`, …)
-- so REPLACE cannot shrink the allowed set.
--
-- Human Gate: apply on DEV then PROD. Do not use apply-sql-file.sh against
-- repo `.env` when the target is PROD.

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

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tasks'
      AND column_name = 'current_status'
  ) THEN
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
  END IF;
END $$;

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
    'photo_upload',
    'delegation',
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
