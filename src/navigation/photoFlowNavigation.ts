import { CommonActions, StackActions } from "@react-navigation/native";

import type { PhotoSelectionParams } from "./navigationTypes";

/** Routes that belong to the library → select-photos flow (should not nest). */
export const PHOTO_FLOW_ROUTE_NAMES = new Set([
  "PhotoSelection",
  "InAppLibraryPicker",
]);

export type PhotoFlowStackNav = {
  getState?: () =>
    | { index: number; routes: Array<{ key: string; name: string }> }
    | undefined;
  dispatch: (action: any) => void;
  goBack: () => void;
  canGoBack?: () => boolean;
  navigate?: (name: "PhotoSelection", params: PhotoSelectionParams) => void;
  replace?: (name: "PhotoSelection", params: PhotoSelectionParams) => void;
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
