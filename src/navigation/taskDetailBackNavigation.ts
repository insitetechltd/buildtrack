import { CommonActions, StackActions } from "@react-navigation/native";
import { exitUpdateProgressScreen, type PhotoFlowStackNav } from "./photoFlowNavigation";
import { promptCaptureFirstSource } from "./captureFirstCameraFlow";
import {
  resolveReportTriageShortcut,
  resolveTaskDetailUpdateShortcut,
  resolveTasksListCreateShortcut,
} from "./photoShortcutRoutes";
import {
  navigateToCreateTaskRoute,
  type CreateTaskRouteNavigation,
  type DashboardTaskDetailBackNavigation,
  type RootTabLikeNavigation,
  type StackBackNavigation,
  type TasksTaskDetailBackNavigation,
  popCurrentStack,
} from "./rootNavigationHelpers";
import type { CreateTaskParams } from "./navigationTypes";
import type { CreateTaskRouteIntent } from "./newInformationChooser";
import { rootNavigationRef } from "./rootNavigationRef";
import {
  setTasksCreateDialExpanded,
  toggleTasksCreateDialExpanded,
} from "./tasksCreateSpeedDialStore";
import {
  setReportTriageDialExpanded,
  toggleReportTriageDialExpanded,
} from "./reportTriageSpeedDialStore";
import type { ReportTriageDialAction } from "../components/ReportTriageSpeedDial";

export function returnToCreateTaskRoute(
  navigation: CreateTaskRouteNavigation,
  params: CreateTaskParams,
) {
  const navigationState = navigation.getState?.();
  const currentRoutes = navigationState?.routes || [];
  const currentIndex =
    typeof navigationState?.index === "number"
      ? navigationState.index
      : currentRoutes.length - 1;

  let createTaskIndex = -1;
  for (let i = currentIndex - 1; i >= 0; i -= 1) {
    const name = currentRoutes[i]?.name;
    if (name === "CreateTask" || name === "CreateTaskMain") {
      createTaskIndex = i;
      break;
    }
  }

  if (createTaskIndex < 0 || navigation.canGoBack?.() === false) {
    navigateToCreateTaskRoute(navigation, params);
    return;
  }

  const createTaskKey = currentRoutes[createTaskIndex]?.key;
  const popCount = currentIndex - createTaskIndex;
  if (popCount > 0 && navigation.dispatch) {
    navigation.dispatch(StackActions.pop(popCount) as any);
  } else {
    navigation.goBack();
  }

  setTimeout(() => {
    if (createTaskKey && navigation.dispatch) {
      navigation.dispatch({
        ...CommonActions.setParams(params),
        source: createTaskKey,
      });
      return;
    }

    navigation.setParams?.(params);
  }, 150);
}

export function handleDashboardTaskDetailBack(
  navigation: DashboardTaskDetailBackNavigation,
) {
  if (popCurrentStack(navigation)) {
    return;
  }

  const parentNav = navigation.getParent?.() as RootTabLikeNavigation | undefined;
  parentNav?.navigate("Activity");
}

export function handleTasksTaskDetailBack(
  navigation: TasksTaskDetailBackNavigation,
) {
  if (popCurrentStack(navigation)) {
    return;
  }

  navigation.navigate("TasksList");
}

export function handleUpdateProgressBack(navigation: StackBackNavigation) {
  exitUpdateProgressScreen(navigation as unknown as PhotoFlowStackNav);
}

export function navigateTasksCreateWithIntent(
  navigation: {
    navigate: (screen: string, params?: unknown) => void;
  },
  intent: CreateTaskRouteIntent,
) {
  setTasksCreateDialExpanded(false);
  const createParams: CreateTaskParams = {
    sourceScreen: "tasks",
    intent,
    clearForm: true,
    _timestamp: Date.now(),
  };

  if (rootNavigationRef.isReady?.()) {
    rootNavigationRef.navigate("MainTabs", {
      screen: "Tasks",
      params: {
        screen: "CreateTask",
        params: createParams,
      },
    });
    return;
  }

  navigation.navigate("Tasks", {
    screen: "CreateTask",
    params: createParams,
  });
}

export function navigateReportTriageAction(
  tabState: Parameters<typeof resolveReportTriageShortcut>[0],
  action: ReportTriageDialAction,
) {
  setReportTriageDialExpanded(false);
  const shortcut = resolveReportTriageShortcut(tabState);
  if (!shortcut) {
    return;
  }

  if (action === "resolve") {
    try {
      const { useTaskStore } = require("../state/taskStore.supabase") as {
        useTaskStore: {
          getState: () => {
            resolveReport: (taskId: string, userId: string, note?: string) => Promise<void>;
          };
        };
      };
      const { useAuthStore } = require("../state/authStore") as {
        useAuthStore: { getState: () => { user?: { id?: string } | null } };
      };
      const userId = useAuthStore.getState().user?.id;
      if (!userId) {
        return;
      }
      void useTaskStore.getState().resolveReport(shortcut.taskId, userId, "Resolved without reply");
    } catch {
      // ignore — store unavailable in tests without mock
    }
    return;
  }

  const tabScreen = shortcut.tabName;
  const sourceScreen = tabScreen === "Activity" ? "dashboard" : "tasks";

  const createParams: CreateTaskParams = {
    editTaskId: shortcut.taskId,
    actionType: "triage",
    sourceScreen,
    sourceTaskId: shortcut.taskId,
    sourceSubTaskId: shortcut.subTaskId,
    clearForm: false,
    _timestamp: Date.now(),
  };
  if (rootNavigationRef.isReady?.()) {
    rootNavigationRef.navigate("MainTabs", {
      screen: tabScreen,
      params: {
        screen: "CreateTask",
        params: createParams,
      },
    });
  }
}

export function handleCameraTabPress({
  event,
  navigation,
}: {
  event: { preventDefault: () => void };
  navigation: {
    getState: () => {
      index?: number;
      routes?: Array<{ name?: string; state?: any }>;
    };
    navigate: (screen: string, params?: unknown) => void;
  };
}) {
  event.preventDefault();
  const tabState = navigation.getState();
  const reportTriage = resolveReportTriageShortcut(tabState);
  if (reportTriage) {
    setTasksCreateDialExpanded(false);
    toggleReportTriageDialExpanded();
    return;
  }

  const updateShortcut = resolveTaskDetailUpdateShortcut(tabState);
  if (updateShortcut) {
    setTasksCreateDialExpanded(false);
    setReportTriageDialExpanded(false);
    navigation.navigate(updateShortcut.tabName, {
      screen: "UpdateProgress",
      params: updateShortcut.params,
    });
    return;
  }
  if (resolveTasksListCreateShortcut(tabState)) {
    setReportTriageDialExpanded(false);
    toggleTasksCreateDialExpanded();
    return;
  }
  setTasksCreateDialExpanded(false);
  setReportTriageDialExpanded(false);
  promptCaptureFirstSource(navigation, tabState);
}
