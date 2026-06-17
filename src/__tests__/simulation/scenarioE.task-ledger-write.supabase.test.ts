import { act, renderHook } from '@testing-library/react-native';
import { useTaskStore } from '@/state/taskStore.supabase';
import {
  cleanupTestUser,
  createSandboxContext,
  describeSandbox,
  provisionTestUser,
} from './sandboxHelpers';
import { setSupabaseClient } from '@/api/supabase';
import { cleanupIfAllowed } from '@/test-utils/supabaseTestHarness';

describeSandbox('Scenario E (Supabase): Task ledger write verification', () => {
  jest.setTimeout(180_000);

  it('creates a task via the production task store and verifies the tasks row', async () => {
    const ctx = createSandboxContext();
    const user = await provisionTestUser(ctx);

    const now = new Date();
    const projectInsert = await ctx.service
      .from('projects')
      .insert({
        name: `Sim Project ${Date.now()}`,
        description: 'Simulation project',
        status: 'active',
        start_date: now.toISOString(),
        end_date: now.toISOString(),
        budget: 0,
        location: 'Simulation',
        client_info: {},
        created_by: user.id,
        company_id: user.companyId,
      })
      .select('id')
      .single();

    if (projectInsert.error) {
      await cleanupTestUser(ctx, user);
      throw projectInsert.error;
    }

    const projectId = projectInsert.data.id as string;

    const assignment = await ctx.service.from('user_project_assignments').insert({
      user_id: user.id,
      project_id: projectId,
      category: 'worker',
      assigned_by: user.id,
      is_active: true,
    });

    if (assignment.error) {
      await cleanupIfAllowed(async () => {
        await ctx.service.from('projects').delete().eq('id', projectId);
      });
      await cleanupTestUser(ctx, user);
      throw assignment.error;
    }

    setSupabaseClient(ctx.anon);

    try {
      const signIn = await ctx.anon.auth.signInWithPassword({
        email: user.email,
        password: user.password,
      });
      if (signIn.error) {
        throw signIn.error;
      }

      useTaskStore.setState({
        tasks: [],
        taskReadStatuses: [],
        isLoading: false,
        error: null,
        taskFetchTimestamps: {},
        allTasksFetchTimestamp: null,
      });

      const { result } = renderHook(() => useTaskStore());

      const title = `Fix door frame ${Date.now()}`;
      const description = 'Replace hinges and check alignment';

      let createdTaskId = '';
      await act(async () => {
        createdTaskId = await result.current.createTask({
          title,
          description,
          priority: 'high',
          category: 'general',
          projectId,
          assignedTo: [user.id],
          assignedBy: user.id,
          dueDate: now.toISOString(),
          attachments: [],
        });
      });
      expect(createdTaskId).toBeTruthy();

      const row = await ctx.service
        .from('tasks')
        .select(
          'id,project_id,title,description,priority,category,due_date,assigned_to,assigned_by,attachments,current_status',
        )
        .eq('id', createdTaskId)
        .single();

      if (row.error) {
        throw row.error;
      }

      expect(row.data.project_id).toBe(projectId);
      expect(row.data.title).toBe(title);
      expect(row.data.description).toBe(description);
      expect(row.data.priority).toBe('high');
      expect(row.data.category).toBe('general');
      expect(row.data.assigned_by).toBe(user.id);
      expect(row.data.assigned_to).toEqual([user.id]);
      expect(row.data.attachments).toEqual([]);
      expect(row.data.current_status).toBe('in_progress');

      await cleanupIfAllowed(async () => {
        await ctx.service.from('task_activities').delete().eq('task_id', createdTaskId);
        await ctx.service.from('tasks').delete().eq('id', createdTaskId);
      });
    } finally {
      setSupabaseClient(null);
      await cleanupIfAllowed(async () => {
        await ctx.service.from('user_project_assignments').delete().eq('project_id', projectId);
        await ctx.service.from('projects').delete().eq('id', projectId);
      });
      await cleanupTestUser(ctx, user);
    }
  });
});
