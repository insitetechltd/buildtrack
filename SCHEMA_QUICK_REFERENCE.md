# Database Schema Quick Reference

Quick commands and queries for managing your BuildTrack database schema.

## 🚀 Quick Start: New Database Instance

```bash
# 1. Create new Supabase project (via Dashboard)
# 2. Run this SQL file:
scripts/complete-database-schema-backup.sql

# 3. Create storage buckets (via Dashboard):
#    - buildtrack-files (private)
#    - buildtrack-public (public)

# 4. Apply storage policies from the backup file
```

## 📊 Schema Information

### List All Tables
```sql
SELECT tablename, schemaname 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
```

### Table Row Counts
```sql
SELECT 
  schemaname,
  tablename,
  n_tup_ins AS inserts,
  n_tup_upd AS updates,
  n_tup_del AS deletes,
  n_live_tup AS live_rows,
  n_dead_tup AS dead_rows
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC;
```

### Table Sizes
```sql
SELECT 
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS data_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) AS index_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## 🔐 Row Level Security (RLS)

### Check RLS Status
```sql
SELECT 
  tablename, 
  rowsecurity AS rls_enabled 
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;
```

### List All RLS Policies
```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  cmd AS operation,
  CASE 
    WHEN qual IS NOT NULL THEN 'Has USING clause'
    ELSE 'No USING clause'
  END AS using_check,
  CASE 
    WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause'
    ELSE 'No WITH CHECK clause'
  END AS with_check_status
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### Count Policies Per Table
```sql
SELECT 
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY policy_count DESC, tablename;
```

### Test RLS (as authenticated user)
```sql
-- Set user context (replace with actual user ID)
SELECT set_config('request.jwt.claim.sub', 'user-uuid-here', true);

-- Then test queries
SELECT * FROM tasks; -- Should only show tasks for this user's company
```

## 📇 Indexes

### List All Indexes
```sql
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

### Find Missing Indexes
```sql
-- Tables with foreign keys but no index (potential performance issue)
SELECT
  c.conrelid::regclass AS table_name,
  a.attname AS column_name,
  c.conname AS constraint_name
FROM pg_constraint c
JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
WHERE c.contype = 'f' -- Foreign key
  AND NOT EXISTS (
    SELECT 1 FROM pg_index i
    WHERE i.indrelid = c.conrelid
      AND a.attnum = ANY(i.indkey)
  )
ORDER BY table_name, column_name;
```

### Index Usage Statistics
```sql
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan AS index_scans,
  idx_tup_read AS tuples_read,
  idx_tup_fetch AS tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

## ⚙️ Triggers & Functions

### List All Triggers
```sql
SELECT
  t.tgname AS trigger_name,
  t.tgrelid::regclass AS table_name,
  p.proname AS function_name,
  CASE t.tgtype::integer & 1
    WHEN 1 THEN 'ROW'
    ELSE 'STATEMENT'
  END AS level,
  CASE t.tgtype::integer & 66
    WHEN 2 THEN 'BEFORE'
    WHEN 64 THEN 'INSTEAD OF'
    ELSE 'AFTER'
  END AS timing,
  CASE
    WHEN t.tgtype::integer & 4 <> 0 THEN 'INSERT'
    WHEN t.tgtype::integer & 8 <> 0 THEN 'DELETE'
    WHEN t.tgtype::integer & 16 <> 0 THEN 'UPDATE'
    ELSE 'OTHER'
  END AS event
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgname NOT LIKE 'pg_%' AND t.tgname NOT LIKE 'RI_%'
ORDER BY t.tgrelid::regclass::text, t.tgname;
```

### List All Functions
```sql
SELECT
  n.nspname AS schema,
  p.proname AS function_name,
  pg_get_function_result(p.oid) AS return_type,
  pg_get_function_arguments(p.oid) AS arguments,
  CASE p.prokind
    WHEN 'f' THEN 'FUNCTION'
    WHEN 'p' THEN 'PROCEDURE'
    WHEN 'a' THEN 'AGGREGATE'
    WHEN 'w' THEN 'WINDOW'
  END AS type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY p.proname;
```

## 📋 Views

### List All Views
```sql
SELECT
  schemaname,
  viewname,
  viewowner,
  pg_size_pretty(pg_relation_size(schemaname||'.'||viewname)) AS size
FROM pg_views
WHERE schemaname = 'public'
ORDER BY viewname;
```

### View Definition
```sql
SELECT pg_get_viewdef('tasks_api', true);
```

## 🗂️ Storage

### List Storage Buckets
```sql
SELECT * FROM storage.buckets;
```

### Storage Statistics by Bucket
```sql
SELECT
  bucket_id,
  COUNT(*) AS file_count,
  pg_size_pretty(SUM(metadata->>'size')::bigint) AS total_size,
  pg_size_pretty(AVG(metadata->>'size')::bigint) AS avg_size
FROM storage.objects
GROUP BY bucket_id;
```

### Recent File Uploads
```sql
SELECT
  bucket_id,
  name,
  metadata->>'size' AS size_bytes,
  created_at,
  owner
FROM storage.objects
ORDER BY created_at DESC
LIMIT 20;
```

### Storage Policies
```sql
SELECT
  policyname,
  permissive,
  cmd,
  SUBSTRING(qual::text, 1, 100) AS policy_condition
FROM pg_policies
WHERE schemaname = 'storage'
ORDER BY policyname;
```

## 🔍 Constraints

### List All Foreign Keys
```sql
SELECT
  tc.table_schema,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule,
  rc.update_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;
```

### List All Check Constraints
```sql
SELECT
  c.table_name,
  c.constraint_name,
  c.check_clause
FROM information_schema.check_constraints c
JOIN information_schema.table_constraints tc
  ON c.constraint_name = tc.constraint_name
WHERE tc.table_schema = 'public'
ORDER BY c.table_name, c.constraint_name;
```

## 🎯 Common Tasks

### Export Schema Only (No Data)
```sql
-- Use pg_dump from command line:
pg_dump -h your-host -U postgres -d postgres --schema-only --no-owner --no-acl > schema_backup.sql
```

### Check Schema Differences
```sql
-- Compare table structure between environments
SELECT
  t1.table_name,
  t1.column_name,
  t1.data_type,
  t1.is_nullable,
  t1.column_default
FROM information_schema.columns t1
LEFT JOIN information_schema.columns t2
  ON t1.table_name = t2.table_name
  AND t1.column_name = t2.column_name
WHERE t1.table_schema = 'public'
  AND t2.column_name IS NULL -- Columns in t1 but not in t2
ORDER BY t1.table_name, t1.ordinal_position;
```

### Find Tables Without RLS
```sql
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false
ORDER BY tablename;
```

### Vacuum Statistics
```sql
SELECT
  schemaname,
  tablename,
  last_vacuum,
  last_autovacuum,
  n_tup_ins,
  n_tup_upd,
  n_tup_del,
  n_live_tup,
  n_dead_tup
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_dead_tup DESC;
```

## 🧪 Testing & Validation

### Test All RPC Functions
```sql
-- Test get_tasks_with_nested_data
SELECT COUNT(*) FROM get_tasks_with_nested_data();

-- Test get_file_statistics
SELECT * FROM get_file_statistics('your-company-uuid'::uuid);

-- Test cleanup_deleted_files
SELECT cleanup_deleted_files(30); -- Returns count of deleted files
```

### Validate Data Integrity
```sql
-- Tasks without valid project
SELECT id, title, project_id
FROM tasks
WHERE project_id NOT IN (SELECT id FROM projects);

-- Users without valid company
SELECT id, name, company_id
FROM users
WHERE company_id NOT IN (SELECT id FROM companies);

-- Orphaned subtasks
SELECT id, title, parent_task_id
FROM sub_tasks
WHERE parent_task_id NOT IN (SELECT id FROM tasks);
```

### Check for Performance Issues
```sql
-- Slow queries
SELECT
  query,
  calls,
  total_time,
  mean_time,
  max_time
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat%'
ORDER BY mean_time DESC
LIMIT 10;
```

## 🛠️ Maintenance

### Reindex All Tables
```sql
REINDEX DATABASE postgres;
```

### Analyze All Tables
```sql
ANALYZE;
```

### Vacuum All Tables
```sql
VACUUM ANALYZE;
```

### Reset Sequences (After Data Import)
```sql
-- Reset all sequences to match current max ID
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE 'SELECT setval(''' || r.schemaname || '.' || r.tablename || '_id_seq'', COALESCE(MAX(id), 1)) FROM ' || r.schemaname || '.' || r.tablename;
  END LOOP;
END $$;
```

## 📦 Backup & Restore

### Quick Backup (Schema + Data)
```bash
# Full backup
pg_dump -h your-host -U postgres -d postgres -F c -f buildtrack_backup.dump

# Schema only
pg_dump -h your-host -U postgres -d postgres --schema-only -f schema_only.sql

# Data only
pg_dump -h your-host -U postgres -d postgres --data-only -f data_only.sql
```

### Quick Restore
```bash
# Restore from custom format
pg_restore -h your-host -U postgres -d postgres -c buildtrack_backup.dump

# Restore from SQL file
psql -h your-host -U postgres -d postgres -f schema_only.sql
```

## 🔗 Useful Supabase Queries

### Check Supabase Version
```sql
SELECT version();
```

### Check Extensions
```sql
SELECT * FROM pg_extension;
```

### Auth Users (Supabase Auth)
```sql
SELECT
  id,
  email,
  created_at,
  last_sign_in_at,
  email_confirmed_at
FROM auth.users
ORDER BY created_at DESC;
```

---

**Pro Tip**: Bookmark this file for quick access to common schema operations!

