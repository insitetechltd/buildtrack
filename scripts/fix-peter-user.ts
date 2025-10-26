#!/usr/bin/env tsx

/**
 * Fix Peter User Email
 * 
 * Changes dennis@buildtrack.com to peter@buildtrack.com in both auth.users and users tables
 * 
 * Usage:
 * npx tsx scripts/fix-peter-user.ts
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing Supabase configuration!');
  console.error('Please set EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your .env file');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixPeterUser() {
  console.log('🔧 Fixing Peter user email...\n');
  
  try {
    // Step 1: Find the existing dennis@buildtrack.com user
    console.log('📧 Step 1: Finding dennis@buildtrack.com user...');
    
    const { data: existingAuthUser } = await supabaseAdmin.auth.admin.listUsers();
    const dennisAuthUser = existingAuthUser.users?.find(u => u.email === 'dennis@buildtrack.com');
    
    if (!dennisAuthUser) {
      console.log('⚠️  No auth user found with dennis@buildtrack.com');
      console.log('Checking if peter@buildtrack.com already exists...');
      
      const peterAuthUser = existingAuthUser.users?.find(u => u.email === 'peter@buildtrack.com');
      if (peterAuthUser) {
        console.log('✅ peter@buildtrack.com already exists in auth!');
        
        // Just update the database user
        const { error: dbError } = await supabaseAdmin
          .from('users')
          .update({ 
            email: 'peter@buildtrack.com',
            name: 'Peter'
          })
          .eq('email', 'dennis@buildtrack.com');
        
        if (dbError) {
          console.error('❌ Error updating database user:', dbError.message);
        } else {
          console.log('✅ Updated database user to peter@buildtrack.com');
        }
        
        return;
      }
      
      console.log('Creating new peter@buildtrack.com user...');
      
      // Create new user
      const { data: newAuthUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: 'peter@buildtrack.com',
        password: 'password123',
        email_confirm: true,
        user_metadata: {
          name: 'Peter',
          phone: '555-0106',
          position: 'Site Supervisor',
          role: 'worker',
        }
      });
      
      if (createError) {
        console.error('❌ Error creating auth user:', createError.message);
        throw createError;
      }
      
      console.log('✅ Created auth user:', newAuthUser.user.id);
      
      // Get company ID for BuildTrack
      const { data: company } = await supabaseAdmin
        .from('companies')
        .select('id')
        .eq('name', 'BuildTrack Construction Inc.')
        .single();
      
      if (!company) {
        console.error('❌ BuildTrack company not found');
        return;
      }
      
      // Create database user
      const { error: dbError } = await supabaseAdmin
        .from('users')
        .insert({
          id: newAuthUser.user.id,
          email: 'peter@buildtrack.com',
          name: 'Peter',
          role: 'worker',
          company_id: company.id,
          position: 'Site Supervisor',
          phone: '555-0106',
        });
      
      if (dbError) {
        console.error('❌ Error creating database user:', dbError.message);
        throw dbError;
      }
      
      console.log('✅ Created database user');
      
      return;
    }
    
    console.log('✅ Found auth user:', dennisAuthUser.id);
    
    // Step 2: Update auth user email
    console.log('\n📧 Step 2: Updating auth.users email...');
    
    const { data: updatedAuthUser, error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      dennisAuthUser.id,
      {
        email: 'peter@buildtrack.com',
        user_metadata: {
          ...dennisAuthUser.user_metadata,
          email: 'peter@buildtrack.com',
          name: 'Peter'
        }
      }
    );
    
    if (authError) {
      console.error('❌ Error updating auth user:', authError.message);
      throw authError;
    }
    
    console.log('✅ Updated auth.users email to peter@buildtrack.com');
    
    // Step 3: Update database user
    console.log('\n📧 Step 3: Updating users table...');
    
    const { error: dbError } = await supabaseAdmin
      .from('users')
      .update({ 
        email: 'peter@buildtrack.com',
        name: 'Peter'
      })
      .eq('id', dennisAuthUser.id);
    
    if (dbError) {
      console.error('❌ Error updating database user:', dbError.message);
      throw dbError;
    }
    
    console.log('✅ Updated users table email to peter@buildtrack.com');
    
    // Step 4: Verify changes
    console.log('\n✅ Verification:');
    
    const { data: verifyUser } = await supabaseAdmin
      .from('users')
      .select('id, email, name, role, position')
      .eq('email', 'peter@buildtrack.com')
      .single();
    
    if (verifyUser) {
      console.log('✅ User found in database:');
      console.log(`   Name: ${verifyUser.name}`);
      console.log(`   Email: ${verifyUser.email}`);
      console.log(`   Role: ${verifyUser.role}`);
      console.log(`   Position: ${verifyUser.position}`);
    }
    
    const peterAuthUser = existingAuthUser.users?.find(u => u.email === 'peter@buildtrack.com');
    if (peterAuthUser || updatedAuthUser) {
      console.log('✅ User found in auth.users:');
      console.log(`   Email: peter@buildtrack.com`);
    }
    
    console.log('\n🎉 Peter user fixed successfully!');
    console.log('You can now login with:');
    console.log('   Email: peter@buildtrack.com');
    console.log('   Password: password123');
    
  } catch (error: any) {
    console.error('\n❌ Fix failed:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  fixPeterUser().catch(console.error);
}

export { fixPeterUser };

