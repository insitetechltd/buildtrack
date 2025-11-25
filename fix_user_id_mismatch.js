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

async function fixUserIdMismatch(email) {
  console.log(`\n=== Fixing User ID Mismatch for: ${email} ===\n`);

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

    // Step 3: Check if correct ID already exists
    console.log('\n📋 Step 3: Checking if correct ID already exists...');
    const { data: existingCorrectId, error: checkError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', correctId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error checking:', checkError.message);
      return;
    }

    if (existingCorrectId) {
      console.log(`⚠️  ID ${correctId} already exists in users table!`);
      console.log(`   This user: ${existingCorrectId.email || existingCorrectId.name}`);
      console.log(`\n📋 Options:`);
      console.log(`   1. Delete the old record (ID: ${wrongId})`);
      console.log(`   2. Update the old record to use the correct ID`);
      console.log(`\n⚠️  Proceeding with option 2: Update ID...`);
    }

    // Step 4: Update the user record with correct ID
    console.log('\n📋 Step 4: Updating user record with correct ID...');
    
    // First, delete the old record
    console.log(`   Deleting old record (ID: ${wrongId})...`);
    const { error: deleteError } = await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', wrongId);

    if (deleteError) {
      console.error('❌ Error deleting old record:', deleteError.message);
      return;
    }
    console.log('   ✅ Old record deleted');

    // Then, insert with correct ID
    console.log(`   Creating new record with correct ID (${correctId})...`);
    const newUserData = {
      id: correctId,
      email: wrongUser.email,
      phone: wrongUser.phone,
      name: wrongUser.name,
      role: wrongUser.role,
      company_id: wrongUser.company_id,
      position: wrongUser.position,
      is_pending: wrongUser.is_pending,
      approved_by: wrongUser.approved_by,
      approved_at: wrongUser.approved_at,
      created_at: wrongUser.created_at || authUser.created_at
    };

    const { data: insertedUser, error: insertError } = await supabaseAdmin
      .from('users')
      .insert(newUserData)
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error creating new record:', insertError.message);
      console.error('📋 Full error:', JSON.stringify(insertError, null, 2));
      return;
    }

    console.log('   ✅ New record created with correct ID');

    // Step 5: Verify
    console.log('\n📋 Step 5: Verifying fix...');
    const { data: verifiedUser, error: verifyError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', correctId)
      .single();

    if (verifyError) {
      console.error('❌ Verification failed:', verifyError.message);
      return;
    }

    console.log('✅ Verification successful!');
    console.log(`   ID: ${verifiedUser.id}`);
    console.log(`   Email: ${verifiedUser.email}`);
    console.log(`   Name: ${verifiedUser.name}`);
    console.log(`   ID Match: ${verifiedUser.id === correctId ? '✅ YES' : '❌ NO'}`);

    console.log('\n✅ User ID mismatch fixed!');
    console.log(`   User should now be able to log in with:`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: testing`);

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error);
  }
}

const emailToFix = process.argv[2] || 'admin@buildtrack.com';
fixUserIdMismatch(emailToFix);


