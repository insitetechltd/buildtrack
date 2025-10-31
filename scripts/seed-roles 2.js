/**
 * Script to seed roles data into Supabase
 * Run this with: node scripts/seed-roles.js
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

const ROLES = [
  {
    name: 'admin',
    display_name: 'Administrator',
    description: 'Full system access with all permissions',
    level: 1,
    is_system_role: true,
    permissions: {
      can_manage_users: true,
      can_manage_companies: true,
      can_manage_projects: true,
      can_manage_tasks: true,
      can_manage_roles: true,
      can_view_all: true,
      can_delete_all: true
    }
  },
  {
    name: 'manager',
    display_name: 'Manager',
    description: 'Can manage projects, tasks, and team members',
    level: 2,
    is_system_role: true,
    permissions: {
      can_manage_projects: true,
      can_manage_tasks: true,
      can_assign_users: true,
      can_view_reports: true
    }
  },
  {
    name: 'worker',
    display_name: 'Worker',
    description: 'Can view and update assigned tasks',
    level: 3,
    is_system_role: true,
    permissions: {
      can_view_assigned_tasks: true,
      can_update_tasks: true,
      can_add_updates: true
    }
  },
  {
    name: 'lead_project_manager',
    display_name: 'Lead Project Manager',
    description: 'Oversees entire project execution',
    level: 2,
    is_system_role: true,
    permissions: {
      can_manage_projects: true,
      can_manage_tasks: true,
      can_assign_users: true,
      can_approve_work: true,
      can_view_reports: true
    }
  },
  {
    name: 'contractor',
    display_name: 'Contractor',
    description: 'Main contractor for project work',
    level: 2,
    is_system_role: true,
    permissions: {
      can_manage_tasks: true,
      can_create_tasks: true,
      can_assign_tasks: true,
      can_view_project: true
    }
  },
  {
    name: 'subcontractor',
    display_name: 'Subcontractor',
    description: 'Specialized contractor for specific tasks',
    level: 3,
    is_system_role: true,
    permissions: {
      can_view_assigned_tasks: true,
      can_update_tasks: true,
      can_create_subtasks: true
    }
  },
  {
    name: 'inspector',
    display_name: 'Inspector',
    description: 'Reviews and inspects work quality',
    level: 2,
    is_system_role: true,
    permissions: {
      can_view_all_tasks: true,
      can_approve_work: true,
      can_reject_work: true,
      can_add_comments: true
    }
  },
  {
    name: 'architect',
    display_name: 'Architect',
    description: 'Provides architectural guidance and approvals',
    level: 2,
    is_system_role: true,
    permissions: {
      can_view_project: true,
      can_approve_designs: true,
      can_add_comments: true,
      can_view_reports: true
    }
  },
  {
    name: 'engineer',
    display_name: 'Engineer',
    description: 'Provides engineering guidance and approvals',
    level: 2,
    is_system_role: true,
    permissions: {
      can_view_project: true,
      can_approve_engineering: true,
      can_add_comments: true,
      can_view_reports: true
    }
  },
  {
    name: 'foreman',
    display_name: 'Foreman',
    description: 'Supervises workers on-site',
    level: 2,
    is_system_role: true,
    permissions: {
      can_assign_tasks: true,
      can_view_team_tasks: true,
      can_update_tasks: true,
      can_approve_work: true
    }
  }
];

async function seedRoles() {
  console.log('🌱 Starting role seeding process...');
  console.log(`📝 Preparing to seed ${ROLES.length} roles\n`);

  const results = {
    inserted: [],
    updated: [],
    failed: []
  };

  for (const role of ROLES) {
    try {
      console.log(`Processing: ${role.display_name} (${role.name})...`);

      // Check if role already exists
      const { data: existingRole, error: checkError } = await supabase
        .from('roles')
        .select('*')
        .eq('name', role.name)
        .single();

      if (existingRole) {
        // Update existing role
        const { error: updateError } = await supabase
          .from('roles')
          .update({
            display_name: role.display_name,
            description: role.description,
            level: role.level,
            permissions: role.permissions,
            is_system_role: role.is_system_role,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingRole.id);

        if (updateError) {
          console.error(`  ❌ Failed to update: ${updateError.message}`);
          results.failed.push({ role: role.name, error: updateError.message });
        } else {
          console.log(`  ✅ Updated existing role`);
          results.updated.push(role.name);
        }
      } else {
        // Insert new role
        const { error: insertError } = await supabase
          .from('roles')
          .insert({
            name: role.name,
            display_name: role.display_name,
            description: role.description,
            level: role.level,
            permissions: role.permissions,
            is_system_role: role.is_system_role
          });

        if (insertError) {
          console.error(`  ❌ Failed to insert: ${insertError.message}`);
          results.failed.push({ role: role.name, error: insertError.message });
        } else {
          console.log(`  ✅ Inserted new role`);
          results.inserted.push(role.name);
        }
      }
    } catch (error) {
      console.error(`  ❌ Unexpected error: ${error.message}`);
      results.failed.push({ role: role.name, error: error.message });
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SEEDING SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Inserted: ${results.inserted.length}`);
  console.log(`🔄 Updated: ${results.updated.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  console.log('='.repeat(60));

  if (results.inserted.length > 0) {
    console.log('\n🆕 Newly Inserted Roles:');
    results.inserted.forEach(name => console.log(`   - ${name}`));
  }

  if (results.updated.length > 0) {
    console.log('\n🔄 Updated Roles:');
    results.updated.forEach(name => console.log(`   - ${name}`));
  }

  if (results.failed.length > 0) {
    console.log('\n❌ Failed Roles:');
    results.failed.forEach(({ role, error }) => {
      console.log(`   - ${role}: ${error}`);
    });
  }

  // Verify final count
  const { data: allRoles, error: countError } = await supabase
    .from('roles')
    .select('name, display_name');

  if (!countError && allRoles) {
    console.log('\n' + '='.repeat(60));
    console.log(`📋 Total roles in database: ${allRoles.length}`);
    console.log('='.repeat(60));
    allRoles.forEach(role => {
      console.log(`   - ${role.display_name} (${role.name})`);
    });
  }

  console.log('\n✨ Seeding process complete!');
}

// Run the script
seedRoles().catch(console.error);


