import type {
  CreateTaskParams,
  RootTabParamList,
  TaskDetailParams,
} from "./navigationTypes";

type RouteStateLike = {
  index?: number;
  routes?: RouteLike[];
};

type RouteLike = {
  name?: string;
  params?: Record<string, unknown>;
  state?: RouteStateLike;
};

export function shouldReturnToCreateTaskShortcut({
  returnScreen,
  actionType,
}: {
  returnScreen?: import("./navigationTypes").PhotoSelectionParams["returnScreen"];
  actionType?: string;
}) {
  return returnScreen === "UpdateProgress" && actionType === "update";
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

export function resolveTaskDetailCameraTabParams(
  tabState?: RouteStateLike,
): RootTabParamList["Camera"] | undefined {
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

  return {
    screen: "CreateTaskMain",
    params: buildPhotoShortcutCreateTaskParams({
      taskId: taskDetailParams.taskId,
      subTaskId: taskDetailParams.subTaskId,
      actionType: "photos",
      sourceScreen: activeTabName === "Activity" ? "dashboard" : "tasks",
    }),
  };
}
