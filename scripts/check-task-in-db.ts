import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase configuration!');
  console.error('Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTaskInDatabase() {
  console.log('🔍 Checking for "Testing sub task after schema change" in database...\n');

  try {
    // Search for the task by title
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .ilike('title', '%testing sub task%')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error querying database:', error.message);
      return;
    }

    if (!tasks || tasks.length === 0) {
      console.log('❌ Task NOT found in database');
      console.log('\n📋 Checking all tasks to see what exists...\n');
      
      // Get all tasks
      const { data: allTasks, error: allError } = await supabase
        .from('tasks')
        .select('id, title, project_id, parent_task_id, assigned_to, assigned_by, accepted, current_status, created_at')
        .order('created_at', { ascending: false })
        .limit(50);

      if (allError) {
        console.error('❌ Error fetching all tasks:', allError.message);
        return;
      }

      console.log(`📊 Found ${allTasks?.length || 0} tasks in database:\n`);
      allTasks?.forEach((task, index) => {
        console.log(`${index + 1}. "${task.title}"`);
        console.log(`   ID: ${task.id}`);
        console.log(`   Project ID: ${task.project_id}`);
        console.log(`   Parent Task ID: ${task.parent_task_id || 'NULL (top-level)'}`);
        console.log(`   Assigned To: ${JSON.stringify(task.assigned_to)}`);
        console.log(`   Assigned By: ${task.assigned_by}`);
        console.log(`   Accepted: ${task.accepted}`);
        console.log(`   Status: ${task.current_status}`);
        console.log(`   Created: ${task.created_at}`);
        console.log('');
      });

      // Check for tasks with "test" or "sub" in title
      const { data: similarTasks, error: similarError } = await supabase
        .from('tasks')
        .select('id, title, project_id, parent_task_id, assigned_to, assigned_by')
        .or('title.ilike.%test%,title.ilike.%sub%')
        .order('created_at', { ascending: false });

      if (!similarError && similarTasks && similarTasks.length > 0) {
        console.log(`\n🔍 Found ${similarTasks.length} similar tasks (with "test" or "sub" in title):\n`);
        similarTasks.forEach((task, index) => {
          console.log(`${index + 1}. "${task.title}"`);
          console.log(`   ID: ${task.id}`);
          console.log(`   Parent Task ID: ${task.parent_task_id || 'NULL'}`);
          console.log(`   Assigned To: ${JSON.stringify(task.assigned_to)}`);
          console.log(`   Assigned By: ${task.assigned_by}`);
          console.log('');
        });
      }
      return;
    }

    console.log(`✅ Found ${tasks.length} matching task(s):\n`);

    // Get user details
    const { data: allUsers } = await supabase.from('users').select('id, name, email, role');
    const userMap = new Map<string, any>();
    allUsers?.forEach(user => {
      userMap.set(user.id, user);
    });

    // Get project details
    const { data: allProjects } = await supabase.from('projects').select('id, name');
    const projectMap = new Map<string, any>();
    allProjects?.forEach(project => {
      projectMap.set(project.id, project);
    });

    tasks.forEach((task, index) => {
      console.log(`\n${index + 1}. Task Details:`);
      console.log(`   Title: "${task.title}"`);
      console.log(`   ID: ${task.id}`);
      console.log(`   Project: ${projectMap.get(task.project_id)?.name || 'Unknown'} (${task.project_id})`);
      console.log(`   Parent Task ID: ${task.parent_task_id || 'NULL (top-level task)'}`);
      console.log(`   Nesting Level: ${task.nesting_level || 0}`);
      console.log(`   Root Task ID: ${task.root_task_id || 'NULL'}`);
      
      console.log(`   Assigned To:`);
      if (task.assigned_to && Array.isArray(task.assigned_to)) {
        task.assigned_to.forEach(userId => {
          const user = userMap.get(userId);
          if (user) {
            console.log(`     - ${user.name} (${user.email}) - ${user.role} - ID: ${userId}`);
          } else {
            console.log(`     - Unknown user ID: ${userId}`);
          }
        });
      } else {
        console.log(`     - None or invalid`);
      }
      
      const assignedByUser = userMap.get(task.assigned_by);
      console.log(`   Assigned By: ${assignedByUser?.name || 'Unknown'} (${task.assigned_by})`);
      console.log(`   Accepted: ${task.accepted === null ? 'NULL' : task.accepted === true ? 'TRUE' : 'FALSE'}`);
      console.log(`   Current Status: ${task.current_status}`);
      console.log(`   Completion: ${task.completion_percentage}%`);
      console.log(`   Created At: ${task.created_at}`);
      console.log(`   Updated At: ${task.updated_at}`);
    });

    // Check if task is assigned to Peter
    console.log('\n🔍 Checking if task is assigned to Peter...');
    const peterUsers = allUsers?.filter(u => u.name?.toLowerCase().includes('peter'));
    if (peterUsers && peterUsers.length > 0) {
      peterUsers.forEach(peter => {
        console.log(`\n   Peter found: ${peter.name} (ID: ${peter.id})`);
        tasks.forEach(task => {
          const assignedTo = task.assigned_to || [];
          const isAssignedToPeter = Array.isArray(assignedTo) && assignedTo.includes(peter.id);
          console.log(`   Task "${task.title}" assigned to Peter: ${isAssignedToPeter ? '✅ YES' : '❌ NO'}`);
          if (isAssignedToPeter) {
            console.log(`      - Project: ${projectMap.get(task.project_id)?.name || 'Unknown'}`);
            console.log(`      - Parent Task ID: ${task.parent_task_id || 'NULL (top-level)'}`);
            console.log(`      - Accepted: ${task.accepted === null ? 'NULL' : task.accepted}`);
            console.log(`      - Status: ${task.current_status}`);
          }
        });
      });
    } else {
      console.log('   ❌ No user named Peter found in database');
    }

  } catch (error: any) {
    console.error('❌ Unexpected error:', error.message);
    console.error(error);
  }
}

// Run the check
checkTaskInDatabase()
  .then(() => {
    console.log('\n✅ Check complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

