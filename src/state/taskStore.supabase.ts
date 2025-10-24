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
          const { data, error } = await supabase
            .from('tasks')
            .select(`
              *,
              sub_tasks (*)
            `)
            .order('created_at', { ascending: false });

          if (error) throw error;

          // Transform Supabase data to match local interface
          const transformedTasks = (data || []).map(task => ({
            id: task.id,
            projectId: task.project_id,
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
            accepted: task.accepted,
            declineReason: task.decline_reason,
            createdAt: task.created_at,
            updatedAt: task.updated_at,
            updates: [],
            subTasks: (task.sub_tasks || []).map((st: any) => ({
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
              createdAt: st.created_at,
              updatedAt: st.updated_at,
              updates: [],
            })),
          }));

          console.log('✅ Fetched tasks from Supabase:', transformedTasks.length);
          console.log('Task details:', transformedTasks.map(t => ({ 
            id: t.id, 
            title: t.title, 
            projectId: t.projectId,
            assignedTo: t.assignedTo, 
            assignedBy: t.assignedBy 
          })));

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
          const { data, error } = await supabase
            .from('tasks')
            .select(`
              *,
              sub_tasks (*)
            `)
            .eq('project_id', projectId)
            .order('created_at', { ascending: false });

          if (error) throw error;

          // Transform Supabase data to match local interface
          const transformedTasks = (data || []).map(task => ({
            id: task.id,
            projectId: task.project_id,
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
            accepted: task.accepted,
            declineReason: task.decline_reason,
            createdAt: task.created_at,
            updatedAt: task.updated_at,
            updates: [],
            subTasks: (task.sub_tasks || []).map((st: any) => ({
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
              createdAt: st.created_at,
              updatedAt: st.updated_at,
              updates: [],
            })),
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
            .select(`
              *,
              sub_tasks (*)
            `)
            .contains('assigned_to', [userId])
            .order('created_at', { ascending: false });

          if (error) throw error;

          // Transform Supabase data to match local interface
          const transformedTasks = (data || []).map(task => ({
            id: task.id,
            projectId: task.project_id,
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
            accepted: task.accepted,
            declineReason: task.decline_reason,
            createdAt: task.created_at,
            updatedAt: task.updated_at,
            updates: [],
            subTasks: (task.sub_tasks || []).map((st: any) => ({
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
              createdAt: st.created_at,
              updatedAt: st.updated_at,
              updates: [],
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
            updates: [],
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
              accepted: null,
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
            updates: [],
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

        set({ isLoading: true, error: null });
        try {
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

          const { error } = await supabase
            .from('tasks')
            .update(updateData)
            .eq('id', id);

          if (error) throw error;

          // Update local state
          set(state => ({
            tasks: state.tasks.map(task =>
              task.id === id 
                ? { ...task, ...updates, updatedAt: new Date().toISOString() } 
                : task
            ),
            isLoading: false,
          }));
        } catch (error: any) {
          console.error('Error updating task:', error);
          set({ 
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
        await get().updateTask(taskId, { 
          accepted: false, 
          declineReason: reason,
          currentStatus: "rejected"
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

        try {
          // Insert the task update
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

          // Update the task's completion percentage and status
          const { error: taskError } = await supabase
            .from('tasks')
            .update({
              completion_percentage: update.completionPercentage,
              current_status: update.status,
              updated_at: new Date().toISOString(),
            })
            .eq('id', taskId);

          if (taskError) throw taskError;

          // Refresh task data
          await get().fetchTaskById(taskId);
        } catch (error: any) {
          console.error('Error adding task update:', error);
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
              task.id === taskId
                ? {
                    ...task,
                    subTasks: task.subTasks?.map(subTask =>
                      subTask.id === subTaskId
                        ? { ...subTask, updates: [...subTask.updates, newUpdate] }
                        : subTask
                    )
                  }
                : task
            )
          }));
          return;
        }

        try {
          const { error } = await supabase
            .from('task_updates')
            .insert({
              task_id: taskId,
              sub_task_id: subTaskId,
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
            updates: [],
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
          console.log('Creating sub-task with data:', {
            parent_task_id: taskId,
            project_id: subTaskData.projectId,
            title: subTaskData.title,
            assigned_to: subTaskData.assignedTo,
            assigned_by: subTaskData.assignedBy,
          });

          const { data, error } = await supabase
            .from('sub_tasks')
            .insert({
              parent_task_id: taskId,
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
              accepted: false,
            })
            .select()
            .single();

          if (error) throw error;
          
          console.log('✅ Sub-task created successfully:', data.id);

          // Refresh task data to get updated subtasks
          await get().fetchTaskById(taskId);
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
            updates: [],
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
          const { data, error } = await supabase
            .from('sub_tasks')
            .insert({
              parent_task_id: taskId,
              parent_sub_task_id: parentSubTaskId,
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
              accepted: false,
            })
            .select()
            .single();

          if (error) throw error;
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

          const { error } = await supabase
            .from('sub_tasks')
            .update(updateData)
            .eq('id', subTaskId);

          if (error) throw error;

          // Refresh task data
          await get().fetchTaskById(taskId);
        } catch (error: any) {
          console.error('Error updating subtask:', error);
          throw error;
        }
      },

      deleteSubTask: async (taskId, subTaskId) => {
        if (!supabase) {
          // Fallback to local deletion
          set(state => ({
            tasks: state.tasks.map(task =>
              task.id === taskId
                ? {
                    ...task,
                    subTasks: task.subTasks?.filter(subTask => subTask.id !== subTaskId)
                  }
                : task
            )
          }));
          return;
        }

        try {
          const { error } = await supabase
            .from('sub_tasks')
            .delete()
            .eq('id', subTaskId);

          if (error) throw error;

          // Refresh task data
          await get().fetchTaskById(taskId);
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
        await get().updateSubTask(taskId, subTaskId, { 
          accepted: false, 
          declineReason: reason,
          currentStatus: "rejected"
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

