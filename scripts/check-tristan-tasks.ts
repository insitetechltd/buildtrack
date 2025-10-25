import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function checkTristanTasks() {
  // Find Tristan users
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('*')
    .ilike('email', '%tristan%');
  
  if (userError) {
    console.error('Error fetching users:', userError);
    return;
  }
  
  console.log('\n=== Users named Tristan ===');
  users?.forEach(u => {
    console.log(`- ID: ${u.id}`);
    console.log(`  Name: ${u.name}`);
    console.log(`  Email: ${u.email}`);
    console.log(`  Role: ${u.role}`);
    console.log(`  Company ID: ${u.company_id}`);
    console.log('');
  });
  
  // Check tasks for each Tristan
  for (const user of users || []) {
    console.log(`\n=== Tasks for ${user.name} (${user.email}) ===`);
    
    // Tasks assigned TO this user
    const { data: assignedTasks, error: assignedError } = await supabase
      .from('tasks')
      .select('id, title, current_status, assigned_to, assigned_by, accepted, project_id')
      .contains('assigned_to', [user.id]);
    
    if (assignedError) {
      console.error('Error fetching assigned tasks:', assignedError);
    } else {
      console.log(`Tasks assigned TO ${user.name}: ${assignedTasks?.length || 0}`);
      assignedTasks?.forEach(t => {
        console.log(`  - ${t.title}`);
        console.log(`    Status: ${t.current_status}, Accepted: ${t.accepted}`);
        console.log(`    Project ID: ${t.project_id}`);
        console.log(`    Assigned by: ${t.assigned_by}`);
      });
    }
    
    // Tasks assigned BY this user
    const { data: createdTasks, error: createdError } = await supabase
      .from('tasks')
      .select('id, title, current_status, assigned_to, assigned_by, project_id')
      .eq('assigned_by', user.id);
    
    if (createdError) {
      console.error('Error fetching created tasks:', createdError);
    } else {
      console.log(`\nTasks assigned BY ${user.name}: ${createdTasks?.length || 0}`);
      createdTasks?.forEach(t => {
        console.log(`  - ${t.title}`);
        console.log(`    Status: ${t.current_status}`);
        console.log(`    Project ID: ${t.project_id}`);
        console.log(`    Assigned to: ${t.assigned_to}`);
      });
    }
    
    // Check project assignments
    const { data: projectAssignments, error: projError } = await supabase
      .from('user_project_assignments')
      .select('project_id, category, is_active')
      .eq('user_id', user.id);
    
    if (projError) {
      console.error('Error fetching project assignments:', projError);
    } else {
      console.log(`\nProject assignments for ${user.name}: ${projectAssignments?.length || 0}`);
      projectAssignments?.forEach(p => {
        console.log(`  - Project ID: ${p.project_id}`);
        console.log(`    Category: ${p.category}, Active: ${p.is_active}`);
      });
    }
  }
}

checkTristanTasks().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});

