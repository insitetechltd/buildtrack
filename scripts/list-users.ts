#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing Supabase configuration!');
  console.error('Please set EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or EXPO_PUBLIC_SUPABASE_ANON_KEY) in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function listAllUsers() {
  console.log('🔍 Fetching all users from database...\n');

  try {
    // Fetch all users from the users table
    const { data: users, error } = await supabase
      .from('users')
      .select(`
        id,
        name,
        email,
        phone,
        role,
        position,
        company_id,
        created_at
      `)
      .order('name');

    if (error) {
      console.error('❌ Error querying database:', error.message);
      return;
    }

    if (!users || users.length === 0) {
      console.log('📭 No users found in database');
      return;
    }

    console.log(`📊 Found ${users.length} user(s) in database:\n`);
    console.log('═'.repeat(120));
    console.log(
      '│ ' + 
      'ID'.padEnd(38) + ' │ ' +
      'Name'.padEnd(25) + ' │ ' +
      'Email'.padEnd(30) + ' │ ' +
      'Role'.padEnd(10) + ' │'
    );
    console.log('═'.repeat(120));

    users.forEach((user, index) => {
      const id = user.id || 'N/A';
      const name = (user.name || 'N/A').substring(0, 23);
      const email = (user.email || 'N/A').substring(0, 28);
      const role = (user.role || 'N/A').substring(0, 8);
      
      console.log(
        '│ ' + 
        id.padEnd(38) + ' │ ' +
        name.padEnd(25) + ' │ ' +
        email.padEnd(30) + ' │ ' +
        role.padEnd(10) + ' │'
      );
    });

    console.log('═'.repeat(120));
    console.log(`\n📋 Summary: ${users.length} total user(s)\n`);

    // Also show detailed information
    console.log('\n📝 Detailed User Information:\n');
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name || 'Unnamed User'}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email || 'N/A'}`);
      console.log(`   Phone: ${user.phone || 'N/A'}`);
      console.log(`   Role: ${user.role || 'N/A'}`);
      console.log(`   Position: ${user.position || 'N/A'}`);
      console.log(`   Company ID: ${user.company_id || 'N/A'}`);
      console.log(`   Created: ${user.created_at ? new Date(user.created_at).toLocaleString() : 'N/A'}`);
      console.log('');
    });

  } catch (error: any) {
    console.error('❌ Unexpected error:', error.message);
  }
}

if (require.main === module) {
  listAllUsers().catch(console.error);
}

export { listAllUsers };

