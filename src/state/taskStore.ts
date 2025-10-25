import React from "react";
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
  
  // Internal initialization
  _initializeData: () => Promise<void>;
  _initializeUserData: (userId: string) => Promise<void>;
  
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

      // Initialize data on first access
      _initializeData: async () => {
        const state = get();
        if (state.tasks.length === 0 && !state.isLoading && supabase) {
          await state.fetchTasks();
        }
      },

      // Initialize data with user context (call this after login)
      _initializeUserData: async (userId: string) => {
        const state = get();
        if (!state.isLoading && supabase) {
          // Only fetch ALL tasks, not user-specific tasks to avoid overwriting
          await state.fetchTasks();
        }
      },

      // FETCH from Supabase
      fetchTasks: async () => {
        if (!supabase) {
          console.error('Supabase not configured, no data available');
          set({ tasks: [], isLoading: false, error: 'Supabase not configured' });
          return;
        }

        set({ isLoading: true, error: null });
        try {
          console.log('🔄 Fetching tasks from Supabase...');
          
          // Simplified query without foreign key joins to avoid relationship issues
          const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .order('created_at', { ascending: false });

          if (error) {
            console.error('❌ Supabase tasks fetch error:', error);
            throw error;
          }

          console.log('✅ Tasks fetched successfully:', data?.length || 0, 'tasks');
          console.log('Task names:', data?.map(t => t.title).join(', '));

          // Transform Supabase data to match app's Task interface
          const transformedTasks = (data || []).map(task => ({
            id: task.id,
            projectId: task.project_id,
            title: task.title,
            description: task.description || '',
            priority: task.priority || 'medium',
            dueDate: task.due_date || new Date().toISOString(),
            category: task.category || 'general',
            attachments: task.attachments || [],
            location: task.location,
            assignedTo: task.assigned_to || [], // Handle undefined assigned_to
            assignedBy: task.assigned_by || '',
            currentStatus: task.current_status || 'not_started',
            completionPercentage: task.completion_percentage || 0,
            createdAt: task.created_at || new Date().toISOString(),
            updatedAt: task.updated_at || new Date().toISOString(),
            accepted: task.accepted || false,
            acceptedAt: task.accepted_at,
            acceptedBy: task.accepted_by,
            delegationHistory: task.delegation_history || [],
            updates: [], // Initialize empty updates array
            starredByUsers: task.starred_by_users || [], // Map from DB field
          }));

          set({ 
            tasks: transformedTasks, 
            isLoading: false 
          });
        } catch (error: any) {
          console.error('❌ Error fetching tasks:', error);
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
              projects (
                id,
                name
              ),
              users!assigned_by (
                id,
                name,
                email
              )
            `)
            .eq('project_id', projectId)
            .order('created_at', { ascending: false });

          if (error) throw error;

          set({ 
            tasks: data || [], 
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
          console.log('🔄 Fetching tasks for user:', userId);
          
          // Simplified query without foreign key joins
          const { data, error } = await supabase
            .from('tasks')
            .select('*')
            .contains('assigned_to', [userId])
            .order('created_at', { ascending: false });

          if (error) {
            console.error('❌ Supabase user tasks fetch error:', error);
            throw error;
          }

          console.log('✅ User tasks fetched successfully:', data?.length || 0, 'tasks');

          // Transform Supabase data to match app's Task interface
          const transformedTasks = (data || []).map(task => ({
            id: task.id,
            projectId: task.project_id,
            title: task.title,
            description: task.description || '',
            priority: task.priority || 'medium',
            dueDate: task.due_date || new Date().toISOString(),
            category: task.category || 'general',
            attachments: task.attachments || [],
            location: task.location,
            assignedTo: task.assigned_to || [], // Handle undefined assigned_to
            assignedBy: task.assigned_by || '',
            currentStatus: task.current_status || 'not_started',
            completionPercentage: task.completion_percentage || 0,
            createdAt: task.created_at || new Date().toISOString(),
            updatedAt: task.updated_at || new Date().toISOString(),
            accepted: task.accepted || false,
            acceptedAt: task.accepted_at,
            acceptedBy: task.accepted_by,
            delegationHistory: task.delegation_history || [],
            updates: [], // Initialize empty updates array
            starredByUsers: task.starred_by_users || [], // Map from DB field
          }));

          set({ 
            tasks: transformedTasks, 
            isLoading: false 
          });
        } catch (error: any) {
          console.error('❌ Error fetching tasks by user:', error);
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
          const { data, error } = await supabase
            .from('tasks')
            .select(`
              *,
              projects (
                id,
                name
              ),
              users!assigned_by (
                id,
                name,
                email
              )
            `)
            .eq('id', id)
            .single();

          if (error) throw error;
          return data;
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
              assigned_to: taskData.assignedTo,
              assigned_by: taskData.assignedBy,
              attachments: taskData.attachments,
              current_status: 'not_started',
              completion_percentage: 0,
              accepted: null,
            })
            .select()
            .single();

          if (error) throw error;

          // Update local state
          set(state => ({
            tasks: [...state.tasks, data],
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
          if (updates.starredByUsers !== undefined) updateData.starred_by_users = updates.starredByUsers;

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
          const { error } = await supabase
            .from('task_updates')
            .insert({
              task_id: taskId,
              user_id: update.userId,
              description: update.description,
              photos: update.photos,
              completion_percentage: update.completionPercentage,
              status: update.status,
            });

          if (error) throw error;

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
              assigned_to: subTaskData.assignedTo,
              assigned_by: subTaskData.assignedBy,
              attachments: subTaskData.attachments,
              accepted: false,
            })
            .select()
            .single();

          if (error) throw error;

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
        if (!supabase) {
          // Fallback to local tracking
          set(state => ({
            taskReadStatuses: [
              ...state.taskReadStatuses.filter(s => !(s.userId === userId && s.taskId === taskId)),
              { userId, taskId, isRead: true, readAt: new Date().toISOString() }
            ]
          }));
          return;
        }

        try {
          const { error } = await supabase
            .from('task_read_status')
            .upsert({
              user_id: userId,
              task_id: taskId,
              read_at: new Date().toISOString(),
            });

          if (error) throw error;
        } catch (error: any) {
          console.error('Error marking task as read:', error);
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
        let tasks = get().tasks.filter(task => {
          // Handle cases where assignedTo might be undefined or null
          const assignedTo = task.assignedTo || [];
          return Array.isArray(assignedTo) && assignedTo.includes(userId);
        });
        if (projectId) {
          tasks = tasks.filter(task => task.projectId === projectId);
        }
        return tasks;
      },

      getTasksAssignedBy: (userId, projectId) => {
        let tasks = get().tasks.filter(task => {
          // Handle cases where assignedBy might be undefined or null
          return task.assignedBy === userId;
        });
        if (projectId) {
          tasks = tasks.filter(task => task.projectId === projectId);
        }
        return tasks;
      },

      getOverdueTasks: (projectId) => {
        const now = new Date();
        let tasks = get().tasks.filter(task => {
          // Handle cases where dueDate might be undefined or invalid
          if (!task.dueDate) return false;
          const dueDate = new Date(task.dueDate);
          return !isNaN(dueDate.getTime()) && dueDate < now && task.currentStatus !== 'completed';
        });
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

// Custom hook that automatically initializes data when accessed
export const useTaskStoreWithInit = () => {
  const store = useTaskStore();
  
  React.useEffect(() => {
    console.log('🔄 useTaskStoreWithInit: Initializing task store...');
    
    // Get current user from auth store
    const authStore = require('./authStore').useAuthStore.getState();
    const user = authStore.user;
    
    console.log('👤 Current user:', user ? `${user.name} (${user.id})` : 'none');
    console.log('🔗 Supabase available:', !!supabase);
    
    if (user && supabase) {
      console.log('🚀 Initializing with user context...');
      // Initialize with user context to fetch both tasks and user-specific data
      store._initializeUserData(user.id);
    } else if (store.tasks.length === 0 && !store.isLoading && supabase) {
      console.log('🚀 Fallback to basic initialization...');
      // Fallback to basic initialization
      store._initializeData();
    } else {
      console.log('⏭️ Skipping initialization - already loaded or no Supabase');
    }
  }, []);
  
  return store;
};
