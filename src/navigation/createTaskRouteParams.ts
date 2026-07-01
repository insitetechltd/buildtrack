export function buildCreateTaskPhotoReturnParams({
  routeParams,
  selectedPhotos,
  uploadedPhotoUrls,
}: {
  routeParams?: Record<string, unknown>;
  selectedPhotos?: unknown[];
  uploadedPhotoUrls?: string[];
}) {
  return {
    parentTaskId: routeParams?.parentTaskId,
    parentSubTaskId: routeParams?.parentSubTaskId,
    editTaskId: routeParams?.editTaskId,
    actionType: routeParams?.actionType,
    selectedPhotos,
    uploadedPhotoUrls,
    clearForm: undefined,
    _timestamp: undefined,
  };
}
