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

export function resolveTaskDetailUpdateShortcut(
  tabState?: RouteStateLike,
): { tabName: "Activity" | "Tasks"; params: UpdateProgressParams } | undefined {
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
    params: {
      taskId: taskDetailParams.taskId,
      subTaskId: taskDetailParams.subTaskId,
      sourceScreen: tabName === "Activity" ? "dashboard" : "tasks",
      sourceTaskId: taskDetailParams.taskId,
      sourceSubTaskId: taskDetailParams.subTaskId,
    },
  };
}

export function resolveTasksListCreateShortcut(tabState?: RouteStateLike): boolean {
  if (resolveTaskDetailUpdateShortcut(tabState)) {
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
