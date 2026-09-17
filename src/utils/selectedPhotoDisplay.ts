import { isPhotokitThumbsAvailable } from "@/modules/mediaLibrary/PhotokitThumbView";
import { isSystemLibraryDisplayUri } from "@/utils/libraryDisplayUri";
import type { SelectedPhoto } from "@/utils/usePhotoSelection";

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
  photo: Pick<SelectedPhoto, "uri" | "annotatedUri" | "mediaLibraryAssetId">,
  nativeAvailable: boolean = isPhotokitThumbsAvailable(),
): boolean {
  if (!nativeAvailable) {
    return false;
  }
  if (selectedPhotoHasLocalFile(photo)) {
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
