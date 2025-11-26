/**
 * Script to reset a single user's password to "testing"
 * 
 * This is useful for troubleshooting login issues with specific users.
 * 
 * USAGE:
 * node reset_single_user_password.js admin@buildtrack.com
 * 
 * Or edit the EMAIL variable below
 */

// Load environment variables from .env file
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

// Get credentials from environment variables
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

// Get email from command line argument or set it here
const EMAIL = process.argv[2] || 'admin@buildtrack.com';
const NEW_PASSWORD = 'testing';

// Create Supabase admin client
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function resetSingleUserPassword() {
  console.log('🔄 Resetting password for single user...');
  console.log(`📧 Email: ${EMAIL}`);
  console.log(`🔑 New Password: ${NEW_PASSWORD}`);
  console.log('');
  
  // Validate credentials
  if (!SUPABASE_URL) {
    console.error('❌ Error: SUPABASE_URL not found in environment variables');
    process.exit(1);
  }
  
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY not found in environment variables');
    console.error('   Please add SUPABASE_SERVICE_ROLE_KEY to your .env file');
    process.exit(1);
  }
  
  try {
    // Step 1: Find the user by email
    console.log('🔍 Step 1: Searching for user...');
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Error fetching users:', listError.message);
      process.exit(1);
    }
    
    const user = users.find(u => 
      u.email?.toLowerCase() === EMAIL.toLowerCase() || 
      u.email === EMAIL
    );
    
    if (!user) {
      console.error(`❌ User not found: ${EMAIL}`);
      console.log('\n📋 Available users:');
      users.forEach(u => {
        console.log(`   - ${u.email || u.phone || u.id}`);
      });
      process.exit(1);
    }
    
    console.log(`✅ User found:`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Email: ${user.email || 'N/A'}`);
    console.log(`   Phone: ${user.phone || 'N/A'}`);
    console.log(`   Created: ${user.created_at}`);
    console.log(`   Confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
    console.log('');
    
    // Step 2: Check if user exists in users table
    console.log('🔍 Step 2: Checking users table...');
    const { createClient: createAnonClient } = require('@supabase/supabase-js');
    const supabaseAnon = createAnonClient(
      SUPABASE_URL,
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
    );
    
    const { data: userRecord, error: userError } = await supabaseAnon
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();
    
    if (userError && userError.code !== 'PGRST116') { // PGRST116 = not found
      console.warn(`⚠️  Error checking users table: ${userError.message}`);
    } else if (!userRecord) {
      console.warn(`⚠️  User exists in auth.users but NOT in users table`);
      console.warn(`   This is a sync issue - user may not be able to log in properly`);
    } else {
      console.log(`✅ User exists in users table:`);
      console.log(`   Name: ${userRecord.name || 'N/A'}`);
      console.log(`   Role: ${userRecord.role || 'N/A'}`);
      console.log(`   Company: ${userRecord.company_id || 'N/A'}`);
      console.log(`   Pending: ${userRecord.is_pending ? 'Yes' : 'No'}`);
    }
    console.log('');
    
    // Step 3: Reset password
    console.log('🔄 Step 3: Resetting password...');
    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
      user.id,
      {
        password: NEW_PASSWORD
      }
    );
    
    if (error) {
      console.error(`❌ Error resetting password:`, error.message);
      process.exit(1);
    }
    
    console.log(`✅ Password reset successfully!`);
    console.log('');
    console.log('📝 Summary:');
    console.log(`   Email: ${EMAIL}`);
    console.log(`   New Password: ${NEW_PASSWORD}`);
    console.log(`   User ID: ${user.id}`);
    console.log('');
    console.log('✅ You can now log in with:');
    console.log(`   Email: ${EMAIL}`);
    console.log(`   Password: ${NEW_PASSWORD}`);
    
  } catch (error) {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  }
}

// Run the script
resetSingleUserPassword()
  .then(() => {
    console.log('\n✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });




