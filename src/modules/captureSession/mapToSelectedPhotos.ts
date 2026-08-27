import type { SelectedPhoto } from "../../navigation/navigationTypes";
import type { CaptureSessionPhoto } from "./types";

export function mapSessionSelectionToSelectedPhotos(
  photos: CaptureSessionPhoto[],
): SelectedPhoto[] {
  return photos
    .filter((p) => p.selected)
    .map((p) => ({
      uri: p.uri,
      fileName: p.fileName,
      isAnnotated: false,
      mediaLibraryAssetId: p.mediaLibraryAssetId,
    }));
}
