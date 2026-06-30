export function shouldReturnToCreateTaskShortcut({
  returnScreen,
  actionType,
}: {
  returnScreen?: string;
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
  selectedPhotos?: unknown[];
  uploadedPhotoUrls?: string[];
}) {
  return {
    editTaskId: taskId,
    actionType,
    updateTargetSubTaskId: subTaskId,
    selectedPhotos,
    uploadedPhotoUrls,
  };
}
