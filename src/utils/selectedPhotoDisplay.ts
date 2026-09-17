import { isPhotokitThumbsAvailable } from "@/modules/mediaLibrary/PhotokitThumbView";
import { isSystemLibraryDisplayUri } from "@/utils/libraryDisplayUri";
import type { SelectedPhoto } from "@/utils/usePhotoSelection";

export function selectedPhotoDisplayUri(
  photo: Pick<SelectedPhoto, "uri" | "annotatedUri" | "previewUri">,
): string {
  if (photo.annotatedUri) {
    return photo.annotatedUri;
  }
  if (photo.previewUri) {
    return photo.previewUri;
  }
  return photo.uri;
}

/** Select Photos tiles may bind expo-image only for local/remote files — never ph://. */
export function selectedPhotoCanPaintWithExpoImage(
  photo: Pick<SelectedPhoto, "uri" | "annotatedUri" | "previewUri">,
): boolean {
  const uri = selectedPhotoDisplayUri(photo);
  return (
    uri.startsWith("file://") ||
    uri.startsWith("http://") ||
    uri.startsWith("https://")
  );
}

/** Camera pins and baked edits already have a local JPEG. */
export function selectedPhotoHasLocalFile(photo: Pick<SelectedPhoto, "uri" | "annotatedUri">): boolean {
  const uri = photo.annotatedUri || photo.uri;
  return uri.startsWith("file://");
}

/**
 * Select Photos / Recents handoff must not bind `ph://` to expo-image.
 * expo-image 2.2 requests PHImageManagerMaximumSize for library URIs, which
 * can stall the grid for minutes while Recents thumbs are still live.
 */
export function selectedPhotoUsesPhotokitThumb(
  photo: Pick<SelectedPhoto, "uri" | "annotatedUri" | "previewUri" | "mediaLibraryAssetId">,
  nativeAvailable: boolean = isPhotokitThumbsAvailable(),
): boolean {
  if (!nativeAvailable) {
    return false;
  }
  if (selectedPhotoHasLocalFile(photo)) {
    return false;
  }
  if (photo.previewUri?.startsWith("file://")) {
    return false;
  }
  if (!photo.mediaLibraryAssetId) {
    return false;
  }
  return (
    isSystemLibraryDisplayUri(photo.uri) ||
    photo.uri.startsWith("ph://") ||
    photo.uri.length === 0
  );
}
