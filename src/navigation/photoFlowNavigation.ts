import { CommonActions, StackActions } from "@react-navigation/native";

import type { PhotoSelectionParams } from "./navigationTypes";

/** Routes that belong to the library → select-photos flow (should not nest). */
export const PHOTO_FLOW_ROUTE_NAMES = new Set([
  "PhotoSelection",
  "InAppLibraryPicker",
]);

/** Update Progress back should never land on photo picking again. */
export const UPDATE_PROGRESS_EXIT_ROUTE_NAMES = new Set([
  ...PHOTO_FLOW_ROUTE_NAMES,
  "UpdateProgress",
]);

const TASK_DETAIL_ROUTE_NAMES = new Set([
  "TaskDetail",
  "TaskDetailFromDashboard",
]);

export type PhotoFlowStackNav = {
  getState?: () =>
    | { index: number; routes: Array<{ key: string; name: string }> }
    | undefined;
  dispatch: (action: any) => void;
  goBack: () => void;
  canGoBack?: () => boolean;
  navigate?: (name: string, params?: PhotoSelectionParams | Record<string, unknown>) => void;
  replace?: (name: string, params?: PhotoSelectionParams | Record<string, unknown>) => void;
};

/**
 * Pop every PhotoSelection / InAppLibraryPicker above the underlying form.
 * Used when abandoning the whole photo flow (e.g. cancel from root library).
 */
export function dismissPhotoFlowScreens(navigation: PhotoFlowStackNav) {
  const state = navigation.getState?.();
  if (!state?.routes?.length) {
    if (navigation.canGoBack?.() !== false) {
      navigation.goBack();
    }
    return;
  }

  let keepUntil = -1;
  for (let i = state.routes.length - 1; i >= 0; i -= 1) {
    if (!PHOTO_FLOW_ROUTE_NAMES.has(state.routes[i].name)) {
      keepUntil = i;
      break;
    }
  }

  const popCount = keepUntil >= 0 ? state.routes.length - 1 - keepUntil : 0;
  if (popCount > 0) {
    navigation.dispatch(StackActions.pop(popCount));
    return;
  }

  if (navigation.canGoBack?.() !== false) {
    navigation.goBack();
  }
}

/**
 * After a successful Update Progress submit: return to the existing Task Detail
 * underneath the update/photo flow. Do NOT push another Task Detail — that leaves
 * Update Progress under the new detail and breaks header Back.
 *
 * If Task Detail is not on the stack (e.g. camera-tab shortcut), pop the update
 * flow to its anchor then navigate to the correct detail route for this stack.
 */
export function returnToTaskDetailAfterUpdateProgress(
  navigation: PhotoFlowStackNav,
  params: { taskId: string; subTaskId?: string },
) {
  const state = navigation.getState?.();
  if (!state?.routes?.length) {
    navigation.navigate?.("TaskDetail", params);
    return;
  }

  const currentIndex =
    typeof state.index === "number" ? state.index : state.routes.length - 1;

  let detailIndex = -1;
  for (let i = currentIndex - 1; i >= 0; i -= 1) {
    const routeName = state.routes[i]?.name;
    if (routeName && TASK_DETAIL_ROUTE_NAMES.has(routeName)) {
      detailIndex = i;
      break;
    }
  }

  if (detailIndex >= 0) {
    const popCount = currentIndex - detailIndex;
    if (popCount > 0 && navigation.dispatch) {
      navigation.dispatch(StackActions.pop(popCount));
      return;
    }
  }

  const isDashboardStack = state.routes.some(
    (route) =>
      route.name === "DashboardMain" || route.name === "TaskDetailFromDashboard",
  );
  const detailRoute = isDashboardStack
    ? "TaskDetailFromDashboard"
    : "TaskDetail";

  let anchorIndex = -1;
  for (let i = currentIndex; i >= 0; i -= 1) {
    const routeName = state.routes[i]?.name;
    if (routeName && !UPDATE_PROGRESS_EXIT_ROUTE_NAMES.has(routeName)) {
      anchorIndex = i;
      break;
    }
  }

  const popCount =
    anchorIndex >= 0 ? currentIndex - anchorIndex : currentIndex + 1;

  if (popCount > 0 && navigation.dispatch) {
    navigation.dispatch(StackActions.pop(popCount));
  } else if (navigation.canGoBack?.() !== false) {
    navigation.goBack();
  }

  navigation.navigate?.(detailRoute, params);
}

/**
 * Back from Update Progress = exit the whole progress + photo-pick flow.
 * Never return to PhotoSelection / InAppLibraryPicker after the user chose to leave.
 */
export function exitUpdateProgressScreen(navigation: PhotoFlowStackNav) {
  const state = navigation.getState?.();
  if (!state?.routes?.length) {
    if (navigation.canGoBack?.() !== false) {
      navigation.goBack();
    }
    return;
  }

  const currentIndex =
    typeof state.index === "number" ? state.index : state.routes.length - 1;

  let anchorIndex = -1;
  for (let i = currentIndex; i >= 0; i -= 1) {
    const routeName = state.routes[i]?.name;
    if (routeName && !UPDATE_PROGRESS_EXIT_ROUTE_NAMES.has(routeName)) {
      anchorIndex = i;
      break;
    }
  }

  const popCount =
    anchorIndex >= 0 ? currentIndex - anchorIndex : currentIndex + 1;

  if (popCount > 0 && navigation.dispatch) {
    navigation.dispatch(StackActions.pop(popCount));
    return;
  }

  if (navigation.canGoBack?.() !== false) {
    navigation.goBack();
  }
}

/**
 * Library Cancel:
 * - Add-more: Select Photos is the immediate parent → pop library only.
 * - Otherwise (form reopen / root library) → dismiss contiguous photo-flow screens.
 *   Do not jump to a stale PhotoSelection buried under an intervening Create Task.
 */
export function cancelInAppLibraryPicker(navigation: PhotoFlowStackNav) {
  const state = navigation.getState?.();
  const routes = state?.routes ?? [];
  const index = state?.index ?? routes.length - 1;

  if (index > 0 && routes[index - 1]?.name === "PhotoSelection") {
    navigation.dispatch(StackActions.pop(1));
    return;
  }

  dismissPhotoFlowScreens(navigation);
}

/**
 * After library accept:
 * - If Select Photos already exists under the library (add-more), update it and pop back.
 * - Otherwise push Select Photos so Library stays underneath (Select X → Library).
 */
export function returnToPhotoSelectionFlat(
  navigation: PhotoFlowStackNav,
  photoParams: PhotoSelectionParams,
) {
  const state = navigation.getState?.();
  const routes = state?.routes ?? [];
  const photoSelectionIndex = routes.findIndex(
    (route) => route.name === "PhotoSelection",
  );

  if (photoSelectionIndex >= 0 && state) {
    navigation.dispatch({
      ...CommonActions.setParams(photoParams),
      source: routes[photoSelectionIndex].key,
    });
    const popCount = state.index - photoSelectionIndex;
    if (popCount > 0) {
      navigation.dispatch(StackActions.pop(popCount));
    }
    return;
  }

  // Keep InAppLibraryPicker under Select Photos so Close returns to the picker.
  if (navigation.navigate) {
    navigation.navigate("PhotoSelection", photoParams);
    return;
  }
  navigation.replace?.("PhotoSelection", photoParams);
}
