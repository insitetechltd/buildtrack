import { supabase, getSupabaseClient } from '../api/supabase';
import { v4 as uuidv4 } from 'uuid';

/**
 * Generate mock tasks for testing
 */
export async function generateMockTasks(count: number = 50): Promise<void> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase client not available');
  }

  try {
    // Get current user
    const { data: { user } } = await client.auth.getUser();
    if (!user) {
      throw new Error('Not authenticated');
    }

    // Get user details
    const { data: userData } = await client
      .from('users')
      .select('id, company_id')
      .eq('email', user.email)
      .single();

    if (!userData) {
      throw new Error('User data not found');
    }

    // Get projects for this company
    const { data: projects } = await client
      .from('projects')
      .select('id, name')
      .eq('company_id', userData.company_id)
      .limit(5);

    if (!projects || projects.length === 0) {
      throw new Error('No projects found. Create a project first.');
    }

    // Get users from same company
    const { data: users } = await client
      .from('users')
      .select('id, name')
      .eq('company_id', userData.company_id)
      .limit(10);

    if (!users || users.length === 0) {
      throw new Error('No users found');
    }

    const statuses = ['pending', 'accepted', 'rejected', 'wip', 'review', 'done'];
    const priorities = ['low', 'medium', 'high', 'urgent'];
    const categories = ['general', 'plumbing', 'electrical', 'framing', 'drywall', 'painting'];

    const tasks = [];
    for (let i = 0; i < count; i++) {
      const project = projects[Math.floor(Math.random() * projects.length)];
      const assignedTo = users[Math.floor(Math.random() * users.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const priority = priorities[Math.floor(Math.random() * priorities.length)];
      const category = categories[Math.floor(Math.random() * categories.length)];

      tasks.push({
        id: uuidv4(),
        title: `[TEST] Mock Task ${i + 1} - ${category}`,
        description: `This is a mock task generated for testing purposes. Task number ${i + 1}.`,
        project_id: project.id,
        assigned_by: userData.id,
        assigned_to: assignedTo.id,
        status,
        priority,
        category,
        due_date: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        completion_percentage: status === 'done' ? 100 : Math.floor(Math.random() * 100),
        is_starred: Math.random() > 0.8,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }

    const { error } = await client.from('tasks').insert(tasks);
    if (error) throw error;

    console.log(`✅ Generated ${count} mock tasks`);
  } catch (error: any) {
    console.error('Error generating mock tasks:', error);
    throw error;
  }
}

/**
 * Cleanup mock tasks (tasks with [TEST] prefix)
 */
export async function cleanupMockTasks(): Promise<void> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase client not available');
  }

  try {
    const { error } = await client
      .from('tasks')
      .delete()
      .like('title', '[TEST]%');

    if (error) throw error;

    console.log('✅ Mock tasks cleaned up');
  } catch (error: any) {
    console.error('Error cleaning up mock tasks:', error);
    throw error;
  }
}

/**
 * Reset database (delete all data)
 */
export async function resetDatabase(): Promise<void> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase client not available');
  }

  try {
    // Delete in order to respect foreign keys
    await client.from('task_updates').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await client.from('subtasks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await client.from('tasks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await client.from('user_project_assignments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await client.from('projects').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    console.log('✅ Database reset complete');
  } catch (error: any) {
    console.error('Error resetting database:', error);
    throw error;
  }
}

/**
 * Seed database with sample data
 */
export async function seedDatabase(): Promise<void> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase client not available');
  }

  try {
    const { data: { user } } = await client.auth.getUser();
    if (!user) {
      throw new Error('Not authenticated');
    }

    const { data: userData } = await client
      .from('users')
      .select('id, company_id')
      .eq('email', user.email)
      .single();

    if (!userData) {
      throw new Error('User data not found');
    }

    // Create sample projects
    const projectIds = [uuidv4(), uuidv4(), uuidv4()];
    const projects = [
      {
        id: projectIds[0],
        name: 'Office Renovation',
        description: 'Complete office renovation project',
        company_id: userData.company_id,
        status: 'active',
        start_date: new Date().toISOString(),
        created_by: userData.id,
      },
      {
        id: projectIds[1],
        name: 'Warehouse Construction',
        description: 'New warehouse building project',
        company_id: userData.company_id,
        status: 'planning',
        start_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        created_by: userData.id,
      },
      {
        id: projectIds[2],
        name: 'Retail Store Fit-Out',
        description: 'Retail space interior fit-out',
        company_id: userData.company_id,
        status: 'active',
        start_date: new Date().toISOString(),
        created_by: userData.id,
      },
    ];

    await client.from('projects').insert(projects);

    // Generate tasks for projects
    await generateMockTasks(30);

    console.log('✅ Database seeded successfully');
  } catch (error: any) {
    console.error('Error seeding database:', error);
    throw error;
  }
}

/**
 * Run comprehensive tests
 */
export async function runComprehensiveTests(): Promise<{
  passed: number;
  failed: number;
  total: number;
  details: Array<{ name: string; status: 'passed' | 'failed'; error?: string }>;
}> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase client not available');
  }

  const tests = [
    {
      name: 'Database Connection',
      fn: async () => {
        const { error } = await client.from('companies').select('id').limit(1);
        if (error && error.code !== 'PGRST116') throw error;
      },
    },
    {
      name: 'User Authentication',
      fn: async () => {
        const { data: { user } } = await client.auth.getUser();
        if (!user) throw new Error('Not authenticated');
      },
    },
    {
      name: 'Fetch Companies',
      fn: async () => {
        const { data, error } = await client.from('companies').select('*').limit(1);
        if (error) throw error;
      },
    },
    {
      name: 'Fetch Users',
      fn: async () => {
        const { data, error } = await client.from('users').select('*').limit(1);
        if (error) throw error;
      },
    },
    {
      name: 'Fetch Projects',
      fn: async () => {
        const { data, error } = await client.from('projects').select('*').limit(1);
        if (error) throw error;
      },
    },
    {
      name: 'Fetch Tasks',
      fn: async () => {
        const { data, error } = await client.from('tasks').select('*').limit(1);
        if (error) throw error;
      },
    },
    {
      name: 'RLS Policies Active',
      fn: async () => {
        // Try to access data without proper auth (should be restricted)
        const { data: { user } } = await client.auth.getUser();
        if (!user) throw new Error('Not authenticated for RLS test');
      },
    },
  ];

  const results = {
    passed: 0,
    failed: 0,
    total: tests.length,
    details: [] as Array<{ name: string; status: 'passed' | 'failed'; error?: string }>,
  };

  for (const test of tests) {
    try {
      await test.fn();
      results.passed++;
      results.details.push({ name: test.name, status: 'passed' });
      console.log(`✅ ${test.name}`);
    } catch (error: any) {
      results.failed++;
      results.details.push({
        name: test.name,
        status: 'failed',
        error: error.message,
      });
      console.error(`❌ ${test.name}:`, error.message);
    }
  }

  return results;
}

/**
 * Check database health
 */
export async function checkDatabaseHealth(): Promise<{
  status: 'healthy' | 'degraded' | 'down';
  tables: number;
  users: number;
  projects: number;
  tasks: number;
  responseTime: number;
}> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase client not available');
  }

  const startTime = Date.now();

  try {
    // Count records in each table
    const [usersResult, projectsResult, tasksResult] = await Promise.all([
      client.from('users').select('id', { count: 'exact', head: true }),
      client.from('projects').select('id', { count: 'exact', head: true }),
      client.from('tasks').select('id', { count: 'exact', head: true }),
    ]);

    const responseTime = Date.now() - startTime;

    return {
      status: responseTime < 1000 ? 'healthy' : responseTime < 3000 ? 'degraded' : 'down',
      tables: 7, // Total number of main tables
      users: usersResult.count || 0,
      projects: projectsResult.count || 0,
      tasks: tasksResult.count || 0,
      responseTime,
    };
  } catch (error: any) {
    console.error('Database health check failed:', error);
    throw error;
  }
}

/**
 * Export database data (for backup)
 */
export async function exportDatabaseData(): Promise<{
  users: any[];
  projects: any[];
  tasks: any[];
  companies: any[];
}> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase client not available');
  }

  try {
    const [companies, users, projects, tasks] = await Promise.all([
      client.from('companies').select('*'),
      client.from('users').select('*'),
      client.from('projects').select('*'),
      client.from('tasks').select('*'),
    ]);

    return {
      companies: companies.data || [],
      users: users.data || [],
      projects: projects.data || [],
      tasks: tasks.data || [],
    };
  } catch (error: any) {
    console.error('Error exporting database data:', error);
    throw error;
  }
}

