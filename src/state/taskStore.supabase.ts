import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../api/supabase";
import { Task, SubTask, TaskUpdate, TaskStatus, Priority, TaskReadStatus } from "../types/buildtrack";

interface TaskStore {
  tasks: Task[];
  taskReadStatuses: TaskReadStatus[];
  isLoading: boolean;
  error: string | null;
  
  // Fetching
  fetchTasks: () => Promise<void>;
  fetchTasksByProject: (projectId: string) => Promise<void>;
  fetchTasksByUser: (userId: string) => Promise<void>;
  fetchTaskById: (id: string) => Promise<Task | null>;
  
  // Task management
  createTask: (task: Omit<Task, "id" | "createdAt" | "updates" | "currentStatus" | "completionPercentage">) => Promise<string>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  
  // Task assignment
  assignTask: (taskId: string, userIds: string[]) => Promise<void>;
  acceptTask: (taskId: string, userId: string) => Promise<void>;
  declineTask: (taskId: string, userId: string, reason: string) => Promise<void>;
  
  // Today's Tasks (starring)
  toggleTaskStar: (taskId: string, userId: string) => Promise<void>;
  getStarredTasks: (userId: string) => Task[];
  
  // Review workflow
  submitTaskForReview: (taskId: string) => Promise<void>;
  acceptTaskCompletion: (taskId: string, userId: string) => Promise<void>;
  rejectTaskCompletion: (taskId: string, userId: string, reason: string) => Promise<void>;
  submitSubTaskForReview: (taskId: string, subTaskId: string) => Promise<void>;
  acceptSubTaskCompletion: (taskId: string, subTaskId: string, userId: string) => Promise<void>;
  rejectSubTaskCompletion: (taskId: string, subTaskId: string, userId: string, reason: string) => Promise<void>;
  
  // Progress tracking
  addTaskUpdate: (taskId: string, update: Omit<TaskUpdate, "id" | "timestamp">) => Promise<void>;
  addSubTaskUpdate: (taskId: string, subTaskId: string, update: Omit<TaskUpdate, "id" | "timestamp">) => Promise<void>;
  updateTaskStatus: (taskId: string, status: TaskStatus, completionPercentage: number) => Promise<void>;
  
  // Subtask management
  createSubTask: (taskId: string, subTask: Omit<SubTask, "id" | "createdAt" | "parentTaskId" | "currentStatus" | "completionPercentage">) => Promise<string>;
  createNestedSubTask: (taskId: string, parentSubTaskId: string, subTask: Omit<SubTask, "id" | "createdAt" | "parentTaskId" | "currentStatus" | "completionPercentage">) => Promise<string>;
  updateSubTask: (taskId: string, subTaskId: string, updates: Partial<SubTask>) => Promise<void>;
  deleteSubTask: (taskId: string, subTaskId: string) => Promise<void>;
  updateSubTaskStatus: (taskId: string, subTaskId: string, status: TaskStatus, completionPercentage: number) => Promise<void>;
  acceptSubTask: (taskId: string, subTaskId: string, userId: string) => Promise<void>;
  declineSubTask: (taskId: string, subTaskId: string, userId: string, reason: string) => Promise<void>;
  
  // Task read status management
  markTaskAsRead: (userId: string, taskId: string) => Promise<void>;
  getUnreadTaskCount: (userId: string) => number;
  
  // Filtering and querying
  getTasksByUser: (userId: string, projectId?: string) => Task[];
  getTasksAssignedBy: (userId: string, projectId?: string) => Task[];
  getOverdueTasks: (projectId?: string) => Task[];
  getTasksByStatus: (status: TaskStatus, projectId?: string) => Task[];
  getTasksByPriority: (priority: Priority, projectId?: string) => Task[];
  getTasksByProject: (projectId: string) => Task[];
  
  // ✅ NEW: Unified tasks helpers
  getTopLevelTasks: (projectId?: string) => Task[];
  getChildTasks: (parentTaskId: string) => Task[];
  buildTaskTree: (tasks: Task[]) => Task[];
  getTaskDescendants: (taskId: string) => Task[];
  getTaskAncestors: (taskId: string) => Task[];
  countTaskDescendants: (taskId: string) => number;
}

export const useTaskStore = create<TaskStore>()(
  persist(
    (set, get) => ({
      tasks: [],
      taskReadStatuses: [],
      isLoading: false,
      error: null,

      // FETCH from Supabase
      fetchTasks: async () => {
        if (!supabase) {
          console.error('Supabase not configured, no data available');
          set({ tasks: [], isLoading: false, error: 'Supabase not configured' });
          return;
        }

        set({ isLoading: true, error: null });
        try {
          // Fetch all tasks (unified table includes top-level + nested)
          const { data: allTasksData, error: tasksError } = await supabase
            .from('tasks')
            .select('*')
            .order('created_at', { ascending: false });

          if (tasksError) throw tasksError;

          // Fetch all task updates
          const { data: taskUpdatesData, error: taskUpdatesError } = await supabase
            .from('task_updates')
            .select('*')
            .order('timestamp', { ascending: true });

          if (taskUpdatesError) throw taskUpdatesError;

          // Group task updates by task_id
          const updatesByTaskId: { [key: string]: any[] } = {};
          (taskUpdatesData || []).forEach((update: any) => {
            const taskId = update.task_id;
            if (!updatesByTaskId[taskId]) {
              updatesByTaskId[taskId] = [];
            }
            updatesByTaskId[taskId].push({
              id: update.id,
              description: update.description,
              photos: update.photos || [],
              completionPercentage: update.completion_percentage,
              status: update.status,
              timestamp: update.timestamp,
              userId: update.user_id,
            });
          });

          // Transform all tasks from unified table
          const transformedTasks = (allTasksData || []).map(task => ({
            id: task.id,
            projectId: task.project_id,
            parentTaskId: task.parent_task_id, // ✅ NEW: for nested tasks
            nestingLevel: task.nesting_level,   // ✅ NEW: depth level
            rootTaskId: task.root_task_id,      // ✅ NEW: root reference
            title: task.title,
            description: task.description,
            priority: task.priority,
            category: task.category,
            dueDate: task.due_date,
            currentStatus: task.current_status,
            completionPercentage: task.completion_percentage,
            assignedTo: task.assigned_to || [],
            assignedBy: task.assigned_by,
            location: task.location,
            attachments: task.attachments || [],
            starredByUsers: task.starred_by_users || [],
            accepted: task.accepted,
            declineReason: task.decline_reason,
            readyForReview: task.ready_for_review || false,
            reviewedBy: task.reviewed_by,
            reviewedAt: task.reviewed_at,
            reviewAccepted: task.review_accepted,
            createdAt: task.created_at,
            updatedAt: task.updated_at,
            updates: updatesByTaskId[task.id] || [],
            // Note: children are built client-side when needed via buildTaskTree()
          }));

          console.log('✅✅✅ Fetched tasks from Supabase:', transformedTasks.length);
          console.log('✅✅✅ Task details:', transformedTasks.map(t => ({ 
            id: t.id, 
            title: t.title, 
            projectId: t.projectId,
            parentTaskId: t.parentTaskId,
            assignedTo: t.assignedTo, 
            assignedBy: t.assignedBy,
            accepted: t.accepted,
            currentStatus: t.currentStatus
          })));
          
          // 🔍 SPECIAL CHECK: Look for the test task
          const testTask = transformedTasks.find(t => t.title?.toLowerCase().includes("testing sub task"));
          if (testTask) {
            console.log('✅✅✅ TEST TASK FOUND IN FETCHED DATA:', {
              title: testTask.title,
              id: testTask.id,
              projectId: testTask.projectId,
              parentTaskId: testTask.parentTaskId,
              assignedTo: testTask.assignedTo,
              assignedToType: typeof testTask.assignedTo,
              assignedToIsArray: Array.isArray(testTask.assignedTo),
              assignedToLength: Array.isArray(testTask.assignedTo) ? testTask.assignedTo.length : 'N/A',
              assignedToContents: Array.isArray(testTask.assignedTo) ? JSON.stringify(testTask.assignedTo) : testTask.assignedTo,
              assignedToValues: Array.isArray(testTask.assignedTo) ? testTask.assignedTo.map((id, idx) => ({ idx, id, type: typeof id, string: String(id) })) : [],
              assignedBy: testTask.assignedBy,
              accepted: testTask.accepted,
              currentStatus: testTask.currentStatus
            });
            
            // Check if Peter's ID is in the array
            const peterId = '66666666-6666-6666-6666-666666666666';
            if (Array.isArray(testTask.assignedTo)) {
              const hasPeterExact = testTask.assignedTo.includes(peterId);
              const hasPeterString = testTask.assignedTo.some(id => String(id) === peterId);
              const hasPeterMatch = testTask.assignedTo.some(id => id === peterId || String(id) === peterId);
              console.log('✅✅✅ Peter ID check in fetched data:', {
                peterId,
                hasPeterExact,
                hasPeterString,
                hasPeterMatch,
                allIds: testTask.assignedTo.map(id => ({ value: id, type: typeof id, string: String(id) }))
              });
            }
          } else {
            console.log('❌❌❌ TEST TASK NOT IN FETCHED DATA');
          }

          set({ 
            tasks: transformedTasks, 
            isLoading: false 
          });
        } catch (error: any) {
          console.error('Error fetching tasks:', error);
          set({ 
            error: error.message, 
            isLoading: false 
          });
        }
      },

      fetchTasksByProject: async (projectId: string) => {
        if (!supabase) {
          console.error('Supabase not configured, no data available');
          set({ tasks: [], isLoading: false, error: 'Supabase not configured' });
          return;
        }

        set({ isLoading: true, error: null });
        try {
          // Fetch all tasks for this project (unified table includes nested tasks)
          const { data: allTasksData, error: tasksError } = await supabase
            .from('tasks')
            .select('*')
            .eq('project_id', projectId)
            .order('created_at', { ascending: false });

          if (tasksError) throw tasksError;

          // Fetch task updates for tasks in this project
          const taskIds = (allTasksData || []).map(t => t.id);
          const { data: taskUpdatesData, error: taskUpdatesError } = taskIds.length > 0
            ? await supabase
                .from('task_updates')
                .select('*')
                .in('task_id', taskIds)
                .order('timestamp', { ascending: true })
            : { data: [], error: null };

          if (taskUpdatesError) throw taskUpdatesError;

          // Group task updates by task_id
          const updatesByTaskId: { [key: string]: any[] } = {};
          (taskUpdatesData || []).forEach((update: any) => {
            const taskId = update.task_id;
            if (!updatesByTaskId[taskId]) {
              updatesByTaskId[taskId] = [];
            }
            updatesByTaskId[taskId].push({
              id: update.id,
              description: update.description,
              photos: update.photos || [],
              completionPercentage: update.completion_percentage,
              status: update.status,
              timestamp: update.timestamp,
              userId: update.user_id,
            });
          });

          // Transform all tasks from unified table
          const transformedTasks = (allTasksData || []).map(task => ({
            id: task.id,
            projectId: task.project_id,
            parentTaskId: task.parent_task_id, // ✅ NEW
            nestingLevel: task.nesting_level,   // ✅ NEW
            rootTaskId: task.root_task_id,      // ✅ NEW
            title: task.title,
            description: task.description,
            priority: task.priority,
            category: task.category,
            dueDate: task.due_date,
            currentStatus: task.current_status,
            completionPercentage: task.completion_percentage,
            assignedTo: task.assigned_to || [],
            assignedBy: task.assigned_by,
            location: task.location,
            attachments: task.attachments || [],
            starredByUsers: task.starred_by_users || [],
            accepted: task.accepted,
            declineReason: task.decline_reason,
            readyForReview: task.ready_for_review || false,
            reviewedBy: task.reviewed_by,
            reviewedAt: task.reviewed_at,
            reviewAccepted: task.review_accepted,
            createdAt: task.created_at,
            updatedAt: task.updated_at,
            updates: updatesByTaskId[task.id] || [],
            // Note: children are built client-side when needed
          }));

          set({ 
            tasks: transformedTasks, 
            isLoading: false 
          });
        } catch (error: any) {
          console.error('Error fetching tasks by project:', error);
          set({ 
            error: error.message, 
            isLoading: false 
          });
        }
      },

      fetchTasksByUser: async (userId: string) => {
        if (!supabase) {
          console.error('Supabase not configured, no data available');
          set({ tasks: [], isLoading: false, error: 'Supabase not configured' });
          return;
        }

        set({ isLoading: true, error: null });
        try {
          const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .contains('assigned_to', [userId])
            .order('created_at', { ascending: false });

          if (error) throw error;

          // Fetch task updates for these tasks
          const taskIds = (data || []).map(t => t.id);
          const { data: taskUpdatesData, error: taskUpdatesError } = await supabase
            .from('task_updates')
            .select('*')
            .in('task_id', taskIds)
            .order('created_at', { ascending: true });

          if (taskUpdatesError) throw taskUpdatesError;

          // Group task updates by task_id
          const updatesByTaskId: { [key: string]: any[] } = {};
          (taskUpdatesData || []).forEach((update: any) => {
            const taskId = update.task_id;
            if (!updatesByTaskId[taskId]) {
              updatesByTaskId[taskId] = [];
            }
            updatesByTaskId[taskId].push({
              id: update.id,
              description: update.description,
              photos: update.photos || [],
              completionPercentage: update.completion_percentage,
              status: update.status,
              timestamp: update.timestamp,
              userId: update.user_id,
            });
          });

          // Fetch nested tasks (subtasks) for these tasks
          const { data: nestedTasksData } = await supabase
            .from('tasks')
            .select('*')
            .in('parent_task_id', taskIds)
            .order('created_at', { ascending: true });

          // Group nested tasks by parent
          const nestedTasksByParent: { [key: string]: any[] } = {};
          (nestedTasksData || []).forEach((nestedTask: any) => {
            const parentId = nestedTask.parent_task_id;
            if (!nestedTasksByParent[parentId]) {
              nestedTasksByParent[parentId] = [];
            }
            nestedTasksByParent[parentId].push(nestedTask);
          });

          // Transform Supabase data to match local interface
          const transformedTasks = (data || []).map(task => ({
            id: task.id,
            projectId: task.project_id,
            parentTaskId: task.parent_task_id,
            nestingLevel: task.nesting_level || 0,
            rootTaskId: task.root_task_id,
            title: task.title,
            description: task.description,
            priority: task.priority,
            category: task.category,
            dueDate: task.due_date,
            currentStatus: task.current_status,
            completionPercentage: task.completion_percentage,
            assignedTo: task.assigned_to,
            assignedBy: task.assigned_by,
            location: task.location,
            attachments: task.attachments || [],
            starredByUsers: task.starred_by_users || [],
            accepted: task.accepted,
            declineReason: task.decline_reason,
            readyForReview: task.ready_for_review || false,
            reviewedBy: task.reviewed_by,
            reviewedAt: task.reviewed_at,
            reviewAccepted: task.review_accepted,
            createdAt: task.created_at,
            updatedAt: task.updated_at,
            updates: updatesByTaskId[task.id] || [],
            subTasks: (nestedTasksByParent[task.id] || []).map((st: any) => ({
              id: st.id,
              parentTaskId: st.parent_task_id,
              parentSubTaskId: st.parent_sub_task_id,
              projectId: st.project_id,
              title: st.title,
              description: st.description,
              priority: st.priority,
              category: st.category,
              dueDate: st.due_date,
              currentStatus: st.current_status,
              completionPercentage: st.completion_percentage,
              assignedTo: st.assigned_to || [],
              assignedBy: st.assigned_by,
              accepted: st.accepted,
              declineReason: st.decline_reason,
              readyForReview: st.ready_for_review || false,
              reviewedBy: st.reviewed_by,
              reviewedAt: st.reviewed_at,
              reviewAccepted: st.review_accepted,
              createdAt: st.created_at,
              updatedAt: st.updated_at,
              updates: updatesByTaskId[task.id] || [],
            })),
          }));

          set({ 
            tasks: transformedTasks, 
            isLoading: false 
          });
        } catch (error: any) {
          console.error('Error fetching tasks by user:', error);
          set({ 
            error: error.message, 
            isLoading: false 
          });
        }
      },

      fetchTaskById: async (id: string) => {
        if (!supabase) {
          return get().tasks.find(task => task.id === id) || null;
        }

        try {
          // Fetch task data
          const { data: taskData, error: taskError } = await supabase
            .from('tasks')
            .select('*')
            .eq('id', id)
            .single();

          if (taskError) throw taskError;

          // Fetch task updates
          const { data: updatesData, error: updatesError } = await supabase
            .from('task_updates')
            .select('*')
            .eq('task_id', id)
            .order('timestamp', { ascending: false });

          if (updatesError) {
            console.error('Error fetching task updates:', updatesError);
            // Continue without updates rather than failing completely
          }

          // Transform updates data
          const transformedUpdates = (updatesData || []).map(update => ({
            id: update.id,
            userId: update.user_id,
            description: update.description,
            photos: update.photos || [],
            completionPercentage: update.completion_percentage,
            status: update.status,
            timestamp: update.timestamp,
          }));

          // Transform Supabase data to match local interface
          const transformedTask = {
            id: taskData.id,
            projectId: taskData.project_id,
            title: taskData.title,
            description: taskData.description,
            priority: taskData.priority,
            category: taskData.category,
            dueDate: taskData.due_date,
            currentStatus: taskData.current_status,
            completionPercentage: taskData.completion_percentage,
            assignedTo: taskData.assigned_to,
            assignedBy: taskData.assigned_by,
            location: taskData.location,
            attachments: taskData.attachments || [],
            accepted: taskData.accepted,
            declineReason: taskData.decline_reason,
            createdAt: taskData.created_at,
            updatedAt: taskData.updated_at,
            updates: transformedUpdates,
            subTasks: [],
          };

          // Update the task in the store
          set(state => ({
            tasks: state.tasks.map(task => 
              task.id === id ? transformedTask : task
            )
          }));

          return transformedTask;
        } catch (error: any) {
          console.error('Error fetching task:', error);
          return null;
        }
      },

      // CREATE task in Supabase
      createTask: async (taskData) => {
        if (!supabase) {
          // Fallback to local creation
          const newTask: Task = {
            ...taskData,
            id: Date.now().toString(),
            createdAt: new Date().toISOString(),
            updates: [], // New task has no updates yet
            currentStatus: "not_started",
            completionPercentage: 0,
            delegationHistory: [],
            originalAssignedBy: taskData.assignedBy,
          };

          set(state => ({
            tasks: [...state.tasks, newTask]
          }));

          return newTask.id;
        }

        set({ isLoading: true, error: null });
        try {
          // Check if creator is assigned to the task
          const isCreatorAssigned = taskData.assignedTo.includes(taskData.assignedBy);
          
          const { data, error } = await supabase
            .from('tasks')
            .insert({
              project_id: taskData.projectId,
              title: taskData.title,
              description: taskData.description,
              priority: taskData.priority,
              category: taskData.category,
              due_date: taskData.dueDate,
              current_status: "not_started",
              completion_percentage: 0,
              assigned_to: taskData.assignedTo,
              assigned_by: taskData.assignedBy,
              attachments: taskData.attachments,
              // Auto-accept if creator is assigned to the task
              accepted: isCreatorAssigned ? true : false,
              accepted_by: isCreatorAssigned ? taskData.assignedBy : null,
              accepted_at: isCreatorAssigned ? new Date().toISOString() : null,
            })
            .select()
            .single();

          if (error) throw error;

          // Transform Supabase data to match local interface
          const transformedTask = {
            id: data.id,
            projectId: data.project_id,
            title: data.title,
            description: data.description,
            priority: data.priority,
            category: data.category,
            dueDate: data.due_date,
            currentStatus: data.current_status,
            completionPercentage: data.completion_percentage,
            assignedTo: data.assigned_to,
            assignedBy: data.assigned_by,
            location: data.location,
            attachments: data.attachments || [],
            accepted: data.accepted,
            declineReason: data.decline_reason,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
            updates: [], // New task has no updates yet
            subTasks: [],
          };

          // Update local state
          set(state => ({
            tasks: [...state.tasks, transformedTask],
            isLoading: false,
          }));

          return data.id;
        } catch (error: any) {
          console.error('Error creating task:', error);
          set({ 
            error: error.message, 
            isLoading: false 
          });
          throw error;
        }
      },

      // UPDATE task in Supabase
      updateTask: async (id, updates) => {
        if (!supabase) {
          // Fallback to local update
          set(state => ({
            tasks: state.tasks.map(task =>
              task.id === id
                ? { ...task, ...updates, updatedAt: new Date().toISOString() }
                : task
            )
          }));
          return;
        }

        // OPTIMISTIC UPDATE: Store original state for potential rollback
        const originalTasks = get().tasks;
        
        try {
          // Get current task to check if it's self-assigned
          const currentTask = get().tasks.find(t => t.id === id);
          
          // Auto-accept self-assigned tasks when they reach 100%
          if (currentTask && updates.completionPercentage === 100) {
            const isSelfAssigned = currentTask.assignedBy && 
                                  currentTask.assignedTo && 
                                  currentTask.assignedTo.length === 1 && 
                                  currentTask.assignedTo[0] === currentTask.assignedBy;
            
            if (isSelfAssigned && updates.reviewAccepted === undefined) {
              updates.reviewAccepted = true;
              updates.reviewedBy = currentTask.assignedBy;
              updates.reviewedAt = new Date().toISOString();
            }
          }
          
          // OPTIMISTIC UPDATE: Update local state IMMEDIATELY before backend call
          console.log(`⚡ [Optimistic Update] Updating task ${id} locally before backend sync`);
          set(state => ({
            tasks: state.tasks.map(task =>
              task.id === id 
                ? { ...task, ...updates, updatedAt: new Date().toISOString() } 
                : task
            ),
            isLoading: true,
            error: null,
          }));
          
          // Prepare data for backend
          const updateData: any = {};
          if (updates.title) updateData.title = updates.title;
          if (updates.description) updateData.description = updates.description;
          if (updates.priority) updateData.priority = updates.priority;
          if (updates.category) updateData.category = updates.category;
          if (updates.dueDate) updateData.due_date = updates.dueDate;
          if (updates.assignedTo) updateData.assigned_to = updates.assignedTo;
          if (updates.attachments) updateData.attachments = updates.attachments;
          if (updates.accepted !== undefined) updateData.accepted = updates.accepted;
          if (updates.declineReason) updateData.decline_reason = updates.declineReason;
          if (updates.currentStatus) updateData.current_status = updates.currentStatus;
          if (updates.completionPercentage !== undefined) updateData.completion_percentage = updates.completionPercentage;
          if (updates.starredByUsers !== undefined) updateData.starred_by_users = updates.starredByUsers;
          // Review workflow fields
          if (updates.readyForReview !== undefined) updateData.ready_for_review = updates.readyForReview;
          if (updates.reviewedBy) updateData.reviewed_by = updates.reviewedBy;
          if (updates.reviewedAt) updateData.reviewed_at = updates.reviewedAt;
          if (updates.reviewAccepted !== undefined) updateData.review_accepted = updates.reviewAccepted;

          // Send update to backend
          const { error } = await supabase
            .from('tasks')
            .update(updateData)
            .eq('id', id);

          if (error) throw error;

          // Success - backend confirmed the update
          console.log(`✅ [Optimistic Update] Backend confirmed update for task ${id}`);
          set({ isLoading: false });
          
        } catch (error: any) {
          console.error('❌ [Optimistic Update] Backend failed, rolling back:', error);
          // ROLLBACK: Restore original state on failure
          set({ 
            tasks: originalTasks,
            error: error.message, 
            isLoading: false 
          });
          throw error;
        }
      },

      // DELETE task in Supabase
      deleteTask: async (id) => {
        if (!supabase) {
          // Fallback to local deletion
          set(state => ({
            tasks: state.tasks.filter(task => task.id !== id)
          }));
          return;
        }

        set({ isLoading: true, error: null });
        try {
          const { error } = await supabase
            .from('tasks')
            .delete()
            .eq('id', id);

          if (error) throw error;

          // Update local state
          set(state => ({
            tasks: state.tasks.filter(task => task.id !== id),
            isLoading: false,
          }));
        } catch (error: any) {
          console.error('Error deleting task:', error);
          set({ 
            error: error.message, 
            isLoading: false 
          });
          throw error;
        }
      },

      // Task assignment methods
      assignTask: async (taskId, userIds) => {
        await get().updateTask(taskId, { assignedTo: userIds });
      },

      acceptTask: async (taskId, userId) => {
        await get().updateTask(taskId, { 
          accepted: true,
          currentStatus: "in_progress",
          acceptedBy: userId,
          acceptedAt: new Date().toISOString()
        });
      },

      declineTask: async (taskId, userId, reason) => {
        // Get the task to find the creator
        const task = get().tasks.find(t => t.id === taskId);
        if (!task) return;

        // Get user who is rejecting to include their name in update
        const rejectingUser = await (async () => {
          try {
            const { data } = await supabase
              .from('users')
              .select('name')
              .eq('id', userId)
              .single();
            return data?.name || 'Unknown User';
          } catch {
            return 'Unknown User';
          }
        })();

        // Re-assign task to creator and mark as rejected
        await get().updateTask(taskId, { 
          accepted: false, 
          declineReason: reason,
          currentStatus: "rejected",
          assignedTo: [task.assignedBy], // Re-assign to creator
        });

        // Create an update entry documenting the rejection
        await get().addTaskUpdate(taskId, {
          userId: task.assignedBy, // Update is on behalf of the creator
          description: `Task rejected by ${rejectingUser}. Reason: ${reason}`,
          photos: [],
          completionPercentage: task.completionPercentage,
          status: "rejected"
        });
      },

      // Today's Tasks - Star/Unstar functionality
      toggleTaskStar: async (taskId, userId) => {
        const task = get().tasks.find(t => t.id === taskId);
        if (!task) return;

        const starredByUsers = task.starredByUsers || [];
        const isCurrentlyStarred = starredByUsers.includes(userId);

        // Toggle: Add or remove user from starred array
        const newStarredByUsers = isCurrentlyStarred
          ? starredByUsers.filter(id => id !== userId)
          : [...starredByUsers, userId];

        await get().updateTask(taskId, {
          starredByUsers: newStarredByUsers
        });
      },

      getStarredTasks: (userId) => {
        return get().tasks.filter(task => {
          const starredByUsers = task.starredByUsers || [];
          return starredByUsers.includes(userId);
        });
      },

      // Review workflow methods
      submitTaskForReview: async (taskId) => {
        await get().updateTask(taskId, {
          readyForReview: true
        });
      },

      acceptTaskCompletion: async (taskId, userId) => {
        await get().updateTask(taskId, {
          readyForReview: false,
          reviewedBy: userId,
          reviewedAt: new Date().toISOString(),
          reviewAccepted: true,
          currentStatus: "completed",
          completionPercentage: 100,
          starredByUsers: [] // Un-star task when accepted
        });
      },

      rejectTaskCompletion: async (taskId, userId, reason) => {
        await get().updateTask(taskId, {
          readyForReview: false,
          reviewedBy: userId,
          reviewedAt: new Date().toISOString(),
          reviewAccepted: false,
          currentStatus: "rejected",
          declineReason: reason,
          // Keep completion at 100% - they submitted it, just needs rework
        });
      },

      submitSubTaskForReview: async (taskId, subTaskId) => {
        await get().updateSubTask(taskId, subTaskId, {
          readyForReview: true
        });
      },

      acceptSubTaskCompletion: async (taskId, subTaskId, userId) => {
        await get().updateSubTask(taskId, subTaskId, {
          readyForReview: false,
          reviewedBy: userId,
          reviewedAt: new Date().toISOString(),
          reviewAccepted: true,
          currentStatus: "completed",
          completionPercentage: 100,
          starredByUsers: [] // Un-star subtask when accepted
        });
      },

      rejectSubTaskCompletion: async (taskId, subTaskId, userId, reason) => {
        await get().updateSubTask(taskId, subTaskId, {
          readyForReview: false,
          reviewedBy: userId,
          reviewedAt: new Date().toISOString(),
          reviewAccepted: false,
          currentStatus: "rejected",
          declineReason: reason,
          // Keep completion at 100% - they submitted it, just needs rework
        });
      },

      // Progress tracking methods
      addTaskUpdate: async (taskId, update) => {
        if (!supabase) {
          // Fallback to local update
          const newUpdate: TaskUpdate = {
            ...update,
            id: `update-${Date.now()}`,
            timestamp: new Date().toISOString(),
          };

          set(state => ({
            tasks: state.tasks.map(task =>
              task.id === taskId
                ? { ...task, updates: [...task.updates, newUpdate] }
                : task
            )
          }));
          return;
        }

        // OPTIMISTIC UPDATE: Store original state for potential rollback
        const originalTasks = get().tasks;
        
        try {
          // Create the new update with temporary ID
          const newUpdate: TaskUpdate = {
            ...update,
            id: `temp-${Date.now()}`,
            timestamp: new Date().toISOString(),
          };

          // OPTIMISTIC UPDATE: Update local state IMMEDIATELY
          console.log(`⚡ [Optimistic Update] Adding update to task ${taskId} locally before backend sync`);
          set(state => ({
            tasks: state.tasks.map(task =>
              task.id === taskId
                ? { 
                    ...task, 
                    updates: [...task.updates, newUpdate],
                    completionPercentage: update.completionPercentage,
                    currentStatus: update.status,
                    updatedAt: new Date().toISOString(),
                  }
                : task
            )
          }));

          // Insert the task update to backend
          const { error: updateError } = await supabase
            .from('task_updates')
            .insert({
              task_id: taskId,
              user_id: update.userId,
              description: update.description,
              photos: update.photos,
              completion_percentage: update.completionPercentage,
              status: update.status,
            });

          if (updateError) throw updateError;

          // Update the task's completion percentage and status in backend
          const { error: taskError } = await supabase
            .from('tasks')
            .update({
              completion_percentage: update.completionPercentage,
              current_status: update.status,
              updated_at: new Date().toISOString(),
            })
            .eq('id', taskId);

          if (taskError) throw taskError;

          // Success - backend confirmed
          console.log(`✅ [Optimistic Update] Backend confirmed task update for ${taskId}`);
          
          // Optionally refresh to get real IDs from backend (in background)
          get().fetchTaskById(taskId);
          
        } catch (error: any) {
          console.error('❌ [Optimistic Update] Backend failed for task update, rolling back:', error);
          // ROLLBACK: Restore original state on failure
          set({ tasks: originalTasks });
          throw error;
        }
      },

      addSubTaskUpdate: async (taskId, subTaskId, update) => {
        if (!supabase) {
          // Fallback to local update
          const newUpdate: TaskUpdate = {
            ...update,
            id: `update-${Date.now()}`,
            timestamp: new Date().toISOString(),
          };

          set(state => ({
            tasks: state.tasks.map(task =>
              task.id === subTaskId
                ? { ...task, updates: [...(task.updates || []), newUpdate] }
                : task
            )
          }));
          return;
        }

        try {
          const { error } = await supabase
            .from('task_updates')
            .insert({
              task_id: subTaskId,  // ✅ Subtasks are now tasks, use subTaskId directly
              user_id: update.userId,
              description: update.description,
              photos: update.photos,
              completion_percentage: update.completionPercentage,
              status: update.status,
            });

          if (error) throw error;
        } catch (error: any) {
          console.error('Error adding subtask update:', error);
          throw error;
        }
      },

      updateTaskStatus: async (taskId, status, completionPercentage) => {
        await get().updateTask(taskId, { 
          currentStatus: status, 
          completionPercentage 
        });
      },

      // Subtask management methods
      createSubTask: async (taskId, subTaskData) => {
        if (!supabase) {
          // Fallback to local creation
          const newSubTask: SubTask = {
            ...subTaskData,
            id: `subtask-${Date.now()}`,
            parentTaskId: taskId,
            createdAt: new Date().toISOString(),
            currentStatus: "not_started",
            completionPercentage: 0,
            updates: [], // New subtask has no updates yet
            delegationHistory: [],
            originalAssignedBy: subTaskData.assignedBy,
          };

          set(state => ({
            tasks: state.tasks.map(task =>
              task.id === taskId
                ? { ...task, subTasks: [...(task.subTasks || []), newSubTask] }
                : task
            )
          }));

          return newSubTask.id;
        }

        try {
          // Get parent task to calculate nesting level
          const parentTask = get().tasks.find(t => t.id === taskId);
          const nestingLevel = (parentTask?.nestingLevel || 0) + 1;
          const rootTaskId = parentTask?.rootTaskId || parentTask?.id || taskId;
          
          console.log('Creating sub-task with data:', {
            parent_task_id: taskId,
            nesting_level: nestingLevel,
            root_task_id: rootTaskId,
            project_id: subTaskData.projectId,
            title: subTaskData.title,
            assigned_to: subTaskData.assignedTo,
            assigned_by: subTaskData.assignedBy,
          });

          // Check if creator is assigned to the subtask
          const isCreatorAssigned = subTaskData.assignedTo.includes(subTaskData.assignedBy);

          const { data, error } = await supabase
            .from('tasks')  // ✅ Changed to unified tasks table
            .insert({
              parent_task_id: taskId,
              nesting_level: nestingLevel,   // ✅ NEW
              root_task_id: rootTaskId,      // ✅ NEW
              project_id: subTaskData.projectId,
              title: subTaskData.title,
              description: subTaskData.description,
              priority: subTaskData.priority,
              category: subTaskData.category,
              due_date: subTaskData.dueDate,
              current_status: "not_started",
              completion_percentage: 0,
              assigned_to: subTaskData.assignedTo,
              assigned_by: subTaskData.assignedBy,
              attachments: subTaskData.attachments,
              // Auto-accept if creator is assigned to the subtask
              accepted: isCreatorAssigned ? true : false,
              accepted_by: isCreatorAssigned ? subTaskData.assignedBy : null,
              accepted_at: isCreatorAssigned ? new Date().toISOString() : null,
            })
            .select()
            .single();

          if (error) throw error;
          
          console.log('✅ Sub-task created successfully:', data.id);

          // Add to local state
          set(state => ({
            tasks: [...state.tasks, {
              id: data.id,
              projectId: data.project_id,
              parentTaskId: data.parent_task_id,
              nestingLevel: data.nesting_level,
              rootTaskId: data.root_task_id,
              title: data.title,
              description: data.description,
              priority: data.priority,
              category: data.category,
              dueDate: data.due_date,
              currentStatus: data.current_status,
              completionPercentage: data.completion_percentage,
              assignedTo: data.assigned_to || [],
              assignedBy: data.assigned_by,
              location: data.location,
              attachments: data.attachments || [],
              accepted: data.accepted,
              createdAt: data.created_at,
              updates: [],
            }]
          }));
          
          return data.id;
        } catch (error: any) {
          console.error('Error creating subtask:', error);
          throw error;
        }
      },

      createNestedSubTask: async (taskId, parentSubTaskId, subTaskData) => {
        // Similar to createSubTask but with parent_sub_task_id
        if (!supabase) {
          const newSubTask: SubTask = {
            ...subTaskData,
            id: `subtask-${Date.now()}`,
            parentTaskId: taskId,
            createdAt: new Date().toISOString(),
            currentStatus: "not_started",
            completionPercentage: 0,
            updates: [], // New nested subtask has no updates yet
            delegationHistory: [],
            originalAssignedBy: subTaskData.assignedBy,
          };

          set(state => ({
            tasks: state.tasks.map(task =>
              task.id === taskId
                ? { ...task, subTasks: [...(task.subTasks || []), newSubTask] }
                : task
            )
          }));

          return newSubTask.id;
        }

        try {
          // Get parent task to calculate nesting level
          const parentTask = get().tasks.find(t => t.id === parentSubTaskId);
          const nestingLevel = (parentTask?.nestingLevel || 0) + 1;
          const rootTaskId = parentTask?.rootTaskId || parentTask?.id || taskId;
          
          // Check if creator is assigned to the nested subtask
          const isCreatorAssigned = subTaskData.assignedTo.includes(subTaskData.assignedBy);
          
          const { data, error } = await supabase
            .from('tasks')  // ✅ Changed to unified tasks table
            .insert({
              parent_task_id: parentSubTaskId,  // ✅ Parent is now just another task
              nesting_level: nestingLevel,       // ✅ NEW
              root_task_id: rootTaskId,          // ✅ NEW
              project_id: subTaskData.projectId,
              title: subTaskData.title,
              description: subTaskData.description,
              priority: subTaskData.priority,
              category: subTaskData.category,
              due_date: subTaskData.dueDate,
              current_status: "not_started",
              completion_percentage: 0,
              assigned_to: subTaskData.assignedTo,
              assigned_by: subTaskData.assignedBy,
              attachments: subTaskData.attachments,
              // Auto-accept if creator is assigned to the nested subtask
              accepted: isCreatorAssigned ? true : null,
              accepted_by: isCreatorAssigned ? subTaskData.assignedBy : null,
              accepted_at: isCreatorAssigned ? new Date().toISOString() : null,
            })
            .select()
            .single();

          if (error) throw error;
          
          // Add to local state
          set(state => ({
            tasks: [...state.tasks, {
              id: data.id,
              projectId: data.project_id,
              parentTaskId: data.parent_task_id,
              nestingLevel: data.nesting_level,
              rootTaskId: data.root_task_id,
              title: data.title,
              description: data.description,
              priority: data.priority,
              category: data.category,
              dueDate: data.due_date,
              currentStatus: data.current_status,
              completionPercentage: data.completion_percentage,
              assignedTo: data.assigned_to || [],
              assignedBy: data.assigned_by,
              location: data.location,
              attachments: data.attachments || [],
              accepted: data.accepted,
              createdAt: data.created_at,
              updates: [],
            }]
          }));
          
          return data.id;
        } catch (error: any) {
          console.error('Error creating nested subtask:', error);
          throw error;
        }
      },

      updateSubTask: async (taskId, subTaskId, updates) => {
        if (!supabase) {
          // Fallback to local update
          set(state => ({
            tasks: state.tasks.map(task =>
              task.id === taskId
                ? {
                    ...task,
                    subTasks: task.subTasks?.map(subTask =>
                      subTask.id === subTaskId
                        ? { ...subTask, ...updates }
                        : subTask
                    )
                  }
                : task
            )
          }));
          return;
        }

        try {
          // Get current subtask (now just a task with parentTaskId)
          const currentSubTask = get().tasks.find(t => t.id === subTaskId);
          
          // Auto-accept self-assigned subtasks when they reach 100%
          if (currentSubTask && updates.completionPercentage === 100) {
            const isSelfAssigned = currentSubTask.assignedBy && 
                                  currentSubTask.assignedTo && 
                                  currentSubTask.assignedTo.length === 1 && 
                                  currentSubTask.assignedTo[0] === currentSubTask.assignedBy;
            
            if (isSelfAssigned && updates.reviewAccepted === undefined) {
              updates.reviewAccepted = true;
              updates.reviewedBy = currentSubTask.assignedBy;
              updates.reviewedAt = new Date().toISOString();
            }
          }
          
          const updateData: any = {};
          if (updates.title) updateData.title = updates.title;
          if (updates.description) updateData.description = updates.description;
          if (updates.priority) updateData.priority = updates.priority;
          if (updates.category) updateData.category = updates.category;
          if (updates.dueDate) updateData.due_date = updates.dueDate;
          if (updates.assignedTo) updateData.assigned_to = updates.assignedTo;
          if (updates.attachments) updateData.attachments = updates.attachments;
          if (updates.accepted !== undefined) updateData.accepted = updates.accepted;
          if (updates.declineReason) updateData.decline_reason = updates.declineReason;
          if (updates.currentStatus) updateData.current_status = updates.currentStatus;
          if (updates.completionPercentage !== undefined) updateData.completion_percentage = updates.completionPercentage;
          // Review workflow fields
          if (updates.readyForReview !== undefined) updateData.ready_for_review = updates.readyForReview;
          if (updates.reviewedBy) updateData.reviewed_by = updates.reviewedBy;
          if (updates.reviewedAt) updateData.reviewed_at = updates.reviewedAt;
          if (updates.reviewAccepted !== undefined) updateData.review_accepted = updates.reviewAccepted;

          const { error } = await supabase
            .from('tasks')  // ✅ Changed to unified tasks table
            .update(updateData)
            .eq('id', subTaskId);

          if (error) throw error;

          // Update local state
          set(state => ({
            tasks: state.tasks.map(t => 
              t.id === subTaskId ? { ...t, ...updates } : t
            )
          }));
        } catch (error: any) {
          console.error('Error updating subtask:', error);
          throw error;
        }
      },

      deleteSubTask: async (taskId, subTaskId) => {
        if (!supabase) {
          // Fallback to local deletion
          set(state => ({
            tasks: state.tasks.filter(t => t.id !== subTaskId)
          }));
          return;
        }

        try {
          const { error } = await supabase
            .from('tasks')  // ✅ Changed to unified tasks table
            .delete()
            .eq('id', subTaskId);

          if (error) throw error;

          // Remove from local state (CASCADE will handle children in DB)
          set(state => ({
            tasks: state.tasks.filter(t => t.id !== subTaskId)
          }));
        } catch (error: any) {
          console.error('Error deleting subtask:', error);
          throw error;
        }
      },

      updateSubTaskStatus: async (taskId, subTaskId, status, completionPercentage) => {
        await get().updateSubTask(taskId, subTaskId, { 
          currentStatus: status, 
          completionPercentage 
        });
      },

      acceptSubTask: async (taskId, subTaskId, userId) => {
        await get().updateSubTask(taskId, subTaskId, { 
          accepted: true,
          currentStatus: "in_progress",
          acceptedBy: userId,
          acceptedAt: new Date().toISOString()
        });
      },

      declineSubTask: async (taskId, subTaskId, userId, reason) => {
        // Get the parent task and find the subtask
        const task = get().tasks.find(t => t.id === taskId);
        if (!task) return;

        const findSubTask = (subTasks: any[] | undefined, id: string): any => {
          if (!subTasks) return null;
          for (const st of subTasks) {
            if (st.id === id) return st;
            if (st.subTasks) {
              const found = findSubTask(st.subTasks, id);
              if (found) return found;
            }
          }
          return null;
        };

        const subTask = findSubTask(task.subTasks, subTaskId);
        if (!subTask) return;

        // Get user who is rejecting to include their name in update
        const rejectingUser = await (async () => {
          try {
            const { data } = await supabase
              .from('users')
              .select('name')
              .eq('id', userId)
              .single();
            return data?.name || 'Unknown User';
          } catch {
            return 'Unknown User';
          }
        })();

        // Re-assign subtask to creator and mark as rejected
        await get().updateSubTask(taskId, subTaskId, { 
          accepted: false, 
          declineReason: reason,
          currentStatus: "rejected",
          assignedTo: [subTask.assignedBy], // Re-assign to creator
        });

        // Create an update entry documenting the rejection
        await get().addSubTaskUpdate(taskId, subTaskId, {
          userId: subTask.assignedBy, // Update is on behalf of the creator
          description: `Sub-task rejected by ${rejectingUser}. Reason: ${reason}`,
          photos: [],
          completionPercentage: subTask.completionPercentage,
          status: "rejected"
        });
      },

      // Task read status management
      markTaskAsRead: async (userId, taskId) => {
        // Update local state immediately (optimistic update)
        set(state => ({
          taskReadStatuses: [
            ...state.taskReadStatuses.filter(s => !(s.userId === userId && s.taskId === taskId)),
            { userId, taskId, readAt: new Date().toISOString() }
          ]
        }));

        // If no Supabase, just keep the local state
        if (!supabase) {
          return;
        }

        // Try to sync with Supabase in background, but don't block or crash on errors
        try {
          const { error } = await supabase
            .from('task_read_status')
            .upsert({
              user_id: userId,
              task_id: taskId,
              read_at: new Date().toISOString(),
            });

          if (error) {
            // Log warning but don't crash - read status is not critical
            console.warn('Failed to sync task read status to Supabase:', error.message);
          }
        } catch (error: any) {
          // Catch network errors silently - local state is already updated
          console.warn('Network error syncing task read status (non-critical):', error.message || 'Unknown error');
        }
      },

      getUnreadTaskCount: (userId) => {
        const readStatuses = get().taskReadStatuses.filter(s => s.userId === userId);
        const userTasks = get().getTasksByUser(userId);
        return userTasks.filter(task => 
          !readStatuses.some(status => status.taskId === task.id)
        ).length;
      },

      // Filtering and querying methods
      getTasksByUser: (userId, projectId) => {
        let tasks = get().tasks.filter(task => task.assignedTo.includes(userId));
        if (projectId) {
          tasks = tasks.filter(task => task.projectId === projectId);
        }
        return tasks;
      },

      getTasksAssignedBy: (userId, projectId) => {
        let tasks = get().tasks.filter(task => task.assignedBy === userId);
        if (projectId) {
          tasks = tasks.filter(task => task.projectId === projectId);
        }
        return tasks;
      },

      getOverdueTasks: (projectId) => {
        const now = new Date();
        let tasks = get().tasks.filter(task => 
          new Date(task.dueDate) < now && task.currentStatus !== 'completed'
        );
        if (projectId) {
          tasks = tasks.filter(task => task.projectId === projectId);
        }
        return tasks;
      },

      getTasksByStatus: (status, projectId) => {
        let tasks = get().tasks.filter(task => task.currentStatus === status);
        if (projectId) {
          tasks = tasks.filter(task => task.projectId === projectId);
        }
        return tasks;
      },

      getTasksByPriority: (priority, projectId) => {
        let tasks = get().tasks.filter(task => task.priority === priority);
        if (projectId) {
          tasks = tasks.filter(task => task.projectId === projectId);
        }
        return tasks;
      },

      getTasksByProject: (projectId) => {
        return get().tasks.filter(task => task.projectId === projectId);
      },

      // ✅ NEW: Helper methods for unified tasks structure
      
      // Get top-level tasks (no parent)
      getTopLevelTasks: (projectId?: string) => {
        const tasks = get().tasks;
        return tasks.filter(t => 
          !t.parentTaskId && 
          (projectId ? t.projectId === projectId : true)
        );
      },

      // Get children of a specific task
      getChildTasks: (parentTaskId: string) => {
        return get().tasks.filter(t => t.parentTaskId === parentTaskId);
      },

      // Build hierarchical tree from flat list
      buildTaskTree: (tasks: Task[]): Task[] => {
        const taskMap = new Map<string, Task & { children: Task[] }>();
        
        // First pass: create map with all tasks
        tasks.forEach(task => {
          taskMap.set(task.id, { ...task, children: [] });
        });
        
        const rootTasks: Task[] = [];
        
        // Second pass: build hierarchy
        tasks.forEach(task => {
          const taskWithChildren = taskMap.get(task.id)!;
          
          if (!task.parentTaskId) {
            rootTasks.push(taskWithChildren);
          } else {
            const parent = taskMap.get(task.parentTaskId);
            if (parent) {
              parent.children = parent.children || [];
              parent.children.push(taskWithChildren);
            } else {
              // Orphaned task - add to root
              rootTasks.push(taskWithChildren);
            }
          }
        });
        
        return rootTasks;
      },

      // Get all descendants of a task (recursive)
      getTaskDescendants: (taskId: string): Task[] => {
        const descendants: Task[] = [];
        const allTasks = get().tasks;
        
        function collectChildren(parentId: string) {
          const children = allTasks.filter(t => t.parentTaskId === parentId);
          children.forEach(child => {
            descendants.push(child);
            collectChildren(child.id); // Recurse
          });
        }
        
        collectChildren(taskId);
        return descendants;
      },

      // Get ancestors of a task (breadcrumb path)
      getTaskAncestors: (taskId: string): Task[] => {
        const ancestors: Task[] = [];
        const allTasks = get().tasks;
        let currentTask = allTasks.find(t => t.id === taskId);
        
        while (currentTask?.parentTaskId) {
          const parent = allTasks.find(t => t.id === currentTask!.parentTaskId);
          if (!parent) break;
          ancestors.unshift(parent); // Add to beginning
          currentTask = parent;
        }
        
        return ancestors;
      },

      // Count all descendants
      countTaskDescendants: (taskId: string): number => {
        return get().getTaskDescendants(taskId).length;
      },
    }),
    {
      name: "buildtrack-tasks",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        // Only persist tasks and read statuses, not loading/error states
        tasks: state.tasks,
        taskReadStatuses: state.taskReadStatuses,
      }),
    }
  )
);

