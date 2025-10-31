/**
 * Script to create admin users for unique companies only
 * Run this with: node scripts/create-unique-company-admins.js
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

async function createUniqueCompanyAdmins() {
  console.log('🔍 Finding unique companies...');
  
  try {
    // Get all companies from the database
    const { data: companies, error } = await supabase
      .from('companies')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('❌ Error fetching companies:', error.message);
      return;
    }

    if (!companies || companies.length === 0) {
      console.log('❌ No companies found in the database.');
      return;
    }

    // Group companies by name to find unique ones
    const uniqueCompanies = new Map();
    companies.forEach(company => {
      if (!uniqueCompanies.has(company.name)) {
        uniqueCompanies.set(company.name, company);
      }
    });

    const uniqueCompanyList = Array.from(uniqueCompanies.values());
    
    console.log(`✅ Found ${companies.length} total companies, ${uniqueCompanyList.length} unique companies:`);
    uniqueCompanyList.forEach(company => {
      console.log(`   📋 ${company.name} (${company.type}) - ID: ${company.id}`);
    });

    console.log('\n🚀 Creating admin users for unique companies...');
    
    const results = [];

    for (const company of uniqueCompanyList) {
      try {
        console.log(`\n📝 Creating admin user for ${company.name}...`);
        
        // Generate admin user data
        const adminEmail = `admin@${company.name.toLowerCase().replace(/\s+/g, '')}.com`;
        const adminName = `${company.name} Admin`;
        const adminPhone = `555-${company.id.slice(-4)}`;
        
        // Check if admin user already exists for this company
        const { data: existingUser } = await supabase
          .from('users')
          .select('*')
          .eq('company_id', company.id)
          .eq('role', 'admin')
          .single();

        if (existingUser) {
          console.log(`⚠️  Admin user already exists for ${company.name}:`);
          console.log(`   📧 Email: ${existingUser.email}`);
          console.log(`   👤 Name: ${existingUser.name}`);
          results.push({ 
            company: company.name, 
            success: true, 
            email: existingUser.email,
            name: existingUser.name,
            phone: existingUser.phone,
            alreadyExists: true
          });
          continue;
        }
        
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
            phone: adminPhone,
            alreadyExists: false
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
    const newUsers = successful.filter(r => !r.alreadyExists);
    const existingUsers = successful.filter(r => r.alreadyExists);
    
    console.log(`✅ Total Success: ${successful.length}/${results.length}`);
    console.log(`🆕 New Users Created: ${newUsers.length}`);
    console.log(`👤 Existing Users Found: ${existingUsers.length}`);
    console.log(`❌ Failed: ${failed.length}/${results.length}`);
    
    if (newUsers.length > 0) {
      console.log('\n🎉 Newly Created Admin Users:');
      newUsers.forEach(result => {
        console.log(`\n📋 ${result.company}:`);
        console.log(`   Email: ${result.email}`);
        console.log(`   Password: ${result.password}`);
        console.log(`   Name: ${result.name}`);
        console.log(`   Phone: ${result.phone}`);
      });
    }
    
    if (existingUsers.length > 0) {
      console.log('\n👤 Existing Admin Users:');
      existingUsers.forEach(result => {
        console.log(`\n📋 ${result.company}:`);
        console.log(`   Email: ${result.email}`);
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
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Run the script
createUniqueCompanyAdmins().catch(console.error);

