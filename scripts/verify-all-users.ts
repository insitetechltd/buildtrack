#!/usr/bin/env tsx

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing Supabase configuration!');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function verifyAllUsers() {
  console.log('🔍 Verifying all login users...\n');
  
  const expectedUsers = [
    'admin_tristan@insitetech.com',
    'tristan@insitetech.com',
    'dennis@insitetech.com',
    'admin@buildtrack.com',
    'manager@buildtrack.com',
    'peter@buildtrack.com',
    'worker@buildtrack.com',
    'admin@eliteelectric.com',
    'lisa@eliteelectric.com',
  ];
  
  console.log('Expected users:', expectedUsers.length);
  
  // Check auth.users
  const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
  console.log('\n📧 Auth Users:');
  expectedUsers.forEach(email => {
    const found = authUsers.users?.find(u => u.email === email);
    console.log(`${found ? '✅' : '❌'} ${email}`);
  });
  
  // Check database users
  const { data: dbUsers } = await supabaseAdmin
    .from('users')
    .select('email, name, role, position')
    .in('email', expectedUsers);
  
  console.log('\n👤 Database Users:');
  expectedUsers.forEach(email => {
    const found = dbUsers?.find(u => u.email === email);
    if (found) {
      console.log(`✅ ${email} → ${found.name} (${found.role})`);
    } else {
      console.log(`❌ ${email} → NOT FOUND`);
    }
  });
  
  console.log('\n📊 Summary:');
  console.log(`Auth users: ${authUsers.users?.filter(u => expectedUsers.includes(u.email || '')).length}/${expectedUsers.length}`);
  console.log(`DB users: ${dbUsers?.length || 0}/${expectedUsers.length}`);
}

if (require.main === module) {
  verifyAllUsers().catch(console.error);
}

export { verifyAllUsers };
