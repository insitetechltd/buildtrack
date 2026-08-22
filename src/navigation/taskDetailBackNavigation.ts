import { CommonActions, StackActions } from "@react-navigation/native";
import { useAuthStore } from "../state/authStore";
import { useTaskStore } from "../state/taskStore.supabase";
import { exitUpdateProgressScreen, type PhotoFlowStackNav } from "./photoFlowNavigation";
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
import { resolveTaskDetailUpdateLockState } from "./rootTabVisibility";
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
  exitUpdateProgressScreen(navigation as PhotoFlowStackNav);
}

export function handleCameraTabPress({
  event,
  navigation,
}: {
  event: { preventDefault: () => void };
  navigation: {
    getState: () => Parameters<typeof resolveTaskDetailUpdateShortcut>[0];
    navigate: (screen: string, params?: unknown) => void;
  };
}) {
  const taskStoreState = useTaskStore.getState() as {
    tasksById?: Record<string, any>;
    tasks?: Array<any>;
  };
  const { shortcut: updateShortcut, isLocked } = resolveTaskDetailUpdateLockState({
    tabState: navigation.getState() as Parameters<typeof resolveTaskDetailUpdateShortcut>[0],
    userId: useAuthStore.getState().user?.id,
    tasksById: taskStoreState.tasksById,
    tasks: taskStoreState.tasks,
  });

  event.preventDefault();

  if (updateShortcut && !isLocked) {
    navigation.navigate(updateShortcut.tabName, {
      screen: "UpdateProgress",
      params: updateShortcut.params,
    });
    return;
  }

  navigation.navigate("Camera", {
    screen: "CreateTaskMain",
    params: undefined,
  });
}
