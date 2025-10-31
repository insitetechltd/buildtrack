-- Check for any triggers on storage or file_attachments that might be causing the RLS error

-- 1. Check for triggers on file_attachments table
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'file_attachments';

-- 2. Check for triggers on storage.objects
SELECT 
  trigger_name,
  event_manipulation,
  event_object_schema,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'storage'
  AND event_object_table = 'objects';

-- 3. Check for any functions that might insert into file_attachments
SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_definition ILIKE '%file_attachments%'
  AND routine_type = 'FUNCTION';

-- 4. Alternative: Disable file_attachments table entirely if not needed
-- UNCOMMENT if you want to drop the table:
-- DROP TABLE IF EXISTS file_attachments CASCADE;

