#!/usr/bin/env node

/**
 * Check user's last_selected_project_id and validate if project exists and user is assigned
 * Usage: node check_user_last_project.js tristan@insitetech.co
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: Supabase credentials not found.');
  console.error('   Ensure EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are in your .env file.');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const emailToCheck = process.argv[2];

if (!emailToCheck) {
  console.log('Usage: node check_user_last_project.js <email>');
  console.log('Example: node check_user_last_project.js tristan@insitetech.co');
  process.exit(1);
}

async function checkUserLastProject(email) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Checking last selected project for: ${email}`);
  console.log('='.repeat(60));

  try {
    // Get user from users table
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, email, name, last_selected_project_id')
      .eq('email', email)
      .single();

    if (userError || !userData) {
      console.log(`❌ User not found in users table: ${userError?.message || 'Not found'}`);
      return;
    }

    console.log(`\n📋 User Information:`);
    console.log(`   ID: ${userData.id}`);
    console.log(`   Email: ${userData.email}`);
    console.log(`   Name: ${userData.name || 'N/A'}`);
    console.log(`   Last Selected Project ID: ${userData.last_selected_project_id || 'NULL'}`);

    // Get user's project assignments
    const { data: assignments, error: assignmentError } = await supabaseAdmin
      .from('user_project_assignments')
      .select('project_id, is_active')
      .eq('user_id', userData.id)
      .eq('is_active', true);

    if (assignmentError) {
      console.log(`\n❌ Error fetching project assignments: ${assignmentError.message}`);
      return;
    }

    const assignedProjectIds = assignments?.map(a => a.project_id) || [];
    console.log(`\n📦 User's Active Project Assignments:`);
    console.log(`   Total assigned projects: ${assignedProjectIds.length}`);
    
    if (assignedProjectIds.length > 0) {
      // Get project details
      const { data: projects, error: projectsError } = await supabaseAdmin
        .from('projects')
        .select('id, name, status')
        .in('id', assignedProjectIds);

      if (projectsError) {
        console.log(`   ❌ Error fetching project details: ${projectsError.message}`);
      } else {
        projects?.forEach((project, index) => {
          console.log(`   ${index + 1}. ${project.name} (ID: ${project.id})`);
          console.log(`      Status: ${project.status}`);
        });
      }
    } else {
      console.log(`   ⚠️  User has no active project assignments`);
    }

    // Check if last_selected_project_id is valid
    if (!userData.last_selected_project_id) {
      console.log(`\n⚠️  ISSUE: User has no last_selected_project_id set`);
      console.log(`   This means the app should show the project picker screen`);
      return;
    }

    const lastProjectId = userData.last_selected_project_id;
    console.log(`\n🔍 Validating Last Selected Project:`);
    console.log(`   Project ID: ${lastProjectId}`);

    // Check if project exists
    const { data: projectData, error: projectError } = await supabaseAdmin
      .from('projects')
      .select('id, name, status')
      .eq('id', lastProjectId)
      .single();

    if (projectError || !projectData) {
      console.log(`   ❌ PROJECT DOES NOT EXIST!`);
      console.log(`   Error: ${projectError?.message || 'Not found'}`);
      console.log(`\n💡 SOLUTION: Clear the last_selected_project_id`);
      console.log(`   Run: UPDATE users SET last_selected_project_id = NULL WHERE id = '${userData.id}';`);
      return;
    }

    console.log(`   ✅ Project exists: ${projectData.name}`);
    console.log(`   Status: ${projectData.status}`);

    // Check if user is assigned to this project
    const isAssigned = assignedProjectIds.includes(lastProjectId);
    if (!isAssigned) {
      console.log(`   ❌ USER IS NOT ASSIGNED TO THIS PROJECT!`);
      console.log(`\n💡 SOLUTION: Either:`);
      console.log(`   1. Assign user to project:`);
      console.log(`      INSERT INTO user_project_assignments (user_id, project_id, is_active) VALUES ('${userData.id}', '${lastProjectId}', true);`);
      console.log(`   2. Or clear the last_selected_project_id:`);
      console.log(`      UPDATE users SET last_selected_project_id = NULL WHERE id = '${userData.id}';`);
      return;
    }

    console.log(`   ✅ User is assigned to this project`);

    console.log(`\n✅ All checks passed! The last selected project is valid.`);
    console.log(`   The app should load this project automatically.`);

  } catch (error) {
    console.error(`\n❌ Unexpected error:`, error);
  }
}

checkUserLastProject(emailToCheck)
  .then(() => {
    console.log(`\n${'='.repeat(60)}`);
    console.log('Check complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });

