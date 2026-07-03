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
  selectedPhotos,
  uploadedPhotoUrls,
}: {
  taskId: string;
  subTaskId?: string;
  actionType: "update";
  selectedPhotos?: import("./navigationTypes").CreateTaskParams["selectedPhotos"];
  uploadedPhotoUrls?: string[];
}): import("./navigationTypes").CreateTaskParams {
  return {
    editTaskId: taskId,
    actionType,
    updateTargetSubTaskId: subTaskId,
    selectedPhotos,
    uploadedPhotoUrls,
  };
}
