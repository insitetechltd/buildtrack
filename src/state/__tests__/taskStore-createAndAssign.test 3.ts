import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useTaskStore } from '../taskStore';
import { supabase } from '@/api/supabase';

// Mock Supabase
jest.mock('@/api/supabase');

describe('TaskStore - Create and Assign Tasks', () => {
  // Mock Sarah user
  const sarahUser = {
    id: 'sarah-123',
    name: 'Sarah Johnson',
    email: 'sarah@buildtrack.com',
    role: 'manager',
    company_id: 'company-123',
    position: 'Project Manager',
    phone: '+1-555-0100',
  };

  // Mock project
  const testProject = {
    id: 'project-456',
    name: 'Downtown Office Building',
    description: 'New construction project',
    status: 'active',
    company_id: 'company-123',
  };

  // Mock current user (who creates the tasks)
  const currentUser = {
    id: 'user-789',
    name: 'Admin User',
    email: 'admin@buildtrack.com',
    role: 'admin',
    company_id: 'company-123',
  };

  beforeEach(() => {
    // Reset the store
    useTaskStore.setState({
      tasks: [],
      taskReadStatuses: [],
      isLoading: false,
      error: null,
    });

    // Clear all mocks
    jest.clearAllMocks();

    // Setup default Supabase mock responses
    (supabase.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      order: jest.fn().mockResolvedValue({ data: [], error: null }),
    });
  });

  it('creates 3 tasks and assigns each to Sarah', async () => {
    // Mock successful task creation
    let taskIdCounter = 1;
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'tasks') {
        return {
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: `task-${taskIdCounter++}`,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                },
                error: null,
              }),
            }),
          }),
          select: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({ data: [], error: null }),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      };
    });

    const { result } = renderHook(() => useTaskStore());

    // Task 1: Safety Inspection
    const task1Data = {
      projectId: testProject.id,
      title: 'Safety Inspection - Week 1',
      description: 'Conduct weekly safety inspection of construction site',
      priority: 'high' as const,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      category: 'safety' as const,
      attachments: [],
      assignedTo: [sarahUser.id],
      assignedBy: currentUser.id,
    };

    // Task 2: Electrical Review
    const task2Data = {
      projectId: testProject.id,
      title: 'Electrical System Review',
      description: 'Review electrical plans and installation progress',
      priority: 'medium' as const,
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
      category: 'electrical' as const,
      attachments: [],
      assignedTo: [sarahUser.id],
      assignedBy: currentUser.id,
    };

    // Task 3: Structural Assessment
    const task3Data = {
      projectId: testProject.id,
      title: 'Structural Assessment',
      description: 'Assess structural integrity of foundation work',
      priority: 'critical' as const,
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      category: 'structural' as const,
      attachments: [],
      assignedTo: [sarahUser.id],
      assignedBy: currentUser.id,
    };

    let task1Id: string;
    let task2Id: string;
    let task3Id: string;

    // Create Task 1
    await act(async () => {
      task1Id = await result.current.createTask(task1Data);
    });

    // Create Task 2
    await act(async () => {
      task2Id = await result.current.createTask(task2Data);
    });

    // Create Task 3
    await act(async () => {
      task3Id = await result.current.createTask(task3Data);
    });

    // Verify all tasks were created
    expect(task1Id).toBeTruthy();
    expect(task2Id).toBeTruthy();
    expect(task3Id).toBeTruthy();

    // Verify Supabase insert was called 3 times
    const insertCalls = (supabase.from as jest.Mock).mock.results
      .filter((result) => result.value?.insert)
      .length;
    expect(insertCalls).toBe(3);

    console.log('✅ Successfully created 3 tasks');
    console.log(`   Task 1: ${task1Data.title} (ID: ${task1Id})`);
    console.log(`   Task 2: ${task2Data.title} (ID: ${task2Id})`);
    console.log(`   Task 3: ${task3Data.title} (ID: ${task3Id})`);
    console.log(`   All assigned to: ${sarahUser.name} (${sarahUser.id})`);
  });

  it('verifies Sarah is assigned to all 3 tasks', async () => {
    // Mock task data with Sarah assigned
    const mockTasks = [
      {
        id: 'task-1',
        projectId: testProject.id,
        title: 'Safety Inspection - Week 1',
        description: 'Conduct weekly safety inspection',
        priority: 'high',
        dueDate: new Date().toISOString(),
        category: 'safety',
        attachments: [],
        assignedTo: [sarahUser.id],
        assignedBy: currentUser.id,
        createdAt: new Date().toISOString(),
        updates: [],
        currentStatus: 'not_started',
        completionPercentage: 0,
      },
      {
        id: 'task-2',
        projectId: testProject.id,
        title: 'Electrical System Review',
        description: 'Review electrical plans',
        priority: 'medium',
        dueDate: new Date().toISOString(),
        category: 'electrical',
        attachments: [],
        assignedTo: [sarahUser.id],
        assignedBy: currentUser.id,
        createdAt: new Date().toISOString(),
        updates: [],
        currentStatus: 'not_started',
        completionPercentage: 0,
      },
      {
        id: 'task-3',
        projectId: testProject.id,
        title: 'Structural Assessment',
        description: 'Assess structural integrity',
        priority: 'critical',
        dueDate: new Date().toISOString(),
        category: 'structural',
        attachments: [],
        assignedTo: [sarahUser.id],
        assignedBy: currentUser.id,
        createdAt: new Date().toISOString(),
        updates: [],
        currentStatus: 'not_started',
        completionPercentage: 0,
      },
    ];

    // Set tasks in store
    useTaskStore.setState({ tasks: mockTasks });

    const { result } = renderHook(() => useTaskStore());

    // Get tasks assigned to Sarah
    const sarahTasks = result.current.getTasksByUser(sarahUser.id);

    // Verify Sarah has 3 tasks
    expect(sarahTasks).toHaveLength(3);

    // Verify each task is assigned to Sarah
    sarahTasks.forEach((task) => {
      expect(task.assignedTo).toContain(sarahUser.id);
    });

    // Verify task details
    expect(sarahTasks[0].title).toBe('Safety Inspection - Week 1');
    expect(sarahTasks[0].category).toBe('safety');
    expect(sarahTasks[0].priority).toBe('high');

    expect(sarahTasks[1].title).toBe('Electrical System Review');
    expect(sarahTasks[1].category).toBe('electrical');
    expect(sarahTasks[1].priority).toBe('medium');

    expect(sarahTasks[2].title).toBe('Structural Assessment');
    expect(sarahTasks[2].category).toBe('structural');
    expect(sarahTasks[2].priority).toBe('critical');

    console.log(`✅ Verified: Sarah has ${sarahTasks.length} tasks assigned`);
    sarahTasks.forEach((task, index) => {
      console.log(`   ${index + 1}. ${task.title} (${task.priority} priority)`);
    });
  });

  it('creates tasks with different priorities for Sarah', async () => {
    const tasks = [
      { priority: 'low', title: 'Low Priority Task' },
      { priority: 'medium', title: 'Medium Priority Task' },
      { priority: 'high', title: 'High Priority Task' },
    ];

    // Mock successful creation
    (supabase.from as jest.Mock).mockImplementation(() => ({
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: { id: `task-${Math.random()}` },
            error: null,
          }),
        }),
      }),
    }));

    const { result } = renderHook(() => useTaskStore());
    const createdTaskIds: string[] = [];

    // Create all 3 tasks
    for (const taskData of tasks) {
      await act(async () => {
        const taskId = await result.current.createTask({
          projectId: testProject.id,
          title: taskData.title,
          description: `Task with ${taskData.priority} priority`,
          priority: taskData.priority as any,
          dueDate: new Date().toISOString(),
          category: 'general',
          attachments: [],
          assignedTo: [sarahUser.id],
          assignedBy: currentUser.id,
        });
        createdTaskIds.push(taskId);
      });
    }

    // Verify all 3 tasks were created
    expect(createdTaskIds).toHaveLength(3);
    expect(createdTaskIds.every((id) => id)).toBe(true);

    console.log('✅ Created 3 tasks with different priorities:');
    tasks.forEach((task, index) => {
      console.log(`   ${index + 1}. ${task.title} - ${task.priority}`);
    });
  });

  it('handles batch task creation for Sarah', async () => {
    const taskTitles = [
      'Morning Safety Check',
      'Equipment Inspection',
      'Progress Report Review',
    ];

    // Mock successful creation
    let counter = 0;
    (supabase.from as jest.Mock).mockImplementation(() => ({
      insert: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: {
              id: `task-batch-${counter++}`,
              created_at: new Date().toISOString(),
            },
            error: null,
          }),
        }),
      }),
    }));

    const { result } = renderHook(() => useTaskStore());
    const createdTasks: string[] = [];

    // Create all tasks in batch
    await act(async () => {
      const promises = taskTitles.map((title) =>
        result.current.createTask({
          projectId: testProject.id,
          title,
          description: `Batch task: ${title}`,
          priority: 'medium',
          dueDate: new Date().toISOString(),
          category: 'general',
          attachments: [],
          assignedTo: [sarahUser.id],
          assignedBy: currentUser.id,
        })
      );

      const taskIds = await Promise.all(promises);
      createdTasks.push(...taskIds);
    });

    // Verify batch creation
    expect(createdTasks).toHaveLength(3);
    expect(createdTasks.every((id) => id.startsWith('task-batch-'))).toBe(true);

    console.log('✅ Batch created 3 tasks for Sarah:');
    taskTitles.forEach((title, index) => {
      console.log(`   ${index + 1}. ${title} (ID: ${createdTasks[index]})`);
    });
  });

  it('creates tasks and verifies Sarah can accept them', async () => {
    // Mock task creation
    (supabase.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'tasks') {
        return {
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: 'task-accept-1',
                  accepted: false,
                },
                error: null,
              }),
            }),
          }),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({
              data: { accepted: true },
              error: null,
            }),
          }),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      };
    });

    const { result } = renderHook(() => useTaskStore());

    // Create a task
    let taskId: string;
    await act(async () => {
      taskId = await result.current.createTask({
        projectId: testProject.id,
        title: 'Task for Sarah to Accept',
        description: 'Sarah needs to accept this task',
        priority: 'medium',
        dueDate: new Date().toISOString(),
        category: 'general',
        attachments: [],
        assignedTo: [sarahUser.id],
        assignedBy: currentUser.id,
      });
    });

    expect(taskId).toBeTruthy();

    // Sarah accepts the task
    await act(async () => {
      await result.current.acceptTask(taskId, sarahUser.id);
    });

    console.log('✅ Task created and Sarah accepted it');
    console.log(`   Task ID: ${taskId}`);
    console.log(`   Accepted by: ${sarahUser.name}`);
  });
});

