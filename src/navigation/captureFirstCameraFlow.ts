import { Alert, Linking, Platform } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { CommonActions } from "@react-navigation/native";
import { pinDraftMedia } from "../utils/draftMediaCache";
import type { SelectedPhoto } from "./navigationTypes";

export type CaptureFirstNavigation = {
  navigate: (screen: string, params?: unknown) => void;
  dispatch?: (action: unknown) => void;
  getParent?: () => CaptureFirstNavigation | undefined;
};

/** Tab to restore when abandoning capture-first before destination confirm. */
let captureFirstReturnTab: "Activity" | "Tasks" | null = null;

export function getCaptureFirstReturnTab(): "Activity" | "Tasks" | null {
  return captureFirstReturnTab;
}

export function clearCaptureFirstReturnTab(): void {
  captureFirstReturnTab = null;
}

/**
 * Remember non-Camera tab at camera-press time so cancel returns there.
 */
export function rememberCaptureFirstOrigin(tabState: {
  index?: number;
  routes?: Array<{ name?: string }>;
} | null | undefined): void {
  const index = typeof tabState?.index === "number" ? tabState.index : -1;
  const focused = index >= 0 ? tabState?.routes?.[index]?.name : undefined;
  if (focused === "Tasks") {
    captureFirstReturnTab = "Tasks";
    return;
  }
  if (focused === "Activity") {
    captureFirstReturnTab = "Activity";
    return;
  }
  // Already on Camera or unknown — keep prior origin if set, else Activity.
  if (!captureFirstReturnTab) {
    captureFirstReturnTab = "Activity";
  }
}

async function createSelectedPhoto(
  uri: string,
  fileName: string,
): Promise<SelectedPhoto> {
  const pinnedUri = await pinDraftMedia(uri, fileName);
  return {
    uri: pinnedUri,
    fileName,
    isAnnotated: false,
  };
}

async function requestCameraPermission(): Promise<boolean> {
  const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
  if (permissionResult.status === "granted") {
    return true;
  }

  const canAskAgain = permissionResult.canAskAgain !== false;
  if (!canAskAgain) {
    Alert.alert(
      "Permission Denied",
      "Camera permission is required to take photos. Please enable it in Settings.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Open Settings",
          onPress: () => {
            void Linking.openSettings().catch(() => {
              if (Platform.OS === "ios") {
                void Linking.openURL("app-settings:");
              }
            });
          },
        },
      ],
    );
  } else {
    Alert.alert("Permission Denied", "Camera permission is required to take photos.");
  }
  return false;
}

function buildCaptureFirstPhotoSelectionParams(photos: SelectedPhoto[]) {
  return {
    initialPhotos: photos,
    uploadImmediately: false,
    captureFirstFlow: true,
    returnScreen: "CreateTask" as const,
    entityType: "task" as const,
    initialCompletionPercentage: 0,
    selectionRevision: Date.now(),
  };
}

/**
 * Camera tab entry: open hybrid capture session immediately (no Take/Library alert).
 */
export function launchCaptureFirstSession(
  navigation: CaptureFirstNavigation,
  tabState?: {
    index?: number;
    routes?: Array<{ name?: string }>;
  } | null,
): void {
  rememberCaptureFirstOrigin(tabState ?? null);
  navigation.navigate("Camera", {
    screen: "CaptureSession",
  });
}

type AddPhotosNav = {
  navigate: (name: string, params?: object) => void;
  push?: (name: string, params?: object) => void;
};

/**
 * Create Task / Update Progress Add Photos → hybrid CaptureSession (no Take/Library alert).
 */
export function navigateToAddPhotosCaptureSession(
  navigation: AddPhotosNav,
  params: Exclude<
    import("./navigationTypes").CaptureSessionParams,
    undefined
  > & {
    returnScreen: "CreateTask" | "UpdateProgress";
  },
): void {
  const payload = {
    ...params,
    entry: "addPhotos" as const,
  };
  try {
    if (typeof navigation.push === "function") {
      navigation.push("CaptureSession", payload);
      return;
    }
    navigation.navigate("CaptureSession", payload);
  } catch {
    navigation.navigate("CaptureSession", payload);
  }
}

/**
 * Always (Activity / Tasks / Task Detail): open capture session → Select Photos → destination.
 */
export function promptCaptureFirstSource(
  navigation: CaptureFirstNavigation,
  tabState?: {
    index?: number;
    routes?: Array<{ name?: string }>;
  } | null,
): void {
  launchCaptureFirstSession(navigation, tabState);
}

/**
 * After hybrid Accept: hand selected drafts into Select Photos (annotation) on Camera stack.
 */
export function navigateCaptureFirstPhotoSelection(
  navigation: CaptureFirstNavigation,
  photos: SelectedPhoto[],
): void {
  navigation.navigate("Camera", {
    screen: "PhotoSelection",
    params: buildCaptureFirstPhotoSelectionParams(photos),
  });
}

/**
 * Legacy system camera path (kept for non–Camera-tab callers / fallback).
 */
export async function launchCaptureFirstCamera(
  navigation: CaptureFirstNavigation,
): Promise<void> {
  const granted = await requestCameraPermission();
  if (!granted) {
    return;
  }

  let result: ImagePicker.ImagePickerResult;
  try {
    result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images as any,
      allowsEditing: false,
      quality: 0.8,
      allowsMultipleSelection: true,
    } as ImagePicker.ImagePickerOptions);
  } catch {
    result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images as any,
      allowsEditing: false,
      quality: 0.8,
    });
  }

  if (result.canceled || !result.assets?.length) {
    return;
  }

  const photos = await Promise.all(
    result.assets.map((asset, index) =>
      createSelectedPhoto(
        asset.uri,
        asset.fileName || `photo_${Date.now()}_${index}.jpg`,
      ),
    ),
  );
  navigateCaptureFirstPhotoSelection(navigation, photos);
}

export function launchCaptureFirstLibrary(navigation: CaptureFirstNavigation): void {
  navigation.navigate("Camera", {
    screen: "InAppLibraryPicker",
    params: {
      uploadImmediately: false,
      captureFirstFlow: true,
      returnScreen: "CreateTask",
      entityType: "task",
      initialCompletionPercentage: 0,
      existingPhotos: [],
    },
  });
}

export function promptCaptureFirstDestination({
  navigation,
  photos,
}: {
  navigation: CaptureFirstNavigation & {
    goBack?: () => void;
    canGoBack?: () => boolean;
  };
  photos: SelectedPhoto[];
}): void {
  if (photos.length === 0) {
    return;
  }

  Alert.alert("What would you like to do?", undefined, [
    { text: "Cancel", style: "cancel" },
    {
      text: "Create new task",
      onPress: () => {
        clearCaptureFirstReturnTab();
        // Keep Select Photos under Create Task so header Back returns there.
        navigation.dispatch?.(
          CommonActions.reset({
            index: 1,
            routes: [
              {
                name: "PhotoSelection",
                params: buildCaptureFirstPhotoSelectionParams(photos),
              },
              {
                name: "CreateTaskMain",
                params: {
                  selectedPhotos: photos,
                  clearForm: false,
                  captureFirstFlow: true,
                  _timestamp: Date.now(),
                },
              },
            ],
          }),
        );
      },
    },
    {
      text: "Update existing task",
      onPress: () => {
        // Keep Select Photos under the picker so header Back returns there.
        navigation.dispatch?.(
          CommonActions.reset({
            index: 1,
            routes: [
              {
                name: "PhotoSelection",
                params: buildCaptureFirstPhotoSelectionParams(photos),
              },
              {
                name: "CaptureTaskPicker",
                params: { selectedPhotos: photos },
              },
            ],
          }),
        );
      },
    },
  ]);
}

export function resetCameraStackAfterHandoff(
  navigation: CaptureFirstNavigation,
): void {
  navigation.dispatch?.(
    CommonActions.reset({
      index: 0,
      routes: [{ name: "CreateTaskMain", params: undefined }],
    }),
  );
}

/**
 * Cancel / abandon capture-first before destination confirm:
 * discard staged photos, clear Camera stack, return to prior tab.
 */
export function exitCaptureFirstFlow(navigation: CaptureFirstNavigation): void {
  const returnTab = captureFirstReturnTab ?? "Activity";
  clearCaptureFirstReturnTab();
  resetCameraStackAfterHandoff(navigation);
  const parent = navigation.getParent?.();
  parent?.navigate?.(returnTab);
}

/**
 * After task pick: open Update Progress (prefer origin tab), then Task Detail on submit.
 */
export function handOffCaptureFirstToUpdateProgress({
  navigation,
  taskId,
  photos,
}: {
  navigation: CaptureFirstNavigation;
  taskId: string;
  photos: SelectedPhoto[];
}): void {
  const returnTab = captureFirstReturnTab === "Tasks" ? "Tasks" : "Activity";
  clearCaptureFirstReturnTab();
  const sourceScreen = returnTab === "Tasks" ? "tasks" : "dashboard";

  // Walk up to the root tab navigator (Camera stack → MainTabs).
  let tabNav: CaptureFirstNavigation | undefined = navigation.getParent?.();
  const routeNames = (tabNav as { getState?: () => { routeNames?: string[] } } | undefined)
    ?.getState?.()?.routeNames;
  if (tabNav && routeNames && !routeNames.includes("Activity") && !routeNames.includes("Tasks")) {
    tabNav = tabNav.getParent?.() ?? tabNav;
  }

  tabNav?.navigate?.(returnTab, {
    screen: "UpdateProgress",
    params: {
      taskId,
      selectedPhotos: photos,
      sourceScreen,
      sourceTaskId: taskId,
    },
  });

  // Reset Camera stack after the tab switch so we don't steal focus back mid-navigate.
  setTimeout(() => {
    resetCameraStackAfterHandoff(navigation);
  }, 0);
}
