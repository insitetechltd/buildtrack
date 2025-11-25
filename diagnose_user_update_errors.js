#!/usr/bin/env node

/**
 * Diagnose why specific users are failing to update
 * Usage: node diagnose_user_update_errors.js tristan@insitetech.co paul@buildtrack.com
 */

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

const emailsToCheck = process.argv.slice(2);

if (emailsToCheck.length === 0) {
  console.log('Usage: node diagnose_user_update_errors.js <email1> <email2> ...');
  console.log('Example: node diagnose_user_update_errors.js tristan@insitetech.co paul@buildtrack.com');
  process.exit(1);
}

async function diagnoseUser(email) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Diagnosing: ${email}`);
  console.log('='.repeat(60));

  try {
    // Get user from users table
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (userError || !userData) {
      console.log(`❌ User not found in users table: ${userError?.message || 'Not found'}`);
      return;
    }

    console.log(`\n📋 User from users table:`);
    console.log(`   ID: ${userData.id}`);
    console.log(`   Email: ${userData.email}`);
    console.log(`   Phone: ${userData.phone || 'none'}`);
    console.log(`   Name: ${userData.name}`);
    console.log(`   Role: ${userData.role}`);
    console.log(`   Company ID: ${userData.company_id || 'none'}`);
    console.log(`   Position: ${userData.position || 'none'}`);
    console.log(`   Is Pending: ${userData.is_pending}`);

    // Get auth user
    const { data: authUsersData, error: authListError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authListError) {
      console.error(`❌ Error listing auth users: ${authListError.message}`);
      return;
    }

    const authUser = authUsersData.users.find(au => 
      au.id === userData.id || 
      (au.email && au.email.toLowerCase() === email.toLowerCase())
    );

    if (!authUser) {
      console.log(`\n❌ User not found in auth.users`);
      return;
    }

    console.log(`\n📋 User from auth.users:`);
    console.log(`   ID: ${authUser.id}`);
    console.log(`   Email: ${authUser.email || 'none'}`);
    console.log(`   Phone: ${authUser.phone || 'none'}`);
    console.log(`   Email Confirmed: ${authUser.email_confirmed_at ? 'Yes' : 'No'}`);
    console.log(`   Phone Confirmed: ${authUser.phone_confirmed_at ? 'Yes' : 'No'}`);
    console.log(`   Created At: ${authUser.created_at}`);
    console.log(`   Updated At: ${authUser.updated_at}`);
    console.log(`\n📋 Metadata:`);
    console.log(JSON.stringify(authUser.user_metadata, null, 2));

    // Check for conflicts
    console.log(`\n🔍 Checking for conflicts...`);
    
    const emailConflict = authUsersData.users.find(au => 
      au.id !== authUser.id && 
      au.email && 
      au.email.toLowerCase() === (userData.email || '').toLowerCase()
    );
    
    if (emailConflict) {
      console.log(`   ⚠️  Email conflict: ${userData.email} already exists for user ${emailConflict.id}`);
    } else {
      console.log(`   ✅ No email conflict`);
    }

    // Convert phone to E.164
    function convertToE164HongKong(phone) {
      if (!phone || typeof phone !== 'string') return null;
      const trimmed = phone.trim();
      const digits = trimmed.replace(/\D/g, '');
      if (digits.length === 0) return null;
      if (trimmed.startsWith('+')) {
        const digitsAfterPlus = trimmed.substring(1).replace(/\D/g, '');
        if (digitsAfterPlus.length >= 7 && digitsAfterPlus.length <= 15) {
          return `+${digitsAfterPlus}`;
        }
      }
      if (digits.length === 8) {
        return `+852${digits}`;
      }
      if (digits.length === 11 && digits.startsWith('852')) {
        return `+${digits}`;
      }
      return null;
    }

    let phoneE164 = null;
    if (userData.phone) {
      phoneE164 = convertToE164HongKong(userData.phone);
      console.log(`\n📞 Phone conversion:`);
      console.log(`   Original: ${userData.phone}`);
      console.log(`   E.164: ${phoneE164 || 'FAILED'}`);
    }

    const phoneConflict = phoneE164 ? authUsersData.users.find(au => 
      au.id !== authUser.id && 
      au.phone === phoneE164
    ) : null;
    
    if (phoneConflict) {
      console.log(`   ⚠️  Phone conflict: ${phoneE164} already exists for user ${phoneConflict.id}`);
    } else if (phoneE164) {
      console.log(`   ✅ No phone conflict`);
    }

    // Try a test update
    console.log(`\n🧪 Testing update...`);
    
    const testUpdateData = {
      email: userData.email || authUser.email,
      phone: phoneE164 || authUser.phone || null,
      user_metadata: {
        ...authUser.user_metadata,
        name: userData.name,
        role: userData.role,
        company_id: userData.company_id?.toString() || null,
        position: userData.position || null,
        is_pending: userData.is_pending ?? false,
        approved_by: userData.approved_by?.toString() || null,
        approved_at: userData.approved_at || null,
      }
    };

    // Clean up null/undefined values
    Object.keys(testUpdateData.user_metadata).forEach(key => {
      if (testUpdateData.user_metadata[key] === null || testUpdateData.user_metadata[key] === undefined) {
        delete testUpdateData.user_metadata[key];
      }
    });

    console.log(`\n📋 Update data to be sent:`);
    console.log(JSON.stringify({
      email: testUpdateData.email,
      phone: testUpdateData.phone ? '***' : null,
      user_metadata: testUpdateData.user_metadata
    }, null, 2));

    const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      authUser.id,
      testUpdateData
    );

    if (updateError) {
      console.log(`\n❌ Update failed:`);
      console.log(`   Message: ${updateError.message}`);
      console.log(`   Status: ${updateError.status}`);
      console.log(`   Full error:`, JSON.stringify(updateError, null, 2));
    } else {
      console.log(`\n✅ Update successful!`);
      console.log(`   Updated user ID: ${updatedUser.user.id}`);
    }

  } catch (error) {
    console.error(`\n❌ Unexpected error:`, error.message);
    console.error(`   Stack:`, error.stack);
  }
}

async function main() {
  for (const email of emailsToCheck) {
    await diagnoseUser(email);
  }
}

main();


