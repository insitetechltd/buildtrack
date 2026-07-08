import type { CreateTaskParams } from "./navigationTypes";

export function buildCreateTaskPhotoReturnParams({
  routeParams,
  selectedPhotos,
  uploadedPhotoUrls,
}: {
  routeParams?: CreateTaskParams;
  selectedPhotos?: import("./navigationTypes").CreateTaskParams["selectedPhotos"];
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
    cameraLaunchContext: routeParams?.cameraLaunchContext,
    postCaptureDefault: routeParams?.postCaptureDefault,
    selectedPhotos,
    uploadedPhotoUrls,
    clearForm: undefined,
    _timestamp: undefined,
  };
}
