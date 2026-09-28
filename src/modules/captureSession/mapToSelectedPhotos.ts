import { pinLibraryPreviews } from "@/utils/libraryPreviewPin";
import type { SelectedPhoto } from "../../navigation/navigationTypes";
import type { CaptureSessionPhoto } from "./types";

export function mapSessionSelectionToSelectedPhotos(
  photos: CaptureSessionPhoto[],
): SelectedPhoto[] {
  return photos
    .filter((p) => p.selected)
    .map((p) => {
      const photo: SelectedPhoto = {
        uri: p.uri,
        fileName: p.fileName,
        isAnnotated: false,
        mediaLibraryAssetId: p.mediaLibraryAssetId,
      };
      if (p.previewUri) {
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
