import type { CreateTaskParams, PhotoSelectionParams, SelectedPhoto } from "./navigationTypes";

export function shouldReturnToCreateTaskShortcut({
  returnScreen,
  actionType,
}: {
  returnScreen?: PhotoSelectionParams["returnScreen"];
  actionType?: CreateTaskParams["actionType"];
}) {
  return returnScreen === "UpdateProgress" && actionType === "update";
}

export function buildPhotoShortcutCreateTaskParams({
  taskId,
  subTaskId,
  actionType,
  selectedPhotos,
  uploadedPhotoUrls,
}: {
  taskId: string;
  subTaskId?: string;
  actionType: "update";
  selectedPhotos?: SelectedPhoto[];
  uploadedPhotoUrls?: string[];
}): CreateTaskParams {
  return {
    editTaskId: taskId,
    actionType,
    updateTargetSubTaskId: subTaskId,
    selectedPhotos,
    uploadedPhotoUrls,
  };
}
