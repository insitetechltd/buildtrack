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

async function checkUserSync(email) {
  console.log(`\n=== Checking User Sync for: ${email} ===\n`);

  try {
    // Step 1: Find in auth.users
    console.log('📋 Step 1: Checking auth.users...');
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

    console.log(`✅ Found in auth.users:`);
    console.log(`   ID: ${authUser.id}`);
    console.log(`   Email: ${authUser.email}`);
    console.log(`   Phone: ${authUser.phone || 'N/A'}`);

    // Step 2: Find in users table by email
    console.log('\n📋 Step 2: Checking users table by email...');
    const { data: usersByEmail, error: emailError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email);

    if (emailError) {
      console.error('❌ Error:', emailError.message);
      return;
    }

    if (usersByEmail && usersByEmail.length > 0) {
      console.log(`⚠️  Found ${usersByEmail.length} user(s) with this email:`);
      usersByEmail.forEach((u, i) => {
        console.log(`\n   User ${i + 1}:`);
        console.log(`   ID: ${u.id}`);
        console.log(`   Email: ${u.email}`);
        console.log(`   Name: ${u.name}`);
        console.log(`   Phone: ${u.phone || 'N/A'}`);
        console.log(`   ID Match: ${u.id === authUser.id ? '✅ YES' : '❌ NO'}`);
      });
    } else {
      console.log(`❌ No user found in users table with email: ${email}`);
    }

    // Step 3: Find in users table by ID
    console.log('\n📋 Step 3: Checking users table by ID...');
    const { data: userById, error: idError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (idError && idError.code !== 'PGRST116') {
      console.error('❌ Error:', idError.message);
    } else if (!userById) {
      console.log(`❌ No user found in users table with ID: ${authUser.id}`);
    } else {
      console.log(`✅ Found in users table by ID:`);
      console.log(`   ID: ${userById.id}`);
      console.log(`   Email: ${userById.email}`);
      console.log(`   Name: ${userById.name}`);
      console.log(`   Phone: ${userById.phone || 'N/A'}`);
    }

    // Step 4: Summary
    console.log('\n📋 Summary:');
    const emailMatch = usersByEmail?.find(u => u.id === authUser.id);
    const idMatch = userById;
    
    if (emailMatch && idMatch) {
      console.log('✅ User is properly synced (exists in both tables with matching ID)');
    } else if (idMatch) {
      console.log('✅ User exists in users table with matching ID');
      if (usersByEmail && usersByEmail.length > 0 && !emailMatch) {
        console.log('⚠️  BUT: There is another user with the same email but different ID');
      }
    } else if (usersByEmail && usersByEmail.length > 0) {
      console.log('❌ SYNC ISSUE: User exists in users table but with different ID');
      console.log('   This will cause login to fail!');
    } else {
      console.log('❌ SYNC ISSUE: User missing from users table');
      console.log('   This will cause login to fail!');
    }

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error);
  }
}

const emailToCheck = process.argv[2] || 'admin@buildtrack.com';
checkUserSync(emailToCheck);


