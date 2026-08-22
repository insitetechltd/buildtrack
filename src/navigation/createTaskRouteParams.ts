import type { CreateTaskParams, SelectedPhoto } from "./navigationTypes";

export function normalizeCreateTaskSelectedPhotos(
  photos: unknown,
): CreateTaskParams["selectedPhotos"] {
  if (!Array.isArray(photos)) {
    return undefined;
  }

  return photos.map((photo) => {
    const candidate = photo as SelectedPhoto;
    return {
      uri: candidate.uri,
      fileName: candidate.fileName,
      isAnnotated: Boolean(candidate.isAnnotated),
      annotatedUri: candidate.annotatedUri,
      caption: candidate.caption,
      mediaLibraryAssetId: candidate.mediaLibraryAssetId,
    };
  });
}

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
    localDraftId: undefined,
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
    localDraftId: routeParams?.localDraftId,
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
