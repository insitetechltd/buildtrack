/**
 * Script to reset all user passwords to "testing"
 * 
 * This script uses the Supabase Admin API to update all user passwords.
 * 
 * REQUIREMENTS:
 * 1. Install: npm install @supabase/supabase-js
 * 2. Add to .env file:
 *    - EXPO_PUBLIC_SUPABASE_URL (already exists)
 *    - SUPABASE_SERVICE_ROLE_KEY (needs to be added - get from Supabase Dashboard)
 * 
 * USAGE:
 * node reset_all_passwords.js
 * 
 * WARNING: This will change ALL user passwords to "testing"
 * Make sure this is what you want before running!
 */

// Load environment variables from .env file
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

// Get credentials from environment variables
// Uses existing EXPO_PUBLIC_SUPABASE_URL from .env
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
// Service role key needs to be added to .env (different from anon key)
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

// Create Supabase admin client (uses service role key for admin access)
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function resetAllPasswords() {
  console.log('🔄 Starting password reset process...');
  console.log('⚠️  WARNING: This will set ALL user passwords to "testing"');
  
  // Validate credentials
  if (!SUPABASE_URL) {
    console.error('❌ Error: SUPABASE_URL not found in environment variables');
    console.error('   Please ensure EXPO_PUBLIC_SUPABASE_URL is set in your .env file');
    process.exit(1);
  }
  
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY not found in environment variables');
    console.error('   Please add SUPABASE_SERVICE_ROLE_KEY to your .env file');
    console.error('   Get it from: Supabase Dashboard → Settings → API → service_role key');
    console.error('   ⚠️  This is different from EXPO_PUBLIC_SUPABASE_ANON_KEY');
    process.exit(1);
  }
  
  console.log('✅ Credentials found');
  console.log(`   URL: ${SUPABASE_URL.substring(0, 30)}...`);
  console.log(`   Service Role Key: ${SUPABASE_SERVICE_ROLE_KEY.substring(0, 20)}...`);
  console.log('');
  
  try {
    // Get all users
    console.log('📋 Fetching all users...');
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Error fetching users:', listError);
      return;
    }
    
    if (!users || users.length === 0) {
      console.log('ℹ️  No users found');
      return;
    }
    
    console.log(`📊 Found ${users.length} user(s)`);
    
    // Update each user's password
    let successCount = 0;
    let errorCount = 0;
    
    for (const user of users) {
      try {
        console.log(`\n🔄 Updating password for user: ${user.email || user.phone || user.id}`);
        
        const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
          user.id,
          {
            password: 'testing'
          }
        );
        
        if (error) {
          console.error(`❌ Error updating user ${user.id}:`, error.message);
          errorCount++;
        } else {
          console.log(`✅ Password updated successfully for: ${user.email || user.phone || user.id}`);
          successCount++;
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`❌ Exception updating user ${user.id}:`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n📊 Summary:');
    console.log(`✅ Successfully updated: ${successCount} user(s)`);
    console.log(`❌ Failed: ${errorCount} user(s)`);
    console.log(`📝 Total: ${users.length} user(s)`);
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
  }
}

// Run the script
resetAllPasswords()
  .then(() => {
    console.log('\n✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

