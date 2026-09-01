import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  buildResourceKey,
  createQueryMeta,
  getRequestCacheEnvelope,
  invalidateResourceKeys,
  isRequestCacheExpired,
  isRequestCacheFresh,
  runSingleFlightRequest,
  supabase,
  type QueryMeta,
} from "../api/supabase";
import { getSessionScopedSupabase } from "../api/supabaseSessionGate";
import { recordDeferredFallbackFire } from "../api/deferredSchemaObservability";
import { Task, SubTask, TaskUpdate, TaskStatus, Priority, TaskReadStatus, BillingStatus, TaskEditHistory, TaskActivity, ActivityType } from "../types/buildtrack";
import { isCompletedLifecycleStatus } from "../utils/taskLifecycleStatus";
import {
  assertValidTaskCreateInput,
  resolveClientTaskStatus,
  resolveInitialTaskCreateStatus,
} from "../utils/taskCreateValidation";
import { assertValidTaskUpdate } from "../utils/taskUpdateValidation";
import {
  buildSupabaseTaskInsertPayload,
  getDeferredTaskSchemaField,
  stripDeferredTaskRuntimeFields,
  stripDeferredTaskSchemaFields,
} from "./taskDeferredSchemaCompat";
import {
  buildTaskDerivedState,
  type TaskDerivedState,
  type TaskPreview,
} from "./taskDerivedState";
import {
  isMissingProjectContainersRelation,
  normalizePersistedTasks,
  normalizeProjectLocationLabel,
  normalizeTaskActivityCompatibility,
} from "./taskNormalization";

export type { QueryMeta } from "../api/supabase";
export type { TaskDerivedState, TaskPreview } from "./taskDerivedState";
export { buildTaskDerivedState } from "./taskDerivedState";

export interface ProjectLocationRecord {
  id: string;
  projectId: string;
  label: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProjectContainerRecord {
  id: string;
  projectId: string;
  parentId?: string;
  label: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

const TASK_FRESH_MS = 15_000;
const TASK_TTL_MS = 60_000;

function isMissingTaskMetadataColumnError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "42703" || /does not exist|42703|PGRST204/i.test(error.message ?? "");
}

/** Contract TASK_LISTABLE + TASK_ASSIGNED_TO_USER — documentation/owner-task-query-contract.md §4.1–4.2 */
async function fetchListableTasksAssignedToUser(
  client: NonNullable<typeof supabase>,
  userId: string,
): Promise<{ data: Record<string, unknown>[] | null; error: { message?: string; code?: string } | null }> {
  type TaskQuery = ReturnType<typeof client.from>;
  const lifecycle = (query: TaskQuery) =>
    query
      .is("cancelled_at", null)
      .is("archived_at", null)
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

  const assignedRes = await lifecycle(
    client.from("tasks").select("*").contains("assigned_to", [userId]),
  );
  if (assignedRes.error) {
    return { data: null, error: assignedRes.error };
  }

  const primaryRes = await lifecycle(
    client.from("tasks").select("*").eq("primary_assignee_id", userId),
  );
  if (primaryRes.error) {
    if (isMissingTaskMetadataColumnError(primaryRes.error)) {
      return { data: assignedRes.data ?? [], error: null };
    }
    return { data: null, error: primaryRes.error };
  }

  const byId = new Map<string, Record<string, unknown>>();
  for (const row of [...(assignedRes.data ?? []), ...(primaryRes.data ?? [])]) {
    byId.set(String((row as { id: string }).id), row as Record<string, unknown>);
  }
  const merged = [...byId.values()].sort(
    (a, b) =>
      new Date(String(b.created_at)).getTime() - new Date(String(a.created_at)).getTime(),
  );
  return { data: merged, error: null };
}

function taskSnapshotsMatch(left: Task, right: Task): boolean {
  const leftActivityTail = left.activities?.[left.activities.length - 1]?.id;
  const rightActivityTail = right.activities?.[right.activities.length - 1]?.id;
  return (
    left.updatedAt === right.updatedAt &&
    (left.activities?.length ?? 0) === (right.activities?.length ?? 0) &&
    leftActivityTail === rightActivityTail
  );
}
interface TaskStore {
  tasks: Task[];
  archivedTasks: Task[];
  taskReadStatuses: TaskReadStatus[];
  tasksById: Record<string, Task>;
  taskPreviewById: Record<string, TaskPreview>;
  taskIdsByProject: Record<string, string[]>;
  topLevelTaskIdsByProject: Record<string, string[]>;
  childTaskIdsByParent: Record<string, string[]>;
  taskIdsByUser: Record<string, string[]>;
  taskIdsAssignedByUser: Record<string, string[]>;
  queryTaskIds: Record<string, string[]>;
  taskQueryMeta: Record<string, QueryMeta>;
  isLoading: boolean;
  error: string | null;
  // Cache timestamps for tasks (track when each task was last fetched)
  taskFetchTimestamps: Record<string, number>; // taskId -> timestamp
  // Cache timestamp for all tasks fetch
  allTasksFetchTimestamp: number | null; // When all tasks were last fetched
  setTaskQueryMeta: (resourceKey: string, updates: Partial<QueryMeta>) => void;
  beginTaskQuery: (resourceKey: string, hasCachedData: boolean, manualRefresh?: boolean) => void;
  completeTaskQuerySuccess: (resourceKey: string, payloadIds: string[]) => void;
  completeTaskQueryError: (resourceKey: string, errorMessage: string, hasCachedData: boolean) => void;
  shouldServeCachedTasks: (resourceKey: string, fallbackIds: string[], forceRefresh?: boolean) => boolean;
  shouldRefreshTasksInBackground: (resourceKey: string, fallbackIds: string[], forceRefresh?: boolean) => boolean;
  replaceTasks: (tasks: Task[]) => void;
  reconcileFetchedTasks: (tasks: Task[]) => void;
  upsertTasks: (tasks: Task[]) => void;
  mergeTask: (task: Task) => void;
  evictTaskFromCache: (taskId: string) => void;
  
  // Fetching
  fetchTasks: (forceRefresh?: boolean, options?: { background?: boolean }) => Promise<void>;
  fetchArchivedTasks: (forceRefresh?: boolean) => Promise<void>;
  fetchTasksByProject: (projectId: string, forceRefresh?: boolean, options?: { background?: boolean }) => Promise<void>;
  fetchTasksByUser: (userId: string, forceRefresh?: boolean, options?: { background?: boolean }) => Promise<void>;
  fetchTaskById: (id: string, forceRefresh?: boolean) => Promise<Task | null>;
  fetchProjectLocations: (projectId: string) => Promise<ProjectLocationRecord[]>;
  fetchProjectContainers: (projectId: string) => Promise<ProjectContainerRecord[]>;
  
  // Task management
  createTask: (task: Omit<Task, "id" | "createdAt" | "updates" | "status" | "completionPercentage">) => Promise<string>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  ensureProjectLocation: (projectId: string, label: string, createdBy?: string) => Promise<void>;
  ensureProjectContainer: (
    projectId: string,
    label: string,
    options?: { parentId?: string | null; createdBy?: string },
  ) => Promise<ProjectContainerRecord | null>;
  deleteTask: (id: string) => Promise<void>; // Legacy method - kept for backward compatibility
  deleteTaskById: (taskId: string, userId: string) => Promise<void>; // Soft delete task (only assigner can delete, maintains audit trail)
  cancelTask: (taskId: string, userId: string) => Promise<void>; // Cancel task (only creator can cancel)
  archiveTask: (taskId: string, userId: string) => Promise<void>; // Archive task (both assigner and assignee can archive when approved)
  
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
  createSubTask: (
    taskId: string,
    subTask: Omit<
      SubTask,
      "id" | "createdAt" | "parentTaskId" | "status" | "completionPercentage" | "updates"
    >,
  ) => Promise<string>;
  createNestedSubTask: (
    taskId: string,
    parentSubTaskId: string,
    subTask: Omit<
      SubTask,
      "id" | "createdAt" | "parentTaskId" | "status" | "completionPercentage" | "updates"
    >,
  ) => Promise<string>;
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
      archivedTasks: [],
      taskReadStatuses: [],
      tasksById: {},
      taskPreviewById: {},
      taskIdsByProject: {},
      topLevelTaskIdsByProject: {},
      childTaskIdsByParent: {},
      taskIdsByUser: {},
      taskIdsAssignedByUser: {},
      queryTaskIds: {},
      taskQueryMeta: {},
      isLoading: false,
      error: null,
      taskFetchTimestamps: {}, // Track when tasks were last fetched
      allTasksFetchTimestamp: null, // Track when all tasks were last fetched
      setTaskQueryMeta: (resourceKey, updates) => {
        set((state) => ({
          taskQueryMeta: {
            ...state.taskQueryMeta,
            [resourceKey]: createQueryMeta(resourceKey, {
              ...(state.taskQueryMeta[resourceKey] || {}),
              ...updates,
            }),
          },
        }));
      },
      beginTaskQuery: (resourceKey, hasCachedData, manualRefresh = false) => {
        get().setTaskQueryMeta(resourceKey, {
          hasHydratedData: hasCachedData,
          hasFetchedOnce: hasCachedData || Boolean(get().taskQueryMeta[resourceKey]?.hasFetchedOnce),
          isInitialLoading: !hasCachedData,
          isBackgroundRefreshing: hasCachedData,
          isManualRefreshing: manualRefresh,
          error: null,
        });
        set({ isLoading: !hasCachedData, error: null });
      },
      completeTaskQuerySuccess: (resourceKey, payloadIds) => {
        const envelope = getRequestCacheEnvelope(resourceKey);
        get().setTaskQueryMeta(resourceKey, {
          hasHydratedData: payloadIds.length > 0,
          hasFetchedOnce: true,
          isInitialLoading: false,
          isBackgroundRefreshing: false,
          isManualRefreshing: false,
          lastFetchedAt: envelope?.lastFetchedAt ?? null,
          lastSuccessfulFetchAt: envelope?.lastSuccessfulFetchAt ?? null,
          staleAt: envelope?.staleAt ?? null,
          expiresAt: envelope?.expiresAt ?? null,
          error: null,
          emptyStateResolved: true,
        });
        set({ isLoading: false, error: null });
      },
      completeTaskQueryError: (resourceKey, errorMessage, hasCachedData) => {
        const envelope = getRequestCacheEnvelope(resourceKey);
        get().setTaskQueryMeta(resourceKey, {
          hasHydratedData: hasCachedData,
          hasFetchedOnce: Boolean(get().taskQueryMeta[resourceKey]?.hasFetchedOnce || hasCachedData),
          isInitialLoading: false,
          isBackgroundRefreshing: false,
          isManualRefreshing: false,
          lastFetchedAt: envelope?.lastFetchedAt ?? null,
          lastSuccessfulFetchAt: envelope?.lastSuccessfulFetchAt ?? null,
          staleAt: envelope?.staleAt ?? null,
          expiresAt: envelope?.expiresAt ?? null,
          error: errorMessage,
          emptyStateResolved: hasCachedData || Boolean(get().taskQueryMeta[resourceKey]?.emptyStateResolved),
        });
        set({ isLoading: false, error: errorMessage });
      },
      shouldServeCachedTasks: (resourceKey, fallbackIds, forceRefresh = false) => {
        if (forceRefresh || fallbackIds.length === 0) {
          return false;
        }

        return isRequestCacheFresh(resourceKey);
      },
      shouldRefreshTasksInBackground: (resourceKey, fallbackIds, forceRefresh = false) => {
        if (forceRefresh || fallbackIds.length === 0) {
          return false;
        }

        const envelope = getRequestCacheEnvelope(resourceKey);
        if (!envelope) {
          return false;
        }

        return !isRequestCacheFresh(resourceKey) && !isRequestCacheExpired(resourceKey);
      },
      replaceTasks: (tasks) => {
        const normalizedTasks = tasks.map(normalizeTaskActivityCompatibility);
        set({
          tasks: normalizedTasks,
          allTasksFetchTimestamp: Date.now(),
          taskFetchTimestamps: normalizedTasks.reduce<Record<string, number>>((accumulator, task) => {
            accumulator[task.id] = Date.now();
            return accumulator;
          }, {}),
        });
      },
      reconcileFetchedTasks: (tasks) => {
        const normalizedTasks = tasks.map(normalizeTaskActivityCompatibility);
        const now = Date.now();

        set((state) => {
          const existingById = new Map(state.tasks.map((task) => [task.id, task]));
          const nextTasks = normalizedTasks.map((incoming) => {
            const previous = existingById.get(incoming.id);
            // M-DATA-05 Phase A: list fetches omit activity history — keep hydrated timeline.
            const listSlim =
              previous &&
              (incoming.activities?.length ?? 0) === 0 &&
              (previous.activities?.length ?? 0) > 0;
            const merged = listSlim
              ? {
                  ...incoming,
                  activities: previous.activities,
                  updates: previous.updates,
                }
              : incoming;
            return previous && taskSnapshotsMatch(previous, merged) ? previous : merged;
          });
          const nextTaskFetchTimestamps = nextTasks.reduce<Record<string, number>>((accumulator, task) => {
            accumulator[task.id] = now;
            return accumulator;
          }, {});

          return {
            tasks: nextTasks,
            allTasksFetchTimestamp: now,
            taskFetchTimestamps: nextTaskFetchTimestamps,
          };
        });
      },
      upsertTasks: (tasks) => {
        if (tasks.length === 0) {
          return;
        }

        const normalizedTasks = tasks.map(normalizeTaskActivityCompatibility);

        set((state) => {
          const nextTasksById = new Map(state.tasks.map((task) => [task.id, task]));

          for (const task of normalizedTasks) {
            nextTasksById.set(task.id, task);
          }

          const now = Date.now();
          const nextTaskFetchTimestamps = { ...state.taskFetchTimestamps };
          for (const task of normalizedTasks) {
            nextTaskFetchTimestamps[task.id] = now;
          }

          return {
            tasks: Array.from(nextTasksById.values()),
            taskFetchTimestamps: nextTaskFetchTimestamps,
          };
        });
      },
      mergeTask: (task) => {
        const normalizedTask = normalizeTaskActivityCompatibility(task);
        set((state) => {
          const existingIndex = state.tasks.findIndex((candidate) => candidate.id === normalizedTask.id);
          const nextTasks =
            existingIndex >= 0
              ? state.tasks.map((candidate) =>
                  candidate.id === normalizedTask.id ? normalizedTask : candidate
                )
              : [normalizedTask, ...state.tasks];

          return {
            tasks: nextTasks,
            taskFetchTimestamps: {
              ...state.taskFetchTimestamps,
              [normalizedTask.id]: Date.now(),
            },
          };
        });
      },
      evictTaskFromCache: (taskId) => {
        set((state) => {
          const cachedTask = state.tasks.find((task) => task.id === taskId);
          const { [taskId]: _removedTimestamp, ...remainingTimestamps } = state.taskFetchTimestamps;

          if (cachedTask) {
            invalidateResourceKeys([
              buildResourceKey("tasks", "all"),
              buildResourceKey("task", taskId),
              cachedTask.projectId ? buildResourceKey("tasks", "project", cachedTask.projectId) : "",
              ...(cachedTask.assignedTo || []).map((assigneeId) =>
                buildResourceKey("tasks", "user", String(assigneeId))
              ),
              cachedTask.assignedBy
                ? buildResourceKey("tasks", "assignedBy", String(cachedTask.assignedBy))
                : "",
            ]);
          } else {
            invalidateResourceKeys([
              buildResourceKey("tasks", "all"),
              buildResourceKey("task", taskId),
            ]);
          }

          return {
            tasks: state.tasks.filter((task) => task.id !== taskId),
            taskReadStatuses: state.taskReadStatuses.filter((status) => status.taskId !== taskId),
            taskFetchTimestamps: remainingTimestamps,
            allTasksFetchTimestamp: null,
          };
        });
      },

      // FETCH from Supabase
      fetchTasks: async (forceRefresh: boolean = false, options?: { background?: boolean }) => {
        const background = options?.background === true;
        const sessionClient = await getSessionScopedSupabase();
        if (!sessionClient) {
          console.warn('📊 [tasks] Skipping fetchTasks — no Supabase session (avoids anon 42501)');
          if (get().tasks.length === 0) {
            set({
              isLoading: false,
              error: 'Could not load tasks. Pull to retry.',
            });
          }
          return;
        }

        const resourceKey = buildResourceKey("tasks", "all");
        const supabaseClient = sessionClient;
        const cachedIds = get().queryTaskIds[resourceKey] || get().tasks.map((task) => task.id);
        const hasCachedData = cachedIds.length > 0;

        if (!background && get().shouldServeCachedTasks(resourceKey, cachedIds, forceRefresh)) {
          get().completeTaskQuerySuccess(resourceKey, cachedIds);
          return;
        }

        if (!background && get().shouldRefreshTasksInBackground(resourceKey, cachedIds, forceRefresh)) {
          get().beginTaskQuery(resourceKey, true);
          void get().fetchTasks(false, { background: true });
          return;
        }

        get().beginTaskQuery(resourceKey, hasCachedData);
        try {
          const result = await runSingleFlightRequest(
            resourceKey,
            async () => {
              const { data: allTasksData, error: tasksError } = await supabaseClient
                .from('tasks')
                .select('*')
                .is('cancelled_at', null)
                .is('archived_at', null)
                .is('deleted_at', null)
                .order('created_at', { ascending: false });

              if (tasksError) throw tasksError;

              // M-DATA-05 Phase A: list path skips full activity history (detail uses fetchTaskById).
              const activitiesByTaskId: { [key: string]: TaskActivity[] } = {};

              const transformedTasks = (allTasksData || []).map(task => {
                const normalizedAssignedTo = Array.isArray(task.assigned_to)
                  ? task.assigned_to.map((id: any) => String(id))
                  : [];
                const normalizedAssignedBy = task.assigned_by ? String(task.assigned_by) : '';

                return normalizeTaskActivityCompatibility({
                  id: task.id,
                  projectId: task.project_id,
                  parentTaskId: task.parent_task_id,
                  nestingLevel: task.nesting_level,
                  rootTaskId: task.root_task_id,
                  title: task.title,
                  description: task.description,
                  taskReference: task.task_reference || undefined,
                  billingStatus: (task.billing_status || "non_billable") as BillingStatus,
                  priority: task.priority,
                  category: task.category,
                  dueDate: task.due_date,
                  status: resolveClientTaskStatus(task),
                  completionPercentage: task.completion_percentage,
                  assignedTo: normalizedAssignedTo,
                  primaryAssigneeId: task.primary_assignee_id ? String(task.primary_assignee_id) : undefined,
                  delegatedUserIds: Array.isArray(task.delegated_user_ids)
                    ? task.delegated_user_ids.map((userId: unknown) => String(userId))
                    : undefined,
                  assignedBy: normalizedAssignedBy,
                  containerId: task.container_id ? String(task.container_id) : undefined,
                  subContainerId: task.sub_container_id ? String(task.sub_container_id) : undefined,
                  tags: Array.isArray(task.tags) ? task.tags.map((tag: unknown) => String(tag)) : [],
                  locationOnSite: task.location_on_site || undefined,
                  location: task.location,
                  attachments: task.attachments || [],
                  starredByUsers: task.starred_by_users || [],
                  acceptedBy: task.accepted_by || undefined,
                  acceptedAt: task.accepted_at || undefined,
                  declinedReason: task.decline_reason || undefined,
                  reviewedBy: task.reviewed_by || undefined,
                  reviewedAt: task.reviewed_at || undefined,
                  cancelledAt: task.cancelled_at || null,
                  cancelledBy: task.cancelled_by || undefined,
                  deletedAt: task.deleted_at || undefined,
                  deletedBy: task.deleted_by || undefined,
                  archivedAt: task.archived_at || undefined,
                  archivedBy: task.archived_by || undefined,
                  createdAt: task.created_at,
                  updatedAt: task.updated_at,
                  activities: activitiesByTaskId[task.id] || [],
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
                });
              });

              const tasksToFix: Array<{ id: string; assignedBy: string }> = [];
              transformedTasks.forEach(task => {
                if (
                  task.completionPercentage === 100 &&
                  task.status !== "approved" &&
                  task.status !== "submitted_for_review"
                ) {
                  const assignedTo = task.assignedTo || [];
                  const isSelfAssigned =
                    task.assignedBy &&
                    assignedTo.length === 1 &&
                    String(assignedTo[0]) === String(task.assignedBy);

                  if (isSelfAssigned) {
                    tasksToFix.push({ id: task.id, assignedBy: task.assignedBy });
                  }
                }
              });

              if (tasksToFix.length > 0 && supabaseClient) {
                for (const taskToFix of tasksToFix) {
                  try {
                    await supabaseClient
                      .from('tasks')
                      .update({
                        review_accepted: true,
                        reviewed_by: taskToFix.assignedBy,
                        reviewed_at: new Date().toISOString(),
                      })
                      .eq('id', taskToFix.id);

                    const fixedTask = transformedTasks.find(t => t.id === taskToFix.id);
                    if (fixedTask) {
                      fixedTask.status = "approved" as TaskStatus;
                      fixedTask.reviewedBy = taskToFix.assignedBy;
                      fixedTask.reviewedAt = new Date().toISOString();
                    }
                  } catch (error) {
                    console.error(`❌ Error fixing task ${taskToFix.id}:`, error);
                  }
                }
              }

              get().reconcileFetchedTasks(transformedTasks);
              return get().tasks;
            },
            {
              staleMs: TASK_FRESH_MS,
              ttlMs: TASK_TTL_MS,
              forceRefresh,
            }
          );

          get().completeTaskQuerySuccess(resourceKey, result.data.map((task) => task.id));
        } catch (error: any) {
          console.error('Error fetching tasks:', error);
          get().completeTaskQueryError(resourceKey, error.message, hasCachedData);
        }
      },

      fetchArchivedTasks: async (_forceRefresh: boolean = false) => {
        if (!supabase) {
          console.error('Supabase not configured, no archived data available');
          set({ archivedTasks: [], isLoading: false, error: 'Supabase not configured' });
          return;
        }

        set({ isLoading: true, error: null });
        try {
          const supabaseClient = supabase;
          const { data: archivedTasksData, error: tasksError } = await supabaseClient
            .from('tasks')
            .select('*')
            .is('cancelled_at', null)
            .not('archived_at', 'is', null)
            .is('deleted_at', null)
            .order('archived_at', { ascending: false });

          if (tasksError) throw tasksError;

          const { data: taskActivitiesData, error: taskActivitiesError } = await supabaseClient
            .from('task_activities')
            .select('*')
            .order('timestamp', { ascending: true });

          if (taskActivitiesError) throw taskActivitiesError;

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

          const transformedArchivedTasks = (archivedTasksData || []).map((task) => {
            const normalizedAssignedTo = Array.isArray(task.assigned_to)
              ? task.assigned_to.map((assigneeId: unknown) => String(assigneeId))
              : [];
            const normalizedAssignedBy = task.assigned_by ? String(task.assigned_by) : '';

            return normalizeTaskActivityCompatibility({
              id: task.id,
              projectId: task.project_id,
              parentTaskId: task.parent_task_id,
              nestingLevel: task.nesting_level,
              rootTaskId: task.root_task_id,
              title: task.title,
              description: task.description,
              taskReference: task.task_reference || undefined,
              billingStatus: (task.billing_status || "non_billable") as BillingStatus,
              priority: task.priority,
              category: task.category,
              dueDate: task.due_date,
              status: resolveClientTaskStatus(task) as TaskStatus,
              completionPercentage: task.completion_percentage,
              assignedTo: normalizedAssignedTo,
              primaryAssigneeId: task.primary_assignee_id ? String(task.primary_assignee_id) : undefined,
              delegatedUserIds: Array.isArray(task.delegated_user_ids)
                ? task.delegated_user_ids.map((userId: unknown) => String(userId))
                : undefined,
              assignedBy: normalizedAssignedBy,
              containerId: task.container_id ? String(task.container_id) : undefined,
              subContainerId: task.sub_container_id ? String(task.sub_container_id) : undefined,
              tags: Array.isArray(task.tags) ? task.tags.map((tag: unknown) => String(tag)) : [],
              locationOnSite: task.location_on_site || undefined,
              location: task.location,
              attachments: task.attachments || [],
              starredByUsers: task.starred_by_users || [],
              acceptedBy: task.accepted_by || undefined,
              acceptedAt: task.accepted_at || undefined,
              declinedReason: task.decline_reason || undefined,
              reviewedBy: task.reviewed_by || undefined,
              reviewedAt: task.reviewed_at || undefined,
              cancelledAt: task.cancelled_at || undefined,
              cancelledBy: task.cancelled_by || undefined,
              deletedAt: task.deleted_at || undefined,
              deletedBy: task.deleted_by || undefined,
              archivedAt: task.archived_at || undefined,
              archivedBy: task.archived_by || undefined,
              createdAt: task.created_at,
              updatedAt: task.updated_at,
              activities: activitiesByTaskId[task.id] || [],
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
            });
          });

          set({
            archivedTasks: transformedArchivedTasks,
            isLoading: false,
            error: null,
          });
        } catch (error: any) {
          console.error('Error fetching archived tasks:', error);
          set({
            archivedTasks: [],
            error: error.message,
            isLoading: false,
          });
        }
      },

      fetchTasksByProject: async (projectId: string, forceRefresh: boolean = false, options?: { background?: boolean }) => {
        const background = options?.background === true;
        if (!supabase) {
          console.error('Supabase not configured, no data available');
          set({ tasks: [], isLoading: false, error: 'Supabase not configured' });
          return;
        }

        const resourceKey = buildResourceKey("tasks", "project", projectId);
        const supabaseClient = supabase;
        const cachedIds = get().queryTaskIds[resourceKey] || get().taskIdsByProject[projectId] || [];
        const hasCachedData = cachedIds.length > 0;

        if (!background && get().shouldServeCachedTasks(resourceKey, cachedIds, forceRefresh)) {
          get().completeTaskQuerySuccess(resourceKey, cachedIds);
          return;
        }

        if (!background && get().shouldRefreshTasksInBackground(resourceKey, cachedIds, forceRefresh)) {
          get().beginTaskQuery(resourceKey, true);
          void get().fetchTasksByProject(projectId, false, { background: true });
          return;
        }

        get().beginTaskQuery(resourceKey, hasCachedData);
        try {
          const result = await runSingleFlightRequest(
            resourceKey,
            async () => {
              const { data: allTasksData, error: tasksError } = await supabaseClient
                .from('tasks')
                .select('*')
                .eq('project_id', projectId)
                .is('cancelled_at', null)
                .is('archived_at', null)
                .is('deleted_at', null)
                .order('created_at', { ascending: false });

              if (tasksError) throw tasksError;

              // M-DATA-05 Phase A: list path skips full activity history.
              const activitiesByTaskId: { [key: string]: TaskActivity[] } = {};

              const scopedTaskIds = new Set(get().taskIdsByProject[projectId] || []);
              const transformedTasks = (allTasksData || []).map(task => normalizeTaskActivityCompatibility({
                id: task.id,
                projectId: task.project_id,
                parentTaskId: task.parent_task_id,
                nestingLevel: task.nesting_level,
                rootTaskId: task.root_task_id,
                title: task.title,
                description: task.description,
                taskReference: task.task_reference || undefined,
                billingStatus: (task.billing_status || "non_billable") as BillingStatus,
                priority: task.priority,
                category: task.category,
                dueDate: task.due_date,
                status: resolveClientTaskStatus(task) as TaskStatus,
                completionPercentage: task.completion_percentage,
                assignedTo: Array.isArray(task.assigned_to)
                  ? task.assigned_to.map((assigneeId: unknown) => String(assigneeId))
                  : [],
                primaryAssigneeId: task.primary_assignee_id ? String(task.primary_assignee_id) : undefined,
                delegatedUserIds: Array.isArray(task.delegated_user_ids)
                  ? task.delegated_user_ids.map((userId: unknown) => String(userId))
                  : undefined,
                assignedBy: task.assigned_by ? String(task.assigned_by) : '',
                containerId: task.container_id ? String(task.container_id) : undefined,
                subContainerId: task.sub_container_id ? String(task.sub_container_id) : undefined,
                tags: Array.isArray(task.tags) ? task.tags.map((tag: unknown) => String(tag)) : [],
                locationOnSite: task.location_on_site || undefined,
                location: task.location,
                attachments: task.attachments || [],
                starredByUsers: task.starred_by_users || [],
                acceptedBy: task.accepted_by || undefined,
                acceptedAt: task.accepted_at || undefined,
                declinedReason: task.decline_reason || undefined,
                reviewedBy: task.reviewed_by || undefined,
                reviewedAt: task.reviewed_at || undefined,
                createdAt: task.created_at,
                updatedAt: task.updated_at,
                cancelledAt: task.cancelled_at || undefined,
                cancelledBy: task.cancelled_by || undefined,
                deletedAt: task.deleted_at || undefined,
                deletedBy: task.deleted_by || undefined,
                archivedAt: task.archived_at || undefined,
                archivedBy: task.archived_by || undefined,
                activities: activitiesByTaskId[task.id] || [],
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
              }));

              const incomingTaskIds = new Set(transformedTasks.map((task) => task.id));
              const staleScopedTaskIds = Array.from(scopedTaskIds).filter(
                (taskId) => !incomingTaskIds.has(taskId)
              );

              get().upsertTasks(transformedTasks);
              await Promise.all(
                staleScopedTaskIds.map(async (taskId) => {
                  const refreshedTask = await get().fetchTaskById(taskId, true);
                  if (!refreshedTask) {
                    get().evictTaskFromCache(taskId);
                  }
                })
              );
              return transformedTasks;
            },
            {
              staleMs: TASK_FRESH_MS,
              ttlMs: TASK_TTL_MS,
              forceRefresh,
            }
          );

          get().completeTaskQuerySuccess(resourceKey, result.data.map((task) => task.id));
        } catch (error: any) {
          console.error('Error fetching tasks by project:', error);
          get().completeTaskQueryError(resourceKey, error.message, hasCachedData);
        }
      },

      fetchTasksByUser: async (userId: string, forceRefresh: boolean = false, options?: { background?: boolean }) => {
        const background = options?.background === true;
        if (!supabase) {
          console.error('Supabase not configured, no data available');
          set({ tasks: [], isLoading: false, error: 'Supabase not configured' });
          return;
        }

        const resourceKey = buildResourceKey("tasks", "user", userId);
        const supabaseClient = supabase;
        const cachedIds = get().queryTaskIds[resourceKey] || get().taskIdsByUser[userId] || [];
        const hasCachedData = cachedIds.length > 0;

        if (!background && get().shouldServeCachedTasks(resourceKey, cachedIds, forceRefresh)) {
          get().completeTaskQuerySuccess(resourceKey, cachedIds);
          return;
        }

        if (!background && get().shouldRefreshTasksInBackground(resourceKey, cachedIds, forceRefresh)) {
          get().beginTaskQuery(resourceKey, true);
          void get().fetchTasksByUser(userId, false, { background: true });
          return;
        }

        get().beginTaskQuery(resourceKey, hasCachedData);
        try {
          const result = await runSingleFlightRequest(
            resourceKey,
            async () => {
              const { data, error } = await fetchListableTasksAssignedToUser(supabaseClient, userId);

              if (error) throw error;

              // M-DATA-05 Phase A: list path skips full activity history.
              const activitiesByTaskId: { [key: string]: TaskActivity[] } = {};

              const scopedTaskIds = new Set(get().taskIdsByUser[userId] || []);
              const transformedTasks = (data || []).map(task => normalizeTaskActivityCompatibility({
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
                status: resolveClientTaskStatus(task) as TaskStatus,
                completionPercentage: task.completion_percentage,
                assignedTo: Array.isArray(task.assigned_to)
                  ? task.assigned_to.map((assigneeId: unknown) => String(assigneeId))
                  : [],
                primaryAssigneeId: task.primary_assignee_id ? String(task.primary_assignee_id) : undefined,
                delegatedUserIds: Array.isArray(task.delegated_user_ids)
                  ? task.delegated_user_ids.map((userId: unknown) => String(userId))
                  : undefined,
                assignedBy: task.assigned_by ? String(task.assigned_by) : '',
                containerId: task.container_id ? String(task.container_id) : undefined,
                subContainerId: task.sub_container_id ? String(task.sub_container_id) : undefined,
                tags: Array.isArray(task.tags) ? task.tags.map((tag: unknown) => String(tag)) : [],
                locationOnSite: task.location_on_site || undefined,
                location: task.location,
                attachments: task.attachments || [],
                starredByUsers: task.starred_by_users || [],
                acceptedBy: task.accepted_by || undefined,
                acceptedAt: task.accepted_at || undefined,
                declinedReason: task.decline_reason || undefined,
                reviewedBy: task.reviewed_by || undefined,
                reviewedAt: task.reviewed_at || undefined,
                createdAt: task.created_at,
                updatedAt: task.updated_at,
                cancelledAt: task.cancelled_at || undefined,
                cancelledBy: task.cancelled_by || undefined,
                deletedAt: task.deleted_at || undefined,
                deletedBy: task.deleted_by || undefined,
                archivedAt: task.archived_at || undefined,
                archivedBy: task.archived_by || undefined,
                activities: activitiesByTaskId[task.id] || [],
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
              }));

              const incomingTaskIds = new Set(transformedTasks.map((task) => task.id));
              const staleScopedTaskIds = Array.from(scopedTaskIds).filter(
                (taskId) => !incomingTaskIds.has(taskId)
              );

              get().upsertTasks(transformedTasks);
              await Promise.all(
                staleScopedTaskIds.map(async (taskId) => {
                  const refreshedTask = await get().fetchTaskById(taskId, true);
                  if (!refreshedTask) {
                    get().evictTaskFromCache(taskId);
                  }
                })
              );
              return transformedTasks;
            },
            {
              staleMs: TASK_FRESH_MS,
              ttlMs: TASK_TTL_MS,
              forceRefresh,
            }
          );

          get().completeTaskQuerySuccess(resourceKey, result.data.map((task) => task.id));
        } catch (error: any) {
          console.error('Error fetching tasks by user:', error);
          get().completeTaskQueryError(resourceKey, error.message, hasCachedData);
        }
      },

      fetchTaskById: async (id: string, forceRefresh: boolean = false) => {
        if (!supabase) {
          return get().tasks.find(task => task.id === id) || null;
        }

        const resourceKey = buildResourceKey("task", id);
        const supabaseClient = supabase;
        const cachedTask = get().tasksById[id] || get().tasks.find(task => task.id === id);

        if (!forceRefresh && cachedTask && isRequestCacheFresh(resourceKey)) {
          get().completeTaskQuerySuccess(resourceKey, [id]);
          return cachedTask;
        }

        try {
          get().beginTaskQuery(resourceKey, Boolean(cachedTask));
          const result = await runSingleFlightRequest(
            resourceKey,
            async () => {
          // Fetch task data (exclude cancelled, archived, and deleted tasks)
          const { data: taskData, error: taskError } = await supabaseClient
            .from('tasks')
            .select('*')
            .eq('id', id)
            .is('cancelled_at', null) // Only fetch non-cancelled tasks
            .is('archived_at', null) // Only fetch non-archived tasks
            .is('deleted_at', null) // Only fetch non-deleted tasks (maintains audit trail)
            .single();

          // Archived/cancelled/deleted rows are excluded, so .single() returns PGRST116.
          // That is expected after archive — do not surface it as a user-visible fetch error.
          if (taskError?.code === 'PGRST116' || !taskData) {
            return null;
          }

          if (taskError) throw taskError;

          // Fetch task activities (unified table)
          const { data: activitiesData, error: activitiesError } = await supabaseClient
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

          const normalizedAssignedTo = Array.isArray(taskData.assigned_to)
            ? taskData.assigned_to.map((assigneeId: unknown) => String(assigneeId))
            : [];
          const normalizedAssignedBy = taskData.assigned_by ? String(taskData.assigned_by) : '';

          // Transform Supabase data to match local interface
          const transformedTask = normalizeTaskActivityCompatibility({
            id: taskData.id,
            projectId: taskData.project_id,
            parentTaskId: taskData.parent_task_id,
            nestingLevel: taskData.nesting_level,
            rootTaskId: taskData.root_task_id,
            title: taskData.title,
            description: taskData.description,
            taskReference: taskData.task_reference || undefined,
            billingStatus: (taskData.billing_status || "non_billable") as BillingStatus,
            priority: taskData.priority,
            category: taskData.category,
            dueDate: taskData.due_date,
            status: resolveClientTaskStatus(taskData) as TaskStatus,
            completionPercentage: taskData.completion_percentage,
            assignedTo: normalizedAssignedTo,
            primaryAssigneeId: taskData.primary_assignee_id ? String(taskData.primary_assignee_id) : undefined,
            delegatedUserIds: Array.isArray(taskData.delegated_user_ids)
              ? taskData.delegated_user_ids.map((userId: unknown) => String(userId))
              : undefined,
            assignedBy: normalizedAssignedBy,
            containerId: taskData.container_id ? String(taskData.container_id) : undefined,
            subContainerId: taskData.sub_container_id ? String(taskData.sub_container_id) : undefined,
            tags: Array.isArray(taskData.tags) ? taskData.tags.map((tag: unknown) => String(tag)) : [],
            locationOnSite: taskData.location_on_site || undefined,
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
            deletedAt: taskData.deleted_at || undefined,
            deletedBy: taskData.deleted_by || undefined,
            archivedAt: taskData.archived_at || undefined,
            archivedBy: taskData.archived_by || undefined,
            createdAt: taskData.created_at,
            updatedAt: taskData.updated_at,
            activities: transformedActivities,
            updates: transformedUpdates, // Backward compatibility
            children: [],
            // Edit history and notifications
            hasUnreadChanges: taskData.has_unread_changes || false,
            lastEditedAt: taskData.last_edited_at || undefined,
          });

              get().mergeTask(transformedTask);
              return transformedTask;
            },
            {
              staleMs: TASK_FRESH_MS,
              ttlMs: TASK_TTL_MS,
              forceRefresh,
            }
          );

          get().completeTaskQuerySuccess(resourceKey, [id]);
          console.log(`✅ [Fetch Complete] Task ${id} fetched and cached`);
          return result.data;
        } catch (error: any) {
          console.error('Error fetching task:', error);
          get().completeTaskQueryError(resourceKey, error.message, Boolean(cachedTask));
          return null;
        }
      },

      fetchProjectLocations: async (projectId: string) => {
        if (!supabase || !projectId) {
          return [];
        }

        const { data, error } = await supabase
          .from('project_locations')
          .select('id, project_id, label, created_by, created_at, updated_at')
          .eq('project_id', projectId)
          .order('label', { ascending: true });

        if (error) {
          console.error('Error fetching project locations:', error);
          throw error;
        }

        return (data || []).map((location: any) => ({
          id: String(location.id),
          projectId: String(location.project_id),
          label: String(location.label || ''),
          createdBy: location.created_by ? String(location.created_by) : undefined,
          createdAt: location.created_at || undefined,
          updatedAt: location.updated_at || undefined,
        }));
      },

      fetchProjectContainers: async (projectId: string) => {
        if (!supabase || !projectId) {
          return [];
        }

        const { data, error } = await supabase
          .from('project_containers')
          .select('id, project_id, parent_id, label, created_by, created_at, updated_at')
          .eq('project_id', projectId)
          .order('label', { ascending: true });

        if (error) {
          if (isMissingProjectContainersRelation(error)) {
            return [];
          }
          console.error('Error fetching project containers:', error);
          throw error;
        }

        return (data || []).map((container: any) => ({
          id: String(container.id),
          projectId: String(container.project_id),
          parentId: container.parent_id ? String(container.parent_id) : undefined,
          label: String(container.label || ''),
          createdBy: container.created_by ? String(container.created_by) : undefined,
          createdAt: container.created_at || undefined,
          updatedAt: container.updated_at || undefined,
        }));
      },

      // CREATE task in Supabase
      createTask: async (taskData) => {
        assertValidTaskCreateInput({
          title: taskData.title,
          projectId: taskData.projectId,
          assignedBy: taskData.assignedBy,
          assignedTo: taskData.assignedTo,
        });

        const initialStatus = resolveInitialTaskCreateStatus(
          taskData.assignedBy,
          taskData.assignedTo,
        );

        if (!supabase) {
          // Fallback to local creation
          const newTask: Task = normalizeTaskActivityCompatibility({
            ...taskData,
            id: Date.now().toString(),
            createdAt: new Date().toISOString(),
            activities: [],
            updates: [], // New task has no updates yet
            status: initialStatus,
            completionPercentage: 0,
            delegationHistory: [],
            originalAssignedBy: taskData.assignedBy,
          });

          set(state => ({
            tasks: [...state.tasks, newTask]
          }));

          return newTask.id;
        }

        set({ isLoading: true, error: null });
        try {
          const isCreatorAssigned = initialStatus === "in_progress";

          console.log('📋 [createTask] Creating task with data:', {
            project_id: taskData.projectId,
            title: taskData.title,
            assigned_to: taskData.assignedTo,
            assigned_by: taskData.assignedBy,
            billing_status: taskData.billingStatus || "non_billable",
          });

          const fullInsertPayload = buildSupabaseTaskInsertPayload(
            taskData,
            initialStatus,
            isCreatorAssigned
          );
          let { data, error } = await supabase
            .from('tasks')
            .insert(fullInsertPayload)
            .select()
            .single();

          const deferredField = getDeferredTaskSchemaField(error);
          if (deferredField) {
            const errorCode =
              error && typeof error === "object" && "code" in error
                ? String((error as { code?: unknown }).code || "")
                : "";
            recordDeferredFallbackFire({
              op: "createTask",
              deferredField,
              errorCode: errorCode || null,
            });
            console.warn(
              '⚠️ [createTask] Supabase schema is missing deferred redesign task fields. Retrying with compatibility payload until the migration lands.',
              { deferredField }
            );

            ({ data, error } = await supabase
              .from('tasks')
              .insert(stripDeferredTaskSchemaFields(fullInsertPayload))
              .select()
              .single());
          }

          if (error) {
            console.error('❌ [createTask] Database error:', error);
            console.error('❌ [createTask] Error details:', JSON.stringify(error, null, 2));
            throw error;
          }

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

          // Create activities FIRST before transforming task
          // This ensures activities are available when we add the task to the store
          const creationData = {
            title: taskData.title,
            assignedTo: taskData.assignedTo,
            assignedBy: taskData.assignedBy,
          };

          const creationTimestamp = new Date().toISOString();
          
          // Create creation activity
          const { data: creationActivity, error: creationError } = await supabase
            .from('task_activities')
            .insert({
              task_id: data.id,
              user_id: taskData.assignedBy,
              activity_type: 'creation' as ActivityType,
              timestamp: creationTimestamp,
              data: creationData,
              description: `Task created by ${creatorName}`,
              completion_percentage: 0,
              status: "new",
            })
            .select()
            .single();

          if (creationError) {
            console.error('Error creating creation activity:', creationError);
          }

          // If task is auto-accepted (creator is assigned), also log acceptance as status_change
          let statusChangeActivity = null;
          if (isCreatorAssigned) {
            const statusChangeData = {
              fromStatus: "new" as TaskStatus,
              toStatus: "in_progress" as TaskStatus,
              reason: `Task auto-accepted by ${creatorName}`,
            };

            const statusChangeTimestamp = new Date().toISOString();
            
            const { data: statusActivity, error: statusError } = await supabase
              .from('task_activities')
              .insert({
                task_id: data.id,
                user_id: taskData.assignedBy,
                activity_type: 'status_change' as ActivityType,
                timestamp: statusChangeTimestamp,
                data: statusChangeData,
                description: `Task accepted by ${creatorName}`,
                completion_percentage: 0,
                status: "in_progress",
              })
              .select()
              .single();

            if (statusError) {
              console.error('Error creating status change activity:', statusError);
            } else {
              statusChangeActivity = statusActivity;
            }
          }

          // Build activities array for the transformed task
          const activities: TaskActivity[] = [];
          if (creationActivity) {
            activities.push({
              id: creationActivity.id,
              taskId: creationActivity.task_id,
              userId: creationActivity.user_id,
              activityType: creationActivity.activity_type as ActivityType,
              timestamp: creationActivity.timestamp,
              data: creationActivity.data,
              description: creationActivity.description,
              completionPercentage: creationActivity.completion_percentage,
              status: creationActivity.status as TaskStatus,
              createdAt: creationActivity.timestamp, // Use timestamp as createdAt
            });
          }
          if (statusChangeActivity) {
            activities.push({
              id: statusChangeActivity.id,
              taskId: statusChangeActivity.task_id,
              userId: statusChangeActivity.user_id,
              activityType: statusChangeActivity.activity_type as ActivityType,
              timestamp: statusChangeActivity.timestamp,
              data: statusChangeActivity.data,
              description: statusChangeActivity.description,
              completionPercentage: statusChangeActivity.completion_percentage,
              status: statusChangeActivity.status as TaskStatus,
              createdAt: statusChangeActivity.timestamp, // Use timestamp as createdAt
            });
          }

          // Transform Supabase data to match local interface
          // Include activities to prevent layout shifts when activities are later fetched
          const transformedTask = normalizeTaskActivityCompatibility({
            id: data.id,
            projectId: data.project_id,
            title: data.title,
            description: data.description,
            taskReference: data.task_reference || undefined,
            billingStatus: (data.billing_status || "non_billable") as BillingStatus,
            priority: data.priority,
            category: data.category,
            dueDate: data.due_date,
            status: resolveClientTaskStatus(data) as TaskStatus,
            completionPercentage: data.completion_percentage,
            assignedTo: data.assigned_to,
            primaryAssigneeId: data.primary_assignee_id ? String(data.primary_assignee_id) : undefined,
            delegatedUserIds: Array.isArray(data.delegated_user_ids)
              ? data.delegated_user_ids.map((userId: unknown) => String(userId))
              : undefined,
            assignedBy: data.assigned_by,
            containerId: data.container_id ? String(data.container_id) : undefined,
            subContainerId: data.sub_container_id ? String(data.sub_container_id) : undefined,
            tags: Array.isArray(data.tags) ? data.tags.map((tag: unknown) => String(tag)) : [],
            locationOnSite: data.location_on_site || undefined,
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
            activities: activities, // Include activities from the start
            // Backward compatibility: populate updates from activities
            updates: activities
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
            children: [],
          });

          // Update local state with complete task data including activities
          get().mergeTask(transformedTask);
          set({ isLoading: false });
          invalidateResourceKeys([
            buildResourceKey("tasks", "all"),
            buildResourceKey("tasks", "project", transformedTask.projectId),
            ...((transformedTask.assignedTo || []).map((userId: string) => buildResourceKey("tasks", "user", String(userId)))),
            buildResourceKey("tasks", "assignedBy", transformedTask.assignedBy),
            buildResourceKey("task", transformedTask.id),
          ]);

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

      ensureProjectLocation: async (projectId: string, label: string, createdBy?: string) => {
        const normalizedLabel = normalizeProjectLocationLabel(label);

        if (!projectId || !normalizedLabel || !supabase) {
          return;
        }

        const existingLocations = await get().fetchProjectLocations(projectId);
        const normalizedTarget = normalizedLabel.toLocaleLowerCase();
        const alreadyExists = existingLocations.some((location) => (
          normalizeProjectLocationLabel(location.label).toLocaleLowerCase() === normalizedTarget
        ));

        if (alreadyExists) {
          return;
        }

        const { error } = await supabase
          .from('project_locations')
          .insert({
            project_id: projectId,
            label: normalizedLabel,
            created_by: createdBy || null,
          })
          .select()
          .single();

        if (!error) {
          return;
        }

        if (String((error as { code?: unknown }).code || '') === '23505') {
          return;
        }

        console.error('Error ensuring project location:', error);
        throw error;
      },

      ensureProjectContainer: async (projectId, label, options) => {
        const normalizedLabel = normalizeProjectLocationLabel(label);
        const parentId = options?.parentId ? String(options.parentId) : null;
        const createdBy = options?.createdBy;

        if (!projectId || !normalizedLabel || !supabase) {
          return null;
        }

        const existingContainers = await get().fetchProjectContainers(projectId);
        const normalizedTarget = normalizedLabel.toLocaleLowerCase();
        const match = existingContainers.find((container) => {
          const sameParent = (container.parentId || null) === parentId;
          return (
            sameParent &&
            normalizeProjectLocationLabel(container.label).toLocaleLowerCase() === normalizedTarget
          );
        });
        if (match) {
          return match;
        }

        const { data, error } = await supabase
          .from('project_containers')
          .insert({
            project_id: projectId,
            parent_id: parentId,
            label: normalizedLabel,
            created_by: createdBy || null,
          })
          .select('id, project_id, parent_id, label, created_by, created_at, updated_at')
          .single();

        if (error) {
          if (isMissingProjectContainersRelation(error)) {
            return null;
          }
          if (String((error as { code?: unknown }).code || '') === '23505') {
            const refreshed = await get().fetchProjectContainers(projectId);
            return (
              refreshed.find((container) => {
                const sameParent = (container.parentId || null) === parentId;
                return (
                  sameParent &&
                  normalizeProjectLocationLabel(container.label).toLocaleLowerCase() ===
                    normalizedTarget
                );
              }) || null
            );
          }
          console.error('Error ensuring project container:', error);
          throw error;
        }

        return {
          id: String(data.id),
          projectId: String(data.project_id),
          parentId: data.parent_id ? String(data.parent_id) : undefined,
          label: String(data.label || ''),
          createdBy: data.created_by ? String(data.created_by) : undefined,
          createdAt: data.created_at || undefined,
          updatedAt: data.updated_at || undefined,
        };
      },

      // UPDATE task in Supabase
      updateTask: async (id, updates) => {
        const currentTask = get().tasks.find((t) => t.id === id);

        if (currentTask) {
          assertValidTaskUpdate(
            {
              title: currentTask.title,
              projectId: currentTask.projectId,
              assignedBy: currentTask.assignedBy,
              assignedTo: currentTask.assignedTo,
              status: currentTask.status,
            },
            {
              title: updates.title,
              projectId: updates.projectId,
              assignedBy: updates.assignedBy,
              assignedTo: updates.assignedTo,
              status: updates.status,
            },
          );
        }

        if (!supabase) {
          // Fallback to local update
          set(state => ({
            tasks: state.tasks.map(task =>
              task.id === id
                ? normalizeTaskActivityCompatibility({ ...task, ...updates, updatedAt: new Date().toISOString() })
                : task
            )
          }));
          return;
        }

        // OPTIMISTIC UPDATE: Store original state for potential rollback
        const originalTasks = get().tasks;
        
        try {
          // VALIDATION: Prevent changing assignees once task is accepted
          // Once a task is accepted (status is "accepted" or "in_progress"), 
          // the assignees cannot be changed to maintain workflow integrity
          if (currentTask && updates.assignedTo) {
            const isTaskAccepted = currentTask.status === "accepted" || 
                                  currentTask.status === "in_progress";
            
            // Check if assignees are actually changing
            const currentAssignees = (currentTask.assignedTo || []).map(String).sort().join(',');
            const newAssignees = (updates.assignedTo || []).map(String).sort().join(',');
            const assigneesChanged = currentAssignees !== newAssignees;
            
            if (isTaskAccepted && assigneesChanged) {
              throw new Error('Cannot change assignees once a task has been accepted. Please reassign the task before it is accepted, or decline it first.');
            }
          }
          
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

          if (updates.status === "new" || updates.status === "not_started") {
            updates.accepted = false;
            updates.acceptedAt = null;
            updates.acceptedBy = undefined;
          }
          
          // OPTIMISTIC UPDATE: Update local state IMMEDIATELY before backend call
          console.log(`⚡ [Optimistic Update] Updating task ${id} locally before backend sync`);
          set(state => ({
            tasks: state.tasks.map(task =>
              task.id === id 
                ? normalizeTaskActivityCompatibility({ ...task, ...updates, updatedAt: new Date().toISOString() }) 
                : task
            ),
            isLoading: true,
            error: null,
          }));
          
          // Prepare data for backend (exclude internal fields like _editReason)
          const updateData: any = {};
          // Remove internal fields that shouldn't be saved
          const { _editReason, ...cleanUpdates } = updates as any;
          const compatibilityCleanUpdates = stripDeferredTaskRuntimeFields(cleanUpdates);
          
          if (cleanUpdates.title) updateData.title = cleanUpdates.title;
          if (cleanUpdates.description) updateData.description = cleanUpdates.description;
          if (cleanUpdates.taskReference !== undefined) updateData.task_reference = cleanUpdates.taskReference || null;
          if (cleanUpdates.billingStatus !== undefined) updateData.billing_status = cleanUpdates.billingStatus || "non_billable";
          if (cleanUpdates.priority) updateData.priority = cleanUpdates.priority;
          if (cleanUpdates.category) updateData.category = cleanUpdates.category;
          if (cleanUpdates.dueDate) updateData.due_date = cleanUpdates.dueDate;
          if (cleanUpdates.assignedTo) updateData.assigned_to = cleanUpdates.assignedTo;
          if ('primaryAssigneeId' in cleanUpdates) updateData.primary_assignee_id = cleanUpdates.primaryAssigneeId || null;
          if ('delegatedUserIds' in cleanUpdates) updateData.delegated_user_ids = cleanUpdates.delegatedUserIds || [];
          if ('containerId' in cleanUpdates) updateData.container_id = cleanUpdates.containerId || null;
          if ('subContainerId' in cleanUpdates) updateData.sub_container_id = cleanUpdates.subContainerId || null;
          if ('tags' in cleanUpdates) updateData.tags = cleanUpdates.tags || [];
          if ('locationOnSite' in cleanUpdates) updateData.location_on_site = cleanUpdates.locationOnSite || null;
          if (cleanUpdates.attachments) updateData.attachments = cleanUpdates.attachments;
          // Legacy accepted field - map to status if needed
          if ('accepted' in cleanUpdates && cleanUpdates.accepted === true && !cleanUpdates.status) {
            updateData.status = 'in_progress';
            updateData.current_status = 'in_progress';
            updateData.accepted = true;
          } else if ('accepted' in cleanUpdates && cleanUpdates.accepted === false) {
            updateData.accepted = false;
          }
          if (cleanUpdates.status === "new" || cleanUpdates.status === "not_started") {
            updateData.accepted = false;
            updateData.accepted_at = null;
            updateData.accepted_by = null;
          }
          if (cleanUpdates.acceptedBy !== undefined) updateData.accepted_by = cleanUpdates.acceptedBy || null;
          if (cleanUpdates.acceptedAt !== undefined) updateData.accepted_at = cleanUpdates.acceptedAt || null;
          // Handle declineReason: can be set to clear it (undefined) or set a new value
          if ('declineReason' in cleanUpdates) updateData.decline_reason = cleanUpdates.declineReason || null;
          // Unified status field — write both columns. Reads prefer `status`
          // (TASK_EFFECTIVE_STATUS); historic updates only set current_status.
          if (cleanUpdates.status) {
            updateData.status = cleanUpdates.status;
            updateData.current_status = cleanUpdates.status;
          }
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
          let usedDeferredSchemaCompatibility = false;
          let skippedCompatibilityOnlyUpdate = false;
          let { error } = await supabase
            .from('tasks')
            .update(updateData)
            .eq('id', id);

          const deferredField = getDeferredTaskSchemaField(error);
          if (deferredField) {
            usedDeferredSchemaCompatibility = true;
            const errorCode =
              error && typeof error === "object" && "code" in error
                ? String((error as { code?: unknown }).code || "")
                : "";
            recordDeferredFallbackFire({
              op: "updateTask",
              deferredField,
              errorCode: errorCode || null,
            });
            console.warn(
              '⚠️ [updateTask] Supabase schema is missing deferred redesign task fields. Retrying with compatibility payload until the migration lands.',
              { deferredField }
            );

            const compatibilityUpdateData = stripDeferredTaskSchemaFields(updateData);
            if (Object.keys(compatibilityUpdateData).length === 0) {
              skippedCompatibilityOnlyUpdate = true;
              error = null;
            } else {
              ({ error } = await supabase
                .from('tasks')
                .update(compatibilityUpdateData)
                .eq('id', id));
            }

            if (currentTask) {
              set(state => ({
                tasks: state.tasks.map(task =>
                  task.id === id
                    ? normalizeTaskActivityCompatibility({
                        ...currentTask,
                        ...compatibilityCleanUpdates,
                        updatedAt: new Date().toISOString(),
                      })
                    : task
                ),
              }));
            }
          }

          if (error) throw error;

          // Success - backend confirmed the update
          console.log(`✅ [Optimistic Update] Backend confirmed update for task ${id}`);
          if (!skippedCompatibilityOnlyUpdate) {
            invalidateResourceKeys([
              buildResourceKey("tasks", "all"),
              currentTask?.projectId ? buildResourceKey("tasks", "project", currentTask.projectId) : "",
              ...((updates.assignedTo || currentTask?.assignedTo || []).map((userId) => buildResourceKey("tasks", "user", String(userId)))),
              currentTask?.assignedBy ? buildResourceKey("tasks", "assignedBy", currentTask.assignedBy) : "",
              buildResourceKey("task", id),
            ]);
          }
          
          // Mark as not loading immediately to restore UI responsiveness
          set({ isLoading: false });

          if (skippedCompatibilityOnlyUpdate) {
            return;
          }
          
          // ============================================================================
          // ACTIVITY LOGGING - Always logs activities regardless of acceptance status
          // ============================================================================
          // Activity logging starts from task creation and tracks all changes:
          // 1. Assignment changes → logged as 'assignment' activity
          // 2. Status changes → logged as 'status_change' activity (handled by workflow methods)
          // 3. Metadata changes → logged as 'metadata_edit' activity (default behavior)
          // ============================================================================
          
          if (!oldTaskState || !currentTask) {
            // No old state to compare against, skip activity logging
            return;
          }
          
          // Check what changed
          const isStatusChange = cleanUpdates.status && oldTaskState.status !== cleanUpdates.status;
          const assigneesChanged = cleanUpdates.assignedTo && 
            (oldTaskState.assignedTo || []).map(String).sort().join(',') !== 
            (cleanUpdates.assignedTo || []).map(String).sort().join(',');
          
          // 1. Log assignment activity if assignees changed (works before/after acceptance)
          if (assigneesChanged && supabase) {
            (async () => {
              try {
                const assignerName = await (async () => {
                  try {
                    const { data } = await supabase!
                      .from('users')
                      .select('name')
                      .eq('id', currentTask.assignedBy)
                      .single();
                    return data?.name || 'Unknown User';
                  } catch {
                    return 'Unknown User';
                  }
                })();
                
                const assigneeNames = await Promise.all(
                  (cleanUpdates.assignedTo || []).map(async (userId: string) => {
                    try {
                      const { data } = await supabase!
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
                
                await supabase!
                  .from('task_activities')
                  .insert({
                    task_id: id,
                    user_id: currentTask.assignedBy,
                    activity_type: 'assignment' as ActivityType,
                    timestamp: new Date().toISOString(),
                    data: {
                      assignedTo: cleanUpdates.assignedTo,
                      assignedBy: currentTask.assignedBy,
                      previousAssignees: oldTaskState.assignedTo || [],
                    },
                    description: assigneesList 
                      ? `Task assigned to ${assigneesList} by ${assignerName}`
                      : `Task assignment updated by ${assignerName}`,
                    completion_percentage: currentTask.completionPercentage || 0,
                    status: currentTask.status || "new",
                  });
              } catch (error) {
                console.error('Error logging assignment activity:', error);
              }
            })();
          }
          
          // 2. Log metadata changes (title, description, dueDate, priority, category, etc.)
          // Skip if this is ONLY a status change or ONLY an assignment change
          // (those are handled separately above or by workflow methods)
          if (!isStatusChange && !assigneesChanged) {
            (async () => {
              try {
                const editorId = oldTaskState.assignedBy;
                const updatedTask = get().tasks.find(t => t.id === id);
                
                if (updatedTask && editorId) {
                  // Track metadata changes - works before/after acceptance
                  await get().trackTaskEdit(id, editorId, oldTaskState, updatedTask, editReason);
                  
                  // Notify assignees only if task is accepted/in_progress
                  const isEditAfterAcceptance = (oldTaskState.status === "accepted" || oldTaskState.status === "in_progress");
                  if (isEditAfterAcceptance) {
                    await get().notifyTaskEdit(id, editorId, cleanUpdates);
                  }
                }
              } catch (error) {
                console.error('Error tracking metadata changes:', error);
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

      // DELETE task in Supabase (soft delete - maintains audit trail)
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
          // Get the task to verify it exists and get user info
          const task = get().tasks.find(t => t.id === id);
          if (!task) {
            throw new Error('Task not found');
          }

          // Get current user from auth store (we need userId for deleted_by)
          // Note: This assumes we have access to the user ID - we'll need to pass it as a parameter
          // For now, we'll need to update the method signature
          throw new Error('deleteTask requires userId parameter - use deleteTaskById instead');
        } catch (error: any) {
          console.error('Error deleting task:', error);
          set({ 
            error: error.message, 
            isLoading: false 
          });
          throw error;
        }
      },

      // DELETE task by ID with user ID (soft delete - maintains audit trail)
      deleteTaskById: async (taskId: string, userId: string) => {
        if (!supabase) {
          // Fallback to local deletion
          set(state => ({
            tasks: state.tasks.filter(task => task.id !== taskId)
          }));
          return;
        }

        set({ isLoading: true, error: null });
        try {
          // Get the task to verify it exists
          const task = get().tasks.find(t => t.id === taskId);
          if (!task) {
            throw new Error('Task not found');
          }

          // Check if task is already deleted
          if (task.deletedAt) {
            throw new Error('Task is already deleted');
          }

          // Get user who is deleting to include their name in activity
          const deletingUser = await (async () => {
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

          // Soft delete: Update task with deleted_at timestamp
          const { error } = await supabase
            .from('tasks')
            .update({
              deleted_at: new Date().toISOString(),
              deleted_by: userId,
              updated_at: new Date().toISOString(),
            })
            .eq('id', taskId);

          if (error) throw error;

          // Create deletion activity
          await supabase
            .from('task_activities')
            .insert({
              task_id: taskId,
              user_id: userId,
              activity_type: 'cancellation' as ActivityType, // Using cancellation type for deletion
              timestamp: new Date().toISOString(),
              data: { reason: `Task deleted by ${deletingUser}` },
              description: `Task deleted by ${deletingUser}`,
              completion_percentage: task.completionPercentage,
              status: task.status,
            });

          // Update local state
          set(state => ({
            tasks: state.tasks.map(t =>
              t.id === taskId
                ? { ...t, deletedAt: new Date().toISOString(), deletedBy: userId }
                : t
            ),
            isLoading: false,
          }));
          invalidateResourceKeys([
            buildResourceKey("tasks", "all"),
            buildResourceKey("task", taskId),
            task.projectId ? buildResourceKey("tasks", "project", task.projectId) : "",
            ...(task.assignedTo || []).map((assigneeId) => buildResourceKey("tasks", "user", String(assigneeId))),
            task.assignedBy ? buildResourceKey("tasks", "assignedBy", task.assignedBy) : "",
          ]);

          // Refresh tasks to get updated data
          await get().fetchTasks(true);
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

      // ARCHIVE: hide signed-off work from default lists (Filters → Archived).
      // Not cancel/delete. Only assigner or assignee, and only after approve/complete.
      archiveTask: async (taskId, userId) => {
        if (!supabase) {
          console.error('Supabase not configured');
          throw new Error('Supabase not configured');
        }

        set({ isLoading: true, error: null });
        try {
          // First, verify the task exists and get it
          const task = get().tasks.find(t => t.id === taskId);
          if (!task) {
            throw new Error('Task not found');
          }

          // Cancelled tasks are already terminal and do not need a separate archive transition.
          if (task.status === 'cancelled') {
            throw new Error('Cancelled tasks cannot be archived');
          }

          if (!isCompletedLifecycleStatus(task.status)) {
            throw new Error('Only completed tasks can be archived');
          }

          // Check if user is assigner or assignee
          const isAssigner = task.assignedBy === userId;
          const isAssignee = Array.isArray(task.assignedTo) && task.assignedTo.includes(userId);
          
          if (!isAssigner && !isAssignee) {
            throw new Error('Only the task assigner or assignee can archive this task');
          }

          // Check if task is already archived
          if (task.archivedAt) {
            throw new Error('Task is already archived');
          }

          // Get user who is archiving to include their name in activity
          const archivingUser = await (async () => {
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

          const archivedAt = new Date().toISOString();

          // Update task with archived_at timestamp
          const { error } = await supabase
            .from('tasks')
            .update({
              archived_at: archivedAt,
              archived_by: userId,
              updated_at: archivedAt,
            })
            .eq('id', taskId);

          if (error) throw error;

          // Create archive activity
          await supabase
            .from('task_activities')
            .insert({
              task_id: taskId,
              user_id: userId,
              activity_type: 'cancellation' as ActivityType, // Using cancellation type for archive
              timestamp: archivedAt,
              data: { reason: `Task archived by ${archivingUser}` },
              description: `Task archived by ${archivingUser}`,
              completion_percentage: task.completionPercentage,
              status: task.status,
            });

          const archivedTask = {
            ...task,
            archivedAt,
            archivedBy: userId,
          };

          // Keep the row in archivedTasks immediately so Filters → Archived
          // still shows it when that list was already cached.
          set((state) => ({
            tasks: state.tasks.filter((t) => t.id !== taskId),
            archivedTasks: [
              archivedTask,
              ...(state.archivedTasks ?? []).filter((t) => t.id !== taskId),
            ],
            isLoading: false,
          }));

          await get().fetchTasks();
          await get().fetchArchivedTasks();
        } catch (error: any) {
          console.error('Error archiving task:', error);
          set({
            error: error.message,
            isLoading: false,
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
          const newActivity: TaskActivity = {
            id: newUpdate.id,
            taskId,
            userId: update.userId,
            activityType: 'progress_update',
            timestamp: newUpdate.timestamp,
            data: {
              description: update.description,
              photos: update.photos || [],
              completionPercentage: update.completionPercentage,
              status: update.status,
            },
            description: update.description,
            completionPercentage: update.completionPercentage,
            status: update.status,
            createdAt: newUpdate.timestamp,
          };

          set(state => ({
            tasks: state.tasks.map(task =>
              task.id === taskId
                ? {
                    ...task,
                    activities: [...(task.activities || []), newActivity],
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
          const newActivity: TaskActivity = {
            id: newUpdate.id,
            taskId,
            userId: update.userId,
            activityType: 'progress_update',
            timestamp: newUpdate.timestamp,
            data: {
              description: update.description,
              photos: update.photos || [],
              completionPercentage: update.completionPercentage,
              status: update.status,
            },
            description: update.description,
            completionPercentage: update.completionPercentage,
            status: update.status,
            createdAt: newUpdate.timestamp,
          };

          // OPTIMISTIC UPDATE: Update local state IMMEDIATELY
          // Note: Tasks at 100% are NOT automatically submitted for review - user must submit manually
          console.log(`⚡ [Optimistic Update] Adding update to task ${taskId} locally before backend sync`);
          set(state => ({
            tasks: state.tasks.map(task =>
              task.id === taskId
                ? { 
                    ...task, 
                    activities: [...(task.activities || []), newActivity],
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
            status: update.status,
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
          const updatedTaskContext = get().tasksById[taskId] || get().tasks.find((task) => task.id === taskId);
          invalidateResourceKeys([
            buildResourceKey("tasks", "all"),
            buildResourceKey("task", taskId),
            updatedTaskContext?.projectId ? buildResourceKey("tasks", "project", updatedTaskContext.projectId) : "",
            ...((updatedTaskContext?.assignedTo || []).map((userId) => buildResourceKey("tasks", "user", String(userId)))),
            updatedTaskContext?.assignedBy ? buildResourceKey("tasks", "assignedBy", updatedTaskContext.assignedBy) : "",
          ]);
          
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
          const newActivity: TaskActivity = {
            id: newUpdate.id,
            taskId: subTaskId,
            userId: update.userId,
            activityType: 'progress_update',
            timestamp: newUpdate.timestamp,
            data: {
              description: update.description,
              photos: update.photos || [],
              completionPercentage: update.completionPercentage,
              status: update.status,
            },
            description: update.description,
            completionPercentage: update.completionPercentage,
            status: update.status,
            createdAt: newUpdate.timestamp,
          };

          set(state => ({
            tasks: state.tasks.map(task =>
              task.id === subTaskId
                ? { 
                    ...task, 
                    activities: [...(task.activities || []), newActivity],
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
          const newActivity: TaskActivity = {
            id: newUpdate.id,
            taskId: subTaskId,
            userId: update.userId,
            activityType: 'progress_update',
            timestamp: newUpdate.timestamp,
            data: {
              description: update.description,
              photos: update.photos || [],
              completionPercentage: update.completionPercentage,
              status: update.status,
            },
            description: update.description,
            completionPercentage: update.completionPercentage,
            status: update.status,
            createdAt: newUpdate.timestamp,
          };

          // OPTIMISTIC UPDATE: Update local state IMMEDIATELY
          // Note: Tasks at 100% are NOT automatically submitted for review - user must submit manually
          console.log(`⚡ [Optimistic Update] Adding update to subtask ${subTaskId} locally before backend sync`);
          set(state => ({
            tasks: state.tasks.map(task =>
              task.id === subTaskId
                ? { 
                    ...task, 
                    activities: [...(task.activities || []), newActivity],
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
            status: update.status,
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
        assertValidTaskCreateInput({
          title: subTaskData.title,
          projectId: subTaskData.projectId,
          assignedBy: subTaskData.assignedBy,
          assignedTo: subTaskData.assignedTo,
        });

        const initialStatus = resolveInitialTaskCreateStatus(
          subTaskData.assignedBy,
          subTaskData.assignedTo,
        );
        const isCreatorAssigned = initialStatus === "in_progress";

        if (!supabase) {
          // Fallback to local creation
          const newSubTask: SubTask = {
            ...subTaskData,
            id: `subtask-${Date.now()}`,
            parentTaskId: taskId,
            createdAt: new Date().toISOString(),
            status: initialStatus,
            completionPercentage: 0,
            activities: [],
            updates: [], // New subtask has no updates yet
            accepted: isCreatorAssigned,
            acceptedBy: isCreatorAssigned ? subTaskData.assignedBy : undefined,
            acceptedAt: isCreatorAssigned ? new Date().toISOString() : null,
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
              status: initialStatus,
              current_status: initialStatus,
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

          const creatorName = await (async () => {
            try {
              const { data } = await supabase
                .from('users')
                .select('name')
                .eq('id', subTaskData.assignedBy)
                .single();

              return data?.name || 'Unknown User';
            } catch {
              return 'Unknown User';
            }
          })();

          const creationData = {
            title: subTaskData.title,
            assignedTo: subTaskData.assignedTo,
            assignedBy: subTaskData.assignedBy,
          };
          const creationTimestamp = new Date().toISOString();
          const { data: creationActivity, error: creationError } = await supabase
            .from('task_activities')
            .insert({
              task_id: data.id,
              user_id: subTaskData.assignedBy,
              activity_type: 'creation' as ActivityType,
              timestamp: creationTimestamp,
              data: creationData,
              description: `Task created by ${creatorName}`,
              completion_percentage: 0,
              status: 'new',
            })
            .select()
            .single();

          if (creationError) {
            console.error('Error creating subtask creation activity:', creationError);
          }

          let statusChangeActivity = null;
          if (isCreatorAssigned) {
            const statusChangeData = {
              fromStatus: 'new' as TaskStatus,
              toStatus: 'in_progress' as TaskStatus,
              reason: `Task auto-accepted by ${creatorName}`,
            };
            const statusChangeTimestamp = new Date().toISOString();
            const { data: statusActivity, error: statusError } = await supabase
              .from('task_activities')
              .insert({
                task_id: data.id,
                user_id: subTaskData.assignedBy,
                activity_type: 'status_change' as ActivityType,
                timestamp: statusChangeTimestamp,
                data: statusChangeData,
                description: `Task accepted by ${creatorName}`,
                completion_percentage: 0,
                status: 'in_progress',
              })
              .select()
              .single();

            if (statusError) {
              console.error('Error creating subtask status change activity:', statusError);
            } else {
              statusChangeActivity = statusActivity;
            }
          }

          const activities: TaskActivity[] = [];
          if (creationActivity) {
            activities.push({
              id: creationActivity.id,
              taskId: creationActivity.task_id,
              userId: creationActivity.user_id,
              activityType: creationActivity.activity_type as ActivityType,
              timestamp: creationActivity.timestamp,
              data: creationActivity.data,
              description: creationActivity.description,
              completionPercentage: creationActivity.completion_percentage,
              status: creationActivity.status as TaskStatus,
              createdAt: creationActivity.timestamp,
            });
          }
          if (statusChangeActivity) {
            activities.push({
              id: statusChangeActivity.id,
              taskId: statusChangeActivity.task_id,
              userId: statusChangeActivity.user_id,
              activityType: statusChangeActivity.activity_type as ActivityType,
              timestamp: statusChangeActivity.timestamp,
              data: statusChangeActivity.data,
              description: statusChangeActivity.description,
              completionPercentage: statusChangeActivity.completion_percentage,
              status: statusChangeActivity.status as TaskStatus,
              createdAt: statusChangeActivity.timestamp,
            });
          }

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
              status: resolveClientTaskStatus(data) as TaskStatus,
              completionPercentage: data.completion_percentage,
              assignedTo: data.assigned_to || [],
              assignedBy: data.assigned_by,
              locationOnSite: data.location_on_site || undefined,
              location: data.location,
              attachments: data.attachments || [],
              accepted: Boolean(data.accepted),
              acceptedBy: data.accepted_by || undefined,
              acceptedAt: data.accepted_at || undefined,
              createdAt: data.created_at,
              activities,
              updates: activities
                .filter((activity) =>
                  activity.activityType === 'progress_update' || activity.activityType === 'status_change'
                )
                .map((activity) => ({
                  id: activity.id,
                  description: activity.description,
                  photos: (activity.data as any)?.photos || [],
                  completionPercentage: activity.completionPercentage || 0,
                  status: activity.status || ('new' as TaskStatus),
                  timestamp: activity.timestamp,
                  userId: activity.userId,
                })),
            }]
          }));
          
          return data.id;
        } catch (error: any) {
          console.error('Error creating subtask:', error);
          throw error;
        }
      },

      createNestedSubTask: async (taskId, parentSubTaskId, subTaskData) => {
        assertValidTaskCreateInput({
          title: subTaskData.title,
          projectId: subTaskData.projectId,
          assignedBy: subTaskData.assignedBy,
          assignedTo: subTaskData.assignedTo,
        });

        const initialStatus = resolveInitialTaskCreateStatus(
          subTaskData.assignedBy,
          subTaskData.assignedTo,
        );
        const isCreatorAssigned = initialStatus === "in_progress";

        // Similar to createSubTask but with parent_sub_task_id
        if (!supabase) {
          const newSubTask: SubTask = {
            ...subTaskData,
            id: `subtask-${Date.now()}`,
            parentTaskId: taskId,
            createdAt: new Date().toISOString(),
            status: initialStatus,
            completionPercentage: 0,
            activities: [],
            updates: [], // New nested subtask has no updates yet
            accepted: isCreatorAssigned,
            acceptedBy: isCreatorAssigned ? subTaskData.assignedBy : undefined,
            acceptedAt: isCreatorAssigned ? new Date().toISOString() : null,
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
              status: initialStatus,
              current_status: initialStatus,
              completion_percentage: 0,
              assigned_to: subTaskData.assignedTo,
              assigned_by: subTaskData.assignedBy,
              attachments: subTaskData.attachments,
              // Auto-accept if creator is assigned to the nested subtask
              accepted: isCreatorAssigned ? true : false,
              accepted_by: isCreatorAssigned ? subTaskData.assignedBy : null,
              accepted_at: isCreatorAssigned ? new Date().toISOString() : null,
            })
            .select()
            .single();

          if (error) throw error;

          const creatorName = await (async () => {
            try {
              const { data } = await supabase
                .from('users')
                .select('name')
                .eq('id', subTaskData.assignedBy)
                .single();

              return data?.name || 'Unknown User';
            } catch {
              return 'Unknown User';
            }
          })();

          const creationData = {
            title: subTaskData.title,
            assignedTo: subTaskData.assignedTo,
            assignedBy: subTaskData.assignedBy,
          };
          const creationTimestamp = new Date().toISOString();
          const { data: creationActivity, error: creationError } = await supabase
            .from('task_activities')
            .insert({
              task_id: data.id,
              user_id: subTaskData.assignedBy,
              activity_type: 'creation' as ActivityType,
              timestamp: creationTimestamp,
              data: creationData,
              description: `Task created by ${creatorName}`,
              completion_percentage: 0,
              status: 'new',
            })
            .select()
            .single();

          if (creationError) {
            console.error('Error creating nested subtask creation activity:', creationError);
          }

          let statusChangeActivity = null;
          if (isCreatorAssigned) {
            const statusChangeData = {
              fromStatus: 'new' as TaskStatus,
              toStatus: 'in_progress' as TaskStatus,
              reason: `Task auto-accepted by ${creatorName}`,
            };
            const statusChangeTimestamp = new Date().toISOString();
            const { data: statusActivity, error: statusError } = await supabase
              .from('task_activities')
              .insert({
                task_id: data.id,
                user_id: subTaskData.assignedBy,
                activity_type: 'status_change' as ActivityType,
                timestamp: statusChangeTimestamp,
                data: statusChangeData,
                description: `Task accepted by ${creatorName}`,
                completion_percentage: 0,
                status: 'in_progress',
              })
              .select()
              .single();

            if (statusError) {
              console.error('Error creating nested subtask status change activity:', statusError);
            } else {
              statusChangeActivity = statusActivity;
            }
          }

          const activities: TaskActivity[] = [];
          if (creationActivity) {
            activities.push({
              id: creationActivity.id,
              taskId: creationActivity.task_id,
              userId: creationActivity.user_id,
              activityType: creationActivity.activity_type as ActivityType,
              timestamp: creationActivity.timestamp,
              data: creationActivity.data,
              description: creationActivity.description,
              completionPercentage: creationActivity.completion_percentage,
              status: creationActivity.status as TaskStatus,
              createdAt: creationActivity.timestamp,
            });
          }
          if (statusChangeActivity) {
            activities.push({
              id: statusChangeActivity.id,
              taskId: statusChangeActivity.task_id,
              userId: statusChangeActivity.user_id,
              activityType: statusChangeActivity.activity_type as ActivityType,
              timestamp: statusChangeActivity.timestamp,
              data: statusChangeActivity.data,
              description: statusChangeActivity.description,
              completionPercentage: statusChangeActivity.completion_percentage,
              status: statusChangeActivity.status as TaskStatus,
              createdAt: statusChangeActivity.timestamp,
            });
          }
          
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
              status: resolveClientTaskStatus(data) as TaskStatus,
              completionPercentage: data.completion_percentage,
              assignedTo: data.assigned_to || [],
              assignedBy: data.assigned_by,
              locationOnSite: data.location_on_site || undefined,
              location: data.location,
              attachments: data.attachments || [],
              accepted: Boolean(data.accepted),
              acceptedBy: data.accepted_by || undefined,
              acceptedAt: data.accepted_at || undefined,
              createdAt: data.created_at,
              activities,
              updates: activities
                .filter((activity) =>
                  activity.activityType === 'progress_update' || activity.activityType === 'status_change'
                )
                .map((activity) => ({
                  id: activity.id,
                  description: activity.description,
                  photos: (activity.data as any)?.photos || [],
                  completionPercentage: activity.completionPercentage || 0,
                  status: activity.status || ('new' as TaskStatus),
                  timestamp: activity.timestamp,
                  userId: activity.userId,
                })),
            }]
          }));
          
          return data.id;
        } catch (error: any) {
          console.error('Error creating nested subtask:', error);
          throw error;
        }
      },

      updateSubTask: async (taskId, subTaskId, updates) => {
        const currentSubTask = get().tasks.find((t) => t.id === subTaskId);

        if (currentSubTask) {
          assertValidTaskUpdate(
            {
              title: currentSubTask.title,
              projectId: currentSubTask.projectId,
              assignedBy: currentSubTask.assignedBy,
              assignedTo: currentSubTask.assignedTo,
              status: currentSubTask.status,
            },
            {
              title: updates.title,
              projectId: updates.projectId,
              assignedBy: updates.assignedBy,
              assignedTo: updates.assignedTo,
              status: updates.status,
            },
          );
        }

        if (!supabase) {
          const updateNestedChildren = (children: Task[] | undefined): Task[] | undefined => {
            if (!children) {
              return children;
            }

            return children.map((child) => {
              if (child.id === subTaskId) {
                return { ...child, ...updates };
              }

              return {
                ...child,
                children: updateNestedChildren(child.children),
              };
            });
          };

          // Fallback to local update
          set(state => ({
            tasks: state.tasks.map(task =>
              task.id === taskId
                ? {
                    ...task,
                    children: updateNestedChildren(task.children),
                  }
                : task
            )
          }));
          return;
        }

        try {
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
        const findNestedSubTask = (children: Task[] | undefined): Task | undefined => {
          if (!children) {
            return undefined;
          }

          for (const child of children) {
            if (child.id === subTaskId) {
              return child;
            }

            const nestedMatch = findNestedSubTask(child.children);
            if (nestedMatch) {
              return nestedMatch;
            }
          }

          return undefined;
        };

        const parentTask = get().tasks.find((task) => task.id === taskId);
        const subTask =
          get().tasks.find(
            (task) => task.id === subTaskId && (task.parentTaskId === taskId || task.rootTaskId === taskId),
          ) ?? findNestedSubTask(parentTask?.children);
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

        // Compare and track changes for metadata fields
        // Note: 'assignedTo' is tracked separately as 'assignment' activity
        // Note: 'status' is tracked separately as 'status_change' activity
        const metadataFields = [
          'title',
          'description',
          'dueDate',
          'priority',
          'category',
          'billingStatus',
          'taskReference',
        ];

        metadataFields.forEach((field) => {
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
      name: "insite-tasks-supabase-v1",
      storage: createJSONStorage(() => AsyncStorage),
      merge: (persistedState, currentState) => {
        const persisted = (persistedState as Partial<TaskStore> | undefined) || {};

        return {
          ...currentState,
          ...persisted,
          tasks: normalizePersistedTasks(persisted.tasks as Task[] | undefined),
          archivedTasks: normalizePersistedTasks(persisted.archivedTasks as Task[] | undefined),
          taskReadStatuses: Array.isArray(persisted.taskReadStatuses)
            ? persisted.taskReadStatuses
            : currentState.taskReadStatuses,
          allTasksFetchTimestamp:
            persisted.allTasksFetchTimestamp ?? currentState.allTasksFetchTimestamp,
          taskQueryMeta: persisted.taskQueryMeta || currentState.taskQueryMeta,
        };
      },
      partialize: (state) => ({
        // Persist read-state only. Full task/archived payloads + queryMeta maps were
        // JSON.stringified on every write; Hermes OOM'd the JS heap after login under
        // Maestro (Object.entries → JSON.stringify in crash stacks). Refetch from Supabase.
        tasks: [],
        archivedTasks: [],
        taskReadStatuses: state.taskReadStatuses,
        allTasksFetchTimestamp: state.allTasksFetchTimestamp,
        taskQueryMeta: {},
      }),
    }
  )
);

function syncTaskDerivedState() {
  useTaskStore.subscribe((state, previousState) => {
    if (
      state.tasks === previousState.tasks &&
      state.taskReadStatuses === previousState.taskReadStatuses &&
      state.taskQueryMeta === previousState.taskQueryMeta
    ) {
      return;
    }

    const derivedState = buildTaskDerivedState(
      state.tasks,
      state.taskReadStatuses,
      state.taskQueryMeta
    );

    useTaskStore.setState(derivedState);
  });

  const initialState = useTaskStore.getState();
  useTaskStore.setState(
    buildTaskDerivedState(
      initialState.tasks,
      initialState.taskReadStatuses,
      initialState.taskQueryMeta
    )
  );
}

syncTaskDerivedState();

export {
  selectChildTaskIds,
  selectTaskEntity,
  selectTaskIdsAssignedByUser,
  selectTaskIdsByProject,
  selectTaskIdsByUser,
  selectTaskPreview,
  selectTaskQueryMeta,
  selectTopLevelTaskIdsByProject,
  useChildTaskIds,
  useTaskEntity,
  useTaskIdsAssignedByUser,
  useTaskIdsByProject,
  useTaskIdsByUser,
  useTaskPreview,
  useTaskQueryMeta,
  useTopLevelTaskIdsByProject,
} from "./taskStore.selectors";
