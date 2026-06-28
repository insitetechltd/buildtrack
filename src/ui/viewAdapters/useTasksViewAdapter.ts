import { useMemo, useState } from "react";
import { useAuthStore } from "@/state/authStore";
import { useProjectStoreWithInit } from "@/state/projectStore.supabase";
import { useProjectFilterStore } from "@/state/projectFilterStore";
import { useTaskStore } from "@/state/taskStore.supabase";
import { isAdmin, type Priority, type Task, type TaskStatus } from "@/types/buildtrack";
import { getResponsibilityToken, isTaskOverdue } from "@/utils/accountabilityEngine";
import type {
  TasksScreenRowItem,
  TasksScreenViewAdapterOutput,
} from "@/ui/contracts/viewAdapters";
import type { StatusSemanticToken } from "@/ui/contracts/primitives";
import type { TasksSearchInputData } from "@/ui/mappers/tasksMappers";

function formatTaskStatusLabel(status: TaskStatus): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function mapTaskStatusToToken(status: TaskStatus): StatusSemanticToken {
  switch (status) {
    case "new":
    case "assigned":
    case "received":
    case "not_started":
      return "task_new";
    case "accepted":
      return "task_accepted";
    case "in_progress":
    case "wip":
      return "task_in_progress";
    case "submitted_for_review":
    case "reviewing":
      return "task_submitted_for_review";
    case "approved":
    case "completed":
    case "done":
      return "task_approved";
    case "declined":
    case "rejected":
      return "task_rejected";
    case "cancelled":
      return "task_cancelled";
    default:
      return "custom";
  }
}

function formatPriority(priority: Priority): string {
  return priority.replace(/\b\w/g, (character) => character.toUpperCase());
}

function buildAssigneeSummary(task: Task): string {
  const assignees = task.assignedTo ?? [];
  if (assignees.length === 0) {
    return "Unassigned";
  }

  if (assignees.length === 1) {
    return "1 assignee";
  }

  return `${assignees.length} assignees`;
}

export interface TasksViewAdapterProps {
  onNavigateToTaskDetail?: (taskId: string) => void;
}

export interface TasksViewAdapterHookResult {
  output: TasksScreenViewAdapterOutput;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  searchInput: TasksSearchInputData;
  visibility: {
    showCreateTaskFab: boolean;
    showProfileShortcut: boolean;
    showProjectPickerShortcut: boolean;
    showDeveloperSettingsShortcut: boolean;
    showResetFiltersShortcut: boolean;
  };
  actions: {
    resetFilters: () => void;
  };
}

export function useTasksViewAdapter(props?: TasksViewAdapterProps): TasksViewAdapterHookResult {
  const { user } = useAuthStore();
  const taskStore = useTaskStore();
  const projectStore = useProjectStoreWithInit();
  const projectFilterStore = useProjectFilterStore();
  const currentUserId = user?.id ?? "";

  const tasks = taskStore.tasks ?? [];
  const isLoadingTasks = Boolean(taskStore.isLoading);
  const selectedProjectId = projectFilterStore.selectedProjectId ?? null;
  const [searchQuery, setSearchQuery] = useState("");
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();

  const { taskRowItems, scalarMetrics, continuity, structuralState } = useMemo(() => {
    const hasTasks = tasks.length > 0;
    const isInitialLoading = isLoadingTasks && !hasTasks;
    const isBackgroundRefreshing = isLoadingTasks && hasTasks;
    const structuralState: TasksSearchInputData["structuralState"] = isInitialLoading
      ? "loading"
      : hasTasks
        ? isBackgroundRefreshing
          ? "stale"
          : "stale"
        : "empty";

    const filteredTasks = tasks.filter((task) => {
      // 1. Project filter
      if (selectedProjectId && task.projectId !== selectedProjectId) return false;

      // 2. Section filter logic via ResponsibilityToken / ActorRelationship
      const token = getResponsibilityToken(task, currentUserId);
      const isAssignedToUser = (task.assignedTo ?? []).includes(currentUserId);
      const isOriginator = task.assignedBy === currentUserId && !isAssignedToUser;

      const sectionFilter = projectFilterStore.sectionFilter;

      if (sectionFilter === "inbox") {
        // Assigned to me by others
        if (!isAssignedToUser || task.assignedBy === currentUserId) return false;
      } else if (sectionFilter === "outbox") {
        // Assigned by me to others
        if (!isOriginator) return false;
      } else if (sectionFilter === "my_tasks") {
        // Self assigned
        if (!isAssignedToUser || task.assignedBy !== currentUserId) return false;
      } else if (sectionFilter === "my_work") {
        // Inbox + my_tasks
        if (!isAssignedToUser) return false;
      }

      // 3. Status filter logic
      const statusFilter = projectFilterStore.statusFilter;
      if (statusFilter !== "all") {
        if (statusFilter === "new" && task.status !== "new") {
          return false;
        }
        if (statusFilter === "wip" && task.status !== "in_progress" && task.status !== "accepted") {
          return false;
        }
        if (statusFilter === "reviewing" && task.status !== "submitted_for_review") {
          return false;
        }
      }

      return true;
    });

    const searchedTasks =
      normalizedSearchQuery.length === 0
        ? filteredTasks
        : filteredTasks.filter((task) =>
            task.title.toLowerCase().includes(normalizedSearchQuery),
          );

    const tree = taskStore.buildTaskTree(searchedTasks);

    const flatTasks: Array<{ task: Task; level: number }> = [];
    function flattenNode(node: any, level: number = 0) {
      // In taskStore.buildTaskTree, nodes are just tasks with an optional `children` array
      flatTasks.push({ task: node, level });
      if (node.children) {
        node.children.forEach((child: any) => flattenNode(child, level + 1));
      }
    }
    tree.forEach((node) => flattenNode(node, 0));

    const rows: TasksScreenRowItem[] =
      flatTasks.length > 0
        ? flatTasks.map(({ task, level }) => {
            const project = projectStore.getProjectById(task.projectId);

            return {
              id: `tasks-row:${task.id}`,
              taskId: task.id,
              title: task.title,
              onPress: props?.onNavigateToTaskDetail ? () => props?.onNavigateToTaskDetail?.(task.id) : undefined,
              statusToken: mapTaskStatusToToken(task.status),
              statusLabel: formatTaskStatusLabel(task.status),
              responsibilityToken: getResponsibilityToken(task, currentUserId),
              priorityLabel: formatPriority(task.priority),
              dueDateLabel: task.dueDate ? task.dueDate.slice(0, 10) : undefined,
              assigneeSummary: buildAssigneeSummary(task),
              projectName: project?.name ?? "Project",
              isOverdue: isTaskOverdue(task),
              indentationLevel: level > 0 ? level : undefined,
              density: "standard",
              structuralState,
            };
          })
        : [
            {
              id: "tasks-row:empty",
              taskId: "empty",
              title: "No Tasks",
              statusToken: "workspace_empty",
              statusLabel: "Empty",
              responsibilityToken: "VOID_ARCHIVED",
              priorityLabel: "—",
              dueDateLabel: undefined,
              assigneeSummary: "—",
              projectName: selectedProjectId ? "Project" : "Workspace",
              isOverdue: false,
              density: "standard",
              structuralState,
            },
          ];

    const overdueVisibleTaskCount = rows.filter((row) => row.isOverdue).length;

    return {
      taskRowItems: rows,
      scalarMetrics: {
        totalVisibleTaskCount: rows.length,
        overdueVisibleTaskCount,
        selectedProjectTaskCount: searchedTasks.length,
        hasActiveFilters: Boolean(selectedProjectId),
      },
      continuity: {
        isInitialLoading,
        isBackgroundRefreshing,
        hasCachedFrame: searchedTasks.length > 0,
        shouldRenderSkeletonShell: isInitialLoading,
        shouldRenderEmptyState: !isInitialLoading && searchedTasks.length === 0,
        freshnessLabel: isBackgroundRefreshing ? "Refreshing" : isInitialLoading ? "Loading" : "Ready",
      },
      structuralState,
    };
  }, [
    currentUserId,
    isLoadingTasks,
    normalizedSearchQuery,
    projectStore,
    selectedProjectId,
    tasks,
    projectFilterStore.sectionFilter,
    projectFilterStore.statusFilter,
  ]);

  const readiness = useMemo(() => {
    return {
      hasInitialFrame: true,
      hasUsableData: taskRowItems.length > 0,
      isBackgroundRefreshing: continuity.isBackgroundRefreshing,
      isNavigationTransitionActive: false,
    };
  }, [continuity.isBackgroundRefreshing, taskRowItems.length]);

  const output: TasksScreenViewAdapterOutput = {
    screenId: "TasksScreen",
    readiness,
    continuity,
    filterSummary: {
      selectedProjectId,
      sectionFilterLabel: "All",
      statusFilterLabel: "All",
      sortLabel: "Default",
    },
    taskRowItems,
    scalarMetrics,
  };

  const searchInput: TasksSearchInputData = {
    id: "tasks-search",
    label: "Search",
    value: searchQuery,
    placeholder: "Search tasks",
    density: "standard",
    structuralState,
  };

  const resetFilters = () => {
    setSearchQuery("");
    projectFilterStore.resetFilters();
    void projectFilterStore.setSelectedProject(null, user?.id);
  };

  return {
    output,
    searchQuery,
    setSearchQuery,
    searchInput,
    visibility: {
      showCreateTaskFab: Boolean(user && !isAdmin(user)),
      showProfileShortcut: Boolean(user),
      showProjectPickerShortcut: Boolean(user),
      showDeveloperSettingsShortcut: __DEV__,
      showResetFiltersShortcut: Boolean(user),
    },
    actions: {
      resetFilters,
    },
  };
}
