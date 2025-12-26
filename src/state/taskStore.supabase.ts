import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "../api/supabase";
import { Task, SubTask, TaskUpdate, TaskStatus, Priority, TaskReadStatus, BillingStatus, TaskEditHistory, TaskActivity, ActivityType } from "../types/buildtrack";

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
  createTask: (task: Omit<Task, "id" | "createdAt" | "updates" | "status" | "completionPercentage">) => Promise<string>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  cancelTask: (taskId: string, userId: string) => Promise<void>; // Cancel task (only creator can cancel)
  
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
  rejectTaskCompletion: (taskId: string, userId: string, reason: string, photos?: string[]) => Promise<void>;
  submitSubTaskForReview: (taskId: string, subTaskId: string) => Promise<void>;
  acceptSubTaskCompletion: (taskId: string, subTaskId: string, userId: string) => Promise<void>;
  rejectSubTaskCompletion: (taskId: string, subTaskId: string, userId: string, reason: string, photos?: string[]) => Promise<void>;
  
  // Progress tracking
  addTaskUpdate: (taskId: string, update: Omit<TaskUpdate, "id" | "timestamp">) => Promise<void>;
  addSubTaskUpdate: (taskId: string, subTaskId: string, update: Omit<TaskUpdate, "id" | "timestamp">) => Promise<void>;
  updateTaskStatus: (taskId: string, status: TaskStatus, completionPercentage: number) => Promise<void>;
  
  // Assigner comments
  addAssignerComment: (taskId: string, comment: { description: string; photos?: string[]; userId: string }) => Promise<void>;
  
  // Subtask management
  createSubTask: (taskId: string, subTask: Omit<SubTask, "id" | "createdAt" | "parentTaskId" | "status" | "completionPercentage">) => Promise<string>;
  createNestedSubTask: (taskId: string, parentSubTaskId: string, subTask: Omit<SubTask, "id" | "createdAt" | "parentTaskId" | "status" | "completionPercentage">) => Promise<string>;
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
  
  // Task edit history (audit logging)
  trackTaskEdit: (taskId: string, userId: string, oldTask: Task, newTask: Partial<Task>, editReason?: string) => Promise<void>;
  fetchTaskEditHistory: (taskId: string) => Promise<TaskEditHistory[]>;
  notifyTaskEdit: (taskId: string, editedBy: string, changes: Partial<Task>) => Promise<void>;
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
          // Filter out cancelled tasks (cancelled_at IS NULL)
          const { data: allTasksData, error: tasksError } = await supabase
            .from('tasks')
            .select('*')
            .is('cancelled_at', null) // Only fetch non-cancelled tasks
            .order('created_at', { ascending: false });

          if (tasksError) throw tasksError;

          // Fetch all task activities (unified table)
          const { data: taskActivitiesData, error: taskActivitiesError } = await supabase
            .from('task_activities')
            .select('*')
            .order('timestamp', { ascending: true });

          if (taskActivitiesError) throw taskActivitiesError;

          // Group task activities by task_id and transform to TaskActivity format
          const activitiesByTaskId: { [key: string]: TaskActivity[] } = {};
          (taskActivitiesData || []).forEach((activity: any) => {
            const taskId = activity.task_id;
            if (!activitiesByTaskId[taskId]) {
              activitiesByTaskId[taskId] = [];
            }
            activitiesByTaskId[taskId].push({
              id: activity.id,
              taskId: activity.task_id,
              userId: activity.user_id,
              activityType: activity.activity_type as ActivityType,
              timestamp: activity.timestamp,
              data: activity.data, // JSONB data field
              description: activity.description || '',
              completionPercentage: activity.completion_percentage,
              status: activity.status as TaskStatus | undefined,
              notificationsSent: activity.notifications_sent || false,
              notifiedAt: activity.notified_at,
              createdAt: activity.created_at,
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
            taskReference: task.task_reference || undefined,
            billingStatus: (task.billing_status || "non_billable") as BillingStatus,
            priority: task.priority,
            category: task.category,
            dueDate: task.due_date,
            status: (task.current_status || 'new') as TaskStatus,
            completionPercentage: task.completion_percentage,
            assignedTo: task.assigned_to || [],
            assignedBy: task.assigned_by,
            location: task.location,
            attachments: task.attachments || [],
            starredByUsers: task.starred_by_users || [],
            // Legacy fields for backward compatibility (derived from status)
            acceptedBy: task.accepted_by || undefined,
            acceptedAt: task.accepted_at || undefined,
            declinedReason: task.decline_reason || undefined,
            reviewedBy: task.reviewed_by || undefined,
            reviewedAt: task.reviewed_at || undefined,
            cancelledAt: task.cancelled_at || null,
            cancelledBy: task.cancelled_by || undefined,
            createdAt: task.created_at,
            updatedAt: task.updated_at,
            activities: activitiesByTaskId[task.id] || [],
            // Backward compatibility: also populate updates from activities for now
            updates: (activitiesByTaskId[task.id] || [])
              .filter((activity: TaskActivity) => 
                activity.activityType === 'progress_update' || activity.activityType === 'status_change'
              )
              .map((activity: TaskActivity) => ({
                id: activity.id,
                description: activity.description,
                photos: (activity.data as any)?.photos || [],
                completionPercentage: activity.completionPercentage || 0,
                status: activity.status || 'not_started' as TaskStatus,
                timestamp: activity.timestamp,
                userId: activity.userId,
              })),
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
            status: t.status
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
              status: testTask.status
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

          // Fix existing self-assigned tasks that are at 100% but not yet auto-accepted
          // This handles tasks that were completed before the auto-accept logic was added
          const tasksToFix: Array<{ id: string; assignedBy: string }> = [];
          
          transformedTasks.forEach(task => {
            if (task.completionPercentage === 100 && 
                task.status !== "approved" && 
                task.status !== "submitted_for_review") {
              const assignedBy = task.assignedBy;
              const assignedTo = task.assignedTo || [];
              
              // Check if truly self-assigned: creator is the only assignee
              const isSelfAssigned = assignedBy && 
                                    assignedTo.length === 1 && 
                                    String(assignedTo[0]) === String(assignedBy);
              
              if (isSelfAssigned) {
                tasksToFix.push({ id: task.id, assignedBy });
              }
            }
          });
          
          // Auto-accept tasks that need fixing
          if (tasksToFix.length > 0 && supabase) {
            console.log(`🔧 Fixing ${tasksToFix.length} self-assigned tasks that should be auto-accepted...`);
            for (const taskToFix of tasksToFix) {
              try {
                await supabase
                  .from('tasks')
                  .update({
                    review_accepted: true,
                    reviewed_by: taskToFix.assignedBy,
                    reviewed_at: new Date().toISOString(),
                  })
                  .eq('id', taskToFix.id);
                
                // Update local state
                const fixedTask = transformedTasks.find(t => t.id === taskToFix.id);
                if (fixedTask) {
                  fixedTask.status = "approved" as TaskStatus;
                  fixedTask.reviewedBy = taskToFix.assignedBy;
                  fixedTask.reviewedAt = new Date().toISOString();
                }
                console.log(`✅ Fixed self-assigned task: ${taskToFix.id}`);
              } catch (error) {
                console.error(`❌ Error fixing task ${taskToFix.id}:`, error);
              }
            }
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

          // Fetch task activities for tasks in this project (unified table)
          const taskIds = (allTasksData || []).map(t => t.id);
          const { data: taskActivitiesData, error: taskActivitiesError } = taskIds.length > 0
            ? await supabase
                .from('task_activities')
                .select('*')
                .in('task_id', taskIds)
                .order('timestamp', { ascending: true })
            : { data: [], error: null };

          if (taskActivitiesError) throw taskActivitiesError;

          // Group task activities by task_id and transform to TaskActivity format
          const activitiesByTaskId: { [key: string]: TaskActivity[] } = {};
          (taskActivitiesData || []).forEach((activity: any) => {
            const taskId = activity.task_id;
            if (!activitiesByTaskId[taskId]) {
              activitiesByTaskId[taskId] = [];
            }
            activitiesByTaskId[taskId].push({
              id: activity.id,
              taskId: activity.task_id,
              userId: activity.user_id,
              activityType: activity.activity_type as ActivityType,
              timestamp: activity.timestamp,
              data: activity.data,
              description: activity.description || '',
              completionPercentage: activity.completion_percentage,
              status: activity.status as TaskStatus | undefined,
              notificationsSent: activity.notifications_sent || false,
              notifiedAt: activity.notified_at,
              createdAt: activity.created_at,
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
            taskReference: task.task_reference || undefined,
            billingStatus: (task.billing_status || "non_billable") as BillingStatus,
            priority: task.priority,
            category: task.category,
            dueDate: task.due_date,
            status: (task.current_status || 'new') as TaskStatus,
            completionPercentage: task.completion_percentage,
            assignedTo: task.assigned_to || [],
            assignedBy: task.assigned_by,
            location: task.location,
            attachments: task.attachments || [],
            starredByUsers: task.starred_by_users || [],
            // Legacy fields for backward compatibility (derived from status)
            acceptedBy: task.accepted_by || undefined,
            acceptedAt: task.accepted_at || undefined,
            declinedReason: task.decline_reason || undefined,
            reviewedBy: task.reviewed_by || undefined,
            reviewedAt: task.reviewed_at || undefined,
            createdAt: task.created_at,
            updatedAt: task.updated_at,
            activities: activitiesByTaskId[task.id] || [],
            // Backward compatibility: also populate updates from activities
            updates: (activitiesByTaskId[task.id] || [])
              .filter((activity: TaskActivity) => 
                activity.activityType === 'progress_update' || activity.activityType === 'status_change'
              )
              .map((activity: TaskActivity) => ({
                id: activity.id,
                description: activity.description,
                photos: (activity.data as any)?.photos || [],
                completionPercentage: activity.completionPercentage || 0,
                status: activity.status || 'not_started' as TaskStatus,
                timestamp: activity.timestamp,
                userId: activity.userId,
              })),
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
          // Fetch task activities for tasks in this project (unified table)
          const { data: taskActivitiesData, error: taskActivitiesError } = taskIds.length > 0
            ? await supabase
                .from('task_activities')
                .select('*')
                .in('task_id', taskIds)
                .order('timestamp', { ascending: true })
            : { data: [], error: null };

          if (taskActivitiesError) throw taskActivitiesError;

          // Group task activities by task_id and transform to TaskActivity format
          const activitiesByTaskId: { [key: string]: TaskActivity[] } = {};
          (taskActivitiesData || []).forEach((activity: any) => {
            const taskId = activity.task_id;
            if (!activitiesByTaskId[taskId]) {
              activitiesByTaskId[taskId] = [];
            }
            activitiesByTaskId[taskId].push({
              id: activity.id,
              taskId: activity.task_id,
              userId: activity.user_id,
              activityType: activity.activity_type as ActivityType,
              timestamp: activity.timestamp,
              data: activity.data,
              description: activity.description || '',
              completionPercentage: activity.completion_percentage,
              status: activity.status as TaskStatus | undefined,
              notificationsSent: activity.notifications_sent || false,
              notifiedAt: activity.notified_at,
              createdAt: activity.created_at,
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
            taskReference: task.task_reference || undefined,
            billingStatus: (task.billing_status || "non_billable") as BillingStatus,
            priority: task.priority,
            category: task.category,
            dueDate: task.due_date,
            status: (task.current_status || 'new') as TaskStatus,
            completionPercentage: task.completion_percentage,
            assignedTo: task.assigned_to,
            assignedBy: task.assigned_by,
            location: task.location,
            attachments: task.attachments || [],
            starredByUsers: task.starred_by_users || [],
            // Legacy fields for backward compatibility (derived from status)
            acceptedBy: task.accepted_by || undefined,
            acceptedAt: task.accepted_at || undefined,
            declinedReason: task.decline_reason || undefined,
            reviewedBy: task.reviewed_by || undefined,
            reviewedAt: task.reviewed_at || undefined,
            createdAt: task.created_at,
            updatedAt: task.updated_at,
            activities: activitiesByTaskId[task.id] || [],
            // Backward compatibility: also populate updates from activities
            updates: (activitiesByTaskId[task.id] || [])
              .filter((activity: TaskActivity) => 
                activity.activityType === 'progress_update' || activity.activityType === 'status_change'
              )
              .map((activity: TaskActivity) => ({
                id: activity.id,
                description: activity.description,
                photos: (activity.data as any)?.photos || [],
                completionPercentage: activity.completionPercentage || 0,
                status: activity.status || 'new' as TaskStatus,
                timestamp: activity.timestamp,
                userId: activity.userId,
              })),
            children: (nestedTasksByParent[task.id] || []).map((st: any) => ({
              id: st.id,
              parentTaskId: st.parent_task_id,
              parentSubTaskId: st.parent_sub_task_id,
              projectId: st.project_id,
              title: st.title,
              description: st.description,
              taskReference: st.task_reference || undefined,
              priority: st.priority,
              category: st.category,
              dueDate: st.due_date,
              status: (st.current_status || 'new') as TaskStatus,
              completionPercentage: st.completion_percentage,
              assignedTo: st.assigned_to || [],
              assignedBy: st.assigned_by,
              attachments: st.attachments || [],
              // Legacy fields for backward compatibility (derived from status)
              acceptedBy: st.accepted_by || undefined,
              acceptedAt: st.accepted_at || undefined,
              declinedReason: st.decline_reason || undefined,
              reviewedBy: st.reviewed_by || undefined,
              reviewedAt: st.reviewed_at || undefined,
              createdAt: st.created_at,
              updatedAt: st.updated_at,
              activities: activitiesByTaskId[st.id] || [],
            // Backward compatibility: also populate updates from activities
            updates: (activitiesByTaskId[st.id] || [])
              .filter((activity: TaskActivity) => 
                activity.activityType === 'progress_update' || activity.activityType === 'status_change'
              )
              .map((activity: TaskActivity) => ({
                id: activity.id,
                description: activity.description,
                photos: (activity.data as any)?.photos || [],
                completionPercentage: activity.completionPercentage || 0,
                status: activity.status || 'new' as TaskStatus,
                timestamp: activity.timestamp,
                userId: activity.userId,
              })),
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
          // Fetch task data (exclude cancelled tasks)
          const { data: taskData, error: taskError } = await supabase
            .from('tasks')
            .select('*')
            .eq('id', id)
            .is('cancelled_at', null) // Only fetch non-cancelled tasks
            .single();

          if (taskError) throw taskError;

          // Fetch task activities (unified table)
          const { data: activitiesData, error: activitiesError } = await supabase
            .from('task_activities')
            .select('*')
            .eq('task_id', id)
            .order('timestamp', { ascending: true });

          if (activitiesError) {
            console.error('Error fetching task activities:', activitiesError);
            // Continue without activities rather than failing completely
          }

          // Transform activities data to TaskActivity format
          const transformedActivities: TaskActivity[] = (activitiesData || []).map(activity => ({
            id: activity.id,
            taskId: activity.task_id,
            userId: activity.user_id,
            activityType: activity.activity_type as ActivityType,
            timestamp: activity.timestamp,
            data: activity.data,
            description: activity.description || '',
            completionPercentage: activity.completion_percentage,
            status: activity.status as TaskStatus | undefined,
            notificationsSent: activity.notifications_sent || false,
            notifiedAt: activity.notified_at,
            createdAt: activity.created_at,
          }));

          // Backward compatibility: also create updates array from activities
          const transformedUpdates = transformedActivities
            .filter((activity: TaskActivity) => 
              activity.activityType === 'progress_update' || activity.activityType === 'status_change'
            )
            .map((activity: TaskActivity) => ({
              id: activity.id,
              userId: activity.userId,
              description: activity.description,
              photos: (activity.data as any)?.photos || [],
              completionPercentage: activity.completionPercentage || 0,
              status: activity.status || 'not_started' as TaskStatus,
              timestamp: activity.timestamp,
            }));

          // Transform Supabase data to match local interface
          const transformedTask = {
            id: taskData.id,
            projectId: taskData.project_id,
            title: taskData.title,
            description: taskData.description,
            taskReference: taskData.task_reference || undefined,
            billingStatus: (taskData.billing_status || "non_billable") as BillingStatus,
            priority: taskData.priority,
            category: taskData.category,
            dueDate: taskData.due_date,
            status: (taskData.current_status || 'new') as TaskStatus,
            completionPercentage: taskData.completion_percentage,
            assignedTo: taskData.assigned_to,
            assignedBy: taskData.assigned_by,
            location: taskData.location,
            attachments: taskData.attachments || [],
            // Legacy fields for backward compatibility (derived from status)
            acceptedBy: taskData.accepted_by || undefined,
            acceptedAt: taskData.accepted_at || undefined,
            declinedReason: taskData.decline_reason || undefined,
            reviewedBy: taskData.reviewed_by || undefined,
            reviewedAt: taskData.reviewed_at || undefined,
            // Starring
            starredByUsers: taskData.starred_by_users || [],
            cancelledAt: taskData.cancelled_at || null,
            cancelledBy: taskData.cancelled_by || undefined,
            createdAt: taskData.created_at,
            updatedAt: taskData.updated_at,
            activities: transformedActivities,
            updates: transformedUpdates, // Backward compatibility
            children: [],
            // Edit history and notifications
            hasUnreadChanges: taskData.has_unread_changes || false,
            lastEditedAt: taskData.last_edited_at || undefined,
          };

          // Update the task in the store (add if doesn't exist)
          set(state => {
            const existingTaskIndex = state.tasks.findIndex(task => task.id === id);
            if (existingTaskIndex >= 0) {
              // Update existing task
              return {
                tasks: state.tasks.map(task => 
                  task.id === id ? transformedTask : task
                )
              };
            } else {
              // Add new task if it doesn't exist
              return {
                tasks: [...state.tasks, transformedTask]
              };
            }
          });

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
            status: "new" as TaskStatus,
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
          const isCreatorAssigned = taskData.assignedTo && taskData.assignedTo.includes(taskData.assignedBy);
          
          console.log('📋 [createTask] Creating task with data:', {
            project_id: taskData.projectId,
            title: taskData.title,
            assigned_to: taskData.assignedTo,
            assigned_by: taskData.assignedBy,
            billing_status: taskData.billingStatus || "non_billable",
          });
          
          const { data, error } = await supabase
            .from('tasks')
            .insert({
              project_id: taskData.projectId,
              title: taskData.title,
              description: taskData.description,
              task_reference: taskData.taskReference || null,
              billing_status: taskData.billingStatus || "non_billable",
              priority: taskData.priority,
              category: taskData.category,
              due_date: taskData.dueDate,
              current_status: "new",
              completion_percentage: 0,
              assigned_to: taskData.assignedTo,
              assigned_by: taskData.assignedBy,
              attachments: taskData.attachments || [],
              // Auto-accept if creator is assigned to the task
              accepted: isCreatorAssigned ? true : false,
              accepted_by: isCreatorAssigned ? taskData.assignedBy : null,
              accepted_at: isCreatorAssigned ? new Date().toISOString() : null,
            })
            .select()
            .single();

          if (error) {
            console.error('❌ [createTask] Database error:', error);
            console.error('❌ [createTask] Error details:', JSON.stringify(error, null, 2));
            throw error;
          }

          // Transform Supabase data to match local interface
          const transformedTask = {
            id: data.id,
            projectId: data.project_id,
            title: data.title,
            description: data.description,
            taskReference: data.task_reference || undefined,
            billingStatus: (data.billing_status || "non_billable") as BillingStatus,
            priority: data.priority,
            category: data.category,
            dueDate: data.due_date,
            status: (data.current_status || 'new') as TaskStatus,
            completionPercentage: data.completion_percentage,
            assignedTo: data.assigned_to,
            assignedBy: data.assigned_by,
            location: data.location,
            attachments: data.attachments || [],
            // Legacy fields for backward compatibility (derived from status)
            acceptedBy: data.accepted_by || undefined,
            acceptedAt: data.accepted_at || undefined,
            declinedReason: data.decline_reason || undefined,
            reviewedBy: data.reviewed_by || undefined,
            reviewedAt: data.reviewed_at || undefined,
            starredByUsers: data.starred_by_users || [],
            createdAt: data.created_at,
            updatedAt: data.updated_at,
            updates: [], // New task has no updates yet
            children: [],
          };

          // Update local state
          set(state => ({
            tasks: [...state.tasks, transformedTask],
            isLoading: false,
          }));

          // Get creator's name to include in update
          const creatorName = await (async () => {
            try {
              const { data } = await supabase
                .from('users')
                .select('name')
                .eq('id', taskData.assignedBy)
                .single();
              return data?.name || 'Unknown User';
            } catch {
              return 'Unknown User';
            }
          })();

          // Create a creation activity entry (unified table)
          const creationData = {
            title: taskData.title,
            assignedTo: taskData.assignedTo,
            assignedBy: taskData.assignedBy,
          };

          await supabase
            .from('task_activities')
            .insert({
              task_id: data.id,
              user_id: taskData.assignedBy,
              activity_type: 'creation' as ActivityType,
              timestamp: new Date().toISOString(),
              data: creationData,
              description: `Task created by ${creatorName}`,
              completion_percentage: 0,
              status: "new",
            });

          // If task is auto-accepted (creator is assigned), also log acceptance as status_change
          if (isCreatorAssigned) {
            const statusChangeData = {
              fromStatus: "new" as TaskStatus,
              toStatus: "in_progress" as TaskStatus,
              reason: `Task auto-accepted by ${creatorName}`,
            };

            if (!supabase) throw new Error('Supabase not configured');
            
            await supabase
              .from('task_activities')
              .insert({
                task_id: data.id,
                user_id: taskData.assignedBy,
                activity_type: 'status_change' as ActivityType,
                timestamp: new Date().toISOString(),
                data: statusChangeData,
                description: `Task accepted by ${creatorName}`,
                completion_percentage: 0,
                status: "in_progress",
              });
          }

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
          
          // Track ALL task edits for audit logging (not just after acceptance)
          // Extract editReason from updates if provided (will be removed from updateData before saving)
          const editReason = (updates as any)._editReason as string | undefined;
          
          // Store old task state for comparison (deep copy)
          const oldTaskState = currentTask ? JSON.parse(JSON.stringify(currentTask)) : null;
          
          // Auto-accept self-assigned tasks when they reach 100%
          // IMPORTANT: Only auto-accept if task is TRULY self-assigned (creator = assignee)
          // Use String() comparison to handle type mismatches
          if (currentTask && updates.completionPercentage === 100) {
            const assignedBy = currentTask.assignedBy;
            const assignedTo = currentTask.assignedTo || [];
            
            // Check if truly self-assigned: creator is the only assignee
            const isSelfAssigned = assignedBy && 
                                  assignedTo.length === 1 && 
                                  String(assignedTo[0]) === String(assignedBy);
            
            // Only auto-accept if:
            // 1. Task is truly self-assigned
            // 2. status is not already "approved" (don't override existing review)
            // 3. status is not "submitted_for_review" (don't auto-accept if already submitted for review)
            if (isSelfAssigned && 
                currentTask.status !== "approved" && 
                currentTask.status !== "submitted_for_review" &&
                (updates.status === undefined || updates.status !== "approved")) {
              console.log('✅ Auto-accepting self-assigned task:', currentTask.id);
              updates.status = "approved" as TaskStatus;
              updates.reviewedBy = currentTask.assignedBy;
              updates.reviewedAt = new Date().toISOString();
            } else if (isSelfAssigned && currentTask.status === "submitted_for_review") {
              console.log('⚠️ Task is self-assigned but status is submitted_for_review - skipping auto-accept');
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
          
          // Prepare data for backend (exclude internal fields like _editReason)
          const updateData: any = {};
          // Remove internal fields that shouldn't be saved
          const { _editReason, ...cleanUpdates } = updates as any;
          
          if (cleanUpdates.title) updateData.title = cleanUpdates.title;
          if (cleanUpdates.description) updateData.description = cleanUpdates.description;
          if (cleanUpdates.taskReference !== undefined) updateData.task_reference = cleanUpdates.taskReference || null;
          if (cleanUpdates.billingStatus !== undefined) updateData.billing_status = cleanUpdates.billingStatus || "non_billable";
          if (cleanUpdates.priority) updateData.priority = cleanUpdates.priority;
          if (cleanUpdates.category) updateData.category = cleanUpdates.category;
          if (cleanUpdates.dueDate) updateData.due_date = cleanUpdates.dueDate;
          if (cleanUpdates.assignedTo) updateData.assigned_to = cleanUpdates.assignedTo;
          if (cleanUpdates.attachments) updateData.attachments = cleanUpdates.attachments;
          // Legacy accepted field - map to status if needed
          if ('accepted' in cleanUpdates && cleanUpdates.accepted === true && !cleanUpdates.status) {
            updateData.current_status = 'in_progress';
            updateData.accepted = true;
          } else if ('accepted' in cleanUpdates && cleanUpdates.accepted === false) {
            updateData.accepted = false;
          }
          if (cleanUpdates.acceptedBy !== undefined) updateData.accepted_by = cleanUpdates.acceptedBy || null;
          if (cleanUpdates.acceptedAt !== undefined) updateData.accepted_at = cleanUpdates.acceptedAt || null;
          // Handle declineReason: can be set to clear it (undefined) or set a new value
          if ('declineReason' in cleanUpdates) updateData.decline_reason = cleanUpdates.declineReason || null;
          // Unified status field
          if (cleanUpdates.status) updateData.current_status = cleanUpdates.status;
          if (cleanUpdates.completionPercentage !== undefined) updateData.completion_percentage = cleanUpdates.completionPercentage;
          if (cleanUpdates.starredByUsers !== undefined) updateData.starred_by_users = cleanUpdates.starredByUsers;
          // Legacy status fields (for backward compatibility with database)
          if ('acceptedBy' in cleanUpdates) updateData.accepted_by = cleanUpdates.acceptedBy || null;
          if ('acceptedAt' in cleanUpdates) updateData.accepted_at = cleanUpdates.acceptedAt || null;
          if ('declinedReason' in cleanUpdates || 'declinedReason' in cleanUpdates) updateData.decline_reason = (cleanUpdates as any).declinedReason || (cleanUpdates as any).declineReason || null;
          if ('readyForReview' in cleanUpdates) updateData.ready_for_review = (cleanUpdates as any).readyForReview;
          if ('reviewedBy' in cleanUpdates) updateData.reviewed_by = cleanUpdates.reviewedBy || null;
          if ('reviewedAt' in cleanUpdates) updateData.reviewed_at = cleanUpdates.reviewedAt || null;
          if ('reviewAccepted' in cleanUpdates) updateData.review_accepted = (cleanUpdates as any).reviewAccepted;
          // Edit history and notifications
          if (cleanUpdates.hasUnreadChanges !== undefined) updateData.has_unread_changes = cleanUpdates.hasUnreadChanges;
          if (cleanUpdates.lastEditedAt) updateData.last_edited_at = cleanUpdates.lastEditedAt;

          // Send update to backend
          const { error } = await supabase
            .from('tasks')
            .update(updateData)
            .eq('id', id);

          if (error) throw error;

          // Success - backend confirmed the update
          console.log(`✅ [Optimistic Update] Backend confirmed update for task ${id}`);
          
          // Mark as not loading immediately to restore UI responsiveness
          set({ isLoading: false });
          
          // Track ALL task edits for audit logging (run in background - don't block UI)
          // Skip tracking if this is a status change workflow action (status_change activities handle those)
          const isStatusChange = cleanUpdates.status && oldTaskState && oldTaskState.status !== cleanUpdates.status;
          const shouldTrackEdit = oldTaskState && !isStatusChange;
          
          if (shouldTrackEdit) {
            // Run tracking and notification in background without blocking the UI
            (async () => {
              try {
                // Only creator can edit, so use assignedBy as the editor ID
                const editorId = oldTaskState.assignedBy;
                
                // Get updated task state for comparison (use the optimistically updated state)
                const updatedTask = get().tasks.find(t => t.id === id);
                if (updatedTask && editorId) {
                  // Compare old task state with the full updated task state
                  await get().trackTaskEdit(id, editorId, oldTaskState, updatedTask, editReason);
                  
                  // Notify assignees of changes (only if task is accepted/in_progress)
                  const isEditAfterAcceptance = (oldTaskState.status === "accepted" || oldTaskState.status === "in_progress");
                  if (isEditAfterAcceptance) {
                    await get().notifyTaskEdit(id, editorId, cleanUpdates);
                  }
                }
              } catch (trackError) {
                console.error('Error tracking task edit:', trackError);
                // Don't fail the update if tracking fails - these are background operations
              }
            })();
          }
          
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

      // CANCEL task (soft delete - only creator can cancel)
      cancelTask: async (taskId, userId) => {
        if (!supabase) {
          console.error('Supabase not configured');
          throw new Error('Supabase not configured');
        }

        set({ isLoading: true, error: null });
        try {
          // First, verify the user is the task creator
          const task = get().tasks.find(t => t.id === taskId);
          if (!task) {
            throw new Error('Task not found');
          }

          // Check if user is the creator (assigned_by)
          if (task.assignedBy !== userId) {
            throw new Error('Only the task creator can cancel this task');
          }

          // Check if task is already cancelled
          if (task.cancelledAt) {
            throw new Error('Task is already cancelled');
          }

          // Get user who is cancelling to include their name in update
          const cancellingUser = await (async () => {
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

          // Update task with cancelled_at timestamp
          const { error } = await supabase
            .from('tasks')
            .update({
              cancelled_at: new Date().toISOString(),
              cancelled_by: userId,
              updated_at: new Date().toISOString(),
            })
            .eq('id', taskId);

          if (error) throw error;

          // Create a cancellation activity entry (unified table)
          const cancellationData = {
            reason: `Task cancelled by ${cancellingUser}`,
          };

          if (!supabase) throw new Error('Supabase not configured');
          
          await supabase
            .from('task_activities')
            .insert({
              task_id: taskId,
              user_id: userId,
              activity_type: 'cancellation' as ActivityType,
              timestamp: new Date().toISOString(),
              data: cancellationData,
              description: `Task cancelled by ${cancellingUser}`,
              completion_percentage: task.completionPercentage || 0,
              status: "cancelled",
            });

          // Update local state - remove from tasks array (since it's filtered out)
          set(state => ({
            tasks: state.tasks.filter(t => t.id !== taskId),
            isLoading: false,
          }));

          console.log(`✅ Task ${taskId} cancelled by creator ${userId}`);
        } catch (error: any) {
          console.error('Error cancelling task:', error);
          set({ 
            error: error.message, 
            isLoading: false 
          });
          throw error;
        }
      },

      // Task assignment methods
      assignTask: async (taskId, userIds) => {
        const task = get().tasks.find(t => t.id === taskId);
        if (!task) {
          throw new Error('Task not found');
        }

        // Get assigner's name (the person assigning the task)
        const assignerName = await (async () => {
          try {
            if (!supabase) return 'Unknown User';
            const { data } = await supabase
              .from('users')
              .select('name')
              .eq('id', task.assignedBy)
              .single();
            return data?.name || 'Unknown User';
          } catch {
            return 'Unknown User';
          }
        })();

        // Get assignees' names
        const assigneeNames = await Promise.all(
          userIds.map(async (userId) => {
            try {
              if (!supabase) return 'Unknown User';
              const { data } = await supabase
                .from('users')
                .select('name')
                .eq('id', userId)
                .single();
              return data?.name || 'Unknown User';
            } catch {
              return 'Unknown User';
            }
          })
        );

        const assigneesList = assigneeNames.join(', ');
        
        // Update the task assignment
        await get().updateTask(taskId, { assignedTo: userIds });

        // Create an activity entry for the assignment (unified table)
        if (!supabase) return;
        const assignmentData = {
          assignedTo: userIds,
          assignedBy: task.assignedBy,
        };

        await supabase
          .from('task_activities')
          .insert({
            task_id: taskId,
            user_id: task.assignedBy,
            activity_type: 'assignment' as ActivityType,
            timestamp: new Date().toISOString(),
            data: assignmentData,
            description: `Task assigned to ${assigneesList} by ${assignerName}`,
            completion_percentage: task.completionPercentage || 0,
            status: task.status || "new",
          });
      },

      acceptTask: async (taskId, userId) => {
        const task = get().tasks.find(t => t.id === taskId);
        if (!task) {
          throw new Error('Task not found');
        }
        
        // Prevent accepting if already declined
        if (task.status === "declined" || task.declinedReason) {
          throw new Error('Cannot accept a declined task');
        }
        
        // Prevent accepting if already accepted (first user already accepted for all)
        if (task.status === "accepted" || task.status === "in_progress") {
          console.log('Task already accepted, status:', task.status);
          return; // Silently return - task is already accepted for all users
        }
        
        await get().updateTask(taskId, { 
          status: "in_progress" as TaskStatus,
          acceptedBy: userId,
          acceptedAt: new Date().toISOString()
        });

        // Get user who is accepting to include their name in update
        const acceptingUser = await (async () => {
          try {
            if (!supabase) return 'Unknown User';
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

        // Create a status_change activity entry (unified table)
        const statusChangeData = {
          fromStatus: task.status || "new",
          toStatus: "in_progress" as TaskStatus,
          reason: `Task accepted by ${acceptingUser}`,
        };

        if (!supabase) throw new Error('Supabase not configured');
        
        await supabase
          .from('task_activities')
          .insert({
            task_id: taskId,
            user_id: userId,
            activity_type: 'status_change' as ActivityType,
            timestamp: new Date().toISOString(),
            data: statusChangeData,
            description: `Task accepted by ${acceptingUser}`,
            completion_percentage: task.completionPercentage || 0,
            status: "in_progress",
          });
      },

      declineTask: async (taskId, userId, reason) => {
        // Get the task to find the creator
        const task = get().tasks.find(t => t.id === taskId);
        if (!task) {
          throw new Error('Task not found');
        }
        
        // Prevent rejecting if already accepted (first user already accepted for all)
        if (task.status === "accepted" || task.status === "in_progress") {
          throw new Error('Cannot reject an accepted task');
        }
        
        // Prevent declining if already declined
        if (task.status === "declined" || task.declinedReason) {
          throw new Error('Task is already declined');
        }

        // Get user who is declining to include their name in update
        const decliningUser = await (async () => {
          try {
            if (!supabase) return 'Unknown User';
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

        // Mark task as declined (don't automatically reassign - let creator decide)
        await get().updateTask(taskId, { 
          status: "declined" as TaskStatus,
          declinedReason: reason,
          // Keep assignedTo as is - don't automatically reassign to creator
        });

        // Create a status_change activity entry (unified table)
        const statusChangeData = {
          fromStatus: task.status || "new",
          toStatus: "declined" as TaskStatus,
          reason: reason,
        };

        if (!supabase) throw new Error('Supabase not configured');
        
        await supabase
          .from('task_activities')
          .insert({
            task_id: taskId,
            user_id: userId, // The user who declined the task
            activity_type: 'status_change' as ActivityType,
            timestamp: new Date().toISOString(),
            data: statusChangeData,
            description: `Task declined by ${decliningUser}. Reason: ${reason}`,
            completion_percentage: task.completionPercentage || 0,
            status: "declined",
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
        const task = get().tasks.find(t => t.id === taskId);
        if (!task) {
          throw new Error('Task not found');
        }

        // Get user who is submitting for review
        const submittingUser = await (async () => {
          try {
            if (!supabase) return 'Unknown User';
            // Try to get the assignee (person who accepted the task)
            const userId = task.acceptedBy || task.assignedTo?.[0];
            if (userId) {
              const { data } = await supabase
                .from('users')
                .select('name')
                .eq('id', userId)
                .single();
              return data?.name || 'Unknown User';
            }
            return 'Unknown User';
          } catch {
            return 'Unknown User';
          }
        })();

        await get().updateTask(taskId, {
          status: "submitted_for_review" as TaskStatus
        });

        // Create a review_submission activity entry (unified table)
        const reviewSubmissionData = {
          completionPercentage: task.completionPercentage || 100,
        };

        if (!supabase) throw new Error('Supabase not configured');

        await supabase
          .from('task_activities')
          .insert({
            task_id: taskId,
            user_id: task.acceptedBy || task.assignedTo?.[0] || task.assignedBy,
            activity_type: 'review_submission' as ActivityType,
            timestamp: new Date().toISOString(),
            data: reviewSubmissionData,
            description: `Task submitted for review by ${submittingUser}`,
            completion_percentage: task.completionPercentage || 100,
            status: task.status || "in_progress",
          });
      },

      acceptTaskCompletion: async (taskId, userId) => {
        const task = get().tasks.find(t => t.id === taskId);
        if (!task) {
          throw new Error('Task not found');
        }

        // Get reviewer's name
        const reviewerName = await (async () => {
          try {
            if (!supabase) return 'Unknown User';
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

        await get().updateTask(taskId, {
          status: "approved" as TaskStatus,
          reviewedBy: userId,
          reviewedAt: new Date().toISOString(),
          completionPercentage: 100,
          starredByUsers: [] // Un-star task when accepted
        });

        // Create a review_acceptance activity entry (unified table)
        const reviewAcceptanceData = {
          reviewedBy: userId,
        };

        if (!supabase) throw new Error('Supabase not configured');

        await supabase
          .from('task_activities')
          .insert({
            task_id: taskId,
            user_id: userId,
            activity_type: 'review_acceptance' as ActivityType,
            timestamp: new Date().toISOString(),
            data: reviewAcceptanceData,
            description: `Task completion accepted by ${reviewerName}`,
            completion_percentage: 100,
            status: "approved",
          });
      },

      rejectTaskCompletion: async (taskId, userId, reason, photos = []) => {
        const task = get().tasks.find(t => t.id === taskId);
        if (!task) {
          throw new Error('Task not found');
        }

        // Get reviewer's name
        const reviewerName = await (async () => {
          try {
            if (!supabase) return 'Unknown User';
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

        await get().updateTask(taskId, {
          status: "rejected" as TaskStatus,
          reviewedBy: userId,
          reviewedAt: new Date().toISOString(),
          declinedReason: reason,
          completionPercentage: task.completionPercentage || 100, // Preserve existing completion percentage
          // Keep completion at 100% - they submitted it, just needs rework
        });

        // Create a review_rejection activity entry (unified table)
        const reviewRejectionData = {
          reviewedBy: userId,
          reason: reason,
          photos: photos || [],
        };

        if (!supabase) throw new Error('Supabase not configured');

        await supabase
          .from('task_activities')
          .insert({
            task_id: taskId,
            user_id: userId,
            activity_type: 'review_rejection' as ActivityType,
            timestamp: new Date().toISOString(),
            data: reviewRejectionData,
            description: `Task completion rejected by ${reviewerName}. Reason: ${reason}`,
            completion_percentage: task.completionPercentage || 100,
            status: "rejected",
          });
      },

      submitSubTaskForReview: async (taskId, subTaskId) => {
        await get().updateSubTask(taskId, subTaskId, {
          status: "submitted_for_review" as TaskStatus
        });
      },

      acceptSubTaskCompletion: async (taskId, subTaskId, userId) => {
        await get().updateSubTask(taskId, subTaskId, {
          status: "approved" as TaskStatus,
          reviewedBy: userId,
          reviewedAt: new Date().toISOString(),
          completionPercentage: 100,
          starredByUsers: [] // Un-star subtask when accepted
        });
      },

      rejectSubTaskCompletion: async (taskId, subTaskId, userId, reason, photos = []) => {
        // Get the current subtask to preserve its completion percentage
        const subTask = get().tasks.find(t => t.id === subTaskId);
        await get().updateSubTask(taskId, subTaskId, {
          status: "rejected" as TaskStatus,
          reviewedBy: userId,
          reviewedAt: new Date().toISOString(),
          declinedReason: reason,
          completionPercentage: subTask?.completionPercentage || 100, // Preserve existing completion percentage
          // Keep completion at 100% - they submitted it, just needs rework
          // Note: Photos are stored in the reason field for subtasks (can be enhanced later)
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
          // Note: Tasks at 100% are NOT automatically submitted for review - user must submit manually
          console.log(`⚡ [Optimistic Update] Adding update to task ${taskId} locally before backend sync`);
          set(state => ({
            tasks: state.tasks.map(task =>
              task.id === taskId
                ? { 
                    ...task, 
                    updates: [...task.updates, newUpdate],
                    completionPercentage: update.completionPercentage,
                    status: update.status,
                    updatedAt: new Date().toISOString(),
                  }
                : task
            )
          }));

          // Insert the task activity to backend (unified table)
          const activityData = {
            description: update.description,
            photos: update.photos || [],
            completionPercentage: update.completionPercentage,
            status: update.status,
          };

          const { error: updateError } = await supabase
            .from('task_activities')
            .insert({
              task_id: taskId,
              user_id: update.userId,
              activity_type: 'progress_update' as ActivityType,
              timestamp: new Date().toISOString(),
              data: activityData,
              description: update.description,
              completion_percentage: update.completionPercentage,
              status: update.status,
            });

          if (updateError) throw updateError;

          // Update the task's completion percentage and status in backend
          // Note: Tasks at 100% are NOT automatically submitted for review - user must submit manually
          const taskUpdateData: any = {
            completion_percentage: update.completionPercentage,
            current_status: update.status,
            updated_at: new Date().toISOString(),
          };
          
          const { error: taskError } = await supabase
            .from('tasks')
            .update(taskUpdateData)
            .eq('id', taskId);

          if (taskError) throw taskError;

          // Success - backend confirmed
          console.log(`✅ [Optimistic Update] Backend confirmed task update for ${taskId}`);
          
          // Refresh to get latest data from backend (including completion percentage)
          await get().fetchTaskById(taskId);
          
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
                ? { 
                    ...task, 
                    updates: [...(task.updates || []), newUpdate],
                    completionPercentage: update.completionPercentage,
                    status: update.status,
                    updatedAt: new Date().toISOString(),
                  }
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
          // Note: Tasks at 100% are NOT automatically submitted for review - user must submit manually
          console.log(`⚡ [Optimistic Update] Adding update to subtask ${subTaskId} locally before backend sync`);
          set(state => ({
            tasks: state.tasks.map(task =>
              task.id === subTaskId
                ? { 
                    ...task, 
                    updates: [...(task.updates || []), newUpdate],
                    completionPercentage: update.completionPercentage,
                    status: update.status,
                    updatedAt: new Date().toISOString(),
                  }
                : task
            )
          }));

          // Insert the task activity to backend (unified table)
          const activityData = {
            description: update.description,
            photos: update.photos || [],
            completionPercentage: update.completionPercentage,
            status: update.status,
          };

          const { error: updateError } = await supabase
            .from('task_activities')
            .insert({
              task_id: subTaskId,  // ✅ Subtasks are now tasks, use subTaskId directly
              user_id: update.userId,
              activity_type: 'progress_update' as ActivityType,
              timestamp: new Date().toISOString(),
              data: activityData,
              description: update.description,
              completion_percentage: update.completionPercentage,
              status: update.status,
            });

          if (updateError) throw updateError;

          // Update the subtask's completion percentage and status in backend
          // Note: Tasks at 100% are NOT automatically submitted for review - user must submit manually
          const subTaskUpdateData: any = {
            completion_percentage: update.completionPercentage,
            current_status: update.status,
            updated_at: new Date().toISOString(),
          };
          
          const { error: taskError } = await supabase
            .from('tasks')
            .update(subTaskUpdateData)
            .eq('id', subTaskId);

          if (taskError) throw taskError;

          // Success - backend confirmed
          console.log(`✅ [Optimistic Update] Backend confirmed subtask update for ${subTaskId}`);
          
          // Refresh to get latest data from backend (including completion percentage)
          await get().fetchTaskById(subTaskId);

        } catch (error: any) {
          console.error('❌ [Optimistic Update] Backend failed for subtask update, rolling back:', error);
          // ROLLBACK: Restore original state on failure
          set({ tasks: originalTasks });
          throw error;
        }
      },

      updateTaskStatus: async (taskId, status, completionPercentage) => {
        await get().updateTask(taskId, { 
          status: status, 
          completionPercentage 
        });
      },

      addAssignerComment: async (taskId, comment) => {
        if (!supabase) {
          console.error('Supabase not configured, cannot add assigner comment');
          throw new Error('Supabase not configured');
        }

        try {
          // Fetch current task to get completion percentage at the time of comment
          const currentTask = get().tasks.find(t => t.id === taskId);
          const completionPercentage = currentTask?.completionPercentage ?? 0;

          // Insert the assigner comment as a task activity
          const activityData = {
            description: comment.description,
            photos: comment.photos || [],
            completionPercentage: completionPercentage,
          };

          const { error: insertError } = await supabase
            .from('task_activities')
            .insert({
              task_id: taskId,
              user_id: comment.userId,
              activity_type: 'assigner_comment' as ActivityType,
              timestamp: new Date().toISOString(),
              data: activityData,
              description: comment.description,
              completion_percentage: completionPercentage, // Also store in the completion_percentage column
            });

          if (insertError) throw insertError;

          // Refresh task data to get the new activity
          await get().fetchTaskById(taskId);

          console.log(`✅ Assigner comment added to task ${taskId}`);
        } catch (error: any) {
          console.error('❌ Error adding assigner comment:', error);
          throw error;
        }
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
            status: "new" as TaskStatus,
            completionPercentage: 0,
            updates: [], // New subtask has no updates yet
            delegationHistory: [],
            originalAssignedBy: subTaskData.assignedBy,
          };

          set(state => ({
            tasks: state.tasks.map(task =>
              task.id === taskId
                ? { ...task, children: [...(task.children || []), newSubTask] }
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
              task_reference: subTaskData.taskReference || null,
              billing_status: subTaskData.billingStatus || null,
              priority: subTaskData.priority,
              category: subTaskData.category,
              due_date: subTaskData.dueDate,
              current_status: "new",
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
              taskReference: data.task_reference || undefined,
              priority: data.priority,
              category: data.category,
              dueDate: data.due_date,
              status: (data.current_status || 'new') as TaskStatus,
              completionPercentage: data.completion_percentage,
              assignedTo: data.assigned_to || [],
              assignedBy: data.assigned_by,
              location: data.location,
              attachments: data.attachments || [],
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
            status: "new" as TaskStatus,
            completionPercentage: 0,
            updates: [], // New nested subtask has no updates yet
            delegationHistory: [],
            originalAssignedBy: subTaskData.assignedBy,
          };

          set(state => ({
            tasks: state.tasks.map(task =>
              task.id === taskId
                ? { ...task, children: [...(task.children || []), newSubTask] }
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
              task_reference: subTaskData.taskReference || null,
              billing_status: subTaskData.billingStatus || null,
              priority: subTaskData.priority,
              category: subTaskData.category,
              due_date: subTaskData.dueDate,
              current_status: "new",
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
              taskReference: data.task_reference || undefined,
              priority: data.priority,
              category: data.category,
              dueDate: data.due_date,
              status: (data.current_status || 'new') as TaskStatus,
              completionPercentage: data.completion_percentage,
              assignedTo: data.assigned_to || [],
              assignedBy: data.assigned_by,
              location: data.location,
              attachments: data.attachments || [],
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
                    children: task.children?.map(subTask =>
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
          // IMPORTANT: Only auto-accept if subtask is TRULY self-assigned (creator = assignee)
          // Use String() comparison to handle type mismatches
          if (currentSubTask && updates.completionPercentage === 100) {
            const assignedBy = currentSubTask.assignedBy;
            const assignedTo = currentSubTask.assignedTo || [];
            
            // Check if truly self-assigned: creator is the only assignee
            const isSelfAssigned = assignedBy && 
                                  assignedTo.length === 1 && 
                                  String(assignedTo[0]) === String(assignedBy);
            
            // Only auto-accept if:
            // 1. Subtask is truly self-assigned
            // 2. Status is not already approved (don't override existing review)
            // 3. Status is not submitted_for_review (don't auto-accept if already submitted for review)
            if (isSelfAssigned && 
                updates.status !== "approved" && 
                currentSubTask.status !== "submitted_for_review") {
              console.log('✅ Auto-accepting self-assigned subtask:', subTaskId);
              updates.status = "approved" as TaskStatus;
              updates.reviewedBy = currentSubTask.assignedBy;
              updates.reviewedAt = new Date().toISOString();
            } else if (isSelfAssigned && currentSubTask.status === "submitted_for_review") {
              console.log('⚠️ Subtask is self-assigned but status is submitted_for_review - skipping auto-accept');
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
          if (updates.taskReference !== undefined) updateData.task_reference = updates.taskReference || null;
          if (updates.billingStatus !== undefined) updateData.billing_status = updates.billingStatus || "non_billable";
          // Legacy accepted field - map to status if needed
          if ('accepted' in updates && (updates as any).accepted === true && !updates.status) {
            updateData.current_status = 'in_progress';
            updateData.accepted = true;
          } else if ('accepted' in updates) {
            updateData.accepted = (updates as any).accepted;
          }
          if ('declinedReason' in updates || 'declineReason' in updates) {
            updateData.decline_reason = (updates as any).declinedReason || (updates as any).declineReason || null;
          }
          if (updates.status) updateData.current_status = updates.status;
          if (updates.completionPercentage !== undefined) updateData.completion_percentage = updates.completionPercentage;
          // Review workflow fields (legacy - map to status if needed)
          if ('readyForReview' in updates && (updates as any).readyForReview === true && !updates.status) {
            updateData.current_status = 'submitted_for_review';
            updateData.ready_for_review = true;
          } else if ('readyForReview' in updates) {
            updateData.ready_for_review = (updates as any).readyForReview;
          }
          if (updates.reviewedBy) updateData.reviewed_by = updates.reviewedBy;
          if (updates.reviewedAt) updateData.reviewed_at = updates.reviewedAt;
          if ('reviewAccepted' in updates && (updates as any).reviewAccepted === true && !updates.status) {
            updateData.current_status = 'approved';
            updateData.review_accepted = true;
          } else if ('reviewAccepted' in updates) {
            updateData.review_accepted = (updates as any).reviewAccepted;
          }

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
          status: status, 
          completionPercentage 
        });
      },

      acceptSubTask: async (taskId, subTaskId, userId) => {
        await get().updateSubTask(taskId, subTaskId, { 
          status: "in_progress" as TaskStatus,
          acceptedBy: userId,
          acceptedAt: new Date().toISOString()
        });
      },

      declineSubTask: async (taskId, subTaskId, userId, reason) => {
        // Get the parent task and find the subtask
        const task = get().tasks.find(t => t.id === taskId);
        if (!task) return;

        const findSubTask = (children: any[] | undefined, id: string): any => {
          if (!children) return null;
          for (const st of children) {
            if (st.id === id) return st;
            if (st.children) {
              const found = findSubTask(st.children, id);
              if (found) return found;
            }
          }
          return null;
        };

        const subTask = findSubTask(task.children, subTaskId);
        if (!subTask) return;

        // Get user who is rejecting to include their name in update
        const rejectingUser = await (async () => {
          try {
            if (!supabase) return 'Unknown User';
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
          status: "rejected" as TaskStatus,
          declinedReason: reason,
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
            { userId, taskId, isRead: true, readAt: new Date().toISOString() }
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
          new Date(task.dueDate) < now && task.status !== 'approved'
        );
        if (projectId) {
          tasks = tasks.filter(task => task.projectId === projectId);
        }
        return tasks;
      },

      getTasksByStatus: (status, projectId) => {
        let tasks = get().tasks.filter(task => task.status === status);
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

      // Track task edit for audit logging
      trackTaskEdit: async (taskId, userId, oldTask, newTask, editReason) => {
        if (!supabase) {
          console.warn('Supabase not configured - cannot track task edit');
          return;
        }

        const changes: Record<string, { old: any; new: any }> = {};

        // Compare and track changes for editable fields
        const fieldsToTrack = [
          'title',
          'description',
          'dueDate',
          'priority',
          'category',
          'billingStatus',
          'assignedTo',
          'taskReference',
        ];

        fieldsToTrack.forEach((field) => {
          const oldValue = (oldTask as any)[field];
          const newValue = (newTask as any)[field];

          // Skip if new value is undefined (field wasn't updated)
          if (newValue === undefined) return;

          // Handle arrays (assignedTo)
          if (Array.isArray(oldValue) && Array.isArray(newValue)) {
            const oldSorted = [...oldValue].sort().join(',');
            const newSorted = [...newValue].sort().join(',');
            if (oldSorted !== newSorted) {
              changes[field] = { old: oldValue, new: newValue };
            }
          } else if (oldValue !== newValue) {
            // Handle date strings (normalize for comparison)
            if (field === 'dueDate') {
              const oldDate = oldValue ? new Date(oldValue).toISOString() : null;
              const newDate = newValue ? new Date(newValue).toISOString() : null;
              if (oldDate !== newDate) {
                changes[field] = { old: oldValue, new: newValue };
              }
            } else {
              changes[field] = { old: oldValue, new: newValue };
            }
          }
        });

        // Only log if there are actual changes
        if (Object.keys(changes).length === 0) {
          console.log('No changes detected, skipping edit history entry');
          return;
        }

        // Helper function to format field values for display
        const formatFieldValue = (field: string, value: any): string => {
          if (value === null || value === undefined || value === '') {
            return 'none';
          }
          
          switch (field) {
            case 'priority':
            case 'category':
            case 'billingStatus':
              const str = String(value);
              return str.charAt(0).toUpperCase() + str.slice(1).replace(/_/g, ' ');
            case 'dueDate':
              if (value) {
                try {
                  const date = new Date(value);
                  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                } catch {
                  return String(value);
                }
              }
              return 'none';
            case 'assignedTo':
              if (Array.isArray(value)) {
                if (value.length === 0) return 'none';
                return value.length === 1 ? '1 user' : `${value.length} users`;
              }
              return 'none';
            case 'title':
            case 'description':
            case 'taskReference':
              const text = String(value).trim();
              return text || 'none';
            default:
              return String(value) || 'none';
          }
        };

        // Generate descriptive change messages
        const changeDescriptions: string[] = [];
        Object.entries(changes).forEach(([field, change]) => {
          const fieldName = field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1').trim();
          const oldValue = formatFieldValue(field, change.old);
          const newValue = formatFieldValue(field, change.new);
          changeDescriptions.push(`Task ${fieldName.toLowerCase()} changed from ${oldValue} to ${newValue}`);
        });

        const description = editReason || changeDescriptions.join('. ');

        try {
          // Insert into unified task_activities table
          const activityData = {
            changes: changes,
            editReason: editReason || null,
          };

          const { error } = await supabase.from('task_activities').insert({
            task_id: taskId,
            user_id: userId,
            activity_type: 'metadata_edit' as ActivityType,
            timestamp: new Date().toISOString(),
            data: activityData,
            description: description,
            notifications_sent: false,
          });

          if (error) {
            console.error('Error tracking task edit:', error);
            // Don't throw - edit should still succeed even if logging fails
          } else {
            console.log(`✅ Task edit tracked for task ${taskId}:`, Object.keys(changes));
          }
        } catch (error: any) {
          console.error('Exception tracking task edit:', error);
          // Don't throw - edit should still succeed even if logging fails
        }
      },

      // Fetch task edit history (from unified task_activities table)
      fetchTaskEditHistory: async (taskId: string): Promise<TaskEditHistory[]> => {
        if (!supabase) {
          console.warn('Supabase not configured - cannot fetch edit history');
          return [];
        }

        try {
          // Fetch metadata_edit activities from unified table
          const { data, error } = await supabase
            .from('task_activities')
            .select('*')
            .eq('task_id', taskId)
            .eq('activity_type', 'metadata_edit')
            .order('timestamp', { ascending: false });

          if (error) {
            console.error('Error fetching task edit history:', error);
            return [];
          }

          // Transform activities data to match TaskEditHistory interface (for backward compatibility)
          const history: TaskEditHistory[] =
            data?.map((activity) => {
              const activityData = activity.data as any;
              return {
                id: activity.id,
                taskId: activity.task_id,
                editedBy: activity.user_id,
                editedAt: activity.timestamp,
                changes: activityData?.changes || {},
                editReason: activityData?.editReason || undefined,
                notificationsSent: activity.notifications_sent || false,
                notifiedAt: activity.notified_at || undefined,
                createdAt: activity.created_at,
              };
            }) || [];

          return history;
        } catch (error: any) {
          console.error('Exception fetching task edit history:', error);
          return [];
        }
      },

      // Notify assignees of task edits
      notifyTaskEdit: async (taskId, editedBy, changes) => {
        if (!supabase) return;

        const task = get().tasks.find((t) => t.id === taskId);
        if (!task) return;

        // Get assignees who should be notified (exclude the editor)
        const assignees = task.assignedTo.filter((id) => id !== editedBy);

        if (assignees.length === 0) return;

        try {
          // Mark task as having unread changes
          await get().updateTask(taskId, {
            hasUnreadChanges: true,
            lastEditedAt: new Date().toISOString(),
          });

          // Update the latest edit history entry to mark notifications as sent (from unified table)
          const { data: latestEdit } = await supabase
            .from('task_activities')
            .select('id')
            .eq('task_id', taskId)
            .eq('activity_type', 'metadata_edit')
            .order('timestamp', { ascending: false })
            .limit(1)
            .single();

          if (latestEdit) {
            await supabase
              .from('task_activities')
              .update({
                notifications_sent: true,
                notified_at: new Date().toISOString(),
              })
              .eq('id', latestEdit.id);
          }

          console.log(`✅ Notified ${assignees.length} assignee(s) of task edit`);
        } catch (error: any) {
          console.error('Error notifying task edit:', error);
          // Don't throw - notification failure shouldn't block the edit
        }
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

