-- ============================================
-- Database Migration: Simplify Project Location
-- ============================================
-- This migration simplifies the project location from multiple fields
-- (address, city, state, zipCode) to a single text field.
-- ============================================

-- Step 1: Check current location structure
SELECT 
  id,
  name,
  location
FROM projects
LIMIT 5;

-- Step 2: If location is stored as JSONB with multiple fields, we need to migrate the data
-- This script assumes location is currently stored as:
-- {
--   "address": "123 Main St",
--   "city": "New York",
--   "state": "NY",
--   "zipCode": "10001"
-- }

-- Step 3: Create a backup of the location data (optional but recommended)
CREATE TABLE IF NOT EXISTS projects_location_backup AS
SELECT id, name, location
FROM projects;

-- Step 4: Migrate the data - combine all location fields into a single string
-- First, we need to convert JSONB to TEXT with proper casting
UPDATE projects
SET location = (
  CASE
    WHEN location IS NULL THEN '""'::jsonb
    WHEN jsonb_typeof(location) = 'object' THEN
      to_jsonb(
        TRIM(BOTH ' ' FROM
          CONCAT_WS(', ',
            NULLIF(TRIM(location->>'address'), ''),
            NULLIF(TRIM(location->>'city'), ''),
            NULLIF(TRIM(location->>'state'), ''),
            NULLIF(TRIM(location->>'zipCode'), '')
          )
        )
      )
    ELSE location
  END
);

-- Step 5: Convert location column from JSONB to TEXT
-- First check the current data type
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'projects' AND column_name = 'location';

-- Now alter the column type from JSONB to TEXT
-- The USING clause extracts the string value from the JSONB
ALTER TABLE projects 
ALTER COLUMN location TYPE TEXT 
USING CASE
  WHEN jsonb_typeof(location) = 'string' THEN location #>> '{}'
  ELSE location::text
END;

-- Step 6: Verify the migration
SELECT 
  id,
  name,
  location,
  CASE 
    WHEN location = '' THEN 'Empty'
    WHEN location IS NULL THEN 'NULL'
    ELSE 'Has Data'
  END as status
FROM projects
ORDER BY status, name
LIMIT 20;

-- Step 7: Check for any issues
SELECT 
  COUNT(*) as total_projects,
  COUNT(CASE WHEN location IS NULL OR location = '' THEN 1 END) as empty_locations,
  COUNT(CASE WHEN location IS NOT NULL AND location != '' THEN 1 END) as with_locations
FROM projects;

-- ============================================
-- Alternative: If location is already TEXT but formatted
-- ============================================
-- If your location is already stored as text like "123 Main St, New York, NY, 10001"
-- then no migration is needed, just verify:

SELECT 
  id,
  name,
  location,
  length(location) as location_length
FROM projects
WHERE location IS NOT NULL AND location != ''
LIMIT 10;

-- ============================================
-- Rollback (if needed)
-- ============================================
-- To restore the original location data from backup:
/*
UPDATE projects p
SET location = b.location
FROM projects_location_backup b
WHERE p.id = b.id;

-- Drop the backup table
DROP TABLE IF EXISTS projects_location_backup;
*/

-- ============================================
-- Clean up old location fields (if they exist as separate columns)
-- ============================================
-- Only run these if you had separate columns for city, state, zipCode
/*
ALTER TABLE projects DROP COLUMN IF EXISTS city;
ALTER TABLE projects DROP COLUMN IF EXISTS state;
ALTER TABLE projects DROP COLUMN IF EXISTS zip_code;
ALTER TABLE projects DROP COLUMN IF EXISTS zipCode;
*/

