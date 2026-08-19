import type { CreateTaskParams } from "./navigationTypes";

export function resolveCreateTaskEntryParams(
  routeParams?: CreateTaskParams,
): CreateTaskParams {
  if (!routeParams?.clearForm) {
    return routeParams ?? {};
  }

  return {
    parentTaskId: undefined,
    parentSubTaskId: undefined,
    editTaskId: undefined,
    resumeAsCreate: undefined,
    actionType: undefined,
    updateTargetSubTaskId: undefined,
    sourceTaskId: undefined,
    sourceSubTaskId: undefined,
    sourceScreen: undefined,
    cameraLaunchContext: undefined,
    postCaptureDefault: undefined,
    selectedPhotos: undefined,
    uploadedPhotoUrls: undefined,
    clearForm: true,
    _timestamp: routeParams._timestamp,
  };
}

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
    resumeAsCreate: routeParams?.resumeAsCreate,
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
