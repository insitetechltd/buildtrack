import type { CreateTaskParams, SelectedPhoto } from "./navigationTypes";

export function buildCreateTaskPhotoReturnParams({
  routeParams,
  selectedPhotos,
  uploadedPhotoUrls,
}: {
  routeParams?: CreateTaskParams;
  selectedPhotos?: SelectedPhoto[];
  uploadedPhotoUrls?: string[];
}): CreateTaskParams {
  return {
    parentTaskId: routeParams?.parentTaskId,
    parentSubTaskId: routeParams?.parentSubTaskId,
    editTaskId: routeParams?.editTaskId,
    actionType: routeParams?.actionType,
    updateTargetSubTaskId: routeParams?.updateTargetSubTaskId,
    sourceTaskId: routeParams?.sourceTaskId,
    sourceSubTaskId: routeParams?.sourceSubTaskId,
    sourceScreen: routeParams?.sourceScreen,
    selectedPhotos,
    uploadedPhotoUrls,
    clearForm: undefined,
    _timestamp: undefined,
  };
}
