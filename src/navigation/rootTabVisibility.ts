import type { ViewStyle } from "react-native";
import { resolveTaskDetailUpdateShortcut } from "./photoShortcutRoutes";

/** Root bottom-tab chrome — shared by Camera FAB and User Management add-user FAB. */
export const ROOT_TAB_BAR_STYLE: ViewStyle = {
  height: 76,
  overflow: "visible",
  paddingTop: 8,
  paddingBottom: 10,
  borderTopColor: "#e5e7eb",
  backgroundColor: "#ffffff",
};

/** Raised center FAB geometry (Camera / Add Task). Color stays per-surface. */
export const ROOT_TAB_CENTER_FAB_TOP_OFFSET = -16;

export const ROOT_TAB_CENTER_FAB_LAYOUT: ViewStyle = {
  alignItems: "center",
  alignSelf: "center",
  borderColor: "#ffffff",
  borderRadius: 32,
  borderWidth: 4,
  elevation: 8,
  height: 64,
  justifyContent: "center",
  minWidth: 64,
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.28,
  shadowRadius: 14,
  top: ROOT_TAB_CENTER_FAB_TOP_OFFSET,
  width: 64,
};

export const ROOT_TAB_CENTER_FAB_SLOT: ViewStyle = {
  alignItems: "center",
  alignSelf: "stretch",
  flex: 1,
  justifyContent: "center",
};

export function shouldCollapseRootSideTabsOnTaskDetailRoute(routeName?: string) {
  return routeName === "TaskDetail" || routeName === "TaskDetailFromDashboard";
}

function isApprovedLifecycleStatus(status?: string | null) {
  return status === "approved" || status === "completed" || status === "done";
}

function isTaskDetailUpdateLockedForAssignee(args: {
  task?:
    | {
        assignedTo?: string[] | null;
        primaryAssigneeId?: string | null;
        delegatedUserIds?: string[] | null;
        assignedBy?: string | null;
        status?: string | null;
        completionPercentage?: number | null;
      }
    | null;
  userId?: string | null;
}) {
  const task = args.task;
  const userId = args.userId == null ? "" : String(args.userId);
  if (!task || !userId) {
    return false;
  }

  const assignedIds = new Set(
    [
      ...(Array.isArray(task.assignedTo) ? task.assignedTo : []),
      ...(Array.isArray(task.delegatedUserIds) ? task.delegatedUserIds : []),
      task.primaryAssigneeId ?? undefined,
    ]
      .filter(Boolean)
      .map((id) => String(id)),
  );
  const isAssignedToUser = assignedIds.has(userId);
  const isTaskCreator = String(task.assignedBy ?? "") === userId;
  if (!isAssignedToUser || isTaskCreator) {
    return false;
  }

  return task.status === "submitted_for_review" || isApprovedLifecycleStatus(task.status);
}

export function resolveTaskDetailUpdateLockState(args: {
  tabState?: Parameters<typeof resolveTaskDetailUpdateShortcut>[0];
  userId?: string | null;
  tasksById?: Record<string, any>;
  tasks?: Array<any>;
}) {
  const shortcut = resolveTaskDetailUpdateShortcut(args.tabState);
  if (!shortcut?.params?.taskId) {
    return { shortcut, isLocked: false };
  }

  const taskId = String(shortcut.params.taskId);
  const task =
    args.tasksById?.[taskId] ?? args.tasks?.find((candidate) => candidate?.id === taskId);
  return {
    shortcut,
    isLocked: isTaskDetailUpdateLockedForAssignee({
      task,
      userId: args.userId,
    }),
  };
}

export function shouldHideRootSideTabsForTabState(
  tabState?: Parameters<typeof resolveTaskDetailUpdateShortcut>[0],
) {
  return Boolean(resolveTaskDetailUpdateShortcut(tabState));
}

export function shouldHideTabBarOnCreateTaskRoute(routeName?: string) {
  return (
    routeName === "CreateTaskMain" ||
    routeName === "UpdateProgress" ||
    routeName === "PhotoSelection" ||
    routeName === "InAppLibraryPicker" ||
    routeName === "CaptureSession" ||
    routeName === "CaptureTaskPicker"
  );
}

export function buildRootTabBarStyleForRoute(
  routeName?: string,
  initialRouteName?: string,
): ViewStyle {
  const resolvedRouteName = routeName ?? initialRouteName;
  const shouldHideTabBar = shouldHideTabBarOnCreateTaskRoute(resolvedRouteName);

  if (!shouldHideTabBar) {
    return ROOT_TAB_BAR_STYLE;
  }

  return {
    ...ROOT_TAB_BAR_STYLE,
    display: "none",
  };
}
