import * as MediaLibrary from "expo-media-library";

import type { SelectedPhoto } from "../../navigation/navigationTypes";
import { pinDraftMedia } from "../../utils/draftMediaCache";
import type { CaptureSessionPhoto } from "./types";

const PIN_CONCURRENCY = 2;

export async function resolveLibraryLocalUri(
  assetId: string,
  fallbackUri: string,
): Promise<string> {
  if (fallbackUri.startsWith("file://")) {
    return fallbackUri;
  }
  const info = await MediaLibrary.getAssetInfoAsync(assetId, {
    shouldDownloadFromNetwork: true,
  });
  if (info.localUri?.startsWith("file://")) {
    return info.localUri;
  }
  throw new Error(`No local file URI for asset ${assetId}`);
}

async function materializeOne(photo: CaptureSessionPhoto): Promise<SelectedPhoto> {
  if (photo.source === "library" && photo.mediaLibraryAssetId && !photo.uri.startsWith("file://")) {
    const localUri = await resolveLibraryLocalUri(photo.mediaLibraryAssetId, photo.uri);
    const pinnedUri = await pinDraftMedia(localUri, photo.fileName);
    return {
      uri: pinnedUri,
      fileName: photo.fileName,
      isAnnotated: false,
      mediaLibraryAssetId: photo.mediaLibraryAssetId,
    };
  }

  const pinnedUri = photo.uri.startsWith("file://")
    ? await pinDraftMedia(photo.uri, photo.fileName)
    : photo.uri;
  return {
    uri: pinnedUri,
    fileName: photo.fileName,
    isAnnotated: false,
    mediaLibraryAssetId: photo.mediaLibraryAssetId,
  };
}

/**
 * Pin selected drafts for Select Photos. Camera rows are already file://.
 * Library rows may still be ph:// until annotation or upload — Accept must
 * not call this.
 */
export async function materializeSelectedCapturePhotos(
  photos: CaptureSessionPhoto[],
): Promise<SelectedPhoto[]> {
  const selected = photos.filter((photo) => photo.selected);
  const out: SelectedPhoto[] = new Array(selected.length);
  let next = 0;

  async function worker() {
    while (next < selected.length) {
      const index = next;
      next += 1;
      out[index] = await materializeOne(selected[index]);
    }
  }

  const workers = Array.from(
    { length: Math.min(PIN_CONCURRENCY, selected.length) },
    () => worker(),
  );
  await Promise.all(workers);
  return out;
}
