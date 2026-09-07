import { useProjectFilterStore } from "@/state/projectFilterStore";
import { useProjectStore } from "@/state/projectStore.supabase";
import { useTaskStore } from "@/state/taskStore.supabase";

/**
 * Drop persisted workspace / membership / in-memory tasks when auth identity
 * changes. Prevents the previous user's selected project + assignment cache
 * from feeding Activity/Tasks under the next login (cross-tenant bleed with
 * leaky authenticated SELECT policies).
 */
export function clearWorkspaceSessionState(reason = "auth-identity"): void {
  if (__DEV__) {
    console.log(`🧹 [clearWorkspaceSessionState] ${reason}`);
  }

  useProjectFilterStore.setState({
    selectedProjectId: null,
    workspaceReady: false,
    workspaceReadyUserId: null,
    tasksLaunchPreset: null,
  });

  useProjectStore.setState({
    projects: [],
    userAssignments: [],
    projectsById: {},
    projectSummaryById: {},
    userAssignmentsById: {},
    projectIdsByCompany: {},
    projectIdsByUser: {},
    assignmentIdsByUser: {},
    assignmentIdsByProject: {},
    queryProjectIds: {},
    projectQueryMeta: {},
    assignmentQueryMeta: {},
    isLoading: false,
    error: null,
  });

  useTaskStore.setState({
    tasks: [],
    archivedTasks: [],
    tasksById: {},
    taskPreviewById: {},
    taskIdsByProject: {},
    topLevelTaskIdsByProject: {},
    childTaskIdsByParent: {},
    taskIdsByUser: {},
    taskIdsAssignedByUser: {},
    queryTaskIds: {},
    taskQueryMeta: {},
    taskFetchTimestamps: {},
    allTasksFetchTimestamp: null,
    isLoading: false,
    error: null,
  });
}
