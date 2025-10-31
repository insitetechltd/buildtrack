#!/usr/bin/env tsx

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('❌ Missing Supabase configuration!');
  console.error('Please set EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or EXPO_PUBLIC_SUPABASE_ANON_KEY) in your .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function migrateAcceptedNullToFalse() {
  console.log('🔄 Migrating tasks with accepted: null to accepted: false...\n');

  try {
    // Find all tasks where accepted is null
    const { data: tasksWithNull, error: fetchError } = await supabase
      .from('tasks')
      .select('id, title, accepted, decline_reason, current_status')
      .is('accepted', null);

    if (fetchError) {
      console.error('❌ Error fetching tasks:', fetchError.message);
      return;
    }

    if (!tasksWithNull || tasksWithNull.length === 0) {
      console.log('✅ No tasks with accepted: null found. Migration not needed.');
      return;
    }

    console.log(`📊 Found ${tasksWithNull.length} task(s) with accepted: null\n`);

    // Update all tasks with accepted: null to accepted: false
    // Only update if they don't have a declineReason (those are truly declined)
    const { data: updatedTasks, error: updateError } = await supabase
      .from('tasks')
      .update({ accepted: false })
      .is('accepted', null)
      .is('decline_reason', null)  // Only update tasks that haven't been declined
      .neq('current_status', 'rejected')  // Don't update already rejected tasks
      .select('id, title, accepted');

    if (updateError) {
      console.error('❌ Error updating tasks:', updateError.message);
      return;
    }

    console.log(`✅ Successfully updated ${updatedTasks?.length || 0} task(s) from accepted: null to accepted: false\n`);

    // Show summary
    if (updatedTasks && updatedTasks.length > 0) {
      console.log('📋 Updated Tasks:');
      updatedTasks.forEach((task, index) => {
        console.log(`   ${index + 1}. ${task.title || 'Untitled'} (ID: ${task.id})`);
      });
    }

    // Check for any remaining null values
    const { data: remainingNull, error: checkError } = await supabase
      .from('tasks')
      .select('id, title, accepted, decline_reason, current_status')
      .is('accepted', null)
      .limit(10);

    if (checkError) {
      console.error('❌ Error checking remaining tasks:', checkError.message);
      return;
    }

    if (remainingNull && remainingNull.length > 0) {
      console.log(`\n⚠️  Warning: ${remainingNull.length} task(s) still have accepted: null:`);
      remainingNull.forEach((task, index) => {
        console.log(`   ${index + 1}. ${task.title || 'Untitled'} (ID: ${task.id})`);
        console.log(`      Decline Reason: ${task.decline_reason || 'none'}`);
        console.log(`      Status: ${task.current_status}`);
      });
      console.log('\n   These tasks were not updated because they have decline_reason or are rejected.');
    } else {
      console.log('\n✅ All applicable tasks have been migrated!');
    }

  } catch (error: any) {
    console.error('❌ Unexpected error:', error.message);
  }
}

if (require.main === module) {
  migrateAcceptedNullToFalse().catch(console.error);
}

export { migrateAcceptedNullToFalse };

