/**
 * Cleanup Mock Tasks Script
 * 
 * Deletes all tasks created by the mock task generator.
 * Identifies tasks by the "[TEST]" prefix in the title.
 * 
 * Usage: npm run test:mock-cleanup
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as readline from 'readline';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function promptConfirmation(message: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(`${message} (yes/no): `, (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
    });
  });
}

async function main() {
  console.log('🧹 Starting mock task cleanup...\n');

  // Step 1: Find all test tasks
  console.log('🔍 Finding tasks with [TEST] prefix...');
  
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('id, title')
    .like('title', '[TEST]%');

  if (tasksError) {
    console.error('❌ Failed to fetch test tasks:', tasksError);
    process.exit(1);
  }

  if (!tasks || tasks.length === 0) {
    console.log('✅ No test tasks found. Database is clean!');
    return;
  }

  console.log(`📊 Found ${tasks.length} test tasks to delete`);
  console.log('📋 Sample tasks:');
  tasks.slice(0, 5).forEach(task => {
    console.log(`   - ${task.title}`);
  });
  if (tasks.length > 5) {
    console.log(`   ... and ${tasks.length - 5} more`);
  }

  // Step 2: Confirm deletion
  console.log('');
  const confirmed = await promptConfirmation('⚠️  Are you sure you want to delete all test tasks?');

  if (!confirmed) {
    console.log('❌ Cleanup cancelled');
    return;
  }

  // Step 3: Delete subtasks first (to avoid foreign key constraints)
  console.log('\n🗑️  Deleting subtasks...');
  const taskIds = tasks.map(t => t.id);

  const { data: subtasks, error: subtasksCountError } = await supabase
    .from('sub_tasks')
    .select('id')
    .in('parent_task_id', taskIds);

  const subtaskCount = subtasks?.length || 0;

  if (subtaskCount > 0) {
    const { error: deleteSubtasksError } = await supabase
      .from('sub_tasks')
      .delete()
      .in('parent_task_id', taskIds);

    if (deleteSubtasksError) {
      console.error('❌ Failed to delete subtasks:', deleteSubtasksError);
      process.exit(1);
    }
    console.log(`✅ Deleted ${subtaskCount} subtasks`);
  } else {
    console.log('ℹ️  No subtasks to delete');
  }

  // Step 4: Delete parent tasks
  console.log('🗑️  Deleting parent tasks...');
  
  const { error: deleteTasksError } = await supabase
    .from('tasks')
    .delete()
    .like('title', '[TEST]%');

  if (deleteTasksError) {
    console.error('❌ Failed to delete tasks:', deleteTasksError);
    process.exit(1);
  }

  console.log(`✅ Deleted ${tasks.length} parent tasks`);

  // Summary
  console.log('\n✅ Cleanup complete!');
  console.log(`📊 Total deleted: ${tasks.length + subtaskCount} task entities`);
  console.log(`   - ${tasks.length} parent tasks`);
  console.log(`   - ${subtaskCount} subtasks\n`);
}

main().catch(console.error);


