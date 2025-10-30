/**
 * Mock Task Generator for Comprehensive Testing
 * 
 * Generates 100+ tasks covering all test scenarios:
 * - Assignment scenarios (self-assigned, single, multiple)
 * - Attachment scenarios (images, PDFs, mixed)
 * - Workflow states (not started, in progress, completed, reviewing, approved)
 * - Subtasks (with nesting)
 * - Role-specific distributions
 * 
 * Usage: npm run test:mock-generate
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types
type Priority = "low" | "medium" | "high" | "critical";
type TaskCategory = "safety" | "electrical" | "plumbing" | "structural" | "general" | "materials";
type TaskStatus = "not_started" | "in_progress" | "rejected" | "completed";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  company_id: string;
}

interface Project {
  id: string;
  name: string;
  company_id: string;
}

// Mock attachments (using placeholder URLs)
const MOCK_IMAGES = [
  'https://picsum.photos/800/600?random=1',
  'https://picsum.photos/800/600?random=2',
  'https://picsum.photos/800/600?random=3',
];

const MOCK_PDFS = [
  'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
  'https://www.africau.edu/images/default/sample.pdf',
];

// Helper functions
function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomElements<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomDate(daysOffset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString();
}

function getPriority(index: number): Priority {
  // 10% critical, 20% high, 40% medium, 30% low
  const rand = index % 10;
  if (rand === 0) return 'critical';
  if (rand <= 2) return 'high';
  if (rand <= 6) return 'medium';
  return 'low';
}

function getCategory(index: number): TaskCategory {
  const categories: TaskCategory[] = ['safety', 'electrical', 'plumbing', 'structural', 'general', 'materials'];
  return categories[index % categories.length];
}

function getDueDate(index: number): string {
  // 10% overdue, 10% today, 30% next 7 days, 50% next 30 days
  const rand = index % 10;
  if (rand === 0) return getRandomDate(-randomInt(1, 30)); // Overdue
  if (rand === 1) return getRandomDate(0); // Today
  if (rand <= 4) return getRandomDate(randomInt(1, 7)); // Next 7 days
  return getRandomDate(randomInt(8, 30)); // Next 30 days
}

async function main() {
  console.log('🚀 Starting comprehensive mock task generation...\n');

  // Step 1: Fetch users and projects
  console.log('📋 Fetching users and projects...');
  
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('*')
    .order('role', { ascending: false }); // Admin first

  if (usersError || !users || users.length === 0) {
    console.error('❌ Failed to fetch users:', usersError);
    process.exit(1);
  }

  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('*')
    .eq('name', 'Project A')
    .limit(1);

  if (projectsError || !projects || projects.length === 0) {
    console.error('❌ Failed to fetch Project A:', projectsError);
    process.exit(1);
  }

  const project = projects[0];
  const adminUsers = users.filter(u => u.role === 'admin');
  const managerUsers = users.filter(u => u.role === 'manager');
  const workerUsers = users.filter(u => u.role === 'worker');
  const allUsers = users;

  console.log(`✅ Found ${users.length} users (${adminUsers.length} admins, ${managerUsers.length} managers, ${workerUsers.length} workers)`);
  console.log(`✅ Found project: ${project.name}\n`);

  if (allUsers.length < 3) {
    console.error('❌ Need at least 3 users for comprehensive testing');
    process.exit(1);
  }

  // Step 2: Generate tasks
  console.log('📝 Generating 100+ mock tasks...\n');

  let taskCount = 0;
  let subtaskCount = 0;
  const createdTasks: string[] = [];

  // Helper to create task
  async function createTask(config: {
    title: string;
    description: string;
    assignedBy: string;
    assignedTo: string[];
    priority: Priority;
    category: TaskCategory;
    dueDate: string;
    attachments?: string[];
    completionPercentage?: number;
    currentStatus?: TaskStatus;
    accepted?: boolean;
    readyForReview?: boolean;
    reviewAccepted?: boolean;
    reviewedBy?: string;
    reviewedAt?: string;
  }) {
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        project_id: project.id,
        title: config.title,
        description: config.description,
        assigned_by: config.assignedBy,
        assigned_to: config.assignedTo,
        priority: config.priority,
        category: config.category,
        due_date: config.dueDate,
        attachments: config.attachments || [],
        completion_percentage: config.completionPercentage || 0,
        current_status: config.currentStatus || 'not_started',
        accepted: config.accepted !== undefined ? config.accepted : null,
        ready_for_review: config.readyForReview || false,
        review_accepted: config.reviewAccepted || false,
        reviewed_by: config.reviewedBy || null,
        reviewed_at: config.reviewedAt || null,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Failed to create task:', error);
      return null;
    }

    taskCount++;
    createdTasks.push(data.id);
    return data;
  }

  // Helper to create subtask
  async function createSubTask(parentTaskId: string, config: {
    title: string;
    description: string;
    assignedBy: string;
    assignedTo: string[];
    priority: Priority;
    category: TaskCategory;
    dueDate: string;
    attachments?: string[];
    completionPercentage?: number;
    currentStatus?: TaskStatus;
    accepted?: boolean;
  }) {
    const { data, error } = await supabase
      .from('sub_tasks')
      .insert({
        parent_task_id: parentTaskId,
        project_id: project.id,
        title: config.title,
        description: config.description,
        assigned_by: config.assignedBy,
        assigned_to: config.assignedTo,
        priority: config.priority,
        category: config.category,
        due_date: config.dueDate,
        attachments: config.attachments || [],
        completion_percentage: config.completionPercentage || 0,
        current_status: config.currentStatus || 'not_started',
        accepted: config.accepted !== undefined ? config.accepted : null,
      })
      .select()
      .single();

    if (error) {
      console.error('❌ Failed to create subtask:', error);
      return null;
    }

    subtaskCount++;
    return data;
  }

  // === CATEGORY 1: Self-Assigned Tasks (10 tasks) ===
  console.log('📦 Creating 10 self-assigned tasks...');
  for (let i = 0; i < 10; i++) {
    const user = randomElement([...adminUsers, ...managerUsers, ...workerUsers]);
    await createTask({
      title: `[TEST] Self-Assigned Task ${i + 1}`,
      description: `Self-assigned task for testing. User creates and assigns to themselves.`,
      assignedBy: user.id,
      assignedTo: [user.id],
      priority: getPriority(i),
      category: getCategory(i),
      dueDate: getDueDate(i),
      accepted: true, // Self-assigned auto-accepts
    });
  }

  // === CATEGORY 2: Single-Assignee Tasks (10 tasks) ===
  console.log('📦 Creating 10 single-assignee tasks...');
  for (let i = 0; i < 10; i++) {
    const creator = randomElement([...adminUsers, ...managerUsers]);
    const assignee = randomElement(allUsers.filter(u => u.id !== creator.id));
    await createTask({
      title: `[TEST] Single Assignee Task ${i + 1}`,
      description: `Task assigned to one person for testing.`,
      assignedBy: creator.id,
      assignedTo: [assignee.id],
      priority: getPriority(i),
      category: getCategory(i),
      dueDate: getDueDate(i),
      accepted: i % 2 === 0, // Half accepted
    });
  }

  // === CATEGORY 3: Multi-Assignee Tasks (10 tasks) ===
  console.log('📦 Creating 10 multi-assignee tasks...');
  for (let i = 0; i < 10; i++) {
    const creator = randomElement([...adminUsers, ...managerUsers]);
    const assignees = randomElements(
      allUsers.filter(u => u.id !== creator.id),
      randomInt(2, 4)
    );
    await createTask({
      title: `[TEST] Multi-Assignee Task ${i + 1}`,
      description: `Task assigned to multiple people for testing.`,
      assignedBy: creator.id,
      assignedTo: assignees.map(u => u.id),
      priority: getPriority(i),
      category: getCategory(i),
      dueDate: getDueDate(i),
    });
  }

  // === CATEGORY 4: Tasks with Image Attachments (10 tasks) ===
  console.log('📦 Creating 10 tasks with image attachments...');
  for (let i = 0; i < 10; i++) {
    const creator = randomElement([...adminUsers, ...managerUsers]);
    const assignee = randomElement(allUsers.filter(u => u.id !== creator.id));
    await createTask({
      title: `[TEST] Task with Images ${i + 1}`,
      description: `Task with image attachments for testing.`,
      assignedBy: creator.id,
      assignedTo: [assignee.id],
      priority: getPriority(i),
      category: getCategory(i),
      dueDate: getDueDate(i),
      attachments: randomElements(MOCK_IMAGES, randomInt(1, 3)),
      accepted: true,
    });
  }

  // === CATEGORY 5: Tasks with PDF Attachments (10 tasks) ===
  console.log('📦 Creating 10 tasks with PDF attachments...');
  for (let i = 0; i < 10; i++) {
    const creator = randomElement([...adminUsers, ...managerUsers]);
    const assignee = randomElement(allUsers.filter(u => u.id !== creator.id));
    await createTask({
      title: `[TEST] Task with PDFs ${i + 1}`,
      description: `Task with PDF attachments for testing.`,
      assignedBy: creator.id,
      assignedTo: [assignee.id],
      priority: getPriority(i),
      category: getCategory(i),
      dueDate: getDueDate(i),
      attachments: MOCK_PDFS,
      accepted: true,
    });
  }

  // === CATEGORY 6: Tasks with Mixed Attachments (10 tasks) ===
  console.log('📦 Creating 10 tasks with mixed attachments...');
  for (let i = 0; i < 10; i++) {
    const creator = randomElement([...adminUsers, ...managerUsers]);
    const assignee = randomElement(allUsers.filter(u => u.id !== creator.id));
    await createTask({
      title: `[TEST] Task with Mixed Attachments ${i + 1}`,
      description: `Task with both images and PDFs for testing.`,
      assignedBy: creator.id,
      assignedTo: [assignee.id],
      priority: getPriority(i),
      category: getCategory(i),
      dueDate: getDueDate(i),
      attachments: [...randomElements(MOCK_IMAGES, 1), ...MOCK_PDFS.slice(0, 1)],
      accepted: true,
    });
  }

  // === CATEGORY 7: Not Started Tasks (10 tasks) ===
  console.log('📦 Creating 10 not started tasks (0% complete)...');
  for (let i = 0; i < 10; i++) {
    const creator = randomElement([...adminUsers, ...managerUsers]);
    const assignee = randomElement(allUsers.filter(u => u.id !== creator.id));
    await createTask({
      title: `[TEST] Not Started Task ${i + 1}`,
      description: `Task at 0% completion for testing.`,
      assignedBy: creator.id,
      assignedTo: [assignee.id],
      priority: getPriority(i),
      category: getCategory(i),
      dueDate: getDueDate(i),
      completionPercentage: 0,
      currentStatus: 'not_started',
      accepted: true,
    });
  }

  // === CATEGORY 8: In Progress Tasks (10 tasks) ===
  console.log('📦 Creating 10 in progress tasks (25-75% complete)...');
  for (let i = 0; i < 10; i++) {
    const creator = randomElement([...adminUsers, ...managerUsers]);
    const assignee = randomElement(allUsers.filter(u => u.id !== creator.id));
    const completion = randomInt(1, 3) * 25; // 25%, 50%, or 75%
    await createTask({
      title: `[TEST] In Progress Task ${i + 1}`,
      description: `Task at ${completion}% completion for testing.`,
      assignedBy: creator.id,
      assignedTo: [assignee.id],
      priority: getPriority(i),
      category: getCategory(i),
      dueDate: getDueDate(i),
      completionPercentage: completion,
      currentStatus: 'in_progress',
      accepted: true,
    });
  }

  // === CATEGORY 9: Completed but Not Submitted (10 tasks) ===
  console.log('📦 Creating 10 completed tasks (100% but not submitted for review)...');
  for (let i = 0; i < 10; i++) {
    const creator = randomElement([...adminUsers, ...managerUsers]);
    const assignee = randomElement(allUsers.filter(u => u.id !== creator.id));
    await createTask({
      title: `[TEST] Completed Not Submitted ${i + 1}`,
      description: `Task at 100% but not yet submitted for review.`,
      assignedBy: creator.id,
      assignedTo: [assignee.id],
      priority: getPriority(i),
      category: getCategory(i),
      dueDate: getDueDate(i),
      completionPercentage: 100,
      currentStatus: 'completed',
      accepted: true,
      readyForReview: false,
      reviewAccepted: false,
    });
  }

  // === CATEGORY 10: Ready for Review (10 tasks) ===
  console.log('📦 Creating 10 tasks ready for review...');
  for (let i = 0; i < 10; i++) {
    const creator = randomElement([...adminUsers, ...managerUsers]);
    const assignee = randomElement(allUsers.filter(u => u.id !== creator.id));
    await createTask({
      title: `[TEST] Ready for Review ${i + 1}`,
      description: `Task submitted for review by task creator.`,
      assignedBy: creator.id,
      assignedTo: [assignee.id],
      priority: getPriority(i),
      category: getCategory(i),
      dueDate: getDueDate(i),
      completionPercentage: 100,
      currentStatus: 'completed',
      accepted: true,
      readyForReview: true,
      reviewAccepted: false,
    });
  }

  // === CATEGORY 11: Approved Tasks (10 tasks) ===
  console.log('📦 Creating 10 approved tasks (review accepted)...');
  for (let i = 0; i < 10; i++) {
    const creator = randomElement([...adminUsers, ...managerUsers]);
    const assignee = randomElement(allUsers.filter(u => u.id !== creator.id));
    await createTask({
      title: `[TEST] Approved Task ${i + 1}`,
      description: `Task completed and approved by task creator.`,
      assignedBy: creator.id,
      assignedTo: [assignee.id],
      priority: getPriority(i),
      category: getCategory(i),
      dueDate: getDueDate(i),
      completionPercentage: 100,
      currentStatus: 'completed',
      accepted: true,
      readyForReview: true,
      reviewAccepted: true,
      reviewedBy: creator.id,
      reviewedAt: new Date().toISOString(),
    });
  }

  // === CATEGORY 12: Tasks with Subtasks (20 parent tasks with subtasks) ===
  console.log('📦 Creating 20 parent tasks with subtasks...');
  
  // 5 parents with 2 subtasks each
  for (let i = 0; i < 5; i++) {
    const creator = randomElement([...adminUsers, ...managerUsers]);
    const assignee = randomElement(allUsers.filter(u => u.id !== creator.id));
    const parentTask = await createTask({
      title: `[TEST] Parent Task with 2 Subtasks ${i + 1}`,
      description: `Parent task with 2 subtasks for testing.`,
      assignedBy: creator.id,
      assignedTo: [assignee.id],
      priority: getPriority(i),
      category: getCategory(i),
      dueDate: getDueDate(i),
      accepted: true,
    });

    if (parentTask) {
      for (let j = 0; j < 2; j++) {
        await createSubTask(parentTask.id, {
          title: `[TEST] Subtask ${j + 1} (with photos)`,
          description: `Subtask with image attachments.`,
          assignedBy: creator.id,
          assignedTo: [assignee.id],
          priority: getPriority(j),
          category: getCategory(j),
          dueDate: getDueDate(j),
          attachments: randomElements(MOCK_IMAGES, 2),
          accepted: true,
        });
      }
    }
  }

  // 5 parents with 3 subtasks each
  for (let i = 0; i < 5; i++) {
    const creator = randomElement([...adminUsers, ...managerUsers]);
    const assignee = randomElement(allUsers.filter(u => u.id !== creator.id));
    const parentTask = await createTask({
      title: `[TEST] Parent Task with 3 Subtasks ${i + 1}`,
      description: `Parent task with 3 subtasks for testing.`,
      assignedBy: creator.id,
      assignedTo: [assignee.id],
      priority: getPriority(i),
      category: getCategory(i),
      dueDate: getDueDate(i),
      accepted: true,
    });

    if (parentTask) {
      for (let j = 0; j < 3; j++) {
        await createSubTask(parentTask.id, {
          title: `[TEST] Subtask ${j + 1} (with PDFs)`,
          description: `Subtask with PDF attachments.`,
          assignedBy: creator.id,
          assignedTo: [assignee.id],
          priority: getPriority(j),
          category: getCategory(j),
          dueDate: getDueDate(j),
          attachments: MOCK_PDFS,
          accepted: true,
        });
      }
    }
  }

  // 5 parents with 4 subtasks each (mixed states)
  for (let i = 0; i < 5; i++) {
    const creator = randomElement([...adminUsers, ...managerUsers]);
    const assignee = randomElement(allUsers.filter(u => u.id !== creator.id));
    const parentTask = await createTask({
      title: `[TEST] Parent Task with 4 Subtasks ${i + 1}`,
      description: `Parent task with 4 subtasks in different states.`,
      assignedBy: creator.id,
      assignedTo: [assignee.id],
      priority: getPriority(i),
      category: getCategory(i),
      dueDate: getDueDate(i),
      accepted: true,
    });

    if (parentTask) {
      const states = [
        { completion: 0, status: 'not_started' as TaskStatus },
        { completion: 50, status: 'in_progress' as TaskStatus },
        { completion: 100, status: 'completed' as TaskStatus },
        { completion: 100, status: 'completed' as TaskStatus },
      ];

      for (let j = 0; j < 4; j++) {
        await createSubTask(parentTask.id, {
          title: `[TEST] Subtask ${j + 1} (${states[j].completion}%)`,
          description: `Subtask at ${states[j].completion}% for testing.`,
          assignedBy: creator.id,
          assignedTo: [assignee.id],
          priority: getPriority(j),
          category: getCategory(j),
          dueDate: getDueDate(j),
          completionPercentage: states[j].completion,
          currentStatus: states[j].status,
          accepted: true,
        });
      }
    }
  }

  // 5 parents with nested subtasks
  for (let i = 0; i < 5; i++) {
    const creator = randomElement([...adminUsers, ...managerUsers]);
    const assignee = randomElement(allUsers.filter(u => u.id !== creator.id));
    const parentTask = await createTask({
      title: `[TEST] Parent Task with Nested Subtasks ${i + 1}`,
      description: `Parent task with nested subtask structure.`,
      assignedBy: creator.id,
      assignedTo: [assignee.id],
      priority: getPriority(i),
      category: getCategory(i),
      dueDate: getDueDate(i),
      accepted: true,
    });

    if (parentTask) {
      // Create 2 first-level subtasks
      for (let j = 0; j < 2; j++) {
        const subtask = await createSubTask(parentTask.id, {
          title: `[TEST] Level 1 Subtask ${j + 1}`,
          description: `First-level subtask.`,
          assignedBy: creator.id,
          assignedTo: [assignee.id],
          priority: getPriority(j),
          category: getCategory(j),
          dueDate: getDueDate(j),
          accepted: true,
        });

        // Note: Nested subtasks require special handling in UI
        // For now, we just create them at the same level
      }
    }
  }

  // Summary
  console.log('\n✅ Mock task generation complete!');
  console.log(`📊 Created ${taskCount} parent tasks`);
  console.log(`📊 Created ${subtaskCount} subtasks`);
  console.log(`📊 Total: ${taskCount + subtaskCount} task entities\n`);
  console.log('🎯 All tasks have "[TEST]" prefix for easy identification');
  console.log('🧹 Run cleanup script to remove: npm run test:mock-cleanup\n');
}

main().catch(console.error);


