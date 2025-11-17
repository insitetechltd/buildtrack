# Database Migration Instructions - Location Simplification

## ⚠️ IMPORTANT: Read Before Running

This migration will change your `projects.location` column from JSONB (with multiple fields) to TEXT (single field).

## 📋 Pre-Migration Checklist

- [ ] **Backup your database** (Supabase has automatic backups, but verify)
- [ ] **Test on a development database first** (if available)
- [ ] **Notify team members** (if others are using the database)
- [ ] **Close all apps** that are using the database

## 🚀 Migration Steps

### Option 1: Use the Simple Script (Recommended)

The file `DATABASE_MIGRATION_LOCATION_SIMPLE.sql` has step-by-step instructions.

**Execute in Supabase SQL Editor:**

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy and paste **ONE STEP AT A TIME** from `DATABASE_MIGRATION_LOCATION_SIMPLE.sql`
4. Verify each step before moving to the next

### Option 2: Quick Migration (All at Once)

If you're confident, run this complete script:

```sql
-- 1. Backup
CREATE TABLE IF NOT EXISTS projects_location_backup AS
SELECT id, name, location FROM projects;

-- 2. Add temporary column
ALTER TABLE projects ADD COLUMN IF NOT EXISTS location_text TEXT;

-- 3. Migrate data
UPDATE projects
SET location_text = TRIM(BOTH ' ' FROM
  CONCAT_WS(', ',
    NULLIF(TRIM(location->>'address'), ''),
    NULLIF(TRIM(location->>'city'), ''),
    NULLIF(TRIM(location->>'state'), ''),
    NULLIF(TRIM(location->>'zipCode'), '')
  )
);

-- 4. Drop old column
ALTER TABLE projects DROP COLUMN location;

-- 5. Rename new column
ALTER TABLE projects RENAME COLUMN location_text TO location;

-- 6. Verify
SELECT id, name, location FROM projects LIMIT 10;
```

## ✅ Verification

After migration, run these queries to verify:

```sql
-- Check column type
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'projects' AND column_name = 'location';
-- Should show: TEXT

-- Check data
SELECT id, name, location FROM projects LIMIT 10;
-- Should show: "123 Main St, New York, NY, 10001"

-- Check for empty locations
SELECT COUNT(*) as empty_count
FROM projects
WHERE location IS NULL OR location = '';
```

## 🔄 Rollback (If Needed)

If something goes wrong, restore from backup:

```sql
-- Drop the new column
ALTER TABLE projects DROP COLUMN IF EXISTS location;

-- Restore from backup
ALTER TABLE projects ADD COLUMN location JSONB;

UPDATE projects p
SET location = b.location
FROM projects_location_backup b
WHERE p.id = b.id;

-- Verify
SELECT id, name, location FROM projects LIMIT 5;
```

## 📊 What Changes

### Before (JSONB):
```json
{
  "address": "123 Main Street",
  "city": "New York",
  "state": "NY",
  "zipCode": "10001"
}
```

### After (TEXT):
```
"123 Main Street, New York, NY, 10001"
```

## 🧹 Cleanup

After verifying everything works (wait a few days):

```sql
-- Remove backup table
DROP TABLE IF EXISTS projects_location_backup;
```

## ⚠️ Common Issues

### Issue: "column location does not exist"
**Solution**: The migration already completed. Check if `location` is now TEXT.

### Issue: "cannot drop column location because other objects depend on it"
**Solution**: There might be views or functions using this column. Find and update them first:
```sql
-- Find dependencies
SELECT * FROM pg_depend WHERE objid = 'projects'::regclass;
```

### Issue: Some locations are empty after migration
**Solution**: This is normal if the original JSONB had empty fields. The app now shows "No location" for these.

## 📱 App Updates

After migration:
1. ✅ App code already updated (location is now a string)
2. ✅ Forms updated (single text field)
3. ✅ Display updated (shows full address)
4. 🔄 Restart your app to see changes

## 🆘 Need Help?

If you encounter issues:
1. **Don't panic** - your data is backed up
2. **Check the backup table** exists: `SELECT * FROM projects_location_backup LIMIT 1;`
3. **Run the rollback** script if needed
4. **Contact support** with error messages

## ✨ After Migration

Your app will now:
- ✅ Show full addresses in one line
- ✅ No more comma issues
- ✅ Simpler data entry
- ✅ Better user experience

---

**Ready?** Open `DATABASE_MIGRATION_LOCATION_SIMPLE.sql` and execute step by step! 🚀

