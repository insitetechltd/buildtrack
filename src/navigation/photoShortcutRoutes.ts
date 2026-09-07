import type {
  CreateTaskParams,
  PhotoSelectionParams,
  RootTabParamList,
  TaskDetailParams,
  UpdateProgressParams,
} from "./navigationTypes";

export type RouteStateLike = {
  index?: number;
  routes?: RouteLike[];
};

export type RouteLike = {
  name?: string;
  params?: Record<string, unknown> | object;
  state?: any;
};

export function shouldReturnToCreateTaskShortcut({
  returnScreen: _returnScreen,
  actionType: _actionType,
}: {
  returnScreen?: PhotoSelectionParams["returnScreen"];
  actionType?: string;
}) {
  // S-UX-01Q C3: Update Progress photo returns stay on UpdateProgress (no CreateTask TaskAction).
  return false;
}

export function buildPhotoShortcutCreateTaskParams({
  taskId,
  subTaskId,
  actionType,
  sourceScreen,
  sourceTaskId,
  sourceSubTaskId,
  selectedPhotos,
  uploadedPhotoUrls,
}: {
  taskId: string;
  subTaskId?: string;
  actionType: "photos" | "update";
  sourceScreen?: CreateTaskParams["sourceScreen"];
  sourceTaskId?: string;
  sourceSubTaskId?: string;
  selectedPhotos?: CreateTaskParams["selectedPhotos"];
  uploadedPhotoUrls?: string[];
}): CreateTaskParams {
  return {
    editTaskId: taskId,
    actionType,
    cameraLaunchContext: "task_detail",
    postCaptureDefault: "same_task_update",
    updateTargetSubTaskId: subTaskId,
    sourceScreen,
    sourceTaskId: sourceTaskId ?? taskId,
    sourceSubTaskId: sourceSubTaskId ?? subTaskId,
    selectedPhotos,
    uploadedPhotoUrls,
  };
}

function getActiveRoute(state?: RouteStateLike): RouteLike | undefined {
  const routes = state?.routes;
  if (!routes?.length) {
    return undefined;
  }

  const activeIndex =
    typeof state?.index === "number" && routes[state.index]
      ? state.index
      : routes.length - 1;
  const activeRoute = routes[activeIndex];

  return getActiveRoute(activeRoute?.state) ?? activeRoute;
}

function getActiveIndex(state?: RouteStateLike) {
  const routes = state?.routes;
  if (!routes?.length) {
    return undefined;
  }

  if (typeof state?.index === "number" && routes[state.index]) {
    return state.index;
  }

  return routes.length - 1;
}

/** Shared Task Detail context for Update vs Report-triage center-FAB routing. */
export function resolveTaskDetailRouteContext(
  tabState?: RouteStateLike,
): {
  tabName: "Activity" | "Tasks";
  taskId: string;
  subTaskId?: string;
} | undefined {
  const activeTabIndex = getActiveIndex(tabState);
  const activeTabName =
    activeTabIndex === undefined ? undefined : tabState?.routes?.[activeTabIndex]?.name;
  const activeTabRoute = getActiveRoute({
    index: activeTabIndex,
    routes: tabState?.routes?.map((route) => ({
      ...route,
      state: undefined,
    })),
  });

  if (activeTabRoute?.name !== "Activity" && activeTabRoute?.name !== "Tasks") {
    return undefined;
  }

  const nestedActiveRoute = getActiveRoute(
    activeTabIndex === undefined ? undefined : tabState?.routes?.[activeTabIndex]?.state,
  );

  if (
    nestedActiveRoute?.name !== "TaskDetail" &&
    nestedActiveRoute?.name !== "TaskDetailFromDashboard"
  ) {
    return undefined;
  }

  const taskDetailParams = nestedActiveRoute.params as TaskDetailParams | undefined;
  if (!taskDetailParams?.taskId) {
    return undefined;
  }

  const tabName = activeTabName === "Activity" ? "Activity" : "Tasks";
  return {
    tabName,
    taskId: taskDetailParams.taskId,
    subTaskId: taskDetailParams.subTaskId,
  };
}

export function resolveTaskDetailUpdateShortcut(
  tabState?: RouteStateLike,
): { tabName: "Activity" | "Tasks"; params: UpdateProgressParams } | undefined {
  const context = resolveTaskDetailRouteContext(tabState);
  if (!context) {
    return undefined;
  }

  // Reported + PM triage uses the center "+" dial instead of one-shot Update.
  if (resolveReportTriageShortcut(tabState)) {
    return undefined;
  }

  return {
    tabName: context.tabName,
    params: {
      taskId: context.taskId,
      subTaskId: context.subTaskId,
      sourceScreen: context.tabName === "Activity" ? "dashboard" : "tasks",
      sourceTaskId: context.taskId,
      sourceSubTaskId: context.subTaskId,
    },
  };
}

/**
 * When true, center FAB should toggle Report triage dial (Reply / Create / Resolve).
 * Import-time check against stores — keep side-effect free except reads.
 */
export function resolveReportTriageShortcut(
  tabState?: RouteStateLike,
): {
  tabName: "Activity" | "Tasks";
  taskId: string;
  subTaskId?: string;
} | undefined {
  const context = resolveTaskDetailRouteContext(tabState);
  if (!context) {
    return undefined;
  }

  try {
    // Lazy require avoids circular imports with AppNavigator.
    const { useTaskStore } = require("../state/taskStore.supabase") as {
      useTaskStore: { getState: () => { tasks: Array<{ id: string; status?: string }> } };
    };
    const { useAuthStore } = require("../state/authStore") as {
      useAuthStore: { getState: () => { user: unknown } };
    };
    const { isManagerOrAdmin } = require("../types/buildtrack") as {
      isManagerOrAdmin: (user: unknown) => boolean;
    };

    const task = useTaskStore.getState().tasks.find((entry) => entry.id === context.taskId);
    const user = useAuthStore.getState().user;
    if (!task || task.status !== "reported" || !isManagerOrAdmin(user)) {
      return undefined;
    }
    return context;
  } catch {
    return undefined;
  }
}

export function resolveTasksListCreateShortcut(tabState?: RouteStateLike): boolean {
  if (resolveTaskDetailRouteContext(tabState)) {
    return false;
  }

  const activeTabIndex = getActiveIndex(tabState);
  const activeTabName =
    activeTabIndex === undefined ? undefined : tabState?.routes?.[activeTabIndex]?.name;
  if (activeTabName !== "Tasks") {
    return false;
  }

  const nestedActiveRoute = getActiveRoute(
    activeTabIndex === undefined ? undefined : tabState?.routes?.[activeTabIndex]?.state,
  );

  return !nestedActiveRoute?.name || nestedActiveRoute.name === "TasksList";
}

/** @deprecated Prefer resolveTaskDetailUpdateShortcut (C3). Kept for compatibility shims. */
export function resolveTaskDetailCameraTabParams(
  tabState?: RouteStateLike,
): RootTabParamList["Camera"] | undefined {
  const shortcut = resolveTaskDetailUpdateShortcut(tabState);
  if (!shortcut) {
    return undefined;
  }

  return {
    screen: "CreateTaskMain",
    params: buildPhotoShortcutCreateTaskParams({
      taskId: shortcut.params.taskId,
      subTaskId: shortcut.params.subTaskId,
      actionType: "update",
      sourceScreen: shortcut.params.sourceScreen === "dashboard" ? "dashboard" : "tasks",
    }),
  };
}
