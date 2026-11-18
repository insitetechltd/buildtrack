import { pinLibraryPreviews } from "@/utils/libraryPreviewPin";
import type { SelectedPhoto } from "../../navigation/navigationTypes";
import type { CaptureSessionPhoto } from "./types";

export function mapSessionSelectionToSelectedPhotos(
  photos: CaptureSessionPhoto[],
): SelectedPhoto[] {
  return photos
    .filter((p) => p.selected)
    .map((p) => {
      const editedUri = p.annotatedUri?.startsWith("file://")
        ? p.annotatedUri
        : undefined;
      const photo: SelectedPhoto = {
        uri: editedUri || p.uri,
        fileName: p.fileName,
        isAnnotated: Boolean(editedUri),
        mediaLibraryAssetId: p.mediaLibraryAssetId,
      };
      if (editedUri) {
        photo.annotatedUri = editedUri;
        photo.previewUri = editedUri;
      } else if (p.previewUri) {
        photo.previewUri = p.previewUri;
      }
      return photo;
    });
}

/** Accept: keep ph:// for upload, attach a fast file:// preview for Select Photos. */
export async function mapSessionSelectionWithPreviews(
  photos: CaptureSessionPhoto[],
): Promise<SelectedPhoto[]> {
  const mapped = mapSessionSelectionToSelectedPhotos(photos);
  return pinLibraryPreviews(mapped);
}
