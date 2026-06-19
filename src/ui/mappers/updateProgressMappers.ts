import type { UpdateProgressPhotoModel } from "../contracts/viewAdapters";
import type { ImagePrimitiveContract } from "../contracts/primitives";

export function mapPhotoModelToImageProps(
  model: UpdateProgressPhotoModel
): ImagePrimitiveContract {
  return {
    primitiveId: model.id,
    family: "image",
    density: model.density,
    structuralState: model.structuralState,
    isLoading: model.structuralState === "loading",
    isEmpty: model.structuralState === "empty",
    isStale: model.structuralState === "stale",
    isDisabled: model.structuralState === "disabled",
    accessibilityLabel: `Photo item ${model.id}`,
    uri: model.uri,
    status: model.isFailed ? "error" : model.isUploaded ? "success" : "pending",
    errorMessage: model.errorMessage,
    onRemove: model.onRemove,
    onRetry: model.onRetry,
  };
}
