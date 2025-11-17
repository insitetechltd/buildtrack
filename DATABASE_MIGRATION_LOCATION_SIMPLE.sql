-- ============================================
-- SIMPLE MIGRATION: Project Location JSONB to TEXT
-- ============================================
-- Execute these steps ONE AT A TIME in order
-- ============================================

-- ============================================
-- STEP 1: Backup your data (IMPORTANT!)
-- ============================================
CREATE TABLE IF NOT EXISTS projects_location_backup AS
SELECT id, name, location
FROM projects;

-- Verify backup was created
SELECT COUNT(*) as backed_up_projects FROM projects_location_backup;


-- ============================================
-- STEP 2: Check current data structure
-- ============================================
-- See what your location data looks like now
SELECT 
  id,
  name,
  location,
  jsonb_typeof(location) as location_type
FROM projects
LIMIT 5;


-- ============================================
-- STEP 3: Add a temporary TEXT column
-- ============================================
ALTER TABLE projects ADD COLUMN IF NOT EXISTS location_text TEXT;


-- ============================================
-- STEP 4: Migrate data from JSONB to TEXT
-- ============================================
-- Combine address, city, state, zipCode into single string
UPDATE projects
SET location_text = TRIM(BOTH ' ' FROM
  CONCAT_WS(', ',
    NULLIF(TRIM(location->>'address'), ''),
    NULLIF(TRIM(location->>'city'), ''),
    NULLIF(TRIM(location->>'state'), ''),
    NULLIF(TRIM(location->>'zipCode'), '')
  )
);

-- Verify the migration
SELECT 
  id,
  name,
  location->>'address' as old_address,
  location->>'city' as old_city,
  location_text as new_location
FROM projects
LIMIT 10;


-- ============================================
-- STEP 5: Drop old JSONB column
-- ============================================
ALTER TABLE projects DROP COLUMN location;


-- ============================================
-- STEP 6: Rename new column to 'location'
-- ============================================
ALTER TABLE projects RENAME COLUMN location_text TO location;


-- ============================================
-- STEP 7: Verify final result
-- ============================================
-- Check the data type
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'projects' AND column_name = 'location';

-- Check the data
SELECT 
  id,
  name,
  location,
  CASE 
    WHEN location = '' OR location IS NULL THEN 'Empty'
    ELSE 'Has Data'
  END as status
FROM projects
ORDER BY status, name
LIMIT 20;

-- Summary
SELECT 
  COUNT(*) as total_projects,
  COUNT(CASE WHEN location IS NULL OR location = '' THEN 1 END) as empty_locations,
  COUNT(CASE WHEN location IS NOT NULL AND location != '' THEN 1 END) as with_locations
FROM projects;


-- ============================================
-- ROLLBACK (if something goes wrong)
-- ============================================
-- Only run this if you need to restore the original data!
/*
-- Drop the new column
ALTER TABLE projects DROP COLUMN IF EXISTS location;

-- Restore from backup
ALTER TABLE projects ADD COLUMN location JSONB;

UPDATE projects p
SET location = b.location
FROM projects_location_backup b
WHERE p.id = b.id;

-- Verify restoration
SELECT id, name, location FROM projects LIMIT 5;

-- Clean up backup table
DROP TABLE IF EXISTS projects_location_backup;
*/


-- ============================================
-- CLEANUP (after successful migration)
-- ============================================
-- Only run this after you've verified everything works!
/*
DROP TABLE IF EXISTS projects_location_backup;
*/

