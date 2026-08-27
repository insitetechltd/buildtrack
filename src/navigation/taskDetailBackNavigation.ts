import { CommonActions, StackActions } from "@react-navigation/native";
import { exitUpdateProgressScreen, type PhotoFlowStackNav } from "./photoFlowNavigation";
import { promptCaptureFirstSource } from "./captureFirstCameraFlow";
import { resolveTaskDetailUpdateShortcut } from "./photoShortcutRoutes";
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

export function handleCameraTabPress({
  event,
  navigation,
}: {
  event: { preventDefault: () => void };
  navigation: {
    getState: () => {
      index?: number;
      routes?: Array<{ name?: string; state?: unknown }>;
    };
    navigate: (screen: string, params?: unknown) => void;
  };
}) {
  event.preventDefault();
  const tabState = navigation.getState();
  const updateShortcut = resolveTaskDetailUpdateShortcut(tabState);
  if (updateShortcut) {
    // Task Detail: + means start an update on this task.
    navigation.navigate(updateShortcut.tabName, {
      screen: "UpdateProgress",
      params: updateShortcut.params,
    });
    return;
  }
  promptCaptureFirstSource(navigation, tabState);
}
