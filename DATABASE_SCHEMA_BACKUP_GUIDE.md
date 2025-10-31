# BuildTrack Database Schema Backup Guide

## Overview

This guide explains how to use the complete database schema backup to create a new database instance without any data.

## Files

- **`scripts/complete-database-schema-backup.sql`** - Complete schema definition (tables, indexes, triggers, views, RLS policies)

## What's Included

The schema backup contains the complete database structure:

### ✅ **Tables** (10 core tables)
- `companies` - Company information and branding
- `users` - User accounts and roles
- `projects` - Construction projects
- `user_project_assignments` - Project team assignments
- `tasks` - Main tasks
- `sub_tasks` - Nested subtasks (unlimited depth)
- `task_updates` - Progress updates and photos
- `task_delegation_history` - Task reassignment tracking
- `task_read_status` - Read receipts for tasks
- `file_attachments` - File upload metadata

### ✅ **Indexes** (30+ performance indexes)
- Primary key indexes
- Foreign key indexes
- GIN indexes for array columns
- Partial indexes for filtered queries
- Composite indexes for common queries

### ✅ **Triggers & Functions** (10+ automated behaviors)
- Auto-update `updated_at` timestamps
- Auto-accept self-assigned completed tasks
- Prevent deleting last admin in company
- Prevent changing last admin's role
- File upload validation
- Soft delete support

### ✅ **Views** (5 API views with camelCase)
- `tasks_api` - Tasks with frontend-friendly field names
- `sub_tasks_api` - Sub-tasks with camelCase
- `task_updates_api` - Updates with camelCase
- `projects_api` - Projects with camelCase
- `users_api` - Users with camelCase

### ✅ **RPC Functions** (5 optimized queries)
- `get_tasks_with_nested_data()` - Get all tasks with subtasks and updates in 1 query
- `get_task_by_id(uuid)` - Get single task with all nested data
- `get_file_statistics(uuid)` - Company file storage stats
- `cleanup_deleted_files(integer)` - Remove old soft-deleted files

### ✅ **Row Level Security** (40+ policies)
- Company data isolation
- Role-based access control
- User-specific permissions
- Secure multi-tenancy

### ✅ **Storage Policies** (Templates included)
- Private file bucket policies
- Public file bucket policies
- Company folder isolation

## How to Create a New Database Instance

### Step 1: Create a New Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click "New Project"
3. Fill in project details:
   - **Name**: BuildTrack-Production (or your preferred name)
   - **Database Password**: Use a strong password (save this!)
   - **Region**: Choose closest to your users
4. Wait for project to be created (~2 minutes)

### Step 2: Run the Schema Backup

1. Open your new Supabase project
2. Go to **SQL Editor** (left sidebar)
3. Click **New Query**
4. Copy the entire contents of `scripts/complete-database-schema-backup.sql`
5. Paste into the SQL editor
6. Click **Run** (or press `Cmd/Ctrl + Enter`)
7. Wait for execution to complete (~30-60 seconds)

You should see success messages:
```
✅ DATABASE SCHEMA BACKUP COMPLETE!
✓ 10 Core tables
✓ 30+ Indexes
✓ 10+ Triggers
✓ 5 API Views
✓ 5 RPC Functions
✓ 40+ RLS Policies
```

### Step 3: Create Storage Buckets

Storage buckets cannot be created via SQL - do this manually:

1. Go to **Storage** in Supabase Dashboard
2. Click **New Bucket**

#### Bucket 1: Private Files
- **Name**: `buildtrack-files`
- **Public**: `❌ NO` (Private)
- **File size limit**: `50MB`
- Click **Create Bucket**

#### Bucket 2: Public Files
- **Name**: `buildtrack-public`
- **Public**: `✅ YES` (Public)
- **File size limit**: `10MB`
- Click **Create Bucket**

### Step 4: Apply Storage Policies

After creating buckets, apply the storage policies:

1. Go to **Storage** → **Policies**
2. For each policy template in the schema backup (Part 9), create the policy:
   - Click **New Policy**
   - Select the appropriate bucket
   - Copy the policy SQL from the backup file
   - Click **Review** then **Save Policy**

Or run the policies directly in SQL Editor (replace the bucket names if different).

### Step 5: Verify the Setup

Run these verification queries in SQL Editor:

```sql
-- Check all tables exist
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- Check all RLS policies
SELECT tablename, COUNT(*) as policy_count 
FROM pg_policies 
WHERE schemaname = 'public' 
GROUP BY tablename
ORDER BY tablename;

-- Check all triggers
SELECT tgname, tgrelid::regclass AS table_name
FROM pg_trigger
WHERE tgname NOT LIKE 'pg_%' AND tgname NOT LIKE 'RI_%'
ORDER BY table_name;

-- Check all views
SELECT viewname FROM pg_views WHERE schemaname = 'public';

-- Check storage buckets
SELECT * FROM storage.buckets;
```

### Step 6: Update Your App Configuration

Update your app's `.env` or configuration with the new database credentials:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

You can find these in: **Settings** → **API** in Supabase Dashboard

## Common Use Cases

### Creating a Staging Environment

1. Follow steps above to create "BuildTrack-Staging" project
2. Use the schema backup to set up identical structure
3. Point your staging app to the new database
4. Seed with test data if needed

### Creating a Development Environment

1. Create "BuildTrack-Dev" project
2. Run schema backup
3. Use for local development and testing
4. Reset easily by dropping and re-running schema

### Disaster Recovery

If you need to restore just the schema (without data):

1. Create new project
2. Run schema backup
3. Use Supabase's point-in-time recovery to restore data
4. Or restore from your own data backups

## Differences from Production

⚠️ **This backup contains SCHEMA ONLY - no data**

After running the backup, your new database will have:
- ✅ All tables, columns, and constraints
- ✅ All indexes for performance
- ✅ All triggers and automated logic
- ✅ All RLS policies for security
- ✅ All views and RPC functions
- ❌ No companies
- ❌ No users
- ❌ No projects
- ❌ No tasks
- ❌ No files

You'll need to:
1. Create initial admin users
2. Set up companies
3. Import data if needed

## Seeding Initial Data

After running the schema, create your first admin:

```sql
-- 1. Create a company
INSERT INTO companies (id, name, type, description)
VALUES (
  'your-company-uuid'::uuid,
  'Your Company Name',
  'general_contractor',
  'Your company description'
)
RETURNING id;

-- 2. Create an admin user (use the company ID from above)
INSERT INTO users (id, email, name, role, company_id, position, phone)
VALUES (
  'your-user-uuid'::uuid,
  'admin@yourcompany.com',
  'Admin User',
  'admin',
  'your-company-uuid'::uuid,
  'Administrator',
  '+1234567890'
);
```

Then use Supabase Auth to create the authentication credentials for this user.

## Schema Versioning

This schema backup represents your **current production schema** as of the backup date.

If you make schema changes in the future:
1. Apply changes to production via migration files
2. Regenerate this backup file to include new changes
3. Keep versioned backups: `complete-database-schema-v1.sql`, `v2.sql`, etc.

## Maintenance

### Updating the Backup

When you add new features that modify the schema:

1. Document your migration SQL
2. Apply to production
3. Regenerate this backup file with all changes
4. Commit to version control

### Best Practices

- ✅ Keep this file in version control (Git)
- ✅ Update after every schema change
- ✅ Test on a fresh database periodically
- ✅ Document any manual setup steps
- ✅ Version your backups (v1, v2, etc.)

## Troubleshooting

### Error: "relation already exists"

If you run this on an existing database:
```sql
-- Drop all tables first (⚠️ DESTRUCTIVE - data will be lost!)
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- Then run the schema backup
```

### Error: "permission denied"

Make sure you're running as the Supabase admin user (postgres role).

### RLS Policies Not Working

1. Verify RLS is enabled: `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';`
2. Check policies exist: `SELECT * FROM pg_policies WHERE schemaname = 'public';`
3. Test with `auth.uid()` populated

### Storage Upload Failures

1. Verify buckets exist: `SELECT * FROM storage.buckets;`
2. Check storage policies: `SELECT * FROM pg_policies WHERE schemaname = 'storage';`
3. Ensure folder structure matches policies: `{company_id}/tasks/{task_id}/file.jpg`

## Support

For issues with:
- **Schema Structure**: Check `scripts/backend-improvements-migration.sql` for reference
- **Storage**: See `scripts/file-storage-policies.sql`
- **RLS Policies**: See `scripts/verify-rls-policies.sql`

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Storage Guide](https://supabase.com/docs/guides/storage)

---

**Last Updated**: $(date)  
**Schema Version**: 2.0 (with file attachments and review workflow)

