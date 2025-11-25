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

async function fixMissingUserRecord(email) {
  console.log(`\n=== Fixing Missing User Record for: ${email} ===\n`);

  try {
    // Step 1: Find user in auth.users
    console.log('📋 Step 1: Finding user in auth.users...');
    const { data: authUsersData, error: authListError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authListError) {
      console.error('❌ Error listing auth.users:', authListError.message);
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
    console.log(`   Metadata:`, authUser.user_metadata);

    // Step 2: Check if user exists in users table
    console.log('\n📋 Step 2: Checking users table...');
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('❌ Error checking users table:', checkError.message);
      return;
    }

    if (existingUser) {
      console.log(`✅ User already exists in users table:`);
      console.log(`   Name: ${existingUser.name}`);
      console.log(`   Email: ${existingUser.email}`);
      console.log(`   Role: ${existingUser.role}`);
      console.log('\n✅ No action needed - user is synced!');
      return;
    }

    // Step 3: Create missing user record
    console.log('\n📋 Step 3: Creating missing user record in users table...');
    
    // Extract data from auth.users metadata
    const userMetadata = authUser.user_metadata || {};
    const rawUserMetaData = authUser.raw_user_meta_data || {};
    
    // Combine metadata sources
    const name = userMetadata.name || rawUserMetaData.name || authUser.email?.split('@')[0] || 'Unknown';
    const role = userMetadata.role || rawUserMetaData.role || 'worker';
    const companyId = userMetadata.company_id || rawUserMetaData.company_id || null;
    const position = userMetadata.position || rawUserMetaData.position || '';
    const isPending = userMetadata.is_pending !== undefined ? userMetadata.is_pending : (rawUserMetaData.is_pending || false);
    const approvedBy = userMetadata.approved_by || rawUserMetaData.approved_by || null;
    const approvedAt = userMetadata.approved_at || rawUserMetaData.approved_at || null;

    // Convert phone from E.164 to 8-digit if needed
    let phone = authUser.phone || null;
    if (phone && phone.startsWith('+852')) {
      phone = phone.substring(4); // Remove +852 prefix
    }

    const newUserData = {
      id: authUser.id,
      email: authUser.email || `${phone || 'unknown'}@buildtrack.local`,
      phone: phone,
      name: name,
      role: role,
      company_id: companyId,
      position: position,
      is_pending: isPending,
      approved_by: approvedBy,
      approved_at: approvedAt,
      created_at: authUser.created_at || new Date().toISOString()
    };

    console.log('📋 User data to insert:');
    console.log(JSON.stringify(newUserData, null, 2));

    const { data: insertedUser, error: insertError } = await supabaseAdmin
      .from('users')
      .insert(newUserData)
      .select()
      .single();

    if (insertError) {
      console.error('❌ Error creating user record:', insertError.message);
      console.error('📋 Full error:', JSON.stringify(insertError, null, 2));
      return;
    }

    console.log('\n✅ User record created successfully!');
    console.log('📋 Created user:');
    console.log(`   ID: ${insertedUser.id}`);
    console.log(`   Name: ${insertedUser.name}`);
    console.log(`   Email: ${insertedUser.email}`);
    console.log(`   Role: ${insertedUser.role}`);
    console.log(`   Company ID: ${insertedUser.company_id || 'N/A'}`);
    console.log(`   Pending: ${insertedUser.is_pending ? 'Yes' : 'No'}`);

    console.log('\n✅ User should now be able to log in!');
    console.log(`   Email: ${email}`);
    console.log(`   Password: testing`);

  } catch (error) {
    console.error('\n❌ Fatal error:', error.message);
    console.error(error);
  }
}

const emailToFix = process.argv[2] || 'admin@buildtrack.com';
fixMissingUserRecord(emailToFix);


