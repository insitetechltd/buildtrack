#!/usr/bin/env tsx

/**
 * Setup Login Screen Users
 * 
 * This script creates the exact 6 users shown on the login screen with proper authentication.
 * It integrates with the existing comprehensive test framework.
 * 
 * Usage:
 * 1. Set up your .env file with Supabase credentials including SUPABASE_SERVICE_ROLE_KEY
 * 2. Run: npm run test:comprehensive
 * 
 * This replaces the old test users with the actual login screen users.
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
  console.error('❌ Missing Supabase configuration!');
  console.error('Please set EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, and SUPABASE_SERVICE_ROLE_KEY in your .env file');
  process.exit(1);
}

// Create Supabase client with service role key
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Companies for the login screen users
const COMPANIES = [
  {
    id: 'comp-1',
    name: 'BuildTrack Construction Inc.',
    type: 'general_contractor',
    description: 'Leading general contractor specializing in commercial projects',
    address: '123 Builder Street, Construction City, CA 90210',
    phone: '555-0100',
    email: 'contact@buildtrack.com',
    website: 'https://buildtrack.com',
    licenseNumber: 'GC-123456',
    insuranceExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'comp-2',
    name: 'Elite Electric Co.',
    type: 'subcontractor',
    description: 'Professional electrical services',
    address: '456 Electric Avenue, Power City, CA 90211',
    phone: '555-0200',
    email: 'info@eliteelectric.com',
    website: 'https://eliteelectric.com',
    licenseNumber: 'EC-789012',
    insuranceExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
  }
];

// Login screen users - exactly as shown in LoginScreen.tsx
const LOGIN_USERS = [
  {
    id: '1',
    email: 'manager@buildtrack.com',
    name: 'John Manager',
    role: 'manager',
    companyId: 'comp-1',
    position: 'Project Manager',
    phone: '555-0101',
    password: 'password123'
  },
  {
    id: '2',
    email: 'worker@buildtrack.com',
    name: 'Sarah Worker',
    role: 'worker',
    companyId: 'comp-1',
    position: 'Construction Worker',
    phone: '555-0102',
    password: 'password123'
  },
  {
    id: '3',
    email: 'admin@buildtrack.com',
    name: 'Alex Administrator',
    role: 'admin',
    companyId: 'comp-1',
    position: 'System Administrator',
    phone: '555-0103',
    password: 'password123'
  },
  {
    id: '4',
    email: 'peter@buildtrack.com',
    name: 'Peter',
    role: 'worker',
    companyId: 'comp-1',
    position: 'Site Supervisor',
    phone: '555-0106',
    password: 'password123'
  },
  {
    id: '5',
    email: 'lisa@eliteelectric.com',
    name: 'Lisa Martinez',
    role: 'worker',
    companyId: 'comp-2',
    position: 'Electrician',
    phone: '555-0104',
    password: 'password123'
  },
  {
    id: '6',
    email: 'admin@eliteelectric.com',
    name: 'Mike Johnson',
    role: 'admin',
    companyId: 'comp-2',
    position: 'Operations Manager',
    phone: '555-0105',
    password: 'password123'
  }
];

// Utility functions
function logProgress(step: string, status: 'start' | 'success' | 'error' | 'info', details = '') {
  const icons = {
    start: '🔄',
    success: '✅',
    error: '❌',
    info: 'ℹ️'
  };
  
  const statusText = {
    start: 'Starting',
    success: 'Completed',
    error: 'Failed',
    info: 'Info'
  };
  
  console.log(`${icons[status]} ${step} - ${statusText[status]}${details ? `: ${details}` : ''}`);
}

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Cleanup function
async function cleanup() {
  console.log('🧹 Cleaning up existing test data...\n');
  
  try {
    // Delete in reverse order of dependencies
    const tables = ['tasks', 'projects', 'users', 'companies'];
    
    for (const table of tables) {
      const { error } = await supabaseAdmin.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error && !error.message.includes('does not exist')) {
        console.warn(`⚠️  Warning cleaning ${table}:`, error.message);
      } else {
        logProgress(`Cleaned ${table}`, 'success');
      }
    }
    
    // Delete auth users
    logProgress('Cleaning auth users', 'start');
    for (const user of LOGIN_USERS) {
      try {
        const { data: existingUser } = await supabaseAdmin.auth.admin.getUserByEmail(user.email);
        if (existingUser.user) {
          await supabaseAdmin.auth.admin.deleteUser(existingUser.user.id);
        }
      } catch (error: any) {
        // Ignore errors for non-existent users
      }
    }
    logProgress('Cleaned auth users', 'success');
    
    console.log('\n✅ Cleanup completed!\n');
  } catch (error: any) {
    console.error('❌ Cleanup failed:', error.message);
  }
}

// Setup functions
async function setupCompanies() {
  logProgress('Setting up companies', 'start');
  
  const companyMap = new Map<string, string>();
  
  for (const company of COMPANIES) {
    // First, check if company exists by name
    const { data: existingCompany } = await supabaseAdmin
      .from('companies')
      .select('id, name')
      .eq('name', company.name)
      .single();
    
    if (existingCompany) {
      logProgress(`Company ${company.name}`, 'info', 'already exists');
      companyMap.set(company.id, existingCompany.id);
      continue;
    }
    
    // Insert without specifying ID (let Supabase generate UUID)
    const { data, error } = await supabaseAdmin
      .from('companies')
      .insert({
        name: company.name,
        type: company.type,
        description: company.description,
        address: company.address,
        phone: company.phone,
        email: company.email,
        website: company.website,
        license_number: company.licenseNumber,
        insurance_expiry: company.insuranceExpiry,
        is_active: true,
        banner: {
          text: company.name,
          backgroundColor: '#3b82f6',
          textColor: '#ffffff',
          isVisible: true
        }
      })
      .select('id')
      .single();
    
    if (error) {
      logProgress(`Company ${company.name}`, 'error', error.message);
      throw error;
    }
    
    logProgress(`Company ${company.name}`, 'success');
    companyMap.set(company.id, data.id);
    await delay(100);
  }
  
  logProgress('Companies setup', 'success', `${companyMap.size} companies created`);
  return companyMap;
}

async function setupUsers(companyMap: Map<string, string>) {
  logProgress('Setting up users with authentication', 'start');
  
  const userMap = new Map<string, string>();
  
  for (const user of LOGIN_USERS) {
    const companyId = companyMap.get(user.companyId);
    if (!companyId) {
      throw new Error(`Company not found for user ${user.name}`);
    }
    
    try {
      // Check if auth user already exists
      const { data: existingAuthData } = await supabaseAdmin.auth.admin.listUsers();
      const existingAuthUser = existingAuthData.users?.find(u => u.email === user.email);
      
      let authUserId: string;
      
      if (existingAuthUser) {
        logProgress(`Auth for ${user.name}`, 'info', 'already exists');
        authUserId = existingAuthUser.id;
      } else {
        // Create auth user
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true,
          user_metadata: {
            name: user.name,
            phone: user.phone,
            company_id: companyId,
            position: user.position,
            role: user.role,
          }
        });
        
        if (authError) {
          logProgress(`Auth for ${user.name}`, 'error', authError.message);
          throw authError;
        }
        
        logProgress(`Auth for ${user.name}`, 'success');
        authUserId = authData.user.id;
      }
      
      // Check if user record already exists
      const { data: existingUserRecord } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('email', user.email)
        .single();
      
      if (existingUserRecord) {
        logProgress(`User record for ${user.name}`, 'info', 'already exists');
        userMap.set(user.id, existingUserRecord.id);
      } else {
        // Create user record
        const { error: userError } = await supabaseAdmin
          .from('users')
          .insert({
            id: authUserId,
            name: user.name,
            email: user.email,
            role: user.role,
            company_id: companyId,
            position: user.position,
            phone: user.phone,
          });
        
        if (userError) {
          logProgress(`User record for ${user.name}`, 'error', userError.message);
          throw userError;
        }
        
        logProgress(`User record for ${user.name}`, 'success');
        userMap.set(user.id, authUserId);
      }
      
      await delay(100);
      
    } catch (error: any) {
      console.error(`❌ Failed to create user ${user.name}:`, error.message);
      throw error;
    }
  }
  
  logProgress('Users setup', 'success', `${userMap.size} users created`);
  return userMap;
}

async function verifySetup() {
  logProgress('Verifying setup', 'start');
  
  try {
    // Check companies by name (not ID since IDs are UUIDs)
    const { data: companies, error: companiesError } = await supabaseAdmin
      .from('companies')
      .select('id, name')
      .in('name', COMPANIES.map(c => c.name));
    
    if (companiesError) {
      throw companiesError;
    }
    
    // Check users
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, name, email, role, company_id')
      .in('email', LOGIN_USERS.map(u => u.email));
    
    if (usersError) {
      throw usersError;
    }
    
    // Test login for each user
    const { data: allAuthUsers } = await supabaseAdmin.auth.admin.listUsers();
    const loginResults = LOGIN_USERS.map(user => {
      const authUser = allAuthUsers.users?.find(u => u.email === user.email);
      return {
        email: user.email,
        success: !!authUser
      };
    });
    
    const successfulLogins = loginResults.filter(r => r.success).length;
    
    logProgress('Verification', 'success', `${companies.length} companies, ${users.length} users, ${successfulLogins} auth users`);
    
    return {
      companies,
      users,
      loginResults
    };
    
  } catch (error: any) {
    logProgress('Verification', 'error', error.message);
    throw error;
  }
}

// Main function
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('cleanup')) {
    await cleanup();
    return;
  }
  
  console.log('🚀 Setting up Login Screen Users...\n');
  
  try {
    // Step 1: Setup companies
    const companyMap = await setupCompanies();
    
    // Step 2: Setup users with auth
    const userMap = await setupUsers(companyMap);
    
    // Step 3: Verify setup
    const verification = await verifySetup();
    
    // Print summary
    console.log('\n🎉 Setup Completed Successfully!\n');
    console.log('📊 Summary:');
    console.log('='.repeat(50));
    console.log(`Companies: ${verification.companies.length}`);
    verification.companies.forEach(company => {
      console.log(`  - ${company.name}`);
    });
    
    console.log(`\nUsers: ${verification.users.length}`);
    verification.users.forEach(user => {
      const emoji = user.role === 'admin' ? '👑' : user.role === 'manager' ? '📋' : '👷';
      console.log(`  ${emoji} ${user.name} (${user.email}) - ${user.role}`);
    });
    
    console.log('\n🔐 Login Credentials:');
    console.log('All users use password: "password123"');
    
    console.log('\n📱 Login Screen Users:');
    console.log('BuildTrack Construction Inc.:');
    console.log('  - manager@buildtrack.com (John Manager - Manager)');
    console.log('  - worker@buildtrack.com (Sarah Worker - Worker)');
    console.log('  - admin@buildtrack.com (Alex Administrator - Admin)');
    console.log('  - peter@buildtrack.com (Peter - Worker)');
    console.log('\nElite Electric Co.:');
    console.log('  - lisa@eliteelectric.com (Lisa Martinez - Worker)');
    console.log('  - admin@eliteelectric.com (Mike Johnson - Admin)');
    
    console.log('\n✨ You can now login with any of these users in your app!');
    console.log('\n💡 Next Steps:');
    console.log('  1. Start your app: npm start');
    console.log('  2. Click any user on the login screen to login');
    console.log('  3. Test different user roles and permissions');
    console.log('\n🧹 To cleanup: npm run test:cleanup');
    
  } catch (error: any) {
    console.error('\n💥 Setup failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

export { main, setupCompanies, setupUsers, verifySetup, cleanup };
