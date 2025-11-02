import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase configuration!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkPeterProjects() {
  console.log('🔍 Checking Peter\'s project access...\n');

  try {
    // Find Peter's user ID
    const { data: peterUser, error: userError } = await supabase
      .from('users')
      .select('id, name, email, role')
      .ilike('name', '%peter%')
      .limit(1);

    if (userError || !peterUser || peterUser.length === 0) {
      console.error('❌ Could not find Peter in users table');
      return;
    }

    const peter = peterUser[0];
    console.log(`✅ Found Peter: ${peter.name} (ID: ${peter.id})\n`);

    // Get all projects Peter is assigned to
    const { data: assignments, error: assignError } = await supabase
      .from('user_project_assignments')
      .select('project_id, user_id')
      .eq('user_id', peter.id);

    if (assignError) {
      console.error('❌ Error fetching project assignments:', assignError.message);
      return;
    }

    console.log(`📋 Peter is assigned to ${assignments?.length || 0} project(s):\n`);
    
    if (assignments && assignments.length > 0) {
      // Get project details separately
      const projectIds = assignments.map((a: any) => a.project_id);
      const { data: projects, error: projError } = await supabase
        .from('projects')
        .select('id, name, status')
        .in('id', projectIds);

      if (!projError && projects) {
        projects.forEach((project, index) => {
          console.log(`${index + 1}. ${project.name} (ID: ${project.id})`);
          console.log(`   Status: ${project.status}\n`);
        });
      }
    } else {
      console.log('   ❌ No project assignments found\n');
    }

    // Check if Peter has access to "Project A - Commercial Building"
    const { data: taskProject, error: projectError } = await supabase
      .from('projects')
      .select('id, name')
      .ilike('name', '%Project A%')
      .limit(1);

    if (projectError || !taskProject || taskProject.length === 0) {
      console.log('❌ Could not find "Project A - Commercial Building"');
      return;
    }

    const projectA = taskProject[0];
    console.log(`\n🔍 Checking access to "${projectA.name}" (ID: ${projectA.id})...`);
    
    const hasAccess = assignments?.some((a: any) => a.project_id === projectA.id) || false;
    console.log(`   Has access: ${hasAccess ? '✅ YES' : '❌ NO'}\n`);

    // Get the task again to verify project ID
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, title, project_id, assigned_to, assigned_by')
      .ilike('title', '%testing sub task%')
      .limit(1);

    if (!taskError && task && task.length > 0) {
      const testTask = task[0];
      console.log(`\n📋 Task details:`);
      console.log(`   Title: "${testTask.title}"`);
      console.log(`   Project ID: ${testTask.project_id}`);
      console.log(`   Assigned To: ${JSON.stringify(testTask.assigned_to)}`);
      console.log(`   Assigned By: ${testTask.assigned_by}`);
      console.log(`   Project matches: ${testTask.project_id === projectA.id ? '✅ YES' : '❌ NO'}`);
      console.log(`   Peter ID in assigned_to: ${testTask.assigned_to?.includes(peter.id) ? '✅ YES' : '❌ NO'}`);
    }

  } catch (error: any) {
    console.error('❌ Unexpected error:', error.message);
  }
}

checkPeterProjects()
  .then(() => {
    console.log('\n✅ Check complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

