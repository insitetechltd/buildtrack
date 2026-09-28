import {
  exportPhotokitPreviewJpeg,
  pausePhotokitLibraryForAccept,
} from "@/modules/mediaLibrary/PhotokitThumbView";
import { LIBRARY_PREVIEW_MAX_EDGE_PX } from "@/utils/ensureCappedLocalPhoto";

type PreviewPhoto = {
  uri: string;
  previewUri?: string;
  mediaLibraryAssetId?: string;
};

/**
 * Attach a fast file:// preview so Select Photos can paint without
 * expo-image decoding ph:// or a live PhotoKit view inside Reanimated.
 * Does not replace `uri` — upload/annotation still export the capped original.
 */
export async function withLibraryPreviewUri<T extends PreviewPhoto>(
  photo: T,
): Promise<T> {
  if (photo.previewUri?.startsWith("file://") || photo.uri.startsWith("file://")) {
    return photo;
  }
  if (!photo.mediaLibraryAssetId) {
    return photo;
  }
  const previewUri = await exportPhotokitPreviewJpeg(
    photo.mediaLibraryAssetId,
    LIBRARY_PREVIEW_MAX_EDGE_PX,
  );
  return previewUri ? { ...photo, previewUri } : photo;
}

/** Pause Recents thumbs once, then pin previews in parallel. */
export async function pinLibraryPreviews<T extends PreviewPhoto>(
  photos: T[],
): Promise<T[]> {
  pausePhotokitLibraryForAccept();
  return Promise.all(photos.map((photo) => withLibraryPreviewUri(photo)));
}
