require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: Supabase credentials not found.');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function fixUserIdMismatchSafe(email) {
  console.log(`\n=== Fixing User ID Mismatch (Safe Method) for: ${email} ===\n`);

  try {
    // Step 1: Get auth.users ID
    console.log('📋 Step 1: Getting auth.users ID...');
    const { data: authUsersData, error: authListError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authListError) {
      console.error('❌ Error:', authListError.message);
      return;
    }

    const authUser = authUsersData.users.find(u => 
      u.email?.toLowerCase() === email.toLowerCase()
    );

    if (!authUser) {
      console.error(`❌ User not found in auth.users: ${email}`);
      return;
    }

    const correctId = authUser.id;
    console.log(`✅ Correct ID from auth.users: ${correctId}`);

    // Step 2: Find user in users table by email
    console.log('\n📋 Step 2: Finding user in users table...');
    const { data: usersByEmail, error: emailError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email);

    if (emailError) {
      console.error('❌ Error:', emailError.message);
      return;
    }

    if (!usersByEmail || usersByEmail.length === 0) {
      console.log('❌ User not found in users table');
      return;
    }

    const wrongUser = usersByEmail[0];
    const wrongId = wrongUser.id;
    
    console.log(`⚠️  Found user with wrong ID: ${wrongId}`);
    console.log(`   Name: ${wrongUser.name}`);
    console.log(`   Email: ${wrongUser.email}`);

    if (wrongId === correctId) {
      console.log('\n✅ IDs already match! No fix needed.');
      return;
    }

    console.log('\n📋 Step 3: This requires SQL to update foreign key references.');
    console.log('   Since we cannot update primary keys directly in PostgreSQL,');
    console.log('   we need to use SQL to update all foreign key references.');
    console.log('\n📋 SQL Script to run in Supabase SQL Editor:');
    console.log('   (This will update all foreign key references, then the user ID)');
    console.log('\n--- SQL START ---\n');
    
    // Generate SQL to fix the ID mismatch
    const sqlScript = `
-- Fix User ID Mismatch for ${email}
-- Old ID: ${wrongId}
-- New ID: ${correctId}

BEGIN;

-- Step 1: Update all foreign key references
-- Update projects.created_by
UPDATE projects 
SET created_by = '${correctId}'::uuid 
WHERE created_by = '${wrongId}'::uuid;

-- Update projects.lead_pm_id
UPDATE projects 
SET lead_pm_id = '${correctId}'::uuid 
WHERE lead_pm_id = '${wrongId}'::uuid;

-- Update tasks.assigned_by
UPDATE tasks 
SET assigned_by = '${correctId}'::uuid 
WHERE assigned_by = '${wrongId}'::uuid;

-- Update tasks.assigned_to (array field - requires special handling)
-- Note: This updates the array, replacing the old ID with the new ID
UPDATE tasks 
SET assigned_to = array_replace(assigned_to, '${wrongId}'::uuid, '${correctId}'::uuid)
WHERE '${wrongId}'::uuid = ANY(assigned_to);

-- Update tasks.accepted_by
UPDATE tasks 
SET accepted_by = '${correctId}'::uuid 
WHERE accepted_by = '${wrongId}'::uuid;

-- Update tasks.reviewed_by
UPDATE tasks 
SET reviewed_by = '${correctId}'::uuid 
WHERE reviewed_by = '${wrongId}'::uuid;

-- Update user_project_assignments.user_id
UPDATE user_project_assignments 
SET user_id = '${correctId}'::uuid 
WHERE user_id = '${wrongId}'::uuid;

-- Update users.approved_by
UPDATE users 
SET approved_by = '${correctId}'::uuid 
WHERE approved_by = '${wrongId}'::uuid;

-- Step 2: Delete the old user record
DELETE FROM users 
WHERE id = '${wrongId}'::uuid;

-- Step 3: Insert the user record with correct ID
INSERT INTO users (
  id,
  email,
  phone,
  name,
  role,
  company_id,
  position,
  is_pending,
  approved_by,
  approved_at,
  created_at
) VALUES (
  '${correctId}'::uuid,
  '${wrongUser.email.replace(/'/g, "''")}',
  ${wrongUser.phone ? `'${wrongUser.phone.replace(/'/g, "''")}'` : 'NULL'},
  '${wrongUser.name.replace(/'/g, "''")}',
  '${wrongUser.role}',
  ${wrongUser.company_id ? `'${wrongUser.company_id}'::uuid` : 'NULL'},
  ${wrongUser.position ? `'${wrongUser.position.replace(/'/g, "''")}'` : 'NULL'},
  ${wrongUser.is_pending ? 'true' : 'false'},
  ${wrongUser.approved_by ? `'${wrongUser.approved_by}'::uuid` : 'NULL'},
  ${wrongUser.approved_at ? `'${wrongUser.approved_at}'` : 'NULL'},
  '${(wrongUser.created_at || authUser.created_at).replace(/'/g, "''")}'
);

COMMIT;

-- Verify the fix
SELECT 
  'Verification' as check_type,
  u.id,
  u.email,
  u.name,
  CASE 
    WHEN u.id = '${correctId}'::uuid THEN '✅ ID MATCHES'
    ELSE '❌ ID MISMATCH'
  END as id_status
FROM users u
WHERE u.email = '${email.replace(/'/g, "''")}';
`;
    
    console.log(sqlScript);
    console.log('\n--- SQL END ---\n');
    console.log('📝 Instructions:');
    console.log('   1. Copy the SQL script above');
    console.log('   2. Go to Supabase Dashboard → SQL Editor');
    console.log('   3. Paste and run the script');
    console.log('   4. Verify the output shows "✅ ID MATCHES"');
    console.log('   5. Try logging in again with:');
    console.log(`      Email: ${email}`);
    console.log(`      Password: testing`);

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error);
  }
}

const emailToFix = process.argv[2] || 'admin@buildtrack.com';
fixUserIdMismatchSafe(emailToFix);


