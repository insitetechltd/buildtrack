/**
 * Script to create admin users for each existing company
 * Run this with: node scripts/create-admin-users.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase configuration from environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Missing Supabase configuration');
  console.error('Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const COMPANIES = [
  {
    id: "comp-1",
    name: "BuildTrack Construction Inc.",
    type: "general_contractor",
    email: "contact@buildtrack.com"
  },
  {
    id: "comp-2", 
    name: "Elite Electric Co.",
    type: "subcontractor",
    email: "info@eliteelectric.com"
  },
  {
    id: "comp-3",
    name: "Metro Plumbing Services", 
    type: "subcontractor",
    email: "contact@metroplumbing.com"
  }
];

async function createAdminUsers() {
  console.log('🚀 Starting admin user creation process...');
  
  const results = [];

  for (const company of COMPANIES) {
    try {
      console.log(`\n📝 Creating admin user for ${company.name}...`);
      
      // Generate admin user data
      const adminEmail = `admin@${company.email.split('@')[1]}`;
      const adminName = `${company.name} Admin`;
      const adminPhone = `555-${company.id.split('-')[1]}00`;
      
      // Create auth user first
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: adminEmail,
        password: 'Admin123!', // Default password - should be changed
        options: {
          data: {
            name: adminName,
            phone: adminPhone,
            company_id: company.id,
            position: 'Administrator',
            role: 'admin',
          }
        }
      });

      if (authError) {
        console.error(`❌ Auth error for ${company.name}:`, authError.message);
        results.push({ company: company.name, success: false, error: authError.message });
        continue;
      }

      if (authData.user) {
        // Create user record in users table
        const { error: userError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            name: adminName,
            email: adminEmail,
            phone: adminPhone,
            company_id: company.id,
            position: 'Administrator',
            role: 'admin',
          });

        if (userError) {
          console.error(`❌ User creation error for ${company.name}:`, userError.message);
          results.push({ company: company.name, success: false, error: userError.message });
          continue;
        }

        console.log(`✅ Successfully created admin user for ${company.name}`);
        console.log(`   📧 Email: ${adminEmail}`);
        console.log(`   🔑 Password: Admin123!`);
        console.log(`   👤 Name: ${adminName}`);
        console.log(`   📱 Phone: ${adminPhone}`);
        
        results.push({ 
          company: company.name, 
          success: true, 
          email: adminEmail,
          password: 'Admin123!',
          name: adminName,
          phone: adminPhone
        });
      }
    } catch (error) {
      console.error(`❌ Unexpected error for ${company.name}:`, error.message);
      results.push({ company: company.name, success: false, error: error.message });
    }
  }

  // Print summary
  console.log('\n📊 SUMMARY:');
  console.log('='.repeat(50));
  
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  
  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  console.log(`❌ Failed: ${failed.length}/${results.length}`);
  
  if (successful.length > 0) {
    console.log('\n🎉 Successfully Created Admin Users:');
    successful.forEach(result => {
      console.log(`\n📋 ${result.company}:`);
      console.log(`   Email: ${result.email}`);
      console.log(`   Password: ${result.password}`);
      console.log(`   Name: ${result.name}`);
      console.log(`   Phone: ${result.phone}`);
    });
  }
  
  if (failed.length > 0) {
    console.log('\n❌ Failed to Create:');
    failed.forEach(result => {
      console.log(`   ${result.company}: ${result.error}`);
    });
  }
  
  console.log('\n🔐 IMPORTANT: Please change the default passwords after first login!');
  console.log('📱 Admin users can now log in and manage their respective companies.');
}

// Run the script
createAdminUsers().catch(console.error);

